import { describe, it, expect } from "vitest";
import {
  calculateShotPreview,
  findCombatPath,
  useCombatConsumable,
  initializeTacticalCombat,
  generateRoadEncounter,
} from "../combatEngine";
import { getBearing, getNearbySettlement, getWorldPosition, stepExploration } from "../navigationEngine";
import { createInitialGameState, ROUTES, SETTLEMENTS } from "../worldData";

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

  it("creates a genuinely large 20x12 combat grid that differentiates pistol, carbine, and sniper ranges", () => {
    const state = createInitialGameState();
    const encounter = generateRoadEncounter(state, ROUTES[0]);
    const combat = initializeTacticalCombat(state, encounter);

    expect(combat.gridWidth).toBe(20);
    expect(combat.gridHeight).toBeGreaterThanOrEqual(12);

    const player = combat.units.find(u => u.isMainCharacter)!;
    const enemy = combat.units.find(u => !u.isPlayerTeam)!;
    // Place player and enemy on clear line of sight row y=2 at distance 15 tiles (x=2 to x=17)
    player.x = 2;
    player.y = 2;
    player.ap = 10;
    enemy.x = 17;
    enemy.y = 2;

    // 1. Pistol (.38 Revolver, max range 8) cannot shoot at 15 tiles
    player.weapon = "revolver_38";
    player.currentMagAmmo = 6;
    const pistolShot = calculateShotPreview(combat, player, enemy, "snap");
    expect(pistolShot.canAttack).toBe(false);
    expect(pistolShot.reason).toContain("Out of range");

    // 2. Carbine (5.56 Carbine, max range 16) CAN reach at 15 tiles, but not at 18 tiles
    player.weapon = "carbine_556";
    player.currentMagAmmo = 12;
    expect(calculateShotPreview(combat, player, enemy, "snap").canAttack).toBe(true);
    enemy.x = 19; // distance 17 > 16
    expect(calculateShotPreview(combat, player, enemy, "snap").canAttack).toBe(false);

    // 3. Sniper Rifle (7.62mm Sniper, optimal 18, max 25) CAN shoot across the entire 20-tile map
    player.weapon = "sniper_rifle_762";
    player.currentMagAmmo = 5;
    const sniperShot = calculateShotPreview(combat, player, enemy, "snap");
    expect(sniperShot.canAttack).toBe(true);
    expect(sniperShot.hitChancePercent).toBeGreaterThanOrEqual(70);
  });

  it("moves caravan click-by-click along a compass-calculated bearing until reaching the next city", () => {
    let state = createInitialGameState();
    const startPos = getWorldPosition(state);
    const dest = SETTLEMENTS.tombstone_crossing.coordinates;
    const calculatedBearing = getBearing(startPos, dest);

    state.exploration = {
      ...state.exploration!,
      heading: calculatedBearing,
    };

    let clicks = 0;
    while (getNearbySettlement(getWorldPosition(state)) !== "tombstone_crossing" && clicks < 25) {
      state = stepExploration(state, 0.75);
      clicks++;
      // After every click-step, the caravan must be paused (discrete movement)
      expect(state.exploration!.isMoving).toBe(false);
      expect(state.exploration!.isPaused).toBe(true);
    }

    expect(clicks).toBeGreaterThan(2);
    expect(clicks).toBeLessThan(20);
    expect(getNearbySettlement(getWorldPosition(state))).toBe("tombstone_crossing");
  });
});


