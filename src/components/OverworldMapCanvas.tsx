"use client";

import React, { useEffect, useRef } from "react";
import { drawCaravaneerMapBackground } from "@/assets/caravaneerSprites";
import { getCaravanSpeedBreakdown, getRouteBetween } from "@/domain/economyEngine";
import {
  GameState,
  RouteEdge,
  SettlementId,
  TerrainType,
} from "@/domain/types";
import { ROUTES, SETTLEMENTS, TRANSPORTS } from "@/domain/worldData";
import {
  AlertTriangle,
  Compass,
  Flame,
  Footprints,
  MapPin,
  Navigation,
  Pause,
  Play,
  ShieldAlert,
  Truck,
} from "lucide-react";

interface OverworldMapCanvasProps {
  state: GameState;
  selectedSettlement: SettlementId;
  onSelectSettlement: (id: SettlementId) => void;
  onStartTravel: (targetId: SettlementId) => void;
  onTogglePauseTravel: () => void;
  onTriggerTestEncounter: () => void;
}

const TERRAIN_LABELS: Record<
  TerrainType,
  { label: string; color: string; strokeDash: number[] }
> = {
  old_highway: {
    label: "Old Asphalt Highway (+Speed for Wheels)",
    color: "#7c2d12",
    strokeDash: [],
  },
  scorched_flats: {
    label: "Scorched Scrub Flats (Balanced)",
    color: "#78350f",
    strokeDash: [8, 5],
  },
  sand_dunes: {
    label: "Alkali Sand Dunes (Slows Wagons, +Water Use)",
    color: "#9a3412",
    strokeDash: [4, 6],
  },
  rocky_canyon: {
    label: "Rocky Canyon Pass (Best for Donkeys)",
    color: "#44403c",
    strokeDash: [10, 4],
  },
};

export const OverworldMapCanvas: React.FC<OverworldMapCanvasProps> = ({
  state,
  selectedSettlement,
  onSelectSettlement,
  onStartTravel,
  onTogglePauseTravel,
  onTriggerTestEncounter,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Authentic Caravaneer desert parchment, salt flats, canyons & compass rose
    drawCaravaneerMapBackground(ctx, width, height);

    // Region watermarks
    ctx.save();
    ctx.font = "bold 13px monospace";
    ctx.fillStyle = "rgba(69, 26, 3, 0.55)";
    ctx.fillText("WESTERN OLD-WEST FRONTIER", 36, 42);
    ctx.fillStyle = "rgba(30, 58, 138, 0.55)";
    ctx.fillText("EASTERN METROPOLITAN ZONE", width - 310, 42);
    ctx.restore();

    // 3. Draw Trade Routes
    ROUTES.forEach((route: RouteEdge) => {
      const fromSet = SETTLEMENTS[route.from];
      const toSet = SETTLEMENTS[route.to];
      const terrainStyle = TERRAIN_LABELS[route.terrain];

      const isCurrentActiveRoute =
        state.travelState && state.travelState.routeId === route.id;

      ctx.save();
      ctx.beginPath();
      ctx.setLineDash(terrainStyle.strokeDash);
      ctx.strokeStyle = isCurrentActiveRoute
        ? "#0284c7"
        : terrainStyle.color;
      ctx.lineWidth = isCurrentActiveRoute ? 4.5 : 2.8;
      ctx.moveTo(fromSet.coordinates.x, fromSet.coordinates.y);
      ctx.lineTo(toSet.coordinates.x, toSet.coordinates.y);
      ctx.stroke();

      // Distance badge at midpoint
      const midX = (fromSet.coordinates.x + toSet.coordinates.x) / 2;
      const midY = (fromSet.coordinates.y + toSet.coordinates.y) / 2;

      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(24, 18, 12, 0.88)";
      ctx.strokeStyle = "rgba(217, 119, 6, 0.55)";
      ctx.lineWidth = 1;
      ctx.fillRect(midX - 34, midY - 11, 68, 22);
      ctx.strokeRect(midX - 34, midY - 11, 68, 22);

      ctx.fillStyle = "#fde68a";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${route.distanceKm} km`, midX, midY + 4);
      ctx.restore();
    });

    // 4. Draw Settlements
    Object.values(SETTLEMENTS).forEach((settlement) => {
      const { x, y } = settlement.coordinates;
      const isPlayerHere = state.currentSettlement === settlement.id;
      const isSelected = selectedSettlement === settlement.id;
      const isMajorCity = settlement.tier === "major_city";

      ctx.save();

      // Outer pulse ring if selected or player is here
      if (isPlayerHere || isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, 24, 0, Math.PI * 2);
        ctx.strokeStyle = isPlayerHere ? "#15803d" : "#b45309";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(x, y, isMajorCity ? 16 : 13, 0, Math.PI * 2);
      ctx.fillStyle = isMajorCity ? "#1e3a8a" : "#78350f";
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = isMajorCity ? "#93c5fd" : "#fbbf24";
      ctx.stroke();

      // Inner icon symbol
      ctx.fillStyle = "#fffbeb";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(isMajorCity ? "★" : "⛺", x, y + 4);

      // Label backdrop plate for readability over parchment
      ctx.fillStyle = "rgba(24, 18, 12, 0.84)";
      ctx.fillRect(x - 68, y + 19, 136, 30);
      ctx.strokeStyle = isMajorCity
        ? "rgba(96, 165, 250, 0.5)"
        : "rgba(217, 119, 6, 0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 68, y + 19, 136, 30);

      // Settlement Name Label
      ctx.font = isMajorCity ? "bold 12px sans-serif" : "bold 11px sans-serif";
      ctx.fillStyle = isMajorCity ? "#93c5fd" : "#fef3c7";
      ctx.fillText(settlement.name, x, y + 32);

      // Tier Tag
      ctx.font = "9px monospace";
      ctx.fillStyle = isMajorCity ? "#60a5fa" : "#f59e0b";
      ctx.fillText(
        isMajorCity ? "[US METROPOLIS]" : "[OLD WEST TOWN]",
        x,
        y + 44
      );

      ctx.restore();
    });

    // 5. Draw Active Caravan Position on Map
    let caravanX = 0;
    let caravanY = 0;

    if (state.travelState) {
      const fromSet = SETTLEMENTS[state.travelState.from];
      const toSet = SETTLEMENTS[state.travelState.to];
      const progress = Math.min(
        1,
        Math.max(
          0,
          state.travelState.distanceCoveredKm /
            state.travelState.totalDistanceKm
        )
      );
      caravanX =
        fromSet.coordinates.x +
        (toSet.coordinates.x - fromSet.coordinates.x) * progress;
      caravanY =
        fromSet.coordinates.y +
        (toSet.coordinates.y - fromSet.coordinates.y) * progress;
    } else if (state.currentSettlement) {
      const cur = SETTLEMENTS[state.currentSettlement];
      caravanX = cur.coordinates.x;
      caravanY = cur.coordinates.y - 24;
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(caravanX, caravanY, 11, 0, Math.PI * 2);
    ctx.fillStyle = "#16a34a";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#bbf7d0";
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("YOU", caravanX, caravanY + 3.5);
    ctx.restore();
  }, [state, selectedSettlement]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    for (const settlement of Object.values(SETTLEMENTS)) {
      const dx = clickX - settlement.coordinates.x;
      const dy = clickY - settlement.coordinates.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 28) {
        onSelectSettlement(settlement.id);
        break;
      }
    }
  };

  const selectedDef = SETTLEMENTS[selectedSettlement];
  const originSettlement = state.currentSettlement ?? state.lastVisitedSettlement;
  const connectedRoute =
    originSettlement !== selectedSettlement
      ? getRouteBetween(originSettlement, selectedSettlement)
      : undefined;

  const speedInfo = getCaravanSpeedBreakdown(
    state,
    connectedRoute?.terrain ?? state.travelState?.terrain ?? "scorched_flats"
  );

  const estimatedHours = connectedRoute
    ? Math.max(
        1,
        Math.round(
          (connectedRoute.distanceKm / speedInfo.effectiveSpeedKmh) * 10
        ) / 10
      )
    : 0;

  const transportDef = TRANSPORTS[state.transport];
  const estimatedFuelNeeded = connectedRoute
    ? Math.ceil(
        (connectedRoute.distanceKm / 10) * transportDef.fuelLitersPer10Km
      )
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-xl border border-amber-900/60 bg-stone-950 shadow-2xl">
        {/* Top Map Overlay Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-900/40 bg-stone-900/90 px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-amber-200">
            <Compass className="h-4 w-4 text-amber-400" />
            <span className="font-semibold uppercase tracking-wider">
              Wasteland Overworld Map
            </span>
            <span className="text-stone-400">
              (Click any town node on the map to inspect route & prices)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-amber-400">
              ● Old West Frontier Towns (5)
            </span>
            <span className="inline-flex items-center gap-1 text-sky-400">
              ★ US Major Metropolises (3)
            </span>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={1000}
          height={680}
          onClick={handleCanvasClick}
          className="w-full cursor-pointer block bg-stone-950"
        />

        {/* Active Travel Overlay Bar */}
        {state.travelState && (
          <div className="border-t border-sky-800/60 bg-stone-900/95 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-sky-300">
                  <Navigation className="h-4 w-4 animate-pulse" />
                  <span>
                    Traveling:{" "}
                    {SETTLEMENTS[state.travelState.from].name} →{" "}
                    {SETTLEMENTS[state.travelState.to].name}
                  </span>
                  <span className="rounded bg-sky-950 px-2 py-0.5 text-xs text-sky-200 border border-sky-700/50">
                    {TERRAIN_LABELS[state.travelState.terrain].label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-300">
                  Distance Covered:{" "}
                  <strong className="text-amber-300">
                    {state.travelState.distanceCoveredKm.toFixed(1)} /{" "}
                    {state.travelState.totalDistanceKm} km
                  </strong>{" "}
                  • Current Speed:{" "}
                  <strong className="text-emerald-300">
                    {speedInfo.effectiveSpeedKmh} km/h
                  </strong>{" "}
                  ({speedInfo.statusLabel})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onTogglePauseTravel}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-600/60 bg-amber-950/70 px-3.5 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-900/80 cursor-pointer"
                >
                  {state.travelState.isPaused ? (
                    <>
                      <Play className="h-3.5 w-3.5" /> Resume Caravan
                    </>
                  ) : (
                    <>
                      <Pause className="h-3.5 w-3.5" /> Pause Caravan
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onTriggerTestEncounter}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-700/70 bg-red-950/70 px-3.5 py-2 text-xs font-semibold text-red-200 hover:bg-red-900/80 cursor-pointer"
                >
                  <ShieldAlert className="h-3.5 w-3.5" /> Simulate Road Ambush
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-stone-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-sky-400 transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    (state.travelState.distanceCoveredKm /
                      state.travelState.totalDistanceKm) *
                      100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Selected Settlement & Route Planner Panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-amber-900/50 bg-stone-900/90 p-4 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-bold text-amber-100">
                  {selectedDef.name}
                </h3>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    selectedDef.tier === "major_city"
                      ? "bg-sky-950 text-sky-300 border border-sky-700/50"
                      : "bg-amber-950 text-amber-300 border border-amber-700/50"
                  }`}
                >
                  {selectedDef.tier === "major_city"
                    ? "Major US Metropolis"
                    : "Old West Frontier Settlement"}
                </span>
              </div>
              <p className="text-xs text-amber-400/90 mt-0.5">
                {selectedDef.subtitle}
              </p>
            </div>

            {state.currentSettlement === selectedDef.id && (
              <span className="rounded-full bg-emerald-950 border border-emerald-600/60 px-3 py-1 text-xs font-bold text-emerald-300">
                ● Your Caravan is Docked Here
              </span>
            )}
          </div>

          <p className="mt-2.5 text-xs leading-relaxed text-stone-300">
            {selectedDef.lore}
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/25 p-2.5">
              <span className="font-semibold text-emerald-300">
                ⬇ Local Production (Cheap to Buy):
              </span>
              <p className="mt-1 text-stone-200">
                {selectedDef.produces.join(", ").replaceAll("_", " ")}
              </p>
            </div>
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/25 p-2.5">
              <span className="font-semibold text-amber-300">
                ⬆ High Inflation Demand (Profitable to Sell):
              </span>
              <p className="mt-1 text-stone-200">
                {selectedDef.demands.join(", ").replaceAll("_", " ")}
              </p>
            </div>
          </div>
        </div>

        {/* Route Action Card */}
        <div className="flex flex-col justify-between rounded-xl border border-amber-900/50 bg-stone-900/90 p-4">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-bold text-amber-200">
              <Truck className="h-4 w-4 text-amber-400" />
              Route Dispatch & Logistics
            </h4>

            {state.currentSettlement === selectedDef.id ? (
              <p className="mt-2 text-xs text-stone-300">
                You are currently inside <strong>{selectedDef.name}</strong>.
                Switch to the <strong>Town Hub & Market</strong> tab above to
                trade goods, talk to the Sheriff, or upgrade your transport, or
                click another settlement on the map to plot a route.
              </p>
            ) : connectedRoute ? (
              <div className="mt-2.5 space-y-1.5 text-xs text-stone-300">
                <div className="flex justify-between">
                  <span className="text-stone-400">Route Name:</span>
                  <span className="font-semibold text-amber-200">
                    {connectedRoute.routeLabel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Distance:</span>
                  <span className="font-semibold text-stone-100">
                    {connectedRoute.distanceKm} km
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Caravan Speed:</span>
                  <span className="font-semibold text-emerald-300">
                    {speedInfo.effectiveSpeedKmh} km/h ({speedInfo.statusLabel})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Est. Travel Time:</span>
                  <span className="font-semibold text-stone-100">
                    ~{estimatedHours} hours
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Danger Rating:</span>
                  <span className="font-semibold text-red-400">
                    {"💀".repeat(connectedRoute.dangerLevel)} (Level{" "}
                    {connectedRoute.dangerLevel})
                  </span>
                </div>
                {estimatedFuelNeeded > 0 && (
                  <div className="flex items-center justify-between text-amber-300">
                    <span className="flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5" /> Est. Gasoline Needed:
                    </span>
                    <span className="font-bold">{estimatedFuelNeeded} L</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2.5 rounded-lg border border-amber-800/40 bg-amber-950/30 p-2.5 text-xs text-amber-200">
                <AlertTriangle className="inline h-4 w-4 mr-1 text-amber-400" />
                No direct road connects{" "}
                <strong>{SETTLEMENTS[originSettlement].name}</strong> directly
                to <strong>{selectedDef.name}</strong>. Travel through an
                intermediate hub first!
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {connectedRoute && !state.travelState && (
              <button
                type="button"
                onClick={() => onStartTravel(selectedDef.id)}
                className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-stone-950 shadow-lg hover:bg-amber-500 transition cursor-pointer"
              >
                Depart for {selectedDef.name} ({connectedRoute.distanceKm} km)
              </button>
            )}

            <button
              type="button"
              onClick={onTriggerTestEncounter}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-900/60 transition cursor-pointer"
            >
              <Footprints className="h-3.5 w-3.5" />
              Test Road Encounter & Top-Down Combat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
