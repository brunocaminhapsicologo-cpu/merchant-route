import { CombatUnit, GameState, ItemId, RoadEncounter, SettlementId, TerrainType, WeaponId } from "./types";
import { AVAILABLE_MERCENARIES, createInitialGameState, ITEMS, SETTLEMENTS, TRANSPORTS } from "./worldData";
import { getBearing, getTerrainAt, getWorldPosition } from "./navigationEngine";
import { initializeTacticalCombat } from "./combatEngine";

export const SAVE_VERSION = 3;
type Raw = Record<string, unknown>;
const object = (value: unknown): Raw => value && typeof value === "object" && !Array.isArray(value) ? value as Raw : {};
const number = (value: unknown, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const text = (value: unknown, fallback: string) => typeof value === "string" ? value : fallback;
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const has = (map: object, key: unknown): key is string => typeof key === "string" && Object.hasOwn(map, key);
const town = (value: unknown, fallback: SettlementId): SettlementId => has(SETTLEMENTS, value) ? value as SettlementId : fallback;
const weapon = (value: unknown, fallback: WeaponId): WeaponId => has(ITEMS, value) && ITEMS[value as ItemId].weaponStats ? value as WeaponId : fallback;
const terrain = (value: unknown, fallback: TerrainType): TerrainType =>
  ["old_highway", "scorched_flats", "sand_dunes", "rocky_canyon"].includes(value as string) ? value as TerrainType : fallback;
function itemNumbers(value: unknown): Partial<Record<ItemId, number>> {
  return Object.fromEntries(Object.entries(object(value)).filter(([key, qty]) => has(ITEMS, key) && typeof qty === "number" && Number.isFinite(qty))
    .map(([key, qty]) => [key, number(qty)]));
}
function magazines(value: unknown): Partial<Record<WeaponId, number>> {
  return Object.fromEntries(Object.entries(itemNumbers(value)).filter(([key]) => ITEMS[key as ItemId].weaponStats)
    .map(([key, qty]) => [key, Math.floor(number(qty, 0, 0, ITEMS[key as ItemId].weaponStats!.magazineSize))]));
}
function encounter(value: unknown): RoadEncounter | null {
  const raw = object(value);
  if (typeof raw.id !== "string" || !Array.isArray(raw.enemies)) return null;
  const enemies = raw.enemies.map(value => {
    const enemy = object(value);
    const maxHp = number(enemy.maxHp, 50, 1);
    const maxAp = number(enemy.maxAp, 6, 1, 30);
    return { name: text(enemy.name, "Raider"), role: text(enemy.role, "Outlaw"), maxHp,
      hp: number(enemy.hp, maxHp, 0, maxHp), ap: number(enemy.ap, maxAp, 0, maxAp), maxAp,
      weapon: weapon(enemy.weapon, "rusty_machete"), accuracy: number(enemy.accuracy, 60, 0, 100), morale: number(enemy.morale, 80, 0, 100) };
  });
  if (!enemies.length) return null;
  const loot = object(raw.lootReward);
  return { id: raw.id, title: text(raw.title, "Road encounter"), enemyGroupName: text(raw.enemyGroupName, "Raiders"),
    description: text(raw.description, "A hostile group blocks your path."), isBountyTarget: raw.isBountyTarget === true,
    bountyId: typeof raw.bountyId === "string" ? raw.bountyId : undefined,
    enemySpeedKmh: number(raw.enemySpeedKmh, 5), tollDemandCash: number(raw.tollDemandCash), intimidateThreshold: number(raw.intimidateThreshold, 15),
    enemies, lootReward: { cash: number(loot.cash), items: itemNumbers(loot.items) } };
}

/** Accepts JSON saves or partial objects. Never supplies starter inventory to an existing inventory. */
export function migrateGameState(raw: unknown): GameState {
  if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch { raw = null; } }
  const source = object(raw), initial = createInitialGameState();
  const attrs = object(source.attributes);
  const attributes = { grit: number(attrs.grit, initial.attributes.grit, 0, 100), agility: number(attrs.agility, initial.attributes.agility, 0, 100),
    perception: number(attrs.perception, initial.attributes.perception, 0, 100), charisma: number(attrs.charisma, initial.attributes.charisma, 0, 100) };
  const maxHp = number(source.maxHp, 50 + attributes.grit * 12, 1);
  const lastVisitedSettlement = town(source.lastVisitedSettlement, initial.lastVisitedSettlement);
  const transport = has(TRANSPORTS, source.transport) ? source.transport as GameState["transport"] : initial.transport;
  const ownedTransports = array(source.ownedTransports).filter(id => has(TRANSPORTS, id)) as GameState["ownedTransports"];
  if (!ownedTransports.includes(transport)) ownedTransports.push(transport);
  const townStocks = { ...initial.townStocks };
  for (const id of Object.keys(SETTLEMENTS) as SettlementId[]) {
    const saved = object(source.townStocks)[id];
    townStocks[id] = saved === undefined ? { ...initial.townStocks[id] } : itemNumbers(saved);
  }
  const state: GameState = { ...initial, saveVersion: SAVE_VERSION,
    playerName: text(source.playerName, initial.playerName), attributes, maxHp, hp: number(source.hp, maxHp, 0, maxHp),
    unspentAttributePoints: number(source.unspentAttributePoints, initial.unspentAttributePoints),
    cash: number(source.cash, initial.cash), day: Math.floor(number(source.day, 1, 1)), hour: number(source.hour, 8, 0) % 24,
    currentSettlement: source.currentSettlement === null ? null : town(source.currentSettlement, initial.currentSettlement!), lastVisitedSettlement,
    activeTransports:array(source.activeTransports).filter(id=>has(TRANSPORTS,id)&&ownedTransports.includes(id as GameState["transport"])) as GameState["activeTransports"],
    activeFleet: Object.fromEntries(
      Object.entries(object(source.activeFleet))
        .filter(([id, qty]) => has(TRANSPORTS, id) && typeof qty === "number" && qty > 0)
        .map(([id, qty]) => [id, Math.floor(number(qty, 1, 1, 99))])
    ),
    vehicleCondition: typeof source.vehicleCondition === "number" && Number.isFinite(source.vehicleCondition)
      ? Math.max(0, Math.min(100, source.vehicleCondition))
      : 100,
    isBrokenDown: source.isBrokenDown === true,
    operatingCosts:number(source.operatingCosts),
    transport, ownedTransports: ownedTransports.length ? [...new Set(ownedTransports)] : [...initial.ownedTransports],
    equippedWeapon: weapon(source.equippedWeapon, initial.equippedWeapon),
    inventory: source.inventory === undefined ? { ...initial.inventory } : itemNumbers(source.inventory), townStocks,
    weaponMagazines: magazines(source.weaponMagazines), averageCosts: itemNumbers(source.averageCosts),
    tradeLedger: array(source.tradeLedger).flatMap(value => {
      const entry = object(value);
      if (!has(ITEMS, entry.itemId) || !has(SETTLEMENTS, entry.settlementId) || !["buy", "sell"].includes(entry.kind as string)) return [];
      return [{ itemId: entry.itemId as ItemId, settlementId: entry.settlementId as SettlementId, kind: entry.kind as "buy" | "sell",
        quantity: number(entry.quantity), unitPrice: number(entry.unitPrice), day: Math.floor(number(entry.day, 1, 1)),
        ...(typeof entry.profit === "number" && Number.isFinite(entry.profit) ? { profit: entry.profit } : {}) }];
    }),
    marketEvents: source.marketEvents === undefined ? structuredClone(initial.marketEvents) : array(source.marketEvents).flatMap(value => {
      const event = object(value);
      if (!has(SETTLEMENTS, event.settlementId) || !has(ITEMS, event.affectedItem) || typeof event.id !== "string" || number(event.daysRemaining) <= 0) return [];
      return [{ id: event.id, title: text(event.title, "Market news"), description: text(event.description, ""),
        settlementId: event.settlementId as SettlementId, affectedItem: event.affectedItem as ItemId,
        priceMultiplier: number(event.priceMultiplier, 1, 0.01), daysRemaining: number(event.daysRemaining) }];
    }),
    bounties: source.bounties === undefined ? structuredClone(initial.bounties) : array(source.bounties).flatMap(value => {
      const bounty = object(value), base = initial.bounties.find(b => b.id === bounty.id);
      if (!base) return [];
      return [{ ...base, completed: bounty.completed === true }];
    }),
    hiredMercenaries: array(source.hiredMercenaries).flatMap(value => {
      const merc = object(value), base = AVAILABLE_MERCENARIES.find(m => m.id === merc.id);
      if (!base) return [];
      const maxHp = number(merc.maxHp, base.maxHp, 1);
      return [{ ...base, hp: number(merc.hp, base.hp, 0, maxHp), maxHp, maxAp: number(merc.maxAp, base.maxAp, 1, 30),
        dailyWage: number(merc.dailyWage, base.dailyWage), equippedWeapon: weapon(merc.equippedWeapon, base.equippedWeapon),
        magazines: magazines(merc.magazines), crippledLegs: merc.crippledLegs === true }];
    }),
    acceptedBountyIds: array(source.acceptedBountyIds).filter(id => typeof id === "string") as string[],
    knownRumorIds: array(source.knownRumorIds).filter(id => typeof id === "string") as string[],
    freightContracts: array(source.freightContracts).map(c => object(c)) as unknown as GameState["freightContracts"],
    passengerContracts: array(source.passengerContracts).map(c => object(c)) as unknown as GameState["passengerContracts"],
    discoveredSecretIds: array(source.discoveredSecretIds).filter(id => typeof id === "string") as string[],
    clearedSecretIds: array(source.clearedSecretIds).filter(id => typeof id === "string") as string[],
    reputation: number(source.reputation, initial.reputation, -100, 100),
    journalLogs: source.journalLogs === undefined ? [...initial.journalLogs] : array(source.journalLogs).filter(log => typeof log === "string") as string[],
    travelState: null, pendingEncounter: encounter(source.pendingEncounter), combatState: null,
  };
  const travel = object(source.travelState);
  if (has(SETTLEMENTS, travel.from) && has(SETTLEMENTS, travel.to)) {
    state.currentSettlement = null;
    state.travelState = { routeId: text(travel.routeId, "legacy"), from: travel.from as SettlementId, to: travel.to as SettlementId,
      totalDistanceKm: number(travel.totalDistanceKm, 1, 0.001), distanceCoveredKm: number(travel.distanceCoveredKm),
      terrain: terrain(travel.terrain, "scorched_flats"), isPaused: true };
    const position = getWorldPosition({ ...state, exploration: undefined });
    state.exploration = { ...position, heading: getBearing(SETTLEMENTS[state.travelState.from].coordinates, SETTLEMENTS[state.travelState.to].coordinates),
      terrain: getTerrainAt(position), distanceTravelledKm: state.travelState.distanceCoveredKm, isMoving: false, isPaused: true };
    state.travelState = null;
  } else {
    const saved = object(source.exploration);
    const fallback = getWorldPosition({ ...state, exploration: undefined });
    const position = { x: number(saved.x, fallback.x, 0, 1000), y: number(saved.y, fallback.y, 0, 680) };
    state.exploration = { ...position, heading: number(saved.heading, 0, -Number.MAX_SAFE_INTEGER) % 360,
      terrain: getTerrainAt(position), distanceTravelledKm: number(saved.distanceTravelledKm), isMoving: false, isPaused: true };
    state.exploration.heading = (state.exploration.heading + 360) % 360;
  }
  const savedCombat = object(source.combatState), savedEncounter = encounter(savedCombat.encounter);
  if (savedEncounter) {
    const combat = initializeTacticalCombat(state, savedEncounter);
    const occupied = new Set<string>();
    combat.units = combat.units.map(unit => {
      const saved = object(array(savedCombat.units).find(value => object(value).id === unit.id));
      let x = Math.floor(number(saved.x, unit.x, 0, combat.gridWidth - 1)), y = Math.floor(number(saved.y, unit.y, 0, combat.gridHeight - 1));
      if (occupied.has(`${x},${y}`)) {
        for (let i = 0; i < combat.gridWidth * combat.gridHeight; i++) {
          if (!occupied.has(`${i % combat.gridWidth},${Math.floor(i / combat.gridWidth)}`)) { x = i % combat.gridWidth; y = Math.floor(i / combat.gridWidth); break; }
        }
      }
      occupied.add(`${x},${y}`);
      const equipped = weapon(saved.weapon, unit.weapon), stats = ITEMS[equipped].weaponStats!;
      const ammo = Math.floor(number(saved.currentMagAmmo, unit.currentMagAmmo, 0, stats.magazineSize));
      const loads = { ...magazines(saved.magazines), [equipped]: ammo };
      const maxAp = Math.floor(number(saved.maxAp, saved.crippledLegs === true ? Math.max(2,unit.maxAp-2) : unit.maxAp, 1,30));
      return { ...unit, x, y, weapon: equipped, maxAp, hp: number(saved.hp, unit.hp, 0, unit.maxHp), ap: number(saved.ap, unit.ap, 0, maxAp),
        currentMagAmmo: ammo, reserveAmmo: unit.isPlayerTeam ? undefined : Math.floor(number(saved.reserveAmmo, unit.reserveAmmo ?? 0)),
        magazines: loads, isFled: saved.isFled === true, isCrouched: saved.isCrouched === true,
        crippledLegs: saved.crippledLegs === true, morale: number(saved.morale, unit.morale, 0, 100) } satisfies CombatUnit;
    });
    combat.activeUnitId = combat.units.some(u => u.id === savedCombat.activeUnitId) ? savedCombat.activeUnitId as string : "unit_player";
    combat.roundNumber = Math.floor(number(savedCombat.roundNumber, 1, 1));
    combat.outcome = ["victory", "defeat"].includes(savedCombat.outcome as string) ? savedCombat.outcome as "victory" | "defeat" : "ongoing";
    if (["melee", "snap", "aimed", "headshot", "legshot"].includes(savedCombat.selectedFiringMode as string)) combat.selectedFiringMode = savedCombat.selectedFiringMode as typeof combat.selectedFiringMode;
    if (Array.isArray(savedCombat.combatLog)) combat.combatLog = savedCombat.combatLog.filter(log => typeof log === "string");
    const protagonist=combat.units.find(u=>u.isMainCharacter);
    if(!protagonist || protagonist.hp<=0)combat.outcome="defeat";
    else if(!combat.units.some(u=>!u.isPlayerTeam&&u.hp>0&&!u.isFled))combat.outcome="victory";
    if(!combat.units.some(u=>u.id===combat.activeUnitId&&u.hp>0&&!u.isFled))combat.activeUnitId=combat.units.find(u=>u.isPlayerTeam&&u.hp>0)?.id??"unit_player";
    state.combatState = combat;
    state.weaponMagazines = { ...state.weaponMagazines, ...combat.units.find(u => u.isMainCharacter)?.magazines };
    state.hiredMercenaries = state.hiredMercenaries.map(merc => ({ ...merc, magazines: { ...merc.magazines, ...combat.units.find(u => u.id === `unit_${merc.id}`)?.magazines } }));
    state.pendingEncounter = null;
  }
  return state;
}
