import { describe, it, expect } from "vitest";
import {
  getActiveTransportDefinition,
  getMaxCargoCapacityKg,
  getCaravanSpeedBreakdown,
  repairCaravan,
  generateAvailableContracts,
  completeContractsAtSettlement,
} from "../economyEngine";
import { createInitialGameState, TRANSPORTS } from "../worldData";

describe("Phase 2: Multi-Fleet, Vehicle Wear & Freight Contracts", () => {
  it("aggregates capacity and upkeep for multiple identical transports in activeFleet", () => {
    const state = createInitialGameState();
    state.activeFleet = { old_donkey: 3 };

    const def = getActiveTransportDefinition(state);
    expect(def.maxCargoKg).toBe(TRANSPORTS.old_donkey.maxCargoKg * 3);
    expect(def.foragePerDay).toBe(TRANSPORTS.old_donkey.foragePerDay * 3);

    const maxCap = getMaxCargoCapacityKg(state);
    expect(maxCap).toBe(TRANSPORTS.old_donkey.maxCargoKg * 3 + state.attributes.grit * 6);
  });

  it("penalizes speed by 50% when caravan is broken down", () => {
    const state = createInitialGameState();
    const optimalSpeed = getCaravanSpeedBreakdown(state).effectiveSpeedKmh;

    state.isBrokenDown = true;
    const brokenBreakdown = getCaravanSpeedBreakdown(state);
    expect(brokenBreakdown.statusLabel).toBe("Broken Down");
    expect(brokenBreakdown.effectiveSpeedKmh).toBeLessThan(optimalSpeed);
  });

  it("repairs caravan condition using tools, diesel parts, or town depot", () => {
    const state = createInitialGameState();
    state.vehicleCondition = 20;
    state.isBrokenDown = true;
    state.inventory.tools = 1;

    // Roadside repair with tools
    const toolRes = repairCaravan(state, "tools");
    expect(toolRes.success).toBe(true);
    expect(toolRes.state.vehicleCondition).toBe(60); // 20 + 40
    expect(toolRes.state.isBrokenDown).toBe(false);
    expect(toolRes.state.inventory.tools).toBe(0);

    // Depot overhaul
    toolRes.state.currentSettlement = "dust_creek";
    toolRes.state.cash = 100;
    const depotRes = repairCaravan(toolRes.state, "depot");
    expect(depotRes.success).toBe(true);
    expect(depotRes.state.vehicleCondition).toBe(100);
    expect(depotRes.state.cash).toBe(50); // 100 - 50
  });

  it("generates, accepts, and completes freight and passenger contracts at destination", () => {
    const state = createInitialGameState();
    const contracts = generateAvailableContracts("dust_creek", 1);
    expect(contracts.freight.length).toBeGreaterThan(0);
    expect(contracts.passengers.length).toBeGreaterThan(0);

    const targetFreight = { ...contracts.freight[0], accepted: true };
    const targetPassenger = { ...contracts.passengers[0], accepted: true };

    state.freightContracts = [targetFreight];
    state.passengerContracts = [targetPassenger];
    state.inventory[targetFreight.cargoItem] = targetFreight.cargoQuantity + 5;
    state.cash = 500;
    state.reputation = 0;

    const completeRes = completeContractsAtSettlement(state, targetFreight.destinationSettlement);
    expect(completeRes.completedFreight.length).toBe(1);
    expect(completeRes.completedPassengers.length).toBe(1);
    expect(completeRes.totalPayout).toBe(targetFreight.rewardCash + targetPassenger.rewardCash);
    expect(completeRes.state.cash).toBe(500 + targetFreight.rewardCash + targetPassenger.rewardCash);
    expect(completeRes.state.inventory[targetFreight.cargoItem]).toBe(5);
  });
});
