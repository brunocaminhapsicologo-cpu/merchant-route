"use client";

import React, { useRef, useState } from "react";
import { Compass, Footprints, MapPin, Pause, Play, Tent, Wrench } from "lucide-react";
import { TransportIllustration } from "@/assets/caravaneerSprites";
import { GameState, SettlementId } from "@/domain/types";
import { SETTLEMENTS, ROUTES, SECRET_LOCATIONS } from "@/domain/worldData";
import { getCaravanSpeedBreakdown, getDailyUpkeepSummary, getActiveTransportDefinition } from "@/domain/economyEngine";
import { getBearing, getDistanceKm, getNearbySettlement, getTerrainAt, getWorldPosition } from "@/domain/navigationEngine";

export function WorldDrawing({
  state,
  selected,
  onSelect,
  local = false,
  compassTarget,
  onCompassMeasure,
  onStepMove,
}: {
  state: GameState;
  selected: SettlementId;
  onSelect: (id: SettlementId) => void;
  local?: boolean;
  compassTarget?: { x: number; y: number; snappedTown?: SettlementId | null } | null;
  onCompassMeasure?: (target: { x: number; y: number; bearing: number; distanceKm: number; snappedTown: SettlementId | null }) => void;
  onStepMove?: () => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    hasDragged: boolean;
  }>({ active: false, startClientX: 0, startClientY: 0, hasDragged: false });
  const [isDraggingCompass, setIsDraggingCompass] = useState(false);

  const position = getWorldPosition(state);
  const heading = state.exploration?.heading ?? 0;
  // Expanded viewBox prevents bottom edge clipping (New Chicago at y:650 has 110px padding)
  const viewBox = local ? `${position.x - 150} ${position.y - 110} 300 220` : "-20 -20 1040 780";

  // Calculate default compass vector endpoint if user hasn't dragged a custom point yet
  const rad = (heading * Math.PI) / 180;
  const activeTarget = compassTarget ?? {
    x: position.x + Math.sin(rad) * 110,
    y: position.y - Math.cos(rad) * 110,
    snappedTown: null,
  };
  const measuredBearing = getBearing(position, activeTarget);
  const measuredDistanceKm = getDistanceKm(position, activeTarget);

  const clientToSvgPoint = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const transformed = pt.matrixTransform(ctm.inverse());
    return {
      x: Math.max(0, Math.min(1000, transformed.x)),
      y: Math.max(0, Math.min(680, transformed.y)),
    };
  };

  const resolveCompassPoint = (rawPt: { x: number; y: number }) => {
    // Snap to settlement coordinates when dragging near a city center so player gets exact bearing
    let snappedTown: SettlementId | null = null;
    let targetX = rawPt.x;
    let targetY = rawPt.y;
    let bestDist = 24;
    for (const town of Object.values(SETTLEMENTS)) {
      const d = Math.hypot(rawPt.x - town.coordinates.x, rawPt.y - town.coordinates.y);
      if (d <= bestDist) {
        bestDist = d;
        targetX = town.coordinates.x;
        targetY = town.coordinates.y;
        snappedTown = town.id;
      }
    }
    const bearing = getBearing(position, { x: targetX, y: targetY });
    const distanceKm = getDistanceKm(position, { x: targetX, y: targetY });
    return { x: targetX, y: targetY, bearing, distanceKm, snappedTown };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (local) return;
    dragStateRef.current = {
      active: true,
      startClientX: e.clientX,
      startClientY: e.clientY,
      hasDragged: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (local || !dragStateRef.current.active) return;
    const movedPx = Math.hypot(
      e.clientX - dragStateRef.current.startClientX,
      e.clientY - dragStateRef.current.startClientY
    );
    if (movedPx >= 5 || dragStateRef.current.hasDragged) {
      dragStateRef.current.hasDragged = true;
      setIsDraggingCompass(true);
      const svgPt = clientToSvgPoint(e.clientX, e.clientY);
      if (svgPt && onCompassMeasure) {
        const resolved = resolveCompassPoint(svgPt);
        onCompassMeasure(resolved);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (local) {
      onStepMove?.();
      return;
    }
    if (!dragStateRef.current.active) return;
    const wasDrag = dragStateRef.current.hasDragged;
    dragStateRef.current.active = false;
    setIsDraggingCompass(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if not captured
    }
    if (!wasDrag) {
      // A discrete click on the map steps the caravan 1 click along the current compass bearing
      onStepMove?.();
    }
  };

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      role="img"
      aria-label={local ? "Surrounding desert and nearby settlements — click to advance step by step" : "World atlas with interactive draggable compass and click-by-click movement"}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`w-full h-full max-h-full max-w-full object-contain rounded select-none ${
        local
          ? "cursor-pointer"
          : isDraggingCompass
          ? "cursor-crosshair"
          : "cursor-grab"
      }`}
    >
      <defs>
        {/* Authentic Cracked Desert Terrain Pattern */}
        <pattern id={local ? "sand-local" : "sand-atlas"} width="80" height="80" patternUnits="userSpaceOnUse">
          <rect width="80" height="80" fill="#c5b285"/>
          <path
            d="M0 26 L22 30 L38 20 L58 34 L80 28 M38 20 L36 0 M22 30 L16 56 L34 74 L44 80 M58 34 L66 60 L52 76 M0 65 L16 56"
            fill="none"
            stroke="#978257"
            strokeWidth="0.8"
            opacity="0.4"
          />
          <circle cx="30" cy="15" r="1.2" fill="#756441" opacity="0.45"/>
          <circle cx="65" cy="45" r="1.5" fill="#756441" opacity="0.35"/>
          <circle cx="15" cy="70" r="1" fill="#756441" opacity="0.4"/>
        </pattern>

        {/* Topo / Desert Grid */}
        <pattern id="map-grid" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M100 0H0V100" fill="none" stroke="#5a684e" strokeWidth="0.8" opacity="0.35"/>
        </pattern>
      </defs>

      {/* Desert Background with Cracked Earth */}
      <rect x="-300" y="-300" width="1600" height="1300" fill={`url(#${local ? "sand-local" : "sand-atlas"})`}/>

      {/* Topographic Elevation Waves */}
      <path d="M -50 160 Q 250 110 500 170 T 1100 130" fill="none" stroke="#8c784f" strokeWidth="1" strokeDasharray="5 5" opacity="0.5"/>
      <path d="M -50 340 Q 300 290 650 360 T 1100 300" fill="none" stroke="#8c784f" strokeWidth="1" strokeDasharray="5 5" opacity="0.5"/>
      <path d="M -50 530 Q 280 470 580 540 T 1100 480" fill="none" stroke="#8c784f" strokeWidth="1" strokeDasharray="5 5" opacity="0.5"/>

      {/* Dried Riverbed / Salt Flats */}
      <path d="M60 50 Q260 210 300 150 T620 200 Q770 190 980 90 M130 630 Q220 410 510 470 T900 590" fill="none" stroke="#665640" strokeWidth="32" opacity="0.22"/>
      <path d="M55 45 Q265 210 300 150 T620 200 Q770 190 980 90 M125 625 Q220 410 510 470 T900 590" fill="none" stroke="#4a3e2e" strokeWidth="2" opacity="0.35"/>
      <ellipse cx="390" cy="470" rx="150" ry="76" fill="#e0caa0" opacity="0.65"/>

      {/* Coordinate Grid Overlay */}
      <rect x="-20" y="-20" width="1040" height="780" fill="url(#map-grid)"/>

      {/* Caravan Routes */}
      {ROUTES.map(route => {
        const from = SETTLEMENTS[route.from].coordinates;
        const to = SETTLEMENTS[route.to].coordinates;
        const isHighway = route.terrain === "old_highway";

        return (
          <g key={route.id}>
            {/* Highway Road Bed */}
            {isHighway && (
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#3f382c"
                strokeWidth={local ? 4 : 6}
                strokeLinecap="round"
                opacity="0.75"
              />
            )}
            {/* Route Centerline */}
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={isHighway ? "#e8dec0" : "#7d6741"}
              strokeWidth={local ? 2 : 2.5}
              strokeDasharray={isHighway ? "8 6" : "6 7"}
              opacity="0.85"
            />
          </g>
        );
      })}

      {/* Settlements with Tactical Badges */}
      {Object.values(SETTLEMENTS).map(town => {
        const isSelected = selected === town.id;
        const isMajor = town.tier === "major_city";
        const labelWidth = Math.max(90, town.name.length * 8.5);

        return (
          <g
            key={town.id}
            role="button"
            tabIndex={0}
            aria-label={`Inspect ${town.name}`}
            onClick={() => onSelect(town.id)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(town.id); } }}
            className="cursor-pointer outline-none group"
          >
            {/* Selection Pulse Ring */}
            {isSelected && (
              <circle
                cx={town.coordinates.x}
                cy={town.coordinates.y}
                r={local ? 14 : 22}
                fill="none"
                stroke="#fde047"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
            )}

            {/* Town Outpost Outer Ring */}
            <circle
              cx={town.coordinates.x}
              cy={town.coordinates.y}
              r={local ? 8 : 14}
              fill={isMajor ? "#1c2a33" : "#4a2d16"}
              stroke={isSelected ? "#fde047" : isMajor ? "#60a5fa" : "#fde047"}
              strokeWidth={isSelected ? 3 : 2.5}
            />

            {/* Outpost Icon Symbol */}
            <path
              d={`M${town.coordinates.x - 5} ${town.coordinates.y + 4}v-7l5-4 5 4v7z`}
              fill={isMajor ? "#93c5fd" : "#fde047"}
            />

            {/* Stamped Tactical Name Badge */}
            <g transform={`translate(${town.coordinates.x}, ${town.coordinates.y + (local ? 18 : 28)})`}>
              <rect
                x={-labelWidth / 2}
                y="-11"
                width={labelWidth}
                height="18"
                rx="3"
                fill="#161d14"
                stroke={isSelected ? "#fde047" : "#44553c"}
                strokeWidth="1.2"
                opacity="0.95"
              />
              <text
                x="0"
                y="2"
                textAnchor="middle"
                fill={isSelected ? "#fef08a" : "#ebdcb2"}
                fontSize={local ? 8 : 11}
                fontWeight="800"
                fontFamily="ui-monospace, monospace"
                letterSpacing="0.05em"
              >
                {town.name}
              </text>
            </g>
          </g>
        );
      })}

      {/* Secret Caches */}
      {SECRET_LOCATIONS.filter(s => (state.discoveredSecretIds ?? []).includes(s.id)).map(sec => {
        const isCleared = (state.clearedSecretIds ?? []).includes(sec.id);
        return (
          <g key={sec.id} transform={`translate(${sec.x} ${sec.y})`}>
            <polygon points="0,-10 9,5 -9,5" fill={isCleared ? "#78716c" : "#f59e0b"} stroke="#141813" strokeWidth="2" />
            <title>{sec.name} {isCleared ? "(Cleared)" : "(Unexplored Cache)"}</title>
            <text x="0" y={local ? 13 : 18} textAnchor="middle" fill={isCleared ? "#a8a29e" : "#fef08a"} fontSize={local ? 7 : 10} fontWeight="bold" paintOrder="stroke" stroke="#141813" strokeWidth="2.5">{sec.name}</text>
          </g>
        );
      })}

      {/* Roving Entities (Sheriff, Traders, Raiders) */}
      {(state.rovingEntities ?? []).map(entity => {
        const color = entity.type === "trader" ? "#0284c7" : entity.type === "sheriff_patrol" ? "#22c55e" : "#ef4444";
        return (
          <g key={entity.id} transform={`translate(${entity.x} ${entity.y})`}>
            <circle r={local ? 6 : 8} fill={color} stroke="#141813" strokeWidth="2" />
            <title>{entity.name} ({entity.type.replaceAll("_", " ")})</title>
            {local && <text y={-9} textAnchor="middle" fill={color} fontSize="7" fontWeight="bold" paintOrder="stroke" stroke="#141813" strokeWidth="2">{entity.name}</text>}
          </g>
        );
      })}

      {/* INTERACTIVE DRAGGABLE COMPASS & PROTRACTOR ON GENERAL MAP */}
      {!local && (
        <g className="select-none">
          {/* Outer Protractor Ring Centered on Caravan */}
          <g transform={`translate(${position.x} ${position.y})`}>
            <circle
              r="58"
              fill="rgba(20, 27, 18, 0.28)"
              stroke="#fde047"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            <circle
              r="44"
              fill="none"
              stroke="#4ade80"
              strokeWidth="1"
              opacity="0.6"
            />
            {/* Degree Tick Marks around Protractor */}
            {Array.from({ length: 12 }).map((_, i) => {
              const deg = i * 30;
              const a = (deg * Math.PI) / 180;
              const x1 = Math.sin(a) * 52;
              const y1 = -Math.cos(a) * 52;
              const x2 = Math.sin(a) * 58;
              const y2 = -Math.cos(a) * 58;
              return (
                <line
                  key={deg}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#fde047"
                  strokeWidth={deg % 90 === 0 ? "2" : "1"}
                />
              );
            })}
            <text x="0" y="-63" textAnchor="middle" fill="#fde047" fontSize="10" fontWeight="900" fontFamily="monospace" paintOrder="stroke" stroke="#141813" strokeWidth="3">N 0°</text>
            <text x="68" y="3" textAnchor="start" fill="#fde047" fontSize="9" fontWeight="900" fontFamily="monospace" paintOrder="stroke" stroke="#141813" strokeWidth="3">90° L</text>
            <text x="0" y="71" textAnchor="middle" fill="#fde047" fontSize="9" fontWeight="900" fontFamily="monospace" paintOrder="stroke" stroke="#141813" strokeWidth="3">S 180°</text>
            <text x="-68" y="3" textAnchor="end" fill="#fde047" fontSize="9" fontWeight="900" fontFamily="monospace" paintOrder="stroke" stroke="#141813" strokeWidth="3">270° O</text>
          </g>

          {/* Measured Compass Vector Line from Caravan to Dragged Target */}
          <line
            x1={position.x}
            y1={position.y}
            x2={activeTarget.x}
            y2={activeTarget.y}
            stroke="#f59e0b"
            strokeWidth="3"
            strokeDasharray="7 4"
          />

          {/* Draggable Compass Tip Handle */}
          <g transform={`translate(${activeTarget.x} ${activeTarget.y})`}>
            <circle
              r="11"
              fill="rgba(245, 158, 11, 0.25)"
              stroke="#fde047"
              strokeWidth="2"
            />
            <circle r="4" fill="#fde047" />
            {/* Readout Badge next to Compass Tip */}
            <g transform="translate(14, -18)">
              <rect
                x="0"
                y="-12"
                width={activeTarget.snappedTown ? 195 : 142}
                height="24"
                rx="4"
                fill="#141b12"
                stroke="#fde047"
                strokeWidth="1.5"
                opacity="0.95"
              />
              <text
                x="7"
                y="4"
                fill="#fde047"
                fontSize="10"
                fontWeight="900"
                fontFamily="ui-monospace, monospace"
              >
                {measuredBearing.toFixed(1)}° · {measuredDistanceKm.toFixed(1)} km
                {activeTarget.snappedTown ? ` [${SETTLEMENTS[activeTarget.snappedTown].name}]` : ""}
              </text>
            </g>
          </g>
        </g>
      )}

      {/* Caravan Convoy Icon and Radar Ring */}
      <g transform={`translate(${position.x} ${position.y})`}>
        {local && (
          <line
            x1="0"
            y1="0"
            x2={Math.sin(rad) * 75}
            y2={-Math.cos(rad) * 75}
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
        )}
        <circle r={local ? 12 : 15} fill="#273826" stroke="#fde047" strokeWidth="2.5"/>
        <path d="M0-11L6 6 0 3-6 6Z" fill="#fde047" transform={`rotate(${heading})`}/>
        {/* Radar Ring */}
        <circle r={local ? 70 : 35} fill="none" stroke="#22c55e" strokeDasharray="3 5" strokeWidth="1" opacity="0.75"/>
        {!local && (
          <g transform="translate(18, 22)">
            <rect x="0" y="-10" width="125" height="18" rx="2" fill="#141b12" stroke="#4ade80" strokeWidth="1" opacity="0.9" />
            <text x="6" y="3" fill="#4ade80" fontSize="9" fontWeight="bold" fontFamily="monospace">
              CARAVANA [{position.x.toFixed(0)}, {position.y.toFixed(0)}]
            </text>
          </g>
        )}
      </g>

      {/* Atlas Header & Corner Elements */}
      {!local && (
        <>
          {/* Stamped Map Title & Instructions */}
          <g transform="translate(30, 35)">
            <rect x="0" y="-16" width="520" height="28" rx="3" fill="#161e14" stroke="#4c5d43" strokeWidth="1.5" opacity="0.92"/>
            <text x="12" y="2" fill="#fde047" fontSize="11" fontWeight="900" letterSpacing="0.06em" fontFamily="ui-monospace, monospace">
              ★ ARRASTE A BÚSSOLA ATÉ A CIDADE PARA CALCULAR O GRAU · CLIQUE PARA MOVER PASSO A PASSO
            </text>
          </g>

          {/* Scale Legend (Bottom Left, safely away from New Chicago) */}
          <g transform="translate(35, 735)">
            <rect x="0" y="-18" width="165" height="26" rx="2" fill="#161e14" stroke="#4c5d43" strokeWidth="1" opacity="0.9"/>
            <text x="10" y="-1" fill="#ebdcb2" fontSize="11" fontWeight="bold" fontFamily="monospace">100 units = 20 km</text>
            <path d="M10 4 h145 M10 0 v8 M155 0 v8 M82 1 v6" stroke="#ebdcb2" strokeWidth="1.5"/>
          </g>

          {/* Map Legend Box (Top Right) */}
          <g transform="translate(790, 20)">
            <rect x="0" y="0" width="215" height="75" rx="4" fill="#151d13" stroke="#475640" strokeWidth="1.5" opacity="0.92"/>
            <text x="10" y="18" fill="#fde047" fontSize="10" fontWeight="bold" fontFamily="monospace">MAP LEGEND [LEGENDA]:</text>
            
            <circle cx="18" cy="34" r="5" fill="#4a2d16" stroke="#fde047" strokeWidth="1.5"/>
            <text x="30" y="37" fill="#ebdcb2" fontSize="9" fontFamily="sans-serif">Frontier Outpost</text>

            <circle cx="120" cy="34" r="5" fill="#1c2a33" stroke="#60a5fa" strokeWidth="1.5"/>
            <text x="132" y="37" fill="#ebdcb2" fontSize="9" fontFamily="sans-serif">Metropolis</text>

            <line x1="10" y1="56" x2="30" y2="56" stroke="#3f382c" strokeWidth="4"/>
            <line x1="10" y1="56" x2="30" y2="56" stroke="#ebdcb2" strokeWidth="1.5" strokeDasharray="3 3"/>
            <text x="36" y="60" fill="#ebdcb2" fontSize="9" fontFamily="sans-serif">Old Highway</text>

            <line x1="115" y1="56" x2="135" y2="56" stroke="#7d6741" strokeWidth="2" strokeDasharray="3 3"/>
            <text x="140" y="60" fill="#ebdcb2" fontSize="9" fontFamily="sans-serif">Desert Trail</text>
          </g>
        </>
      )}
    </svg>
  );
}

export function StrategicWorldMap({
  state,
  selected,
  onSelect,
  onTravel,
  onHeading,
  onStepMove,
  onEnter,
  onScavenge,
}: {
  state: GameState;
  selected: SettlementId;
  onSelect: (id: SettlementId) => void;
  onTravel: () => void;
  onHeading?: (heading: number) => void;
  onStepMove?: () => void;
  onEnter?: (id: SettlementId) => void;
  onScavenge?: (secretId: string) => void;
}) {
  const position = getWorldPosition(state);
  const town = SETTLEMENTS[selected];
  const heading = state.exploration?.heading ?? 0;
  const [compassTarget, setCompassTarget] = useState<{
    x: number;
    y: number;
    snappedTown?: SettlementId | null;
  } | null>(null);

  const rad = (heading * Math.PI) / 180;
  const activeTarget = compassTarget ?? {
    x: position.x + Math.sin(rad) * 110,
    y: position.y - Math.cos(rad) * 110,
    snappedTown: null,
  };
  const measuredBearing = compassTarget ? getBearing(position, activeTarget) : heading;
  const measuredDistance = compassTarget ? getDistanceKm(position, activeTarget) : 0;

  const terrain = getTerrainAt(position);
  const speed = getCaravanSpeedBreakdown(state, terrain);
  const hours = measuredDistance / Math.max(0.1, speed.effectiveSpeedKmh);
  const upkeep = getDailyUpkeepSummary(state);
  const activeTransport = getActiveTransportDefinition(state);
  const fuel = (measuredDistance / 10) * activeTransport.fuelLitersPer10Km;
  const nearby = getNearbySettlement(position);
  const nearbySecret = SECRET_LOCATIONS.find(
    s =>
      (state.discoveredSecretIds ?? []).includes(s.id) &&
      !(state.clearedSecretIds ?? []).includes(s.id) &&
      Math.hypot(position.x - s.x, position.y - s.y) <= 35
  );

  // Key trade commodity price index for the selected settlement (without COMPRA/VENDA badges per user request)
  const marketList: { name: string; base: number; mult: number; unit: string }[] = [
    { name: "Água Purificada", base: 8, mult: town.priceMultipliers?.water ?? 1, unit: "1L" },
    { name: "Rações de Milho", base: 12, mult: town.priceMultipliers?.food_rations ?? 1, unit: "1u" },
    { name: "Gasolina Refinada", base: 38, mult: town.priceMultipliers?.gasoline ?? 1, unit: "1L" },
    { name: "Couro Curado", base: 45, mult: town.priceMultipliers?.raw_leather ?? 1, unit: "1u" },
    { name: "Minério de Cobre", base: 36, mult: town.priceMultipliers?.copper_ore ?? 1, unit: "1u" },
    { name: "Ferramentas", base: 55, mult: town.priceMultipliers?.tools ?? 1, unit: "1u" },
  ];

  const handleCompassMeasure = (target: {
    x: number;
    y: number;
    bearing: number;
    distanceKm: number;
    snappedTown: SettlementId | null;
  }) => {
    setCompassTarget({ x: target.x, y: target.y, snappedTown: target.snappedTown });
    onHeading?.(target.bearing);
    if (target.snappedTown) {
      onSelect(target.snappedTown);
    }
  };

  return (
    <div className="h-full w-full flex flex-col lg:flex-row min-h-0 overflow-hidden gap-3">
      {/* 1. CENTRAL MAP VIEWPORT (Framed in beveled military console bezel) */}
      <div className="flex-1 min-h-0 relative flex flex-col justify-between caravan-screen-bezel p-1 overflow-hidden">
        <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden">
          <WorldDrawing
            state={state}
            selected={selected}
            onSelect={onSelect}
            compassTarget={compassTarget}
            onCompassMeasure={handleCompassMeasure}
            onStepMove={onStepMove}
          />
        </div>

        {/* Bottom Map Telemetry & Gate Arrival Bar */}
        <div className="bg-[#172016] border-t-2 border-[#3c4a35] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs font-mono">
          <div className="flex items-center gap-3 text-[#ebdcb2]">
            <span className="font-bold text-[#fde047]">
              POS: {position.x.toFixed(1)}, {position.y.toFixed(1)}
            </span>
            <span className="text-[#6d8065]">|</span>
            <span className="text-amber-300 font-bold">
              RUMO ATUAL: {heading.toFixed(1)}°
            </span>
            <span className="text-[#6d8065]">|</span>
            <span className="text-emerald-400 font-bold">
              {speed.effectiveSpeedKmh.toFixed(1)} km/h
            </span>
          </div>

          <div className="flex items-center gap-2">
            {nearby && onEnter && (
              <button
                type="button"
                onClick={() => onEnter(nearby)}
                className="py-1 px-3 rounded font-black text-xs uppercase tracking-wider bg-[#3f5038] hover:bg-[#4f6446] text-[#fef08a] border-2 border-[#6d885f] shadow flex items-center gap-1.5 cursor-pointer"
              >
                <MapPin size={14} /> Entrar em {SETTLEMENTS[nearby].name}
              </button>
            )}
            {nearbySecret && onScavenge && (
              <button
                type="button"
                onClick={() => onScavenge(nearbySecret.id)}
                className="py-1 px-3 rounded font-black text-xs uppercase tracking-wider bg-amber-700 hover:bg-amber-600 text-stone-950 border-2 border-amber-500 shadow flex items-center gap-1.5 cursor-pointer"
              >
                <MapPin size={14} /> Saquear {nearbySecret.name}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. RIGHT CARAVANEER TACTICAL CONTEXT DOCK (Width: 340px) */}
      <div className="w-80 lg:w-88 shrink-0 flex flex-col gap-2.5 overflow-y-auto pr-1">
        {/* Module A: Market Price Index (without COMPRA/VENDA badges) */}
        <section className="caravan-bezel p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-[#3c4a35] pb-1">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-[#fde047]">
              Cotações Locais ({town.name})
            </h4>
            <span className="text-[10px] font-mono text-[#95a38e]">Preço Médio</span>
          </div>

          <div className="caravan-gauge divide-y divide-[#273223] text-xs">
            {marketList.map(item => {
              const price = Math.round(item.base * item.mult);

              return (
                <div key={item.name} className="flex items-center justify-between py-1 px-1.5 font-mono">
                  <span className="text-[#ebdcb2] text-[11px]">{item.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#fde047]">${price}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Module B: Compass Measurement, Step-by-Step Movement & Logistics */}
        <section className="caravan-bezel p-3 space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#3c4a35] pb-1">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-[#fde047]">
              Bússola & Logística da Expedição
            </h4>
            <span className="text-[10px] font-mono text-emerald-400">
              {compassTarget?.snappedTown ? SETTLEMENTS[compassTarget.snappedTown].name : "Rumo Livre"}
            </span>
          </div>

          <p className="text-[11px] text-[#c5b896] leading-snug">
            Clique e arraste a bússola no mapa para calcular o grau até a cidade destino. Em seguida, avance clique a clique pelo mapa.
          </p>

          <div className="grid grid-cols-3 gap-1.5 text-center caravan-gauge p-1.5">
            <div>
              <span className="text-[9px] text-[#95a38e] block uppercase">Grau (Rumo)</span>
              <strong className="font-mono text-sm text-[#fde047]">{measuredBearing.toFixed(1)}°</strong>
            </div>
            <div>
              <span className="text-[9px] text-[#95a38e] block uppercase">Distância</span>
              <strong className="font-mono text-sm text-[#ebdcb2]">{measuredDistance.toFixed(1)} km</strong>
            </div>
            <div>
              <span className="text-[9px] text-[#95a38e] block uppercase">Tempo Est.</span>
              <strong className="font-mono text-sm text-[#ebdcb2]">{hours.toFixed(1)} h</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono caravan-gauge p-2">
            <span className="text-[#38bdf8]">Água ~{(upkeep.totalWaterPerDay * hours / 24).toFixed(1)} L</span>
            <span className="text-[#ebdcb2]">Rações ~{(upkeep.humanFoodPerDay * hours / 24).toFixed(1)}</span>
            <span className="text-[#a7f3d0]">Forragem ~{(upkeep.animalForagePerDay * hours / 24).toFixed(1)}</span>
            <span className="text-[#fb923c]">Gasolina {fuel.toFixed(1)} L</span>
          </div>

          {/* Click-by-Click Step Button directly on General Map */}
          {onStepMove && (
            <button
              type="button"
              onClick={onStepMove}
              className="w-full py-2.5 px-3 rounded font-black text-xs uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-stone-950 border-2 border-amber-300 shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-y-0.5"
            >
              <Footprints size={16} /> Mover 1 Passo no Rumo ({heading.toFixed(1)}°) [Clique]
            </button>
          )}

          {/* Secondary Action Button to Switch to Local Travel View */}
          <button
            type="button"
            onClick={onTravel}
            className="w-full py-2 px-3 rounded font-black text-xs uppercase tracking-wider bg-[#3f5038] hover:bg-[#4f6446] text-[#fef08a] border-2 border-[#6d885f] shadow flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-y-0.5"
          >
            <Compass size={15} /> Ir para Tela de Viagem [2]
          </button>
        </section>
      </div>
    </div>
  );
}


export function TravelScreen({
  state,
  selected,
  onSelect,
  onHeading,
  onMove,
  onStepMove,
  onEnter,
  onCamp,
  rate,
  onRate,
  onScavenge,
  onRepair,
}: {
  state: GameState;
  selected: SettlementId;
  onSelect: (id: SettlementId) => void;
  onHeading: (heading: number) => void;
  onMove: () => void;
  onStepMove?: () => void;
  onEnter: (id: SettlementId) => void;
  onCamp: () => void;
  rate: number;
  onRate: (rate: number) => void;
  onScavenge?: (secretId: string) => void;
  onRepair?: (method: "tools" | "diesel_parts" | "depot") => void;
}) {
  const heading = state.exploration?.heading ?? 0;
  const [draft, setDraft] = useState<string | null>(null);
  const dialRef = useRef<HTMLDivElement | null>(null);
  const dialDragRef = useRef(false);
  const position = getWorldPosition(state);
  const nearby = getNearbySettlement(position);
  const nearbySecret = SECRET_LOCATIONS.find(
    s =>
      (state.discoveredSecretIds ?? []).includes(s.id) &&
      !(state.clearedSecretIds ?? []).includes(s.id) &&
      Math.hypot(position.x - s.x, position.y - s.y) <= 35
  );
  const moving = !!state.exploration?.isMoving && !state.exploration.isPaused;
  const terrain = getTerrainAt(position);
  const speed = getCaravanSpeedBreakdown(state, terrain);
  const commitHeading = () => {
    const n = Number(draft ?? heading);
    if (Number.isFinite(n)) {
      onHeading(((n % 360) + 360) % 360);
      setDraft(null);
    }
  };

  const updateDialBearing = (clientX: number, clientY: number) => {
    const el = dialRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const deg = ((Math.atan2(clientX - cx, cy - clientY) * 180) / Math.PI + 360) % 360;
    setDraft(null);
    onHeading(Math.round(deg * 10) / 10);
  };

  return (
    <div className="h-full w-full flex flex-col lg:flex-row min-h-0 overflow-hidden gap-3">
      {/* LOCAL DESERT VIEWPORT */}
      <div className="flex-1 min-h-0 flex flex-col justify-between caravan-screen-bezel p-1 overflow-hidden">
        <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden">
          <WorldDrawing
            state={state}
            selected={selected}
            onSelect={onSelect}
            local
            onStepMove={onStepMove}
          />
          <div className="pointer-events-none absolute top-2 left-2 rounded bg-[#141b12]/90 border border-[#4c5d43] px-2.5 py-1 text-[11px] font-mono font-bold text-[#fde047]">
            Clique no mapa para avançar passo a passo no rumo ({heading.toFixed(1)}°)
          </div>
        </div>

        {/* BOTTOM ACTION & TELEMETRY BAR ON MAP */}
        <div className="bg-[#172016] border-t-2 border-[#3c4a35] p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3 text-xs font-mono text-[#ebdcb2]">
            <span className="font-bold text-[#fde047]">POS: {position.x.toFixed(1)}, {position.y.toFixed(1)}</span>
            <span className="text-[#6d8065]">|</span>
            <span className="uppercase text-[#93c5fd] font-bold">{terrain.replaceAll("_", " ")}</span>
            <span className="text-[#6d8065]">|</span>
            <span className="text-emerald-400 font-bold">{speed.effectiveSpeedKmh.toFixed(1)} km/h</span>
            <span className="text-[#6d8065]">|</span>
            <span>Dist: {(state.exploration?.distanceTravelledKm ?? 0).toFixed(1)} km</span>
          </div>

          <div className="flex items-center gap-2">
            {nearby && (
              <button
                type="button"
                className="py-1.5 px-3 rounded font-black text-xs uppercase tracking-wider bg-[#3f5038] hover:bg-[#4f6446] text-[#fef08a] border-2 border-[#6d885f] shadow flex items-center gap-1.5 cursor-pointer"
                disabled={moving}
                onClick={() => onEnter(nearby)}
              >
                <MapPin size={14}/> Entrar em {SETTLEMENTS[nearby].name}
              </button>
            )}
            {nearbySecret && (
              <button
                type="button"
                className="py-1.5 px-3 rounded font-black text-xs uppercase tracking-wider bg-amber-700 hover:bg-amber-600 text-stone-950 border-2 border-amber-500 shadow flex items-center gap-1.5 cursor-pointer"
                disabled={moving}
                onClick={() => onScavenge?.(nearbySecret.id)}
              >
                <MapPin size={14}/> Saquear {nearbySecret.name}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT CARAVANEER TACTICAL COMPASS DOCK */}
      <div className="w-80 lg:w-88 shrink-0 flex flex-col gap-2.5 overflow-y-auto pr-1">
        <div className="caravan-bezel p-3 space-y-2.5">
          {/* DRAGGABLE ANALOG COMPASS */}
          <div
            ref={dialRef}
            onPointerDown={e => {
              dialDragRef.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              updateDialBearing(e.clientX, e.clientY);
            }}
            onPointerMove={e => {
              if (!dialDragRef.current) return;
              updateDialBearing(e.clientX, e.clientY);
            }}
            onPointerUp={e => {
              dialDragRef.current = false;
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                // ignore
              }
            }}
            title="Clique e arraste para girar a agulha da bússola"
            className="relative mx-auto h-32 w-32 rounded-full border-4 border-[#47573f] bg-[#c5b083] shadow-inner cursor-grab active:cursor-grabbing select-none"
          >
            <span className="absolute left-1/2 top-1 -translate-x-1/2 font-serif font-black text-xs text-[#141813]">N · 0°</span>
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#141813]">90°</span>
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#141813]">180°</span>
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#141813]">270°</span>
            <svg viewBox="0 0 160 160" className="h-full w-full pointer-events-none" aria-label={`Compass bearing ${heading.toFixed(1)} degrees`}>
              <g transform={`rotate(${heading} 80 80)`}>
                <path d="M80 28L92 80 80 72 68 80Z" fill="#b91c1c" stroke="#450a0a" strokeWidth="1.2"/>
                <path d="M80 132L92 80 80 88 68 80Z" fill="#1c251a" stroke="#141813" strokeWidth="1.2"/>
              </g>
              <circle cx="80" cy="80" r="7" fill="#fde047" stroke="#253022" strokeWidth="2"/>
            </svg>
          </div>

          {/* BEARING INPUTS */}
          <div className="caravan-gauge p-2.5 space-y-1.5">
            <label htmlFor="travel-bearing" className="block text-[10px] font-black uppercase tracking-wider text-[#fde047]">
              Rumo de Navegação (Graus)
            </label>
            <div className="flex gap-2">
              <input
                id="travel-bearing"
                type="number"
                min="0"
                max="359.9"
                step=".1"
                value={draft ?? heading.toFixed(1)}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") commitHeading(); }}
                className="game-input min-w-0 flex-1 text-sm py-1 font-bold"
              />
              <button className="game-secondary py-1 px-3 text-xs font-bold" onClick={commitHeading}>Ajustar</button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[0, 90, 180, 270].map((h, i) => (
                <button
                  key={h}
                  className="game-secondary py-1 text-xs font-bold"
                  onClick={() => { setDraft(null); onHeading(h); }}
                >
                  {["N", "L", "S", "O"][i]}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button className="game-secondary flex-1 py-1 text-xs font-bold" onClick={() => onHeading((heading + 355) % 360)}>−5°</button>
              <button className="game-secondary flex-1 py-1 text-xs font-bold" onClick={() => onHeading((heading + 5) % 360)}>+5°</button>
            </div>
          </div>

          {/* PRIMARY CLICK-BY-CLICK STEP MOVEMENT BUTTON */}
          {onStepMove && (
            <button
              type="button"
              onClick={onStepMove}
              className="w-full py-2.5 px-3 rounded font-black text-xs uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-stone-950 border-2 border-amber-300 shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-y-0.5"
            >
              <Footprints size={16} /> Avançar 1 Passo ({heading.toFixed(1)}°) [Clique]
            </button>
          )}

          {/* CONTINUOUS TRAVEL TOGGLE BUTTON */}
          <button
            className={`w-full justify-center py-2 text-xs font-black uppercase tracking-wider shadow cursor-pointer transition-all active:translate-y-0.5 ${moving ? "game-secondary" : "game-primary"}`}
            onClick={onMove}
          >
            {moving ? <Pause size={15}/> : <Play size={15}/>}
            {moving ? "Parar Marcha Contínua [Espaço]" : "Marcha Contínua [Espaço]"}
          </button>
        </div>

        {/* FLEET MAINTENANCE & CONDITIONS */}
        <div className="caravan-bezel p-3 space-y-2">
          <div className="flex justify-between items-center text-xs border-b border-[#3c4a35] pb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#fde047]">Condição da Frota:</span>
            <span className={(state.vehicleCondition ?? 100) > 60 ? "text-emerald-400 font-bold" : (state.vehicleCondition ?? 100) > 25 ? "text-amber-400 font-bold" : "text-red-400 font-bold"}>
              {state.vehicleCondition ?? 100}%
            </span>
          </div>

          {state.isBrokenDown && (
            <div className="rounded bg-red-950/80 border border-red-800 text-red-300 font-bold text-center py-1 text-xs">
              AVARIA CRÍTICA (-50% Velocidade)
            </div>
          )}

          {((state.inventory.tools ?? 0) > 0 || (state.inventory.diesel_parts ?? 0) > 0) && (
            <div className="pt-1 flex flex-col gap-1.5">
              {(state.inventory.tools ?? 0) > 0 && (
                <button
                  type="button"
                  disabled={moving || (state.vehicleCondition ?? 100) >= 100}
                  onClick={() => onRepair?.("tools")}
                  className="game-secondary py-1 text-[11px] justify-between px-2"
                >
                  <span className="flex items-center gap-1"><Wrench size={12}/> Reparo de Trilha</span>
                  <span className="text-emerald-400 font-bold">+35%</span>
                </button>
              )}
              {(state.inventory.diesel_parts ?? 0) > 0 && (
                <button
                  type="button"
                  disabled={moving || (state.vehicleCondition ?? 100) >= 100}
                  onClick={() => onRepair?.("diesel_parts")}
                  className="game-secondary py-1 text-[11px] justify-between px-2"
                >
                  <span className="flex items-center gap-1"><Wrench size={12}/> Substituir Peças</span>
                  <span className="text-emerald-400 font-bold">+75%</span>
                </button>
              )}
            </div>
          )}

          <div className="pt-1 border-t border-[#3c4a35] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="travel-rate" className="text-[#ebdcb2] font-bold">Passo da Marcha:</label>
              <select
                id="travel-rate"
                className="game-input text-xs py-0.5 px-2 font-bold"
                value={rate}
                onChange={e => onRate(Number(e.target.value))}
              >
                <option value="1">1× (Normal)</option>
                <option value="2">2× (Acelerado)</option>
                <option value="4">4× (Disparada)</option>
              </select>
            </div>

            <button
              className="game-secondary w-full justify-center py-1.5 text-xs font-bold"
              disabled={moving || !!state.currentSettlement}
              onClick={onCamp}
            >
              <Tent size={14}/> Acampar por 6 horas (Descanso)
            </button>
          </div>

          <div className="h-14 pt-1 flex items-center justify-center opacity-85">
            <TransportIllustration transportId={state.transport} className="h-full w-full object-contain"/>
          </div>
        </div>
      </div>
    </div>
  );
}

