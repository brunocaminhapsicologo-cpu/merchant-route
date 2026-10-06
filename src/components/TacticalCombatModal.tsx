"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  TopDownCoverSprite,
  WeaponSilhouette,
} from "@/assets/caravaneerSprites";
import {
  calculateShotPreview,
  findCombatPath,
  getManhattanDistance,
} from "@/domain/combatEngine";
import {
  CombatState,
  CombatUnit,
  FiringMode,
  GameState,
  WeaponId,
} from "@/domain/types";
import { CombatUnitLayer } from "./CombatUnitLayer";
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
  onUseAntibiotics?: () => void;
  onSwitchCombatWeapon: (weaponId: WeaponId) => void;
  onEndPlayerUnitTurn: () => void;
  onFinishCombat: () => void;
  onAnimationBusyChange?: (busy: boolean) => void;
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
  onUseAntibiotics,
  onSwitchCombatWeapon,
  onEndPlayerUnitTurn,
  onFinishCombat,
  onAnimationBusyChange,
}) => {
  const [hoveredEnemyId, setHoveredEnemyId] = useState<string | null>(null);
  const [animEffect, setAnimEffect] = useState<CombatAnimationEffect | null>(
    null
  );
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);
  const [animationBusy, setAnimationBusy] = useState(false);
  const animationBusyRef = useRef(false);
  const externalBusyRef = useRef(onAnimationBusyChange);
  externalBusyRef.current = onAnimationBusyChange;
  const handleAnimationBusyChange = useCallback((busy: boolean) => {
    animationBusyRef.current = busy;
    setAnimationBusy(busy);
    externalBusyRef.current?.(busy);
  }, []);
  const effectSequence = useRef(0);
  // Accept the logistics extension without requiring its concurrent type change.
  const terrainState = state as GameState & {
    travelState?: { terrain?: string } | null;
    exploration?: { terrain?: string } | null;
  };
  const terrain = terrainState.travelState?.terrain ?? terrainState.exploration?.terrain ?? "desert";
  const landscape = /rock|mountain|canyon/i.test(terrain)
    ? { base: "#9b8060", accent: "#665f50", label: "Rocky pass" }
    : /highway|road/i.test(terrain)
    ? { base: "#b8a17c", accent: "#747169", label: "Abandoned highway" }
    : /scorched|flat/i.test(terrain)
    ? { base: "#b49576", accent: "#7e634e", label: "Scorched flats" }
    : /ruin|urban|city/i.test(terrain)
    ? { base: "#a3987a", accent: "#676453", label: "Ruined outskirts" }
    : /grass|plain|oasis|forest/i.test(terrain)
    ? { base: "#aba575", accent: "#687446", label: "Dry scrubland" }
    : { base: "#c6a76e", accent: "#ae884f", label: "Open dunes" };
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
      id: ++effectSequence.current,
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

  }, [combat.units, combat.combatLog]);

  // Own the expiry separately: unrelated combat updates must not cancel it.
  useEffect(() => {
    if (!animEffect) return;
    const timer = window.setTimeout(() => setAnimEffect(null), 850);
    return () => window.clearTimeout(timer);
  }, [animEffect]);

  const selectedEnemy = combat.units.find(u => u.id === selectedEnemyId && u.hp > 0 && !u.isFled && !u.isPlayerTeam);
  const hoveredEnemy = combat.units.find(u => u.id === hoveredEnemyId && u.hp > 0 && !u.isFled && !u.isPlayerTeam) ?? selectedEnemy;
  const shotPreview = activeUnit?.isPlayerTeam && hoveredEnemy
    ? calculateShotPreview(combat, activeUnit, hoveredEnemy, combat.selectedFiringMode)
    : null;
  const selectedShotPreview = activeUnit?.isPlayerTeam && selectedEnemy
    ? calculateShotPreview(combat, activeUnit, selectedEnemy, combat.selectedFiringMode)
    : null;

  const confirmAttack = () => {
    if (animationBusyRef.current || combat.outcome !== "ongoing" || !activeUnit?.isPlayerTeam || !selectedEnemy) return;
    const preview = calculateShotPreview(combat, activeUnit, selectedEnemy, combat.selectedFiringMode);
    if (!preview.canAttack) return;
    pendingAttackRef.current = {
      attackerX: activeUnit.x, attackerY: activeUnit.y,
      targetX: selectedEnemy.x, targetY: selectedEnemy.y,
      targetId: selectedEnemy.id, prevHp: selectedEnemy.hp,
      mode: combat.selectedFiringMode, isRanged: weaponStats?.ammoType != null,
    };
    onAttackTarget(selectedEnemy.id);
  };

  const spareAmmoCount =
    weaponStats?.ammoType ? state.inventory[weaponStats.ammoType] ?? 0 : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tactical-combat-heading"
      className="fixed inset-0 z-50 flex h-screen max-h-screen w-screen flex-col overflow-hidden bg-stone-950 p-2 select-none"
    >
      {/* Top Compact Combat Header Bar */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-1.5 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <Swords className="h-4 w-4 text-red-400 shrink-0" />
          <h2
            id="tactical-combat-heading"
            className="text-sm font-bold text-amber-100"
          >
            {combat.encounter.title}
          </h2>
          <span className="rounded bg-amber-950 border border-amber-700/60 px-2 py-0.5 text-[11px] font-bold text-amber-300">
            Round {combat.roundNumber}
          </span>
          <span className="rounded bg-stone-900 border border-stone-700 px-2 py-0.5 text-[10px] font-mono text-stone-300">
            {landscape.label} ({combat.gridWidth}×{combat.gridHeight})
          </span>
          <span className="hidden xl:inline text-[11px] text-stone-400">
            Pistolas/Escopetas: Curto (3–9) · Rifles/Carabinas: Médio (8–16) · Sniper: Longo (14–25)
          </span>
        </div>

        {/* Active Unit Status & AP Bubbles */}
        {activeUnit && combat.outcome === "ongoing" && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-800/60 bg-stone-900 px-3 py-1">
            <div className="flex items-center gap-2">
              <div className="h-7 w-16 rounded border border-stone-700 bg-stone-950/90 p-0.5 shrink-0">
                <WeaponSilhouette
                  weaponId={activeUnit.weapon}
                  className="h-full w-full"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 leading-tight">
                  <span>
                    {activeUnit.name} ({activeUnit.role})
                  </span>
                  {activeUnit.isCrouched && (
                    <span className="rounded bg-amber-950 border border-amber-600/60 px-1 py-0 text-[9px] text-amber-300">
                      CROUCHED
                    </span>
                  )}
                  {activeUnit.crippledLegs && (
                    <span className="rounded bg-red-950 border border-red-600/60 px-1 py-0 text-[9px] text-red-300">
                      CRIPPLED
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-stone-300 leading-tight">
                  HP:{" "}
                  <strong className="text-red-300">
                    {activeUnit.hp}/{activeUnit.maxHp}
                  </strong>{" "}
                  •{" "}
                  <strong className="text-amber-300">
                    {weaponDef?.name}
                  </strong>{" "}
                  {weaponStats && (
                    <span className="text-sky-300 font-mono text-[10px]">
                      [Alcance: {weaponStats.optimalRangeTiles} ideal / {weaponStats.maxRangeTiles} máx]
                    </span>
                  )}{" "}
                  {weaponStats?.ammoType && (
                    <span className="text-stone-400">
                      (Mag: {activeUnit.currentMagAmmo}/{weaponStats.magazineSize} | Res: {spareAmmoCount})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Point Visual Orbs */}
            <div className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-amber-400 mr-0.5" />
              {Array.from({ length: activeUnit.maxAp }).map((_, idx) => (
                <span
                  key={idx}
                  className={`h-3 w-3 rounded-full border ${
                    idx < activeUnit.ap
                      ? "bg-amber-400 border-amber-200 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                      : "bg-stone-800 border-stone-700"
                  }`}
                />
              ))}
              <span className="ml-1 font-mono text-[11px] font-bold text-amber-300">
                {activeUnit.ap}/{activeUnit.maxAp} AP
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid + Right Sidebar Layout (Flex-1, Zero Scroll) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_290px] gap-2 pt-1.5 overflow-hidden">
        {/* Left Stage: 20x12 Top-Down Tactical Grid + Shot Preview Bar */}
        <div className="flex flex-col min-h-0 gap-1.5 overflow-hidden">
          <div className="flex-1 min-h-0 flex items-center justify-center rounded-xl border border-amber-900/60 bg-stone-900 p-1.5 overflow-hidden">
            <div
              className="relative grid h-full w-full isolate rounded-lg overflow-hidden"
              style={{
                gridTemplateColumns: `repeat(${combat.gridWidth}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${combat.gridHeight}, minmax(0, 1fr))`,
                backgroundColor: landscape.base,
                backgroundImage: `radial-gradient(ellipse at 18% 25%, ${landscape.accent}75 0%, transparent 42%), radial-gradient(ellipse at 82% 70%, ${landscape.accent}90 0%, transparent 35%), repeating-linear-gradient(165deg, transparent 0px, transparent 23px, #fff3 24px, transparent 26px)`,
              }}
            >
              {/highway|road/i.test(terrain) && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-lg"
                  style={{
                    background:
                      "linear-gradient(115deg, transparent 30%, #5d5b5260 31%, #65635990 48%, #ddcdaa55 49%, #65635990 50%, #5d5b5260 66%, transparent 67%)",
                  }}
                />
              )}
              <CombatUnitLayer
                units={combat.units}
                gridWidth={combat.gridWidth}
                gridHeight={combat.gridHeight}
                activeUnitId={combat.activeUnitId}
                selectedUnitId={selectedEnemyId}
                onAnimationBusyChange={handleAnimationBusyChange}
              />
              {/* Projectile Tracer & Muzzle Flash SVG Overlay */}
              {animEffect && (
                <svg
                  key={animEffect.id}
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
                    ((distFromActive === 1 && activeUnit.ap >= effectiveMoveCost) ||
                      findCombatPath(
                        combat,
                        { x: activeUnit.x, y: activeUnit.y },
                        { x, y },
                        activeUnit
                      ).path.length > 0) &&
                    activeUnit.ap >= effectiveMoveCost;

                  const isEnemyTile = unitOnTile && !unitOnTile.isPlayerTeam;
                  const inOptimalRange =
                    weaponStats &&
                    distFromActive > 0 &&
                    distFromActive <= weaponStats.optimalRangeTiles;
                  const inMaxRange =
                    weaponStats &&
                    distFromActive > weaponStats.optimalRangeTiles &&
                    distFromActive <= weaponStats.maxRangeTiles;

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
                      onFocus={() =>
                        setHoveredEnemyId(
                          isEnemyTile && unitOnTile ? unitOnTile.id : null
                        )
                      }
                      onBlur={() => setHoveredEnemyId(null)}
                      aria-label={
                        unitOnTile
                          ? `${unitOnTile.name}, ${unitOnTile.hp} HP, tile ${x}, ${y}${
                              isEnemyTile ? ", select target" : ""
                            }`
                          : `Tile ${x}, ${y}, ${tile.cover}, ${effectiveMoveCost} AP${
                              canStepHere ? ", move here" : ""
                            }`
                      }
                      aria-pressed={
                        isEnemyTile
                          ? unitOnTile?.id === selectedEnemyId
                          : undefined
                      }
                      onClick={() => {
                        if (
                          combat.outcome !== "ongoing" ||
                          animationBusyRef.current ||
                          !activeUnit?.isPlayerTeam
                        )
                          return;
                        if (canStepHere) onMoveActiveUnit(x, y);
                        else if (isEnemyTile && unitOnTile)
                          setSelectedEnemyId(unitOnTile.id);
                      }}
                      className={`mr-combat-tile relative flex h-full w-full min-h-0 min-w-0 flex-col items-center justify-between border p-0.5 text-[9px] ${
                        unitOnTile?.id === selectedEnemyId
                          ? "ring-2 ring-inset ring-amber-300 bg-amber-300/20 border-amber-400"
                          : isEnemyTile
                          ? inOptimalRange
                            ? "border-red-500/70 bg-red-500/15 hover:bg-red-400/30 cursor-crosshair"
                            : inMaxRange
                            ? "border-amber-500/60 bg-amber-500/10 hover:bg-amber-400/25 cursor-crosshair"
                            : "border-stone-700/50 hover:bg-red-300/20 cursor-crosshair"
                          : canStepHere
                          ? "border-emerald-900/45 hover:bg-emerald-200/25 cursor-pointer"
                          : inOptimalRange
                          ? "border-sky-900/25"
                          : "border-stone-900/15"
                      }`}
                    >
                      {/* Floating Combat Feedback Popup on Target Tile */}
                      {isTargetAnimTile && animEffect && (
                        <div
                          key={animEffect.id}
                          className={`pointer-events-none absolute -top-2.5 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded px-1 py-0.5 text-[9px] font-extrabold shadow-lg mr-combat-feedback ${
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
                        <div className="pointer-events-none absolute -top-1.5 right-0 z-30 rounded-full bg-amber-400 px-1 text-[8px] font-extrabold text-stone-950 shadow">
                          💥
                        </div>
                      )}

                      {/* Top row: Coordinates or Cover badge */}
                      <div className="z-10 flex w-full items-center justify-between px-0.5 text-[7px] leading-none font-semibold text-stone-800/80">
                        <span>
                          {x},{y}
                        </span>
                        {tile.defenseBonus > 0 && (
                          <span className="rounded bg-stone-900/90 px-0.5 py-0.5 text-[7px] text-amber-300 font-bold">
                            🛡️{tile.defenseBonus}%
                          </span>
                        )}
                        {tile.moveApCost > 1 && !tile.defenseBonus && (
                          <span className="rounded bg-stone-950/80 px-0.5 text-[7px] text-amber-200">
                            {effectiveMoveCost}AP
                          </span>
                        )}
                      </div>

                      {/* Terrain stays on its tile; moving units live above the board. */}
                      {tile.cover !== "none" && (
                        <div
                          className={`pointer-events-none absolute inset-0.5 flex items-center justify-center ${
                            unitOnTile ? "opacity-55" : ""
                          }`}
                        >
                          <TopDownCoverSprite
                            cover={tile.cover}
                            className={
                              tile.cover === "wagon" || tile.cover === "ruins"
                                ? "h-[72%] w-[82%] max-h-12 drop-shadow-md"
                                : "h-[65%] w-[65%] max-h-9 max-w-9 drop-shadow-md"
                            }
                          />
                        </div>
                      )}
                      {canStepHere && distFromActive === 1 && (
                        <span className="z-10 rounded bg-emerald-950/85 px-1 text-[7px] leading-tight font-bold text-emerald-100">
                          {effectiveMoveCost}AP
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Compact Shot Accuracy Preview & Confirm Bar */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-800 bg-stone-900/95 px-3 py-1.5 text-xs">
            {shotPreview && hoveredEnemy ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold text-amber-200">
                  🎯 {hoveredEnemy.name} (Dist: {shotPreview.distance} tiles
                  {weaponStats
                    ? ` | Ideal ≤${weaponStats.optimalRangeTiles}, Máx ${weaponStats.maxRangeTiles}`
                    : ""}
                  )
                </span>
                {shotPreview.canAttack ? (
                  <>
                    <span className="rounded bg-emerald-950 border border-emerald-600/60 px-2 py-0.5 font-bold text-emerald-300">
                      Chance: {shotPreview.hitChancePercent}%
                    </span>
                    <span className="text-red-300 font-semibold">
                      Dano: {shotPreview.minDamage}–{shotPreview.maxDamage} HP
                    </span>
                    <span className="text-amber-300 font-semibold">
                      Custo: {shotPreview.apCost} AP
                    </span>
                  </>
                ) : (
                  <span className="text-red-400 font-bold">
                    Fora de Condição: {shotPreview.reason}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-stone-400 text-[11px]">
                {animationBusy
                  ? "Resolvendo movimento / impacto…"
                  : "Clique no mapa para mover ou selecione um inimigo para ver precisão, alcance e confirmar disparo."}
              </span>
            )}

            <div className="flex items-center gap-3">
              <div className="hidden xl:flex items-center gap-2 text-[10px] text-stone-400">
                <span>🛒 Carroça: -45%</span>
                <span>🧱 Ruínas: -35%</span>
                <span>🪨 Rochas: -30%</span>
                <span>🦵 Agachado: -15%</span>
              </div>
              <button
                type="button"
                onClick={confirmAttack}
                onMouseEnter={() => setHoveredEnemyId(null)}
                onFocus={() => setHoveredEnemyId(null)}
                disabled={
                  animationBusy ||
                  combat.outcome !== "ongoing" ||
                  !activeUnit?.isPlayerTeam ||
                  !selectedEnemy ||
                  !selectedShotPreview?.canAttack
                }
                className="rounded-lg bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-300 disabled:opacity-40 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-100"
              >
                {weaponStats?.ammoType === null
                  ? "Confirmar Golpe"
                  : "Confirmar Disparo"}
                {selectedEnemy ? ` · ${selectedEnemy.name}` : ""}
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Compact Firing Modes, Actions & Scrollable Combat Log */}
        <div className="flex flex-col min-h-0 gap-2 overflow-hidden">
          {combat.outcome === "ongoing" && activeUnit ? (
            <fieldset
              disabled={animationBusy || !activeUnit.isPlayerTeam}
              className="shrink-0 rounded-xl border border-amber-900/60 bg-stone-900 p-2.5 space-y-2 disabled:opacity-60"
            >
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                Modos de Tiro & Ações (AP)
              </h3>

              {/* Firing Mode Buttons */}
              <div className="space-y-1">
                {weaponStats?.ammoType === null ? (
                  <button
                    type="button"
                    onClick={() => onSetFiringMode("melee")}
                    className="w-full flex items-center justify-between rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-bold text-stone-950 cursor-pointer"
                  >
                    <span>🗡️ Melee ({weaponDef?.name})</span>
                    <span>{weaponStats.snapShotAp} AP</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onSetFiringMode("snap")}
                      className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                        combat.selectedFiringMode === "snap"
                          ? "bg-amber-600 text-stone-950"
                          : "bg-stone-800 text-stone-200 hover:bg-stone-700"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Crosshair className="h-3 w-3" /> Snap Shot (1.0x)
                      </span>
                      <span>{weaponStats?.snapShotAp} AP</span>
                    </button>

                    {weaponStats?.aimedShotAp && (
                      <button
                        type="button"
                        onClick={() => onSetFiringMode("aimed")}
                        className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                          combat.selectedFiringMode === "aimed"
                            ? "bg-amber-600 text-stone-950"
                            : "bg-stone-800 text-stone-200 hover:bg-stone-700"
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <Crosshair className="h-3 w-3" /> Aimed (+22% Acc, 1.2x)
                        </span>
                        <span>{weaponStats.aimedShotAp} AP</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onSetFiringMode("headshot")}
                      className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                        combat.selectedFiringMode === "headshot"
                          ? "bg-red-600 text-white"
                          : "bg-stone-800 text-stone-200 hover:bg-stone-700"
                      }`}
                    >
                      <span className="flex items-center gap-1">
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
                      className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                        combat.selectedFiringMode === "legshot"
                          ? "bg-amber-600 text-stone-950"
                          : "bg-stone-800 text-stone-200 hover:bg-stone-700"
                      }`}
                    >
                      <span className="flex items-center gap-1">
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
              <div className="space-y-1 border-t border-stone-800 pt-1.5">
                <button
                  type="button"
                  disabled={activeUnit.ap < 2}
                  onClick={onToggleCrouch}
                  className={`w-full flex items-center justify-between rounded-lg border px-2.5 py-1 text-[11px] font-bold transition cursor-pointer disabled:opacity-35 ${
                    activeUnit.isCrouched
                      ? "border-amber-500 bg-amber-950/70 text-amber-200"
                      : "border-stone-700 bg-stone-800/90 text-stone-200 hover:bg-stone-700"
                  }`}
                >
                  <span>
                    {activeUnit.isCrouched
                      ? "🛡️ Stand Up (+15% Def)"
                      : "🦵 Toggle Crouch"}
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
                    className="w-full flex items-center justify-between rounded-lg border border-sky-700/60 bg-sky-950/60 px-2.5 py-1 text-[11px] font-bold text-sky-200 hover:bg-sky-900 disabled:opacity-35 cursor-pointer"
                  >
                    <span className="flex items-center gap-1">
                      <RotateCcw className="h-3 w-3" /> Reload Magazine
                    </span>
                    <span>{weaponStats.reloadAp} AP</span>
                  </button>
                )}

                <div className="grid grid-cols-1 gap-1">
                  <button
                    type="button"
                    disabled={
                      activeUnit.ap < 3 ||
                      activeUnit.hp >= activeUnit.maxHp ||
                      (state.inventory.field_bandage ?? 0) <= 0
                    }
                    onClick={onUseFieldBandage}
                    className="w-full flex items-center justify-between rounded-lg border border-emerald-700/60 bg-emerald-950/60 px-2.5 py-1 text-[11px] font-bold text-emerald-200 hover:bg-emerald-900 disabled:opacity-35 cursor-pointer"
                  >
                    <span className="flex items-center gap-1">
                      <HeartPulse className="h-3 w-3" /> Bandage (+30 HP,{" "}
                      {state.inventory.field_bandage ?? 0})
                    </span>
                    <span>3 AP</span>
                  </button>
                  {(state.inventory.antibiotics ?? 0) > 0 && (
                    <button
                      type="button"
                      disabled={
                        activeUnit.ap < 3 ||
                        activeUnit.hp >= activeUnit.maxHp
                      }
                      onClick={onUseAntibiotics ?? onUseFieldBandage}
                      className="w-full flex items-center justify-between rounded-lg border border-teal-700/60 bg-teal-950/60 px-2.5 py-1 text-[11px] font-bold text-teal-200 hover:bg-teal-900 disabled:opacity-35 cursor-pointer"
                    >
                      <span className="flex items-center gap-1">
                        <HeartPulse className="h-3 w-3" /> Antibiotics (+50 HP,{" "}
                        {state.inventory.antibiotics ?? 0})
                      </span>
                      <span>3 AP</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Weapon Switch for Main Character */}
              {activeUnit.isMainCharacter && ownedWeapons.length > 1 && (
                <div className="border-t border-stone-800 pt-1.5">
                  <span className="block text-[10px] font-semibold text-stone-400 mb-1">
                    Trocar Arma (1 AP):
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {ownedWeapons.map((wId) => (
                      <button
                        key={wId}
                        type="button"
                        disabled={
                          activeUnit.weapon === wId || activeUnit.ap < 1
                        }
                        onClick={() => onSwitchCombatWeapon(wId)}
                        className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer ${
                          activeUnit.weapon === wId
                            ? "bg-amber-900/70 text-amber-200 border border-amber-600/50"
                            : "bg-stone-800 text-stone-300 hover:bg-stone-700 disabled:opacity-40"
                        }`}
                      >
                        <span className="h-3 w-6 shrink-0">
                          <WeaponSilhouette
                            weaponId={wId}
                            className="h-full w-full"
                          />
                        </span>
                        <span className="truncate max-w-28">{ITEMS[wId].name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={onEndPlayerUnitTurn}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 py-1.5 text-xs font-bold uppercase tracking-wider text-stone-950 shadow hover:bg-amber-400 transition cursor-pointer"
              >
                <SkipForward className="h-3.5 w-3.5" /> Encerrar Turno
              </button>
            </fieldset>
          ) : combat.outcome !== "ongoing" ? (
            /* Combat Outcome Summary Card */
            <div className="shrink-0 rounded-xl border-2 border-amber-500 bg-stone-900 p-3 text-center space-y-2">
              <Trophy className="mx-auto h-8 w-8 text-amber-400" />
              <h3 className="text-base font-bold text-amber-100">
                {combat.outcome === "victory"
                  ? "Vitória no Deserto!"
                  : "Caravana Derrotada"}
              </h3>
              <p className="text-xs text-stone-300">
                {combat.outcome === "victory"
                  ? `Você derrotou ${combat.encounter.enemyGroupName} e recuperou $${combat.encounter.lootReward.cash} mais espólios!`
                  : "Sua caravana foi abatida. Retorne ao mapa para avaliar perdas e se recuperar."}
              </p>
              <button
                type="button"
                onClick={onFinishCombat}
                disabled={animationBusy}
                className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold uppercase text-stone-950 hover:bg-emerald-500 cursor-pointer"
              >
                {combat.outcome === "victory"
                  ? "Coletar Espólios & Voltar ao Mapa"
                  : "Voltar ao Mapa"}
              </button>
            </div>
          ) : (
            <p className="shrink-0 text-xs text-stone-300">
              Aguardando ação da próxima unidade…
            </p>
          )}

          {/* Tactical Combat Log (Flex-1 Scrollable Internally) */}
          <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-stone-800 bg-stone-900/90 p-2.5 overflow-hidden">
            <h4 className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold uppercase text-stone-400 mb-1.5">
              <Shield className="h-3 w-3 text-amber-400" />
              Log de Combate Tático
            </h4>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1 text-[11px] font-mono">
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
  );
};
