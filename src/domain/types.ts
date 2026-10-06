export type SettlementId =
  | "dust_creek"
  | "deadwood_gulch"
  | "leadville_shaft"
  | "blackwater_rig"
  | "tombstone_crossing"
  | "saint_louis"
  | "new_denver"
  | "new_chicago";

export type SettlementTier = "frontier_town" | "major_city";

export type TerrainType =
  | "old_highway"
  | "scorched_flats"
  | "sand_dunes"
  | "rocky_canyon";

export type TransportId =
  | "on_foot"
  | "hand_cart"
  | "old_donkey"
  | "pack_mule_team"
  | "wooden_cart_donkey"
  | "heavy_wagon_horse"
  | "brahmin_freight_wagon"
  | "scrap_motorcycle"
  | "desert_dune_buggy"
  | "armored_pickup";

export type PropulsionType = "human" | "animal" | "motor";

export type ItemCategory =
  | "survival"
  | "commodity"
  | "weapon"
  | "ammo"
  | "contraband"
  | "medical";

export type ItemId =
  | "water"
  | "food_rations"
  | "animal_forage"
  | "gasoline"
  | "raw_leather"
  | "smoked_jerky"
  | "scrap_metal"
  | "salt"
  | "tools"
  | "antibiotics"
  | "luxury_cigars"
  | "moonshine"
  | "field_bandage"
  | "copper_ore"
  | "canned_beef"
  | "whiskey_barrel"
  | "diesel_parts"
  | "rusty_machete"
  | "cavalry_saber"
  | "sledgehammer"
  | "derringer_22"
  | "revolver_38"
  | "peacemaker_45"
  | "coach_shotgun_12g"
  | "pump_shotgun_12g"
  | "varmint_rifle_22"
  | "lever_repeater_38"
  | "bolt_rifle_308"
  | "grease_smg_9mm"
  | "carbine_556"
  | "sniper_rifle_762"
  | "ammo_22"
  | "ammo_38"
  | "ammo_9mm"
  | "ammo_45"
  | "ammo_12g"
  | "ammo_308"
  | "ammo_556"
  | "ammo_762";

export type WeaponId =
  | "rusty_machete"
  | "cavalry_saber"
  | "sledgehammer"
  | "derringer_22"
  | "revolver_38"
  | "peacemaker_45"
  | "coach_shotgun_12g"
  | "pump_shotgun_12g"
  | "varmint_rifle_22"
  | "lever_repeater_38"
  | "bolt_rifle_308"
  | "grease_smg_9mm"
  | "carbine_556"
  | "sniper_rifle_762";

export type AmmoItemId =
  | "ammo_22"
  | "ammo_38"
  | "ammo_9mm"
  | "ammo_45"
  | "ammo_12g"
  | "ammo_308"
  | "ammo_556"
  | "ammo_762";

export interface CharacterAttributes {
  grit: number; // Determines Max HP (50 + grit * 12) & personal carry capacity (+6 kg/pt)
  agility: number; // Determines Max AP (5 + floor(agility / 2)), movement efficiency & escape chance
  perception: number; // Determines Ranged Accuracy (+4% per pt) & encounter spotting distance
  charisma: number; // Determines Trade price bonus (±2.5% per pt), intimidation & sheriff checks
}

export interface WeaponStats {
  weaponId: WeaponId;
  minDamage: number;
  maxDamage: number;
  optimalRangeTiles: number;
  maxRangeTiles: number;
  snapShotAp: number;
  aimedShotAp: number | null; // null for melee
  baseAccuracy: number;
  ammoType: AmmoItemId | null;
  magazineSize: number;
  reloadAp: number;
}

export interface ItemDefinition {
  id: ItemId;
  name: string;
  category: ItemCategory;
  weightKg: number;
  basePrice: number;
  description: string;
  isContraband?: boolean;
  weaponStats?: WeaponStats;
}

export interface TransportDefinition {
  id: TransportId;
  name: string;
  propulsion: PropulsionType;
  maxCargoKg: number;
  baseSpeedKmh: number;
  price: number;
  waterPerDay: number; // Liters consumed by animals per day (even when idle)
  foragePerDay: number; // Kg of forage consumed by animals per day
  fuelLitersPer10Km: number; // Gasoline consumed only when moving
  availableInTiers: SettlementTier[];
  description: string;
  terrainSpeedMultipliers: Record<TerrainType, number>;
}

export interface NpcProfile {
  role: "general_trader" | "transport_master" | "sheriff" | "saloon_barkeep";
  name: string;
  title: string;
  greeting: string;
  loreDialogue: string;
  tipDialogue: string;
}

export interface SettlementDefinition {
  id: SettlementId;
  name: string;
  tier: SettlementTier;
  subtitle: string;
  lore: string;
  coordinates: { x: number; y: number }; // 0-1000 canvas coordinate space
  produces: ItemId[];
  demands: ItemId[];
  priceMultipliers: Partial<Record<ItemId, number>>;
  baseStock: Partial<Record<ItemId, number>>;
  strictContrabandCheck: boolean;
  npcs: Record<NpcProfile["role"], NpcProfile>;
}

export interface RouteEdge {
  id: string;
  from: SettlementId;
  to: SettlementId;
  distanceKm: number;
  terrain: TerrainType;
  dangerLevel: number; // 1 to 5
  routeLabel: string;
}

export interface MarketEvent {
  id: string;
  title: string;
  description: string;
  settlementId: SettlementId;
  affectedItem: ItemId;
  priceMultiplier: number;
  daysRemaining: number;
}

export interface BountyContract {
  id: string;
  bossName: string;
  gangName: string;
  routeId: string;
  originSettlement: SettlementId;
  rewardCash: number;
  difficulty: number;
  description: string;
  completed: boolean;
}

export interface Mercenary {
  crippledLegs?: boolean;
  magazines?: Partial<Record<WeaponId, number>>;
  id: string;
  name: string;
  roleTitle: string;
  homeSettlement: SettlementId;
  hiringFee: number;
  dailyWage: number;
  maxHp: number;
  hp: number;
  maxAp: number;
  accuracyBonus: number;
  equippedWeapon: WeaponId;
  bio: string;
}

export interface ExplorationState {
  x: number;
  y: number;
  heading: number;
  isMoving: boolean;
  isPaused: boolean;
  terrain: TerrainType;
  distanceTravelledKm: number;
}

export interface ActiveTravelState {
  routeId: string;
  from: SettlementId;
  to: SettlementId;
  totalDistanceKm: number;
  distanceCoveredKm: number;
  terrain: TerrainType;
  isPaused: boolean;
}

export interface RoadEncounter {
  id: string;
  title: string;
  enemyGroupName: string;
  description: string;
  isBountyTarget: boolean;
  bountyId?: string;
  enemySpeedKmh: number;
  tollDemandCash: number;
  intimidateThreshold: number;
  enemies: Array<{
    name: string;
    role: string;
    hp: number;
    maxHp: number;
    ap: number;
    maxAp: number;
    weapon: WeaponId;
    accuracy: number;
    morale: number;
  }>;
  lootReward: {
    cash: number;
    items: Partial<Record<ItemId, number>>;
  };
}

export type TileCoverType = "none" | "rocks" | "wagon" | "ruins" | "sand";

export interface CombatGridTile {
  x: number;
  y: number;
  cover: TileCoverType;
  moveApCost: number;
  defenseBonus: number; // 0, 25, or 45 (% reduction to incoming hit chance)
  coverDirection?: "north" | "south" | "east" | "west";
}

export type FiringMode = "melee" | "snap" | "aimed" | "headshot" | "legshot";

export interface CombatUnit {
  id: string;
  name: string;
  role: string;
  isPlayerTeam: boolean;
  isMainCharacter?: boolean;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  ap: number;
  maxAp: number;
  weapon: WeaponId;
  currentMagAmmo: number;
  reserveAmmo?: number;
  magazines?: Partial<Record<WeaponId, number>>;
  accuracy: number;
  morale: number; // 0 to 100; if < 25 may flee
  isFled?: boolean;
  isCrouched?: boolean;
  crippledLegs?: boolean;
}

export interface CombatState {
  encounter: RoadEncounter;
  gridWidth: number;
  gridHeight: number;
  tiles: CombatGridTile[][];
  units: CombatUnit[];
  activeUnitId: string;
  roundNumber: number;
  selectedFiringMode: FiringMode;
  combatLog: string[];
  outcome: "ongoing" | "victory" | "defeat";
}

export interface FreightContract {
  id: string;
  title: string;
  originSettlement: SettlementId;
  destinationSettlement: SettlementId;
  cargoItem: ItemId;
  cargoQuantity: number;
  rewardCash: number;
  deadlineDay: number;
  accepted: boolean;
  completed: boolean;
}

export interface PassengerContract {
  id: string;
  passengerName: string;
  originSettlement: SettlementId;
  destinationSettlement: SettlementId;
  passengerCount: number;
  rewardCash: number;
  deadlineDay: number;
  accepted: boolean;
  completed: boolean;
  waterDemandPerDay: number;
  foodDemandPerDay: number;
}

export interface RovingEntity {
  id: string;
  name: string;
  type: "trader" | "traveler" | "sheriff_patrol" | "raider";
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speedKmh: number;
  heading: number;
  description: string;
  transportLabel?: string;
  routeMode?: "road" | "offroad";
  partySize?: number;
}

export interface SecretLocation {
  id: string;
  name: string;
  x: number;
  y: number;
  description: string;
  lootItems: Partial<Record<ItemId, number>>;
  lootCash: number;
}

export interface GameState {
  exploration?: ExplorationState;
  saveVersion?: number;
  weaponMagazines?: Partial<Record<WeaponId, number>>;
  acceptedBountyIds?: string[];
  tradeLedger?: Array<{ itemId: ItemId; quantity: number; unitPrice: number; kind: "buy" | "sell"; day: number; settlementId: SettlementId; profit?: number }>;
  averageCosts?: Partial<Record<ItemId, number>>;
  playerName: string;
  attributes: CharacterAttributes;
  unspentAttributePoints: number;
  hp: number;
  maxHp: number;
  equippedWeapon: WeaponId;
  cash: number;
  day: number;
  hour: number;
  currentSettlement: SettlementId | null;
  lastVisitedSettlement: SettlementId;
  transport: TransportId;
  ownedTransports: TransportId[];
  activeTransports?: TransportId[];
  activeFleet?: Partial<Record<TransportId, number>>;
  vehicleCondition?: number;
  isBrokenDown?: boolean;
  operatingCosts?: number;
  inventory: Partial<Record<ItemId, number>>;
  townStocks: Record<SettlementId, Partial<Record<ItemId, number>>>;
  marketEvents: MarketEvent[];
  knownRumorIds: string[];
  bounties: BountyContract[];
  freightContracts?: FreightContract[];
  passengerContracts?: PassengerContract[];
  rovingEntities?: RovingEntity[];
  discoveredSecretIds?: string[];
  clearedSecretIds?: string[];
  hiredMercenaries: Mercenary[];
  travelState: ActiveTravelState | null;
  pendingEncounter: RoadEncounter | null;
  combatState: CombatState | null;
  reputation: number;
  journalLogs: string[];
}
