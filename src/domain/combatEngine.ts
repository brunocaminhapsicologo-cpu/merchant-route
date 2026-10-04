import {
  getMaxAp,
  getMaxHp,
  getRangedAccuracyBonus,
} from "./economyEngine";
import {
  CombatGridTile,
  CombatState,
  CombatUnit,
  FiringMode,
  GameState,
  RoadEncounter,
  RouteEdge,
} from "./types";
import { ITEMS } from "./worldData";

export function generateRoadEncounter(
  state: GameState,
  route: RouteEdge
): RoadEncounter {
  // Check if there is an active uncompleted bounty on this route
  const activeBounty = state.bounties.find(
    (b) => b.routeId === route.id && !b.completed
  );

  if (activeBounty && Math.random() < 0.65) {
    return {
      id: `enc_${Date.now()}`,
      title: `Bounty Target Spotted: ${activeBounty.bossName}`,
      enemyGroupName: activeBounty.gangName,
      description: `${activeBounty.bossName} and the ${activeBounty.gangName} have blockaded ${route.routeLabel}! Eliminate them to claim the $${activeBounty.rewardCash} Sheriff Bounty and secure this trade route.`,
      isBountyTarget: true,
      bountyId: activeBounty.id,
      enemySpeedKmh: 6.5 + activeBounty.difficulty * 2.2,
      tollDemandCash: 160 + activeBounty.difficulty * 85,
      intimidateThreshold: 14 + activeBounty.difficulty * 4,
      enemies: [
        {
          name: activeBounty.bossName,
          role: "Outlaw Boss",
          hp: 65 + activeBounty.difficulty * 18,
          maxHp: 65 + activeBounty.difficulty * 18,
          ap: 7,
          maxAp: 7,
          weapon:
            activeBounty.difficulty >= 4
              ? "sniper_rifle_762"
              : activeBounty.difficulty >= 3
              ? "carbine_556"
              : activeBounty.difficulty === 2
              ? "peacemaker_45"
              : "lever_repeater_38",
          accuracy: 68 + activeBounty.difficulty * 4,
          morale: 100,
        },
        {
          name: `${activeBounty.gangName} Gunner`,
          role: "Highwayman",
          hp: 50 + activeBounty.difficulty * 10,
          maxHp: 50 + activeBounty.difficulty * 10,
          ap: 6,
          maxAp: 6,
          weapon:
            activeBounty.difficulty >= 4
              ? "grease_smg_9mm"
              : activeBounty.difficulty >= 2
              ? "pump_shotgun_12g"
              : "revolver_38",
          accuracy: 62 + activeBounty.difficulty * 3,
          morale: 85,
        },
        {
          name: `${activeBounty.gangName} Bruiser`,
          role: "Scrapper",
          hp: 55 + activeBounty.difficulty * 8,
          maxHp: 55 + activeBounty.difficulty * 8,
          ap: 6,
          maxAp: 6,
          weapon:
            activeBounty.difficulty >= 3
              ? "sledgehammer"
              : activeBounty.difficulty === 2
              ? "cavalry_saber"
              : "rusty_machete",
          accuracy: 80,
          morale: 80,
        },
      ],
      lootReward: {
        cash: 140 + activeBounty.difficulty * 90,
        items: {
          ammo_38: 8,
          ammo_45: 6,
          ammo_308: 5,
          field_bandage: 2,
          smoked_jerky: 2,
        },
      },
    };
  }

  const danger = route.dangerLevel;

  if (danger <= 1) {
    return {
      id: `enc_${Date.now()}`,
      title: "Desperate Scrubland Drifters",
      enemyGroupName: "Dust Creek Scavengers",
      description:
        "Three sun-blistered scavengers step out from behind a rusted billboard, demanding water and coin at gunpoint.",
      isBountyTarget: false,
      enemySpeedKmh: 5.2,
      tollDemandCash: 85,
      intimidateThreshold: 11,
      enemies: [
        {
          name: "Scavenger Cleetus",
          role: "Drifter Pistolero",
          hp: 46,
          maxHp: 46,
          ap: 6,
          maxAp: 6,
          weapon: "derringer_22",
          accuracy: 62,
          morale: 75,
        },
        {
          name: "Prairie Kid",
          role: "Varmint Shooter",
          hp: 44,
          maxHp: 44,
          ap: 6,
          maxAp: 6,
          weapon: "varmint_rifle_22",
          accuracy: 64,
          morale: 72,
        },
        {
          name: "Machete Rufus",
          role: "Trail Cutthroat",
          hp: 52,
          maxHp: 52,
          ap: 6,
          maxAp: 6,
          weapon: "rusty_machete",
          accuracy: 76,
          morale: 70,
        },
      ],
      lootReward: {
        cash: 95,
        items: {
          ammo_22: 10,
          ammo_38: 6,
          water: 3,
          raw_leather: 1,
        },
      },
    };
  }

  if (danger === 2) {
    return {
      id: `enc_${Date.now()}`,
      title: "Canyon Bushwhackers",
      enemyGroupName: "Red Rock Outlaws",
      description:
        "Lever-action repeaters glint from the canyon boulders ahead. A three-man bushwhacker crew is eyeing your pack animals and cargo.",
      isBountyTarget: false,
      enemySpeedKmh: 7.4,
      tollDemandCash: 165,
      intimidateThreshold: 15,
      enemies: [
        {
          name: "Deadshot Reno",
          role: "Canyon Marksman",
          hp: 58,
          maxHp: 58,
          ap: 6,
          maxAp: 6,
          weapon: "lever_repeater_38",
          accuracy: 70,
          morale: 85,
        },
        {
          name: "Shotgun Bart",
          role: "Enforcer",
          hp: 64,
          maxHp: 64,
          ap: 6,
          maxAp: 6,
          weapon: "coach_shotgun_12g",
          accuracy: 68,
          morale: 80,
        },
        {
          name: "Saber Delgado",
          role: "Outrider Duelist",
          hp: 54,
          maxHp: 54,
          ap: 7,
          maxAp: 7,
          weapon: "cavalry_saber",
          accuracy: 84,
          morale: 76,
        },
      ],
      lootReward: {
        cash: 175,
        items: {
          ammo_38: 8,
          ammo_12g: 5,
          ammo_308: 4,
          field_bandage: 2,
          scrap_metal: 2,
        },
      },
    };
  }

  if (danger === 3) {
    return {
      id: `enc_${Date.now()}`,
      title: "Highway Raider Syndicate",
      enemyGroupName: "Asphalt Jackals",
      description:
        "Well-armed highway raiders in welded scrap armor block the road, hunting high-value fuel, leather, and city merchandise.",
      isBountyTarget: false,
      enemySpeedKmh: 11.5,
      tollDemandCash: 260,
      intimidateThreshold: 18,
      enemies: [
        {
          name: "Road-Captain Vex",
          role: "Gunslinger Boss",
          hp: 78,
          maxHp: 78,
          ap: 7,
          maxAp: 7,
          weapon: "peacemaker_45",
          accuracy: 74,
          morale: 90,
        },
        {
          name: "Buckshot Miller",
          role: "Trench Breacher",
          hp: 72,
          maxHp: 72,
          ap: 6,
          maxAp: 6,
          weapon: "pump_shotgun_12g",
          accuracy: 72,
          morale: 85,
        },
        {
          name: "Dust Sniper Crow",
          role: "Sharpshooter",
          hp: 62,
          maxHp: 62,
          ap: 6,
          maxAp: 6,
          weapon: "bolt_rifle_308",
          accuracy: 74,
          morale: 82,
        },
        {
          name: "Crusher Briggs",
          role: "Maul Enforcer",
          hp: 74,
          maxHp: 74,
          ap: 6,
          maxAp: 6,
          weapon: "sledgehammer",
          accuracy: 80,
          morale: 84,
        },
      ],
      lootReward: {
        cash: 280,
        items: {
          ammo_45: 8,
          ammo_12g: 6,
          ammo_308: 6,
          gasoline: 3,
          antibiotics: 1,
        },
      },
    };
  }

  return {
    id: `enc_${Date.now()}`,
    title: "Viaduct Iron Syndicate Ambush",
    enemyGroupName: "Iron Rail Enforcers",
    description:
      "Elite metropolitan syndicate gunmen armed with M3 Grease Guns, 5.56 Carbines, and 7.62mm Sniper Rifles have barricaded the highway!",
    isBountyTarget: false,
    enemySpeedKmh: 14.5,
    tollDemandCash: 360,
    intimidateThreshold: 22,
    enemies: [
      {
        name: "Commander Vane",
        role: "Syndicate Tactician",
        hp: 88,
        maxHp: 88,
        ap: 7,
        maxAp: 7,
        weapon: "carbine_556",
        accuracy: 78,
        morale: 95,
      },
      {
        name: "Chopper Malone",
        role: "SMG Gunner",
        hp: 78,
        maxHp: 78,
        ap: 7,
        maxAp: 7,
        weapon: "grease_smg_9mm",
        accuracy: 74,
        morale: 88,
      },
      {
        name: "Deadeye Cross",
        role: "Vault Sharpshooter",
        hp: 68,
        maxHp: 68,
        ap: 6,
        maxAp: 6,
        weapon: "sniper_rifle_762",
        accuracy: 82,
        morale: 88,
      },
    ],
    lootReward: {
      cash: 390,
      items: {
        ammo_556: 10,
        ammo_9mm: 12,
        ammo_762: 6,
        gasoline: 4,
        antibiotics: 1,
      },
    },
  };
}

export function initializeTacticalCombat(
  state: GameState,
  encounter: RoadEncounter
): CombatState {
  const gridWidth = 12;
  const gridHeight = 8;

  const tiles: CombatGridTile[][] = [];
  for (let y = 0; y < gridHeight; y++) {
    const row: CombatGridTile[] = [];
    for (let x = 0; x < gridWidth; x++) {
      let cover: CombatGridTile["cover"] = "none";
      let moveApCost = 1;
      let defenseBonus = 0;

      // Player's caravan wagon cover on the left defensive flank
      if ((x === 2 && y === 3) || (x === 2 && y === 4)) {
        cover = "wagon";
        defenseBonus = 45;
      } else if (
        (x === 4 && y === 1) ||
        (x === 5 && y === 5) ||
        (x === 7 && y === 2) ||
        (x === 8 && y === 6)
      ) {
        cover = "rocks";
        defenseBonus = 30;
      } else if ((x === 6 && y === 3) || (x === 9 && y === 4)) {
        cover = "ruins";
        defenseBonus = 35;
      } else if ((x === 4 && y === 6) || (x === 7 && y === 1)) {
        cover = "sand";
        moveApCost = 2;
      }

      row.push({
        x,
        y,
        cover,
        moveApCost,
        defenseBonus,
      });
    }
    tiles.push(row);
  }

  const playerMaxAp = getMaxAp(state.attributes);
  const playerMaxHp = getMaxHp(state.attributes);
  const playerWeaponStats = ITEMS[state.equippedWeapon].weaponStats!;

  const units: CombatUnit[] = [
    {
      id: "unit_player",
      name: state.playerName,
      role: "Caravan Master",
      isPlayerTeam: true,
      isMainCharacter: true,
      x: 1,
      y: 3,
      hp: Math.min(state.hp, playerMaxHp),
      maxHp: playerMaxHp,
      ap: playerMaxAp,
      maxAp: playerMaxAp,
      weapon: state.equippedWeapon,
      currentMagAmmo: playerWeaponStats.magazineSize,
      accuracy:
        playerWeaponStats.baseAccuracy +
        getRangedAccuracyBonus(state.attributes),
      morale: 100,
    },
  ];

  // Add hired mercenaries to player squad
  state.hiredMercenaries.forEach((merc, idx) => {
    const mercWeaponStats = ITEMS[merc.equippedWeapon].weaponStats!;
    units.push({
      id: `unit_${merc.id}`,
      name: merc.name,
      role: merc.roleTitle,
      isPlayerTeam: true,
      x: 1,
      y: idx === 0 ? 5 : 1,
      hp: merc.hp,
      maxHp: merc.maxHp,
      ap: merc.maxAp,
      maxAp: merc.maxAp,
      weapon: merc.equippedWeapon,
      currentMagAmmo: mercWeaponStats.magazineSize,
      accuracy: mercWeaponStats.baseAccuracy + merc.accuracyBonus,
      morale: 100,
    });
  });

  // Add enemy units on the right side of the grid
  const enemyPositions = [
    { x: 10, y: 3 },
    { x: 10, y: 5 },
    { x: 10, y: 1 },
    { x: 9, y: 6 },
  ];

  encounter.enemies.forEach((enemy, idx) => {
    const pos = enemyPositions[idx % enemyPositions.length];
    const enemyWeaponStats = ITEMS[enemy.weapon].weaponStats!;
    units.push({
      id: `enemy_${idx}`,
      name: enemy.name,
      role: enemy.role,
      isPlayerTeam: false,
      x: pos.x,
      y: pos.y,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      ap: enemy.maxAp,
      maxAp: enemy.maxAp,
      weapon: enemy.weapon,
      currentMagAmmo: enemyWeaponStats.magazineSize,
      accuracy: enemy.accuracy,
      morale: enemy.morale,
    });
  });

  return {
    encounter,
    gridWidth,
    gridHeight,
    tiles,
    units,
    activeUnitId: "unit_player",
    roundNumber: 1,
    selectedFiringMode:
      playerWeaponStats.ammoType === null ? "melee" : "snap",
    combatLog: [
      `⚔️ Round 1 — Tactical Combat engaged against ${encounter.enemyGroupName}!`,
      `Position your units behind the Wagon (45% Cover) or Rocks (30% Cover) and spend Action Points (AP) wisely.`,
    ],
    outcome: "ongoing",
  };
}

export function getManhattanDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

export function calculateShotPreview(
  combat: CombatState,
  attacker: CombatUnit,
  target: CombatUnit,
  mode: FiringMode
): {
  canAttack: boolean;
  reason?: string;
  apCost: number;
  hitChancePercent: number;
  minDamage: number;
  maxDamage: number;
  distance: number;
} {
  const weaponStats = ITEMS[attacker.weapon].weaponStats!;
  const dist = getManhattanDistance(attacker.x, attacker.y, target.x, target.y);

  const effectiveMode: FiringMode =
    weaponStats.ammoType === null ? "melee" : mode;

  let apCost = weaponStats.snapShotAp;
  if (effectiveMode === "aimed") {
    apCost = weaponStats.aimedShotAp ?? weaponStats.snapShotAp;
  } else if (effectiveMode === "headshot") {
    apCost = (weaponStats.aimedShotAp ?? weaponStats.snapShotAp) + 1;
  } else if (effectiveMode === "legshot") {
    apCost = weaponStats.aimedShotAp ?? weaponStats.snapShotAp + 1;
  }

  if (dist > weaponStats.maxRangeTiles) {
    return {
      canAttack: false,
      reason: `Out of range (${dist} tiles > max ${weaponStats.maxRangeTiles})`,
      apCost,
      hitChancePercent: 0,
      minDamage: weaponStats.minDamage,
      maxDamage: weaponStats.maxDamage,
      distance: dist,
    };
  }

  if (attacker.ap < apCost) {
    return {
      canAttack: false,
      reason: `Needs ${apCost} AP (Have ${attacker.ap} AP)`,
      apCost,
      hitChancePercent: 0,
      minDamage: weaponStats.minDamage,
      maxDamage: weaponStats.maxDamage,
      distance: dist,
    };
  }

  if (weaponStats.ammoType !== null && attacker.currentMagAmmo <= 0) {
    return {
      canAttack: false,
      reason: `Magazine empty! Reload (${weaponStats.reloadAp} AP) or switch to Melee`,
      apCost,
      hitChancePercent: 0,
      minDamage: weaponStats.minDamage,
      maxDamage: weaponStats.maxDamage,
      distance: dist,
    };
  }

  let hitChance = attacker.accuracy;

  // Range penalty beyond optimal range
  if (dist > weaponStats.optimalRangeTiles) {
    hitChance -= (dist - weaponStats.optimalRangeTiles) * 9;
  } else if (dist <= 2 && weaponStats.ammoType !== null) {
    // Point-blank bonus
    hitChance += 8;
  }

  // Firing mode accuracy modifiers
  if (effectiveMode === "aimed") {
    hitChance += 22;
  } else if (effectiveMode === "headshot") {
    hitChance -= 18;
  } else if (effectiveMode === "legshot") {
    hitChance -= 10;
  }

  // Stance modifiers (ranged attacks)
  if (effectiveMode !== "melee") {
    if (attacker.isCrouched) {
      hitChance += 8;
    }
    if (target.isCrouched) {
      hitChance -= 15;
    }
  }

  // Target tile cover defense bonus (ignored in melee)
  const targetTile = combat.tiles[target.y]?.[target.x];
  if (effectiveMode !== "melee" && targetTile) {
    hitChance -= targetTile.defenseBonus;
  }

  const clampedHitChance = Math.max(12, Math.min(96, Math.round(hitChance)));

  let damageMultiplier = 1.0;
  if (effectiveMode === "aimed") {
    damageMultiplier = 1.2;
  } else if (effectiveMode === "headshot") {
    damageMultiplier = 1.9;
  } else if (effectiveMode === "legshot") {
    damageMultiplier = 0.85;
  }

  return {
    canAttack: true,
    apCost,
    hitChancePercent: clampedHitChance,
    minDamage: Math.round(weaponStats.minDamage * damageMultiplier),
    maxDamage: Math.round(weaponStats.maxDamage * damageMultiplier),
    distance: dist,
  };
}
