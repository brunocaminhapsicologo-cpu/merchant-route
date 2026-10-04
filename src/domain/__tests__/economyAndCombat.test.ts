import { describe, expect, it } from "vitest";
import {
  calculateShotPreview,
  generateRoadEncounter,
  initializeTacticalCombat,
} from "../combatEngine";
import {
  getCaravanSpeedBreakdown,
  getCurrentCargoWeightKg,
  getMarketPrices,
  getMaxAp,
  getMaxCargoCapacityKg,
  getMaxHp,
} from "../economyEngine";
import {
  createInitialGameState,
  ITEMS,
  ROUTES,
  SETTLEMENTS,
  TRANSPORTS,
} from "../worldData";

describe("Merchant Route — Domain Economy, Logistics & Combat Engine", () => {
  it("initializes Grandfather's inheritance accurately in Dust Creek", () => {
    const state = createInitialGameState();
    expect(state.cash).toBe(1000);
    expect(state.currentSettlement).toBe("dust_creek");
    expect(state.transport).toBe("old_donkey");
    expect(state.inventory.bolt_rifle_308).toBe(1);
    expect(state.inventory.ammo_308).toBe(12);
    expect(getMaxHp(state.attributes)).toBe(98);
    expect(getMaxAp(state.attributes)).toBe(7);
  });

  it("defines all 8 settlements, 14 weapons, 8 ammo calibers, and 10 transports", () => {
    const settlementIds = Object.keys(SETTLEMENTS);
    expect(settlementIds).toHaveLength(8);
    expect(settlementIds).toContain("tombstone_crossing");
    expect(settlementIds).toContain("new_chicago");

    const weaponItems = Object.values(ITEMS).filter(
      (i) => i.category === "weapon"
    );
    expect(weaponItems).toHaveLength(14);

    const ammoItems = Object.values(ITEMS).filter(
      (i) => i.category === "ammo"
    );
    expect(ammoItems).toHaveLength(8);

    const transportIds = Object.keys(TRANSPORTS);
    expect(transportIds).toHaveLength(10);
    expect(transportIds).toContain("hand_cart");
    expect(transportIds).toContain("pack_mule_team");
    expect(transportIds).toContain("brahmin_freight_wagon");
    expect(transportIds).toContain("desert_dune_buggy");
  });

  it("applies regional inflation between frontier towns and US metropolises", () => {
    const state = createInitialGameState();
    // Raw leather is produced in Deadwood Gulch and demanded in Saint Louis
    const deadwoodLeather = getMarketPrices(
      state,
      "deadwood_gulch",
      "raw_leather"
    );
    const stLouisLeather = getMarketPrices(state, "saint_louis", "raw_leather");

    expect(deadwoodLeather.buyPrice).toBeLessThan(stLouisLeather.sellPrice);

    // Gasoline is produced at Blackwater Rig and demanded in New Denver
    const rigGas = getMarketPrices(state, "blackwater_rig", "gasoline");
    const denverGas = getMarketPrices(state, "new_denver", "gasoline");
    expect(rigGas.buyPrice).toBeLessThan(denverGas.sellPrice);
  });

  it("improves buy and sell prices when Charisma attribute increases", () => {
    const lowChaState = createInitialGameState();
    lowChaState.attributes.charisma = 2;

    const highChaState = createInitialGameState();
    highChaState.attributes.charisma = 9;

    const lowChaPrices = getMarketPrices(
      lowChaState,
      "saint_louis",
      "antibiotics"
    );
    const highChaPrices = getMarketPrices(
      highChaState,
      "saint_louis",
      "antibiotics"
    );

    expect(highChaPrices.buyPrice).toBeLessThanOrEqual(lowChaPrices.buyPrice);
    expect(highChaPrices.sellPrice).toBeGreaterThanOrEqual(
      lowChaPrices.sellPrice
    );
  });

  it("calculates caravan speed based on transport, weight load, and fuel", () => {
    const state = createInitialGameState();
    const lightSpeed = getCaravanSpeedBreakdown(state, "old_highway");
    expect(lightSpeed.statusLabel).toBe("Optimal");

    // Overload the donkey with 40 steel ingots (160 kg)
    state.inventory.scrap_metal = 40;
    expect(getCurrentCargoWeightKg(state.inventory)).toBeGreaterThan(
      getMaxCargoCapacityKg(state)
    );
    const overloadedSpeed = getCaravanSpeedBreakdown(state, "old_highway");
    expect(overloadedSpeed.statusLabel).toBe("Overloaded");
    expect(overloadedSpeed.effectiveSpeedKmh).toBeLessThan(
      lightSpeed.effectiveSpeedKmh
    );

    // Switch to Motorcycle without gasoline -> should stall ("Out of Fuel")
    state.inventory.scrap_metal = 0;
    state.transport = "scrap_motorcycle";
    state.inventory.gasoline = 0;
    const noFuelSpeed = getCaravanSpeedBreakdown(state, "old_highway");
    expect(noFuelSpeed.statusLabel).toBe("Out of Fuel");
    expect(noFuelSpeed.hasFuelIfMotor).toBe(false);

    // Add gasoline -> motorcycle moves fast!
    state.inventory.gasoline = 10;
    const fueledBikeSpeed = getCaravanSpeedBreakdown(state, "old_highway");
    expect(fueledBikeSpeed.statusLabel).toBe("Optimal");
    expect(fueledBikeSpeed.effectiveSpeedKmh).toBeGreaterThan(25);
  });

  it("initializes top-down tactical combat with AP and calculates Snap, Aimed, Headshot, Legshot & Crouch modifiers", () => {
    const state = createInitialGameState();
    const encounter = generateRoadEncounter(state, ROUTES[0]);
    const combat = initializeTacticalCombat(state, encounter);

    const playerUnit = combat.units.find((u) => u.id === "unit_player")!;
    const enemyUnit = combat.units.find((u) => !u.isPlayerTeam)!;

    // Give player enough AP to test all modes and move enemy to (6, 3) (Ruins cover: -35% hit)
    playerUnit.ap = 10;
    playerUnit.maxAp = 10;
    enemyUnit.x = 6;
    enemyUnit.y = 3;

    const snapPreview = calculateShotPreview(
      combat,
      playerUnit,
      enemyUnit,
      "snap"
    );
    const aimedPreview = calculateShotPreview(
      combat,
      playerUnit,
      enemyUnit,
      "aimed"
    );
    const headshotPreview = calculateShotPreview(
      combat,
      playerUnit,
      enemyUnit,
      "headshot"
    );
    const legshotPreview = calculateShotPreview(
      combat,
      playerUnit,
      enemyUnit,
      "legshot"
    );

    expect(snapPreview.canAttack).toBe(true);
    expect(aimedPreview.canAttack).toBe(true);
    expect(headshotPreview.canAttack).toBe(true);
    expect(legshotPreview.canAttack).toBe(true);

    // AP costs
    expect(aimedPreview.apCost).toBeGreaterThan(snapPreview.apCost);
    expect(headshotPreview.apCost).toBe(aimedPreview.apCost + 1);
    expect(legshotPreview.apCost).toBe(aimedPreview.apCost);

    // Accuracy relationships
    expect(aimedPreview.hitChancePercent).toBeGreaterThan(
      snapPreview.hitChancePercent
    );
    expect(headshotPreview.hitChancePercent).toBeLessThan(
      snapPreview.hitChancePercent
    );
    expect(legshotPreview.hitChancePercent).toBeLessThan(
      snapPreview.hitChancePercent
    );

    // Damage multipliers (1.9x headshot > 1.2x aimed > 1.0x snap > 0.85x legshot)
    expect(headshotPreview.maxDamage).toBeGreaterThan(aimedPreview.maxDamage);
    expect(aimedPreview.maxDamage).toBeGreaterThan(snapPreview.maxDamage);
    expect(snapPreview.maxDamage).toBeGreaterThan(legshotPreview.maxDamage);

    // Crouch stance modifiers (+8% attacker accuracy, -15% target hit chance)
    playerUnit.isCrouched = true;
    const crouchedAttackerPreview = calculateShotPreview(
      combat,
      playerUnit,
      enemyUnit,
      "snap"
    );
    expect(crouchedAttackerPreview.hitChancePercent).toBe(
      snapPreview.hitChancePercent + 8
    );

    enemyUnit.isCrouched = true;
    const bothCrouchedPreview = calculateShotPreview(
      combat,
      playerUnit,
      enemyUnit,
      "snap"
    );
    expect(bothCrouchedPreview.hitChancePercent).toBe(
      crouchedAttackerPreview.hitChancePercent - 15
    );
  });
});
