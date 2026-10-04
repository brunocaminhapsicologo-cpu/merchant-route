"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  TopDownCoverSprite,
  TopDownUnitSprite,
  WeaponSilhouette,
} from "@/assets/caravaneerSprites";
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
  onToggleCrouch: () => void;
  onReloadWeapon: () => void;
  onUseFieldBandage: () => void;
  onSwitchCombatWeapon: (weaponId: WeaponId) => void;
  onEndPlayerUnitTurn: () => void;
  onFinishCombat: () => void;
}

interface PendingAttackMeta {
  attackerX: number;
  attackerY: number;
  targetX: number;
  targetY: number;
  targetId: string;
  prevHp: number;
  mode: FiringMode;
  isRanged: boolean;
}

interface CombatAnimationEffect {
  id: number;
  attackerX: number;
  attackerY: number;
  targetX: number;
  targetY: number;
  floatingText: string;
  isHit: boolean;
  isCrit: boolean;
  isCripple: boolean;
  isRanged: boolean;
}

const ALL_WEAPON_IDS: WeaponId[] = [
  "rusty_machete",
  "cavalry_saber",
  "sledgehammer",
  "derringer_22",
  "revolver_38",
  "peacemaker_45",
  "coach_shotgun_12g",
  "pump_shotgun_12g",
  "varmint_rifle_22",
  "lever_repeater_38",
  "bolt_rifle_308",
  "grease_smg_9mm",
  "carbine_556",
  "sniper_rifle_762",
];

export const TacticalCombatModal: React.FC<TacticalCombatModalProps> = ({
  state,
  combat,
  onMoveActiveUnit,
  onAttackTarget,
  onSetFiringMode,
  onToggleCrouch,
  onReloadWeapon,
  onUseFieldBandage,
  onSwitchCombatWeapon,
  onEndPlayerUnitTurn,
  onFinishCombat,
}) => {
  const [hoveredEnemyId, setHoveredEnemyId] = useState<string | null>(null);
  const [animEffect, setAnimEffect] = useState<CombatAnimationEffect | null>(
    null
  );
  const pendingAttackRef = useRef<PendingAttackMeta | null>(null);

  const activeUnit: CombatUnit | undefined = combat.units.find(
    (u) => u.id === combat.activeUnitId
  );

  const weaponDef = activeUnit ? ITEMS[activeUnit.weapon] : null;
  const weaponStats = weaponDef?.weaponStats ?? null;

  const ownedWeapons = ALL_WEAPON_IDS.filter(
    (wId) => (state.inventory[wId] ?? 0) > 0
  );

  // Trigger visual combat animation when an attack resolves
  useEffect(() => {
    const pending = pendingAttackRef.current;
    if (!pending) return;
    pendingAttackRef.current = null;

    const updatedTarget = combat.units.find((u) => u.id === pending.targetId);
    const dmgDealt = Math.max(0, pending.prevHp - (updatedTarget?.hp ?? 0));
    const isHit = dmgDealt > 0;
    const isCrit = isHit && pending.mode === "headshot";
    const isCripple = isHit && pending.mode === "legshot";

    let floatingText = "MISS!";
    if (isCrit) {
      floatingText = `-${dmgDealt} CRIT!`;
    } else if (isCripple) {
      floatingText = "LEG CRIPPLED!";
    } else if (isHit) {
      floatingText = `-${dmgDealt} HP`;
    }

    setAnimEffect({
      id: Date.now(),
      attackerX: pending.attackerX,
      attackerY: pending.attackerY,
      targetX: pending.targetX,
      targetY: pending.targetY,
      floatingText,
      isHit,
      isCrit,
      isCripple,
      isRanged: pending.isRanged,
    });

    const timer = window.setTimeout(() => {
      setAnimEffect(null);
    }, 850);

    return () => window.clearTimeout(timer);
  }, [combat.units, combat.combatLog]);

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
              Click green-outlined tiles to move (1 AP per tile, 2 AP in sand;
              2x if legs crippled). Click a red enemy tile to attack using
              Action Points (AP).
            </p>
          </div>

          {/* Active Unit Status & AP Bubbles */}
          {activeUnit && combat.outcome === "ongoing" && (
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-800/60 bg-stone-900 px-4 py-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-20 rounded border border-stone-700 bg-stone-950/90 p-1">
                  <WeaponSilhouette
                    weaponId={activeUnit.weapon}
                    className="h-full w-full"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                    <span>
                      Active Turn: {activeUnit.name} ({activeUnit.role})
                    </span>
                    {activeUnit.isCrouched && (
                      <span className="rounded bg-amber-950 border border-amber-600/60 px-1.5 py-0.5 text-[10px] text-amber-300">
                        CROUCHED
                      </span>
                    )}
                    {activeUnit.crippledLegs && (
                      <span className="rounded bg-red-950 border border-red-600/60 px-1.5 py-0.5 text-[10px] text-red-300">
                        LEG CRIPPLED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-stone-300">
                    HP:{" "}
                    <strong className="text-red-300">
                      {activeUnit.hp} / {activeUnit.maxHp}
                    </strong>{" "}
                    • Weapon:{" "}
                    <strong className="text-amber-300">
                      {weaponDef?.name}
                    </strong>{" "}
                    {weaponStats?.ammoType && (
                      <span>
                        (Mag: {activeUnit.currentMagAmmo}/
                        {weaponStats.magazineSize} | Reserve: {spareAmmoCount})
                      </span>
                    )}
                  </div>
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
                className="relative grid gap-1.5 mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${combat.gridWidth}, minmax(54px, 1fr))`,
                  minWidth: "680px",
                }}
              >
                {/* Projectile Tracer & Muzzle Flash SVG Overlay */}
                {animEffect && (
                  <svg
                    viewBox={`0 0 ${combat.gridWidth * 100} ${
                      combat.gridHeight * 100
                    }`}
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-0 z-20 h-full w-full"
                  >
                    {/* Muzzle flash on attacker tile */}
                    <circle
                      cx={animEffect.attackerX * 100 + 50}
                      cy={animEffect.attackerY * 100 + 50}
                      r="34"
                      fill="rgba(251, 191, 36, 0.45)"
                      stroke="#fde047"
                      strokeWidth="4"
                    />
                    {/* Ballistic tracer line */}
                    {animEffect.isRanged && (
                      <line
                        x1={animEffect.attackerX * 100 + 50}
                        y1={animEffect.attackerY * 100 + 50}
                        x2={animEffect.targetX * 100 + 50}
                        y2={animEffect.targetY * 100 + 50}
                        stroke={
                          animEffect.isCrit
                            ? "#ef4444"
                            : animEffect.isHit
                            ? "#facc15"
                            : "#94a3b8"
                        }
                        strokeWidth={animEffect.isCrit ? "6" : "4"}
                        strokeDasharray="18 8"
                        strokeLinecap="round"
                      />
                    )}
                    {/* Impact burst on target tile */}
                    <circle
                      cx={animEffect.targetX * 100 + 50}
                      cy={animEffect.targetY * 100 + 50}
                      r={animEffect.isCrit ? "44" : "34"}
                      fill={
                        animEffect.isHit
                          ? "rgba(239, 68, 68, 0.42)"
                          : "rgba(148, 163, 184, 0.25)"
                      }
                      stroke={animEffect.isHit ? "#f87171" : "#cbd5e1"}
                      strokeWidth="4"
                    />
                  </svg>
                )}

                {combat.tiles.map((row, y) =>
                  row.map((tile, x) => {
                    const unitOnTile = combat.units.find(
                      (u) => u.x === x && u.y === y && u.hp > 0 && !u.isFled
                    );

                    const distFromActive = activeUnit
                      ? getManhattanDistance(activeUnit.x, activeUnit.y, x, y)
                      : 999;

                    const effectiveMoveCost =
                      tile.moveApCost * (activeUnit?.crippledLegs ? 2 : 1);

                    const canStepHere =
                      combat.outcome === "ongoing" &&
                      activeUnit?.isPlayerTeam &&
                      !unitOnTile &&
                      distFromActive === 1 &&
                      activeUnit.ap >= effectiveMoveCost;

                    const isEnemyTile =
                      unitOnTile && !unitOnTile.isPlayerTeam;

                    const isAttackerAnimTile =
                      animEffect &&
                      animEffect.attackerX === x &&
                      animEffect.attackerY === y;
                    const isTargetAnimTile =
                      animEffect &&
                      animEffect.targetX === x &&
                      animEffect.targetY === y;

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
                          } else if (isEnemyTile && unitOnTile && activeUnit) {
                            const preview = calculateShotPreview(
                              combat,
                              activeUnit,
                              unitOnTile,
                              combat.selectedFiringMode
                            );
                            if (preview.canAttack) {
                              pendingAttackRef.current = {
                                attackerX: activeUnit.x,
                                attackerY: activeUnit.y,
                                targetX: unitOnTile.x,
                                targetY: unitOnTile.y,
                                targetId: unitOnTile.id,
                                prevHp: unitOnTile.hp,
                                mode: combat.selectedFiringMode,
                                isRanged: weaponStats?.ammoType !== null,
                              };
                            }
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
                        {/* Floating Combat Feedback Popup on Target Tile */}
                        {isTargetAnimTile && animEffect && (
                          <div
                            className={`pointer-events-none absolute -top-3 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-extrabold shadow-lg animate-bounce ${
                              animEffect.isCrit
                                ? "bg-red-600 text-yellow-200 border border-yellow-300"
                                : animEffect.isCripple
                                ? "bg-amber-600 text-stone-950 border border-amber-200"
                                : animEffect.isHit
                                ? "bg-red-900/95 text-red-100 border border-red-400"
                                : "bg-stone-800/95 text-stone-300 border border-stone-500"
                            }`}
                          >
                            {animEffect.floatingText}
                          </div>
                        )}

                        {/* Muzzle Flash Badge on Attacker Tile */}
                        {isAttackerAnimTile && (
                          <div className="pointer-events-none absolute -top-2 right-0 z-30 rounded-full bg-amber-400 px-1 text-[9px] font-extrabold text-stone-950 shadow">
                            💥
                          </div>
                        )}

                        {/* Top row: Coordinates or Cover badge */}
                        <div className="z-10 flex w-full items-center justify-between px-0.5 text-[9px] text-stone-400">
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

                        {/* Background Cover Sprite when unit is also standing on cover */}
                        {unitOnTile && tile.cover !== "none" && (
                          <div className="pointer-events-none absolute inset-1 opacity-30">
                            <TopDownCoverSprite
                              cover={tile.cover}
                              className="h-full w-full"
                            />
                          </div>
                        )}

                        {/* Center: Top-Down Unit Sprite or Top-Down Terrain Cover Sprite */}
                        {unitOnTile ? (
                          <div className="z-10 flex items-center gap-1">
                            <div className="h-8 w-8 shrink-0">
                              <TopDownUnitSprite
                                isPlayerTeam={unitOnTile.isPlayerTeam}
                                weaponId={unitOnTile.weapon}
                                isCrouched={unitOnTile.isCrouched}
                                crippledLegs={unitOnTile.crippledLegs}
                                isActive={unitOnTile.id === combat.activeUnitId}
                                className="h-full w-full"
                              />
                            </div>
                            <div className="flex flex-col items-start leading-none">
                              <span
                                className={`font-bold text-[10px] truncate max-w-[36px] ${
                                  unitOnTile.isPlayerTeam
                                    ? "text-emerald-200"
                                  : "text-red-200"
                                }`}
                              >
                                {unitOnTile.name.split(" ")[0]}
                              </span>
                              <span className="text-[8px] text-stone-300">
                                {unitOnTile.hp}HP
                              </span>
                            </div>
                          </div>
                        ) : tile.cover !== "none" ? (
                          <div className="flex flex-col items-center justify-center">
                            <div className="h-7 w-7">
                              <TopDownCoverSprite
                                cover={tile.cover}
                                className="h-full w-full"
                              />
                            </div>
                            {canStepHere && (
                              <span className="text-[8px] text-emerald-300 font-semibold">
                                • {effectiveMoveCost} AP
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-stone-500 font-medium">
                            {canStepHere ? `• ${effectiveMoveCost} AP` : ""}
                          </div>
                        )}

                        {/* Bottom HP Bar for units */}
                        {unitOnTile ? (
                          <div className="z-10 h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
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
                <span>🦵 Crouch: -15% Hit</span>
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
                      <span>🗡️ Melee Strike ({weaponDef?.name})</span>
                      <span>{weaponStats.snapShotAp} AP (0 Ammo)</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onSetFiringMode("snap")}
                        className={`w-full flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                          combat.selectedFiringMode === "snap"
                            ? "bg-amber-600 text-stone-950"
                            : "bg-stone-800 text-stone-200 hover:bg-stone-700"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Crosshair className="h-3.5 w-3.5" /> Snap Shot (1.0x)
                        </span>
                        <span>{weaponStats?.snapShotAp} AP</span>
                      </button>

                      {weaponStats?.aimedShotAp && (
                        <button
                          type="button"
                          onClick={() => onSetFiringMode("aimed")}
                          className={`w-full flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                            combat.selectedFiringMode === "aimed"
                              ? "bg-amber-600 text-stone-950"
                              : "bg-stone-800 text-stone-200 hover:bg-stone-700"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <Crosshair className="h-3.5 w-3.5" /> Aimed Shot
                            (+22% Acc, 1.2x)
                          </span>
                          <span>{weaponStats.aimedShotAp} AP</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onSetFiringMode("headshot")}
                        className={`w-full flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                          combat.selectedFiringMode === "headshot"
                            ? "bg-red-600 text-white"
                            : "bg-stone-800 text-stone-200 hover:bg-stone-700"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          🎯 Headshot (1.9x Crit, -18% Acc)
                        </span>
                        <span>
                          {(weaponStats?.aimedShotAp ??
                            weaponStats?.snapShotAp ??
                            3) + 1}{" "}
                          AP
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSetFiringMode("legshot")}
                        className={`w-full flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                          combat.selectedFiringMode === "legshot"
                            ? "bg-amber-600 text-stone-950"
                            : "bg-stone-800 text-stone-200 hover:bg-stone-700"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          🦵 Leg Cripple (0.85x, -2 AP)
                        </span>
                        <span>
                          {weaponStats?.aimedShotAp ??
                            (weaponStats?.snapShotAp ?? 3) + 1}{" "}
                          AP
                        </span>
                      </button>
                    </>
                  )}
                </div>

                {/* Tactical Stance & Utility Actions */}
                <div className="space-y-1.5 border-t border-stone-800 pt-2.5">
                  <button
                    type="button"
                    disabled={activeUnit.ap < 2}
                    onClick={onToggleCrouch}
                    className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-bold transition cursor-pointer disabled:opacity-35 ${
                      activeUnit.isCrouched
                        ? "border-amber-500 bg-amber-950/70 text-amber-200"
                        : "border-stone-700 bg-stone-800/90 text-stone-200 hover:bg-stone-700"
                    }`}
                  >
                    <span>
                      {activeUnit.isCrouched
                        ? "🛡️ Stand Up (Crouched: +15% Def)"
                        : "🦵 Toggle Crouch (2 AP)"}
                    </span>
                    <span>2 AP</span>
                  </button>

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
                    <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                      {ownedWeapons.map((wId) => (
                        <button
                          key={wId}
                          type="button"
                          disabled={
                            activeUnit.weapon === wId || activeUnit.ap < 1
                          }
                          onClick={() => onSwitchCombatWeapon(wId)}
                          className={`flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-semibold cursor-pointer ${
                            activeUnit.weapon === wId
                              ? "bg-amber-900/70 text-amber-200 border border-amber-600/50"
                              : "bg-stone-800 text-stone-300 hover:bg-stone-700 disabled:opacity-40"
                          }`}
                        >
                          <span className="h-3.5 w-8 shrink-0">
                            <WeaponSilhouette
                              weaponId={wId}
                              className="h-full w-full"
                            />
                          </span>
                          <span>{ITEMS[wId].name}</span>
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
