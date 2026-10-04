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
import { createInitialGameState, ROUTES } from "../worldData";

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

  it("initializes top-down tactical combat with AP and calculates Snap vs Aimed Shot", () => {
    const state = createInitialGameState();
    const encounter = generateRoadEncounter(state, ROUTES[0]);
    const combat = initializeTacticalCombat(state, encounter);

    const playerUnit = combat.units.find((u) => u.id === "unit_player")!;
    const enemyUnit = combat.units.find((u) => !u.isPlayerTeam)!;

    // Move enemy within 6 tiles of player for shot preview test
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

    expect(snapPreview.canAttack).toBe(true);
    expect(aimedPreview.canAttack).toBe(true);
    expect(aimedPreview.apCost).toBeGreaterThan(snapPreview.apCost);
    expect(aimedPreview.hitChancePercent).toBeGreaterThan(
      snapPreview.hitChancePercent
    );
  });
});
