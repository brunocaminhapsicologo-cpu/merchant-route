import {
  BountyContract,
  GameState,
  ItemDefinition,
  ItemId,
  MarketEvent,
  Mercenary,
  RouteEdge,
  SettlementDefinition,
  SettlementId,
  TransportDefinition,
  TransportId,
} from "./types";

export const ITEMS: Record<ItemId, ItemDefinition> = {
  water: {
    id: "water",
    name: "Purified Water (1L)",
    category: "survival",
    weightKg: 1.0,
    basePrice: 8,
    description:
      "Essential drinking water for humans and pack animals. Scarce in mining camps and desert rigs.",
  },
  food_rations: {
    id: "food_rations",
    name: "Dry Corn & Rations",
    category: "survival",
    weightKg: 0.8,
    basePrice: 12,
    description:
      "Preserved cornmeal and hardtack that keeps travelers alive on the sun-bleached trails.",
  },
  animal_forage: {
    id: "animal_forage",
    name: "Dry Hay & Forage",
    category: "survival",
    weightKg: 1.5,
    basePrice: 5,
    description:
      "Bundled scrub grass and oats for donkeys and horses. Heavy, cheap in farming villages.",
  },
  gasoline: {
    id: "gasoline",
    name: "Refined Gasoline (1L)",
    category: "survival",
    weightKg: 0.9,
    basePrice: 38,
    description:
      "Liquid gold of the wasteland. Only produced at Blackwater Rig and traded in major cities.",
  },
  raw_leather: {
    id: "raw_leather",
    name: "Cured Brahmin Leather",
    category: "commodity",
    weightKg: 2.5,
    basePrice: 45,
    description:
      "Thick hides tanned in Deadwood Gulch. Highly prized by tailors and armorers in Saint Louis.",
  },
  smoked_jerky: {
    id: "smoked_jerky",
    name: "Smoked Trail Jerky (Crate)",
    category: "commodity",
    weightKg: 2.0,
    basePrice: 34,
    description:
      "Salted meat cured over mesquite smoke. Miners and city guards pay a premium for real protein.",
  },
  scrap_metal: {
    id: "scrap_metal",
    name: "Salvaged Steel Ingots",
    category: "commodity",
    weightKg: 4.0,
    basePrice: 30,
    description:
      "Heavy smelted scrap from Leadville Shaft. Essential for New Denver and Saint Louis workshops.",
  },
  salt: {
    id: "salt",
    name: "Desert Salt Sack",
    category: "commodity",
    weightKg: 2.0,
    basePrice: 22,
    description:
      "Used by ranchers in Deadwood Gulch to cure meat and hides without refrigeration.",
  },
  tools: {
    id: "tools",
    name: "Machinist Toolset",
    category: "commodity",
    weightKg: 3.0,
    basePrice: 75,
    description:
      "Precision wrenches and drills forged in New Denver. Frontier villages desperate for repairs pay top dollar.",
  },
  antibiotics: {
    id: "antibiotics",
    name: "Pre-War Antibiotics",
    category: "medical",
    weightKg: 0.3,
    basePrice: 115,
    description:
      "Synthesized in Saint Louis laboratories. High value-to-weight ratio for frontier clinics.",
  },
  luxury_cigars: {
    id: "luxury_cigars",
    name: "Saint Louis Reserve Cigars",
    category: "commodity",
    weightKg: 0.5,
    basePrice: 95,
    description:
      "Hand-rolled tobacco for wealthy barons and oil bosses.",
  },
  moonshine: {
    id: "moonshine",
    name: "Canyon Moonshine Jug",
    category: "contraband",
    weightKg: 1.8,
    basePrice: 68,
    isContraband: true,
    description:
      "Illicit high-proof liquor. Prohibited by Sheriff checkpoints in Saint Louis and New Denver, where it sells for huge profits.",
  },
  field_bandage: {
    id: "field_bandage",
    name: "Sterile Field Bandage",
    category: "medical",
    weightKg: 0.2,
    basePrice: 28,
    description:
      "Restores +30 HP in tactical combat (costs 3 AP) or patches wounds on the trail.",
  },
  rusty_machete: {
    id: "rusty_machete",
    name: "Rusty Cleaver Machete",
    category: "weapon",
    weightKg: 1.5,
    basePrice: 60,
    description:
      "Heavy leaf-spring blade. Reliable in close quarters when every bullet is too expensive to waste.",
    weaponStats: {
      weaponId: "rusty_machete",
      minDamage: 12,
      maxDamage: 19,
      optimalRangeTiles: 1,
      maxRangeTiles: 1,
      snapShotAp: 3,
      aimedShotAp: null,
      baseAccuracy: 86,
      ammoType: null,
      magazineSize: 0,
      reloadAp: 0,
    },
  },
  revolver_38: {
    id: "revolver_38",
    name: "Frontier .38 Revolver",
    category: "weapon",
    weightKg: 1.2,
    basePrice: 240,
    description:
      "Six-shooter sidearm with low Action Point cost. Fast on the draw at short-to-medium range.",
    weaponStats: {
      weaponId: "revolver_38",
      minDamage: 15,
      maxDamage: 23,
      optimalRangeTiles: 5,
      maxRangeTiles: 8,
      snapShotAp: 3,
      aimedShotAp: 5,
      baseAccuracy: 72,
      ammoType: "ammo_38",
      magazineSize: 6,
      reloadAp: 2,
    },
  },
  bolt_rifle_308: {
    id: "bolt_rifle_308",
    name: "Grandfather's .308 Rifle",
    category: "weapon",
    weightKg: 3.8,
    basePrice: 420,
    description:
      "Your grandfather's scarred bolt-action hunting rifle. Deadly accuracy across the tactical map.",
    weaponStats: {
      weaponId: "bolt_rifle_308",
      minDamage: 24,
      maxDamage: 36,
      optimalRangeTiles: 9,
      maxRangeTiles: 12,
      snapShotAp: 4,
      aimedShotAp: 6,
      baseAccuracy: 78,
      ammoType: "ammo_308",
      magazineSize: 5,
      reloadAp: 2,
    },
  },
  coach_shotgun_12g: {
    id: "coach_shotgun_12g",
    name: "Double-Barrel Coach Gun",
    category: "weapon",
    weightKg: 3.4,
    basePrice: 490,
    description:
      "Sawed-off 12-gauge scattergun. Devastating stopping power against raiders charging your wagon.",
    weaponStats: {
      weaponId: "coach_shotgun_12g",
      minDamage: 30,
      maxDamage: 46,
      optimalRangeTiles: 3,
      maxRangeTiles: 5,
      snapShotAp: 4,
      aimedShotAp: 5,
      baseAccuracy: 80,
      ammoType: "ammo_12g",
      magazineSize: 2,
      reloadAp: 2,
    },
  },
  carbine_556: {
    id: "carbine_556",
    name: "New Denver 5.56 Carbine",
    category: "weapon",
    weightKg: 3.2,
    basePrice: 920,
    description:
      "Semi-automatic marksman carbine manufactured for the wealthy guard regiments of New Denver.",
    weaponStats: {
      weaponId: "carbine_556",
      minDamage: 22,
      maxDamage: 32,
      optimalRangeTiles: 8,
      maxRangeTiles: 11,
      snapShotAp: 3,
      aimedShotAp: 5,
      baseAccuracy: 82,
      ammoType: "ammo_556",
      magazineSize: 12,
      reloadAp: 2,
    },
  },
  ammo_38: {
    id: "ammo_38",
    name: ".38 Special Round",
    category: "ammo",
    weightKg: 0.03,
    basePrice: 11,
    description: "Standard revolver cartridge.",
  },
  ammo_308: {
    id: "ammo_308",
    name: ".308 Rifle Cartridge",
    category: "ammo",
    weightKg: 0.05,
    basePrice: 18,
    description: "High-powered brass rifle round. Make every shot count.",
  },
  ammo_12g: {
    id: "ammo_12g",
    name: "12-Gauge Buckshot Shell",
    category: "ammo",
    weightKg: 0.06,
    basePrice: 16,
    description: "Heavy lead buckshot shell for coach guns.",
  },
  ammo_556: {
    id: "ammo_556",
    name: "5.56mm Military Round",
    category: "ammo",
    weightKg: 0.04,
    basePrice: 24,
    description: "Rare high-velocity carbine ammunition.",
  },
};

export const TRANSPORTS: Record<TransportId, TransportDefinition> = {
  on_foot: {
    id: "on_foot",
    name: "On Foot (Backpack Only)",
    propulsion: "human",
    maxCargoKg: 35,
    baseSpeedKmh: 4.0,
    price: 0,
    waterPerDay: 0,
    foragePerDay: 0,
    fuelLitersPer10Km: 0,
    availableInTiers: ["frontier_town", "major_city"],
    description:
      "Walking the wasteland with only what your back can carry. Zero animal or fuel upkeep, but severely limited cargo.",
    terrainSpeedMultipliers: {
      old_highway: 1.0,
      scorched_flats: 0.95,
      sand_dunes: 0.8,
      rocky_canyon: 0.9,
    },
  },
  old_donkey: {
    id: "old_donkey",
    name: "Grandfather's Pack Donkey",
    propulsion: "animal",
    maxCargoKg: 85,
    baseSpeedKmh: 5.8,
    price: 260,
    waterPerDay: 2,
    foragePerDay: 2,
    fuelLitersPer10Km: 0,
    availableInTiers: ["frontier_town"],
    description:
      "Stubborn, sure-footed, and frugal. Carries saddlebags across rocky canyons and dunes without complaint.",
    terrainSpeedMultipliers: {
      old_highway: 1.05,
      scorched_flats: 1.0,
      sand_dunes: 0.92,
      rocky_canyon: 1.0,
    },
  },
  wooden_cart_donkey: {
    id: "wooden_cart_donkey",
    name: "Two-Wheel Cart + Donkey",
    propulsion: "animal",
    maxCargoKg: 210,
    baseSpeedKmh: 4.8,
    price: 680,
    waterPerDay: 3,
    foragePerDay: 3,
    fuelLitersPer10Km: 0,
    availableInTiers: ["frontier_town"],
    description:
      "A creaking timber cart hitched to your donkey. Triples cargo capacity for bulk grain and hides, though slower in deep sand.",
    terrainSpeedMultipliers: {
      old_highway: 1.15,
      scorched_flats: 0.95,
      sand_dunes: 0.65,
      rocky_canyon: 0.8,
    },
  },
  heavy_wagon_horse: {
    id: "heavy_wagon_horse",
    name: "Prairie Wagon + Draft Horse",
    propulsion: "animal",
    maxCargoKg: 460,
    baseSpeedKmh: 8.5,
    price: 1650,
    waterPerDay: 6,
    foragePerDay: 5,
    fuelLitersPer10Km: 0,
    availableInTiers: ["frontier_town", "major_city"],
    description:
      "A reinforced merchant wagon pulled by a muscular Deadwood draft horse. Fast on roads and offers solid cover in combat.",
    terrainSpeedMultipliers: {
      old_highway: 1.25,
      scorched_flats: 1.0,
      sand_dunes: 0.7,
      rocky_canyon: 0.85,
    },
  },
  scrap_motorcycle: {
    id: "scrap_motorcycle",
    name: "Wasteland Scrambler Bike",
    propulsion: "motor",
    maxCargoKg: 135,
    baseSpeedKmh: 26.0,
    price: 3100,
    waterPerDay: 0,
    foragePerDay: 0,
    fuelLitersPer10Km: 0.8,
    availableInTiers: ["major_city"],
    description:
      "Built in Saint Louis machine shops. Outruns almost any raider pack, consumes zero food when parked, but requires scarce Gasoline.",
    terrainSpeedMultipliers: {
      old_highway: 1.35,
      scorched_flats: 1.1,
      sand_dunes: 0.75,
      rocky_canyon: 0.9,
    },
  },
  armored_pickup: {
    id: "armored_pickup",
    name: "New Denver V8 Cargo Truck",
    propulsion: "motor",
    maxCargoKg: 1100,
    baseSpeedKmh: 36.0,
    price: 6400,
    waterPerDay: 0,
    foragePerDay: 0,
    fuelLitersPer10Km: 2.0,
    availableInTiers: ["major_city"],
    description:
      "The pinnacle of merchant power. Hauls over a metric ton at highway speeds, available only in metropolitan hubs.",
    terrainSpeedMultipliers: {
      old_highway: 1.4,
      scorched_flats: 1.15,
      sand_dunes: 0.7,
      rocky_canyon: 0.8,
    },
  },
};

export const SETTLEMENTS: Record<SettlementId, SettlementDefinition> = {
  dust_creek: {
    id: "dust_creek",
    name: "Dust Creek",
    tier: "frontier_town",
    subtitle: "Humble Frontier Farming & Well Settlement",
    lore: "A sun-baked cluster of wooden shacks built around a deep artesian well where your grandfather spent his final years. Water, corn, and donkey forage are cheap here, but manufactured tools and leather fetch high prices.",
    coordinates: { x: 160, y: 520 },
    produces: ["water", "food_rations", "animal_forage"],
    demands: ["raw_leather", "tools", "antibiotics"],
    priceMultipliers: {
      water: 0.55,
      food_rations: 0.65,
      animal_forage: 0.5,
      raw_leather: 1.45,
      tools: 1.55,
      antibiotics: 1.5,
      salt: 0.9,
    },
    baseStock: {
      water: 80,
      food_rations: 65,
      animal_forage: 90,
      salt: 18,
      raw_leather: 4,
      field_bandage: 8,
      rusty_machete: 3,
      ammo_38: 16,
      ammo_308: 10,
    },
    strictContrabandCheck: false,
    npcs: {
      general_trader: {
        role: "general_trader",
        name: "Silas Miller",
        title: "Dust Creek General Storekeeper",
        greeting:
          "Your granddaddy was an honest man, kid. Kept that old .308 oiled till his last breath. If you're heading northeast to Deadwood Gulch, pack extra water — their cattle wells ran brackish.",
        loreDialogue:
          "We pump clean water and grow dry corn, and that's about all Dust Creek has to its name. Bring us cured leather from Deadwood or machinist tools from the big eastern cities and I'll pay you handsomely.",
        tipDialogue:
          "Buy Water and Forage here while it's dirt cheap. Ranchers in Deadwood Gulch will pay double for clean water, and you can bring back their Raw Leather.",
      },
      transport_master: {
        role: "transport_master",
        name: "Old Barnaby",
        title: "Corral & Cart Wright",
        greeting:
          "That old donkey of your grandpa's still has sturdy legs! Once you've turned a few hundred dollars profit, come back and I'll hitch a two-wheel timber cart to him.",
        loreDialogue:
          "Don't go dreaming of gasoline motors out here in the scrublands. A donkey eats dry grass and never blows a head gasket.",
        tipDialogue:
          "Upgrading from a Pack Donkey (85 kg) to a Two-Wheel Cart (210 kg) lets you haul bulk commodities, though it slows you down a touch in deep sand.",
      },
      sheriff: {
        role: "sheriff",
        name: "Marshal Wyatt Cole",
        title: "Frontier Peacekeeper",
        greeting:
          "Keep your rifle loaded on the trail, merchant. Scavengers have been sniffing around the creek road ever since the dry season started.",
        loreDialogue:
          "Out here on the frontier, we don't care if you haul canyon moonshine. Just don't try sneaking it past the blue-coat inspectors in Saint Louis or New Denver unless you've got a silver tongue.",
        tipDialogue:
          "Check my Bounty Board whenever you feel ready for a fight. Eliminating a gang leader makes that trade route safer for everyone.",
      },
      saloon_barkeep: {
        role: "saloon_barkeep",
        name: "Maeve Holliday",
        title: "The Rusty Spur Saloon",
        greeting:
          "Pour yourself a glass of well-water or corn whiskey, stranger. Teamsters pass through every evening talking about which town is starving and which is booming.",
        loreDialogue:
          "Information makes more millionaires than bullets. Pay for a round and I'll tell you where prices just spiked.",
        tipDialogue:
          "Hiring a mercenary guard costs a daily wage and extra rations, but having a second gun on the tactical grid can save your life and your cargo.",
      },
    },
  },

  deadwood_gulch: {
    id: "deadwood_gulch",
    name: "Deadwood Gulch",
    tier: "frontier_town",
    subtitle: "Old West Cattle Ranching & Tannery Outpost",
    lore: "A rugged stockyard town smelling of woodsmoke, curing hides, and horse manure. Wranglers here raise the finest draft horses and tan heavy leather, but they are chronically short on clean water and ammunition.",
    coordinates: { x: 340, y: 270 },
    produces: ["raw_leather", "smoked_jerky"],
    demands: ["water", "salt", "ammo_308", "ammo_38"],
    priceMultipliers: {
      raw_leather: 0.58,
      smoked_jerky: 0.62,
      water: 1.65,
      salt: 1.55,
      ammo_308: 1.5,
      ammo_38: 1.45,
      animal_forage: 0.8,
    },
    baseStock: {
      raw_leather: 45,
      smoked_jerky: 50,
      animal_forage: 40,
      water: 14,
      food_rations: 25,
      field_bandage: 10,
      revolver_38: 2,
      coach_shotgun_12g: 2,
      ammo_38: 12,
      ammo_12g: 14,
    },
    strictContrabandCheck: false,
    npcs: {
      general_trader: {
        role: "general_trader",
        name: "Boone Callahan",
        title: "Gulch Hide & Provision Factor",
        greeting:
          "If you brought clean water or desert salt, unload it right now! My tanners are parched and we've got stacks of Cured Leather ready to ship east to Saint Louis.",
        loreDialogue:
          "The aristocrats in Saint Louis love our leather for their boots and upholstery, and the miners in Leadville Shaft can't work without our Smoked Jerky.",
        tipDialogue:
          "Load up on Raw Leather and Smoked Jerky here. Sell the Jerky at Leadville Shaft or New Denver, and take the Leather to Saint Louis for massive margins.",
      },
      transport_master: {
        role: "transport_master",
        name: "Calamity Jane Finch",
        title: "Deadwood Horse Wrangler",
        greeting:
          "A donkey's fine for a peddler, friend, but a true caravan master rides behind a Deadwood Draft Horse pulling a Prairie Wagon!",
        loreDialogue:
          "Our horses drink more water than a mule, sure, but they haul 460 kilos at a brisk trot down the Old Highway.",
        tipDialogue:
          "Save $1,650 for the Prairie Wagon + Draft Horse. It's the best non-fuel transport in the territory.",
      },
      sheriff: {
        role: "sheriff",
        name: "Sheriff Virgil Earp",
        title: "Gulch Lawman",
        greeting:
          "Cattle rustlers and highwaymen think they own the canyon pass to Leadville. Put a few of 'em in the dirt and the Ranchers' Association will make it worth your while.",
        loreDialogue:
          "Keep an eye on your ammo reserves. Out here, a man with an empty rifle is just a walking loot crate.",
        tipDialogue:
          "In combat, position your units behind rocks or your own wagon. Cover cuts the enemy's hit chance by 25% to 45%.",
      },
      saloon_barkeep: {
        role: "saloon_barkeep",
        name: "Doc Hollister",
        title: "The Longhorn Saloon",
        greeting:
          "Step up to the mahogany, merchant. Looking for market rumors or a hired gun who knows how to handle a coach shotgun?",
        loreDialogue:
          "Lots of drifters pass between the mines of Leadville and the river docks of Saint Louis.",
        tipDialogue:
          "Shotguns cost 4 AP to fire and wreck raiders up close, while your Grandfather's .308 Rifle dominates at 8 to 10 tiles.",
      },
    },
  },

  leadville_shaft: {
    id: "leadville_shaft",
    name: "Leadville Shaft",
    tier: "frontier_town",
    subtitle: "Canyon Lead Mine & Munitions Foundry",
    lore: "Carved into a jagged red-rock canyon, Leadville's blasts echo day and night. Miners smelt scrap steel and hand-press .38 and .308 cartridges, working up a fierce thirst for food, clean water, and illicit moonshine.",
    coordinates: { x: 520, y: 580 },
    produces: ["scrap_metal", "ammo_38", "ammo_308", "ammo_12g", "moonshine"],
    demands: ["smoked_jerky", "food_rations", "water", "antibiotics"],
    priceMultipliers: {
      scrap_metal: 0.55,
      ammo_38: 0.65,
      ammo_308: 0.68,
      ammo_12g: 0.7,
      moonshine: 0.6,
      smoked_jerky: 1.55,
      food_rations: 1.5,
      water: 1.6,
      antibiotics: 1.65,
    },
    baseStock: {
      scrap_metal: 60,
      ammo_38: 80,
      ammo_308: 65,
      ammo_12g: 55,
      moonshine: 30,
      revolver_38: 4,
      bolt_rifle_308: 3,
      coach_shotgun_12g: 3,
      water: 12,
      food_rations: 10,
      field_bandage: 12,
    },
    strictContrabandCheck: false,
    npcs: {
      general_trader: {
        role: "general_trader",
        name: "Gideon 'Slag' Vance",
        title: "Foundry Quartermaster & Gunsmith",
        greeting:
          "You smell like fresh air and trail dust! Did you bring Smoked Jerky or Antibiotics for the pit crews? We've got crates of Salvaged Steel and fresh-pressed brass ammo ready to deal.",
        loreDialogue:
          "Every bullet fired between Dust Creek and New Denver starts as lead pulled from our shaft. We also distill Canyon Moonshine in the back tunnels — totally legal here, wildly profitable if you smuggle it into New Denver.",
        tipDialogue:
          "Always restock your .308 and .38 ammunition here in Leadville Shaft where it's 35% cheaper than anywhere else.",
      },
      transport_master: {
        role: "transport_master",
        name: "Hector Ironwheel",
        title: "Mine Muleteer",
        greeting:
          "The canyon road is Murder on wooden spokes, merchant. Watch your cargo weight when climbing out of the shaft with heavy steel ingots!",
        loreDialogue:
          "Each Salvaged Steel ingot weighs 4 kg. Don't overload your cart past 70% capacity unless you're ready for a slower crawl.",
        tipDialogue:
          "If raiders catch you while hauling heavy steel, remember you can Jettison (dump) a few ingots to regain top speed and flee.",
      },
      sheriff: {
        role: "sheriff",
        name: "Captain Rooster Cogburn",
        title: "Union Mine Security Chief",
        greeting:
          "Dynamite thieves and canyon ambushes are my daily headache. Help me clear the rocky pass and the Miners' Guild pays cold hard script.",
        loreDialogue:
          "Use Aimed Shots when fighting armored raiders in the canyon. Costs more AP, but the extra accuracy saves precious brass.",
        tipDialogue:
          "High Perception boosts your accuracy on every single ranged shot.",
      },
      saloon_barkeep: {
        role: "saloon_barkeep",
        name: "Ruby Red",
        title: "The Canary & Pickaxe Dive",
        greeting:
          "Miners drink hard when they survive a shift. Want to buy a rumor on where the next supply shortage hit, or hire an ex-pit guard?",
        loreDialogue:
          "The rich folks in New Denver pretend they don't drink our Canyon Moonshine, yet they pay double for every jug that slips past their Sheriff.",
        tipDialogue:
          "Charisma not only improves trade prices at every shop, it helps you bluff city gate inspectors when carrying Contraband.",
      },
    },
  },

  blackwater_rig: {
    id: "blackwater_rig",
    name: "Blackwater Rig",
    tier: "frontier_town",
    subtitle: "Scorched Desert Oil Derrick & Refinery",
    lore: "Rising from the salt flats like an iron skeleton, Blackwater Rig pumps and distills the last accessible crude oil in the region. Gasoline is cheap here, but there isn't a blade of grass or drop of fresh water for miles.",
    coordinates: { x: 640, y: 230 },
    produces: ["gasoline", "salt"],
    demands: ["water", "food_rations", "raw_leather", "tools"],
    priceMultipliers: {
      gasoline: 0.52,
      salt: 0.55,
      water: 1.85,
      food_rations: 1.65,
      animal_forage: 1.75,
      raw_leather: 1.4,
      tools: 1.45,
    },
    baseStock: {
      gasoline: 110,
      salt: 70,
      tools: 8,
      water: 10,
      food_rations: 12,
      animal_forage: 8,
      field_bandage: 10,
      ammo_38: 25,
      ammo_12g: 20,
    },
    strictContrabandCheck: false,
    npcs: {
      general_trader: {
        role: "general_trader",
        name: "oilman Jedediah Clamp",
        title: "Refinery Commissary Boss",
        greeting:
          "Welcome to the hottest furnace on earth, traveler! Bring us Water and Rations so my roughnecks don't keel over, and I'll fill your jerrycans with pure Refined Gasoline at half price.",
        loreDialogue:
          "The aristocrats in Saint Louis and New Denver can't run their precious motorcycles and V8 trucks without Blackwater fuel. Buy it here for $20 a liter, sell it at their gates for $55!",
        tipDialogue:
          "Warning: The sand dunes around Blackwater Rig increase daily water consumption. Never travel here without extra water reserves!",
      },
      transport_master: {
        role: "transport_master",
        name: "Grease-Monkey Sparks",
        title: "Rig Pump & Motor Tech",
        greeting:
          "Still riding behind a four-legged hay-burner? Once you buy a Motorcycle or Pickup Truck in Saint Louis or New Denver, Blackwater Rig is your best friend for cheap fuel.",
        loreDialogue:
          "We refine the gasoline here, though only the big city workshops in Saint Louis and New Denver have the chassis factories to sell complete motor vehicles.",
        tipDialogue:
          "Even before you own a motor vehicle, hauling barrels of Gasoline from Blackwater Rig to New Denver is one of the most lucrative trade routes in the game.",
      },
      sheriff: {
        role: "sheriff",
        name: "Warden Cassius Holt",
        title: "Derrick Security Marshal",
        greeting:
          "Fuel raiders ride out of the salt flats trying to hijack tankers. Clear 'em out and the Rig Syndicate pays top bounties.",
        loreDialogue:
          "Out in the open flats, long-range rifles rule the battlefield. Keep your distance from shotgun raiders.",
        tipDialogue:
          "Check the danger rating on desert routes before departing.",
      },
      saloon_barkeep: {
        role: "saloon_barkeep",
        name: "Salty Pete",
        title: "The Flaming Barrel Canteen",
        greeting:
          "Careful where you strike a match in here, kid. Everything's soaked in crude oil and cheap whiskey.",
        loreDialogue:
          "Tanker drivers always know which metropolis is paying the highest premium for fuel and medicine.",
        tipDialogue:
          "Buy a rumor whenever you have spare cash — catching a 2.5x price spike turns a good trip into a fortune.",
      },
    },
  },

  saint_louis: {
    id: "saint_louis",
    name: "Saint Louis",
    tier: "major_city",
    subtitle: "Educated Riverfront Metropolis & Medical Hub",
    lore: "Behind brick fortifications and streetlamps, Saint Louis preserves pre-collapse universities, pharmaceutical labs, and cobblestone avenues. Wealthy merchants in tailored coats sip espresso, sell modern Antibiotics and Motorcycles, and pay dearly for frontier Raw Leather and Scrap Steel.",
    coordinates: { x: 840, y: 490 },
    produces: ["antibiotics", "luxury_cigars", "tools", "field_bandage"],
    demands: ["raw_leather", "scrap_metal", "food_rations", "moonshine"],
    priceMultipliers: {
      antibiotics: 0.62,
      luxury_cigars: 0.6,
      tools: 0.68,
      field_bandage: 0.7,
      raw_leather: 1.65,
      scrap_metal: 1.55,
      food_rations: 1.4,
      moonshine: 1.85,
      gasoline: 1.35,
    },
    baseStock: {
      antibiotics: 45,
      luxury_cigars: 50,
      tools: 40,
      field_bandage: 60,
      gasoline: 35,
      water: 50,
      food_rations: 30,
      animal_forage: 30,
      revolver_38: 5,
      bolt_rifle_308: 4,
      carbine_556: 3,
      ammo_38: 50,
      ammo_308: 45,
      ammo_556: 40,
    },
    strictContrabandCheck: true,
    npcs: {
      general_trader: {
        role: "general_trader",
        name: "Julian Vanderbilt III",
        title: "Director of the Saint Louis Mercantile Exchange",
        greeting:
          "Ah, a frontier caravaner! Mind the mud on the parquet floor. If you have brought Cured Leather from Deadwood or Steel Ingots from Leadville, our guild will compensate you generously.",
        loreDialogue:
          "Here in Saint Louis, we maintain civilized standards — university chemists synthesize true Antibiotics, and our artisans craft fine Machinist Toolsets that frontier bumpkins desperately require.",
        tipDialogue:
          "Sell Raw Leather and Scrap Metal here, then buy Antibiotics and Tools to sell back in the frontier towns for a double-way profit loop!",
      },
      transport_master: {
        role: "transport_master",
        name: "Chief Engineer Alistair Sterling",
        title: "Saint Louis Motorworks & Carriage Guild",
        greeting:
          "Tired of crawling across the wasteland at five kilometers an hour behind a donkey? Behold the Wasteland Scrambler Motorcycle and the New Denver V8 Cargo Truck!",
        loreDialogue:
          "Internal combustion is the mark of an educated merchant. Just ensure you carry sufficient Refined Gasoline before venturing back into the frontier.",
        tipDialogue:
          "The Wasteland Scrambler Bike ($3,100) travels at 26 km/h — nearly 5x faster than a donkey — making high-value Antibiotic and Cigar runs lightning fast.",
      },
      sheriff: {
        role: "sheriff",
        name: "Commissioner Arthur Pendelton",
        title: "Metropolitan Constabulary HQ",
        greeting:
          "State your business, caravaner. Saint Louis strictly prohibits unlicensed Canyon Moonshine. Keep our highways clear of highwaymen, however, and the City Council authorizes substantial bounties.",
        loreDialogue:
          "Law and order separate Saint Louis from the lawless gulches of the west.",
        tipDialogue:
          "Entering Saint Louis or New Denver with Moonshine triggers a Contraband Inspection. High Charisma lets you talk your way past the guards!",
      },
      saloon_barkeep: {
        role: "saloon_barkeep",
        name: "Madame Celeste",
        title: "The Gilded Steamboat Lounge",
        greeting:
          "Welcome to the Steamboat Lounge. Our patrons include commodity brokers, off-duty constables, and elite mercenaries looking for a wealthy caravan to escort.",
        loreDialogue:
          "When a drought or mine strike hits the western frontier, news reaches our telegraph office first.",
        tipDialogue:
          "Elite mercenaries in major cities have higher accuracy and better weapons than frontier drifters.",
      },
    },
  },

  new_denver: {
    id: "new_denver",
    name: "New Denver",
    tier: "major_city",
    subtitle: "Walled Industrial Capital & High-Plateau Citadel",
    lore: "Towering steel walls protect New Denver's smokestacks, armories, and electric grid. Ruled by wealthy industrial barons and military engineers, it is the premier hub for V8 Cargo Trucks and 5.56 Carbines, with an insatiable appetite for Gasoline, Smoked Jerky, and smuggled Moonshine.",
    coordinates: { x: 860, y: 170 },
    produces: ["carbine_556", "ammo_556", "tools", "antibiotics"],
    demands: ["gasoline", "smoked_jerky", "scrap_metal", "luxury_cigars", "moonshine"],
    priceMultipliers: {
      tools: 0.6,
      carbine_556: 0.78,
      ammo_556: 0.7,
      antibiotics: 0.75,
      gasoline: 1.55,
      smoked_jerky: 1.6,
      scrap_metal: 1.5,
      luxury_cigars: 1.55,
      moonshine: 2.1,
    },
    baseStock: {
      tools: 55,
      antibiotics: 35,
      field_bandage: 50,
      carbine_556: 6,
      coach_shotgun_12g: 4,
      bolt_rifle_308: 5,
      ammo_556: 90,
      ammo_308: 60,
      ammo_12g: 50,
      gasoline: 40,
      water: 45,
      food_rations: 40,
    },
    strictContrabandCheck: true,
    npcs: {
      general_trader: {
        role: "general_trader",
        name: "Baroness Victoria Kensington",
        title: "New Denver Armory & Industrial Syndicate",
        greeting:
          "Time is money in New Denver, trader. Our factories require Blackwater Gasoline, Leadville Steel, and Deadwood Jerky for our workforce. In exchange, we offer military-grade 5.56 Carbines and precision tools.",
        loreDialogue:
          "The frontier relies on beasts of burden, while New Denver rebuilds the modern world. Profit belongs to those who bridge the gap between the two.",
        tipDialogue:
          "Hauling Gasoline from Blackwater Rig or Luxury Cigars from Saint Louis to New Denver yields massive profits.",
      },
      transport_master: {
        role: "transport_master",
        name: "Foreman Marcus Vance",
        title: "Citadel Heavy Automotive Foundry",
        greeting:
          "Looking at the V8 Cargo Truck? Reinforced steel bed, 1,100 kg capacity, 36 km/h cruising speed. Once you drive one of these, you own the trade routes.",
        loreDialogue:
          "A V8 Truck burns 2 Liters of Gasoline per 10 km, so always keep at least 15-20 Liters in your tank before leaving the city.",
        tipDialogue:
          "If you ever run out of Gasoline mid-journey, your vehicle stalls until you switch to foot/animal or buy emergency fuel.",
      },
      sheriff: {
        role: "sheriff",
        name: " Provost Marshal Sterling Graves",
        title: "Citadel High Command",
        greeting:
          "New Denver enforces strict customs inspections at the Northern Gate. Keep your manifest clean of contraband, or take a High Command Bounty to prove your loyalty.",
        loreDialogue:
          "Warlord gangs along the northern highway carry automatic weapons. Do not engage them without cover and extra bandages.",
        tipDialogue:
          "Completing high-tier bounties around New Denver pays up to $650 in reward cash.",
      },
      saloon_barkeep: {
        role: "saloon_barkeep",
        name: "Victor 'The Velvet' Moretti",
        title: "The Mile-High Officers' Club",
        greeting:
          "Bourbon on ice, merchant? Only the wealthiest caravan bosses make it up to the Mile-High Club. Incidentally, my back-room buyers pay 210% for Canyon Moonshine if you slipped any past the gate...",
        loreDialogue:
          "All the big trade syndicates broker their deals right at these tables.",
        tipDialogue:
          "Combine a V8 Truck with two hired mercenaries and no raider gang in the wasteland can stop your caravan.",
      },
    },
  },
};

export const ROUTES: RouteEdge[] = [
  {
    id: "route_dust_deadwood",
    from: "dust_creek",
    to: "deadwood_gulch",
    distanceKm: 42,
    terrain: "scorched_flats",
    dangerLevel: 1,
    routeLabel: "North Scrub Trail",
  },
  {
    id: "route_dust_leadville",
    from: "dust_creek",
    to: "leadville_shaft",
    distanceKm: 54,
    terrain: "rocky_canyon",
    dangerLevel: 2,
    routeLabel: "Copper Canyon Pass",
  },
  {
    id: "route_deadwood_leadville",
    from: "deadwood_gulch",
    to: "leadville_shaft",
    distanceKm: 48,
    terrain: "rocky_canyon",
    dangerLevel: 2,
    routeLabel: "Red Gorge Trail",
  },
  {
    id: "route_deadwood_blackwater",
    from: "deadwood_gulch",
    to: "blackwater_rig",
    distanceKm: 50,
    terrain: "sand_dunes",
    dangerLevel: 3,
    routeLabel: "Alkali Salt Flats",
  },
  {
    id: "route_leadville_blackwater",
    from: "leadville_shaft",
    to: "blackwater_rig",
    distanceKm: 58,
    terrain: "sand_dunes",
    dangerLevel: 3,
    routeLabel: "Sunfire Dune Track",
  },
  {
    id: "route_leadville_stlouis",
    from: "leadville_shaft",
    to: "saint_louis",
    distanceKm: 64,
    terrain: "old_highway",
    dangerLevel: 3,
    routeLabel: "Old Route 66 East",
  },
  {
    id: "route_blackwater_stlouis",
    from: "blackwater_rig",
    to: "saint_louis",
    distanceKm: 62,
    terrain: "old_highway",
    dangerLevel: 3,
    routeLabel: "Refinery Turnpike",
  },
  {
    id: "route_blackwater_newdenver",
    from: "blackwater_rig",
    to: "new_denver",
    distanceKm: 46,
    terrain: "old_highway",
    dangerLevel: 4,
    routeLabel: "Interstate 70 North",
  },
  {
    id: "route_stlouis_newdenver",
    from: "saint_louis",
    to: "new_denver",
    distanceKm: 68,
    terrain: "old_highway",
    dangerLevel: 4,
    routeLabel: "High Plains Expressway",
  },
];

export const INITIAL_MARKET_EVENTS: MarketEvent[] = [
  {
    id: "evt_deadwood_drought",
    title: "Brackish Well Crisis in Deadwood Gulch",
    description:
      "The main cattle well in Deadwood Gulch turned alkaline. Ranchers are paying 2.4x normal price for Purified Water!",
    settlementId: "deadwood_gulch",
    affectedItem: "water",
    priceMultiplier: 2.4,
    daysRemaining: 8,
  },
  {
    id: "evt_leadville_fever",
    title: "Shaft Fever Outbreak in Leadville",
    description:
      "Damp tunnel air triggered a lung fever among miners. Leadville Shaft is paying 2.2x for Pre-War Antibiotics!",
    settlementId: "leadville_shaft",
    affectedItem: "antibiotics",
    priceMultiplier: 2.2,
    daysRemaining: 10,
  },
  {
    id: "evt_newdenver_convoy",
    title: "New Denver Patrol Convoy Mobilization",
    description:
      "The Citadel is fueling an expeditionary convoy. Refined Gasoline sells for 1.9x extra in New Denver!",
    settlementId: "new_denver",
    affectedItem: "gasoline",
    priceMultiplier: 1.9,
    daysRemaining: 9,
  },
];

export const INITIAL_BOUNTIES: BountyContract[] = [
  {
    id: "bounty_one_eyed_pike",
    bossName: "One-Eyed Pike",
    gangName: "Scrubland Jackals",
    routeId: "route_dust_deadwood",
    originSettlement: "dust_creek",
    rewardCash: 320,
    difficulty: 1,
    description:
      "Pike and his two cutthroats have been robbing water peddlers between Dust Creek and Deadwood Gulch.",
    completed: false,
  },
  {
    id: "bounty_iron_madam",
    bossName: "Madeline 'Slag' Korvex",
    gangName: "Canyon Dynamiters",
    routeId: "route_deadwood_leadville",
    originSettlement: "leadville_shaft",
    rewardCash: 480,
    difficulty: 2,
    description:
      "Former quarry blaster ambushing leather and ammo wagons along Red Gorge Trail.",
    completed: false,
  },
  {
    id: "bounty_diesel_kane",
    bossName: "Warlord Diesel Kane",
    gangName: "Asphalt Reavers",
    routeId: "route_blackwater_newdenver",
    originSettlement: "new_denver",
    rewardCash: 750,
    difficulty: 4,
    description:
      "Heavily armed highway warlord hijacking gasoline shipments on Interstate 70 North.",
    completed: false,
  },
];

export const AVAILABLE_MERCENARIES: Mercenary[] = [
  {
    id: "merc_cassidy",
    name: "Cole 'Deadeye' Cassidy",
    roleTitle: "Ex-Frontier Rifleman",
    homeSettlement: "dust_creek",
    hiringFee: 180,
    dailyWage: 18,
    maxHp: 85,
    hp: 85,
    maxAp: 7,
    accuracyBonus: 14,
    equippedWeapon: "revolver_38",
    bio: "Veteran trail scout who never panics under fire. Quick on the draw with his .38 revolver.",
  },
  {
    id: "merc_hannah",
    name: "Hannah 'Buckshot' McGraw",
    roleTitle: "Gulch Coach Guard",
    homeSettlement: "deadwood_gulch",
    hiringFee: 260,
    dailyWage: 24,
    maxHp: 105,
    hp: 105,
    maxAp: 7,
    accuracyBonus: 12,
    equippedWeapon: "coach_shotgun_12g",
    bio: "Ranch enforcer armed with a double-barrel 12-gauge. Shreds anyone who gets near the wagon.",
  },
  {
    id: "merc_vance",
    name: "Sgt. Julian Vance",
    roleTitle: "Saint Louis Deserter Marksman",
    homeSettlement: "saint_louis",
    hiringFee: 420,
    dailyWage: 35,
    maxHp: 110,
    hp: 110,
    maxAp: 8,
    accuracyBonus: 20,
    equippedWeapon: "carbine_556",
    bio: "Trained in Saint Louis urban warfare. Carries a 5.56 Carbine and high AP mobility.",
  },
];

export function createInitialGameState(): GameState {
  const initialTownStocks: Record<SettlementId, Partial<Record<ItemId, number>>> = {
    dust_creek: { ...SETTLEMENTS.dust_creek.baseStock },
    deadwood_gulch: { ...SETTLEMENTS.deadwood_gulch.baseStock },
    leadville_shaft: { ...SETTLEMENTS.leadville_shaft.baseStock },
    blackwater_rig: { ...SETTLEMENTS.blackwater_rig.baseStock },
    saint_louis: { ...SETTLEMENTS.saint_louis.baseStock },
    new_denver: { ...SETTLEMENTS.new_denver.baseStock },
  };

  return {
    playerName: "Arthur Morgan Jr.",
    attributes: {
      grit: 4,
      agility: 5,
      perception: 5,
      charisma: 4,
    },
    unspentAttributePoints: 3, // Player gets 3 bonus points to customize their build!
    hp: 98, // 50 + 4 * 12
    maxHp: 98,
    equippedWeapon: "bolt_rifle_308",
    cash: 1000, // Grandfather's $1,000 inheritance
    day: 1,
    hour: 8,
    currentSettlement: "dust_creek",
    lastVisitedSettlement: "dust_creek",
    transport: "old_donkey", // Grandfather's Pack Donkey
    ownedTransports: ["on_foot", "old_donkey"],
    inventory: {
      bolt_rifle_308: 1, // Grandfather's old rifle
      rusty_machete: 1, // Backup melee blade
      ammo_308: 12, // Some .308 bullets
      water: 10, // Starting water
      food_rations: 8, // Starting food
      animal_forage: 8, // Starting donkey forage
      field_bandage: 2,
    },
    townStocks: initialTownStocks,
    marketEvents: [...INITIAL_MARKET_EVENTS],
    knownRumorIds: ["evt_deadwood_drought"],
    bounties: [...INITIAL_BOUNTIES],
    hiredMercenaries: [],
    travelState: null,
    pendingEncounter: null,
    combatState: null,
    reputation: 10,
    journalLogs: [
      "Day 1, 08:00 — You buried your grandfather on the ridge overlooking Dust Creek. His inheritance is yours: $1,000 in Trade Guild script, his faithful pack donkey, an old .308 bolt-action rifle with 12 brass rounds, and a rusty machete.",
      "Tip: Allocate your 3 unspent Attribute Points in the Character panel, buy cheap Water & Forage in Dust Creek, and head to Deadwood Gulch to start your merchant route!",
    ],
  };
}
