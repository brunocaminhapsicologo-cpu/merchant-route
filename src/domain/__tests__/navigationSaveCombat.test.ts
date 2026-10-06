import { describe, expect, it } from "vitest";
import { advanceExploration, advanceGameTime, getBearing, getDistanceKm, getNearbySettlement, getWorldPosition } from "../navigationEngine";
import { initializeCombatWithAmmo, initializeTacticalCombat, generateRoadEncounter } from "../combatEngine";
import { getCaravanSpeedBreakdown, getDailyUpkeepSummary } from "../economyEngine";
import { migrateGameState } from "../saveGame";
import { AVAILABLE_MERCENARIES, createInitialGameState, ITEMS, ROUTES, SETTLEMENTS, TRANSPORTS } from "../worldData";
import { GameState } from "../types";

function moving(): GameState {
  const state = createInitialGameState();
  state.currentSettlement = null;
  state.transport = "scrap_motorcycle";
  state.inventory = { gasoline: 20, water: 20, food_rations: 20 };
  state.exploration = { x: 100, y: 100, heading: 90, isMoving: true, isPaused: false, terrain: "scorched_flats", distanceTravelledKm: 0 };
  return state;
}

describe("Compass navigation and real logistics", () => {
  it("uses north=0, east=90, south=180, west=270 and 0.2km per map unit", () => {
    const p = { x: 10, y: 10 };
    expect(getBearing(p, { x: 10, y: 0 })).toBe(0);
    expect(getBearing(p, { x: 20, y: 10 })).toBe(90);
    expect(getBearing(p, { x: 10, y: 20 })).toBe(180);
    expect(getBearing(p, { x: 0, y: 10 })).toBe(270);
    expect(getDistanceKm({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(1);
    for (const [heading, axis, positive] of [[0, "y", false], [90, "x", true], [180, "y", true], [270, "x", false]] as const) {
      const state = moving(); state.exploration!.heading = heading;
      const result = advanceExploration(state, 0.1);
      expect(positive ? result.exploration![axis] > 100 : result.exploration![axis] < 100).toBe(true);
    }
  });

  it("produces equivalent positions and costs for one hour or sixty minute steps", () => {
    const state = moving();
    const whole = advanceExploration(state, 1);
    let split = state;
    for (let i = 0; i < 60; i++) split = advanceExploration(split, 1 / 60);
    expect(split.exploration!.x).toBeCloseTo(whole.exploration!.x, 8);
    expect(split.exploration!.y).toBeCloseTo(whole.exploration!.y, 8);
    expect(split.inventory.gasoline).toBeCloseTo(whole.inventory.gasoline!, 8);
    expect(split.inventory.water).toBeCloseTo(whole.inventory.water!, 8);
    expect(split.hour).toBeCloseTo(whole.hour, 8);
    expect(state.inventory.gasoline).toBe(20);
  });

  it("charges precisely the configured fuel for 46 km, including a fractional final step", () => {
    const state = moving();
    const rate = TRANSPORTS[state.transport].fuelLitersPer10Km;
    state.inventory.gasoline = 46 / 10 * rate;
    const result = advanceExploration(state, 10);
    expect(result.exploration!.distanceTravelledKm).toBeCloseTo(46, 8);
    expect(result.inventory.gasoline).toBeCloseTo(0, 8);
    expect(result.exploration!.isPaused).toBe(true);
    expect(getDistanceKm(state.exploration!, result.exploration!)).toBeCloseTo(46, 8);
    expect(result.hour - state.hour).toBeCloseTo(46 / getCaravanSpeedBreakdown(state).effectiveSpeedKmh, 8);
  });

  it("stops without fuel and does not move or charge unelapsed time", () => {
    const state = moving(); state.inventory.gasoline = 0;
    const result = advanceExploration(state, 4);
    expect(result.exploration!.x).toBe(100);
    expect(result.hour).toBe(state.hour);
    expect(result.inventory.water).toBe(state.inventory.water);
    expect(getCaravanSpeedBreakdown(state).effectiveSpeedKmh).toBe(0);
    expect(result.journalLogs[0]).toContain("Out of fuel");
  });

  it("pauses near a city without entering, allows leaving, and respects world bounds", () => {
    const state = moving();
    state.transport = "on_foot";
    state.exploration = { ...state.exploration!, x: 100, y: 480 };
    const result = advanceExploration(state, 5);
    expect(result.currentSettlement).toBeNull();
    expect(result.exploration!.isPaused).toBe(true);
    expect(getNearbySettlement(result.exploration!)).toBe("dust_creek");
    expect(result.exploration!.x).toBeCloseTo(128, 8);
    const depart = createInitialGameState();
    depart.exploration = { ...depart.exploration!, isMoving: true, isPaused: false, heading: 270 };
    expect(advanceExploration(depart, 1).exploration!.x).toBeLessThan(128);
    const edge = moving(); edge.exploration!.x = 999;
    expect(advanceExploration(edge, 1).exploration!.x).toBe(1000);
    expect(Object.values(SETTLEMENTS).every(t => t.coordinates.x <= 1000 && t.coordinates.y <= 680)).toBe(true);
  });

  it("charges idle fractional upkeep and wages, expires events, and restocks across days", () => {
    const state = createInitialGameState();
    state.hiredMercenaries = [{ ...AVAILABLE_MERCENARIES[0] }];
    state.inventory = { water: 100, food_rations: 100, animal_forage: 100, gasoline: 10 };
    state.hour = 23.5;
    state.townStocks.dust_creek.water = 0;
    state.marketEvents[0] = { ...state.marketEvents[0], daysRemaining: 1 };
    const result = advanceGameTime(state, 0.75), costs = getDailyUpkeepSummary(state);
    expect(result.day).toBe(2); expect(result.hour).toBeCloseTo(0.25);
    expect(result.inventory.water).toBeCloseTo(100 - costs.totalWaterPerDay * 0.75 / 24);
    expect(result.cash).toBeCloseTo(state.cash - costs.mercenaryWagesPerDay * 0.75 / 24);
    expect(result.inventory.gasoline).toBe(10);
    expect(result.marketEvents.some(e => e.id === state.marketEvents[0].id)).toBe(false);
    expect(result.townStocks.dust_creek.water).toBeGreaterThan(0);
    expect(advanceGameTime(state, 48).day).toBe(3);
  });

  it("does not heal low HP during shortages and slows hungry animals", () => {
    const state = createInitialGameState(); state.hp = 0.5; state.cash = 0; state.inventory = {};
    state.hiredMercenaries = [{ ...AVAILABLE_MERCENARIES[0] }];
    const result = advanceGameTime(state, 24);
    expect(result.hp).toBe(0.5);
    expect(result.journalLogs.some(log => log.includes("Unpaid wages"))).toBe(true);
    const fed = moving(); fed.transport = "old_donkey"; fed.inventory.animal_forage = 10;
    const hungry = structuredClone(fed); hungry.inventory.animal_forage = 0;
    expect(advanceExploration(hungry, 0.1).exploration!.distanceTravelledKm).toBeCloseTo(advanceExploration(fed, 0.1).exploration!.distanceTravelledKm / 2, 8);
    expect(advanceGameTime(state, -1)).toBe(state);
    expect(advanceExploration(state, NaN)).toBe(state);
  });
});

describe("Combat initialization and save version 3", () => {
  it("creates no free player rounds, consumes inventory once and preserves loads", () => {
    const state = createInitialGameState(), encounter = generateRoadEncounter(state, ROUTES[0]);
    const before = structuredClone(state);
    expect(initializeTacticalCombat(state, encounter).units[0].currentMagAmmo).toBe(0);
    expect(state).toEqual(before);
    const loaded = initializeCombatWithAmmo(state, encounter);
    const count = ITEMS[state.equippedWeapon].weaponStats!.magazineSize;
    expect(loaded.combatState!.units[0].currentMagAmmo).toBe(count);
    expect(loaded.inventory.ammo_308! + loaded.weaponMagazines!.bolt_rifle_308!).toBe(12);
    expect(state).toEqual(before);
    expect(initializeCombatWithAmmo(loaded, encounter)).toBe(loaded);
    loaded.combatState = null; loaded.weaponMagazines = { bolt_rifle_308: 0 };
    expect(initializeCombatWithAmmo(loaded, encounter).inventory.ammo_308).toBe(loaded.inventory.ammo_308);
    state.inventory.ammo_308 = 0;
    expect(initializeCombatWithAmmo(state, encounter).combatState!.units[0].currentMagAmmo).toBe(0);
  });

  it("shares scarce ammo across guards, keeps unique positions, and gives cover only to vehicles", () => {
    const state = createInitialGameState(); state.hiredMercenaries = structuredClone(AVAILABLE_MERCENARIES);
    state.equippedWeapon = "revolver_38"; state.inventory.ammo_38 = 3;
    const encounter = generateRoadEncounter(state, ROUTES[0]);
    encounter.enemies = [...encounter.enemies, ...encounter.enemies, ...encounter.enemies];
    const result = initializeCombatWithAmmo(state, encounter), combat = result.combatState!;
    expect(combat.units[0].currentMagAmmo).toBe(3);
    expect(combat.units.find(u => u.id === "unit_merc_cassidy")!.currentMagAmmo).toBe(0);
    expect(new Set(combat.units.map(u => `${u.x},${u.y}`)).size).toBe(combat.units.length);
    for (const enemy of combat.units.filter(u => !u.isPlayerTeam)) {
      expect(enemy.reserveAmmo).toBe(ITEMS[enemy.weapon].weaponStats!.magazineSize * 2);
    }
    expect(combat.tiles.flat().some(tile => tile.cover === "wagon")).toBe(false);
    state.transport = "hand_cart";
    expect(initializeTacticalCombat(state, encounter).tiles.flat().some(tile => tile.cover === "wagon")).toBe(false);
    state.transport = "heavy_wagon_horse";
    expect(initializeTacticalCombat(state, encounter).tiles.flat().some(tile => tile.cover === "wagon")).toBe(true);
  });

  it("normalizes malformed saves without destroying valid inventory or optional economics", () => {
    for (const raw of [null, [], "bad json", { inventory: null }, { exploration: { x: Infinity, heading: NaN } }]) {
      const state = migrateGameState(raw); expect(state.saveVersion).toBe(3); expect(Number.isFinite(state.exploration!.x)).toBe(true);
    }
    const saved = createInitialGameState();
    saved.inventory = { ammo_308: 0, gasoline: 3.75, water: 22 };
    saved.weaponMagazines = { bolt_rifle_308: 2 };
    saved.averageCosts = { water: 2.5 };
    saved.acceptedBountyIds = ["bounty_one_eyed_pike"];
    saved.tradeLedger = [{ itemId: "water", quantity: 2, unitPrice: 4, day: 2, settlementId: "dust_creek", kind: "sell", profit: -2 }];
    saved.hiredMercenaries = [{ ...AVAILABLE_MERCENARIES[0], crippledLegs: true, magazines: { revolver_38: 4 } }];
    const migrated = migrateGameState(JSON.stringify(saved));
    expect(migrated.inventory).toEqual(saved.inventory);
    expect(migrated.weaponMagazines).toEqual(saved.weaponMagazines);
    expect(migrated.averageCosts).toEqual(saved.averageCosts);
    expect(migrated.acceptedBountyIds).toEqual(saved.acceptedBountyIds);
    expect(migrated.tradeLedger).toEqual(saved.tradeLedger);
    expect(migrated.hiredMercenaries[0].magazines).toEqual({ revolver_38: 4 });
    expect(migrated.hiredMercenaries[0].crippledLegs).toBe(true);
    expect(migrateGameState({ inventory: { water: -1, food_rations: NaN, unknown: 20 }, cash: "wrong", townStocks: { dust_creek: null } }).inventory).toEqual({ water: 0 });
  });

  it("generates bounty targets only for accepted contracts", () => {
    const state = createInitialGameState();
    const random = Math.random;
    try {
      Math.random = () => 0;
      expect(generateRoadEncounter(state, ROUTES[0]).isBountyTarget).toBe(false);
      state.acceptedBountyIds = ["bounty_one_eyed_pike"];
      expect(generateRoadEncounter(state, ROUTES[0]).bountyId).toBe("bounty_one_eyed_pike");
    } finally { Math.random = random; }
  });

  it("interpolates old travel saves to paused exploration", () => {
    const saved = createInitialGameState(); saved.currentSettlement = null;
    saved.travelState = { routeId: ROUTES[0].id, from: "dust_creek", to: "deadwood_gulch", totalDistanceKm: 42, distanceCoveredKm: 21, terrain: "scorched_flats", isPaused: false };
    const migrated = migrateGameState(saved);
    expect(migrated.exploration!.x).toBe(235); expect(migrated.exploration!.y).toBe(355);
    expect(migrated.exploration!.heading).toBe(getBearing(SETTLEMENTS.dust_creek.coordinates, SETTLEMENTS.deadwood_gulch.coordinates));
    expect(migrated.exploration!.isPaused).toBe(true); expect(migrated.travelState).toBeNull();
    expect(getWorldPosition(migrated)).toEqual({ x: 235, y: 355 });
  });

  it("restores combat rounds, loads, crouch, injuries, AP and duplicate saved positions safely", () => {
    const state = createInitialGameState();
    const loaded = initializeCombatWithAmmo(state, generateRoadEncounter(state, ROUTES[0]));
    const combat = loaded.combatState!;
    combat.units[0].currentMagAmmo = 1; combat.units[0].isCrouched = true; combat.units[0].crippledLegs = true; combat.units[0].ap = 2;
    combat.units[1].x = combat.units[0].x; combat.units[1].y = combat.units[0].y;
    combat.units[1].reserveAmmo = 0;
    const migrated = migrateGameState(loaded);
    expect(migrated.combatState!.units[0].currentMagAmmo).toBe(1);
    expect(migrated.weaponMagazines!.bolt_rifle_308).toBe(1);
    expect(migrated.combatState!.units[0].ap).toBe(2);
    expect(migrated.combatState!.units[0].isCrouched).toBe(true);
    expect(migrated.combatState!.units[0].crippledLegs).toBe(true);
    expect(migrated.combatState!.units[1].reserveAmmo).toBe(0);
    expect(new Set(migrated.combatState!.units.map(u => `${u.x},${u.y}`)).size).toBe(migrated.combatState!.units.length);
    expect(migrated.inventory).toEqual(loaded.inventory);
  });
});
