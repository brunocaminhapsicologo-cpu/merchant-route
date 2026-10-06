import { describe, it, expect } from "vitest";
import {
  findCombatPath,
  useCombatConsumable,
  initializeTacticalCombat,
  generateRoadEncounter,
} from "../combatEngine";
import { createInitialGameState, ROUTES } from "../worldData";

describe("Phase 1: Tactical Combat Pathfinding, Consumables & Cover", () => {
  it("finds shortest path around obstacles on tactical grid", () => {
    const state = createInitialGameState();
    const encounter = generateRoadEncounter(state, ROUTES[0]);
    const combat = initializeTacticalCombat(state, encounter);
    const player = combat.units.find(u => u.isPlayerTeam)!;

    // Start at player pos (1, 3), destination (4, 3)
    const result = findCombatPath(combat, { x: 1, y: 3 }, { x: 4, y: 3 }, player);
    expect(result.reachable).toBe(true);
    expect(result.path.length).toBeGreaterThanOrEqual(3);
    expect(result.totalApCost).toBeGreaterThan(0);
    expect(result.path[result.path.length - 1]).toEqual({ x: 4, y: 3 });
  });

  it("returns unreachable if goal is out of bounds or occupied by enemy", () => {
    const state = createInitialGameState();
    const encounter = generateRoadEncounter(state, ROUTES[0]);
    const combat = initializeTacticalCombat(state, encounter);
    const player = combat.units.find(u => u.isPlayerTeam)!;
    const enemy = combat.units.find(u => !u.isPlayerTeam)!;

    // Goal out of bounds
    expect(findCombatPath(combat, { x: player.x, y: player.y }, { x: 99, y: 99 }, player).reachable).toBe(false);

    // Goal occupied by enemy
    const occupiedResult = findCombatPath(combat, { x: player.x, y: player.y }, { x: enemy.x, y: enemy.y }, player);
    expect(occupiedResult.reachable).toBe(false);
  });

  it("applies battlefield consumables: heals HP, cures crippled legs, and consumes inventory", () => {
    const state = createInitialGameState();
    const encounter = generateRoadEncounter(state, ROUTES[0]);
    const combat = initializeTacticalCombat(state, encounter);

    // Damage player and cripple legs
    state.combatState = combat;
    const player = combat.units.find(u => u.isMainCharacter)!;
    player.hp = 20;
    player.crippledLegs = true;
    player.ap = 5;
    state.inventory.field_bandage = 2;

    const res = useCombatConsumable(state, player.id, "field_bandage");
    expect(res.success).toBe(true);
    expect(res.sound).toBe("heal");

    const updatedPlayer = res.state.combatState!.units.find(u => u.id === player.id)!;
    expect(updatedPlayer.hp).toBe(45); // 20 + 25
    expect(updatedPlayer.ap).toBe(2); // 5 - 3
    expect(updatedPlayer.crippledLegs).toBe(false); // cured
    expect(res.state.inventory.field_bandage).toBe(1);
  });

  it("generates distinct procedural cover distribution based on terrain", () => {
    const state = createInitialGameState();
    const encounter = generateRoadEncounter(state, ROUTES[0]);

    const canyonCombat = initializeTacticalCombat(state, encounter, "rocky_canyon");
    const duneCombat = initializeTacticalCombat(state, encounter, "sand_dunes");
    const highwayCombat = initializeTacticalCombat(state, encounter, "old_highway");

    // Rocky canyon should have dense rock cover
    const canyonRocks = canyonCombat.tiles.flat().filter(t => t.cover === "rocks").length;
    // Sand dunes should have deep sand tiles
    const duneSand = duneCombat.tiles.flat().filter(t => t.cover === "sand").length;
    // Highway should have ruins/wreckage
    const highwayRuins = highwayCombat.tiles.flat().filter(t => t.cover === "ruins").length;

    expect(canyonRocks).toBeGreaterThan(4);
    expect(duneSand).toBeGreaterThan(2);
    expect(highwayRuins).toBeGreaterThan(2);
  });
});
