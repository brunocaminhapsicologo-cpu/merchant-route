"use client";

import React, { useEffect, useRef, useState } from "react";
import { soundEngine, WeaponSoundCategory } from "@/assets/soundEngine";
import { StrategicWorldMap, TravelScreen } from "@/components/WayfindingPanels";
import { TradeLedger } from "@/components/TradeLedger";
import { advanceExploration, advanceGameTime, scavengeSecretLocation, getNearbySettlement, getTerrainAt, getWorldPosition } from "@/domain/navigationEngine";
import { performEnemyAction } from "@/domain/combatActions";
import { migrateGameState } from "@/domain/saveGame";
import { PreCombatEncounterModal } from "@/components/PreCombatEncounterModal";
import { TacticalCombatModal } from "@/components/TacticalCombatModal";
import { TownScene } from "@/components/TownScene";
import {
  calculateShotPreview,
  findCombatPath,
  generateRoadEncounter,
  getManhattanDistance,
  initializeCombatWithAmmo,
  useCombatConsumable,
} from "@/domain/combatEngine";
import {
  completeContractsAtSettlement,
  repairCaravan,
  getCaravanSpeedBreakdown,
  getCurrentCargoWeightKg,
  getDailyUpkeepSummary,
  getActiveTransportDefinition,
  getMarketPrices,
  getMaxAp,
  getMaxCargoCapacityKg,
  getMaxHp,
  getRangedAccuracyBonus,
} from "@/domain/economyEngine";
import {
  CharacterAttributes,
  CombatState,
  FreightContract,
  PassengerContract,
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
  PackageMinus,
  RotateCcw,
  ScrollText,
  Swords,
  Truck,
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
  const [activeTab, setActiveTab] = useState<"map" | "travel" | "town" | "character">(
    "map"
  );
  const [selectedSettlement, setSelectedSettlement] =
    useState<SettlementId>("dust_creek");
  const [isHydrated, setIsHydrated] = useState(false);
  const [pendingGateInspection, setPendingGateInspection] = useState<{
    settlementId: SettlementId;
    moonshineCount: number;
  } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [travelRate, setTravelRate] = useState(1);
  const [volumes,setVolumes] = useState({effects:.7,ambience:.25});
  const [notice, setNotice] = useState("");
  const [saveStatus, setSaveStatus] = useState("Loading save…");
  const importRef = useRef<HTMLInputElement>(null);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [cargoSubTab, setCargoSubTab] = useState<"manifest" | "ledger">("manifest");
  const enemyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [enemyBusy, setEnemyBusy] = useState(false);
  const [animationBusy, setAnimationBusy] = useState(false);
  const combatBusy = enemyBusy || animationBusy;
  const enemyQueue = useRef<string[]>([]);
  useEffect(() => () => { if (enemyTimer.current) clearTimeout(enemyTimer.current); }, []);

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (state.combatState || state.pendingEncounter || pendingGateInspection) return;

      if (e.key === "1") setActiveTab("map");
      if (e.key === "2") setActiveTab("travel");
      if (e.key === "3" && (state.currentSettlement || state.lastVisitedSettlement)) setActiveTab("town");
      if (e.key === "4") setActiveTab("character");
      if (e.code === "Space") {
        e.preventDefault();
        handleToggleMovement();
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [state.currentSettlement, state.lastVisitedSettlement, state.combatState, state.pendingEncounter, pendingGateInspection, state.exploration?.isMoving, state.exploration?.isPaused]);

  // Load saved game on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
      if (raw) {
        const parsed = migrateGameState(JSON.parse(raw));
        setState(parsed);
        if(parsed.combatState?.outcome==="ongoing" && parsed.combatState.units.some(u=>u.id===parsed.combatState!.activeUnitId&&!u.isPlayerTeam)) {enemyQueue.current=parsed.combatState.units.filter(u=>!u.isPlayerTeam&&u.hp>0&&!u.isFled&&u.ap>0).map(u=>u.id);setEnemyBusy(true);}
        if (parsed.currentSettlement) setSelectedSettlement(parsed.currentSettlement);
        if (!parsed.currentSettlement) setActiveTab("travel");
      }
    } catch {
      try{const raw=window.localStorage.getItem(SAVE_STORAGE_KEY);if(raw)window.localStorage.setItem(SAVE_STORAGE_KEY+"_unreadable_backup",raw);}catch{setSaveStatus("Cannot back up unreadable save — automatic saving is disabled");return;}
      setNotice("The unreadable save was backed up on this device. The saved file could not be read. A new game is available; the previous file has not been deleted.");
    }
    soundEngine.loadPreferences();setVolumes(soundEngine.getVolumes());
    setIsMuted(soundEngine.isMuted());
    setIsHydrated(true);
  }, []);

  useEffect(()=>{
    if(!isHydrated)return;
    soundEngine.startAmbience(state.combatState?"combat":state.currentSettlement?"town":"desert");
    const focus=()=>{if(document.hidden)soundEngine.pauseAudio();else if(!soundEngine.isMuted())soundEngine.unlockAudio();};
    document.addEventListener("visibilitychange",focus);
    return()=>document.removeEventListener("visibilitychange",focus);
  },[isHydrated,state.currentSettlement,!!state.combatState]);
  const handleVolume = (key:"effects"|"ambience",value:number) => {const next={...volumes,[key]:value};setVolumes(next);soundEngine.setVolumes(next.effects,next.ambience);};

  const handleToggleMute = () => {
    const nextMuted = soundEngine.toggleMute();
    setIsMuted(nextMuted);
  };

  // Auto-save whenever state changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(state));
      setSaveStatus("Saved on this device");
    } catch {
      setSaveStatus("Save failed — export a backup before closing");
    }
  }, [state, isHydrated]);

  // One authoritative time/resource calculation drives free compass travel.
  useEffect(() => {
    if (!isHydrated || !state.exploration?.isMoving || state.exploration.isPaused || state.pendingEncounter || state.combatState) return;
    const timer = window.setInterval(() => {
      setState(prev => {
        if (!prev.exploration?.isMoving || prev.exploration.isPaused || prev.pendingEncounter || prev.combatState) return prev;
        const hours = .25 * travelRate;
        const next = advanceExploration(prev, hours);
        if (!next.exploration?.isMoving) return next;
        const position = getWorldPosition(next);
        // Encounters depend on the terrain and actual elapsed time, not render frequency.
        const nearRoute = [...ROUTES].sort((a,b) => {
          const midpoint = (r: typeof a) => ({x:(SETTLEMENTS[r.from].coordinates.x+SETTLEMENTS[r.to].coordinates.x)/2,y:(SETTLEMENTS[r.from].coordinates.y+SETTLEMENTS[r.to].coordinates.y)/2});
          const da=midpoint(a), db=midpoint(b);
          return Math.hypot(position.x-da.x,position.y-da.y)-Math.hypot(position.x-db.x,position.y-db.y);
        })[0];
        const secured = prev.bounties.some(b => b.routeId === nearRoute.id && b.completed);
        const chance = Math.max(.015, .055 + nearRoute.dangerLevel*.018-prev.attributes.perception*.005) * hours * (secured ? .45 : 1);
        if (Math.random() < chance) {
          const encounter = generateRoadEncounter({...next,bounties:next.bounties.filter(b => (next.acceptedBountyIds??[]).includes(b.id))},nearRoute);
          return {...next,pendingEncounter:encounter,journalLogs:[`Road encounter: ${encounter.title}`, ...next.journalLogs].slice(0,60)};
        }
        return next;
      });
    },900);
    return () => window.clearInterval(timer);
  },[isHydrated,state.exploration?.isMoving,state.exploration?.isPaused,state.pendingEncounter,state.combatState,travelRate]);

  useEffect(() => {
    if (state.pendingEncounter) soundEngine.playEncounterAlert();
  },[state.pendingEncounter?.id]);
  useEffect(() => {
    if (!state.exploration?.isMoving || state.pendingEncounter || state.combatState) return;
    soundEngine.playTravelTick(TRANSPORTS[state.transport].propulsion);
  },[state.exploration?.x,state.exploration?.y,state.transport]);

  const handleHeading = (heading: number) => setState(prev => {
    const pos = getWorldPosition(prev);
    return {...prev,exploration:{x:pos.x,y:pos.y,terrain:getTerrainAt(pos),isMoving:false,isPaused:false,distanceTravelledKm:0,...prev.exploration,heading:((heading%360)+360)%360}};
  });
  const handleToggleMovement = () => {
    if (state.pendingEncounter || state.combatState) return;
    if (getActiveTransportDefinition(state).propulsion === "motor" && (state.inventory.gasoline??0)<=0) {setNotice("No gasoline. Refill in town or switch to a non-motor transport before departing.");return;}
    setState(prev => {
      const pos = getWorldPosition(prev);
      const moving = !prev.exploration?.isMoving;
      return {...prev,currentSettlement:moving?null:prev.currentSettlement,travelState:null,exploration:{x:pos.x,y:pos.y,heading:0,terrain:getTerrainAt(pos),distanceTravelledKm:0,...prev.exploration,isMoving:moving,isPaused:false}};
    });
  };
  const finalizeEnterSettlement = (id: SettlementId, inspectionResult?: { seized?: boolean; fine?: number; bribe?: number; surrendered?: boolean }) => {
    setState(prev => {
      const town = SETTLEMENTS[id];
      const inventory = { ...prev.inventory };
      let cash = prev.cash;
      let message = `Entered ${town.name}.`;
      if (inspectionResult?.bribe) {
        cash = Math.max(0, cash - inspectionResult.bribe);
        message += ` Paid $${inspectionResult.bribe} gate bribe.`;
      } else if (inspectionResult?.seized) {
        inventory.moonshine = 0;
        const fine = inspectionResult.fine ?? 0;
        cash = Math.max(0, cash - fine);
        message += ` Gate inspection confiscated moonshine and assessed $${fine} fine.`;
      } else if (inspectionResult?.surrendered) {
        inventory.moonshine = 0;
        message += ` Surrendered moonshine peacefully at gate.`;
      }

      let nextState: GameState = {
        ...prev,
        currentSettlement: id,
        lastVisitedSettlement: id,
        inventory,
        cash,
        exploration: {
          ...prev.exploration!,
          x: town.coordinates.x,
          y: town.coordinates.y,
          isMoving: false,
          isPaused: false,
          terrain: getTerrainAt(town.coordinates),
        },
        journalLogs: [message, ...prev.journalLogs].slice(0, 60),
      };

      const contractResult = completeContractsAtSettlement(nextState, id);
      if (contractResult.completedFreight.length > 0 || contractResult.completedPassengers.length > 0) {
        nextState = contractResult.state;
        setNotice(`Contracts completed at ${town.name}! Payout: $${contractResult.totalPayout}.`);
      }

      return nextState;
    });
    setSelectedSettlement(id);
    setActiveTab("town");
  };

  const handleEnterSettlement = (id: SettlementId) => {
    if (state.exploration?.isMoving || getNearbySettlement(getWorldPosition(state)) !== id) {
      setNotice("Stop near the city gate before entering.");
      return;
    }
    const town = SETTLEMENTS[id];
    const contraband = state.inventory.moonshine ?? 0;
    if (town.strictContrabandCheck && contraband > 0) {
      setPendingGateInspection({ settlementId: id, moonshineCount: contraband });
      return;
    }
    finalizeEnterSettlement(id);
  };

  const handleGateInspectionBluff = () => {
    if (!pendingGateInspection) return;
    const id = pendingGateInspection.settlementId;
    const roll = Math.random() * 100 + state.attributes.charisma * 8;
    if (roll >= 50) {
      setNotice("Bluff Succeeded! The guards believed your cargo was industrial disinfectant.");
      finalizeEnterSettlement(id);
    } else {
      const fine = Math.min(80, state.cash);
      setNotice(`Bluff Failed! The guards confiscated your moonshine and fined you $${fine}.`);
      finalizeEnterSettlement(id, { seized: true, fine });
    }
    setPendingGateInspection(null);
  };

  const handleGateInspectionBribe = () => {
    if (!pendingGateInspection) return;
    const id = pendingGateInspection.settlementId;
    setNotice("Paid $40 bribe. The guard signaled the gatekeeper to let you pass.");
    finalizeEnterSettlement(id, { bribe: 40 });
    setPendingGateInspection(null);
  };

  const handleGateInspectionSurrender = () => {
    if (!pendingGateInspection) return;
    const id = pendingGateInspection.settlementId;
    setNotice("Contraband surrendered peacefully without penalty.");
    finalizeEnterSettlement(id, { surrendered: true });
    setPendingGateInspection(null);
  };

  const handleGateInspectionTurnBack = () => {
    setPendingGateInspection(null);
    setNotice("Turned back outside the city walls. Cargo intact.");
  };

  const handleRepairCaravan = (method: "tools" | "diesel_parts" | "depot") => {
    const res = repairCaravan(state, method);
    if (res.success) {
      setState(res.state);
      setNotice(res.message);
    } else {
      setNotice(res.message);
    }
  };

  const handleAcceptFreightContract = (contract: FreightContract) => {
    if (state.freightContracts?.some(c => c.id === contract.id && c.accepted)) return;
    setState(prev => ({
      ...prev,
      freightContracts: [
        ...(prev.freightContracts ?? []).filter(c => c.id !== contract.id),
        { ...contract, accepted: true },
      ],
      journalLogs: [
        `Accepted freight contract: Deliver ${contract.cargoQuantity}x ${ITEMS[contract.cargoItem].name} to ${SETTLEMENTS[contract.destinationSettlement].name} by Day ${contract.deadlineDay} ($${contract.rewardCash}).`,
        ...prev.journalLogs,
      ].slice(0, 200),
    }));
    setNotice(`Accepted freight delivery for ${SETTLEMENTS[contract.destinationSettlement].name}!`);
  };

  const handleAcceptPassengerContract = (contract: PassengerContract) => {
    if (state.passengerContracts?.some(c => c.id === contract.id && c.accepted)) return;
    setState(prev => ({
      ...prev,
      passengerContracts: [
        ...(prev.passengerContracts ?? []).filter(c => c.id !== contract.id),
        { ...contract, accepted: true },
      ],
      journalLogs: [
        `Accepted passenger escort: Escort ${contract.passengerName} to ${SETTLEMENTS[contract.destinationSettlement].name} by Day ${contract.deadlineDay} ($${contract.rewardCash}).`,
        ...prev.journalLogs,
      ].slice(0, 200),
    }));
    setNotice(`Accepted passenger escort for ${SETTLEMENTS[contract.destinationSettlement].name}!`);
  };

  const handleScavengeSecret = (secretId: string) => {
    const next = scavengeSecretLocation(state, secretId);
    if (next !== state) {
      setState(next);
      setNotice("Secret cache recovered! Check cargo and cash.");
    }
  };

  const handleBuyAdditionalFleetUnit = (transportId: TransportId) => {
    const tr = TRANSPORTS[transportId];
    if (state.cash < tr.price) {
      setNotice(`Insufficient cash to purchase an additional ${tr.name} ($${tr.price}).`);
      return;
    }
    setState(prev => {
      const fleet = { ...(prev.activeFleet ?? {}) };
      fleet[transportId] = (fleet[transportId] ?? (prev.transport === transportId ? 1 : 0)) + 1;
      const activeTransports = Array.from(new Set([...(prev.activeTransports ?? [prev.transport]), transportId]));
      return {
        ...prev,
        cash: prev.cash - tr.price,
        activeFleet: fleet,
        activeTransports,
        journalLogs: [`Purchased additional ${tr.name} for fleet (-$${tr.price}).`, ...prev.journalLogs].slice(0, 200),
      };
    });
    setNotice(`Added another ${tr.name} to active caravan fleet!`);
  };
  const handleCamp = () => {
    if (state.currentSettlement || state.exploration?.isMoving || state.combatState || state.pendingEncounter) return;
    setState(prev => { const next=advanceGameTime(prev,6);return {...next,hp:Math.min(getMaxHp(next.attributes),next.hp+8),journalLogs:["Camped for 6 hours. Supplies consumed; recovered 8 HP.",...next.journalLogs]}; });
  };
  const exportSave = () => {
    const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="merchant-route-save.json";a.click();URL.revokeObjectURL(url);setNotice("Save backup exported.");
  };
  const importSave = async (file?:File) => {
    if(!file)return;
    try{if(file.size>2_000_000)throw new Error("Save is too large");const raw=JSON.parse(await file.text());if(!raw||typeof raw!=="object"||!raw.attributes||!raw.inventory)throw new Error("Not a game save");const next=migrateGameState(raw);window.localStorage.setItem(SAVE_STORAGE_KEY+"_backup",JSON.stringify(state));setState(next);if(next.combatState?.outcome==="ongoing" && next.combatState.units.some(u=>u.id===next.combatState!.activeUnitId&&!u.isPlayerTeam)){enemyQueue.current=next.combatState.units.filter(u=>!u.isPlayerTeam&&u.hp>0&&!u.isFled&&u.ap>0).map(u=>u.id);setEnemyBusy(true);}setActiveTab(next.currentSettlement?"town":"travel");setSelectedSettlement(next.currentSettlement??next.lastVisitedSettlement);setNotice("Save imported. Your previous game was backed up on this device.");}catch{setNotice("Import failed. Select a valid Merchant Route JSON save; your current game was preserved.");}
    if(importRef.current)importRef.current.value="";
  };

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

  const handleBuyItem = (itemId: ItemId, qty: number) => {
    if(!state.currentSettlement || !Number.isSafeInteger(qty) || qty<=0) {setNotice("Enter a town and choose a whole positive quantity.");return;}
    const settlementId=state.currentSettlement;
    const prices=getMarketPrices(state,settlementId,itemId);
    if((state.townStocks[settlementId]?.[itemId]??0)<qty || state.cash<prices.buyPrice*qty){setNotice("Not enough town stock or cash for this purchase.");return;}
    soundEngine.playCashSound();
    setState(prev => {
      const old=prev.inventory[itemId]??0, cost=prices.buyPrice*qty;
      return {...prev,cash:prev.cash-cost,inventory:{...prev.inventory,[itemId]:old+qty},averageCosts:{...prev.averageCosts,[itemId]:((prev.averageCosts?.[itemId]??0)*old+cost)/(old+qty)},tradeLedger:[{itemId,quantity:qty,unitPrice:prices.buyPrice,kind:"buy" as const,day:prev.day,settlementId},...(prev.tradeLedger??[])].slice(0,200),townStocks:{...prev.townStocks,[settlementId]:{...prev.townStocks[settlementId],[itemId]:(prev.townStocks[settlementId][itemId]??0)-qty}},journalLogs:[`Bought ${qty}× ${ITEMS[itemId].name} for $${cost}.`,...prev.journalLogs].slice(0,60)};
    });setNotice(`Purchased ${qty}× ${ITEMS[itemId].name}.`);
  };
  const handleSellItem = (itemId: ItemId, qty: number) => {
    if(!state.currentSettlement || !Number.isSafeInteger(qty) || qty<=0){setNotice("Enter a town and choose a whole positive quantity.");return;}
    const settlementId=state.currentSettlement;
    const amount=Math.min(qty,state.inventory[itemId]??0);
    if(amount<=0){setNotice("You do not carry this item.");return;}
    const price=getMarketPrices(state,settlementId,itemId).sellPrice;
    soundEngine.playCashSound();
    setState(prev=>{
      const remaining=(prev.inventory[itemId]??0)-amount;
      const equipped=remaining===0 && prev.equippedWeapon===itemId;
      const fallback=Object.keys(prev.inventory).find(id=>id!==itemId && ITEMS[id as ItemId]?.category==="weapon" && (prev.inventory[id as ItemId]??0)>0) as WeaponId|undefined;
      if(equipped && !fallback) return {...prev,journalLogs:["Keep at least one weapon for survival.",...prev.journalLogs]};
      return {...prev,cash:prev.cash+price*amount,equippedWeapon:equipped?fallback!:prev.equippedWeapon,inventory:{...prev.inventory,[itemId]:remaining},tradeLedger:[{itemId,quantity:amount,unitPrice:price,kind:"sell" as const,day:prev.day,settlementId,profit:amount*(price-(prev.averageCosts?.[itemId]??0))},...(prev.tradeLedger??[])].slice(0,200),townStocks:{...prev.townStocks,[settlementId]:{...prev.townStocks[settlementId],[itemId]:(prev.townStocks[settlementId][itemId]??0)+amount}},journalLogs:[`Sold ${amount}× ${ITEMS[itemId].name} for $${price*amount}.`,...prev.journalLogs].slice(0,60)};
    });
  };

  const handleBuyOrSwitchTransport = (transportId: TransportId) => {
    if(!state.currentSettlement){setNotice("Enter a town to change transport.");return;}
    const tr = TRANSPORTS[transportId];
    if(!tr.availableInTiers.includes(SETTLEMENTS[state.currentSettlement].tier)){setNotice("This transport is not available here.");return;}
    const isOwned = state.ownedTransports.includes(transportId);

    if (isOwned) {
      soundEngine.playCashSound();
      setState((prev) => ({
        ...prev,
        transport: transportId,activeTransports:[transportId],
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
      transport: transportId,activeTransports:[transportId],
      ownedTransports: [...prev.ownedTransports, transportId],
      journalLogs: [
        `Purchased new transport: ${tr.name} (${tr.maxCargoKg} kg capacity, ${tr.baseSpeedKmh} km/h) for $${tr.price}!`,
        ...prev.journalLogs,
      ],
    }));
  };

  const handleEquipWeapon = (weaponId: WeaponId) => {
    if((state.inventory[weaponId]??0)<=0)return;
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
    if (!state.currentSettlement || state.cash < 15) {setNotice("Rumors cost $15 and require a visit to the saloon.");return;}
    soundEngine.playCashSound();
    const unknownEvent = state.marketEvents.find(
      (evt) => evt.daysRemaining>0 && !state.knownRumorIds.includes(evt.id)
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
    if (!state.currentSettlement || state.cash < 20) {setNotice("Treatment costs $20 and requires a town visit.");return;}
    soundEngine.playCashSound();
    setState((prev) => {
      const rested=advanceGameTime({...prev,cash:prev.cash-20},8);
      const fullHp = getMaxHp(prev.attributes);
      return {
        ...rested,
        cash: rested.cash,operatingCosts:(rested.operatingCosts??0)+20,
        hp: fullHp,
        hiredMercenaries: rested.hiredMercenaries.map((m) => ({
          ...m,
          hp: m.maxHp, crippledLegs:false,
        })),
        journalLogs: [
          `Rested for 8 hours at the town clinic. Squad HP fully restored to ${fullHp} HP.`,
          ...prev.journalLogs,
        ],
      };
    });
  };

  const handleHireMercenary = (mercId: string) => {
    const merc = AVAILABLE_MERCENARIES.find((m) => m.id === mercId);
    if (!merc || !state.currentSettlement || merc.homeSettlement!==state.currentSettlement || state.cash < merc.hiringFee){setNotice("This mercenary must be hired in their home town, with the hiring fee available.");return;}
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
    const bounty=state.bounties.find(b=>b.id===bountyId);
    if(!state.currentSettlement || !bounty || bounty.completed)return;
    if((state.acceptedBountyIds??[]).includes(bountyId)){setNotice("Contract already accepted. Search along its route.");return;}
    setState(prev=>({...prev,acceptedBountyIds:[...(prev.acceptedBountyIds??[]),bountyId],journalLogs:[`Accepted bounty: ${bounty.bossName}. Search the designated trade route.`,...prev.journalLogs]}));
    const route=ROUTES.find(r=>r.id===bounty.routeId);if(route)setSelectedSettlement(route.to);
    setNotice(`Contract accepted: ${bounty.bossName}. Inspect its route on the atlas; the target can be encountered on the road.`);
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
    const initialized = initializeCombatWithAmmo(state, state.pendingEncounter);
    const combat=initialized.combatState!;
    setState(() => ({
      ...initialized,
      pendingEncounter: null,
      combatState: combat,
    }));
  };

  const handleAttemptFlee = () => {
    if (!state.pendingEncounter) return;
    const terrain = state.exploration?.terrain ?? state.travelState?.terrain ?? "scorched_flats";
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
      const initialized = initializeCombatWithAmmo(state, state.pendingEncounter);
      const combat=initialized.combatState!;
      combat.combatLog.unshift(
        `⚠️ Escape attempt failed! ${state.pendingEncounter.enemyGroupName} cut off your caravan!`
      );
      setState(() => ({
        ...initialized,
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
      const initialized = initializeCombatWithAmmo(state, state.pendingEncounter);
      const combat=initialized.combatState!;
      combat.combatLog.unshift(
        `⚠️ Intimidation failed! The raiders opened fire!`
      );
      setState(() => ({
        ...initialized,
        pendingEncounter: null,
        combatState: combat,
      }));
    }
  };

  // Tactical Combat Grid Actions
  const handleMoveActiveUnit = (targetX: number, targetY: number) => {
    if(combatBusy)return;
    setState((prev) => {
      if (!prev.combatState || prev.combatState.outcome !== "ongoing") {
        return prev;
      }
      const combat = prev.combatState;
      const activeUnit = combat.units.find(
        (u) => u.id === combat.activeUnitId
      );
      if (!activeUnit || !activeUnit.isPlayerTeam || activeUnit.hp<=0 || activeUnit.isFled) return prev;

      const dist = getManhattanDistance(
        activeUnit.x,
        activeUnit.y,
        targetX,
        targetY
      );
      const tile = combat.tiles[targetY]?.[targetX];
      const effectiveMoveCost =
        (tile?.moveApCost ?? 1) * (activeUnit.crippledLegs ? 2 : 1);

      if (dist === 1) {
        if (!tile || activeUnit.ap < effectiveMoveCost) return prev;

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
            ].slice(0, 50),
          },
        };
      } else {
        const pathResult = findCombatPath(combat, { x: activeUnit.x, y: activeUnit.y }, { x: targetX, y: targetY }, activeUnit);
        if (!pathResult.path.length) return prev;

        let remainingAp = activeUnit.ap;
        let lastX = activeUnit.x;
        let lastY = activeUnit.y;
        let totalSpent = 0;
        const reachedSteps: Array<{ x: number; y: number }> = [];

        for (const step of pathResult.path) {
          const stepTile = combat.tiles[step.y]?.[step.x];
          const cost = (stepTile?.moveApCost ?? 1) * (activeUnit.crippledLegs ? 2 : 1);
          if (remainingAp >= cost) {
            remainingAp -= cost;
            totalSpent += cost;
            lastX = step.x;
            lastY = step.y;
            reachedSteps.push(step);
          } else {
            break;
          }
        }

        if (!reachedSteps.length) return prev;
        const destTile = combat.tiles[lastY]?.[lastX];
        soundEngine.playStepSound(
          destTile?.cover === "rocks" || destTile?.cover === "ruins" ? "rock" : "sand"
        );

        const nextUnits = combat.units.map((u) =>
          u.id === activeUnit.id
            ? {
                ...u,
                x: lastX,
                y: lastY,
                ap: remainingAp,
              }
            : u
        );

        const coverNote =
          (destTile?.defenseBonus ?? 0) > 0 ? ` (Took ${destTile!.defenseBonus}% Cover!)` : "";

        return {
          ...prev,
          combatState: {
            ...combat,
            units: nextUnits,
            combatLog: [
              `${activeUnit.name} advanced to (${lastX},${lastY}) [${reachedSteps.length} tiles, -${totalSpent} AP]${coverNote}`,
              ...combat.combatLog,
            ].slice(0, 50),
          },
        };
      }
    });
  };

  const handleUseCombatConsumableAction = (itemId: ItemId) => {
    if (combatBusy) return;
    setState((prev) => {
      if (!prev.combatState || prev.combatState.outcome !== "ongoing") return prev;
      const result = useCombatConsumable(prev, prev.combatState.activeUnitId, itemId);
      if (result.success && result.sound === "heal") {
        soundEngine.playMedicalSound();
      }
      return result.state;
    });
  };

  const handleToggleCrouch = () => {
    if(combatBusy)return;
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
    if(combatBusy)return;
    setState((prev) => {
      if (!prev.combatState || prev.combatState.outcome !== "ongoing") {
        return prev;
      }
      const combat = prev.combatState;
      const attacker = combat.units.find((u) => u.id === combat.activeUnitId);
      const target = combat.units.find((u) => u.id === targetUnitId);
      if (!attacker || !attacker.isPlayerTeam || attacker.hp<=0 || attacker.isFled || !target || target.hp <= 0 || target.isFled) return prev;

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
            magazines: {...u.magazines,[u.weapon]:weaponStats.ammoType ? Math.max(0,u.currentMagAmmo-1) : 0},
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
    if(combatBusy)return;
    setState(prev=>{
      const combat=prev.combatState;if(!combat || combat.outcome!=="ongoing")return prev;
      const unit=combat.units.find(u=>u.id===combat.activeUnitId);
      if(!unit || !unit.isPlayerTeam || unit.hp<=0 || unit.isFled)return prev;
      const stats=ITEMS[unit.weapon].weaponStats!;
      if(!stats.ammoType || unit.ap<stats.reloadAp)return prev;
      const loaded=Math.min(stats.magazineSize-unit.currentMagAmmo,Math.floor(prev.inventory[stats.ammoType]??0));
      if(loaded<=0)return prev;
      soundEngine.playReloadSound();
      return {...prev,inventory:{...prev.inventory,[stats.ammoType]:(prev.inventory[stats.ammoType]??0)-loaded},combatState:{...combat,units:combat.units.map(u=>u.id===unit.id?{...u,currentMagAmmo:u.currentMagAmmo+loaded,magazines:{...u.magazines,[u.weapon]:u.currentMagAmmo+loaded},ap:u.ap-stats.reloadAp}:u),combatLog:[`${unit.name} loaded ${loaded} rounds (−${stats.reloadAp} AP).`,...combat.combatLog]}};
    });
  };

  const handleUseFieldBandage = () => {
    if(combatBusy)return;
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
    if(combatBusy || (state.inventory[weaponId]??0)<=0)return;
    setState((prev) => {
      if (!prev.combatState) return prev;
      const combat = prev.combatState;
      const activeUnit = combat.units.find(
        (u) => u.id === combat.activeUnitId
      );
      if (!activeUnit || !activeUnit.isMainCharacter || activeUnit.ap < 1) return prev;
      const newStats = ITEMS[weaponId].weaponStats!;

      const nextUnits = combat.units.map((u) =>
        u.id === activeUnit.id
          ? {
              ...u,
              ap: u.ap - 1,
              weapon: weaponId,
              currentMagAmmo: u.magazines?.[weaponId]??0,
              magazines:{...u.magazines,[u.weapon]:u.currentMagAmmo},
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
    if(combatBusy || !state.combatState || state.combatState.outcome!=="ongoing")return;
    const combat=state.combatState;
    const friends=combat.units.filter(u=>u.isPlayerTeam&&u.hp>0);
    const index=friends.findIndex(u=>u.id===combat.activeUnitId);
    if(index>=0 && index+1<friends.length){
      const next=friends[index+1];setState(prev=>({...prev,combatState:{...combat,activeUnitId:next.id,selectedFiringMode:ITEMS[next.weapon].weaponStats?.ammoType?"snap":"melee"}}));return;
    }
    enemyQueue.current=combat.units.filter(u=>!u.isPlayerTeam&&u.hp>0&&!u.isFled).map(u=>u.id);
    setState(prev=>({...prev,combatState:{...combat,activeUnitId:enemyQueue.current[0]??combat.activeUnitId,units:combat.units.map(u=>({...u,ap:u.isPlayerTeam?u.ap:u.maxAp}))}}));
    setEnemyBusy(true);
  };

  useEffect(()=>{
    if(!enemyBusy)return;
    if(!state.combatState || state.combatState.outcome!=="ongoing"){setEnemyBusy(false);return;}
    enemyTimer.current=setTimeout(()=>{
      const id=enemyQueue.current[0];
      if(!id){
        const combat=state.combatState!;
        const first=combat.units.find(u=>u.isPlayerTeam&&u.hp>0)!;
        setState({...state,combatState:{...combat,units:combat.units.map(u=>({...u,ap:u.maxAp})),activeUnitId:first.id,roundNumber:combat.roundNumber+1,selectedFiringMode:ITEMS[first.weapon].weaponStats?.ammoType?"snap":"melee",combatLog:[`Round ${combat.roundNumber+1} — your caravan's turn.`,...combat.combatLog]}});
        setEnemyBusy(false);return;
      }
      const result=performEnemyAction(state,id);
      if(result.done){enemyQueue.current.shift();if(result.state.combatState)result.state={...result.state,combatState:{...result.state.combatState,units:result.state.combatState.units.map(u=>u.id===id?{...u,ap:0}:u)}};}
      if(result.sound==="step")soundEngine.playStepSound("sand");
      if(result.sound==="reload")soundEngine.playReloadSound();
      if(result.sound==="hit"||result.sound==="miss"){
        const unit=state.combatState!.units.find(u=>u.id===id)!;
        soundEngine.playWeaponSound(getWeaponSoundCategory(unit.weapon));
        if(result.sound==="hit")soundEngine.playHitSound(false);else soundEngine.playMissRicochet();
      }
      // A fresh state also progresses a skipped enemy without a render-time loop.
      setState(result.state===state?{...state}:result.state);
    },650);
    return ()=>{if(enemyTimer.current)clearTimeout(enemyTimer.current);};
  },[enemyBusy,state]);

  const handleFinishCombat = () => {
    if(enemyBusy)return;
    setState((prev) => {
      if (!prev.combatState) return prev;
      const combat = prev.combatState;
      const mainUnit = combat.units.find((u) => u.isMainCharacter);
      const survivors=prev.hiredMercenaries.flatMap(m=>{
        const unit=combat.units.find(u=>u.id===`unit_${m.id}`);
        if(!unit || unit.hp<=0)return [];
        return [{...m,hp:unit.hp,crippledLegs:unit.crippledLegs,magazines:{...unit.magazines,[unit.weapon]:unit.currentMagAmmo}}];
      });
      const weaponMagazines=mainUnit?{...mainUnit.magazines,[mainUnit.weapon]:mainUnit.currentMagAmmo}:prev.weaponMagazines;
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
          hp: Math.max(1, mainUnit?.hp ?? prev.hp),
          hiredMercenaries:survivors,weaponMagazines,
          cash: prev.cash + cashGain,
          reputation: prev.reputation + 5,
          unspentAttributePoints:prev.unspentAttributePoints+(combat.encounter.isBountyTarget?1:0),
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
        hp: 35, hiredMercenaries:survivors,weaponMagazines,
        cash: Math.max(0, prev.cash - lostCash),
        combatState: null,
        journalLogs: logs,
      };
    });
  };

  const handleResetGame = () => {
    if(!window.confirm("Start a new run? Export your save first if you want to keep it."))return;
    if(enemyTimer.current)clearTimeout(enemyTimer.current);setEnemyBusy(false);
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
  const currentHp=state.combatState?.units.find(u=>u.isMainCharacter)?.hp??state.hp;
  const currentWeight = getCurrentCargoWeightKg(state.inventory);
  const maxCapacity = getMaxCargoCapacityKg(state);
  const speedInfo = getCaravanSpeedBreakdown(
    state,
    getTerrainAt(getWorldPosition(state))
  );
  const upkeep = getDailyUpkeepSummary(state);
  const activeSettlementForHub =
    state.currentSettlement ?? state.lastVisitedSettlement;

  return (
    <div
      className="h-screen max-h-screen w-screen overflow-hidden bg-[#121512] text-[#e2d7ba] flex flex-col select-none"
      onPointerDown={() => soundEngine.unlockAudio()}
      onKeyDown={() => soundEngine.unlockAudio()}
    >
      {/* 1. TOP PERMANENT CARAVANEER TELEMETRY HUD (Height: 44px) */}
      <header
        inert={!!state.combatState || !!state.pendingEncounter}
        className="h-11 shrink-0 bg-[#161a15] border-b-2 border-[#3d4738] px-3 flex items-center justify-between gap-2 shadow z-20"
      >
        {/* Brand & Location Indicator */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded border border-[#52604b] bg-[#22281e] text-[#fef08a] font-bold text-xs shadow-inner">
            MR
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs uppercase tracking-wider text-[#fef08a] hidden sm:inline">
              Merchant Route
            </span>
            <span className="rounded bg-[#20271e] border border-[#3d4738] px-2 py-0.5 text-[10px] font-mono text-[#c5b896]">
              {state.currentSettlement
                ? `[DOCKED] ${SETTLEMENTS[state.currentSettlement].name}`
                : state.travelState
                ? `[ROUTE] ${SETTLEMENTS[state.travelState.from].name} → ${SETTLEMENTS[state.travelState.to].name}`
                : "[WASTELAND FRONTIER]"}
            </span>
          </div>
        </div>

        {/* Survival & Economy Telemetry Pills */}
        <div className="flex items-center gap-1.5 md:gap-2 text-xs font-mono shrink-0">
          {/* Cash */}
          <div className="flex items-center gap-1 rounded bg-[#141813] border border-[#3d4738] px-2 py-1 text-[#fef08a]" title="Trade Script Cash">
            <Coins className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-bold">${state.cash.toFixed(0)}</span>
          </div>

          {/* HP / AP */}
          <div className="flex items-center gap-1 rounded bg-[#141813] border border-[#3d4738] px-2 py-1 text-red-200" title="Hull / Leader Health">
            <Heart className="h-3.5 w-3.5 text-red-400" />
            <span className="font-bold">{Math.round(currentHp)}/{getMaxHp(state.attributes)}</span>
          </div>

          <div className="hidden lg:flex items-center gap-1 rounded bg-[#141813] border border-[#3d4738] px-2 py-1 text-amber-200" title="Combat Action Points">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>{getMaxAp(state.attributes)} AP</span>
          </div>

          {/* Survival Supplies (Water, Food, Forage, Fuel) */}
          <div className="flex items-center gap-2 rounded bg-[#141813] border border-[#3d4738] px-2.5 py-1">
            <span title="Purified Water" className="flex items-center gap-1 text-[#38bdf8]">
              <Droplets className="h-3.5 w-3.5" />
              {(state.inventory.water ?? 0).toFixed(0)}L
            </span>
            <span title="Food Rations" className="flex items-center gap-1 text-[#e2d7ba]">
              <Utensils className="h-3.5 w-3.5" />
              {(state.inventory.food_rations ?? 0).toFixed(0)}
            </span>
            <span title="Animal Forage" className="hidden xl:flex items-center gap-1 text-[#a7f3d0]">
              <Wheat className="h-3.5 w-3.5" />
              {(state.inventory.animal_forage ?? 0).toFixed(0)}
            </span>
            <span title="Refined Gasoline" className="flex items-center gap-1 text-[#fb923c]">
              <Flame className="h-3.5 w-3.5" />
              {(state.inventory.gasoline ?? 0).toFixed(0)}L
            </span>
          </div>

          {/* Caravan Cargo Weight Meter with Tricolor Bar */}
          <div
            className={`flex items-center gap-1.5 rounded border px-2 py-1 ${
              currentWeight > maxCapacity
                ? "border-red-600 bg-red-950/60 text-red-200"
                : currentWeight > maxCapacity * 0.7
                ? "border-amber-600 bg-amber-950/40 text-amber-200"
                : "border-[#3d4738] bg-[#141813] text-[#c5b896]"
            }`}
            title={`Cargo Weight: ${currentWeight}/${maxCapacity} kg (${speedInfo.statusLabel})`}
          >
            <Backpack className="h-3.5 w-3.5 text-[#fef08a]" />
            <span className="font-bold">{currentWeight}/{maxCapacity}kg</span>
          </div>

          {/* Day / Time */}
          <div className="hidden sm:flex items-center gap-1 rounded bg-[#141813] border border-[#3d4738] px-2 py-1 text-[#c5b896]" title="Game Time">
            <Clock className="h-3.5 w-3.5 text-[#8d9887]" />
            <span>Day {state.day}, {String(Math.floor(state.hour)).padStart(2, "0")}:{String(Math.floor((state.hour % 1) * 60)).padStart(2, "0")}</span>
          </div>
        </div>

        {/* Audio, Logs & System Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleMute}
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
            className={`p-1.5 rounded border cursor-pointer ${
              isMuted
                ? "border-red-800 bg-red-950 text-red-300"
                : "border-[#3d4738] bg-[#20271e] text-[#c5b896] hover:bg-[#2a3327]"
            }`}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <button
            type="button"
            onClick={() => setShowLogsModal(true)}
            title="View Trail Logs"
            className="p-1.5 rounded border border-[#3d4738] bg-[#20271e] text-[#c5b896] hover:bg-[#2a3327] cursor-pointer"
          >
            <ScrollText size={15} />
          </button>
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            title="Game Saves & Audio Settings"
            className="px-2 py-1 rounded border border-[#3d4738] bg-[#20271e] text-[#c5b896] hover:bg-[#2a3327] text-xs font-bold cursor-pointer"
          >
            Config
          </button>
          <button
            type="button"
            onClick={handleResetGame}
            title="Reset Game Run"
            className="p-1.5 rounded border border-[#3d4738] bg-[#20271e] text-[#8d9887] hover:bg-stone-800 cursor-pointer"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </header>

      {/* Notice Banner */}
      {notice && (
        <div role="status" className="bg-[#241a15] border-b border-amber-800 px-3 py-1 text-xs text-amber-200 flex justify-between items-center shrink-0">
          <span>{notice}</span>
          <button className="text-amber-400 font-bold px-2" onClick={() => setNotice("")}>×</button>
        </div>
      )}

      {/* 2. MAIN COCKPIT VIEWPORT (FLEX-1 OVERFLOW-HIDDEN ZERO-SCROLL) */}
      <main
        inert={!!state.combatState || !!state.pendingEncounter}
        className="flex-1 min-h-0 w-full flex overflow-hidden p-2 gap-2"
      >
        {/* LEFT CARAVANEER NAVIGATION DECK */}
        <nav className="w-32 sm:w-36 shrink-0 flex flex-col gap-1.5 select-none">
          {([
            ["map", "Atlas [1]", Compass],
            ["travel", "Viagem [2]", Truck],
            ["town", "Cidade [3]", Swords],
            ["character", "Carga [4]", Backpack],
          ] as const).map(([tab, label, Icon]) => {
            const isActive = activeTab === tab;
            const isTownDisabled = tab === "town" && !state.currentSettlement && !state.lastVisitedSettlement;
            return (
              <button
                key={tab}
                type="button"
                disabled={isTownDisabled}
                onClick={() => setActiveTab(tab)}
                className={`w-full flex items-center justify-between px-2.5 py-2.5 rounded text-xs font-bold tracking-wider uppercase transition-all shadow cursor-pointer ${
                  isActive
                    ? "bg-[#384332] text-[#fef08a] border-2 border-[#8ba37c] shadow-inner"
                    : isTownDisabled
                    ? "bg-[#161a15] text-[#556050] border border-[#262e22] cursor-not-allowed opacity-50"
                    : "bg-[#1d231b] text-[#c5b896] border border-[#343e2f] hover:bg-[#252d22] hover:text-[#fef08a]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Icon size={14} />
                  {label}
                </span>
                {tab === "character" && state.unspentAttributePoints > 0 && (
                  <span className="rounded bg-emerald-600 px-1 py-0.2 text-[9px] text-stone-950 font-bold">
                    +{state.unspentAttributePoints}
                  </span>
                )}
              </button>
            );
          })}

          {/* Equipped Weapon Badge */}
          <div className="mt-auto bg-[#181d17] border border-[#343e2f] rounded p-2 text-xs space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-[#8d9887]">Arma</div>
            <div className="font-bold text-[#fef08a] truncate text-xs">{ITEMS[state.equippedWeapon].name}</div>
            {ITEMS[state.equippedWeapon].weaponStats?.ammoType && (
              <div className="text-[11px] text-[#38bdf8] font-mono">
                {state.inventory[ITEMS[state.equippedWeapon].weaponStats!.ammoType!] ?? 0} muns
              </div>
            )}
          </div>

          {/* Transport Info */}
          <div className="bg-[#181d17] border border-[#343e2f] rounded p-2 text-[11px] text-[#c5b896] space-y-0.5">
            <div className="text-[10px] uppercase text-[#8d9887]">Transporte</div>
            <div className="font-semibold truncate text-[#e2d7ba]">{getActiveTransportDefinition(state).name}</div>
            <div className="text-[10px] text-emerald-400 font-mono">{speedInfo.effectiveSpeedKmh} km/h</div>
          </div>
        </nav>

        {/* CENTER VIEWPORT STAGE */}
        <section className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          {activeTab === "map" && (
            <StrategicWorldMap
              state={state}
              selected={selectedSettlement}
              onSelect={setSelectedSettlement}
              onTravel={() => setActiveTab("travel")}
            />
          )}

          {activeTab === "travel" && (
            <TravelScreen
              state={state}
              selected={selectedSettlement}
              onSelect={setSelectedSettlement}
              onHeading={handleHeading}
              onMove={handleToggleMovement}
              onEnter={handleEnterSettlement}
              onCamp={handleCamp}
              rate={travelRate}
              onRate={setTravelRate}
              onScavenge={handleScavengeSecret}
              onRepair={handleRepairCaravan}
            />
          )}

          {activeTab === "town" && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <TownScene
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
                onRepairCaravan={handleRepairCaravan}
                onAcceptFreightContract={handleAcceptFreightContract}
                onAcceptPassengerContract={handleAcceptPassengerContract}
                onBuyAdditionalFleetUnit={handleBuyAdditionalFleetUnit}
                onLeaveTown={() => setActiveTab("travel")}
              />
            </div>
          )}

          {activeTab === "character" && (
            <div className="h-full w-full flex flex-col md:flex-row min-h-0 overflow-hidden gap-2">
              {/* LEFT COLUMN: FLEET & ATTRIBUTES */}
              <div className="w-80 lg:w-96 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
                {/* Fleet Composition */}
                <section className="game-panel p-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#fef08a] mb-1">
                    Composição da Frota
                  </h3>
                  <p className="text-[11px] text-[#8d9887] mb-2 leading-relaxed">
                    Ative as unidades compradas quando estiver na cidade.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {state.ownedTransports.map(id => (
                      <label key={id} className="game-secondary text-xs py-1 px-2 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={!state.currentSettlement}
                          checked={(state.activeTransports?.length ? state.activeTransports : [state.transport]).includes(id)}
                          onChange={e =>
                            setState(prev => {
                              const old = prev.activeTransports?.length ? prev.activeTransports : [prev.transport];
                              const next = e.target.checked ? [...old, id] : old.filter(t => t !== id);
                              if (!next.length) return prev;
                              return { ...prev, activeTransports: next, transport: next[0] };
                            })
                          }
                          className="mr-1.5"
                        />
                        {TRANSPORTS[id].name}
                      </label>
                    ))}
                  </div>
                </section>

                {/* RPG Attributes Sheet */}
                <section className="game-panel p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-[#2d3527] pb-1.5">
                    <div>
                      <h3 className="font-bold text-xs uppercase tracking-wider text-[#fef08a]">
                        Atributos do Líder
                      </h3>
                      <p className="text-[10px] text-[#8d9887]">Governam AP, pontaria, HP e bônus de comércio.</p>
                    </div>
                    {state.unspentAttributePoints > 0 && (
                      <span className="rounded bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white">
                        {state.unspentAttributePoints} pts
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {(
                      [
                        ["grit", "Grit (Resistência & Força)", `Max HP: ${getMaxHp(state.attributes)} | Carga: +${state.attributes.grit * 6}kg`],
                        ["agility", "Agilidade (AP & Fuga)", `AP: ${getMaxAp(state.attributes)}/turno | Velocidade: +${Math.round(state.attributes.agility * 1.5)}%`],
                        ["perception", "Percepção (Pontaria)", `Pontaria: +${getRangedAccuracyBonus(state.attributes)}% | Detecta emboscadas`],
                        ["charisma", "Carisma (Trocas & Intimidação)", `Preços: ±${state.attributes.charisma * 2.5}% | Blefa guardas`],
                      ] as const
                    ).map(([key, title, desc]) => (
                      <div key={key} className="flex items-center justify-between rounded bg-[#141813] border border-[#2d3527] p-2">
                        <div>
                          <div className="font-bold text-xs text-[#e2d7ba]">{title}</div>
                          <div className="text-[10px] text-[#8d9887]">{desc}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-bold text-[#fef08a]">{state.attributes[key]}</span>
                          <button
                            type="button"
                            disabled={state.unspentAttributePoints <= 0}
                            onClick={() => handleSpendAttributePoint(key)}
                            className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-bold text-stone-950 hover:bg-emerald-500 disabled:opacity-20 cursor-pointer"
                          >
                            +1
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Daily Upkeep Logistics */}
                <section className="game-panel p-3 text-xs space-y-1 bg-[#151814]">
                  <h4 className="font-bold text-[10px] uppercase text-[#fef08a]">Logística Diária</h4>
                  <div className="flex justify-between text-[#8d9887]">
                    <span>Tripulação (Você + Escoltas):</span>
                    <strong className="text-[#e2d7ba]">{1 + state.hiredMercenaries.length} pessoas</strong>
                  </div>
                  <div className="flex justify-between text-[#38bdf8]">
                    <span>Consumo de Água:</span>
                    <strong>{upkeep.totalWaterPerDay} L / dia</strong>
                  </div>
                  <div className="flex justify-between text-[#a7f3d0]">
                    <span>Consumo de Forragem:</span>
                    <strong>{upkeep.animalForagePerDay} un / dia</strong>
                  </div>
                  <div className="flex justify-between text-[#fb923c]">
                    <span>Gasto de Combustível:</span>
                    <strong>{upkeep.fuelPer10Km} L / 10 km</strong>
                  </div>
                  <div className="flex justify-between text-purple-300">
                    <span>Salário das Escoltas:</span>
                    <strong>${upkeep.mercenaryWagesPerDay} / dia</strong>
                  </div>
                </section>
              </div>

              {/* RIGHT COLUMN: CARGO MANIFEST OR TRADE LEDGER */}
              <div className="flex-1 min-h-0 flex flex-col bg-[#161a15] rounded border-2 border-[#3d4738] p-3 overflow-hidden shadow-inner">
                {/* SUBTABS */}
                <div className="flex items-center justify-between border-b border-[#2d3527] pb-2 shrink-0">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCargoSubTab("manifest")}
                      className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
                        cargoSubTab === "manifest"
                          ? "bg-[#384332] text-[#fef08a] border border-[#8ba37c]"
                          : "bg-[#141813] text-[#8d9887] border border-[#2d3527] hover:text-[#e2d7ba]"
                      }`}
                    >
                      Manifesto de Carga
                    </button>
                    <button
                      type="button"
                      onClick={() => setCargoSubTab("ledger")}
                      className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
                        cargoSubTab === "ledger"
                          ? "bg-[#384332] text-[#fef08a] border border-[#8ba37c]"
                          : "bg-[#141813] text-[#8d9887] border border-[#2d3527] hover:text-[#e2d7ba]"
                      }`}
                    >
                      Livro de Rotas (Ledger)
                    </button>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#fef08a]">
                    {currentWeight} / {maxCapacity} kg ({speedInfo.statusLabel})
                  </span>
                </div>

                {cargoSubTab === "manifest" ? (
                  <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden pt-2">
                    {/* Items List */}
                    <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#262e21] pr-1">
                      {Object.entries(state.inventory)
                        .filter(([, qty]) => (qty ?? 0) > 0)
                        .map(([key, qty]) => {
                          const itemId = key as ItemId;
                          const item = ITEMS[itemId];
                          const count = qty ?? 0;
                          const totalItemWeight = Math.round(count * item.weightKg * 10) / 10;

                          return (
                            <div key={itemId} className="flex items-center justify-between py-2 text-xs">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-[#e2d7ba]">
                                    {count}x {item.name}
                                  </span>
                                  <span className="text-[#8d9887]">({totalItemWeight} kg)</span>
                                  {state.equippedWeapon === itemId && (
                                    <span className="rounded bg-[#2e3b28] border border-[#526a47] px-1.5 py-0.5 text-[9px] font-bold text-[#fef08a]">
                                      EQUIPADO
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#8d9887]">{item.description}</p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {item.category === "weapon" && state.equippedWeapon !== itemId && (
                                  <button
                                    type="button"
                                    onClick={() => handleEquipWeapon(itemId as WeaponId)}
                                    className="game-secondary py-1 px-2.5 text-xs text-[#38bdf8]"
                                  >
                                    Equipar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleJettisonItem(itemId, 1)}
                                  className="inline-flex items-center gap-1 rounded border border-red-900 bg-red-950/40 px-2 py-1 text-[11px] text-red-300 hover:bg-red-900/60 cursor-pointer"
                                >
                                  <PackageMinus className="h-3 w-3" /> Descartar 1
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#262e21] text-[11px] text-[#c5b896] bg-[#141813] p-2 rounded shrink-0">
                      <Compass className="inline h-3.5 w-3.5 mr-1 text-[#fef08a]" />
                      <strong>Conselho do Avô:</strong> Mantenha a carga abaixo de 70% da capacidade para velocidade máxima de viagem pelo deserto.
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto pt-2">
                    <TradeLedger state={state} />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* 3. BOTTOM TELEGRAPH FEED & HOTKEY STATUS BAR (Height: 32px) */}
      <footer className="h-8 shrink-0 bg-[#161a15] border-t-2 border-[#3d4738] px-3 flex items-center justify-between gap-3 text-xs font-mono text-[#c5b896] select-none z-10">
        <div className="flex items-center gap-2 truncate">
          <span className="text-[#fef08a] font-bold uppercase shrink-0 flex items-center gap-1">
            <ScrollText size={13} className="text-[#8ba37c]" /> [TELEGRAPH]:
          </span>
          <span className="truncate text-[#e2d7ba]">
            {state.journalLogs[0] ?? "Trilha desimpedida. Nenhuma ocorrência registrada."}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-[11px] text-[#8d9887]">
          <span className="hidden md:inline">Hotkeys: [1] Atlas · [2] Viagem · [3] Cidade · [4] Carga · [Espaço] Andar/Parar</span>
          <button
            type="button"
            onClick={() => setShowLogsModal(true)}
            className="text-[#fef08a] hover:underline cursor-pointer"
          >
            Histórico ({state.journalLogs.length}) →
          </button>
        </div>
      </footer>

      {/* LOGS MODAL */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded border-2 border-[#3d4738] bg-[#1a1f18] p-4 text-[#e2d7ba] shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#2d3527] pb-2 mb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-[#fef08a] flex items-center gap-2">
                <ScrollText size={16} /> Diário de Bordo da Caravana
              </h3>
              <button
                type="button"
                className="text-[#8d9887] hover:text-[#fef08a] text-lg font-bold px-2"
                onClick={() => setShowLogsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 font-mono text-xs pr-1">
              {state.journalLogs.map((log, i) => (
                <div key={i} className="rounded bg-[#141813] border-l-2 border-[#8ba37c] px-2.5 py-1.5">
                  {log}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2 border-t border-[#2d3527] flex justify-end">
              <button
                type="button"
                className="game-secondary py-1 px-4 text-xs"
                onClick={() => setShowLogsModal(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS & SAVES MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded border-2 border-[#3d4738] bg-[#1a1f18] p-4 text-[#e2d7ba] shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#2d3527] pb-2">
              <h3 className="font-bold text-sm uppercase tracking-wider text-[#fef08a]">
                Configurações & Salvamento
              </h3>
              <button
                type="button"
                className="text-[#8d9887] hover:text-[#fef08a] text-lg font-bold px-2"
                onClick={() => setShowSettingsModal(false)}
              >
                ×
              </button>
            </div>

            {/* Save Status & Export/Import */}
            <div className="bg-[#141813] border border-[#2d3527] p-3 rounded space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#8d9887]">Status:</span>
                <span className="font-mono text-[#fef08a]">{saveStatus}</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button className="game-secondary flex-1 py-1.5" onClick={exportSave}>
                  Exportar Save (.json)
                </button>
                <button
                  className="game-secondary flex-1 py-1.5"
                  onClick={() => importRef.current?.click()}
                  disabled={enemyBusy}
                >
                  Importar Save
                </button>
                <input
                  ref={importRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  aria-label="Import game save"
                  onChange={e => void importSave(e.target.files?.[0])}
                />
              </div>
            </div>

            {/* Audio Volume Controls */}
            <div className="bg-[#141813] border border-[#2d3527] p-3 rounded space-y-2 text-xs">
              <span className="font-bold text-[#fef08a] block uppercase text-[10px]">Volumes de Áudio</span>
              {(["effects", "ambience"] as const).map(key => (
                <label key={key} className="flex items-center justify-between gap-3 text-[#c5b896] capitalize">
                  <span>{key === "effects" ? "Efeitos Sonoros" : "Ambiente"}:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step=".05"
                      value={volumes[key]}
                      onChange={e => handleVolume(key, Number(e.target.value))}
                      className="cursor-pointer accent-[#8ba37c]"
                    />
                    <span className="font-mono w-10 text-right">{Math.round(volumes[key] * 100)}%</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                className="game-primary py-1.5 px-4 text-xs font-bold"
                onClick={() => setShowSettingsModal(false)}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOWN GATE CONTRABAND INSPECTION MODAL */}
      {pendingGateInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-xl border border-amber-600 bg-stone-900 p-6 text-stone-100 shadow-2xl">
            <h3 className="font-serif text-2xl font-bold text-amber-100">
              City Gate Inspection · {SETTLEMENTS[pendingGateInspection.settlementId].name}
            </h3>
            <p className="mt-3 text-sm text-stone-300">
              Customs guards signal your caravan to halt. They inspect the cargo manifest and immediately detect <strong className="text-amber-300">{pendingGateInspection.moonshineCount} jugs of Canyon Moonshine</strong>, strictly prohibited within city limits.
            </p>
            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                onClick={handleGateInspectionBluff}
                className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-500 cursor-pointer"
              >
                Bluff Guards (Charisma {state.attributes.charisma} Check)
              </button>
              <button
                type="button"
                disabled={state.cash < 40}
                onClick={handleGateInspectionBribe}
                className="w-full rounded-lg border border-amber-700 bg-amber-950/80 px-4 py-2.5 text-sm font-bold text-amber-200 hover:bg-amber-900 disabled:opacity-40 cursor-pointer"
              >
                Bribe Guard ($40)
              </button>
              <button
                type="button"
                onClick={handleGateInspectionSurrender}
                className="w-full rounded-lg border border-stone-700 bg-stone-800 px-4 py-2.5 text-sm font-semibold text-stone-300 hover:bg-stone-700 cursor-pointer"
              >
                Surrender Contraband Peacefully (No Fine)
              </button>
              <button
                type="button"
                onClick={handleGateInspectionTurnBack}
                className="w-full rounded-lg border border-stone-800 bg-stone-950 px-4 py-2 text-xs font-semibold text-stone-400 hover:text-stone-200 cursor-pointer"
              >
                Turn Back from the Gate
              </button>
            </div>
          </div>
        </div>
      )}

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
          onUseAntibiotics={() => handleUseCombatConsumableAction("antibiotics")}
          onSwitchCombatWeapon={handleSwitchCombatWeapon}
          onEndPlayerUnitTurn={handleEndPlayerUnitTurn}
          onFinishCombat={handleFinishCombat}
          onAnimationBusyChange={setAnimationBusy}
        />
      )}
    </div>
  );
}
