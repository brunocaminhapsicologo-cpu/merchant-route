"use client";

import React, { useState } from "react";
import {
  calculateShotPreview,
  getManhattanDistance,
} from "@/domain/combatEngine";
import {
  CombatState,
  CombatUnit,
  FiringMode,
  GameState,
  WeaponId,
} from "@/domain/types";
import { ITEMS } from "@/domain/worldData";
import {
  Crosshair,
  HeartPulse,
  RotateCcw,
  Shield,
  SkipForward,
  Swords,
  Trophy,
  Zap,
} from "lucide-react";

interface TacticalCombatModalProps {
  state: GameState;
  combat: CombatState;
  onMoveActiveUnit: (targetX: number, targetY: number) => void;
  onAttackTarget: (targetUnitId: string) => void;
  onSetFiringMode: (mode: FiringMode) => void;
  onReloadWeapon: () => void;
  onUseFieldBandage: () => void;
  onSwitchCombatWeapon: (weaponId: WeaponId) => void;
  onEndPlayerUnitTurn: () => void;
  onFinishCombat: () => void;
}

export const TacticalCombatModal: React.FC<TacticalCombatModalProps> = ({
  state,
  combat,
  onMoveActiveUnit,
  onAttackTarget,
  onSetFiringMode,
  onReloadWeapon,
  onUseFieldBandage,
  onSwitchCombatWeapon,
  onEndPlayerUnitTurn,
  onFinishCombat,
}) => {
  const [hoveredEnemyId, setHoveredEnemyId] = useState<string | null>(null);

  const activeUnit: CombatUnit | undefined = combat.units.find(
    (u) => u.id === combat.activeUnitId
  );

  const weaponDef = activeUnit ? ITEMS[activeUnit.weapon] : null;
  const weaponStats = weaponDef?.weaponStats ?? null;

  const ownedWeapons = (
    [
      "rusty_machete",
      "revolver_38",
      "bolt_rifle_308",
      "coach_shotgun_12g",
      "carbine_556",
    ] as WeaponId[]
  ).filter((wId) => (state.inventory[wId] ?? 0) > 0);

  const hoveredEnemy = combat.units.find((u) => u.id === hoveredEnemyId);
  const shotPreview =
    activeUnit && hoveredEnemy && !hoveredEnemy.isPlayerTeam
      ? calculateShotPreview(
          combat,
          activeUnit,
          hoveredEnemy,
          combat.selectedFiringMode
        )
      : null;

  const spareAmmoCount =
    weaponStats?.ammoType ? state.inventory[weaponStats.ammoType] ?? 0 : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tactical-combat-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 backdrop-blur-md overflow-y-auto"
    >
      <div className="w-full max-w-6xl rounded-2xl border-2 border-amber-700/80 bg-stone-950 p-4 shadow-2xl">
        {/* Top Combat Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-red-400" />
              <h2
                id="tactical-combat-heading"
                className="text-lg font-bold text-amber-100"
              >
                Top-Down Tactical Combat — {combat.encounter.title}
              </h2>
              <span className="rounded bg-amber-950 border border-amber-700/60 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                Round {combat.roundNumber}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Click green-outlined tiles to move (1 AP per tile, 2 AP in sand).
              Click a red enemy tile to attack using Action Points (AP).
            </p>
          </div>

          {/* Active Unit Status & AP Bubbles */}
          {activeUnit && combat.outcome === "ongoing" && (
            <div className="flex items-center gap-4 rounded-xl border border-amber-800/60 bg-stone-900 px-4 py-2">
              <div>
                <div className="text-xs font-bold text-emerald-300">
                  Active Turn: {activeUnit.name} ({activeUnit.role})
                </div>
                <div className="text-xs text-stone-300">
                  HP:{" "}
                  <strong className="text-red-300">
                    {activeUnit.hp} / {activeUnit.maxHp}
                  </strong>{" "}
                  • Weapon:{" "}
                  <strong className="text-amber-300">{weaponDef?.name}</strong>{" "}
                  {weaponStats?.ammoType && (
                    <span>
                      (Mag: {activeUnit.currentMagAmmo}/
                      {weaponStats.magazineSize} | Reserve: {spareAmmoCount})
                    </span>
                  )}
                </div>
              </div>

              {/* Action Point Visual Orbs */}
              <div className="flex items-center gap-1">
                <Zap className="h-4 w-4 text-amber-400 mr-1" />
                {Array.from({ length: activeUnit.maxAp }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-3.5 w-3.5 rounded-full border ${
                      idx < activeUnit.ap
                        ? "bg-amber-400 border-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                        : "bg-stone-800 border-stone-700"
                    }`}
                  />
                ))}
                <span className="ml-1.5 font-mono text-xs font-bold text-amber-300">
                  {activeUnit.ap}/{activeUnit.maxAp} AP
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Main Grid + Controls Layout */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
          {/* 12x8 Top-Down Tactical Grid (Takes 3 columns on desktop) */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <div className="overflow-x-auto rounded-xl border border-amber-900/60 bg-stone-900 p-3">
              <div
                className="grid gap-1.5 mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${combat.gridWidth}, minmax(54px, 1fr))`,
                  minWidth: "680px",
                }}
              >
                {combat.tiles.map((row, y) =>
                  row.map((tile, x) => {
                    const unitOnTile = combat.units.find(
                      (u) => u.x === x && u.y === y && u.hp > 0 && !u.isFled
                    );

                    const distFromActive = activeUnit
                      ? getManhattanDistance(activeUnit.x, activeUnit.y, x, y)
                      : 999;

                    const canStepHere =
                      combat.outcome === "ongoing" &&
                      activeUnit?.isPlayerTeam &&
                      !unitOnTile &&
                      distFromActive === 1 &&
                      activeUnit.ap >= tile.moveApCost;

                    const isEnemyTile =
                      unitOnTile && !unitOnTile.isPlayerTeam;

                    return (
                      <button
                        key={`${x}_${y}`}
                        type="button"
                        onMouseEnter={() => {
                          if (isEnemyTile && unitOnTile) {
                            setHoveredEnemyId(unitOnTile.id);
                          }
                        }}
                        onMouseLeave={() => {
                          if (isEnemyTile) {
                            setHoveredEnemyId(null);
                          }
                        }}
                        onClick={() => {
                          if (combat.outcome !== "ongoing") return;
                          if (canStepHere) {
                            onMoveActiveUnit(x, y);
                          } else if (isEnemyTile && unitOnTile) {
                            onAttackTarget(unitOnTile.id);
                          }
                        }}
                        className={`relative flex h-16 flex-col items-center justify-between rounded-lg border p-1 text-[10px] transition ${
                          unitOnTile?.id === combat.activeUnitId
                            ? "border-2 border-emerald-400 bg-emerald-950/60 shadow-[0_0_12px_rgba(52,211,153,0.4)]"
                            : unitOnTile?.isPlayerTeam
                            ? "border-sky-500/80 bg-sky-950/50"
                            : isEnemyTile
                            ? "border-red-500/90 bg-red-950/50 hover:bg-red-900/70 cursor-crosshair"
                            : canStepHere
                            ? "border-emerald-600/60 bg-stone-950/90 hover:bg-emerald-950/40 cursor-pointer"
                            : tile.cover === "wagon"
                            ? "border-amber-600/60 bg-amber-950/40"
                            : tile.cover === "rocks" || tile.cover === "ruins"
                            ? "border-stone-600 bg-stone-800/80"
                            : tile.cover === "sand"
                            ? "border-yellow-900/50 bg-yellow-950/20"
                            : "border-stone-800/80 bg-stone-950/70"
                        }`}
                      >
                        {/* Top row: Coordinates or Cover badge */}
                        <div className="flex w-full items-center justify-between px-0.5 text-[9px] text-stone-400">
                          <span>
                            {x},{y}
                          </span>
                          {tile.defenseBonus > 0 && (
                            <span className="rounded bg-stone-900/90 px-1 text-amber-300 font-semibold">
                              🛡️{tile.defenseBonus}%
                            </span>
                          )}
                          {tile.moveApCost > 1 && (
                            <span className="text-yellow-400">2AP</span>
                          )}
                        </div>

                        {/* Center: Unit Token or Terrain Cover Icon */}
                        {unitOnTile ? (
                          <div className="flex flex-col items-center">
                            <span
                              className={`font-bold text-[11px] leading-tight truncate max-w-[52px] ${
                                unitOnTile.isPlayerTeam
                                  ? "text-emerald-200"
                                  : "text-red-200"
                              }`}
                            >
                              {unitOnTile.name.split(" ")[0]}
                            </span>
                            <span className="text-[9px] text-stone-300">
                              {unitOnTile.hp}/{unitOnTile.maxHp} HP
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-stone-500 font-medium">
                            {tile.cover === "wagon"
                              ? "🛒 Wagon"
                              : tile.cover === "rocks"
                              ? "🪨 Rocks"
                              : tile.cover === "ruins"
                              ? "🧱 Ruins"
                              : tile.cover === "sand"
                              ? "🏜️ Sand"
                              : canStepHere
                              ? "• 1 AP"
                              : ""}
                          </div>
                        )}

                        {/* Bottom HP Bar for units */}
                        {unitOnTile ? (
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
                            <div
                              className={`h-full ${
                                unitOnTile.isPlayerTeam
                                  ? "bg-emerald-400"
                                  : "bg-red-500"
                              }`}
                              style={{
                                width: `${Math.max(
                                  0,
                                  (unitOnTile.hp / unitOnTile.maxHp) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        ) : (
                          <div className="h-1" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Shot Accuracy Preview Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-800 bg-stone-900/90 px-4 py-2.5 text-xs">
              {shotPreview && hoveredEnemy ? (
                <div className="flex flex-wrap items-center gap-4">
                  <span className="font-bold text-amber-200">
                    🎯 Target: {hoveredEnemy.name} (Dist: {shotPreview.distance}{" "}
                    tiles)
                  </span>
                  {shotPreview.canAttack ? (
                    <>
                      <span className="rounded bg-emerald-950 border border-emerald-600/60 px-2 py-0.5 font-bold text-emerald-300">
                        Hit Chance: {shotPreview.hitChancePercent}%
                      </span>
                      <span className="text-red-300 font-semibold">
                        Est. Damage: {shotPreview.minDamage}–
                        {shotPreview.maxDamage} HP
                      </span>
                      <span className="text-amber-300 font-semibold">
                        Cost: {shotPreview.apCost} AP
                      </span>
                    </>
                  ) : (
                    <span className="text-red-400 font-bold">
                      Cannot Fire: {shotPreview.reason}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-stone-400">
                  💡 Hover over any red enemy unit on the grid to preview Hit
                  Chance %, Cover Penalty, Damage, and AP Cost before firing.
                </span>
              )}

              <div className="flex items-center gap-3 text-[11px] text-stone-400">
                <span>🛒 Wagon: -45% Hit</span>
                <span>🧱 Ruins: -35% Hit</span>
                <span>🪨 Rocks: -30% Hit</span>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Firing Modes, Actions & Combat Log */}
          <div className="flex flex-col justify-between gap-3">
            {combat.outcome === "ongoing" && activeUnit ? (
              <div className="rounded-xl border border-amber-900/60 bg-stone-900 p-3.5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Action Points (AP) & Firing Modes
                </h3>

                {/* Firing Mode Buttons */}
                <div className="space-y-1.5">
                  {weaponStats?.ammoType === null ? (
                    <button
                      type="button"
                      onClick={() => onSetFiringMode("melee")}
                      className="w-full flex items-center justify-between rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-stone-950 cursor-pointer"
                    >
                      <span>🗡️ Melee Cleave</span>
                      <span>{weaponStats.snapShotAp} AP (0 Ammo)</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onSetFiringMode("snap")}
                        className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-bold transition cursor-pointer ${
                          combat.selectedFiringMode === "snap"
                            ? "bg-amber-600 text-stone-950"
                            : "bg-stone-800 text-stone-200 hover:bg-stone-700"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Crosshair className="h-3.5 w-3.5" /> Snap Shot
                        </span>
                        <span>{weaponStats?.snapShotAp} AP</span>
                      </button>

                      {weaponStats?.aimedShotAp && (
                        <button
                          type="button"
                          onClick={() => onSetFiringMode("aimed")}
                          className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-bold transition cursor-pointer ${
                            combat.selectedFiringMode === "aimed"
                              ? "bg-amber-600 text-stone-950"
                              : "bg-stone-800 text-stone-200 hover:bg-stone-700"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <Crosshair className="h-3.5 w-3.5" /> Aimed Shot
                            (+22% Acc)
                          </span>
                          <span>{weaponStats.aimedShotAp} AP</span>
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Tactical Utility Actions */}
                <div className="space-y-1.5 border-t border-stone-800 pt-2.5">
                  {weaponStats?.ammoType && (
                    <button
                      type="button"
                      disabled={
                        activeUnit.ap < weaponStats.reloadAp ||
                        activeUnit.currentMagAmmo >=
                          weaponStats.magazineSize ||
                        spareAmmoCount <= 0
                      }
                      onClick={onReloadWeapon}
                      className="w-full flex items-center justify-between rounded-lg border border-sky-700/60 bg-sky-950/60 px-3 py-2 text-xs font-bold text-sky-200 hover:bg-sky-900 disabled:opacity-35 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5" /> Reload Magazine
                      </span>
                      <span>{weaponStats.reloadAp} AP</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={
                      activeUnit.ap < 3 ||
                      activeUnit.hp >= activeUnit.maxHp ||
                      (state.inventory.field_bandage ?? 0) <= 0
                    }
                    onClick={onUseFieldBandage}
                    className="w-full flex items-center justify-between rounded-lg border border-emerald-700/60 bg-emerald-950/60 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-900 disabled:opacity-35 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <HeartPulse className="h-3.5 w-3.5" /> Bandage (+30 HP,{" "}
                      {state.inventory.field_bandage ?? 0} left)
                    </span>
                    <span>3 AP</span>
                  </button>
                </div>

                {/* Quick Weapon Switch for Main Character */}
                {activeUnit.isMainCharacter && ownedWeapons.length > 1 && (
                  <div className="border-t border-stone-800 pt-2.5">
                    <span className="block text-[11px] font-semibold text-stone-400 mb-1.5">
                      Switch Weapon (1 AP):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {ownedWeapons.map((wId) => (
                        <button
                          key={wId}
                          type="button"
                          disabled={
                            activeUnit.weapon === wId || activeUnit.ap < 1
                          }
                          onClick={() => onSwitchCombatWeapon(wId)}
                          className={`rounded px-2 py-1 text-[11px] font-semibold cursor-pointer ${
                            activeUnit.weapon === wId
                              ? "bg-amber-900/70 text-amber-200"
                              : "bg-stone-800 text-stone-300 hover:bg-stone-700 disabled:opacity-40"
                          }`}
                        >
                          {ITEMS[wId].name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={onEndPlayerUnitTurn}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-bold uppercase tracking-wider text-stone-950 shadow-lg hover:bg-amber-400 transition cursor-pointer"
                >
                  <SkipForward className="h-4 w-4" /> End Unit Turn
                </button>
              </div>
            ) : (
              /* Combat Outcome Summary Card */
              <div className="rounded-xl border-2 border-amber-500 bg-stone-900 p-4 text-center space-y-3">
                <Trophy className="mx-auto h-10 w-10 text-amber-400" />
                <h3 className="text-lg font-bold text-amber-100">
                  {combat.outcome === "victory"
                    ? "Victory on the Wasteland!"
                    : "Caravan Overrun"}
                </h3>
                <p className="text-xs text-stone-300">
                  {combat.outcome === "victory"
                    ? `You defeated ${combat.encounter.enemyGroupName} and recovered $${combat.encounter.lootReward.cash} plus battlefield salvage!`
                    : "You were knocked unconscious, losing part of your script, but your donkey dragged you back to safety."}
                </p>
                <button
                  type="button"
                  onClick={onFinishCombat}
                  className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold uppercase text-stone-950 hover:bg-emerald-500 cursor-pointer"
                >
                  Collect Salvage & Return to Map
                </button>
              </div>
            )}

            {/* Tactical Combat Log */}
            <div className="flex-1 rounded-xl border border-stone-800 bg-stone-900/90 p-3">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase text-stone-400 mb-2">
                <Shield className="h-3.5 w-3.5 text-amber-400" />
                Tactical Action Log
              </h4>
              <div className="h-52 overflow-y-auto space-y-1.5 pr-1 text-xs font-mono">
                {combat.combatLog.map((entry, idx) => (
                  <div
                    key={idx}
                    className="rounded bg-stone-950/80 px-2 py-1 text-stone-300 border-l-2 border-amber-600/60"
                  >
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
