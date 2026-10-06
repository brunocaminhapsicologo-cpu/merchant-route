"use client";

import { useState } from "react";
import { Compass, MapPin, Pause, Play, Tent, Wrench } from "lucide-react";
import { TransportIllustration } from "@/assets/caravaneerSprites";
import { GameState, SettlementId } from "@/domain/types";
import { SETTLEMENTS, ROUTES, SECRET_LOCATIONS } from "@/domain/worldData";
import { getCaravanSpeedBreakdown, getDailyUpkeepSummary, getActiveTransportDefinition } from "@/domain/economyEngine";
import { getBearing, getDistanceKm, getNearbySettlement, getTerrainAt, getWorldPosition } from "@/domain/navigationEngine";

export function WorldDrawing({ state, selected, onSelect, local = false }: { state: GameState; selected: SettlementId; onSelect: (id: SettlementId) => void; local?: boolean }) {
  const position = getWorldPosition(state);
  const destination = SETTLEMENTS[selected];
  const viewBox = local ? `${position.x - 150} ${position.y - 110} 300 220` : "0 0 1000 680";
  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label={local ? "Surrounding desert and nearby settlements" : "World atlas with settlements and bearing measurement"}
      className="w-full h-full max-h-full max-w-full object-contain rounded"
    >
      <defs>
        <pattern id={local ? "sand-local" : "sand-atlas"} width="48" height="48" patternUnits="userSpaceOnUse">
          <rect width="48" height="48" fill="#c2b083"/>
          <path d="M0 28q18-9 48 0M9 8l4 1M35 40l3 1" stroke="#96855b" opacity=".35" fill="none"/>
          <circle cx="28" cy="14" r="1" fill="#7a6b47" opacity=".4"/>
        </pattern>
        <pattern id="map-lines" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M100 0H0V100" fill="none" stroke="#5d6652" strokeWidth=".7" opacity=".35"/>
        </pattern>
      </defs>
      <rect x="-200" y="-200" width="1400" height="1080" fill={`url(#${local ? "sand-local" : "sand-atlas"})`}/>
      <path d="M70 55Q260 210 300 150T620 200Q770 190 980 90M130 630Q220 410 510 470T900 590" fill="none" stroke="#6d5e48" strokeWidth="28" opacity=".2"/>
      <path d="M65 50Q265 210 300 150T620 200Q770 190 980 90M125 625Q220 410 510 470T900 590" fill="none" stroke="#524634" strokeWidth="2" opacity=".3"/>
      <ellipse cx="390" cy="470" rx="145" ry="73" fill="#dfca92" opacity=".7"/>
      <rect width="1000" height="680" fill="url(#map-lines)"/>
      {ROUTES.map(route => (
        <line
          key={route.id}
          x1={SETTLEMENTS[route.from].coordinates.x}
          y1={SETTLEMENTS[route.from].coordinates.y}
          x2={SETTLEMENTS[route.to].coordinates.x}
          y2={SETTLEMENTS[route.to].coordinates.y}
          stroke={route.terrain === "old_highway" ? "#5a503d" : "#7d6945"}
          strokeWidth={local ? 2 : 3}
          strokeDasharray={route.terrain === "old_highway" ? undefined : "6 7"}
        />
      ))}
      {!local && (
        <line
          x1={position.x}
          y1={position.y}
          x2={destination.coordinates.x}
          y2={destination.coordinates.y}
          stroke="#991b1b"
          strokeDasharray="8 5"
          strokeWidth="2.5"
        />
      )}
      {Object.values(SETTLEMENTS).map(town => (
        <g
          key={town.id}
          role="button"
          tabIndex={0}
          aria-label={`Inspect ${town.name}`}
          onClick={() => onSelect(town.id)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(town.id); } }}
          className="cursor-pointer outline-none focus:stroke-emerald-700"
        >
          <circle
            cx={town.coordinates.x}
            cy={town.coordinates.y}
            r={local ? 7 : 13}
            fill={town.tier === "major_city" ? "#283b42" : "#593618"}
            stroke={selected === town.id ? "#ef4444" : "#fef08a"}
            strokeWidth={selected === town.id ? 3 : 2}
          />
          <path d={`M${town.coordinates.x - 5} ${town.coordinates.y + 3}v-7l5-4 5 4v7z`} fill="#fef08a"/>
          <text
            x={town.coordinates.x}
            y={town.coordinates.y + (local ? 18 : 29)}
            textAnchor="middle"
            fill="#141813"
            fontSize={local ? 7 : 14}
            fontWeight="bold"
            paintOrder="stroke"
            stroke="#dac58e"
            strokeWidth="3"
          >
            {town.name}
          </text>
        </g>
      ))}
      {SECRET_LOCATIONS.filter(s => (state.discoveredSecretIds ?? []).includes(s.id)).map(sec => {
        const isCleared = (state.clearedSecretIds ?? []).includes(sec.id);
        return (
          <g key={sec.id} transform={`translate(${sec.x} ${sec.y})`}>
            <polygon points="0,-8 7,4 -7,4" fill={isCleared ? "#78716c" : "#f59e0b"} stroke="#141813" strokeWidth="1.5" />
            <title>{sec.name} {isCleared ? "(Cleared)" : "(Unexplored Cache)"}</title>
            <text x="0" y={local ? 12 : 16} textAnchor="middle" fill={isCleared ? "#a8a29e" : "#fef08a"} fontSize={local ? 6 : 9} fontWeight="bold" paintOrder="stroke" stroke="#141813" strokeWidth="2">{sec.name}</text>
          </g>
        );
      })}
      {(state.rovingEntities ?? []).map(entity => {
        const color = entity.type === "trader" ? "#0284c7" : entity.type === "sheriff_patrol" ? "#22c55e" : "#ef4444";
        return (
          <g key={entity.id} transform={`translate(${entity.x} ${entity.y})`}>
            <circle r={local ? 5 : 7} fill={color} stroke="#141813" strokeWidth="1.5" />
            <title>{entity.name} ({entity.type.replaceAll("_", " ")})</title>
            {local && <text y={-7} textAnchor="middle" fill={color} fontSize="6" fontWeight="bold" paintOrder="stroke" stroke="#141813" strokeWidth="2">{entity.name}</text>}
          </g>
        );
      })}
      <g transform={`translate(${position.x} ${position.y})`}>
        <circle r={local ? 10 : 12} fill="#2d4833" stroke="#fef08a" strokeWidth="2"/>
        <path d="M0-9L5 5 0 2-5 5Z" fill="#fef08a" transform={`rotate(${state.exploration?.heading ?? 0})`}/>
        {local && <circle r="65" fill="none" stroke="#2d4833" strokeDasharray="2 5" strokeWidth=".7" opacity=".6"/>}
      </g>
      {!local && (
        <g fill="#2d3527" fontFamily="sans-serif" fontWeight="bold">
          <text x="40" y="38" fontSize="16" letterSpacing="2">WASTELAND STRATEGIC ATLAS</text>
          <text x="830" y="625" fontSize="12">100 units = 20 km</text>
          <path d="M830 638h120M830 633v10M950 633v10" stroke="#2d3527" strokeWidth="2"/>
        </g>
      )}
    </svg>
  );
}

export function StrategicWorldMap({ state, selected, onSelect, onTravel }: { state: GameState; selected: SettlementId; onSelect: (id: SettlementId) => void; onTravel: () => void }) {
  const position = getWorldPosition(state);
  const town = SETTLEMENTS[selected];
  const distance = getDistanceKm(position, town.coordinates);
  const bearing = getBearing(position, town.coordinates);
  const terrain = getTerrainAt(position);
  const speed = getCaravanSpeedBreakdown(state, terrain);
  const hours = distance / Math.max(.1, speed.effectiveSpeedKmh);
  const upkeep = getDailyUpkeepSummary(state);
  const fuel = distance / 10 * getActiveTransportDefinition(state).fuelLitersPer10Km;

  return (
    <div className="h-full w-full flex flex-col md:flex-row min-h-0 overflow-hidden gap-2">
      {/* CENTRAL MAP VIEWPORT */}
      <div className="flex-1 min-h-0 relative flex flex-col items-center justify-center bg-[#151814] rounded border-2 border-[#3d4738] p-1 overflow-hidden shadow-inner">
        <WorldDrawing state={state} selected={selected} onSelect={onSelect} />
      </div>

      {/* RIGHT SIDEBAR DOCK */}
      <div className="w-80 lg:w-88 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
        <section className="game-panel p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#fef08a]">Destination Target</span>
            <button className="game-primary py-1 px-2.5 text-[11px]" onClick={onTravel}>
              <Compass size={13}/> Travel Screen
            </button>
          </div>
          <select
            id="atlas-destination"
            className="game-input w-full text-xs py-1.5"
            value={selected}
            onChange={e => onSelect(e.target.value as SettlementId)}
          >
            {Object.values(SETTLEMENTS).map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.tier === "major_city" ? "Metropolis" : "Outpost"})</option>
            ))}
          </select>

          <div className="bg-[#141813] border border-[#2d3527] rounded p-2.5">
            <h3 className="font-bold text-sm text-[#fef08a]">{town.name}</h3>
            <p className="text-[11px] text-[#c5b896] leading-relaxed mt-1 line-clamp-3">{town.lore}</p>
            <div className="mt-2 pt-2 border-t border-[#262e21] text-[10px] text-emerald-400 font-mono">
              Produces: {town.produces.map(id => id.replaceAll("_", " ")).join(", ")}
            </div>
          </div>
        </section>

        <section className="game-panel p-3 space-y-2.5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#fef08a]">Ruler & Logistics</h3>
          <div className="grid grid-cols-3 gap-2 text-center bg-[#141813] border border-[#2d3527] p-2 rounded">
            <div>
              <span className="text-[9px] text-[#8d9887] block uppercase">Bearing</span>
              <strong className="font-mono text-base text-[#fef08a]">{bearing.toFixed(1)}°</strong>
            </div>
            <div>
              <span className="text-[9px] text-[#8d9887] block uppercase">Distance</span>
              <strong className="font-mono text-base text-[#e2d7ba]">{distance.toFixed(1)} km</strong>
            </div>
            <div>
              <span className="text-[9px] text-[#8d9887] block uppercase">Est. Time</span>
              <strong className="font-mono text-base text-[#e2d7ba]">{hours.toFixed(1)} h</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#141813] border border-[#2d3527] p-2.5 rounded">
            <span className="text-[#38bdf8]">Water ~{(upkeep.totalWaterPerDay * hours / 24).toFixed(1)} L</span>
            <span className="text-[#e2d7ba]">Food ~{(upkeep.humanFoodPerDay * hours / 24).toFixed(1)}</span>
            <span className="text-[#a7f3d0]">Forage ~{(upkeep.animalForagePerDay * hours / 24).toFixed(1)}</span>
            <span className="text-[#fb923c]">Fuel {fuel.toFixed(1)} L</span>
          </div>

          <p className="text-[10px] text-[#8d9887] leading-relaxed">
            North 0° · East 90° · South 180° · West 270°. Enter the measured bearing manually in the travel screen to guide your caravan.
          </p>
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
  onEnter: (id: SettlementId) => void;
  onCamp: () => void;
  rate: number;
  onRate: (rate: number) => void;
  onScavenge?: (secretId: string) => void;
  onRepair?: (method: "tools" | "diesel_parts" | "depot") => void;
}) {
  const heading = state.exploration?.heading ?? 0;
  const [draft, setDraft] = useState<string | null>(null);
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

  return (
    <div className="h-full w-full flex flex-col md:flex-row min-h-0 overflow-hidden gap-2">
      {/* LOCAL DESERT VIEWPORT */}
      <div className="flex-1 min-h-0 flex flex-col justify-between bg-[#151814] rounded border-2 border-[#3d4738] p-1 overflow-hidden shadow-inner">
        <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden">
          <WorldDrawing state={state} selected={selected} onSelect={onSelect} local />
        </div>

        {/* BOTTOM ACTION & TELEMETRY BAR ON MAP */}
        <div className="bg-[#1a1f18] border-t-2 border-[#3d4738] p-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3 text-xs font-mono text-[#c5b896]">
            <span>POS: {position.x.toFixed(1)}, {position.y.toFixed(1)}</span>
            <span className="text-[#8d9887]">|</span>
            <span className="uppercase text-[#fef08a]">{terrain.replaceAll("_", " ")}</span>
            <span className="text-[#8d9887]">|</span>
            <span>{speed.effectiveSpeedKmh.toFixed(1)} km/h</span>
            <span className="text-[#8d9887]">|</span>
            <span>Dist: {(state.exploration?.distanceTravelledKm ?? 0).toFixed(1)} km</span>
          </div>

          <div className="flex items-center gap-2">
            {nearby && (
              <button
                type="button"
                className="game-primary py-1 px-3 text-xs"
                disabled={moving}
                onClick={() => onEnter(nearby)}
              >
                <MapPin size={14}/> Enter {SETTLEMENTS[nearby].name}
              </button>
            )}
            {nearbySecret && (
              <button
                type="button"
                className="game-primary bg-amber-700 hover:bg-amber-600 text-stone-950 py-1 px-3 text-xs"
                disabled={moving}
                onClick={() => onScavenge?.(nearbySecret.id)}
              >
                <MapPin size={14}/> Scavenge {nearbySecret.name}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT CARAVANEER TACTICAL COMPASS DOCK */}
      <div className="w-80 lg:w-88 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
        <div className="game-panel p-3 space-y-3">
          {/* ANALOG COMPASS */}
          <div className="relative mx-auto h-36 w-36 rounded-full border-4 border-[#3d4738] bg-[#c5b083] shadow-inner">
            <span className="absolute left-1/2 top-1 -translate-x-1/2 font-serif font-bold text-xs text-[#141813]">N · 0°</span>
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#141813]">90°</span>
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#141813]">180°</span>
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#141813]">270°</span>
            <svg viewBox="0 0 160 160" className="h-full w-full" aria-label={`Compass bearing ${heading.toFixed(1)} degrees`}>
              <g transform={`rotate(${heading} 80 80)`}>
                <path d="M80 28L92 80 80 72 68 80Z" fill="#991b1b" stroke="#450a0a" strokeWidth="1"/>
                <path d="M80 132L92 80 80 88 68 80Z" fill="#2d3527" stroke="#141813" strokeWidth="1"/>
              </g>
              <circle cx="80" cy="80" r="6" fill="#fef08a" stroke="#2d3527" strokeWidth="2"/>
            </svg>
          </div>

          {/* BEARING INPUTS */}
          <div>
            <label htmlFor="travel-bearing" className="block text-[10px] font-bold uppercase tracking-wider text-[#fef08a] mb-1">
              Heading (Degrees)
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
                className="game-input min-w-0 flex-1 text-sm py-1.5 font-bold"
              />
              <button className="game-secondary py-1 px-3 text-xs" onClick={commitHeading}>Set</button>
            </div>
            <div className="grid grid-cols-4 gap-1 mt-1.5">
              {[0, 90, 180, 270].map((h, i) => (
                <button
                  key={h}
                  className="game-secondary py-1 text-xs font-bold"
                  onClick={() => { setDraft(null); onHeading(h); }}
                >
                  {["N", "E", "S", "W"][i]}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 mt-1.5">
              <button className="game-secondary flex-1 py-1 text-xs" onClick={() => onHeading((heading + 355) % 360)}>−5°</button>
              <button className="game-secondary flex-1 py-1 text-xs" onClick={() => onHeading((heading + 5) % 360)}>+5°</button>
            </div>
          </div>

          {/* MAIN TRAVEL TOGGLE BUTTON */}
          <button
            className={`w-full justify-center py-2.5 text-sm font-bold shadow ${moving ? "game-secondary" : "game-primary"}`}
            onClick={onMove}
          >
            {moving ? <Pause size={16}/> : <Play size={16}/>}
            {moving ? "Halt Caravan" : state.currentSettlement ? "Leave Town & Travel" : "Resume Travel"}
          </button>
        </div>

        {/* FLEET MAINTENANCE & CONDITIONS */}
        <div className="game-panel p-3 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#8d9887]">Fleet Condition:</span>
            <span className={(state.vehicleCondition ?? 100) > 60 ? "text-emerald-400 font-bold" : (state.vehicleCondition ?? 100) > 25 ? "text-amber-400 font-bold" : "text-red-400 font-bold"}>
              {state.vehicleCondition ?? 100}%
            </span>
          </div>

          {state.isBrokenDown && (
            <div className="rounded bg-red-950/80 border border-red-800 text-red-300 font-bold text-center py-1 text-xs">
              BROKEN DOWN (-50% Speed)
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
                  <span className="flex items-center gap-1"><Wrench size={12}/> Roadside Repair</span>
                  <span className="text-emerald-400">+35%</span>
                </button>
              )}
              {(state.inventory.diesel_parts ?? 0) > 0 && (
                <button
                  type="button"
                  disabled={moving || (state.vehicleCondition ?? 100) >= 100}
                  onClick={() => onRepair?.("diesel_parts")}
                  className="game-secondary py-1 text-[11px] justify-between px-2"
                >
                  <span className="flex items-center gap-1"><Wrench size={12}/> Replace Parts</span>
                  <span className="text-emerald-400">+75%</span>
                </button>
              )}
            </div>
          )}

          <div className="pt-1 border-t border-[#2d3527] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="travel-rate" className="text-[#8d9887]">Time Speed:</label>
              <select
                id="travel-rate"
                className="game-input text-xs py-0.5 px-2"
                value={rate}
                onChange={e => onRate(Number(e.target.value))}
              >
                <option value="1">1× (Normal)</option>
                <option value="2">2× (Fast)</option>
                <option value="4">4× (Rush)</option>
              </select>
            </div>

            <button
              className="game-secondary w-full justify-center py-1.5 text-xs"
              disabled={moving || !!state.currentSettlement}
              onClick={onCamp}
            >
              <Tent size={14}/> Camp for 6 hours
            </button>
          </div>

          <div className="h-16 pt-1 flex items-center justify-center opacity-85">
            <TransportIllustration transportId={state.transport} className="h-full w-full object-contain"/>
          </div>
        </div>
      </div>
    </div>
  );
}
