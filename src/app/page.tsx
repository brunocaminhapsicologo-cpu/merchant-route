"use client";

import React, { useEffect, useState } from "react";
import { soundEngine, WeaponSoundCategory } from "@/assets/soundEngine";
import { OverworldMapCanvas } from "@/components/OverworldMapCanvas";
import { PreCombatEncounterModal } from "@/components/PreCombatEncounterModal";
import { TacticalCombatModal } from "@/components/TacticalCombatModal";
import { TownHubPanel } from "@/components/TownHubPanel";
import {
  calculateShotPreview,
  generateRoadEncounter,
  getManhattanDistance,
  initializeTacticalCombat,
} from "@/domain/combatEngine";
import {
  getCaravanSpeedBreakdown,
  getCurrentCargoWeightKg,
  getDailyUpkeepSummary,
  getMarketPrices,
  getMaxAp,
  getMaxCargoCapacityKg,
  getMaxHp,
  getRangedAccuracyBonus,
  getRouteBetween,
} from "@/domain/economyEngine";
import {
  CharacterAttributes,
  CombatState,
  FiringMode,
  GameState,
  ItemId,
  SettlementId,
  TransportId,
  WeaponId,
} from "@/domain/types";
import {
  AVAILABLE_MERCENARIES,
  createInitialGameState,
  ITEMS,
  ROUTES,
  SETTLEMENTS,
  TRANSPORTS,
} from "@/domain/worldData";
import {
  Backpack,
  Clock,
  Coins,
  Compass,
  Droplets,
  Flame,
  Heart,
  Map,
  PackageMinus,
  RotateCcw,
  ScrollText,
  Store,
  Truck,
  User,
  Utensils,
  Volume2,
  VolumeX,
  Wheat,
  Zap,
} from "lucide-react";

const SAVE_STORAGE_KEY = "merchant_route_save_v1";

function getWeaponSoundCategory(weaponId: WeaponId): WeaponSoundCategory {
  switch (weaponId) {
    case "rusty_machete":
    case "cavalry_saber":
    case "sledgehammer":
      return "melee";
    case "derringer_22":
      return "pistol";
    case "revolver_38":
    case "peacemaker_45":
      return "revolver";
    case "coach_shotgun_12g":
    case "pump_shotgun_12g":
      return "shotgun";
    case "grease_smg_9mm":
      return "smg";
    case "sniper_rifle_762":
      return "sniper";
    case "varmint_rifle_22":
    case "lever_repeater_38":
    case "bolt_rifle_308":
    case "carbine_556":
      return "rifle";
  }
}

export default function MerchantRouteGamePage() {
  const [state, setState] = useState<GameState>(() => createInitialGameState());
  const [activeTab, setActiveTab] = useState<"map" | "town" | "character">(
    "map"
  );
  const [selectedSettlement, setSelectedSettlement] =
    useState<SettlementId>("dust_creek");
  const [isHydrated, setIsHydrated] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Load saved game on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GameState;
        if (parsed && parsed.attributes && parsed.townStocks) {
          setState(parsed);
          if (parsed.currentSettlement) {
            setSelectedSettlement(parsed.currentSettlement);
          }
        }
      }
    } catch {
      // Ignore malformed storage
    }
    setIsMuted(soundEngine.isMuted());
    setIsHydrated(true);
  }, []);

  const handleToggleMute = () => {
    const nextMuted = soundEngine.toggleMute();
    setIsMuted(nextMuted);
  };

  // Auto-save whenever state changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [state, isHydrated]);

  // Real-time travel loop (ticks every 900ms while traveling and not paused/in encounter)
  useEffect(() => {
    if (
      !state.travelState ||
      state.travelState.isPaused ||
      state.pendingEncounter ||
      state.combatState
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setState((prev) => {
        if (
          !prev.travelState ||
          prev.travelState.isPaused ||
          prev.pendingEncounter ||
          prev.combatState
        ) {
          return prev;
        }

        const speedInfo = getCaravanSpeedBreakdown(
          prev,
          prev.travelState.terrain
        );
        // Each tick = 1 hour of wasteland travel
        const kmThisHour = speedInfo.effectiveSpeedKmh;
        const newDistance = Math.min(
          prev.travelState.totalDistanceKm,
          prev.travelState.distanceCoveredKm + kmThisHour
        );

        const nextInventory: Partial<Record<ItemId, number>> = {
          ...prev.inventory,
        };
        const transportDef = TRANSPORTS[prev.transport];
        const logs = [...prev.journalLogs];

        // Play procedural travel tick sound
        soundEngine.playTravelTick(transportDef.propulsion);

        // Consume Gasoline if driving a motor vehicle
        if (transportDef.propulsion === "motor" && kmThisHour > 2.5) {
          const fuelBurn =
            (kmThisHour / 10) * transportDef.fuelLitersPer10Km;
          const currentGas = nextInventory.gasoline ?? 0;
          if (fuelBurn >= 0.4 && currentGas > 0) {
            nextInventory.gasoline = Math.max(0, currentGas - 1);
          }
        }

        let nextHour = prev.hour + 1;
        let nextDay = prev.day;
        let nextHp = prev.hp;
        let nextCash = prev.cash;

        // Every 8 hours of travel, consume a meal/water/forage ration
        if (nextHour % 8 === 0) {
          const crewCount = 1 + prev.hiredMercenaries.length;
          const waterNeeded =
            crewCount +
            ( prev.travelState.terrain === "sand_dunes" ? 2 : 1 ) +
            Math.ceil(transportDef.waterPerDay / 3);
          const foodNeeded = crewCount;
          const forageNeeded = Math.ceil(transportDef.foragePerDay / 3);

          const curWater = nextInventory.water ?? 0;
          if (curWater >= waterNeeded) {
            nextInventory.water = curWater - waterNeeded;
          } else {
            nextInventory.water = 0;
            nextHp = Math.max(10, nextHp - 8);
            logs.unshift(
              `Day ${nextDay}, ${String(nextHour % 24).padStart(
                2,
                "0"
              )}:00 — Dehydration on the trail! Caravan lost -8 HP from lack of Purified Water.`
            );
          }

          const curFood = nextInventory.food_rations ?? 0;
          if (curFood >= foodNeeded) {
            nextInventory.food_rations = curFood - foodNeeded;
          } else {
            nextInventory.food_rations = 0;
            nextHp = Math.max(10, nextHp - 4);
          }

          if (forageNeeded > 0) {
            const curForage = nextInventory.animal_forage ?? 0;
            if (curForage >= forageNeeded) {
              nextInventory.animal_forage = curForage - forageNeeded;
            } else {
              nextInventory.animal_forage = 0;
              logs.unshift(
                `Day ${nextDay} — Your pack animals are hungry for Animal Forage!`
              );
            }
          }
        }

        // Day rollover at 24:00
        let nextMarketEvents = prev.marketEvents;
        if (nextHour >= 24) {
          nextHour -= 24;
          nextDay += 1;

          // Pay mercenary daily wages
          const upkeep = getDailyUpkeepSummary(prev);
          if (upkeep.mercenaryWagesPerDay > 0) {
            nextCash = Math.max(0, nextCash - upkeep.mercenaryWagesPerDay);
            logs.unshift(
              `Day ${nextDay}, 00:00 — Paid $${upkeep.mercenaryWagesPerDay} in daily wages to your hired mercenary escort.`
            );
          }

          // Decrement market event timers
          nextMarketEvents = prev.marketEvents.map((evt) => ({
            ...evt,
            daysRemaining: Math.max(1, evt.daysRemaining - 1),
          }));
        }

        // Check if arrived at destination settlement
        if (newDistance >= prev.travelState.totalDistanceKm) {
          const destId = prev.travelState.to;
          const destSettlement = SETTLEMENTS[destId];
          let arrivalLog = `Day ${nextDay}, ${String(nextHour).padStart(
            2,
            "0"
          )}:00 — Arrived safely at ${destSettlement.name} (${
            destSettlement.tier === "major_city"
              ? "US Metropolis"
              : "Frontier Settlement"
          }).`;

          // Contraband check at major city gates
          const moonshineQty = nextInventory.moonshine ?? 0;
          if (destSettlement.strictContrabandCheck && moonshineQty > 0) {
            const bluffRoll =
              Math.random() * 100 + prev.attributes.charisma * 7;
            if (bluffRoll < 62) {
              nextInventory.moonshine = 0;
              const fine = Math.min(nextCash, 120);
              nextCash -= fine;
              arrivalLog += ` ⚠️ City Gate Constables discovered your ${moonshineQty}x Canyon Moonshine contraband and fined you $${fine}!`;
            } else {
              arrivalLog += ` 🎩 Your silver tongue (Charisma ${prev.attributes.charisma}) talked the gate inspectors into overlooking your ${moonshineQty}x Canyon Moonshine!`;
            }
          }

          logs.unshift(arrivalLog);

          return {
            ...prev,
            cash: nextCash,
            hp: nextHp,
            day: nextDay,
            hour: nextHour,
            currentSettlement: destId,
            lastVisitedSettlement: destId,
            inventory: nextInventory,
            marketEvents: nextMarketEvents,
            travelState: null,
            journalLogs: logs.slice(0, 40),
          };
        }

        // Random Road Encounter Check during travel
        const route = ROUTES.find((r) => r.id === prev.travelState?.routeId);
        const perceptionAvoidBonus = prev.attributes.perception * 0.012;
        const encounterProbability = Math.max(
          0.06,
          0.11 + (route?.dangerLevel ?? 1) * 0.045 - perceptionAvoidBonus
        );

        if (route && Math.random() < encounterProbability) {
          const encounter = generateRoadEncounter(prev, route);
          soundEngine.playEncounterAlert();
          logs.unshift(
            `Day ${nextDay}, ${String(nextHour).padStart(
              2,
              "0"
            )}:00 — ⚠️ Road confrontation on ${route.routeLabel}: ${
              encounter.title
            }!`
          );
          return {
            ...prev,
            cash: nextCash,
            hp: nextHp,
            day: nextDay,
            hour: nextHour,
            inventory: nextInventory,
            marketEvents: nextMarketEvents,
            travelState: {
              ...prev.travelState,
              distanceCoveredKm: newDistance,
            },
            pendingEncounter: encounter,
            journalLogs: logs.slice(0, 40),
          };
        }

        return {
          ...prev,
          cash: nextCash,
          hp: nextHp,
          day: nextDay,
          hour: nextHour,
          inventory: nextInventory,
          marketEvents: nextMarketEvents,
          travelState: {
            ...prev.travelState,
            distanceCoveredKm: newDistance,
          },
          journalLogs: logs.slice(0, 40),
        };
      });
    }, 900);

    return () => window.clearInterval(timer);
  }, [
    state.travelState,
    state.pendingEncounter,
    state.combatState,
  ]);

  // Actions
  const handleSpendAttributePoint = (attr: keyof CharacterAttributes) => {
    setState((prev) => {
      if (prev.unspentAttributePoints <= 0) return prev;
      const nextAttrs: CharacterAttributes = {
        ...prev.attributes,
        [attr]: prev.attributes[attr] + 1,
      };
      const nextMaxHp = getMaxHp(nextAttrs);
      const hpGain = attr === "grit" ? 12 : 0;
      return {
        ...prev,
        attributes: nextAttrs,
        unspentAttributePoints: prev.unspentAttributePoints - 1,
        maxHp: nextMaxHp,
        hp: Math.min(nextMaxHp, prev.hp + hpGain),
        journalLogs: [
          `Upgraded ${attr.toUpperCase()} to ${nextAttrs[attr]}!`,
          ...prev.journalLogs,
        ],
      };
    });
  };

  const handleStartTravel = (targetId: SettlementId) => {
    const origin = state.currentSettlement ?? state.lastVisitedSettlement;
    const route = getRouteBetween(origin, targetId);
    if (!route) return;

    setState((prev) => ({
      ...prev,
      currentSettlement: null,
      travelState: {
        routeId: route.id,
        from: origin,
        to: targetId,
        totalDistanceKm: route.distanceKm,
        distanceCoveredKm: 0,
        terrain: route.terrain,
        isPaused: false,
      },
      journalLogs: [
        `Day ${prev.day}, ${String(prev.hour).padStart(
          2,
          "0"
        )}:00 — Departed ${SETTLEMENTS[origin].name} bound for ${
          SETTLEMENTS[targetId].name
        } along ${route.routeLabel} (${route.distanceKm} km).`,
        ...prev.journalLogs,
      ],
    }));
    setActiveTab("map");
  };

  const handleTogglePauseTravel = () => {
    setState((prev) => {
      if (!prev.travelState) return prev;
      return {
        ...prev,
        travelState: {
          ...prev.travelState,
          isPaused: !prev.travelState.isPaused,
        },
      };
    });
  };

  const handleTriggerTestEncounter = () => {
    const origin = state.currentSettlement ?? state.lastVisitedSettlement;
    const route =
      ROUTES.find((r) => r.id === state.travelState?.routeId) ??
      ROUTES.find((r) => r.from === origin || r.to === origin) ??
      ROUTES[0];
    const encounter = generateRoadEncounter(state, route);
    soundEngine.playEncounterAlert();
    setState((prev) => ({
      ...prev,
      pendingEncounter: encounter,
    }));
  };

  const handleBuyItem = (itemId: ItemId, qty: number) => {
    const settlementId =
      state.currentSettlement ?? state.lastVisitedSettlement;
    const prices = getMarketPrices(state, settlementId, itemId);
    const totalCost = prices.buyPrice * qty;
    const townAvailable = state.townStocks[settlementId]?.[itemId] ?? 0;

    if (townAvailable < qty || state.cash < totalCost) return;

    soundEngine.playCashSound();
    setState((prev) => ({
      ...prev,
      cash: prev.cash - totalCost,
      inventory: {
        ...prev.inventory,
        [itemId]: (prev.inventory[itemId] ?? 0) + qty,
      },
      townStocks: {
        ...prev.townStocks,
        [settlementId]: {
          ...prev.townStocks[settlementId],
          [itemId]: townAvailable - qty,
        },
      },
      journalLogs: [
        `Bought ${qty}x ${ITEMS[itemId].name} in ${SETTLEMENTS[settlementId].name} for $${totalCost} ($${prices.buyPrice}/unit).`,
        ...prev.journalLogs,
      ],
    }));
  };

  const handleSellItem = (itemId: ItemId, qty: number) => {
    const settlementId =
      state.currentSettlement ?? state.lastVisitedSettlement;
    const playerQty = state.inventory[itemId] ?? 0;
    const actualQty = Math.min(playerQty, qty);
    if (actualQty <= 0) return;

    const prices = getMarketPrices(state, settlementId, itemId);
    const totalRevenue = prices.sellPrice * actualQty;
    const townAvailable = state.townStocks[settlementId]?.[itemId] ?? 0;

    soundEngine.playCashSound();
    setState((prev) => ({
      ...prev,
      cash: prev.cash + totalRevenue,
      inventory: {
        ...prev.inventory,
        [itemId]: playerQty - actualQty,
      },
      townStocks: {
        ...prev.townStocks,
        [settlementId]: {
          ...prev.townStocks[settlementId],
          [itemId]: townAvailable + actualQty,
        },
      },
      journalLogs: [
        `Sold ${actualQty}x ${ITEMS[itemId].name} in ${SETTLEMENTS[settlementId].name} for $${totalRevenue} ($${prices.sellPrice}/unit).`,
        ...prev.journalLogs,
      ],
    }));
  };

  const handleBuyOrSwitchTransport = (transportId: TransportId) => {
    const tr = TRANSPORTS[transportId];
    const isOwned = state.ownedTransports.includes(transportId);

    if (isOwned) {
      soundEngine.playCashSound();
      setState((prev) => ({
        ...prev,
        transport: transportId,
        journalLogs: [
          `Switched active caravan transport to ${tr.name}.`,
          ...prev.journalLogs,
        ],
      }));
      return;
    }

    if (state.cash < tr.price) return;

    soundEngine.playCashSound();
    setState((prev) => ({
      ...prev,
      cash: prev.cash - tr.price,
      transport: transportId,
      ownedTransports: [...prev.ownedTransports, transportId],
      journalLogs: [
        `Purchased new transport: ${tr.name} (${tr.maxCargoKg} kg capacity, ${tr.baseSpeedKmh} km/h) for $${tr.price}!`,
        ...prev.journalLogs,
      ],
    }));
  };

  const handleEquipWeapon = (weaponId: WeaponId) => {
    setState((prev) => ({
      ...prev,
      equippedWeapon: weaponId,
      journalLogs: [
        `Equipped ${ITEMS[weaponId].name} as primary weapon.`,
        ...prev.journalLogs,
      ],
    }));
  };

  const handleBuyRumor = () => {
    if (state.cash < 15) return;
    soundEngine.playCashSound();
    const unknownEvent = state.marketEvents.find(
      (evt) => !state.knownRumorIds.includes(evt.id)
    );

    setState((prev) => {
      if (unknownEvent) {
        return {
          ...prev,
          cash: prev.cash - 15,
          knownRumorIds: [...prev.knownRumorIds, unknownEvent.id],
          journalLogs: [
            `Saloon Rumor Uncovered: ${unknownEvent.title} — ${unknownEvent.description}`,
            ...prev.journalLogs,
          ],
        };
      }
      // Create a fresh dynamic market boom if all initial rumors are known
      const settlementsList: SettlementId[] = [
        "dust_creek",
        "deadwood_gulch",
        "leadville_shaft",
        "blackwater_rig",
        "tombstone_crossing",
        "saint_louis",
        "new_denver",
        "new_chicago",
      ];
      const randomSettlement =
        settlementsList[Math.floor(Math.random() * settlementsList.length)];
      const demandItems = SETTLEMENTS[randomSettlement].demands;
      const targetItem =
        demandItems[Math.floor(Math.random() * demandItems.length)] ??
        "raw_leather";
      const newEvtId = `evt_${Date.now()}`;
      const newEvt = {
        id: newEvtId,
        title: `Sudden Shortage in ${SETTLEMENTS[randomSettlement].name}`,
        description: `Merchants in ${SETTLEMENTS[randomSettlement].name} are paying 2.3x for ${ITEMS[targetItem].name}!`,
        settlementId: randomSettlement,
        affectedItem: targetItem,
        priceMultiplier: 2.3,
        daysRemaining: 7,
      };
      return {
        ...prev,
        cash: prev.cash - 15,
        marketEvents: [newEvt, ...prev.marketEvents],
        knownRumorIds: [newEvtId, ...prev.knownRumorIds],
        journalLogs: [
          `Saloon Telegraph Rumor: ${newEvt.description}`,
          ...prev.journalLogs,
        ],
      };
    });
  };

  const handleRestAtSaloon = () => {
    if (state.cash < 20) return;
    soundEngine.playCashSound();
    setState((prev) => {
      const fullHp = getMaxHp(prev.attributes);
      return {
        ...prev,
        cash: prev.cash - 20,
        hp: fullHp,
        hiredMercenaries: prev.hiredMercenaries.map((m) => ({
          ...m,
          hp: m.maxHp,
        })),
        journalLogs: [
          `Rested at the Saloon clinic. Squad HP fully restored to ${fullHp} HP.`,
          ...prev.journalLogs,
        ],
      };
    });
  };

  const handleHireMercenary = (mercId: string) => {
    const merc = AVAILABLE_MERCENARIES.find((m) => m.id === mercId);
    if (!merc || state.cash < merc.hiringFee) return;
    if (state.hiredMercenaries.some((m) => m.id === mercId)) return;

    soundEngine.playCashSound();
    setState((prev) => ({
      ...prev,
      cash: prev.cash - merc.hiringFee,
      hiredMercenaries: [...prev.hiredMercenaries, { ...merc }],
      journalLogs: [
        `Hired mercenary escort ${merc.name} (${merc.roleTitle}) for $${merc.hiringFee}! They will fight alongside you on the tactical grid.`,
        ...prev.journalLogs,
      ],
    }));
  };

  const handleHuntBountyNow = (bountyId: string) => {
    const bounty = state.bounties.find((b) => b.id === bountyId);
    if (!bounty || bounty.completed) return;
    const route =
      ROUTES.find((r) => r.id === bounty.routeId) ?? ROUTES[0];

    const encounter = generateRoadEncounter(
      {
        ...state,
        bounties: [bounty],
      },
      route
    );
    // Force the bounty target encounter
    encounter.isBountyTarget = true;
    encounter.bountyId = bounty.id;
    encounter.title = `Sheriff Bounty Hunt: ${bounty.bossName}`;
    encounter.enemyGroupName = bounty.gangName;

    soundEngine.playEncounterAlert();
    setState((prev) => ({
      ...prev,
      pendingEncounter: encounter,
    }));
  };

  const handleJettisonItem = (itemId: ItemId, qty: number) => {
    setState((prev) => {
      const cur = prev.inventory[itemId] ?? 0;
      if (cur <= 0) return prev;
      const dumped = Math.min(cur, qty);
      return {
        ...prev,
        inventory: {
          ...prev.inventory,
          [itemId]: cur - dumped,
        },
        journalLogs: [
          `Jettisoned ${dumped}x ${ITEMS[itemId].name} (-${
            dumped * ITEMS[itemId].weightKg
          } kg) on the road to lighten the caravan!`,
          ...prev.journalLogs,
        ],
      };
    });
  };

  // Pre-Combat Encounter Handlers
  const handleStartTacticalCombat = () => {
    if (!state.pendingEncounter) return;
    const combat = initializeTacticalCombat(state, state.pendingEncounter);
    setState((prev) => ({
      ...prev,
      pendingEncounter: null,
      combatState: combat,
    }));
  };

  const handleAttemptFlee = () => {
    if (!state.pendingEncounter) return;
    const terrain = state.travelState?.terrain ?? "scorched_flats";
    const speedInfo = getCaravanSpeedBreakdown(state, terrain);
    const speedAdvantage =
      speedInfo.effectiveSpeedKmh - state.pendingEncounter.enemySpeedKmh;
    const fleeChance = Math.max(
      15,
      Math.min(
        95,
        Math.round(55 + speedAdvantage * 6 + state.attributes.agility * 3)
      )
    );

    if (Math.random() * 100 <= fleeChance) {
      setState((prev) => ({
        ...prev,
        pendingEncounter: null,
        journalLogs: [
          `🏃 Escaped ${prev.pendingEncounter?.enemyGroupName} on the trail (${speedInfo.effectiveSpeedKmh} km/h caravan speed)!`,
          ...prev.journalLogs,
        ],
      }));
    } else {
      const combat = initializeTacticalCombat(state, state.pendingEncounter);
      combat.combatLog.unshift(
        `⚠️ Escape attempt failed! ${state.pendingEncounter.enemyGroupName} cut off your caravan!`
      );
      setState((prev) => ({
        ...prev,
        pendingEncounter: null,
        combatState: combat,
      }));
    }
  };

  const handlePayToll = () => {
    if (!state.pendingEncounter) return;
    const toll = state.pendingEncounter.tollDemandCash;
    if (state.cash < toll) return;
    soundEngine.playCashSound();
    setState((prev) => ({
      ...prev,
      cash: prev.cash - toll,
      pendingEncounter: null,
      journalLogs: [
        `Paid $${toll} road toll to ${prev.pendingEncounter?.enemyGroupName} to pass without bloodshed.`,
        ...prev.journalLogs,
      ],
    }));
  };

  const handleAttemptIntimidate = () => {
    if (!state.pendingEncounter) return;
    const squadFirepower =
      state.attributes.charisma * 2 +
      state.hiredMercenaries.length * 4 +
      (state.equippedWeapon === "carbine_556" ||
      state.equippedWeapon === "sniper_rifle_762"
        ? 6
        : 4);
    const intimidateChance = Math.max(
      10,
      Math.min(
        95,
        Math.round(
          50 +
            (squadFirepower - state.pendingEncounter.intimidateThreshold) * 6
        )
      )
    );

    if (Math.random() * 100 <= intimidateChance) {
      setState((prev) => ({
        ...prev,
        reputation: prev.reputation + 2,
        pendingEncounter: null,
        journalLogs: [
          `🗣️ Intimidated ${prev.pendingEncounter?.enemyGroupName} into backing down without firing a single round!`,
          ...prev.journalLogs,
        ],
      }));
    } else {
      const combat = initializeTacticalCombat(state, state.pendingEncounter);
      combat.combatLog.unshift(
        `⚠️ Intimidation failed! The raiders opened fire!`
      );
      setState((prev) => ({
        ...prev,
        pendingEncounter: null,
        combatState: combat,
      }));
    }
  };

  // Tactical Combat Grid Actions
  const handleMoveActiveUnit = (targetX: number, targetY: number) => {
    setState((prev) => {
      if (!prev.combatState || prev.combatState.outcome !== "ongoing") {
        return prev;
      }
      const combat = prev.combatState;
      const activeUnit = combat.units.find(
        (u) => u.id === combat.activeUnitId
      );
      if (!activeUnit || !activeUnit.isPlayerTeam) return prev;

      const dist = getManhattanDistance(
        activeUnit.x,
        activeUnit.y,
        targetX,
        targetY
      );
      const tile = combat.tiles[targetY]?.[targetX];
      const effectiveMoveCost =
        (tile?.moveApCost ?? 1) * (activeUnit.crippledLegs ? 2 : 1);
      if (!tile || dist !== 1 || activeUnit.ap < effectiveMoveCost) return prev;

      const occupied = combat.units.some(
        (u) => u.x === targetX && u.y === targetY && u.hp > 0 && !u.isFled
      );
      if (occupied) return prev;

      soundEngine.playStepSound(
        tile.cover === "rocks" || tile.cover === "ruins" ? "rock" : "sand"
      );

      const nextUnits = combat.units.map((u) =>
        u.id === activeUnit.id
          ? {
              ...u,
              x: targetX,
              y: targetY,
              ap: u.ap - effectiveMoveCost,
            }
          : u
      );

      const coverNote =
        tile.defenseBonus > 0 ? ` (Took ${tile.defenseBonus}% Cover!)` : "";

      return {
        ...prev,
        combatState: {
          ...combat,
          units: nextUnits,
          combatLog: [
            `${activeUnit.name} moved to (${targetX},${targetY}) [-${effectiveMoveCost} AP]${coverNote}`,
            ...combat.combatLog,
          ],
        },
      };
    });
  };

  const handleToggleCrouch = () => {
    setState((prev) => {
      if (!prev.combatState || prev.combatState.outcome !== "ongoing") {
        return prev;
      }
      const combat = prev.combatState;
      const activeUnit = combat.units.find(
        (u) => u.id === combat.activeUnitId
      );
      if (!activeUnit || activeUnit.ap < 2) return prev;

      const nextCrouch = !activeUnit.isCrouched;
      soundEngine.playStepSound("sand");

      const nextUnits = combat.units.map((u) =>
        u.id === activeUnit.id
          ? {
              ...u,
              ap: u.ap - 2,
              isCrouched: nextCrouch,
            }
          : u
      );

      return {
        ...prev,
        combatState: {
          ...combat,
          units: nextUnits,
          combatLog: [
            `🦵 ${activeUnit.name} ${
              nextCrouch
                ? "crouched (+15% Ranged Defense, +8% Aim Stability)"
                : "stood up from crouch"
            } [-2 AP].`,
            ...combat.combatLog,
          ],
        },
      };
    });
  };

  const handleAttackTarget = (targetUnitId: string) => {
    setState((prev) => {
      if (!prev.combatState || prev.combatState.outcome !== "ongoing") {
        return prev;
      }
      const combat = prev.combatState;
      const attacker = combat.units.find((u) => u.id === combat.activeUnitId);
      const target = combat.units.find((u) => u.id === targetUnitId);
      if (!attacker || !target || target.hp <= 0) return prev;

      const preview = calculateShotPreview(
        combat,
        attacker,
        target,
        combat.selectedFiringMode
      );
      if (!preview.canAttack) return prev;

      const weaponStats = ITEMS[attacker.weapon].weaponStats!;
      const effectiveMode: FiringMode =
        weaponStats.ammoType === null ? "melee" : combat.selectedFiringMode;

      soundEngine.playWeaponSound(getWeaponSoundCategory(attacker.weapon));

      const nextInventory = { ...prev.inventory };

      // Deduct 1 round from caravan ammo reserve if player unit fires a ranged weapon
      if (weaponStats.ammoType && attacker.isPlayerTeam) {
        const curAmmo = nextInventory[weaponStats.ammoType] ?? 0;
        if (curAmmo > 0) {
          nextInventory[weaponStats.ammoType] = curAmmo - 1;
        }
      }

      const roll = Math.random() * 100;
      const isHit = roll <= preview.hitChancePercent;
      const damage = isHit
        ? Math.floor(
            preview.minDamage +
              Math.random() * (preview.maxDamage - preview.minDamage + 1)
          )
        : 0;

      if (isHit) {
        soundEngine.playHitSound(effectiveMode === "headshot");
      } else {
        soundEngine.playMissRicochet();
      }

      const newLogs = [...combat.combatLog];
      if (isHit) {
        const modeTag =
          effectiveMode === "headshot"
            ? "CRITICAL HEADSHOT 1.9x"
            : effectiveMode === "legshot"
            ? "LEG CRIPPLE SHOT"
            : effectiveMode.toUpperCase();
        newLogs.unshift(
          `💥 ${attacker.name} hit ${target.name} with ${
            ITEMS[attacker.weapon].name
          } (${modeTag}) for ${damage} dmg! (${
            preview.hitChancePercent
          }% chance)`
        );
      } else {
        newLogs.unshift(
          `💨 ${attacker.name} missed ${target.name} (${preview.hitChancePercent}% chance).`
        );
      }

      const nextUnits = combat.units.map((u) => {
        if (u.id === attacker.id) {
          return {
            ...u,
            ap: u.ap - preview.apCost,
            currentMagAmmo:
              weaponStats.ammoType !== null
                ? Math.max(0, u.currentMagAmmo - 1)
                : u.currentMagAmmo,
          };
        }
        if (u.id === target.id && isHit) {
          const updatedHp = Math.max(0, u.hp - damage);
          const updatedMorale = Math.max(0, u.morale - damage * 1.1);
          const newlyCrippled =
            effectiveMode === "legshot" && !u.crippledLegs;
          const updatedMaxAp = newlyCrippled
            ? Math.max(2, u.maxAp - 2)
            : u.maxAp;
          const updatedAp = newlyCrippled
            ? Math.max(0, Math.min(u.ap - 2, updatedMaxAp))
            : u.ap;

          if (newlyCrippled && updatedHp > 0) {
            newLogs.unshift(
              `🦵 ${u.name}'s legs were crippled! (-2 Max AP, 2x movement AP cost)`
            );
          }

          const shouldFlee =
            !u.isPlayerTeam &&
            updatedHp > 0 &&
            updatedHp <= 14 &&
            updatedMorale < 30 &&
            Math.random() < 0.45;
          if (updatedHp === 0) {
            newLogs.unshift(`☠️ ${u.name} was eliminated!`);
          } else if (shouldFlee) {
            newLogs.unshift(
              `🏳️ ${u.name} panicked from low morale and fled the battlefield!`
            );
          }
          return {
            ...u,
            hp: updatedHp,
            ap: updatedAp,
            maxAp: updatedMaxAp,
            morale: updatedMorale,
            isFled: shouldFlee,
            crippledLegs: u.crippledLegs || newlyCrippled,
          };
        }
        return u;
      });

      const remainingEnemies = nextUnits.filter(
        (u) => !u.isPlayerTeam && u.hp > 0 && !u.isFled
      );

      const outcome: CombatState["outcome"] =
        remainingEnemies.length === 0 ? "victory" : "ongoing";

      if (outcome === "victory") {
        soundEngine.playVictorySting();
        newLogs.unshift(
          `🏆 All hostiles neutralized! Click 'Collect Salvage & Return to Map' to claim your loot.`
        );
      }

      return {
        ...prev,
        inventory: nextInventory,
        combatState: {
          ...combat,
          units: nextUnits,
          combatLog: newLogs,
          outcome,
        },
      };
    });
  };

  const handleSetFiringMode = (mode: FiringMode) => {
    setState((prev) => {
      if (!prev.combatState) return prev;
      return {
        ...prev,
        combatState: {
          ...prev.combatState,
          selectedFiringMode: mode,
        },
      };
    });
  };

  const handleReloadWeapon = () => {
    setState((prev) => {
      if (!prev.combatState) return prev;
      const combat = prev.combatState;
      const activeUnit = combat.units.find(
        (u) => u.id === combat.activeUnitId
      );
      if (!activeUnit) return prev;
      const weaponStats = ITEMS[activeUnit.weapon].weaponStats!;
      if (
        !weaponStats.ammoType ||
        activeUnit.ap < weaponStats.reloadAp ||
        (prev.inventory[weaponStats.ammoType] ?? 0) <= 0
      ) {
        return prev;
      }

      soundEngine.playReloadSound();

      const nextUnits = combat.units.map((u) =>
        u.id === activeUnit.id
          ? {
              ...u,
              ap: u.ap - weaponStats.reloadAp,
              currentMagAmmo: weaponStats.magazineSize,
            }
          : u
      );

      return {
        ...prev,
        combatState: {
          ...combat,
          units: nextUnits,
          combatLog: [
            `🔄 ${activeUnit.name} reloaded ${ITEMS[activeUnit.weapon].name} [-${
              weaponStats.reloadAp
            } AP].`,
            ...combat.combatLog,
          ],
        },
      };
    });
  };

  const handleUseFieldBandage = () => {
    setState((prev) => {
      if (!prev.combatState) return prev;
      const bandages = prev.inventory.field_bandage ?? 0;
      if (bandages <= 0) return prev;

      const combat = prev.combatState;
      const activeUnit = combat.units.find(
        (u) => u.id === combat.activeUnitId
      );
      if (!activeUnit || activeUnit.ap < 3) return prev;

      const nextUnits = combat.units.map((u) =>
        u.id === activeUnit.id
          ? {
              ...u,
              ap: u.ap - 3,
              hp: Math.min(u.maxHp, u.hp + 30),
            }
          : u
      );

      return {
        ...prev,
        inventory: {
          ...prev.inventory,
          field_bandage: bandages - 1,
        },
        combatState: {
          ...combat,
          units: nextUnits,
          combatLog: [
            `🩹 ${activeUnit.name} applied a Sterile Field Bandage (+30 HP) [-3 AP].`,
            ...combat.combatLog,
          ],
        },
      };
    });
  };

  const handleSwitchCombatWeapon = (weaponId: WeaponId) => {
    setState((prev) => {
      if (!prev.combatState) return prev;
      const combat = prev.combatState;
      const activeUnit = combat.units.find(
        (u) => u.id === combat.activeUnitId
      );
      if (!activeUnit || activeUnit.ap < 1) return prev;
      const newStats = ITEMS[weaponId].weaponStats!;

      const nextUnits = combat.units.map((u) =>
        u.id === activeUnit.id
          ? {
              ...u,
              ap: u.ap - 1,
              weapon: weaponId,
              currentMagAmmo: newStats.magazineSize,
            }
          : u
      );

      return {
        ...prev,
        equippedWeapon: weaponId,
        combatState: {
          ...combat,
          units: nextUnits,
          selectedFiringMode:
            newStats.ammoType === null ? "melee" : "snap",
          combatLog: [
            `🔧 ${activeUnit.name} switched weapon to ${ITEMS[weaponId].name} [-1 AP].`,
            ...combat.combatLog,
          ],
        },
      };
    });
  };

  const handleEndPlayerUnitTurn = () => {
    setState((prev) => {
      if (!prev.combatState || prev.combatState.outcome !== "ongoing") {
        return prev;
      }
      const combat = prev.combatState;
      const playerUnits = combat.units.filter(
        (u) => u.isPlayerTeam && u.hp > 0
      );
      const currentIdx = playerUnits.findIndex(
        (u) => u.id === combat.activeUnitId
      );

      // If another player/mercenary unit hasn't acted yet in this round, switch to them
      if (currentIdx >= 0 && currentIdx + 1 < playerUnits.length) {
        const nextPlayerUnit = playerUnits[currentIdx + 1];
        return {
          ...prev,
          combatState: {
            ...combat,
            activeUnitId: nextPlayerUnit.id,
            selectedFiringMode:
              ITEMS[nextPlayerUnit.weapon].weaponStats?.ammoType === null
                ? "melee"
                : "snap",
            combatLog: [
              `➡️ Turn passed to ${nextPlayerUnit.name} (${nextPlayerUnit.ap} AP).`,
              ...combat.combatLog,
            ],
          },
        };
      }

      // Otherwise execute Enemy AI Turn for all surviving enemies, then start next round!
      let workingUnits = combat.units.map((u) => ({ ...u }));
      const newLogs = [...combat.combatLog];

      const enemyUnits = workingUnits.filter(
        (u) => !u.isPlayerTeam && u.hp > 0 && !u.isFled
      );

      for (const enemy of enemyUnits) {
        let apRemaining = enemy.maxAp;
        const weaponStats = ITEMS[enemy.weapon].weaponStats!;
        const stepApCost = enemy.crippledLegs ? 2 : 1;

        // Find closest living player unit
        const livingTargets = workingUnits.filter(
          (u) => u.isPlayerTeam && u.hp > 0
        );
        if (livingTargets.length === 0) break;

        livingTargets.sort(
          (a, b) =>
            getManhattanDistance(enemy.x, enemy.y, a.x, a.y) -
            getManhattanDistance(enemy.x, enemy.y, b.x, b.y)
        );
        const primaryTarget = livingTargets[0];

        // Move toward optimal range if needed
        while (
          apRemaining >= stepApCost &&
          getManhattanDistance(
            enemy.x,
            enemy.y,
            primaryTarget.x,
            primaryTarget.y
          ) > weaponStats.optimalRangeTiles
        ) {
          const dx = Math.sign(primaryTarget.x - enemy.x);
          const dy = Math.sign(primaryTarget.y - enemy.y);
          const stepX = dx !== 0 ? enemy.x + dx : enemy.x;
          const stepY = dx === 0 && dy !== 0 ? enemy.y + dy : enemy.y;

          const occupied = workingUnits.some(
            (u) => u.x === stepX && u.y === stepY && u.hp > 0 && !u.isFled
          );
          if (occupied) break;

          enemy.x = stepX;
          enemy.y = stepY;
          apRemaining -= stepApCost;
        }

        // Attack if in max range and has AP
        const distNow = getManhattanDistance(
          enemy.x,
          enemy.y,
          primaryTarget.x,
          primaryTarget.y
        );
        if (
          distNow <= weaponStats.maxRangeTiles &&
          apRemaining >= weaponStats.snapShotAp
        ) {
          apRemaining -= weaponStats.snapShotAp;
          soundEngine.playWeaponSound(getWeaponSoundCategory(enemy.weapon));

          const targetTile =
            combat.tiles[primaryTarget.y]?.[primaryTarget.x];
          const coverPenalty =
            weaponStats.ammoType !== null
              ? (targetTile?.defenseBonus ?? 0) +
                (primaryTarget.isCrouched ? 15 : 0)
              : 0;
          const hitChance = Math.max(
            12,
            Math.min(88, enemy.accuracy - coverPenalty)
          );

          if (Math.random() * 100 <= hitChance) {
            soundEngine.playHitSound(false);
            const dmg = Math.floor(
              weaponStats.minDamage +
                Math.random() *
                  (weaponStats.maxDamage - weaponStats.minDamage + 1)
            );
            primaryTarget.hp = Math.max(0, primaryTarget.hp - dmg);
            newLogs.unshift(
              `🔻 ${enemy.name} attacked ${primaryTarget.name} for ${dmg} dmg! (Cover/Stance reduced hit by ${coverPenalty}%)`
            );
          } else {
            soundEngine.playMissRicochet();
            newLogs.unshift(
              `🛡️ ${enemy.name} fired at ${primaryTarget.name} but missed!`
            );
          }
        }
      }

      const mainPlayer = workingUnits.find((u) => u.isMainCharacter);
      const isDefeat = !mainPlayer || mainPlayer.hp <= 0;

      // Refresh AP for all units for the next round
      workingUnits = workingUnits.map((u) => ({
        ...u,
        ap: u.maxAp,
      }));

      const firstLivingPlayer =
        workingUnits.find((u) => u.isPlayerTeam && u.hp > 0) ??
        workingUnits[0];

      return {
        ...prev,
        combatState: {
          ...combat,
          units: workingUnits,
          activeUnitId: firstLivingPlayer.id,
          roundNumber: combat.roundNumber + 1,
          combatLog: [
            `⚔️ Round ${combat.roundNumber + 1} — Player Squad Turn!`,
            ...newLogs,
          ].slice(0, 35),
          outcome: isDefeat ? "defeat" : combat.outcome,
        },
      };
    });
  };

  const handleFinishCombat = () => {
    setState((prev) => {
      if (!prev.combatState) return prev;
      const combat = prev.combatState;
      const mainUnit = combat.units.find((u) => u.isMainCharacter);
      const nextInventory = { ...prev.inventory };
      const logs = [...prev.journalLogs];

      if (combat.outcome === "victory") {
        // Add loot items
        for (const [k, qty] of Object.entries(
          combat.encounter.lootReward.items
        )) {
          const itemId = k as ItemId;
          nextInventory[itemId] =
            (nextInventory[itemId] ?? 0) + (qty ?? 0);
        }

        let cashGain = combat.encounter.lootReward.cash;
        let nextBounties = prev.bounties;

        if (
          combat.encounter.isBountyTarget &&
          combat.encounter.bountyId
        ) {
          const matchingBounty = prev.bounties.find(
            (b) => b.id === combat.encounter.bountyId
          );
          if (matchingBounty && !matchingBounty.completed) {
            cashGain += matchingBounty.rewardCash;
            nextBounties = prev.bounties.map((b) =>
              b.id === matchingBounty.id ? { ...b, completed: true } : b
            );
            logs.unshift(
              `★ SHERIFF BOUNTY COMPLETED: Eliminated ${matchingBounty.bossName} and earned +$${matchingBounty.rewardCash} reward!`
            );
          }
        }

        logs.unshift(
          `🏆 Won tactical battle against ${combat.encounter.enemyGroupName}! Looted $${combat.encounter.lootReward.cash} and battlefield supplies.`
        );

        return {
          ...prev,
          hp: Math.max(15, mainUnit?.hp ?? prev.hp),
          cash: prev.cash + cashGain,
          reputation: prev.reputation + 5,
          inventory: nextInventory,
          bounties: nextBounties,
          combatState: null,
          journalLogs: logs,
        };
      }

      // Defeat recovery
      const lostCash = Math.round(prev.cash * 0.15);
      logs.unshift(
        `⚠️ Defeated by ${combat.encounter.enemyGroupName}. Lost $${lostCash}, but recovered with 35 HP.`
      );
      return {
        ...prev,
        hp: 35,
        cash: Math.max(0, prev.cash - lostCash),
        combatState: null,
        journalLogs: logs,
      };
    });
  };

  const handleResetGame = () => {
    const fresh = createInitialGameState();
    setState(fresh);
    setSelectedSettlement("dust_creek");
    setActiveTab("map");
    try {
      window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // ignore
    }
  };

  // Telemetry values
  const currentWeight = getCurrentCargoWeightKg(state.inventory);
  const maxCapacity = getMaxCargoCapacityKg(state);
  const speedInfo = getCaravanSpeedBreakdown(
    state,
    state.travelState?.terrain ?? "scorched_flats"
  );
  const upkeep = getDailyUpkeepSummary(state);
  const activeSettlementForHub =
    state.currentSettlement ?? state.lastVisitedSettlement;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      {/* TOP PERSISTENT CARAVAN TELEMETRY BAR */}
      <header className="sticky top-0 z-30 border-b border-amber-900/60 bg-stone-900/95 backdrop-blur-md px-4 py-2.5 shadow-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          {/* Brand Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/70 bg-amber-950/80 text-amber-400 font-bold shadow">
              MR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-wide text-amber-100 uppercase">
                  Merchant Route
                </h1>
                <span className="rounded bg-amber-950 border border-amber-700/60 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  WASTELAND CARAVAN RPG
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                {state.currentSettlement
                  ? `Docked at ${SETTLEMENTS[state.currentSettlement].name}`
                  : state.travelState
                  ? `On Route: ${
                      SETTLEMENTS[state.travelState.from].name
                    } → ${SETTLEMENTS[state.travelState.to].name}`
                  : "Wasteland Frontier"}
              </p>
            </div>
          </div>

          {/* Key Survival & Economy Metrics */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-800/60 bg-emerald-950/50 px-2.5 py-1.5">
              <Coins className="h-4 w-4 text-emerald-400" />
              <span className="font-mono font-bold text-emerald-200">
                ${state.cash}
              </span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-red-800/60 bg-red-950/40 px-2.5 py-1.5">
              <Heart className="h-4 w-4 text-red-400" />
              <span className="font-mono font-bold text-red-200">
                {state.hp}/{getMaxHp(state.attributes)} HP
              </span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-amber-800/60 bg-amber-950/40 px-2.5 py-1.5">
              <Zap className="h-4 w-4 text-amber-400" />
              <span className="font-mono font-bold text-amber-200">
                {getMaxAp(state.attributes)} AP
              </span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1.5">
              <Truck className="h-4 w-4 text-amber-400" />
              <span className="font-semibold text-stone-200">
                {TRANSPORTS[state.transport].name} ({speedInfo.effectiveSpeedKmh}{" "}
                km/h)
              </span>
            </div>

            <div
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${
                currentWeight > maxCapacity
                  ? "border-red-600 bg-red-950/60 text-red-200"
                  : "border-stone-700 bg-stone-950 text-stone-200"
              }`}
            >
              <Backpack className="h-4 w-4 text-amber-400" />
              <span className="font-mono font-bold">
                {currentWeight}/{maxCapacity} kg
              </span>
            </div>

            {/* Supplies: Water, Food, Forage, Gasoline */}
            <div className="flex items-center gap-2.5 rounded-lg border border-stone-700 bg-stone-950 px-3 py-1.5">
              <span
                title="Purified Water"
                className="flex items-center gap-1 text-sky-300 font-mono"
              >
                <Droplets className="h-3.5 w-3.5" />
                {state.inventory.water ?? 0}L
              </span>
              <span
                title="Food Rations"
                className="flex items-center gap-1 text-amber-200 font-mono"
              >
                <Utensils className="h-3.5 w-3.5" />
                {state.inventory.food_rations ?? 0}
              </span>
              <span
                title="Animal Forage"
                className="flex items-center gap-1 text-emerald-300 font-mono"
              >
                <Wheat className="h-3.5 w-3.5" />
                {state.inventory.animal_forage ?? 0}
              </span>
              <span
                title="Refined Gasoline"
                className="flex items-center gap-1 text-orange-400 font-mono"
              >
                <Flame className="h-3.5 w-3.5" />
                {state.inventory.gasoline ?? 0}L
              </span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1.5 text-stone-300 font-mono">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              Day {state.day}, {String(state.hour).padStart(2, "0")}:00
            </div>

            <button
              type="button"
              onClick={handleToggleMute}
              title={isMuted ? "Unmute Audio" : "Mute Audio"}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${
                isMuted
                  ? "border-red-800/60 bg-red-950/40 text-red-200 hover:bg-red-900/60"
                  : "border-amber-700/60 bg-amber-950/40 text-amber-200 hover:bg-amber-900/60"
              }`}
            >
              {isMuted ? (
                <>
                  <VolumeX className="h-3.5 w-3.5" /> Unmute Audio
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5" /> Mute Audio
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetGame}
              title="Reset to Grandfather's Inheritance"
              className="inline-flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-800 px-2.5 py-1.5 text-xs text-stone-300 hover:bg-stone-700 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> New Run
            </button>
          </div>
        </div>
      </header>

      {/* MAIN NAVIGATION TABS & CONTENT */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("map")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === "map"
                  ? "bg-amber-600 text-stone-950 shadow-lg"
                  : "border border-stone-800 bg-stone-900 text-stone-300 hover:bg-stone-800"
              }`}
            >
              <Map className="h-4 w-4" />
              1. Wasteland Overworld Map
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("town")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === "town"
                  ? "bg-amber-600 text-stone-950 shadow-lg"
                  : "border border-stone-800 bg-stone-900 text-stone-300 hover:bg-stone-800"
              }`}
            >
              <Store className="h-4 w-4" />
              2. Town Hub & Market ({SETTLEMENTS[activeSettlementForHub].name})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("character")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === "character"
                  ? "bg-amber-600 text-stone-950 shadow-lg"
                  : "border border-stone-800 bg-stone-900 text-stone-300 hover:bg-stone-800"
              }`}
            >
              <User className="h-4 w-4" />
              3. Character Attributes & Cargo Manifest
              {state.unspentAttributePoints > 0 && (
                <span className="ml-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-stone-950">
                  +{state.unspentAttributePoints} PTS
                </span>
              )}
            </button>
          </div>

          <div className="text-xs text-stone-400">
            Equipped Weapon:{" "}
            <strong className="text-amber-300">
              {ITEMS[state.equippedWeapon].name}
            </strong>{" "}
            {ITEMS[state.equippedWeapon].weaponStats?.ammoType && (
              <span className="text-sky-300">
                (
                {state.inventory[
                  ITEMS[state.equippedWeapon].weaponStats!.ammoType!
                ] ?? 0}{" "}
                rounds)
              </span>
            )}
          </div>
        </div>

        {/* VIEW 1: OVERWORLD MAP */}
        {activeTab === "map" && (
          <OverworldMapCanvas
            state={state}
            selectedSettlement={selectedSettlement}
            onSelectSettlement={(id) => setSelectedSettlement(id)}
            onStartTravel={handleStartTravel}
            onTogglePauseTravel={handleTogglePauseTravel}
            onTriggerTestEncounter={handleTriggerTestEncounter}
          />
        )}

        {/* VIEW 2: TOWN HUB & MARKET */}
        {activeTab === "town" && (
          <TownHubPanel
            state={state}
            settlementId={activeSettlementForHub}
            onBuyItem={handleBuyItem}
            onSellItem={handleSellItem}
            onBuyOrSwitchTransport={handleBuyOrSwitchTransport}
            onEquipWeapon={handleEquipWeapon}
            onBuyRumor={handleBuyRumor}
            onRestAtSaloon={handleRestAtSaloon}
            onHireMercenary={handleHireMercenary}
            onHuntBountyNow={handleHuntBountyNow}
          />
        )}

        {/* VIEW 3: CHARACTER ATTRIBUTES & CARGO MANIFEST */}
        {activeTab === "character" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* RPG Attributes Sheet */}
            <div className="rounded-xl border border-amber-900/50 bg-stone-900/95 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-amber-100">
                    Caravan Leader RPG Attributes
                  </h2>
                  <p className="text-xs text-stone-400">
                    Attributes govern your Action Points (AP), accuracy, hit
                    points, carry weight, and market charisma.
                  </p>
                </div>
                {state.unspentAttributePoints > 0 && (
                  <span className="rounded-lg bg-emerald-950 border border-emerald-500/70 px-3 py-1 text-xs font-bold text-emerald-300">
                    {state.unspentAttributePoints} Unspent Points Available
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {(
                  [
                    [
                      "grit",
                      "Grit (Endurance & Strength)",
                      `Max HP: ${getMaxHp(state.attributes)} | Personal Carry Bonus: +${
                        state.attributes.grit * 6
                      } kg`,
                    ],
                    [
                      "agility",
                      "Agility (Action Points & Speed)",
                      `Combat AP: ${getMaxAp(
                        state.attributes
                      )} AP/Turn | Trail Speed & Escape Bonus: +${Math.round(
                        state.attributes.agility * 1.5
                      )}%`,
                    ],
                    [
                      "perception",
                      "Perception (Marksman & Spotting)",
                      `Ranged Accuracy Bonus: +${getRangedAccuracyBonus(
                        state.attributes
                      )}% | Early Ambush Detection`,
                    ],
                    [
                      "charisma",
                      "Charisma (Barter & Intimidation)",
                      `Trade Price Advantage: ±${
                        state.attributes.charisma * 2.5
                      }% | Contraband & Raider Bluffing`,
                    ],
                  ] as const
                ).map(([key, title, desc]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950 p-3.5"
                  >
                    <div>
                      <div className="font-bold text-sm text-amber-200">
                        {title}
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5">
                        {desc}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-extrabold text-amber-400">
                        {state.attributes[key]}
                      </span>
                      <button
                        type="button"
                        disabled={state.unspentAttributePoints <= 0}
                        onClick={() => handleSpendAttributePoint(key)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-stone-950 hover:bg-emerald-500 disabled:opacity-30 cursor-pointer"
                      >
                        +1 Point
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Daily Upkeep Summary Box */}
              <div className="rounded-xl border border-stone-800 bg-stone-950/90 p-3.5 text-xs space-y-1.5">
                <h4 className="font-bold text-amber-300 uppercase">
                  Caravan Daily Logistics & Upkeep
                </h4>
                <div className="flex justify-between text-stone-300">
                  <span>Crew Size (You + Hired Mercenaries):</span>
                  <strong>{1 + state.hiredMercenaries.length} Humans</strong>
                </div>
                <div className="flex justify-between text-sky-300">
                  <span>Daily Water Consumption (Crew + Animals):</span>
                  <strong>{upkeep.totalWaterPerDay} L / day</strong>
                </div>
                <div className="flex justify-between text-emerald-300">
                  <span>Daily Animal Forage Consumption:</span>
                  <strong>{upkeep.animalForagePerDay} units / day</strong>
                </div>
                <div className="flex justify-between text-amber-300">
                  <span>Motor Fuel Burn Rate:</span>
                  <strong>{upkeep.fuelPer10Km} L / 10 km</strong>
                </div>
                <div className="flex justify-between text-purple-300">
                  <span>Mercenary Escort Daily Wages:</span>
                  <strong>${upkeep.mercenaryWagesPerDay} / day</strong>
                </div>
              </div>
            </div>

            {/* Cargo Manifest & Jettison Controls */}
            <div className="rounded-xl border border-amber-900/50 bg-stone-900/95 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-amber-100">
                      Caravan Cargo Manifest & Equipment
                    </h2>
                    <p className="text-xs text-stone-400">
                      Manage weight to keep your caravan moving fast. You can
                      equip weapons or jettison heavy items here.
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-300">
                    {currentWeight} / {maxCapacity} kg ({speedInfo.statusLabel})
                  </span>
                </div>

                <div className="mt-3 divide-y divide-stone-800 max-h-96 overflow-y-auto">
                  {Object.entries(state.inventory)
                    .filter(([, qty]) => (qty ?? 0) > 0)
                    .map(([key, qty]) => {
                      const itemId = key as ItemId;
                      const item = ITEMS[itemId];
                      const count = qty ?? 0;
                      const totalItemWeight =
                        Math.round(count * item.weightKg * 10) / 10;

                      return (
                        <div
                          key={itemId}
                          className="flex items-center justify-between py-2.5 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-100">
                                { count }x { item.name }
                              </span>
                              <span className="text-stone-400">
                                ({totalItemWeight} kg total)
                              </span>
                              {state.equippedWeapon === itemId && (
                                <span className="rounded bg-amber-900/80 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                                  EQUIPPED
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-500">
                              {item.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {item.category === "weapon" &&
                              state.equippedWeapon !== itemId && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEquipWeapon(itemId as WeaponId)
                                  }
                                  className="rounded bg-sky-700 px-2.5 py-1 font-bold text-white hover:bg-sky-600 cursor-pointer"
                                >
                                  Equip
                                </button>
                              )}

                            <button
                              type="button"
                              onClick={() => handleJettisonItem(itemId, 1)}
                              className="inline-flex items-center gap-1 rounded border border-red-800/60 bg-red-950/40 px-2.5 py-1 text-red-300 hover:bg-red-900/60 cursor-pointer"
                            >
                              <PackageMinus className="h-3 w-3" /> Dump 1
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-amber-800/40 bg-amber-950/20 p-3 text-xs text-amber-200">
                <Compass className="inline h-4 w-4 mr-1 text-amber-400" />
                <strong>Grandfather&apos;s Advice:</strong> Keep your cargo load
                under 70% of max capacity for optimal trail speed. Once you
                accumulate $1,650, visit Deadwood Gulch to buy a Prairie Wagon +
                Draft Horse, or head east to Saint Louis and New Denver for
                Gasoline-powered Motorcycles and V8 Trucks!
              </div>
            </div>
          </div>
        )}

        {/* PERSISTENT WASTELAND TRAIL JOURNAL */}
        <section className="rounded-xl border border-stone-800 bg-stone-900/90 p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
            <ScrollText className="h-4 w-4" />
            Wasteland Caravan Ledger & Trail Log
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1 text-xs font-mono text-stone-300">
            {state.journalLogs.map((log, i) => (
              <div
                key={i}
                className="rounded bg-stone-950/70 px-2.5 py-1 border-l-2 border-amber-700/60"
              >
                {log}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* PRE-COMBAT ROAD ENCOUNTER MODAL */}
      {state.pendingEncounter && (
        <PreCombatEncounterModal
          state={state}
          encounter={state.pendingEncounter}
          onStartTacticalCombat={handleStartTacticalCombat}
          onAttemptFlee={handleAttemptFlee}
          onPayToll={handlePayToll}
          onAttemptIntimidate={handleAttemptIntimidate}
          onJettisonItem={handleJettisonItem}
        />
      )}

      {/* TOP-DOWN TACTICAL COMBAT MODAL */}
      {state.combatState && (
        <TacticalCombatModal
          state={state}
          combat={state.combatState}
          onMoveActiveUnit={handleMoveActiveUnit}
          onAttackTarget={handleAttackTarget}
          onSetFiringMode={handleSetFiringMode}
          onToggleCrouch={handleToggleCrouch}
          onReloadWeapon={handleReloadWeapon}
          onUseFieldBandage={handleUseFieldBandage}
          onSwitchCombatWeapon={handleSwitchCombatWeapon}
          onEndPlayerUnitTurn={handleEndPlayerUnitTurn}
          onFinishCombat={handleFinishCombat}
        />
      )}
    </div>
  );
}
