"use client";

import React from "react";
import {
  getCaravanSpeedBreakdown,
  getCurrentCargoWeightKg,
  getMaxCargoCapacityKg,
  getActiveTransportDefinition,
} from "@/domain/economyEngine";
import { GameState, ItemId, RoadEncounter, TransportId } from "@/domain/types";
import { ITEMS } from "@/domain/worldData";
import { TransportIllustration } from "@/assets/caravaneerSprites";
import {
  Coins,
  Footprints,
  Megaphone,
  PackageMinus,
  ShieldAlert,
  Swords,
  Crosshair,
  Gauge,
} from "lucide-react";

interface PreCombatEncounterModalProps {
  state: GameState;
  encounter: RoadEncounter;
  onStartTacticalCombat: () => void;
  onAttemptFlee: () => void;
  onPayToll: () => void;
  onAttemptIntimidate: () => void;
  onJettisonItem: (itemId: ItemId, qty: number) => void;
}

const ENCOUNTER_TRANSLATIONS: Record<
  string,
  { title: string; group: string; desc: string }
> = {
  "Desperate Scrubland Drifters": {
    title: "Saqueadores Famintos da Chapada",
    group: "Catadores de Dust Creek",
    desc: "Três saqueadores queimados pelo sol surgem detrás de uma placa enferrujada na beira da trilha, exigindo água e moedas sob a mira de armas.",
  },
  "Canyon Bushwhackers": {
    title: "Emboscadores do Cânion Vermelho",
    group: "Foras-da-Lei de Red Rock",
    desc: "Rifles de repetição brilham entre os rochedos do desfiladeiro à frente. Um bando montado fechou a passagem de olho nos seus animais e na carga.",
  },
  "Highway Raider Syndicate": {
    title: "Sindicato Motorizado da Rodovia",
    group: "Chacais do Asfalto",
    desc: "Piratas da estrada com blindagem de sucata soldada bloqueiam o caminho em veículos rápidos, caçando combustível, couro e mercadorias valiosas.",
  },
  "Ironclad Death-Squad": {
    title: "Esquadrão da Morte Blindado",
    group: "Reavers do Deserto",
    desc: "Um comboio pesado de mercenários renegados e atiradores de elite cercou o perímetro da sua caravana com intenção letal.",
  },
};

const ROLE_TRANSLATIONS: Record<string, string> = {
  "Drifter Pistolero": "Pistoleiro Errante",
  "Varmint Shooter": "Atirador de Carabina",
  "Trail Cutthroat": "Degolador de Trilha",
  "Canyon Marksman": "Franco-Atirador do Cânion",
  Enforcer: "Brucutu de Escopeta",
  "Outrider Duelist": "Duelista Montado",
  "Gunslinger Boss": "Chefe Pistoleiro",
  "Trench Breacher": "Assaltante de Trincheira",
  "Rifleman Escort": "Escolta de Fuzil",
  "Outlaw Leader": "Líder Fora-da-Lei",
  "Gang Henchman": "Capanga de Gangue",
  "Heavy Gunner": "Atirador Pesado",
  "Elite Sniper": "Sniper de Elite",
};

function getEnemyTransportVisual(speedKmh: number): {
  transportId: TransportId;
  label: string;
} {
  if (speedKmh >= 11) {
    return {
      transportId: "desert_dune_buggy",
      label: "Carros de Assalto V8",
    };
  }
  if (speedKmh >= 7) {
    return {
      transportId: "heavy_wagon_horse",
      label: "Cavalos de Perseguição",
    };
  }
  return {
    transportId: "pack_mule_team",
    label: "A Pé & Mulas de Trilha",
  };
}

export const PreCombatEncounterModal: React.FC<
  PreCombatEncounterModalProps
> = ({
  state,
  encounter,
  onStartTacticalCombat,
  onAttemptFlee,
  onPayToll,
  onAttemptIntimidate,
  onJettisonItem,
}) => {
  const terrain =
    state.exploration?.terrain ?? state.travelState?.terrain ?? "scorched_flats";
  const speedInfo = getCaravanSpeedBreakdown(state, terrain);
  const currentWeight = getCurrentCargoWeightKg(state.inventory);
  const maxCapacity = getMaxCargoCapacityKg(state);
  const playerTransport = getActiveTransportDefinition(state);

  const speedAdvantage = speedInfo.effectiveSpeedKmh - encounter.enemySpeedKmh;
  const fleeChance = Math.max(
    15,
    Math.min(
      95,
      Math.round(55 + speedAdvantage * 6 + state.attributes.agility * 3)
    )
  );

  const squadFirepower =
    state.attributes.charisma * 2 +
    state.hiredMercenaries.length * 4 +
    (state.equippedWeapon === "carbine_556" ||
    state.equippedWeapon === "sniper_rifle_762"
      ? 6
      : state.equippedWeapon === "bolt_rifle_308" ||
        state.equippedWeapon === "coach_shotgun_12g"
      ? 4
      : 2);

  const intimidateChance = Math.max(
    10,
    Math.min(
      95,
      Math.round(50 + (squadFirepower - encounter.intimidateThreshold) * 6)
    )
  );

  // Heavy items that can be dumped to gain speed
  const heavyInventoryItems = Object.entries(state.inventory)
    .filter(([key, qty]) => {
      const item = ITEMS[key as ItemId];
      return (qty ?? 0) > 0 && item && item.category !== "weapon";
    })
    .sort(
      ([a], [b]) => ITEMS[b as ItemId].weightKg - ITEMS[a as ItemId].weightKg
    )
    .slice(0, 4);

  const translated = ENCOUNTER_TRANSLATIONS[encounter.title];
  const displayTitle = translated?.title ?? encounter.title;
  const displayGroup = translated?.group ?? encounter.enemyGroupName;
  const displayDesc = translated?.desc ?? encounter.description;
  const enemyTransport = getEnemyTransportVisual(encounter.enemySpeedKmh);

  const statusPt =
    speedInfo.statusLabel === "Optimal"
      ? "Ideal"
      : speedInfo.statusLabel === "Heavy Load"
      ? "Pesado"
      : speedInfo.statusLabel === "Overloaded"
      ? "Sobrecarregado"
      : "Sem Combustível";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="encounter-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 select-none"
    >
      <div className="w-full max-w-3xl caravan-bezel border-2 border-[#5c6e52] bg-[#141b12] text-[#ebdcb2] shadow-2xl overflow-hidden">
        {/* TOP MILITARY STENCIL HEADER BAR */}
        <div className="bg-[#172016] border-b-2 border-[#3c4a35] px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-red-700/80 bg-[#2a1212] text-red-400 shadow-inner">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-widest text-red-400">
                <span>[ALERTA DE INTERCEPTAÇÃO NA ROTA]</span>
                <span className="text-[#6d8065]">•</span>
                <span className="text-[#fde047]">{displayGroup}</span>
              </div>
              <h2
                id="encounter-title"
                className="text-lg font-black uppercase tracking-wide text-[#fef08a] font-mono"
              >
                {displayTitle}
              </h2>
            </div>
          </div>

          {encounter.isBountyTarget ? (
            <span className="border-2 border-amber-500 bg-amber-950/90 px-2.5 py-1 font-mono text-[11px] font-black uppercase tracking-wider text-amber-300">
              ★ ALVO DE PROCURADO (RECOMPENSA)
            </span>
          ) : (
            <span className="border border-[#47573f] bg-[#121811] px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-[#95a38e]">
              TERRENO: {terrain.replaceAll("_", " ")}
            </span>
          )}
        </div>

        <div className="p-4 space-y-3">
          {/* SIDE-BY-SIDE CARAVAN CONFRONTATION VISUAL BANNER */}
          <div className="grid grid-cols-1 sm:grid-cols-11 gap-2 items-center caravan-gauge p-2.5 border border-[#3c4a35]">
            {/* YOUR CARAVAN */}
            <div className="sm:col-span-5 flex items-center gap-3 bg-[#141a12] border border-[#2d3829] p-2">
              <div className="h-12 w-20 shrink-0 bg-[#10150e] border border-[#33402e] p-1 flex items-center justify-center">
                <TransportIllustration
                  transportId={state.transport}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0 font-mono text-xs">
                <div className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                  SUA CARAVANA ({1 + state.hiredMercenaries.length} UNID.)
                </div>
                <div className="font-bold text-[#ebdcb2] truncate">
                  {playerTransport.name}
                </div>
                <div className="text-[11px] text-[#fde047]">
                  Vel: {speedInfo.effectiveSpeedKmh.toFixed(1)} km/h ({statusPt})
                </div>
              </div>
            </div>

            {/* VS BADGE */}
            <div className="sm:col-span-1 flex flex-col items-center justify-center py-1">
              <span className="px-2 py-0.5 bg-[#2a1212] border border-red-800 font-mono text-[10px] font-black text-red-400 uppercase">
                VS
              </span>
            </div>

            {/* APPROACHING HOSTILE CARAVAN */}
            <div className="sm:col-span-5 flex items-center gap-3 bg-[#1c1313] border border-red-900/50 p-2">
              <div className="h-12 w-20 shrink-0 bg-[#140d0d] border border-red-900/60 p-1 flex items-center justify-center">
                <TransportIllustration
                  transportId={enemyTransport.transportId}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0 font-mono text-xs">
                <div className="text-[10px] font-black uppercase text-red-400 tracking-wider">
                  BANDO ABORDANTE ({encounter.enemies.length} UNID.)
                </div>
                <div className="font-bold text-[#ebdcb2] truncate">
                  {enemyTransport.label}
                </div>
                <div className="text-[11px] text-red-300">
                  Perseguição: {encounter.enemySpeedKmh.toFixed(1)} km/h
                </div>
              </div>
            </div>
          </div>

          {/* TACTICAL SITUATION BRIEFING */}
          <div className="bg-[#121710] border-l-4 border-[#fde047] px-3 py-2 text-xs text-[#ebdcb2] font-mono leading-relaxed">
            {displayDesc}
          </div>

          {/* ENEMY MANIFEST & TELEMETRY COMPARISON */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs font-mono">
            {/* HOSTILE PARTY LIST */}
            <div className="caravan-gauge p-3 border border-[#3c4a35] space-y-2">
              <div className="flex items-center justify-between border-b border-[#2d3829] pb-1">
                <h4 className="font-black text-[11px] text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Crosshair className="h-3.5 w-3.5" /> Integrantes Hostis ({encounter.enemies.length})
                </h4>
                <span className="text-[10px] text-[#95a38e]">Armamento Detectado</span>
              </div>
              <ul className="space-y-1.5 text-[#ebdcb2]">
                {encounter.enemies.map((e, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 bg-[#141a12] px-2 py-1 border border-[#263022]"
                  >
                    <span className="truncate">
                      <strong className="text-[#fef08a]">{e.name}</strong>{" "}
                      <span className="text-[10px] text-[#95a38e]">
                        ({ROLE_TRANSLATIONS[e.role] ?? e.role})
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-bold text-amber-300">
                      {ITEMS[e.weapon].name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* SPEED & WEIGHT COMPARISON */}
            <div className="caravan-gauge p-3 border border-[#3c4a35] space-y-2">
              <div className="flex items-center justify-between border-b border-[#2d3829] pb-1">
                <h4 className="font-black text-[11px] text-[#fde047] uppercase tracking-wider flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5" /> Telemetria de Fuga & Carga
                </h4>
                <span className="text-[10px] text-[#95a38e]">Comparativo</span>
              </div>
              <div className="space-y-1.5 text-[#ebdcb2]">
                <div className="flex justify-between bg-[#141a12] px-2 py-1 border border-[#263022]">
                  <span className="text-[#95a38e]">Sua Velocidade:</span>
                  <strong className="text-emerald-400">
                    {speedInfo.effectiveSpeedKmh.toFixed(1)} km/h ({statusPt})
                  </strong>
                </div>
                <div className="flex justify-between bg-[#141a12] px-2 py-1 border border-[#263022]">
                  <span className="text-[#95a38e]">Velocidade Hostil:</span>
                  <strong className="text-red-400">
                    {encounter.enemySpeedKmh.toFixed(1)} km/h
                  </strong>
                </div>
                <div className="flex justify-between bg-[#141a12] px-2 py-1 border border-[#263022]">
                  <span className="text-[#95a38e]">Peso da Carga:</span>
                  <strong className="text-[#fde047]">
                    {currentWeight.toFixed(1)} / {maxCapacity} kg
                  </strong>
                </div>
                <div className="flex justify-between bg-[#141a12] px-2 py-1 border border-[#263022]">
                  <span className="text-[#95a38e]">Saldo Disponível:</span>
                  <strong className="text-emerald-300">${state.cash.toFixed(0)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* EMERGENCY CARGO JETTISON */}
          {heavyInventoryItems.length > 0 && (
            <div className="caravan-gauge p-2.5 border border-[#4c5d43] bg-[#141a12]">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-[#fde047]">
                  <PackageMinus className="h-3.5 w-3.5 text-amber-400" />
                  Alijamento de Carga de Emergência (Descartar peso para elevar velocidade de fuga):
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {heavyInventoryItems.map(([key, qty]) => {
                  const itemId = key as ItemId;
                  const item = ITEMS[itemId];
                  return (
                    <button
                      key={itemId}
                      type="button"
                      onClick={() => onJettisonItem(itemId, 1)}
                      className="game-secondary py-1 px-2.5 text-[11px] font-mono text-[#fde047] hover:border-amber-400 cursor-pointer"
                    >
                      Descartar 1× {item.name} (-{item.weightKg}kg | Restam:{" "}
                      {Number((qty ?? 0).toFixed(1))})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4 TACTICAL DECISION BUTTONS (CARAVANEER CONSOLE AESTHETIC) */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 pt-1 font-mono">
            {/* 1. FIGHT */}
            <button
              type="button"
              onClick={onStartTacticalCombat}
              className="flex items-center justify-between border-2 border-red-700 bg-[#3b1515] hover:bg-[#4d1b1b] px-3.5 py-2.5 text-left text-[#fef08a] shadow cursor-pointer transition-all active:translate-y-0.5"
            >
              <div>
                <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-red-200">
                  <Swords className="h-4 w-4 text-red-400" /> Engajar Combate Tático
                </div>
                <p className="text-[10px] text-[#d6c7a1] mt-0.5">
                  Entrar no mapa tático 20×12 por turnos (Pontos de Ação)
                </p>
              </div>
              <span className="border border-red-500 bg-[#220a0a] px-2 py-1 text-[10px] font-black uppercase text-red-300">
                LUTAR
              </span>
            </button>

            {/* 2. FLEE */}
            <button
              type="button"
              onClick={onAttemptFlee}
              className="flex items-center justify-between border-2 border-[#5c7250] bg-[#1f2b1c] hover:bg-[#293825] px-3.5 py-2.5 text-left text-[#ebdcb2] shadow cursor-pointer transition-all active:translate-y-0.5"
            >
              <div>
                <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-emerald-300">
                  <Footprints className="h-4 w-4 text-emerald-400" /> Forçar Fuga na Trilha
                </div>
                <p className="text-[10px] text-[#95a38e] mt-0.5">
                  Baseado na Velocidade da Caravana & Agilidade ({state.attributes.agility})
                </p>
              </div>
              <span className="border border-emerald-600 bg-[#121910] px-2.5 py-1 text-xs font-black text-emerald-300">
                {fleeChance}%
              </span>
            </button>

            {/* 3. PAY TOLL */}
            <button
              type="button"
              disabled={state.cash < encounter.tollDemandCash}
              onClick={onPayToll}
              className="flex items-center justify-between border-2 border-[#6e5c38] bg-[#262014] hover:bg-[#332b1a] disabled:opacity-40 px-3.5 py-2.5 text-left text-[#ebdcb2] shadow cursor-pointer transition-all active:translate-y-0.5"
            >
              <div>
                <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-[#fde047]">
                  <Coins className="h-4 w-4 text-amber-400" /> Pagar Pedágio (${encounter.tollDemandCash})
                </div>
                <p className="text-[10px] text-[#c5b896] mt-0.5">
                  Poupa munição e evita danos à caravana
                </p>
              </div>
              <span className="border border-amber-500/70 bg-[#17130b] px-2 py-1 text-[10px] font-black uppercase text-[#fde047]">
                SEGURO
              </span>
            </button>

            {/* 4. INTIMIDATE */}
            <button
              type="button"
              onClick={onAttemptIntimidate}
              className="flex items-center justify-between border-2 border-[#47573f] bg-[#182016] hover:bg-[#222d1f] px-3.5 py-2.5 text-left text-[#ebdcb2] shadow cursor-pointer transition-all active:translate-y-0.5"
            >
              <div>
                <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-amber-200">
                  <Megaphone className="h-4 w-4 text-[#fde047]" /> Intimidar Bando
                </div>
                <p className="text-[10px] text-[#95a38e] mt-0.5">
                  Carisma ({state.attributes.charisma}) + Poder de Fogo da Escolta
                </p>
              </div>
              <span className="border border-[#6d885f] bg-[#11170f] px-2.5 py-1 text-xs font-black text-[#fde047]">
                {intimidateChance}%
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
