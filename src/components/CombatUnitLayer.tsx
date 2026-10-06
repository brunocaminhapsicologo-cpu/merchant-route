"use client";

import React, { useEffect, useRef, useState } from "react";
import { TopDownUnitSprite } from "@/assets/caravaneerSprites";
import { CombatUnit } from "@/domain/types";

const MOTION_MS = 420;

function UnitVisual({ unit, active, selected }: {
  unit: CombatUnit; active: boolean; selected: boolean;
}) {
  const spriteRef = useRef<HTMLDivElement>(null);
  const previousHp = useRef(unit.hp);
  const [damage, setDamage] = useState(0);
  const [visible, setVisible] = useState(unit.hp > 0 && !unit.isFled);

  useEffect(() => {
    const lostHp = Math.max(0, previousHp.current - unit.hp);
    previousHp.current = unit.hp;
    let animation: Animation | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (lostHp > 0) {
      setDamage(lostHp);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // Restart an impact on every HP change without remounting the moving unit.
      animation = spriteRef.current?.animate(
        reduced ? [{ opacity: 0.5 }, { opacity: 1 }] : [
          { transform: "translateX(0)", filter: "brightness(1)" },
          { transform: "translateX(-5px) rotate(-4deg)", filter: "brightness(2) sepia(1) saturate(4)" },
          { transform: "translateX(3px)", filter: "brightness(1.4)" },
          { transform: "translateX(0)", filter: "brightness(1)" },
        ], { duration: reduced ? 120 : MOTION_MS, easing: "ease-out" }
      );
      timer = setTimeout(() => {
        setDamage(0);
        setVisible(unit.hp > 0 && !unit.isFled);
      }, MOTION_MS);
    } else {
      setDamage(0);
      setVisible(unit.hp > 0 && !unit.isFled);
    }
    return () => { animation?.cancel(); if (timer) clearTimeout(timer); };
  }, [unit.hp, unit.isFled]);

  return (
    <div className="mr-combat-unit absolute flex flex-col items-center justify-center" style={{
      left: `${unit.x * 100}%`, top: `${unit.y * 100}%`,
      width: "100%", height: "100%", opacity: visible ? 1 : 0,
    }}>
      <div ref={spriteRef} className="relative h-11 w-11 rounded-full" style={{
        boxShadow: selected ? "0 0 0 2px #fbbf24, 0 0 18px #fbbf2470" : active ? "0 0 0 2px #34d399" : undefined,
        background: unit.isPlayerTeam ? "#064e3b55" : "#7f1d1d55",
      }}>
        <TopDownUnitSprite isPlayerTeam={unit.isPlayerTeam} weaponId={unit.weapon}
          isCrouched={unit.isCrouched} crippledLegs={unit.crippledLegs} isActive={active} className="h-full w-full" />
        {damage > 0 && <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-red-950 px-1 text-xs font-bold text-red-100">−{damage} HP</span>}
      </div>
      <span className="max-w-full truncate rounded bg-stone-950/80 px-1 text-[9px] font-bold text-stone-100">{unit.name.split(" ")[0]} · {unit.hp} HP</span>
      <div className="h-1 w-10 overflow-hidden rounded bg-stone-950/80"><div className={unit.isPlayerTeam ? "h-full bg-emerald-400" : "h-full bg-red-400"} style={{ width: `${Math.max(0, Math.min(100, unit.hp / unit.maxHp * 100))}%` }} /></div>
    </div>
  );
}

export function CombatUnitLayer({ units, gridWidth, gridHeight, activeUnitId, selectedUnitId, onAnimationBusyChange }: {
  units: CombatUnit[]; gridWidth: number; gridHeight: number;
  activeUnitId: string; selectedUnitId: string | null;
  onAnimationBusyChange?: (busy: boolean) => void;
}) {
  const previous = useRef(new Map(units.map(u => [u.id, { x: u.x, y: u.y, hp: u.hp }])));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(onAnimationBusyChange);
  callbackRef.current = onAnimationBusyChange;

  useEffect(() => {
    const changed = units.some(u => {
      const old = previous.current.get(u.id);
      return old && (old.x !== u.x || old.y !== u.y || old.hp > u.hp);
    });
    previous.current = new Map(units.map(u => [u.id, { x: u.x, y: u.y, hp: u.hp }]));
    if (!changed) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    callbackRef.current?.(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      callbackRef.current?.(false);
    }, reduced ? 120 : MOTION_MS);
  }, [units]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    callbackRef.current?.(false);
  }, []);

  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
    <style>{`
      .mr-combat-unit { transition: left ${MOTION_MS}ms ease-in-out, top ${MOTION_MS}ms ease-in-out, opacity 120ms linear; }
      .mr-combat-tile:focus-visible { outline: 3px solid #fef3c7; outline-offset: -3px; z-index: 15; }
      @media (prefers-reduced-motion: reduce) {
        .mr-combat-unit { transition: none; }
        .mr-combat-feedback { animation: none !important; }
      }
    `}</style>
    <div className="absolute left-0 top-0" style={{ width: `${100 / gridWidth}%`, height: `${100 / gridHeight}%` }}>
      {units.map(unit => <UnitVisual key={unit.id} unit={unit} active={unit.id === activeUnitId} selected={unit.id === selectedUnitId} />)}
    </div>
  </div>;
}
