"use client";

import React, { useState } from "react";
import {
  getMarketPrices,
  getTradeRouteRecommendation,
} from "@/domain/economyEngine";
import {
  GameState,
  ItemCategory,
  ItemId,
  NpcProfile,
  SettlementId,
  TransportId,
  WeaponId,
} from "@/domain/types";
import {
  AVAILABLE_MERCENARIES,
  ITEMS,
  SETTLEMENTS,
  TRANSPORTS,
} from "@/domain/worldData";
import {
  Award,
  Beer,
  Coins,
  Flame,
  HeartPulse,
  MessageSquareQuote,
  Package,
  Scale,
  Shield,
  ShoppingBag,
  Sparkles,
  Swords,
  Truck,
  UserPlus,
} from "lucide-react";

interface TownHubPanelProps {
  state: GameState;
  settlementId: SettlementId;
  onBuyItem: (itemId: ItemId, qty: number) => void;
  onSellItem: (itemId: ItemId, qty: number) => void;
  onBuyOrSwitchTransport: (transportId: TransportId) => void;
  onEquipWeapon: (weaponId: WeaponId) => void;
  onBuyRumor: () => void;
  onRestAtSaloon: () => void;
  onHireMercenary: (mercId: string) => void;
  onHuntBountyNow: (bountyId: string) => void;
}

export const TownHubPanel: React.FC<TownHubPanelProps> = ({
  state,
  settlementId,
  onBuyItem,
  onSellItem,
  onBuyOrSwitchTransport,
  onEquipWeapon,
  onBuyRumor,
  onRestAtSaloon,
  onHireMercenary,
  onHuntBountyNow,
}) => {
  const settlement = SETTLEMENTS[settlementId];
  const [activeNpc, setActiveNpc] =
    useState<NpcProfile["role"]>("general_trader");
  const [dialogueMode, setDialogueMode] = useState<
    "greeting" | "lore" | "tip"
  >("greeting");
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | "all">(
    "all"
  );

  const currentNpc = settlement.npcs[activeNpc];

  const allItems = Object.values(ITEMS).filter((item) =>
    categoryFilter === "all" ? true : item.category === categoryFilter
  );

  const townBounties = state.bounties.filter(
    (b) => b.originSettlement === settlementId
  );

  const localMercenaries = AVAILABLE_MERCENARIES;

  return (
    <div className="flex flex-col gap-4">
      {/* Settlement Header & NPC Selector */}
      <div className="rounded-xl border border-amber-900/60 bg-stone-900/95 p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-amber-100">
                {settlement.name}
              </h2>
              <span
                className={`rounded px-2.5 py-0.5 text-xs font-bold uppercase ${
                  settlement.tier === "major_city"
                    ? "bg-sky-950 text-sky-300 border border-sky-700/60"
                    : "bg-amber-950 text-amber-300 border border-amber-700/60"
                }`}
              >
                {settlement.tier === "major_city"
                  ? "US Metropolis (Educated Elite)"
                  : "Old West Frontier Town"}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              {settlement.subtitle}
            </p>
          </div>

          {/* 4 Town NPC Role Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveNpc("general_trader");
                setDialogueMode("greeting");
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                activeNpc === "general_trader"
                  ? "bg-amber-600 text-stone-950 shadow-md"
                  : "bg-stone-800 text-stone-300 hover:bg-stone-700"
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              General Goods & Arms
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveNpc("transport_master");
                setDialogueMode("greeting");
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                activeNpc === "transport_master"
                  ? "bg-amber-600 text-stone-950 shadow-md"
                  : "bg-stone-800 text-stone-300 hover:bg-stone-700"
              }`}
            >
              <Truck className="h-4 w-4" />
              Transport & Fuel Shop
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveNpc("sheriff");
                setDialogueMode("greeting");
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                activeNpc === "sheriff"
                  ? "bg-amber-600 text-stone-950 shadow-md"
                  : "bg-stone-800 text-stone-300 hover:bg-stone-700"
              }`}
            >
              <Shield className="h-4 w-4" />
              Sheriff & Bounties
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveNpc("saloon_barkeep");
                setDialogueMode("greeting");
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                activeNpc === "saloon_barkeep"
                  ? "bg-amber-600 text-stone-950 shadow-md"
                  : "bg-stone-800 text-stone-300 hover:bg-stone-700"
              }`}
            >
              <Beer className="h-4 w-4" />
              Saloon & Mercenaries
            </button>
          </div>
        </div>

        {/* Interactive NPC Dialogue Box */}
        <div className="mt-3 rounded-lg border border-amber-800/40 bg-stone-950/90 p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3 max-w-3xl">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-600/60 bg-amber-950/70 text-amber-300">
                <MessageSquareQuote className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-amber-200">
                    {currentNpc.name}
                  </span>
                  <span className="text-xs text-amber-500">
                    — {currentNpc.title}
                  </span>
                </div>
                <p className="mt-1 text-sm italic text-stone-200 leading-relaxed">
                  &ldquo;
                  {dialogueMode === "greeting"
                    ? currentNpc.greeting
                    : dialogueMode === "lore"
                    ? currentNpc.loreDialogue
                    : currentNpc.tipDialogue}
                  &rdquo;
                </p>
              </div>
            </div>

            {/* Dialogue Topic Prompts */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setDialogueMode("greeting")}
                className={`rounded px-2.5 py-1 text-xs font-medium cursor-pointer ${
                  dialogueMode === "greeting"
                    ? "bg-amber-800/70 text-amber-100"
                    : "bg-stone-800 text-stone-400 hover:text-stone-200"
                }`}
              >
                Greeting
              </button>
              <button
                type="button"
                onClick={() => setDialogueMode("lore")}
                className={`rounded px-2.5 py-1 text-xs font-medium cursor-pointer ${
                  dialogueMode === "lore"
                    ? "bg-amber-800/70 text-amber-100"
                    : "bg-stone-800 text-stone-400 hover:text-stone-200"
                }`}
              >
                Ask About Town
              </button>
              <button
                type="button"
                onClick={() => setDialogueMode("tip")}
                className={`rounded px-2.5 py-1 text-xs font-medium cursor-pointer ${
                  dialogueMode === "tip"
                    ? "bg-amber-800/70 text-amber-100"
                    : "bg-stone-800 text-stone-400 hover:text-stone-200"
                }`}
              >
                Trade & Combat Advice
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: GENERAL GOODS & ARMS TRADER */}
      {activeNpc === "general_trader" && (
        <div className="rounded-xl border border-amber-900/50 bg-stone-900/95 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-amber-400" />
              <h3 className="text-base font-bold text-amber-100">
                Regional Commodity & Arms Exchange
              </h3>
              <span className="rounded bg-emerald-950/80 border border-emerald-700/50 px-2 py-0.5 text-xs text-emerald-300">
                Charisma Bonus: ±
                {Math.round(state.attributes.charisma * 2.5)}% Prices
              </span>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              {(
                [
                  ["all", "All Items"],
                  ["survival", "Water, Food & Fuel"],
                  ["commodity", "Trade Goods"],
                  ["weapon", "Weapons"],
                  ["ammo", "Ammunition"],
                  ["medical", "Medical"],
                  ["contraband", "Contraband"],
                ] as const
              ).map(([cat, label]) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-md px-2.5 py-1 font-semibold cursor-pointer ${
                    categoryFilter === cat
                      ? "bg-amber-600 text-stone-950"
                      : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-800 text-stone-400 uppercase">
                  <th className="py-2.5 px-3">Item & Route Hint</th>
                  <th className="py-2.5 px-2">Weight</th>
                  <th className="py-2.5 px-2">Local Index</th>
                  <th className="py-2.5 px-2">Town Stock</th>
                  <th className="py-2.5 px-2">Buy Price</th>
                  <th className="py-2.5 px-2">Sell Price</th>
                  <th className="py-2.5 px-2">You Carry</th>
                  <th className="py-2.5 px-3 text-right">Trade Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/70">
                {allItems.map((item) => {
                  const prices = getMarketPrices(state, settlementId, item.id);
                  const townStock =
                    state.townStocks[settlementId]?.[item.id] ?? 0;
                  const playerQty = state.inventory[item.id] ?? 0;
                  const routeHint = getTradeRouteRecommendation(item.id);
                  const isProducedHere = settlement.produces.includes(item.id);
                  const isDemandedHere = settlement.demands.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-stone-800/40 transition"
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-100">
                            {item.name}
                          </span>
                          {item.isContraband && (
                            <span className="rounded bg-red-950 border border-red-700/60 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                              CONTRABAND
                            </span>
                          )}
                          {item.category === "weapon" &&
                            playerQty > 0 &&
                            state.equippedWeapon !== item.id && (
                              <button
                                type="button"
                                onClick={() =>
                                  onEquipWeapon(item.id as WeaponId)
                                }
                                className="rounded bg-sky-900/80 px-2 py-0.5 text-[10px] font-bold text-sky-200 hover:bg-sky-800 cursor-pointer"
                              >
                                Equip Weapon
                              </button>
                            )}
                          {state.equippedWeapon === item.id && (
                            <span className="rounded bg-amber-900/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                              EQUIPPED
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          {item.description}
                        </p>
                        <p className="text-[11px] text-amber-400/90 mt-0.5">
                          Route Tip: Cheap in{" "}
                          <strong>{routeHint.cheapestSettlement}</strong> → Sell
                          high in{" "}
                          <strong>{routeHint.highestDemandSettlement}</strong>
                        </p>
                      </td>

                      <td className="py-2.5 px-2 text-stone-300">
                        {item.weightKg} kg
                      </td>

                      <td className="py-2.5 px-2">
                        <span
                          className={`inline-block rounded px-2 py-0.5 font-bold ${
                            prices.relativeToBasePercent <= 80 || isProducedHere
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-700/50"
                              : prices.relativeToBasePercent >= 125 ||
                                isDemandedHere
                              ? "bg-amber-950 text-amber-300 border border-amber-700/50"
                              : "bg-stone-800 text-stone-300"
                          }`}
                        >
                          {prices.relativeToBasePercent}%{" "}
                          {prices.eventMultiplier > 1
                            ? "🔥 EVENT"
                            : isProducedHere
                            ? "(Surplus)"
                            : isDemandedHere
                            ? "(Scarce)"
                            : ""}
                        </span>
                      </td>

                      <td className="py-2.5 px-2 font-mono text-stone-200">
                        {townStock}
                      </td>

                      <td className="py-2.5 px-2 font-mono font-bold text-emerald-300">
                        ${prices.buyPrice}
                      </td>

                      <td className="py-2.5 px-2 font-mono font-bold text-amber-300">
                        ${prices.sellPrice}
                      </td>

                      <td className="py-2.5 px-2 font-mono font-bold text-sky-300">
                        {playerQty}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={
                              townStock < 1 || state.cash < prices.buyPrice
                            }
                            onClick={() => onBuyItem(item.id, 1)}
                            className="rounded bg-emerald-700 px-2 py-1 font-bold text-stone-950 hover:bg-emerald-600 disabled:opacity-30 cursor-pointer"
                          >
                            Buy 1
                          </button>
                          <button
                            type="button"
                            disabled={
                              townStock < 5 || state.cash < prices.buyPrice * 5
                            }
                            onClick={() => onBuyItem(item.id, 5)}
                            className="rounded bg-emerald-900/90 border border-emerald-600/50 px-2 py-1 font-bold text-emerald-200 hover:bg-emerald-800 disabled:opacity-30 cursor-pointer"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            disabled={playerQty < 1}
                            onClick={() => onSellItem(item.id, 1)}
                            className="rounded bg-amber-600 px-2 py-1 font-bold text-stone-950 hover:bg-amber-500 disabled:opacity-30 cursor-pointer ml-1"
                          >
                            Sell 1
                          </button>
                          <button
                            type="button"
                            disabled={playerQty < 5}
                            onClick={() => onSellItem(item.id, 5)}
                            className="rounded bg-amber-900/90 border border-amber-600/50 px-2 py-1 font-bold text-amber-200 hover:bg-amber-800 disabled:opacity-30 cursor-pointer"
                          >
                            All/5
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSPORT, STABLE & FUEL SHOP */}
      {activeNpc === "transport_master" && (
        <div className="rounded-xl border border-amber-900/50 bg-stone-900/95 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-amber-100">
                Caravan Transport, Animals & Motor Vehicles
              </h3>
              <p className="text-xs text-stone-400">
                Frontier towns specialize in pack animals & wooden wagons. Only
                major US cities (Saint Louis & New Denver) manufacture motor
                bikes and trucks.
              </p>
            </div>

            {/* Quick Supply Refill Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onBuyItem("water", 5)}
                className="inline-flex items-center gap-1 rounded-lg border border-sky-700/60 bg-sky-950/70 px-3 py-1.5 text-xs font-bold text-sky-200 hover:bg-sky-900 cursor-pointer"
              >
                +5L Water
              </button>
              <button
                type="button"
                onClick={() => onBuyItem("animal_forage", 5)}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-700/60 bg-emerald-950/70 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-900 cursor-pointer"
              >
                <Package className="h-3.5 w-3.5" /> +5 Animal Forage
              </button>
              <button
                type="button"
                onClick={() => onBuyItem("gasoline", 5)}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-600/60 bg-amber-950/70 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-900 cursor-pointer"
              >
                <Flame className="h-3.5 w-3.5" /> +5L Gasoline
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.values(TRANSPORTS).map((tr) => {
              const isOwned = state.ownedTransports.includes(tr.id);
              const isEquipped = state.transport === tr.id;
              const isSoldInThisTier = tr.availableInTiers.includes(
                settlement.tier
              );

              return (
                <div
                  key={tr.id}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 ${
                    isEquipped
                      ? "border-emerald-500 bg-emerald-950/20"
                      : "border-stone-800 bg-stone-950/80"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-sm text-amber-100">
                        {tr.name}
                      </h4>
                      <span className="rounded bg-stone-800 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                        {tr.propulsion}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-stone-400">
                      {tr.description}
                    </p>

                    <div className="mt-3 space-y-1 text-xs text-stone-300 border-t border-stone-800/80 pt-2">
                      <div className="flex justify-between">
                        <span>Base Speed:</span>
                        <strong className="text-emerald-300">
                          {tr.baseSpeedKmh} km/h
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Cargo Capacity:</span>
                        <strong className="text-amber-300">
                          {tr.maxCargoKg} kg
                        </strong>
                      </div>
                      {tr.propulsion === "animal" && (
                        <div className="flex justify-between text-sky-300">
                          <span>Animal Upkeep/Day:</span>
                          <span>
                            {tr.waterPerDay}L Water + {tr.foragePerDay} Forage
                          </span>
                        </div>
                      )}
                      {tr.propulsion === "motor" && (
                        <div className="flex justify-between text-amber-400">
                          <span>Gasoline Burn Rate:</span>
                          <span>{tr.fuelLitersPer10Km} L / 10 km</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    {isEquipped ? (
                      <div className="w-full rounded-lg bg-emerald-900/60 border border-emerald-600/50 py-2 text-center text-xs font-bold text-emerald-200">
                        ✓ Active Caravan Transport
                      </div>
                    ) : isOwned ? (
                      <button
                        type="button"
                        onClick={() => onBuyOrSwitchTransport(tr.id)}
                        className="w-full rounded-lg bg-sky-700 py-2 text-xs font-bold text-white hover:bg-sky-600 cursor-pointer"
                      >
                        Switch to {tr.name}
                      </button>
                    ) : isSoldInThisTier ? (
                      <button
                        type="button"
                        disabled={state.cash < tr.price}
                        onClick={() => onBuyOrSwitchTransport(tr.id)}
                        className="w-full rounded-lg bg-amber-600 py-2 text-xs font-bold text-stone-950 hover:bg-amber-500 disabled:opacity-40 cursor-pointer"
                      >
                        Buy Transport (${tr.price})
                      </button>
                    ) : (
                      <div className="w-full rounded-lg bg-stone-900 border border-stone-800 py-2 text-center text-xs text-stone-500">
                        Sold only in{" "}
                        {tr.availableInTiers.includes("major_city")
                          ? "Major US Cities (Saint Louis / New Denver)"
                          : "Frontier Towns"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SHERIFF'S OFFICE & BOUNTY BOARD */}
      {activeNpc === "sheriff" && (
        <div className="rounded-xl border border-amber-900/50 bg-stone-900/95 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-400" />
              <h3 className="text-base font-bold text-amber-100">
                Sheriff&apos;s Wanted Bounty Board & Customs Law
              </h3>
            </div>
            <span className="text-xs text-stone-300">
              Your Law Reputation:{" "}
              <strong className="text-amber-300">{state.reputation}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {state.bounties.map((bounty) => {
              const isLocal = bounty.originSettlement === settlementId;
              return (
                <div
                  key={bounty.id}
                  className={`flex flex-col justify-between rounded-xl border p-4 ${
                    bounty.completed
                      ? "border-emerald-800/50 bg-emerald-950/20"
                      : isLocal
                      ? "border-amber-700/60 bg-stone-950"
                      : "border-stone-800 bg-stone-950/60"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                        WANTED DEAD OR ALIVE
                      </span>
                      <span className="font-mono text-sm font-bold text-emerald-400">
                        ${bounty.rewardCash}
                      </span>
                    </div>
                    <h4 className="mt-1 text-base font-bold text-amber-100">
                      {bounty.bossName}
                    </h4>
                    <p className="text-xs text-amber-400">{bounty.gangName}</p>
                    <p className="mt-2 text-xs text-stone-300">
                      {bounty.description}
                    </p>
                  </div>

                  <div className="mt-4">
                    {bounty.completed ? (
                      <div className="rounded-lg bg-emerald-900/50 py-2 text-center text-xs font-bold text-emerald-300">
                        ✓ Outlaw Eliminated — Route Secured
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onHuntBountyNow(bounty.id)}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-700 py-2 text-xs font-bold text-white hover:bg-red-600 cursor-pointer"
                      >
                        <Swords className="h-3.5 w-3.5" /> Track & Engage Outlaw
                        Now
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {townBounties.length === 0 && (
            <p className="mt-3 text-xs text-stone-400">
              All regional bounties from across the territory are listed above
              so you can hunt them from any jurisdiction.
            </p>
          )}
        </div>
      )}

      {/* TAB 4: SALOON, RUMORS & MERCENARIES */}
      {activeNpc === "saloon_barkeep" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Market Rumors & Rest */}
          <div className="rounded-xl border border-amber-900/50 bg-stone-900/95 p-4">
            <h3 className="flex items-center gap-2 text-base font-bold text-amber-100">
              <Sparkles className="h-5 w-5 text-amber-400" />
              Saloon Telegraph Rumors & Clinic Rest
            </h3>
            <p className="mt-1 text-xs text-stone-400">
              Buy a round of drinks for traveling teamsters to uncover where
              droughts, fevers, or military convoys have spiked commodity
              prices!
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={state.cash < 15}
                onClick={onBuyRumor}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-stone-950 hover:bg-amber-500 disabled:opacity-40 cursor-pointer"
              >
                <Coins className="h-4 w-4" /> Buy Market Rumor ($15)
              </button>

              <button
                type="button"
                disabled={state.cash < 20}
                onClick={onRestAtSaloon}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/60 bg-emerald-950/70 px-3.5 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-900 disabled:opacity-40 cursor-pointer"
              >
                <HeartPulse className="h-4 w-4" /> Rest & Patch Squad HP ($20)
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Active Known Market Spikes:
              </h4>
              {state.marketEvents
                .filter((evt) => state.knownRumorIds.includes(evt.id))
                .map((evt) => (
                  <div
                    key={evt.id}
                    className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-amber-200">
                      <span>🔥 {evt.title}</span>
                      <span className="text-emerald-300">
                        {evt.priceMultiplier}x Price ({evt.daysRemaining}d left)
                      </span>
                    </div>
                    <p className="mt-1 text-stone-300">{evt.description}</p>
                  </div>
                ))}
            </div>
          </div>

          {/* Mercenary Recruitment */}
          <div className="rounded-xl border border-amber-900/50 bg-stone-900/95 p-4">
            <h3 className="flex items-center gap-2 text-base font-bold text-amber-100">
              <UserPlus className="h-5 w-5 text-amber-400" />
              Hire Caravan Escort Mercenaries
            </h3>
            <p className="mt-1 text-xs text-stone-400">
              Hired guns fight under your command on the top-down tactical grid,
              providing extra Action Points and firepower in exchange for a
              daily wage and rations.
            </p>

            <div className="mt-3 space-y-3">
              {localMercenaries.map((merc) => {
                const isHired = state.hiredMercenaries.some(
                  (m) => m.id === merc.id
                );
                return (
                  <div
                    key={merc.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-800 bg-stone-950 p-3 text-xs"
                  >
                    <div className="max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-amber-100">
                          {merc.name}
                        </span>
                        <span className="rounded bg-stone-800 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          {merc.roleTitle}
                        </span>
                      </div>
                      <p className="mt-1 text-stone-400">{merc.bio}</p>
                      <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-stone-300">
                        <span>
                          HP: <strong>{merc.maxHp}</strong>
                        </span>
                        <span>
                          AP: <strong>{merc.maxAp}</strong>
                        </span>
                        <span>
                          Weapon:{" "}
                          <strong>{ITEMS[merc.equippedWeapon].name}</strong>
                        </span>
                        <span>
                          Wage: <strong>${merc.dailyWage}/day</strong>
                        </span>
                      </div>
                    </div>

                    <div>
                      {isHired ? (
                        <span className="rounded-lg bg-emerald-950 border border-emerald-700/60 px-3 py-1.5 font-bold text-emerald-300">
                          ✓ In Your Squad
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={state.cash < merc.hiringFee}
                          onClick={() => onHireMercenary(merc.id)}
                          className="rounded-lg bg-amber-600 px-3.5 py-2 font-bold text-stone-950 hover:bg-amber-500 disabled:opacity-40 cursor-pointer"
                        >
                          Hire (${merc.hiringFee})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
