"use client";

import React from "react";
import {
  getCaravanSpeedBreakdown,
  getCurrentCargoWeightKg,
  getMaxCargoCapacityKg,
} from "@/domain/economyEngine";
import { GameState, ItemId, RoadEncounter } from "@/domain/types";
import { ITEMS } from "@/domain/worldData";
import {
  Coins,
  Footprints,
  Megaphone,
  PackageMinus,
  ShieldAlert,
  Swords,
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
  const terrain = state.travelState?.terrain ?? "scorched_flats";
  const speedInfo = getCaravanSpeedBreakdown(state, terrain);
  const currentWeight = getCurrentCargoWeightKg(state.inventory);
  const maxCapacity = getMaxCargoCapacityKg(state);

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
    (state.equippedWeapon === "carbine_556"
      ? 6
      : state.equippedWeapon === "bolt_rifle_308" ||
        state.equippedWeapon === "coach_shotgun_12g"
      ? 4
      : 2);

  const intimidateChance = Math.max(
    10,
    Math.min(
      95,
      Math.round(
        50 + (squadFirepower - encounter.intimidateThreshold) * 6
      )
    )
  );

  // Heavy items that can be dumped to gain speed
  const heavyInventoryItems = Object.entries(state.inventory)
    .filter(([key, qty]) => {
      const item = ITEMS[key as ItemId];
      return (qty ?? 0) > 0 && item && item.category !== "weapon";
    })
    .sort(
      ([a], [b]) =>
        ITEMS[b as ItemId].weightKg - ITEMS[a as ItemId].weightKg
    )
    .slice(0, 4);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="encounter-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl rounded-2xl border-2 border-red-800/80 bg-stone-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-950 border border-red-600/60 text-red-400">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                ⚠️ Wasteland Road Confrontation
              </span>
              <h2
                id="encounter-title"
                className="text-xl font-bold text-amber-100"
              >
                {encounter.title}
              </h2>
            </div>
          </div>

          {encounter.isBountyTarget && (
            <span className="rounded-full bg-amber-950 border border-amber-500/60 px-3 py-1 text-xs font-bold text-amber-300">
              ★ Sheriff Bounty Target
            </span>
          )}
        </div>

        <p className="mt-4 text-sm leading-relaxed text-stone-200">
          {encounter.description}
        </p>

        {/* Enemy Squad & Speed Comparison */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-xl border border-stone-800 bg-stone-900/90 p-3">
            <h4 className="font-bold text-red-300 uppercase">
              Hostile Party ({encounter.enemies.length} Units):
            </h4>
            <ul className="mt-1.5 space-y-1 text-stone-300">
              {encounter.enemies.map((e, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    • <strong>{e.name}</strong> ({e.role})
                  </span>
                  <span className="text-amber-300">
                    {ITEMS[e.weapon].name}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-stone-800 bg-stone-900/90 p-3">
            <h4 className="font-bold text-sky-300 uppercase">
              Speed & Weight Comparison:
            </h4>
            <div className="mt-1.5 space-y-1 text-stone-300">
              <div className="flex justify-between">
                <span>Your Caravan Speed:</span>
                <strong className="text-emerald-300">
                  {speedInfo.effectiveSpeedKmh} km/h ({speedInfo.statusLabel})
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Raider Pursuit Speed:</span>
                <strong className="text-red-300">
                  {encounter.enemySpeedKmh.toFixed(1)} km/h
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Current Cargo Weight:</span>
                <strong className="text-amber-300">
                  {currentWeight} / {maxCapacity} kg
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Jettison (Dump Cargo for Speed) */}
        {heavyInventoryItems.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-900/50 bg-amber-950/20 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-amber-300">
                <PackageMinus className="h-4 w-4" />
                Emergency Cargo Jettison (Dump weight to increase escape speed):
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {heavyInventoryItems.map(([key, qty]) => {
                const itemId = key as ItemId;
                const item = ITEMS[itemId];
                return (
                  <button
                    key={itemId}
                    type="button"
                    onClick={() => onJettisonItem(itemId, 1)}
                    className="rounded-lg border border-amber-700/60 bg-stone-900 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-900/50 cursor-pointer"
                  >
                    Dump 1x {item.name} (-{item.weightKg}kg, Left: {qty})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4 Action Choices */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onStartTacticalCombat}
            className="flex items-center justify-between rounded-xl bg-red-700 px-4 py-3 text-left text-white shadow-lg hover:bg-red-600 transition cursor-pointer"
          >
            <div>
              <div className="flex items-center gap-2 font-bold text-sm">
                <Swords className="h-4 w-4" /> Engage Tactical Combat
              </div>
              <p className="text-xs text-red-100 mt-0.5">
                Enter Top-Down Turn-Based Grid (Action Points)
              </p>
            </div>
            <span className="rounded bg-red-950/80 px-2 py-1 text-xs font-bold">
              FIGHT
            </span>
          </button>

          <button
            type="button"
            onClick={onAttemptFlee}
            className="flex items-center justify-between rounded-xl border border-sky-600/70 bg-sky-950/80 px-4 py-3 text-left text-sky-100 hover:bg-sky-900 transition cursor-pointer"
          >
            <div>
              <div className="flex items-center gap-2 font-bold text-sm">
                <Footprints className="h-4 w-4" /> Outrun on the Trail
              </div>
              <p className="text-xs text-sky-300 mt-0.5">
                Based on Caravan Speed & Agility
              </p>
            </div>
            <span className="rounded bg-sky-900 px-2.5 py-1 text-xs font-bold text-sky-200">
              {fleeChance}%
            </span>
          </button>

          <button
            type="button"
            disabled={state.cash < encounter.tollDemandCash}
            onClick={onPayToll}
            className="flex items-center justify-between rounded-xl border border-amber-600/70 bg-amber-950/70 px-4 py-3 text-left text-amber-100 hover:bg-amber-900 disabled:opacity-40 transition cursor-pointer"
          >
            <div>
              <div className="flex items-center gap-2 font-bold text-sm">
                <Coins className="h-4 w-4" /> Pay Road Toll (${encounter.tollDemandCash})
              </div>
              <p className="text-xs text-amber-300 mt-0.5">
                Save your bullets and avoid damage
              </p>
            </div>
            <span className="rounded bg-amber-900 px-2.5 py-1 text-xs font-bold text-amber-200">
              SAFE
            </span>
          </button>

          <button
            type="button"
            onClick={onAttemptIntimidate}
            className="flex items-center justify-between rounded-xl border border-purple-600/70 bg-purple-950/70 px-4 py-3 text-left text-purple-100 hover:bg-purple-900 transition cursor-pointer"
          >
            <div>
              <div className="flex items-center gap-2 font-bold text-sm">
                <Megaphone className="h-4 w-4" /> Intimidate Raiders
              </div>
              <p className="text-xs text-purple-300 mt-0.5">
                Charisma ({state.attributes.charisma}) + Squad Firepower
              </p>
            </div>
            <span className="rounded bg-purple-900 px-2.5 py-1 text-xs font-bold text-purple-200">
              {intimidateChance}%
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
