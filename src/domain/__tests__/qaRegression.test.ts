import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { initializeCombatWithAmmo } from "../combatEngine";
import { performEnemyAction } from "../combatActions";
import { getActiveTransportDefinition } from "../economyEngine";
import { advanceExploration, getTerrainAt, getWorldPosition } from "../navigationEngine";
import { migrateGameState } from "../saveGame";
import { GameState, RoadEncounter } from "../types";
import { AVAILABLE_MERCENARIES, createInitialGameState, ITEMS, TRANSPORTS } from "../worldData";

// Execute actual page handlers/effects without rendering or copying their logic.
// The browser lifecycle, layout and animations remain the root's QA responsibility.
const page = ts.createSourceFile("page.tsx", readFileSync(new URL("../../app/page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function pageNode(predicate: (node: ts.Node) => boolean): ts.Node {
  let found: ts.Node | undefined;
  function visit(node: ts.Node) { if (!found && predicate(node)) found = node; if (!found) ts.forEachChild(node, visit); }
  visit(page);
  if (!found) throw new Error("Expected page handler/effect was not found; update the QA harness.");
  return found;
}
function handler(name: string) {
  const node = pageNode(n => ts.isVariableDeclaration(n) && n.name.getText(page) === name) as ts.VariableDeclaration;
  return node.initializer!.getText(page);
}
function effect(fragment: string) {
  const node = pageNode(n => ts.isCallExpression(n) && n.expression.getText(page) === "useEffect" && n.arguments[0].getText(page).includes(fragment)) as ts.CallExpression;
  return node.arguments[0].getText(page);
}
function execute(expression: string, scope: Record<string, unknown>, args: unknown[] = []) {
  const code = ts.transpileModule(`(${expression})(...__args)`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return runInNewContext(code, { ...scope, __args: args });
}
const encounter: RoadEncounter = {
  id: "qa-road", title: "QA encounter", enemyGroupName: "QA raiders", description: "Deterministic fixture",
  isBountyTarget: false, enemySpeedKmh: 5, tollDemandCash: 10, intimidateThreshold: 15,
  enemies: [0, 1, 2].map(i => ({ name: `Raider ${i}`, role: "Raider", hp: 60, maxHp: 60, ap: 6, maxAp: 6, weapon: "rusty_machete", accuracy: 60, morale: 80 })),
  lootReward: { cash: 10, items: {} },
};
function battle(): GameState { return initializeCombatWithAmmo(createInitialGameState(), structuredClone(encounter)); }
function harness(initial: GameState, raw?: string, backupFails = false) {
  const storage = new Map<string, string>();
  if (raw !== undefined) storage.set("merchant_route_save_v1", raw);
  const h = { state: initial, hydrated: false, enemyBusy: false, queue: { current: [] as string[] }, status: "", storage };
  const callbacks: Array<() => void> = [];
  const soundEngine = { loadPreferences: vi.fn(), getVolumes: () => ({}), isMuted: () => false,
    playStepSound: vi.fn(), playReloadSound: vi.fn(), playWeaponSound: vi.fn(), playHitSound: vi.fn(), playMissRicochet: vi.fn() };
  const scope = () => ({
    state: h.state, isHydrated: h.hydrated, combatBusy: false, enemyBusy: h.enemyBusy,
    SAVE_STORAGE_KEY: "merchant_route_save_v1", TRANSPORTS, ITEMS,
    migrateGameState, getWorldPosition, getTerrainAt, getActiveTransportDefinition, performEnemyAction,
    enemyQueue: h.queue, enemyTimer: { current: null }, soundEngine, getWeaponSoundCategory: () => "melee",
    setTimeout: (callback: () => void) => { callbacks.push(callback); return callbacks.length; }, clearTimeout: vi.fn(),
    window: { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => {
      if (backupFails && key.endsWith("_unreadable_backup")) throw new Error("Quota exceeded");
      storage.set(key, value);
    } } },
    setState: (update: GameState | ((prev: GameState) => GameState)) => { h.state = typeof update === "function" ? update(h.state) : update; },
    setIsHydrated: (value: boolean) => { h.hydrated = value; },
    setEnemyBusy: (value: boolean) => { h.enemyBusy = value; },
    setSaveStatus: (value: string) => { h.status = value; },
    setNotice: vi.fn(), setVolumes: vi.fn(), setIsMuted: vi.fn(), setSelectedSettlement: vi.fn(), setActiveTab: vi.fn(),
    importRef: { current: null },
  });
  return { h, invoke: (name: string, args?: unknown[]) => execute(handler(name), scope(), args),
    runEffect: (fragment: string) => execute(effect(fragment), scope()),
    tickEnemy: () => { execute(effect("if(!enemyBusy)return"), scope()); callbacks.shift()?.(); } };
}

describe("Independent QA regressions: travel and save protection", () => {
  it.each(["initial", "reload", "post-combat"])("starts paused %s travel, preserves bearing, then stops without advancing time", kind => {
    let state = createInitialGameState();
    state.exploration!.heading = 90;
    if (kind === "reload") state = migrateGameState(JSON.stringify(state));
    if (kind === "post-combat") { state.currentSettlement = null; state.exploration!.isPaused = true; }
    const { h, invoke } = harness(state);
    invoke("handleToggleMovement");
    expect(h.state.currentSettlement).toBeNull();
    expect(h.state.exploration).toMatchObject({ isMoving: true, isPaused: false, heading: 90 });
    h.state = advanceExploration(h.state, 0.1);
    expect(h.state.exploration!.x).toBeGreaterThan(state.exploration!.x);
    invoke("handleToggleMovement");
    expect(h.state.exploration!.isMoving).toBe(false);
    expect(advanceExploration(h.state, 1)).toBe(h.state);
  });

  it("backs up unreadable raw bytes before autosave can replace the primary save", () => {
    const raw = "{broken-json\n original bytes";
    const { h, runEffect } = harness(createInitialGameState(), raw);
    runEffect("getItem(SAVE_STORAGE_KEY)");
    expect(h.hydrated).toBe(true);
    expect(h.storage.get("merchant_route_save_v1_unreadable_backup")).toBe(raw);
    runEffect("JSON.stringify(state)");
    expect(h.storage.get("merchant_route_save_v1_unreadable_backup")).toBe(raw);
    expect(JSON.parse(h.storage.get("merchant_route_save_v1")!).playerName).toBe(h.state.playerName);
  });

  it("blocks autosave and preserves the primary save if unreadable backup fails", () => {
    const raw = "{broken";
    const { h, runEffect } = harness(createInitialGameState(), raw, true);
    runEffect("getItem(SAVE_STORAGE_KEY)");
    runEffect("JSON.stringify(state)");
    expect(h.hydrated).toBe(false);
    expect(h.status).toContain("automatic saving is disabled");
    expect(h.storage.get("merchant_route_save_v1")).toBe(raw);
  });
});

describe("Independent QA regressions: persisted combat", () => {
  it("persists the enemy phase immediately when the last player ends their turn", () => {
    const { h, invoke } = harness(battle());
    invoke("handleEndPlayerUnitTurn");
    expect(h.enemyBusy).toBe(true);
    expect(h.state.combatState!.activeUnitId).toBe("enemy_0");
    expect(h.queue.current).toEqual(["enemy_0", "enemy_1", "enemy_2"]);
  });

  it.each(["mount", "import"])("reconstructs remaining enemy AP on %s without replaying depleted or fled enemies", async kind => {
    const saved = battle(), combat = saved.combatState!;
    combat.activeUnitId = "enemy_0";
    combat.units.find(u => u.id === "enemy_0")!.ap = 0;
    combat.units.find(u => u.id === "enemy_1")!.ap = 3;
    combat.units.find(u => u.id === "enemy_2")!.isFled = true;
    const { h, invoke, runEffect } = harness(createInitialGameState(), JSON.stringify(saved));
    if (kind === "mount") runEffect("getItem(SAVE_STORAGE_KEY)");
    else await invoke("importSave", [{ size: 1000, text: async () => JSON.stringify(saved) }]);
    expect(h.enemyBusy).toBe(true);
    expect(h.queue.current).toEqual(["enemy_1"]);
    expect(h.state.combatState!.units.find(u => u.id === "enemy_1")!.ap).toBe(3);
  });

  it("restores injured maximum AP and clamps excess saved AP to that maximum", () => {
    const state = battle(), unit = state.combatState!.units[1];
    unit.crippledLegs = true; unit.maxAp = 4; unit.ap = 6;
    const restored = migrateGameState(JSON.stringify(state)).combatState!.units[1];
    expect(restored).toMatchObject({ crippledLegs: true, maxAp: 4, ap: 4 });
  });

  it("marks an enemy with insufficient AP as spent, then reload resumes only the next enemy", () => {
    const state = battle();
    state.combatState!.activeUnitId = "enemy_0";
    const enemy = state.combatState!.units.find(u => u.id === "enemy_0")!;
    enemy.x = 2; enemy.y = 3; enemy.ap = 1;
    const { h, tickEnemy } = harness(state);
    h.enemyBusy = true; h.queue.current = ["enemy_0", "enemy_1", "enemy_2"];
    tickEnemy();
    expect(h.state.combatState!.units.find(u => u.id === "enemy_0")!.ap).toBe(0);
    const resumed = harness(createInitialGameState(), JSON.stringify(h.state));
    resumed.runEffect("getItem(SAVE_STORAGE_KEY)");
    expect(resumed.h.queue.current).toEqual(["enemy_1", "enemy_2"]);
    expect(resumed.h.enemyBusy).toBe(true);
  });

  it("reload after the last enemy is spent advances the round and returns control to the player", () => {
    const state = battle(), combat = state.combatState!;
    combat.activeUnitId = "enemy_2";
    for (const unit of combat.units.filter(u => !u.isPlayerTeam)) unit.ap = 0;
    const { h, runEffect, tickEnemy } = harness(createInitialGameState(), JSON.stringify(state));
    runEffect("getItem(SAVE_STORAGE_KEY)");
    expect(h.enemyBusy).toBe(true);
    expect(h.queue.current).toEqual([]);
    tickEnemy();
    expect(h.enemyBusy).toBe(false);
    expect(h.state.combatState!.activeUnitId).toBe("unit_player");
    expect(h.state.combatState!.roundNumber).toBe(combat.roundNumber + 1);
  });

  it("reconciles depleted protagonist HP to defeat even if the saved outcome says victory", () => {
    const state = battle();
    state.combatState!.units[0].hp = 0;
    state.combatState!.outcome = "victory";
    expect(migrateGameState(JSON.stringify(state)).combatState!.outcome).toBe("defeat");
  });

  it("reconciles no surviving hostiles to victory and replaces a dead active unit", () => {
    const state = battle();
    for (const unit of state.combatState!.units.filter(u => !u.isPlayerTeam)) unit.hp = 0;
    state.combatState!.activeUnitId = "enemy_0";
    const restored = migrateGameState(JSON.stringify(state)).combatState!;
    expect(restored.outcome).toBe("victory");
    expect(restored.activeUnitId).toBe("unit_player");
  });

  it("does not allow a dead actor to move or attack even in an inconsistent ongoing state", () => {
    const state = battle(); state.combatState!.units[0].hp = 0;
    const { h, invoke } = harness(state);
    invoke("handleMoveActiveUnit", [1, 4]);
    invoke("handleAttackTarget", ["enemy_0"]);
    expect(h.state).toBe(state);
  });

  it("preserves per-weapon loaded ammo, explicit empty magazines and dead mercenary HP", () => {
    const state = createInitialGameState();
    state.weaponMagazines = { bolt_rifle_308: 2, revolver_38: 0 };
    state.hiredMercenaries = [{ ...AVAILABLE_MERCENARIES[0], magazines: { revolver_38: 1 } }];
    const saved = initializeCombatWithAmmo(state, structuredClone(encounter));
    saved.combatState!.units.find(u => u.id === `unit_${AVAILABLE_MERCENARIES[0].id}`)!.hp = 0;
    const restored = migrateGameState(JSON.stringify(saved));
    expect(restored.inventory).toEqual(saved.inventory);
    expect(restored.weaponMagazines).toMatchObject({ bolt_rifle_308: 2, revolver_38: 0 });
    expect(restored.combatState!.units.find(u => u.id === `unit_${AVAILABLE_MERCENARIES[0].id}`)!.hp).toBe(0);
  });

  it("takes one enemy decision at a time and preserves the untouched next enemy", () => {
    const state = battle(), combat = state.combatState!;
    const enemy = combat.units.find(u => u.id === "enemy_0")!;
    enemy.x = 2; enemy.y = 3; enemy.ap = ITEMS[enemy.weapon].weaponStats!.snapShotAp;
    const nextEnemy = structuredClone(combat.units.find(u => u.id === "enemy_1")!);
    const result = performEnemyAction(state, enemy.id, () => 0.99);
    expect(result.done).toBe(true);
    expect(result.state.combatState!.units.find(u => u.id === enemy.id)!.ap).toBe(0);
    expect(result.state.combatState!.units.find(u => u.id === "enemy_1")).toEqual(nextEnemy);
    expect(combat.units.find(u => u.id === enemy.id)!.ap).toBeGreaterThan(0);
  });
});
