import { GameState, ItemId, RovingEntity, SettlementId, TerrainType } from "./types";
import { getCaravanSpeedBreakdown, getDailyUpkeepSummary, getActiveTransportDefinition } from "./economyEngine";
import { ROUTES, SECRET_LOCATIONS, SETTLEMENTS } from "./worldData";

export const WORLD_KM_PER_UNIT = 0.2;
type Position = { x: number; y: number };
const clamp = (n: number, max: number) => Math.max(0, Math.min(max, n));

export function getBearing(from: Position, to: Position): number {
  if (from.x === to.x && from.y === to.y) return 0;
  return (Math.atan2(to.x - from.x, from.y - to.y) * 180 / Math.PI + 360) % 360;
}

export function getDistanceKm(from: Position, to: Position): number {
  return Math.hypot(to.x - from.x, to.y - from.y) * WORLD_KM_PER_UNIT;
}

export function getWorldPosition(state: GameState): Position {
  if (state.currentSettlement) return { ...SETTLEMENTS[state.currentSettlement].coordinates };
  if (state.exploration) return { x: state.exploration.x, y: state.exploration.y };
  if (state.travelState) {
    const travel = state.travelState;
    const a = SETTLEMENTS[travel.from].coordinates;
    const b = SETTLEMENTS[travel.to].coordinates;
    const t = clamp(travel.distanceCoveredKm / Math.max(0.001, travel.totalDistanceKm), 1);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
  return { ...SETTLEMENTS[state.lastVisitedSettlement].coordinates };
}

function segmentDistance(p: Position, a: Position, b: Position): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 1);
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
}

export function getTerrainAt(position: Position): TerrainType {
  let nearest = Infinity;
  let terrain: TerrainType = "scorched_flats";
  for (const route of ROUTES) {
    const distance = segmentDistance(position, SETTLEMENTS[route.from].coordinates, SETTLEMENTS[route.to].coordinates);
    if (distance < 10 && distance < nearest) { nearest = distance; terrain = route.terrain; }
  }
  if (nearest < 10) return terrain;
  if (position.x > 560 && position.y < 330) return "sand_dunes";
  if (position.x > 410 && position.x < 620 && position.y > 330) return "rocky_canyon";
  return "scorched_flats";
}

export function getNearbySettlement(position: Position): SettlementId | null {
  const nearest = Object.values(SETTLEMENTS).map(town => ({ town, d: getDistanceKm(position, town.coordinates) }))
    .sort((a, b) => a.d - b.d)[0];
  return nearest && nearest.d <= 12 * WORLD_KM_PER_UNIT + 1e-9 ? nearest.town.id : null;
}

export function advanceRovingEntities(entities: RovingEntity[], hours: number): RovingEntity[] {
  return entities.map(entity => {
    const dx = entity.targetX - entity.x;
    const dy = entity.targetY - entity.y;
    const dist = Math.hypot(dx, dy);
    const speed = entity.speedKmh / WORLD_KM_PER_UNIT;
    const step = speed * hours;

    if (dist <= step || dist < 6) {
      const allTowns = Object.values(SETTLEMENTS);
      const randomTown = allTowns[Math.floor(Math.random() * allTowns.length)];
      return {
        ...entity,
        x: entity.targetX,
        y: entity.targetY,
        targetX: randomTown.coordinates.x,
        targetY: randomTown.coordinates.y,
        heading: getBearing({ x: entity.targetX, y: entity.targetY }, randomTown.coordinates),
      };
    }

    const ratio = step / dist;
    const nextX = Math.round(entity.x + dx * ratio);
    const nextY = Math.round(entity.y + dy * ratio);
    return {
      ...entity,
      x: nextX,
      y: nextY,
      heading: getBearing({ x: entity.x, y: entity.y }, { x: entity.targetX, y: entity.targetY }),
    };
  });
}

/** Idle and movement share proportional upkeep. Calendar effects run only at midnight. */
export function advanceGameTime(state: GameState, hours: number): GameState {
  if (!Number.isFinite(hours) || hours <= 0) return state;
  const upkeep = getDailyUpkeepSummary(state);
  const inventory = { ...state.inventory };
  const logs: string[] = [];
  let damage = 0;
  let consumedValue=0;
  const consume = (id: ItemId, perDay: number, penalty: number) => {
    const needed = perDay * hours / 24;
    if (!needed) return;
    const available = inventory[id] ?? 0;
    inventory[id] = Math.max(0, available - needed);
    consumedValue+=Math.min(available,needed)*(state.averageCosts?.[id]??0);
    const missing = Math.max(0, needed - available);
    if (missing > 1e-10) {
      damage += penalty * missing / perDay;
      logs.push(`Shortage: ${id === "water" ? "water" : id === "food_rations" ? "food rations" : "animal forage"}. Resupply your caravan.`);
    }
  };
  consume("water", upkeep.totalWaterPerDay, 8);
  consume("food_rations", upkeep.humanFoodPerDay, 4);
  consume("animal_forage", upkeep.animalForagePerDay, 0);
  const wages = upkeep.mercenaryWagesPerDay * hours / 24;
  if (wages > state.cash + 1e-10) logs.push(`Unpaid wages: $${(wages - state.cash).toFixed(2)}. Your escort needs payment.`);
  const totalHour = state.hour + hours;
  const days = Math.floor((totalHour + 1e-9) / 24);
  const townStocks = Object.fromEntries(Object.entries(state.townStocks).map(([id, stock]) => {
    const next = { ...stock };
    if (days) for (const [item, base] of Object.entries(SETTLEMENTS[id as SettlementId].baseStock)) {
      const key = item as ItemId;
      next[key] = Math.min(Math.max(base!, next[key] ?? 0), (next[key] ?? 0) + Math.max(1, base! * 0.15) * days);
    }
    return [id, next];
  })) as GameState["townStocks"];
  const marketEvents = state.marketEvents.map(event => ({ ...event, daysRemaining: Math.max(0, event.daysRemaining - days) }))
    .filter(event => event.daysRemaining > 0);
  if (days) {
    logs.push(`Day ${state.day + days}: markets restocked; expired rumors removed.`);
    for (const fc of state.freightContracts ?? []) {
      if (fc.accepted && !fc.completed && state.day + days > fc.deadlineDay) {
        logs.push(`Contract expired: Freight to ${SETTLEMENTS[fc.destinationSettlement]?.name ?? fc.destinationSettlement} passed deadline.`);
      }
    }
    for (const pc of state.passengerContracts ?? []) {
      if (pc.accepted && !pc.completed && state.day + days > pc.deadlineDay) {
        logs.push(`Contract expired: Escort for ${pc.passengerName} passed deadline.`);
      }
    }
  }
  const rovingEntities = state.rovingEntities && state.rovingEntities.length > 0
    ? advanceRovingEntities(state.rovingEntities, hours)
    : state.rovingEntities;
  return { ...state, inventory, operatingCosts:(state.operatingCosts??0)+consumedValue+Math.min(wages,state.cash), cash: Math.max(0, state.cash - wages),
    hp: Math.max(Math.min(1, state.hp), state.hp - damage), day: state.day + days,
    hour: Math.max(0, totalHour - days * 24), marketEvents, townStocks, rovingEntities,
    journalLogs: [...logs.filter(log => !state.journalLogs.slice(0, 4).includes(log)), ...state.journalLogs].slice(0, 200) };
}

/** Integrates along compass heading in calendar-aligned minute slices. No route auto-entry. */
export function advanceExploration(state: GameState, hours: number): GameState {
  if (!Number.isFinite(hours) || hours <= 0 || !state.exploration?.isMoving || state.exploration.isPaused || state.pendingEncounter || state.combatState) return state;
  let next = { ...state, currentSettlement: null, travelState: null,
    exploration: { ...state.exploration, ...getWorldPosition(state) } };
  let remaining = hours;
  while (remaining > 1e-9 && next.exploration.isMoving) {
    const p = next.exploration;
    const terrain = getTerrainAt(p);
    const transport = getActiveTransportDefinition(next);
    const fuel = next.inventory.gasoline ?? 0;
    const speed = getCaravanSpeedBreakdown(next, terrain).effectiveSpeedKmh;
    if (!speed || (transport.propulsion === "motor" && fuel <= 1e-10)) {
      next = { ...next, exploration: { ...p, terrain, isMoving: false, isPaused: true },
        journalLogs: ["Out of fuel. Movement stopped; refuel before continuing.", ...next.journalLogs].slice(0, 200) };
      break;
    }
    const heading = ((p.heading % 360) + 360) % 360;
    const rad = heading * Math.PI / 180;
    const dx = Math.sin(rad), dy = -Math.cos(rad);
    const untilMinute = (1 - ((next.hour * 60) % 1)) / 60;
    let duration = Math.min(remaining, untilMinute > 1e-9 ? untilMinute : 1 / 60);
    let distance = speed * duration / WORLD_KM_PER_UNIT;
    const fuelLimit = transport.fuelLitersPer10Km > 0 ? fuel * 10 / transport.fuelLitersPer10Km / WORLD_KM_PER_UNIT : Infinity;
    const edgeX = Math.abs(dx) < 1e-10 ? Infinity : ((dx > 0 ? 1000 : 0) - p.x) / dx;
    const edgeY = Math.abs(dy) < 1e-10 ? Infinity : ((dy > 0 ? 680 : 0) - p.y) / dy;
    let stopDistance = Math.max(0, Math.min(fuelLimit, edgeX, edgeY));
    let city: SettlementId | null = null;
    for (const town of Object.values(SETTLEMENTS)) {
      const ox = p.x - town.coordinates.x, oy = p.y - town.coordinates.y;
      if (Math.hypot(ox, oy) <= 12 + 1e-8) continue; // Allow departure from a city.
      const dot = ox * dx + oy * dy;
      const discriminant = dot * dot - (ox * ox + oy * oy - 144);
      if (discriminant < 0) continue;
      const entry = -dot - Math.sqrt(discriminant);
      if (entry >= 0 && entry <= stopDistance) { stopDistance = entry; city = town.id; }
    }
    const stopped = distance >= stopDistance - 1e-9;
    if (stopped) { distance = Math.min(distance, stopDistance); duration = distance * WORLD_KM_PER_UNIT / speed; }
    const timed = advanceGameTime(next, duration);
    const km = distance * WORLD_KM_PER_UNIT;
    const condition = timed.vehicleCondition ?? 100;
    const wearRate = (terrain === "rocky_canyon" || terrain === "sand_dunes") ? 0.05 : 0.025;
    const wear = (transport.propulsion === "motor" || transport.maxCargoKg > 80) ? km * wearRate : 0;
    const nextCondition = Math.max(0, Math.round((condition - wear) * 10) / 10);
    const brokenDown = nextCondition <= 0;
    const justBroken = brokenDown && !timed.isBrokenDown;

    next = { ...timed, currentSettlement: null, travelState: null,
      vehicleCondition: nextCondition,
      isBrokenDown: brokenDown,
      operatingCosts:(timed.operatingCosts??0)+(transport.propulsion==="motor"?km/10*transport.fuelLitersPer10Km*(next.averageCosts?.gasoline??0):0),
      inventory: { ...timed.inventory, ...(transport.propulsion === "motor" ? { gasoline: Math.max(0, fuel - km / 10 * transport.fuelLitersPer10Km) } : {}) },
      exploration: { x: clamp(p.x + dx * distance, 1000), y: clamp(p.y + dy * distance, 680), heading,
        terrain: getTerrainAt({ x: p.x + dx * distance, y: p.y + dy * distance }),
        distanceTravelledKm: p.distanceTravelledKm + km, isMoving: !stopped, isPaused: stopped } };
    if (justBroken) {
      next.journalLogs = ["Caravan Breakdown! Severe mechanical wear halted fast travel. Use Machinist Tools or limp to town depot.", ...next.journalLogs].slice(0, 200);
    }
    const newPos = { x: clamp(p.x + dx * distance, 1000), y: clamp(p.y + dy * distance, 680) };
    const perception = next.attributes?.perception ?? 5;
    const discoveryRadius = 35 + perception * 2;
    const discovered = [...(next.discoveredSecretIds ?? [])];
    let newlyDiscovered = false;
    for (const sec of SECRET_LOCATIONS) {
      if (!discovered.includes(sec.id) && Math.hypot(newPos.x - sec.x, newPos.y - sec.y) <= discoveryRadius) {
        discovered.push(sec.id);
        newlyDiscovered = true;
        next.journalLogs = [`Caravan scouts spotted an uncharted landmark: ${sec.name}!`, ...next.journalLogs].slice(0, 200);
      }
    }
    if (newlyDiscovered) {
      next.discoveredSecretIds = discovered;
    }
    remaining -= duration;
    if (stopped) next.journalLogs = [city ? `Near ${SETTLEMENTS[city].name}. Travel paused; choose Enter Town to visit.` :
      fuelLimit <= Math.min(edgeX, edgeY) ? "Out of fuel. Movement stopped; refuel before continuing." : "World boundary reached. Choose a new heading.", ...next.journalLogs].slice(0, 200);
  }
  return next;
}

export function scavengeSecretLocation(state: GameState, secretId: string): GameState {
  const loc = SECRET_LOCATIONS.find((s) => s.id === secretId);
  if (!loc) return state;
  if (state.clearedSecretIds?.includes(secretId)) return state;
  const pos = getWorldPosition(state);
  const dist = Math.hypot(pos.x - loc.x, pos.y - loc.y);
  if (dist > 35) return state;

  const clearedSecretIds = [...(state.clearedSecretIds ?? []), secretId];
  const inventory = { ...state.inventory };
  for (const [item, qty] of Object.entries(loc.lootItems)) {
    inventory[item as ItemId] = (inventory[item as ItemId] ?? 0) + (qty ?? 0);
  }
  const cash = state.cash + loc.lootCash;
  const journalLogs = [
    `Scavenged ${loc.name}! Recovered $${loc.lootCash} and valuable cargo.`,
    ...state.journalLogs,
  ].slice(0, 200);

  return {
    ...state,
    cash,
    inventory,
    clearedSecretIds,
    journalLogs,
  };
}

/** Advances the caravan by one discrete click-step along its compass heading and pauses. */
export function stepExploration(
  state: GameState,
  hours = 0.75,
  headingOverride?: number
): GameState {
  if (
    !Number.isFinite(hours) ||
    hours <= 0 ||
    state.pendingEncounter ||
    state.combatState
  ) {
    return state;
  }
  const pos = getWorldPosition(state);
  const heading =
    headingOverride !== undefined && Number.isFinite(headingOverride)
      ? ((headingOverride % 360) + 360) % 360
      : ((state.exploration?.heading ?? 0) % 360 + 360) % 360;

  const prepared: GameState = {
    ...state,
    currentSettlement: null,
    travelState: null,
    exploration: {
      x: pos.x,
      y: pos.y,
      terrain: getTerrainAt(pos),
      distanceTravelledKm: state.exploration?.distanceTravelledKm ?? 0,
      ...state.exploration,
      heading,
      isMoving: true,
      isPaused: false,
    },
  };

  const stepped = advanceExploration(prepared, hours);
  if (!stepped.exploration) return stepped;

  return {
    ...stepped,
    exploration: {
      ...stepped.exploration,
      isMoving: false,
      isPaused: true,
    },
  };
}

