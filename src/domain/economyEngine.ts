import {
  CharacterAttributes,
  GameState,
  ItemId,
  SettlementId,
  TerrainType,
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

export function getMaxCargoCapacityKg(state: GameState): number {
  const transportDef = TRANSPORTS[state.transport];
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
  statusLabel: "Optimal" | "Heavy Load" | "Overloaded" | "Out of Fuel";
}

export function getCaravanSpeedBreakdown(
  state: GameState,
  terrain: TerrainType = "scorched_flats"
): SpeedBreakdown {
  const transportDef = TRANSPORTS[state.transport];
  const currentWeight = getCurrentCargoWeightKg(state.inventory);
  const maxCapacity = getMaxCargoCapacityKg(state);
  const loadRatio = maxCapacity > 0 ? currentWeight / maxCapacity : 1;

  const gasolineAvailable = state.inventory.gasoline ?? 0;
  const hasFuelIfMotor =
    transportDef.propulsion !== "motor" || gasolineAvailable > 0;

  if (!hasFuelIfMotor) {
    return {
      effectiveSpeedKmh: 2.2,
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
  const rawSpeed =
    transportDef.baseSpeedKmh *
    terrainMultiplier *
    weightMultiplier *
    agilityTrailFactor;

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
  const transportDef = TRANSPORTS[state.transport];

  const humanWaterPerDay = crewSize * 2;
  const humanFoodPerDay = crewSize * 1.5;
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
