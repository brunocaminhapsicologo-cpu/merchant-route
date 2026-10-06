"use client";

import React, { useRef, useState } from "react";
import { TownHubPanel, type TownHubPanelProps } from "./TownHubPanel";
import { NpcPortraitSvg } from "@/assets/caravaneerSprites";
import { getMarketPrices } from "@/domain/economyEngine";
import type { NpcProfile, SettlementTier } from "@/domain/types";
import { SETTLEMENTS } from "@/domain/worldData";

type Place = NpcProfile["role"] | "clinic" | "well" | "gate";
export interface TownSceneProps extends TownHubPanelProps {
  onLeaveTown?: () => void;
}
const places: { id: Place; name: string; sign: string; x: number; y: number; color: string }[] = [
  { id: "general_trader", name: "General Goods & Arms", sign: "TRADE", x: 8, y: 12, color: "#927044" },
  { id: "transport_master", name: "Transport & Fuel", sign: "DEPOT", x: 69, y: 12, color: "#616f65" },
  { id: "sheriff", name: "Sheriff's Office", sign: "LAW", x: 8, y: 60, color: "#716755" },
  { id: "saloon_barkeep", name: "Saloon & Escorts", sign: "SALOON", x: 69, y: 60, color: "#8b5145" },
  { id: "clinic", name: "Clinic", sign: "+ CLINIC", x: 39, y: 12, color: "#607f75" },
  { id: "well", name: "Town Well", sign: "WATER", x: 39, y: 60, color: "#416e78" },
  { id: "gate", name: "City Gate", sign: "GATE", x: 39, y: 83, color: "#5d5648" },
];
const actionClass = "rounded-lg border border-amber-700 bg-amber-950 px-4 py-3 text-sm font-bold text-amber-100 hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200 disabled:opacity-40";

export function TownScene(props: TownSceneProps) {
  return <TownVisit key={props.settlementId + ":" + props.state.currentSettlement} {...props} />;
}

function TownVisit(props: TownSceneProps) {
  const { state, settlementId, onLeaveTown } = props;
  const settlement = SETTLEMENTS[settlementId];
  const [place, setPlace] = useState<Place | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const mapButtons = useRef<Partial<Record<Place, HTMLButtonElement | null>>>({});
  const lastPlace = useRef<Place | null>(null);
  const major = settlement.tier === "major_city";
  const accessible = state.currentSettlement === settlementId && !state.combatState;
  const selected = places.find((entry) => entry.id === place);
  const isNpc = place === "general_trader" || place === "transport_master" || place === "sheriff" || place === "saloon_barkeep";
  const waterPrice = getMarketPrices(state, settlementId, "water").buyPrice;
  const waterStock = state.townStocks[settlementId]?.water ?? 0;
  const navigate = (next: Place | null) => {
    lastPlace.current = next ?? place;
    setPlace(next);
    requestAnimationFrame(() => {
      if (next) heading.current?.focus();
      else if (lastPlace.current) mapButtons.current[lastPlace.current]?.focus();
    });
  };

  if (!accessible) return <section className="rounded-xl border border-stone-700 bg-stone-950 p-6 text-stone-200" aria-label="Town unavailable">
    <h2 className="text-xl font-bold">Town inaccessible</h2>
    <p className="mt-2">{state.combatState ? "Finish the active combat before using town services." : "Arrive at " + settlement.name + " to visit its shops and residents."}</p>
  </section>;

  return <section className="town-scene space-y-4 text-stone-100" aria-label={settlement.name + " town scene"}>
    <style>{`
      .town-scene .scene-entry { animation: merchant-room-entry 220ms ease-out; }
      .town-scene .town-building { transition: transform 150ms ease, filter 150ms ease; }
      .town-scene .town-building:hover { transform: translateY(-3px); filter: brightness(1.15); }
      .town-scene .town-building:active { transform: translateY(1px); }
      @keyframes merchant-room-entry { from { opacity: .4; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      @media (prefers-reduced-motion: reduce) {
        .town-scene .scene-entry { animation: none; }
        .town-scene .town-building { transition: none; }
        .town-scene .town-building:hover, .town-scene .town-building:active { transform: none; }
      }
    `}</style>
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-900 bg-stone-950 p-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-amber-400">{major ? "Walled metropolis · paved streets" : "Frontier settlement · dusty trails"}</p>
        <h2 ref={heading} tabIndex={-1} className="text-xl font-bold text-amber-100">{settlement.name}{selected ? " / " + selected.name : ""}</h2>
        <p className="text-sm text-stone-400">{settlement.subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-amber-200">Cash: ${state.cash} · HP: {state.hp}</span>
        {place && <button type="button" className={actionClass} onClick={() => navigate(null)}>← Back to town</button>}
      </div>
    </header>
    {!place ? <div className="scene-entry rounded-xl border border-amber-900 bg-stone-950 p-3">
      <p className="mb-3 text-sm text-stone-300">Choose a building to enter. Use Tab and Enter to visit any location. On small screens, scroll the map sideways.</p>
      <div className="overflow-x-auto rounded-lg" tabIndex={0} aria-label="Scrollable town map">
        <div className="relative min-w-[640px]" style={{ aspectRatio: "8 / 5", background: major ? "#424b46" : "#9a8055" }}>
          <svg viewBox="0 0 800 500" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <rect x="12" y="12" width="776" height="476" rx="12" fill="none" stroke={major ? "#89958f" : "#584632"} strokeWidth={major ? 18 : 7} />
            <path d="M30 244H770 M400 28V480" stroke={major ? "#737b76" : "#c1a274"} strokeWidth={major ? 80 : 65} />
            <path d="M30 244H770 M400 28V480" stroke={major ? "#a5aaa1" : "#d5b880"} strokeWidth="2" strokeDasharray={major ? "18 12" : "3 14"} />
            {[45, 185, 615, 755].map((x) => <g key={x}>
              <circle cx={x} cy="218" r={major ? 13 : 10} fill={major ? "#3e604b" : "#6a723e"} />
              <rect x={x - 3} y="237" width="6" height="25" fill="#4d4235" />
              {major && <circle cx={x} cy="236" r="4" fill="#e4c789" />}
            </g>)}
            <text x="48" y="287" fill="#292720" fontSize="14" letterSpacing="4">MAIN STREET</text>
            <path d="M736 410v-35m-8 12 8-12 8 12" stroke="#ede0bd" strokeWidth="3" fill="none" />
            <text x="730" y="430" fill="#ede0bd" fontSize="16">N</text>
          </svg>
          {places.map((entry) => <button key={entry.id} type="button"
            ref={(node) => { mapButtons.current[entry.id] = node; }}
            onClick={() => navigate(entry.id)} aria-label={"Visit " + entry.name}
            className="town-building absolute flex flex-col items-center justify-center rounded-md border-2 border-stone-950 text-white shadow-xl focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-yellow-200"
            style={{ left: entry.x + "%", top: entry.y + "%", width: "23%", height: entry.id === "gate" ? "13%" : "23%", background: entry.color }}>
            {entry.id !== "well" && entry.id !== "gate" && <svg viewBox="0 0 180 85" className="pointer-events-none absolute inset-0 h-full w-full opacity-40" aria-hidden="true">
              <path d="M8 8H172V77H8Z" fill="none" stroke={major ? "#c5d3cd" : "#e0b77d"} strokeWidth="7" />
              <path d="M8 8 90 42 172 8M8 77 90 42 172 77M90 8V77" fill="none" stroke="#241f17" strokeWidth="3" />
              <rect x="137" y="17" width="15" height="20" fill="#211f1c" />
            </svg>}
            {entry.id === "well" ? <svg viewBox="0 0 100 45" className="h-9 w-20" aria-hidden="true"><ellipse cx="50" cy="23" rx="30" ry="18" fill="#9b9e92" /><ellipse cx="50" cy="23" rx="20" ry="11" fill="#203e48" /><path d="M20 30V3H80V30" fill="none" stroke="#c3a26d" strokeWidth="5" /></svg> :
              <span aria-hidden="true" className="mb-1 w-4/5 border-y-4 border-black/25 py-1 text-xs font-bold tracking-widest">{entry.sign}</span>}
            <span className="relative rounded bg-stone-950/70 px-1 text-xs font-bold sm:text-sm">{entry.name}</span>
            {entry.id !== "well" && entry.id !== "gate" && <span aria-hidden="true" className="mt-1 h-3 w-5 border border-amber-200/50 bg-stone-950/70" />}
          </button>)}
        </div>
      </div>
      <p className="mt-3 text-sm text-stone-400">{settlement.lore}</p>
    </div> : <div key={place} className="scene-entry space-y-4">
      <InteriorScene place={place} tier={settlement.tier} />
      {isNpc ? <TownHubPanel key={place} {...props} initialNpc={place} hideNavigation /> :
        <div className="rounded-xl border border-amber-900 bg-stone-950 p-5">
          {place === "clinic" && <>
            <h3 className="text-lg font-bold text-amber-100">Caravan clinic</h3>
            <p className="my-3 text-sm text-stone-300">The saloon clinic's existing rest service restores your HP and every hired escort's HP for $20.</p>
            <button type="button" className={actionClass} disabled={state.cash < 20} onClick={props.onRestAtSaloon}>Rest & heal squad — $20</button>
            {state.cash < 20 && <p className="mt-2 text-sm text-amber-300">You need $20 for treatment.</p>}
          </>}
          {place === "well" && <>
            <h3 className="text-lg font-bold text-amber-100">Water supply station</h3>
            <p className="my-3 text-sm text-stone-300">Water comes from local market stock. Stock: {waterStock} L · ${waterPrice}/L · Carried: {state.inventory.water ?? 0} L.</p>
            <button type="button" className={actionClass} disabled={waterStock < 1 || state.cash < waterPrice} onClick={() => props.onBuyItem("water", 1)}>Buy 1 L — ${waterPrice}</button>
            {(waterStock < 1 || state.cash < waterPrice) && <p className="mt-2 text-sm text-amber-300">{waterStock < 1 ? "The town has no water left to sell." : "Insufficient cash for water."}</p>}
          </>}
          {place === "gate" && <>
            <h3 className="text-lg font-bold text-amber-100">Caravan departure gate</h3>
            <p className="my-3 text-sm text-stone-300">Leave the town view to plan your journey. Choose routes and compass headings in the overworld travel controls.</p>
            <button type="button" className={actionClass} disabled={!onLeaveTown} onClick={onLeaveTown}>Leave town</button>
            {!onLeaveTown && <p className="mt-2 text-sm text-amber-300">Departure is controlled by the overworld. Close the town view using its travel controls.</p>}
          </>}
        </div>}
      <p role="status" aria-live="polite" className="rounded-lg border border-stone-800 bg-stone-950 p-3 text-sm text-stone-300">
        Latest journal entry: {state.journalLogs[0] ?? "No activity recorded yet."}
      </p>
    </div>}
  </section>;
}

/** Original code-drawn rooms with furniture specific to each service. */
function InteriorScene({ place, tier }: { place: Place; tier: SettlementTier }) {
  const major = tier === "major_city";
  const role = place === "general_trader" || place === "transport_master" || place === "sheriff" || place === "saloon_barkeep" ? place : null;
  return <div className="relative overflow-hidden rounded-xl border border-amber-800 bg-stone-950">
    <svg viewBox="0 0 800 280" className="w-full" role="img" aria-label={(places.find((entry) => entry.id === place)?.name ?? "") + (major ? " city interior" : " frontier interior")}>
      <rect width="800" height="280" fill={major ? "#474c47" : "#55412d"} />
      {Array.from({ length: 15 }, (_, i) => <path key={i} d={"M0 " + i * 20 + "H800"} stroke={major ? "#61675e" : "#725b3e"} />)}
      <path d="M18 270V18H782V270" fill="none" stroke={major ? "#89948c" : "#a27d4e"} strokeWidth="20" />
      <rect x="350" y="246" width="100" height="34" fill="#1c1917" />
      <rect x="60" y="36" width="120" height="50" fill="#58727a" stroke="#c8b98a" strokeWidth="6" />
      <path d="M120 36v50M60 61h120" stroke="#c8b98a" strokeWidth="4" />
      {place === "general_trader" && <g>
        {[50, 590].map((x) => <g key={x}><rect x={x} y="112" width="160" height="95" fill="#332a20" stroke="#b18c57" strokeWidth="5" />
          {[0, 1, 2].map((row) => <g key={row}><path d={"M" + x + " " + (138 + row * 28) + "h160"} stroke="#b18c57" strokeWidth="4" />
            {[0, 1, 2, 3].map((col) => <rect key={col} x={x + 12 + col * 37} y={118 + row * 28} width="24" height="18" fill={row === 1 ? "#718476" : "#b69159"} />)}</g>)}</g>)}
        <rect x="275" y="145" width="250" height="35" fill="#8a633d" stroke="#cca16a" strokeWidth="4" />
        <path d="M306 160h100m-82-6v15" stroke="#262925" strokeWidth="8" />
      </g>}
      {place === "transport_master" && <g>
        <rect x="50" y="108" width="230" height="100" fill="#282c28" stroke="#89948a" strokeWidth="5" />
        {[90, 230].map((x) => <circle key={x} cx={x} cy="196" r="26" fill="#1b1c1a" stroke="#b09c78" strokeWidth="8" />)}
        <rect x="72" y="123" width="183" height="55" fill={major ? "#54736b" : "#987544"} />
        <rect x="580" y="104" width="150" height="42" fill="#987b4c" />
        {[600, 660, 720].map((x) => <g key={x}><rect x={x} y="167" width="35" height="57" rx="10" fill="#857052" /><path d={"M" + x + " 180h35m-35 26h35"} stroke="#353c35" strokeWidth="5" /></g>)}
      </g>}
      {place === "sheriff" && <g>
        <rect x="70" y="110" width="150" height="115" fill="#958269" stroke="#3a3024" strokeWidth="6" />
        {[0, 1, 2].map((i) => <g key={i}><rect x={86 + i * 42} y="130" width="30" height="58" fill="#dfc99f" /><circle cx={101 + i * 42} cy="146" r="6" fill="#6d5240" /></g>)}
        <rect x="550" y="40" width="180" height="186" fill="#282c29" />
        {[570, 600, 630, 660, 690, 720].map((x) => <path key={x} d={"M" + x + " 40v186"} stroke="#939488" strokeWidth="5" />)}
        <rect x="280" y="151" width="230" height="52" fill="#997545" stroke="#c6a66c" strokeWidth="5" />
      </g>}
      {place === "saloon_barkeep" && <g>
        <rect x="240" y="95" width="340" height="35" fill="#2a211a" />
        {Array.from({ length: 10 }, (_, i) => <rect key={i} x={255 + i * 32} y="67" width="15" height="27" rx="4" fill={i % 2 ? "#b49354" : "#597b61"} />)}
        <rect x="245" y="154" width="330" height="35" fill="#a17a47" stroke="#cfad74" strokeWidth="4" />
        {[90, 675].map((x) => <g key={x}><circle cx={x} cy="184" r="40" fill="#976e40" stroke="#c79a5f" strokeWidth="5" /><circle cx={x - 8} cy="182" r="7" fill="#d9bd85" /></g>)}
      </g>}
      {place === "clinic" && <g>
        {[90, 540].map((x) => <g key={x}><rect x={x} y="114" width="160" height="105" fill="#c3c2ab" stroke="#6a7c77" strokeWidth="8" /><rect x={x + 14} y="126" width="40" height="78" rx="5" fill="#e1dfc8" /></g>)}
        <path d="M390 68h20v-20h20v20h20v20h-20v20h-20V88h-20Z" fill="#c0987b" />
      </g>}
      {place === "well" && <g><ellipse cx="400" cy="157" rx="105" ry="65" fill="#94978b" /><ellipse cx="400" cy="157" rx="73" ry="42" fill="#315661" /><path d="M294 180V55H506V180M400 55v90" fill="none" stroke="#bd9c65" strokeWidth="12" /><rect x="388" y="142" width="25" height="24" fill="#ae9780" /></g>}
      {place === "gate" && <g><path d="M180 244V50H620V244" fill="none" stroke="#aaa48b" strokeWidth="35" /><rect x="230" y="82" width="340" height="163" fill="#252e28" /><path d="M400 82v163M230 170h340" stroke="#8c7857" strokeWidth="12" /></g>}
    </svg>
    {role && <div className="absolute left-1/2 top-[26%] h-14 w-14 -translate-x-1/2 rounded-full border-2 border-amber-400 bg-stone-950 sm:h-20 sm:w-20" aria-hidden="true">
      <NpcPortraitSvg role={role} tier={tier} className="h-full w-full rounded-full" />
    </div>}
  </div>;
}
