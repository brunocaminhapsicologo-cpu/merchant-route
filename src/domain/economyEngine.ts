import {
  CharacterAttributes,
  GameState,
  ItemId,
  SettlementId,
  TerrainType,
  TransportDefinition,
  TransportId,
  FreightContract,
  PassengerContract,
} from "./types";
import { ITEMS, ROUTES, SETTLEMENTS, TRANSPORTS } from "./worldData";

export function getMaxHp(attributes: CharacterAttributes): number {
  return 50 + attributes.grit * 12;
}

export function getMaxAp(attributes: CharacterAttributes): number {
  return 5 + Math.floor(attributes.agility / 2);
}

export function getRangedAccuracyBonus(attributes: CharacterAttributes): number {
  return attributes.perception * 4;
}

export function getCharismaPriceDelta(attributes: CharacterAttributes): number {
  // Each point of charisma improves buy/sell margin by 2.5% (capped at 30%)
  return Math.min(0.3, attributes.charisma * 0.025);
}

export function getCurrentCargoWeightKg(
  inventory: Partial<Record<ItemId, number>>
): number {
  let total = 0;
  for (const [key, qty] of Object.entries(inventory)) {
    const itemId = key as ItemId;
    const count = qty ?? 0;
    if (count > 0 && ITEMS[itemId]) {
      total += count * ITEMS[itemId].weightKg;
    }
  }
  return Math.round(total * 100) / 100;
}

export function getActiveTransportDefinition(state: GameState): TransportDefinition {
  const activeIds = state.activeTransports?.length
    ? state.activeTransports
    : (state.activeFleet && state.activeFleet[state.transport]
        ? (Object.keys(state.activeFleet) as TransportId[])
        : [state.transport]);

  const fleetUnits: TransportDefinition[] = [];
  for (const id of activeIds) {
    const def = TRANSPORTS[id];
    if (def) {
      const count = state.activeFleet?.[id] && state.activeFleet[id]! > 0 ? state.activeFleet[id]! : 1;
      for (let i = 0; i < count; i++) {
        fleetUnits.push(def);
      }
    }
  }

  const units = fleetUnits.length > 0 ? fleetUnits : [TRANSPORTS[state.transport]].filter(Boolean);

  if (units.length <= 1) return units[0] ?? TRANSPORTS[state.transport];

  const terrains = ["old_highway", "scorched_flats", "sand_dunes", "rocky_canyon"] as const;
  const baseSpeed = Math.min(...units.map(u => u.baseSpeedKmh));
  return {
    ...units[0],
    name: `Caravan Fleet (${units.length} units)`,
    baseSpeedKmh: baseSpeed,
    propulsion: units.some(u => u.propulsion === "motor") ? "motor" : units.some(u => u.propulsion === "animal") ? "animal" : "human",
    maxCargoKg: units.reduce((n, u) => n + u.maxCargoKg, 0),
    waterPerDay: units.reduce((n, u) => n + u.waterPerDay, 0),
    foragePerDay: units.reduce((n, u) => n + u.foragePerDay, 0),
    fuelLitersPer10Km: units.reduce((n, u) => n + u.fuelLitersPer10Km, 0),
    terrainSpeedMultipliers: Object.fromEntries(
      terrains.map(t => [t, Math.min(...units.map(u => u.baseSpeedKmh * u.terrainSpeedMultipliers[t])) / baseSpeed])
    ) as TransportDefinition["terrainSpeedMultipliers"],
  };
}

export function getMaxCargoCapacityKg(state: GameState): number {
  const transportDef = getActiveTransportDefinition(state);
  const personalBonus = state.attributes.grit * 6;
  return transportDef.maxCargoKg + personalBonus;
}

export interface SpeedBreakdown {
  effectiveSpeedKmh: number;
  baseSpeedKmh: number;
  terrainMultiplier: number;
  weightMultiplier: number;
  hasFuelIfMotor: boolean;
  loadRatio: number;
  statusLabel: "Optimal" | "Heavy Load" | "Overloaded" | "Out of Fuel" | "Broken Down";
}

export function getCaravanSpeedBreakdown(
  state: GameState,
  terrain: TerrainType = "scorched_flats"
): SpeedBreakdown {
  const transportDef = getActiveTransportDefinition(state);
  const currentWeight = getCurrentCargoWeightKg(state.inventory);
  const maxCapacity = getMaxCargoCapacityKg(state);
  const loadRatio = maxCapacity > 0 ? currentWeight / maxCapacity : 1;

  const gasolineAvailable = state.inventory.gasoline ?? 0;
  const hasFuelIfMotor =
    transportDef.propulsion !== "motor" || gasolineAvailable > 0;

  if (!hasFuelIfMotor) {
    return {
      effectiveSpeedKmh: 0,
      baseSpeedKmh: transportDef.baseSpeedKmh,
      terrainMultiplier: 1,
      weightMultiplier: 0.1,
      hasFuelIfMotor: false,
      loadRatio,
      statusLabel: "Out of Fuel",
    };
  }

  const terrainMultiplier = transportDef.terrainSpeedMultipliers[terrain] ?? 1.0;

  let weightMultiplier = 1.0;
  let statusLabel: SpeedBreakdown["statusLabel"] = "Optimal";

  if (loadRatio <= 0.7) {
    weightMultiplier = 1.0;
    statusLabel = "Optimal";
  } else if (loadRatio <= 1.0) {
    // Between 70% and 100% capacity, speed scales linearly from 100% down to 72%
    const excessRatio = (loadRatio - 0.7) / 0.3;
    weightMultiplier = 1.0 - excessRatio * 0.28;
    statusLabel = "Heavy Load";
  } else {
    // Overloaded (>100%)
    weightMultiplier = Math.max(0.25, 0.5 - (loadRatio - 1.0) * 0.6);
    statusLabel = "Overloaded";
  }

  const agilityTrailFactor = 1 + state.attributes.agility * 0.015;
  const forageFactor = transportDef.foragePerDay > 0 && (state.inventory.animal_forage ?? 0) <= 0 ? 0.5 : 1;
  const isBroken = state.isBrokenDown || (state.vehicleCondition !== undefined && state.vehicleCondition <= 0);
  const conditionFactor = isBroken ? 0.5 : 1.0;
  if (isBroken) statusLabel = "Broken Down";
  const rawSpeed =
    transportDef.baseSpeedKmh *
    terrainMultiplier *
    weightMultiplier *
    agilityTrailFactor *
    forageFactor *
    conditionFactor;

  return {
    effectiveSpeedKmh: Math.max(1.5, Math.round(rawSpeed * 10) / 10),
    baseSpeedKmh: transportDef.baseSpeedKmh,
    terrainMultiplier,
    weightMultiplier: Math.round(weightMultiplier * 100) / 100,
    hasFuelIfMotor: true,
    loadRatio: Math.round(loadRatio * 100) / 100,
    statusLabel,
  };
}

export function getDynamicScarcityFactor(
  state: GameState,
  settlementId: SettlementId,
  itemId: ItemId
): number {
  const settlement = SETTLEMENTS[settlementId];
  const baseStock = settlement.baseStock[itemId] ?? 15;
  const currentStock = state.townStocks[settlementId]?.[itemId] ?? baseStock;

  if (baseStock <= 0) return 1.0;
  const ratio = currentStock / baseStock;

  // Low stock increases price up to 1.35x; saturated stock lowers price down to 0.68x
  if (ratio < 1) {
    return Math.min(1.35, 1 + (1 - ratio) * 0.35);
  }
  if (ratio > 1) {
    return Math.max(0.68, 1 - (ratio - 1) * 0.18);
  }
  return 1.0;
}

export function getActiveEventMultiplier(
  state: GameState,
  settlementId: SettlementId,
  itemId: ItemId
): number {
  const matchingEvent = state.marketEvents.find(
    (evt) =>
      evt.settlementId === settlementId &&
      evt.affectedItem === itemId &&
      evt.daysRemaining > 0
  );
  return matchingEvent ? matchingEvent.priceMultiplier : 1.0;
}

export function getMarketPrices(
  state: GameState,
  settlementId: SettlementId,
  itemId: ItemId
): {
  buyPrice: number;
  sellPrice: number;
  regionalMultiplier: number;
  scarcityFactor: number;
  eventMultiplier: number;
  relativeToBasePercent: number;
} {
  const item = ITEMS[itemId];
  const settlement = SETTLEMENTS[settlementId];
  const regionalMultiplier = settlement.priceMultipliers[itemId] ?? 1.0;
  const scarcityFactor = getDynamicScarcityFactor(state, settlementId, itemId);
  const eventMultiplier = getActiveEventMultiplier(state, settlementId, itemId);
  const charismaDelta = getCharismaPriceDelta(state.attributes);

  const marketMidPrice =
    item.basePrice * regionalMultiplier * scarcityFactor * eventMultiplier;

  // Buying costs slightly above mid-price, reduced by Charisma
  const rawBuy = marketMidPrice * (1.08 - charismaDelta * 0.6);
  // Selling pays slightly below mid-price, boosted by Charisma
  const rawSell = marketMidPrice * (0.86 + charismaDelta * 0.55);

  const buyPrice = Math.max(1, Math.round(rawBuy));
  const sellPrice = Math.max(1, Math.min(buyPrice - 1, Math.round(rawSell)));

  const relativeToBasePercent = Math.round(
    (marketMidPrice / item.basePrice) * 100
  );

  return {
    buyPrice,
    sellPrice: Math.max(1, sellPrice),
    regionalMultiplier,
    scarcityFactor,
    eventMultiplier,
    relativeToBasePercent,
  };
}

export function getTradeRouteRecommendation(itemId: ItemId): {
  cheapestSettlement: string;
  highestDemandSettlement: string;
} {
  let lowestMult = 999;
  let highestMult = 0;
  let cheapestSettlement = "Dust Creek";
  let highestDemandSettlement = "Saint Louis";

  for (const settlement of Object.values(SETTLEMENTS)) {
    const mult = settlement.priceMultipliers[itemId] ?? 1.0;
    if (mult < lowestMult) {
      lowestMult = mult;
      cheapestSettlement = settlement.name;
    }
    if (mult > highestMult) {
      highestMult = mult;
      highestDemandSettlement = settlement.name;
    }
  }

  return { cheapestSettlement, highestDemandSettlement };
}

export function getRouteBetween(
  a: SettlementId,
  b: SettlementId
): (typeof ROUTES)[number] | undefined {
  return ROUTES.find(
    (r) => (r.from === a && r.to === b) || (r.from === b && r.to === a)
  );
}

export function getDailyUpkeepSummary(state: GameState): {
  humanWaterPerDay: number;
  humanFoodPerDay: number;
  animalWaterPerDay: number;
  animalForagePerDay: number;
  totalWaterPerDay: number;
  mercenaryWagesPerDay: number;
  fuelPer10Km: number;
} {
  const crewSize = 1 + state.hiredMercenaries.length;
  const passengerCount = (state.passengerContracts ?? [])
    .filter(p => p.accepted && !p.completed)
    .reduce((sum, p) => sum + p.passengerCount, 0);
  const transportDef = getActiveTransportDefinition(state);

  const humanWaterPerDay = (crewSize + passengerCount) * 2;
  const humanFoodPerDay = (crewSize + passengerCount) * 1.5;
  const animalWaterPerDay = transportDef.waterPerDay;
  const animalForagePerDay = transportDef.foragePerDay;

  const charismaDiscount = 1 - Math.min(0.25, state.attributes.charisma * 0.02);
  const rawWages = state.hiredMercenaries.reduce(
    (sum, m) => sum + m.dailyWage,
    0
  );
  const mercenaryWagesPerDay = Math.round(rawWages * charismaDiscount);

  return {
    humanWaterPerDay,
    humanFoodPerDay,
    animalWaterPerDay,
    animalForagePerDay,
    totalWaterPerDay: humanWaterPerDay + animalWaterPerDay,
    mercenaryWagesPerDay,
    fuelPer10Km: transportDef.fuelLitersPer10Km,
  };
}

export function repairCaravan(
  state: GameState,
  method: "tools" | "diesel_parts" | "depot"
): { state: GameState; success: boolean; message: string } {
  const currentCondition = state.vehicleCondition ?? 100;
  if (currentCondition >= 100 && !state.isBrokenDown) {
    return { state, success: false, message: "Caravan is already in peak operational condition." };
  }

  if (method === "tools") {
    const count = state.inventory.tools ?? 0;
    if (count <= 0) return { state, success: false, message: "No machinist tools available for roadside repair." };
    const nextCondition = Math.min(100, currentCondition + 40);
    return {
      state: {
        ...state,
        vehicleCondition: nextCondition,
        isBrokenDown: false,
        inventory: { ...state.inventory, tools: count - 1 },
        journalLogs: [`Roadside repairs completed using Machinist Tools. Condition restored to ${nextCondition}%.`, ...state.journalLogs].slice(0, 200),
      },
      success: true,
      message: `Roadside repair successful (+40% condition). Current: ${nextCondition}%.`,
    };
  }

  if (method === "diesel_parts") {
    const count = state.inventory.diesel_parts ?? 0;
    if (count <= 0) return { state, success: false, message: "No engine replacement parts available." };
    const nextCondition = Math.min(100, currentCondition + 75);
    return {
      state: {
        ...state,
        vehicleCondition: nextCondition,
        isBrokenDown: false,
        inventory: { ...state.inventory, diesel_parts: count - 1 },
        journalLogs: [`Replaced worn mechanical components with Diesel Engine Parts. Condition restored to ${nextCondition}%.`, ...state.journalLogs].slice(0, 200),
      },
      success: true,
      message: `Mechanical overhaul successful (+75% condition). Current: ${nextCondition}%.`,
    };
  }

  if (method === "depot") {
    if (!state.currentSettlement) {
      return { state, success: false, message: "Depot overhaul requires being docked at a settlement." };
    }
    const cost = 50;
    if (state.cash < cost) {
      return { state, success: false, message: `Depot maintenance requires $${cost}.` };
    }
    return {
      state: {
        ...state,
        cash: state.cash - cost,
        vehicleCondition: 100,
        isBrokenDown: false,
        operatingCosts: (state.operatingCosts ?? 0) + cost,
        journalLogs: [`Depot engineers serviced the caravan fleet. Restored to 100% condition for $${cost}.`, ...state.journalLogs].slice(0, 200),
      },
      success: true,
      message: "Full depot service completed (100% condition).",
    };
  }

  return { state, success: false, message: "Unknown repair method." };
}

export function generateAvailableContracts(
  settlementId: SettlementId,
  currentDay: number
): { freight: FreightContract[]; passengers: PassengerContract[] } {
  const towns = (Object.keys(SETTLEMENTS) as SettlementId[]).filter(id => id !== settlementId);
  const targetA = towns[Math.floor(towns.length * 0.25)] ?? "saint_louis";
  const targetB = towns[Math.floor(towns.length * 0.75)] ?? "deadwood_gulch";

  const freight: FreightContract[] = [
    {
      id: `freight_${settlementId}_${currentDay}_1`,
      title: `Emergency Water Relief to ${SETTLEMENTS[targetA].name}`,
      originSettlement: settlementId,
      destinationSettlement: targetA,
      cargoItem: "water",
      cargoQuantity: 10,
      rewardCash: 160,
      deadlineDay: currentDay + 7,
      accepted: false,
      completed: false,
    },
    {
      id: `freight_${settlementId}_${currentDay}_2`,
      title: `Industrial Smelted Scrap Shipment to ${SETTLEMENTS[targetB].name}`,
      originSettlement: settlementId,
      destinationSettlement: targetB,
      cargoItem: "scrap_metal",
      cargoQuantity: 5,
      rewardCash: 280,
      deadlineDay: currentDay + 10,
      accepted: false,
      completed: false,
    },
  ];

  const passengers: PassengerContract[] = [
    {
      id: `passenger_${settlementId}_${currentDay}_1`,
      passengerName: "Frontier Doctor & Medic Team",
      originSettlement: settlementId,
      destinationSettlement: targetA,
      passengerCount: 2,
      rewardCash: 220,
      deadlineDay: currentDay + 8,
      accepted: false,
      completed: false,
      waterDemandPerDay: 4,
      foodDemandPerDay: 3,
    },
  ];

  return { freight, passengers };
}

export function completeContractsAtSettlement(
  state: GameState,
  settlementId: SettlementId
): { state: GameState; completedFreight: FreightContract[]; completedPassengers: PassengerContract[]; totalPayout: number } {
  let cashEarned = 0;
  let repGained = 0;
  const completedFreight: FreightContract[] = [];
  const completedPassengers: PassengerContract[] = [];
  const inventory = { ...state.inventory };
  const logs: string[] = [];

  const updatedFreight = (state.freightContracts ?? []).map(fc => {
    if (fc.accepted && !fc.completed && fc.destinationSettlement === settlementId) {
      const carried = inventory[fc.cargoItem] ?? 0;
      if (carried >= fc.cargoQuantity) {
        inventory[fc.cargoItem] = carried - fc.cargoQuantity;
        cashEarned += fc.rewardCash;
        repGained += 5;
        completedFreight.push(fc);
        logs.push(`Freight Contract Delivered: Delivered ${fc.cargoQuantity}x ${ITEMS[fc.cargoItem].name} to ${SETTLEMENTS[settlementId].name} (+$${fc.rewardCash}).`);
        return { ...fc, completed: true };
      }
    }
    return fc;
  });

  const updatedPassengers = (state.passengerContracts ?? []).map(pc => {
    if (pc.accepted && !pc.completed && pc.destinationSettlement === settlementId) {
      cashEarned += pc.rewardCash;
      repGained += 4;
      completedPassengers.push(pc);
      logs.push(`Passenger Escort Complete: ${pc.passengerName} arrived safely at ${SETTLEMENTS[settlementId].name} (+$${pc.rewardCash}).`);
      return { ...pc, completed: true };
    }
    return pc;
  });

  return {
    state: {
      ...state,
      cash: state.cash + cashEarned,
      reputation: state.reputation + repGained,
      inventory,
      freightContracts: updatedFreight,
      passengerContracts: updatedPassengers,
      journalLogs: [...logs, ...state.journalLogs].slice(0, 200),
    },
    completedFreight,
    completedPassengers,
    totalPayout: cashEarned,
  };
}

