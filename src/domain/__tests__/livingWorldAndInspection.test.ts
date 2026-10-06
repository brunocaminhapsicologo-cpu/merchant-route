import { describe, it, expect } from "vitest";
import {
  advanceExploration,
  advanceRovingEntities,
  scavengeSecretLocation,
} from "../navigationEngine";
import { completeContractsAtSettlement } from "../economyEngine";
import { createInitialGameState, SECRET_LOCATIONS } from "../worldData";
import { FreightContract, ItemId, PassengerContract, RovingEntity } from "../types";

describe("Phase 3: Living World, Secret POIs & Contraband Gate Inspection", () => {
  it("discovers uncharted landmarks when caravan passes within perception radius", () => {
    const state = createInitialGameState();
    state.currentSettlement = null;
    // Position caravan near abandoned_mine (x: 520, y: 180)
    state.exploration = {
      x: 510,
      y: 160,
      heading: 180, // heading south toward 180
      distanceTravelledKm: 0,
      terrain: "scorched_flats",
      isMoving: true,
      isPaused: false,
    };
    state.discoveredSecretIds = [];

    const next = advanceExploration(state, 1);
    expect(next.discoveredSecretIds).toContain("abandoned_mine");
    expect(next.journalLogs.some((l) => l.includes("Old Uranium Prospect Mine"))).toBe(true);
  });

  it("scavenges discovered secret locations once and secures cash and cargo", () => {
    const state = createInitialGameState();
    state.currentSettlement = null;
    const secret = SECRET_LOCATIONS[0]; // abandoned_mine (x: 520, y: 180)
    state.exploration = {
      x: secret.x,
      y: secret.y,
      heading: 0,
      distanceTravelledKm: 10,
      terrain: "scorched_flats",
      isMoving: false,
      isPaused: true,
    };
    state.discoveredSecretIds = [secret.id];
    state.clearedSecretIds = [];
    const startingCash = state.cash;

    // First scavenge
    const scavenged = scavengeSecretLocation(state, secret.id);
    expect(scavenged.clearedSecretIds).toContain(secret.id);
    expect(scavenged.cash).toBe(startingCash + secret.lootCash);
    for (const [itemId, qty] of Object.entries(secret.lootItems)) {
      expect(scavenged.inventory[itemId as ItemId]).toBeGreaterThanOrEqual(qty!);
    }

    // Attempt second scavenge on same secret
    const doubleScavenged = scavengeSecretLocation(scavenged, secret.id);
    expect(doubleScavenged.cash).toBe(scavenged.cash);
  });

  it("advances roving entities towards their waypoints over time", () => {
    const testEntities: RovingEntity[] = [
      {
        id: "test_trader",
        name: "Test Trader",
        type: "trader",
        x: 100,
        y: 100,
        targetX: 200,
        targetY: 100,
        speedKmh: 10,
        heading: 90,
        description: "Test merchant caravan",
      },
    ];

    const advanced = advanceRovingEntities(testEntities, 2);
    // In 2 hours at 10 km/h = 20 km = 100 map units (0.2 km/unit)
    expect(advanced[0].x).toBeGreaterThan(100);
    expect(advanced[0].x).toBeCloseTo(200, 1);
  });

  it("automatically fulfills freight and passenger contracts when entering destination", () => {
    const state = createInitialGameState();
    const destination = "saint_louis";

    const freight: FreightContract = {
      id: "contract_freight_test",
      title: "Deliver Medical Crates",
      originSettlement: "dust_creek",
      destinationSettlement: destination,
      cargoItem: "antibiotics",
      cargoQuantity: 2,
      rewardCash: 350,
      deadlineDay: 10,
      accepted: true,
      completed: false,
    };

    const passenger: PassengerContract = {
      id: "contract_passenger_test",
      passengerName: "Railroad Surveyor",
      originSettlement: "dust_creek",
      destinationSettlement: destination,
      passengerCount: 1,
      rewardCash: 180,
      deadlineDay: 10,
      accepted: true,
      completed: false,
      waterDemandPerDay: 2,
      foodDemandPerDay: 1,
    };

    state.freightContracts = [freight];
    state.passengerContracts = [passenger];
    state.inventory.antibiotics = 3;
    const initialCash = state.cash;

    const result = completeContractsAtSettlement(state, destination);
    expect(result.completedFreight.length).toBe(1);
    expect(result.completedPassengers.length).toBe(1);
    expect(result.totalPayout).toBe(350 + 180);
    expect(result.state.cash).toBe(initialCash + 530);
    expect(result.state.inventory.antibiotics).toBe(1); // 3 - 2 delivered
    expect(result.state.freightContracts?.[0].completed).toBe(true);
    expect(result.state.passengerContracts?.[0].completed).toBe(true);
  });

  it("populates road and off-road caravans (merchants, travelers, police on horses/cars, and bandits) with smooth sub-pixel movement", () => {
    const state = createInitialGameState();
    const entities = state.rovingEntities ?? [];
    expect(entities.length).toBeGreaterThanOrEqual(12);

    // Must include all 4 categories: trader, traveler, sheriff_patrol, raider
    expect(entities.some((e) => e.type === "trader")).toBe(true);
    expect(entities.some((e) => e.type === "traveler")).toBe(true);
    expect(entities.some((e) => e.type === "sheriff_patrol")).toBe(true);
    expect(entities.some((e) => e.type === "raider")).toBe(true);

    // Must include both on-road and off-road caravans
    expect(entities.some((e) => e.routeMode === "road")).toBe(true);
    expect(entities.some((e) => e.routeMode === "offroad")).toBe(true);

    // Police patrols must strictly use at least horses or cars (>= 10 km/h)
    const policePatrols = entities.filter((e) => e.type === "sheriff_patrol");
    expect(policePatrols.length).toBeGreaterThanOrEqual(3);
    for (const patrol of policePatrols) {
      expect(patrol.speedKmh).toBeGreaterThanOrEqual(10);
      expect(patrol.transportLabel).toMatch(/Cavalo|Viatura/i);
    }

    // Sub-pixel smooth movement on small animation slices
    const microAdvanced = advanceRovingEntities(entities, 0.015);
    expect(microAdvanced.some((e) => !Number.isInteger(e.x) || !Number.isInteger(e.y))).toBe(true);
  });
});

