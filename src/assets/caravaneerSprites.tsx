import React from "react";

// ============================================================================
// Prop Interfaces
// ============================================================================

export interface TopDownUnitSpriteProps {
  isPlayerTeam: boolean;
  weaponId: string;
  isCrouched?: boolean;
  crippledLegs?: boolean;
  isActive?: boolean;
  className?: string;
}

export interface TopDownCoverSpriteProps {
  cover: "none" | "rocks" | "wagon" | "ruins" | "sand";
  className?: string;
}

export interface TransportIllustrationProps {
  transportId: string;
  className?: string;
}

export interface WeaponSilhouetteProps {
  weaponId: string;
  className?: string;
}

export interface NpcPortraitSvgProps {
  role: "general_trader" | "transport_master" | "sheriff" | "saloon_barkeep";
  tier: "frontier_town" | "major_city";
  className?: string;
}

// ============================================================================
// Internal Weapon Classification Helper
// ============================================================================

type WeaponVisualCategory =
  | "machete"
  | "saber"
  | "sledgehammer"
  | "derringer"
  | "revolver"
  | "shotgun"
  | "lever_rifle"
  | "bolt_rifle"
  | "sniper_rifle"
  | "smg";

function classifyWeaponId(weaponId: string): WeaponVisualCategory {
  const id = weaponId.toLowerCase();
  if (id.includes("saber") || id.includes("sword") || id.includes("cutlass")) {
    return "saber";
  }
  if (
    id.includes("sledge") ||
    id.includes("hammer") ||
    id.includes("maul") ||
    id.includes("club")
  ) {
    return "sledgehammer";
  }
  if (
    id.includes("machete") ||
    id.includes("knife") ||
    id.includes("blade") ||
    id.includes("cleaver") ||
    id.includes("melee") ||
    id.includes("unarmed") ||
    id.includes("fist")
  ) {
    return "machete";
  }
  if (id.includes("derringer") || id.includes("pocket") || id.includes("holdout")) {
    return "derringer";
  }
  if (
    id.includes("shotgun") ||
    id.includes("sawed") ||
    id.includes("scatter") ||
    id.includes("double_barrel") ||
    id.includes("pump")
  ) {
    return "shotgun";
  }
  if (
    id.includes("sniper") ||
    id.includes("scoped") ||
    id.includes("marksman") ||
    id.includes("sharpshooter")
  ) {
    return "sniper_rifle";
  }
  if (
    id.includes("smg") ||
    id.includes("submachine") ||
    id.includes("carbine") ||
    id.includes("auto") ||
    id.includes("assault")
  ) {
    return "smg";
  }
  if (
    id.includes("lever") ||
    id.includes("winchester") ||
    id.includes("repeater")
  ) {
    return "lever_rifle";
  }
  if (
    id.includes("bolt") ||
    id.includes("rifle") ||
    id.includes("musket") ||
    id.includes("hunting")
  ) {
    return "bolt_rifle";
  }
  return "revolver";
}

// ============================================================================
// 1. TopDownUnitSprite
// ============================================================================

export const TopDownUnitSprite: React.FC<TopDownUnitSpriteProps> = ({
  isPlayerTeam,
  weaponId,
  isCrouched = false,
  crippledLegs = false,
  isActive = false,
  className = "w-full h-full",
}) => {
  const category = classifyWeaponId(weaponId);

  // Player units face right (+X) toward enemy lines; enemies face left (-X)
  const facingTransform = isPlayerTeam ? "" : "translate(64, 0) scale(-1, 1)";
  const crouchScale = isCrouched ? "translate(4, 4) scale(0.88)" : "";

  const coatPrimary = isPlayerTeam ? "#7a5636" : "#5e2720";
  const coatSecondary = isPlayerTeam ? "#9e7348" : "#7d352b";
  const coatTrim = isPlayerTeam ? "#d4a86a" : "#a85648";
  const hatBrim = isPlayerTeam ? "#5c4028" : "#382924";
  const hatCrown = isPlayerTeam ? "#855e3b" : "#54382f";
  const hatBand = isPlayerTeam ? "#c9963e" : "#992b2b";

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${isPlayerTeam ? "Caravan" : "Raider"} unit with ${weaponId}`}
    >
      {/* Active turn tactical ring */}
      {isActive && (
        <g>
          <circle
            cx="30"
            cy="32"
            r="26"
            stroke="#e0a938"
            strokeWidth="2"
            strokeDasharray="6 3"
            fill="rgba(224, 169, 56, 0.10)"
          />
          <circle
            cx="30"
            cy="32"
            r="22"
            stroke="#f5d98e"
            strokeWidth="0.8"
            strokeOpacity="0.65"
          />
          <path
            d="M30 3 L32 8 L28 8 Z M30 61 L32 56 L28 56 Z M1 32 L6 30 L6 34 Z M59 32 L54 30 L54 34 Z"
            fill="#e0a938"
          />
        </g>
      )}

      {/* Ground shadow */}
      <ellipse
        cx="30"
        cy="34"
        rx={isCrouched ? "16" : "18"}
        ry={isCrouched ? "18" : "21"}
        fill="rgba(20, 14, 9, 0.48)"
      />

      {/* Directional unit body + weapon */}
      <g transform={`${facingTransform} ${crouchScale}`.trim()}>
        {/* Boots peeking out when crouched or standing */}
        <ellipse
          cx="22"
          cy="45"
          rx="4.5"
          ry="3"
          fill="#2d1f14"
          stroke="#170f09"
          strokeWidth="1"
        />
        <ellipse
          cx="22"
          cy="19"
          rx="4.5"
          ry="3"
          fill="#2d1f14"
          stroke="#170f09"
          strokeWidth="1"
        />

        {/* Weathered Duster Shoulders / Torso */}
        <path
          d="M17 16 C22 11, 33 12, 37 18 L39 32 L37 46 C33 52, 22 53, 17 48 C13 42, 13 22, 17 16 Z"
          fill={coatPrimary}
          stroke="#1f140d"
          strokeWidth="1.6"
        />

        {/* Shoulder Armor / Leather Mantle */}
        <path
          d="M20 15 C25 13, 33 15, 35 20 L35 44 C33 49, 25 51, 20 49 C17 44, 17 20, 20 15 Z"
          fill={coatSecondary}
          stroke="#261810"
          strokeWidth="1.2"
        />

        {/* Bandolier / Cross-belt across shoulders */}
        <path
          d="M19 19 L34 44"
          stroke="#3b2818"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M19 19 L34 44"
          stroke="#c99b49"
          strokeWidth="1.6"
          strokeDasharray="2 3"
          strokeLinecap="round"
        />

        {/* Raider spikes or Caravan brass shoulder rivets */}
        <circle cx="26" cy="16.5" r="1.4" fill={coatTrim} />
        <circle cx="26" cy="47.5" r="1.4" fill={coatTrim} />

        {/* Extended Arms & Hands holding Weapon */}
        {category === "machete" ||
        category === "saber" ||
        category === "sledgehammer" ? (
          <g>
            {/* Support arm */}
            <path
              d="M31 20 C37 21, 41 24, 43 27"
              stroke={coatSecondary}
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Main weapon arm */}
            <path
              d="M31 43 C38 42, 43 39, 46 34"
              stroke={coatSecondary}
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            <circle cx="46" cy="34" r="3" fill="#cfa77e" stroke="#261810" strokeWidth="1" />

            {category === "sledgehammer" ? (
              <g>
                {/* Hickory shaft */}
                <line
                  x1="36"
                  y1="44"
                  x2="56"
                  y2="18"
                  stroke="#6e4726"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {/* Heavy forged iron sledge head */}
                <rect
                  x="50"
                  y="13"
                  width="10"
                  height="6"
                  rx="1"
                  transform="rotate(38 55 16)"
                  fill="#4a4e54"
                  stroke="#1c1d21"
                  strokeWidth="1.3"
                />
              </g>
            ) : (
              <g>
                {/* Hilt & brass guard */}
                <path
                  d="M44 36 L48 31"
                  stroke="#4a2e18"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <line
                  x1="46"
                  y1="30"
                  x2="50"
                  y2="34"
                  stroke="#c9963e"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Gleaming steel blade pointing toward enemy */}
                <path
                  d={
                    category === "saber"
                      ? "M48 31 Q56 23 61 14 Q58 25 50 33 Z"
                      : "M47 31 L59 17 L61 21 L50 33 Z"
                  }
                  fill="#b8bfc7"
                  stroke="#2b3036"
                  strokeWidth="1.2"
                />
              </g>
            )}
          </g>
        ) : category === "revolver" || category === "derringer" ? (
          <g>
            {/* Two-handed pistol Weaver stance */}
            <path
              d="M32 22 C39 24, 43 27, 47 30"
              stroke={coatSecondary}
              strokeWidth="4.8"
              strokeLinecap="round"
            />
            <path
              d="M32 42 C39 40, 43 36, 47 33"
              stroke={coatSecondary}
              strokeWidth="4.8"
              strokeLinecap="round"
            />
            <circle cx="48" cy="31.5" r="2.8" fill="#cfa77e" stroke="#261810" strokeWidth="1" />
            {/* Pistol barrel pointing forward */}
            <rect
              x="47"
              y="29.5"
              width={category === "derringer" ? "8" : "13"}
              height="4"
              rx="1"
              fill="#3d4247"
              stroke="#17191c"
              strokeWidth="1"
            />
            {/* Cylinder & sight */}
            <rect x="49" y="29" width="4" height="5" rx="0.8" fill="#5b6269" />
            <circle cx="59" cy="31.5" r="0.9" fill="#d4a86a" />
          </g>
        ) : (
          <g>
            {/* Long-gun (Rifle / Shotgun / SMG) shouldered stance */}
            <path
              d="M31 20 C38 21, 44 25, 48 29"
              stroke={coatSecondary}
              strokeWidth="4.8"
              strokeLinecap="round"
            />
            <path
              d="M31 43 C36 42, 39 38, 41 34"
              stroke={coatSecondary}
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Hands */}
            <circle cx="48" cy="30" r="2.5" fill="#cfa77e" stroke="#261810" strokeWidth="0.9" />
            <circle cx="41" cy="33.5" r="2.5" fill="#cfa77e" stroke="#261810" strokeWidth="0.9" />

            {/* Wooden Buttstock & Fore-end */}
            <rect
              x="34"
              y="30"
              width="16"
              height="4.2"
              rx="1.2"
              fill="#6e4222"
              stroke="#24150a"
              strokeWidth="1"
            />

            {/* Weapon Barrel extending right toward enemy */}
            {category === "shotgun" ? (
              <g>
                <rect
                  x="45"
                  y="29.2"
                  width="16"
                  height="2.6"
                  rx="0.8"
                  fill="#3b4045"
                  stroke="#181a1c"
                  strokeWidth="0.8"
                />
                <rect
                  x="45"
                  y="31.8"
                  width="16"
                  height="2.6"
                  rx="0.8"
                  fill="#3b4045"
                  stroke="#181a1c"
                  strokeWidth="0.8"
                />
              </g>
            ) : category === "smg" ? (
              <g>
                {/* Ventilated SMG shroud + side magazine */}
                <rect
                  x="44"
                  y="29.5"
                  width="14"
                  height="4.5"
                  rx="1"
                  fill="#373c42"
                  stroke="#16181a"
                  strokeWidth="1"
                />
                <rect
                  x="47"
                  y="24"
                  width="3"
                  height="6"
                  rx="0.6"
                  fill="#292d30"
                  stroke="#16181a"
                  strokeWidth="0.8"
                />
                <line
                  x1="57"
                  y1="31.7"
                  x2="62"
                  y2="31.7"
                  stroke="#292d30"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </g>
            ) : (
              <g>
                {/* Rifle long barrel */}
                <rect
                  x="46"
                  y="30.5"
                  width="17"
                  height="3"
                  rx="0.8"
                  fill="#363b40"
                  stroke="#16181a"
                  strokeWidth="0.9"
                />
                {/* Brass telescopic scope for sniper rifle */}
                {category === "sniper_rifle" && (
                  <rect
                    x="41"
                    y="27.8"
                    width="12"
                    height="2.4"
                    rx="1"
                    fill="#b88b3b"
                    stroke="#2b1e0a"
                    strokeWidth="0.8"
                  />
                )}
              </g>
            )}
          </g>
        )}

        {/* Top-Down Headgear: Wide-Brimmed Caravaneer Hat (Player) vs Raider Helmet (Enemy) */}
        {isPlayerTeam ? (
          <g>
            {/* Outer wide leather hat brim */}
            <ellipse
              cx="27"
              cy="32"
              rx="11.5"
              ry="13.5"
              fill={hatBrim}
              stroke="#1f140c"
              strokeWidth="1.5"
            />
            {/* Sun-bleached brim edge highlight */}
            <ellipse
              cx="27"
              cy="32"
              rx="9.8"
              ry="11.6"
              stroke="#9c7248"
              strokeWidth="0.7"
              strokeDasharray="5 3"
            />
            {/* Braided hatband */}
            <ellipse
              cx="27"
              cy="32"
              rx="6.8"
              ry="8"
              fill={hatCrown}
              stroke={hatBand}
              strokeWidth="1.5"
            />
            {/* Pinched crown crease */}
            <path
              d="M23 32 C25 29.5, 29 29.5, 31 32 C29 34.5, 25 34.5, 23 32 Z"
              fill="#634429"
              stroke="#3d2816"
              strokeWidth="0.9"
            />
          </g>
        ) : (
          <g>
            {/* Rusted Iron Wasteland Helmet with Goggle Strap */}
            <ellipse
              cx="27"
              cy="32"
              rx="10"
              ry="11"
              fill={hatBrim}
              stroke="#17110e"
              strokeWidth="1.5"
            />
            <ellipse
              cx="27"
              cy="32"
              rx="7.5"
              ry="8.5"
              fill={hatCrown}
              stroke={hatBand}
              strokeWidth="1.3"
            />
            {/* Central welded iron ridge & rivets */}
            <line
              x1="19"
              y1="32"
              x2="35"
              y2="32"
              stroke="#8c7a6b"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="24" cy="27" r="1.1" fill="#8c7a6b" />
            <circle cx="24" cy="37" r="1.1" fill="#8c7a6b" />
          </g>
        )}
      </g>

      {/* Crouch Indicator Badge (Bottom-Left) */}
      {isCrouched && (
        <g transform="translate(3, 45)">
          <rect
            x="0"
            y="0"
            width="16"
            height="16"
            rx="3.5"
            fill="#1f1710"
            stroke="#d4a359"
            strokeWidth="1.3"
          />
          {/* Downward tactical crouch chevron + shield */}
          <path
            d="M4.5 5.5 L8 9 L11.5 5.5 M4.5 9.5 L8 13 L11.5 9.5"
            stroke="#f0c878"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* Leg-Cripple Indicator Icon (Bottom-Right) */}
      {crippledLegs && (
        <g transform="translate(45, 45)">
          <rect
            x="0"
            y="0"
            width="16"
            height="16"
            rx="3.5"
            fill="#3b1111"
            stroke="#ef4444"
            strokeWidth="1.3"
          />
          {/* Fractured bone / crippled boot icon */}
          <path
            d="M5 3.5 L7.5 7.5 L5.5 9 L9 12.5"
            stroke="#f5e6c8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.5 4 L12.5 6 M3.5 11 L5.5 13"
            stroke="#f87171"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
};

// ============================================================================
// 2. TopDownCoverSprite
// ============================================================================

export const TopDownCoverSprite: React.FC<TopDownCoverSpriteProps> = ({
  cover,
  className = "w-full h-full",
}) => {
  if (cover === "none") {
    return null;
  }

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Battlefield cover: ${cover}`}
    >
      {cover === "wagon" && (
        <g>
          {/* Drop shadow */}
          <rect
            x="8"
            y="14"
            width="48"
            height="38"
            rx="6"
            fill="rgba(20, 13, 8, 0.45)"
          />
          {/* Four protruding spoked wooden wheels (top-down axle view) */}
          <g fill="#3d2716" stroke="#1a1008" strokeWidth="1.2">
            <rect x="11" y="7" width="12" height="5" rx="1.5" />
            <rect x="39" y="7" width="12" height="5" rx="1.5" />
            <rect x="11" y="52" width="12" height="5" rx="1.5" />
            <rect x="39" y="52" width="12" height="5" rx="1.5" />
          </g>
          {/* Iron tire bands & spoke glints */}
          <g stroke="#8c7a6b" strokeWidth="1">
            <line x1="14" y1="7.5" x2="14" y2="11.5" />
            <line x1="20" y1="7.5" x2="20" y2="11.5" />
            <line x1="42" y1="7.5" x2="42" y2="11.5" />
            <line x1="48" y1="7.5" x2="48" y2="11.5" />
            <line x1="14" y1="52.5" x2="14" y2="56.5" />
            <line x1="20" y1="52.5" x2="20" y2="56.5" />
            <line x1="42" y1="52.5" x2="42" y2="56.5" />
            <line x1="48" y1="52.5" x2="48" y2="56.5" />
          </g>
          {/* Front wagon tongue / draft pole */}
          <path
            d="M52 29 L62 29 M52 35 L62 35 M60 26 L60 38"
            stroke="#593a22"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Heavy oak wagon bed frame */}
          <rect
            x="7"
            y="12"
            width="47"
            height="40"
            rx="3"
            fill="#6b4426"
            stroke="#24150b"
            strokeWidth="1.8"
          />
          {/* Exposed rear wooden planks & cargo barrel */}
          <line x1="12" y1="13" x2="12" y2="51" stroke="#3d2513" strokeWidth="1" />
          <circle
            cx="13"
            cy="22"
            r="4.2"
            fill="#825532"
            stroke="#24150b"
            strokeWidth="1"
          />
          {/* Sun-bleached ribbed canvas tarp */}
          <rect
            x="16"
            y="14"
            width="36"
            height="36"
            rx="4"
            fill="#d4c098"
            stroke="#3b2b1a"
            strokeWidth="1.5"
          />
          {/* Canvas structural hoop ribs */}
          <path
            d="M24 14.5 L24 49.5 M34 14.5 L34 49.5 M44 14.5 L44 49.5"
            stroke="#9e8760"
            strokeWidth="2"
          />
          {/* Weathered canvas patch & rope tie-downs */}
          <rect
            x="26"
            y="22"
            width="7"
            height="8"
            rx="1"
            fill="#b89f72"
            stroke="#5c4930"
            strokeWidth="0.9"
            strokeDasharray="2 1"
          />
        </g>
      )}

      {cover === "rocks" && (
        <g>
          {/* Desert boulder cluster shadow */}
          <ellipse
            cx="33"
            cy="36"
            rx="25"
            ry="20"
            fill="rgba(24, 16, 10, 0.42)"
          />
          {/* Main jagged sandstone boulder */}
          <polygon
            points="12,38 16,20 29,13 45,18 52,32 44,47 24,49"
            fill="#8c6d49"
            stroke="#2b1e11"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Sunlit upper rock facets */}
          <polygon
            points="16,20 29,13 41,21 31,31 18,29"
            fill="#ab8960"
          />
          {/* Deep geological fracture lines */}
          <path
            d="M29 13 L31 31 L44 47 M18 29 L31 31 L45 18"
            stroke="#3d2b18"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          {/* Secondary dark basalt outcrop */}
          <polygon
            points="35,44 46,35 56,41 53,53 39,54"
            fill="#6e5539"
            stroke="#24190e"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Smaller desert scree pebbles */}
          <circle cx="13" cy="47" r="3.2" fill="#7a5f3f" stroke="#2b1e11" strokeWidth="1" />
          <circle cx="52" cy="20" r="2.5" fill="#9c7b54" stroke="#2b1e11" strokeWidth="1" />
        </g>
      )}

      {cover === "ruins" && (
        <g>
          {/* Shadow */}
          <rect
            x="8"
            y="14"
            width="48"
            height="38"
            rx="4"
            fill="rgba(20, 14, 9, 0.44)"
          />
          {/* Crumbled pre-Collapse brick wall spine */}
          <path
            d="M10 18 L52 18 L54 34 L12 36 Z"
            fill="#7d4432"
            stroke="#29140e"
            strokeWidth="1.6"
          />
          {/* Exposed clay brick courses */}
          <rect x="13" y="20" width="10" height="5" fill="#96523d" stroke="#361b13" strokeWidth="0.9" />
          <rect x="25" y="20" width="11" height="5" fill="#854734" stroke="#361b13" strokeWidth="0.9" />
          <rect x="38" y="20" width="10" height="5" fill="#9e5943" stroke="#361b13" strokeWidth="0.9" />
          <rect x="17" y="27" width="12" height="5" fill="#854734" stroke="#361b13" strokeWidth="0.9" />
          <rect x="31" y="27" width="12" height="5" fill="#96523d" stroke="#361b13" strokeWidth="0.9" />
          {/* Protruding rusted rebar rods */}
          <line x1="51" y1="22" x2="58" y2="22" stroke="#4a352b" strokeWidth="2" strokeLinecap="round" />
          <line x1="52" y1="29" x2="57" y2="30" stroke="#4a352b" strokeWidth="2" strokeLinecap="round" />
          {/* Stacked burlap sandbag barricade in front */}
          <g fill="#bfa374" stroke="#382c1a" strokeWidth="1.3">
            <rect x="10" y="33" width="16" height="9" rx="4" />
            <rect x="24" y="34" width="16" height="9" rx="4" />
            <rect x="38" y="33" width="16" height="9" rx="4" />
            <rect x="16" y="40" width="16" height="9" rx="4" fill="#cfb484" />
            <rect x="31" y="40" width="16" height="9" rx="4" fill="#cfb484" />
          </g>
          {/* Sandbag tied necks & seam stitching */}
          <path
            d="M24 44 L30 44 M39 44 L45 44"
            stroke="#6e5836"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
        </g>
      )}

      {cover === "sand" && (
        <g>
          {/* Soft wind-sculpted alkali dune base */}
          <ellipse
            cx="32"
            cy="34"
            rx="27"
            ry="21"
            fill="#d4b886"
            fillOpacity="0.82"
          />
          {/* Crescent dune slip-face shadow */}
          <path
            d="M8 36 Q32 22 56 36 Q36 50 8 36 Z"
            fill="#b89863"
            stroke="#8a6d3f"
            strokeWidth="1.2"
          />
          {/* Sunlit windward dune crest ripples */}
          <path
            d="M11 27 Q31 17 51 27"
            stroke="#ede0c4"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M8 35 Q32 24 55 35"
            stroke="#f5ebd6"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M14 43 Q33 34 50 43"
            stroke="#ebd9b5"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Sun-bleached animal rib bones half-buried in alkali drift */}
          <path
            d="M22 40 Q25 34 29 38 M27 42 Q30 36 34 40 M32 43 Q35 37 39 41"
            stroke="#f7f2e4"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
};

// ============================================================================
// 3. TransportIllustration
// ============================================================================

export const TransportIllustration: React.FC<TransportIllustrationProps> = ({
  transportId,
  className = "w-full h-full",
}) => {
  return (
    <svg
      viewBox="0 0 160 72"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Transport: ${transportId}`}
    >
      {/* Horizon desert ground line & dust tracks */}
      <line
        x1="8"
        y1="62"
        x2="152"
        y2="62"
        stroke="#6e5233"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line
        x1="18"
        y1="65"
        x2="142"
        y2="65"
        stroke="#8c6d46"
        strokeWidth="1"
        strokeDasharray="6 4"
      />

      {transportId === "on_foot" && (
        <g fill="#3b2818" stroke="#1f140b" strokeWidth="1.2">
          {/* Heavy bedroll & rucksack */}
          <rect x="64" y="23" width="11" height="19" rx="3" fill="#6e4b2a" />
          <ellipse cx="69.5" cy="21" rx="6" ry="3.5" fill="#9c7a4c" />
          {/* Duster coat & striding legs */}
          <path d="M74 22 L83 22 L87 46 L71 46 Z" fill="#523721" />
          <path d="M75 45 L70 61 M82 45 L88 61" stroke="#2b1c10" strokeWidth="4" strokeLinecap="round" />
          {/* Wide-brimmed hat & head */}
          <circle cx="79" cy="16" r="4.5" fill="#7a5536" />
          <path d="M70 16 Q79 13 89 16" stroke="#3b2818" strokeWidth="2.5" strokeLinecap="round" />
          {/* Walking staff & canteen */}
          <line x1="93" y1="14" x2="90" y2="61" stroke="#6e4726" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="75" cy="39" r="3" fill="#8c6f46" />
        </g>
      )}

      {transportId === "hand_cart" && (
        <g>
          {/* Wooden slat push-cart body */}
          <polygon
            points="44,28 102,28 96,47 50,47"
            fill="#784f2b"
            stroke="#26170b"
            strokeWidth="1.6"
          />
          {/* Stacked cargo crates & canvas bundle */}
          <rect x="52" y="16" width="20" height="12" rx="1.5" fill="#9c7444" stroke="#26170b" strokeWidth="1.2" />
          <rect x="74" y="19" width="18" height="9" rx="2" fill="#c9b182" stroke="#26170b" strokeWidth="1.2" />
          {/* Extended pull shafts & prop leg */}
          <path d="M98 34 L126 28 M114 31 L114 61" stroke="#4d3119" strokeWidth="2.4" strokeLinecap="round" />
          {/* Spoked wooden wheel */}
          <circle cx="73" cy="49" r="12" fill="none" stroke="#26170b" strokeWidth="3" />
          <circle cx="73" cy="49" r="10.5" fill="none" stroke="#8c7a6b" strokeWidth="1" />
          <path d="M73 37 L73 61 M61 49 L85 49 M64.5 40.5 L81.5 57.5 M81.5 40.5 L64.5 57.5" stroke="#4d3119" strokeWidth="1.3" />
          <circle cx="73" cy="49" r="2.8" fill="#3b2818" />
        </g>
      )}

      {transportId === "old_donkey" && (
        <g>
          {/* Donkey legs */}
          <path d="M62 43 L60 61 M68 43 L69 61 M92 43 L90 61 M98 43 L101 61" stroke="#3d2c1e" strokeWidth="3.2" strokeLinecap="round" />
          {/* Donkey torso & tail */}
          <ellipse cx="80" cy="36" rx="22" ry="10" fill="#6e553e" stroke="#24190e" strokeWidth="1.5" />
          <path d="M58 33 Q52 40 53 47" stroke="#3d2c1e" strokeWidth="2" strokeLinecap="round" />
          {/* Neck, head & signature long donkey ears */}
          <path d="M95 32 L106 20 L116 24 L114 30 L100 39 Z" fill="#6e553e" stroke="#24190e" strokeWidth="1.5" />
          <path d="M104 21 L101 9 M108 21 L111 9" stroke="#523e2c" strokeWidth="2.8" strokeLinecap="round" />
          {/* Heavy leather saddlebags & bedroll */}
          <rect x="68" y="21" width="22" height="18" rx="3" fill="#9c6b3b" stroke="#24190e" strokeWidth="1.4" />
          <ellipse cx="79" cy="19" rx="10" ry="4" fill="#cfc09a" stroke="#24190e" strokeWidth="1.2" />
        </g>
      )}

      {transportId === "pack_mule_team" && (
        <g>
          {/* Rear Mule */}
          <g transform="translate(-26, 2)">
            <path d="M58 42 L56 59 M64 42 L65 59 M84 42 L83 59 M90 42 L92 59" stroke="#382618" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="74" cy="35" rx="19" ry="9" fill="#5e432c" stroke="#21150c" strokeWidth="1.4" />
            <path d="M88 31 L97 20 L105 24 L103 29 L92 37 Z" fill="#5e432c" stroke="#21150c" strokeWidth="1.4" />
            <path d="M95 20 L93 11 M99 20 L101 11" stroke="#473220" strokeWidth="2.4" strokeLinecap="round" />
            <rect x="63" y="21" width="20" height="15" rx="2.5" fill="#8f6338" stroke="#21150c" strokeWidth="1.2" />
          </g>
          {/* Lead Mule */}
          <g transform="translate(26, 0)">
            <path d="M58 43 L56 61 M64 43 L65 61 M86 43 L85 61 M92 43 L94 61" stroke="#382618" strokeWidth="3.2" strokeLinecap="round" />
            <ellipse cx="75" cy="36" rx="20" ry="9.5" fill="#755336" stroke="#21150c" strokeWidth="1.4" />
            <path d="M90 32 L100 19 L109 23 L107 29 L94 38 Z" fill="#755336" stroke="#21150c" strokeWidth="1.4" />
            <path d="M98 19 L96 10 M102 19 L104 10" stroke="#523924" strokeWidth="2.5" strokeLinecap="round" />
            <rect x="64" y="20" width="21" height="16" rx="2.5" fill="#b3844c" stroke="#21150c" strokeWidth="1.3" />
          </g>
          {/* Hemp lead rope connecting the team */}
          <path d="M77 27 Q92 36 116 26" stroke="#bfa374" strokeWidth="1.6" strokeDasharray="3 2" />
        </g>
      )}

      {transportId === "wooden_cart_donkey" && (
        <g>
          {/* Timber two-wheeled cart */}
          <rect x="26" y="25" width="48" height="19" rx="2" fill="#754c29" stroke="#24150a" strokeWidth="1.5" />
          <path d="M32 25 Q50 13 68 25" fill="#cfc09a" stroke="#24150a" strokeWidth="1.3" />
          {/* Harness shafts */}
          <line x1="74" y1="35" x2="112" y2="33" stroke="#4a2f18" strokeWidth="2.5" />
          {/* Spoked cart wheel */}
          <circle cx="50" cy="48" r="13" fill="none" stroke="#24150a" strokeWidth="3" />
          <path d="M50 35 L50 61 M37 48 L63 48 M41 39 L59 57 M59 39 L41 57" stroke="#52341b" strokeWidth="1.3" />
          <circle cx="50" cy="48" r="3" fill="#24150a" />
          {/* Draft Donkey */}
          <path d="M96 44 L95 61 M102 44 L103 61 M118 44 L117 61 M124 44 L126 61" stroke="#3d2c1e" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="110" cy="37" rx="17" ry="8.5" fill="#6e553e" stroke="#24150a" strokeWidth="1.4" />
          <path d="M123 33 L132 21 L140 25 L138 30 L126 38 Z" fill="#6e553e" stroke="#24150a" strokeWidth="1.4" />
          <path d="M130 21 L128 11 M134 21 L136 11" stroke="#4f3c2b" strokeWidth="2.3" strokeLinecap="round" />
        </g>
      )}

      {transportId === "heavy_wagon_horse" && (
        <g>
          {/* Covered heavy 4-wheel wagon */}
          <path d="M18 30 Q18 11 50 11 Q82 11 82 30 Z" fill="#d6c59e" stroke="#2b1d10" strokeWidth="1.5" />
          <path d="M34 13 L34 30 M50 11 L50 30 M66 13 L66 30" stroke="#9e8860" strokeWidth="1.4" />
          <polygon points="15,30 85,30 81,45 19,45" fill="#6b4423" stroke="#241509" strokeWidth="1.6" />
          {/* Rear & Front Wagon Wheels */}
          <circle cx="30" cy="49" r="12" fill="none" stroke="#241509" strokeWidth="2.8" />
          <path d="M30 37 L30 61 M18 49 L42 49 M22 41 L38 57 M38 41 L22 57" stroke="#52341b" strokeWidth="1.2" />
          <circle cx="70" cy="51" r="10" fill="none" stroke="#241509" strokeWidth="2.6" />
          <path d="M70 41 L70 61 M60 51 L80 51 M63 44 L77 58 M77 44 L63 58" stroke="#52341b" strokeWidth="1.2" />
          {/* Draft Horse & Harness */}
          <line x1="82" y1="39" x2="122" y2="33" stroke="#422914" strokeWidth="2.4" />
          <path d="M102 42 L100 61 M108 42 L110 61 M126 42 L125 61 M132 42 L135 61" stroke="#362112" strokeWidth="3.2" strokeLinecap="round" />
          <ellipse cx="117" cy="34" rx="19" ry="9.5" fill="#7a4928" stroke="#241509" strokeWidth="1.5" />
          <path d="M131 30 L141 15 L150 19 L148 25 L135 36 Z" fill="#7a4928" stroke="#241509" strokeWidth="1.5" />
        </g>
      )}

      {transportId === "brahmin_freight_wagon" && (
        <g>
          {/* Massive reinforced freight schooner */}
          <path d="M12 28 Q14 8 48 8 Q82 8 84 28 Z" fill="#cfb98c" stroke="#26180c" strokeWidth="1.6" />
          <path d="M28 10 L28 28 M48 8 L48 28 M68 10 L68 28" stroke="#8c754c" strokeWidth="1.6" />
          <rect x="12" y="28" width="72" height="18" rx="2" fill="#5e3a1e" stroke="#1f1208" strokeWidth="1.6" />
          {/* Iron-strapped side barrels */}
          <circle cx="48" cy="37" r="5" fill="#82532d" stroke="#1f1208" strokeWidth="1.1" />
          {/* Heavy double-spoked freight wheels */}
          <circle cx="27" cy="49" r="12" fill="none" stroke="#1f1208" strokeWidth="3" />
          <path d="M27 37 L27 61 M15 49 L39 49 M19 41 L35 57 M35 41 L19 57" stroke="#4a2e17" strokeWidth="1.3" />
          <circle cx="69" cy="50" r="11" fill="none" stroke="#1f1208" strokeWidth="2.8" />
          <path d="M69 39 L69 61 M58 50 L80 50 M61 42 L77 58 M77 42 L61 58" stroke="#4a2e17" strokeWidth="1.3" />
          {/* Heavy timber yoke */}
          <line x1="84" y1="38" x2="124" y2="31" stroke="#3d2512" strokeWidth="3" />
          {/* Two-Headed Mutant Brahmin Ox */}
          <path d="M100 43 L99 61 M107 43 L108 61 M125 43 L124 61 M132 43 L134 61" stroke="#3b2618" strokeWidth="3.8" strokeLinecap="round" />
          {/* Massive muscular Brahmin hump & torso */}
          <path d="M94 36 C96 22, 114 18, 124 25 C132 28, 136 36, 132 43 L96 43 Z" fill="#825638" stroke="#24150b" strokeWidth="1.6" />
          {/* First Brahmin Head (upper) + Curved Horns */}
          <ellipse cx="137" cy="27" rx="8" ry="5.5" fill="#825638" stroke="#24150b" strokeWidth="1.4" />
          <path d="M135 23 Q139 14 146 16" stroke="#e8dec3" strokeWidth="2.2" strokeLinecap="round" />
          {/* Second Brahmin Head (lower) + Curved Horns */}
          <ellipse cx="139" cy="36" rx="7.5" ry="5" fill="#70482d" stroke="#24150b" strokeWidth="1.4" />
          <path d="M138 33 Q144 27 150 30" stroke="#e8dec3" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {transportId === "scrap_motorcycle" && (
        <g>
          {/* Knobby wasteland tires */}
          <circle cx="48" cy="48" r="12" fill="none" stroke="#1c1917" strokeWidth="4" strokeDasharray="4 1.5" />
          <circle cx="48" cy="48" r="7" fill="none" stroke="#78716c" strokeWidth="1.5" />
          <circle cx="110" cy="48" r="12" fill="none" stroke="#1c1917" strokeWidth="4" strokeDasharray="4 1.5" />
          <circle cx="110" cy="48" r="7" fill="none" stroke="#78716c" strokeWidth="1.5" />
          {/* Twin exhaust pipes */}
          <path d="M76 46 L34 44 M76 49 L36 48" stroke="#78716c" strokeWidth="2.4" strokeLinecap="round" />
          {/* Welded tubular frame & engine block */}
          <polygon points="52,46 76,28 96,28 84,48" fill="#44403c" stroke="#1c1917" strokeWidth="1.6" />
          {/* Extended front forks & handlebars */}
          <path d="M92 22 L110 48 M86 20 L95 23" stroke="#a8a29e" strokeWidth="2.6" strokeLinecap="round" />
          {/* Teardrop rusted fuel tank & leather saddle + rear cargo rack */}
          <path d="M74 28 Q84 20 94 27 Z" fill="#993b2b" stroke="#1c1917" strokeWidth="1.4" />
          <rect x="44" y="25" width="22" height="11" rx="2" fill="#785230" stroke="#1c1917" strokeWidth="1.3" />
          {/* Headlight */}
          <circle cx="99" cy="27" r="3" fill="#eab308" stroke="#1c1917" strokeWidth="1.2" />
        </g>
      )}

      {transportId === "desert_dune_buggy" && (
        <g>
          {/* Exposed rear engine & jerrycans */}
          <rect x="28" y="28" width="18" height="14" rx="2" fill="#57534e" stroke="#1c1917" strokeWidth="1.5" />
          <rect x="32" y="18" width="11" height="10" rx="1" fill="#8f3929" stroke="#1c1917" strokeWidth="1.2" />
          {/* Low-slung sand-rail chassis & tubular roll cage */}
          <polygon points="30,42 126,44 118,34 42,32" fill="#8c6239" stroke="#1c1917" strokeWidth="1.6" />
          <path
            d="M44 32 L54 16 L92 16 L108 34 M72 16 L72 33"
            stroke="#d6c59e"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Roof floodlights */}
          <circle cx="92" cy="14" r="2.8" fill="#facc15" stroke="#1c1917" strokeWidth="1" />
          {/* Oversized rear paddle tire & front steering tire */}
          <circle cx="46" cy="47" r="14" fill="#292524" stroke="#141210" strokeWidth="2.5" />
          <circle cx="46" cy="47" r="6" fill="#a8a29e" />
          <circle cx="114" cy="49" r="11" fill="#292524" stroke="#141210" strokeWidth="2.5" />
          <circle cx="114" cy="49" r="4.5" fill="#a8a29e" />
        </g>
      )}

      {transportId === "armored_pickup" && (
        <g>
          {/* Rear cargo bed with fuel drums */}
          <rect x="24" y="20" width="14" height="14" rx="1.5" fill="#7c2d12" stroke="#1c1917" strokeWidth="1.2" />
          <rect x="40" y="22" width="16" height="12" rx="1.5" fill="#854d0e" stroke="#1c1917" strokeWidth="1.2" />
          {/* Armored truck body & cab */}
          <path
            d="M18 32 L62 32 L64 16 L96 16 L108 30 L134 33 L134 47 L18 47 Z"
            fill="#57534e"
            stroke="#1c1917"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Riveted armor plates & slotted windshield louver */}
          <polygon points="68,19 93,19 102,29 68,29" fill="#292524" stroke="#a8a29e" strokeWidth="1.2" />
          <line x1="70" y1="22" x2="96" y2="22" stroke="#d6c59e" strokeWidth="1.2" />
          <line x1="70" y1="25" x2="99" y2="25" stroke="#d6c59e" strokeWidth="1.2" />
          {/* Spiked cowcatcher ram bumper */}
          <polygon points="134,31 146,48 134,48" fill="#78716c" stroke="#1c1917" strokeWidth="1.5" />
          {/* Heavy-duty off-road wheels */}
          <circle cx="42" cy="49" r="12" fill="#292524" stroke="#141210" strokeWidth="2.5" />
          <circle cx="42" cy="49" r="5" fill="#a8a29e" />
          <circle cx="114" cy="49" r="12" fill="#292524" stroke="#141210" strokeWidth="2.5" />
          <circle cx="114" cy="49" r="5" fill="#a8a29e" />
        </g>
      )}

      {![
        "on_foot",
        "hand_cart",
        "old_donkey",
        "pack_mule_team",
        "wooden_cart_donkey",
        "heavy_wagon_horse",
        "brahmin_freight_wagon",
        "scrap_motorcycle",
        "desert_dune_buggy",
        "armored_pickup",
      ].includes(transportId) && (
        <g>
          {/* Fallback caravan wagon silhouette */}
          <path d="M40 30 Q40 12 80 12 Q120 12 120 30 Z" fill="#d4c098" stroke="#26170b" strokeWidth="1.5" />
          <rect x="38" y="30" width="84" height="16" fill="#6b4426" stroke="#26170b" strokeWidth="1.5" />
          <circle cx="56" cy="50" r="11" fill="none" stroke="#26170b" strokeWidth="2.5" />
          <circle cx="104" cy="50" r="11" fill="none" stroke="#26170b" strokeWidth="2.5" />
        </g>
      )}
    </svg>
  );
};

// ============================================================================
// 4. WeaponSilhouette
// ============================================================================

export const WeaponSilhouette: React.FC<WeaponSilhouetteProps> = ({
  weaponId,
  className = "w-full h-full",
}) => {
  const category = classifyWeaponId(weaponId);

  return (
    <svg
      viewBox="0 0 120 48"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Weapon: ${weaponId}`}
    >
      {category === "machete" && (
        <g>
          {/* Cord-wrapped wooden handle */}
          <path
            d="M14 33 L34 27 L36 34 L16 40 Z"
            fill="#5e3a1e"
            stroke="#1f1208"
            strokeWidth="1.5"
          />
          <path d="M20 31 L22 38 M26 29 L28 36" stroke="#c9a874" strokeWidth="1.3" />
          {/* Brass cross-guard */}
          <rect
            x="34"
            y="24"
            width="4"
            height="13"
            rx="1"
            transform="rotate(-15 36 30)"
            fill="#c9963e"
            stroke="#24160b"
            strokeWidth="1.2"
          />
          {/* Broad clipped-point rusted steel machete blade */}
          <path
            d="M37 26 L98 11 L106 16 C102 24, 92 28, 39 34 Z"
            fill="#9ca3af"
            stroke="#1f2429"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Blood fuller & edge bevel */}
          <line x1="43" y1="27" x2="92" y2="16" stroke="#4b5563" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      )}

      {category === "saber" && (
        <g>
          {/* Ribbed leather grip & brass D-guard knuckle bow */}
          <path
            d="M14 32 L30 28 L32 33 L16 37 Z"
            fill="#4a2c16"
            stroke="#1c1007"
            strokeWidth="1.4"
          />
          <path
            d="M14 34 C16 43, 32 42, 33 24"
            stroke="#d4a348"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Sweeping curved cavalry saber blade */}
          <path
            d="M32 28 Q72 22 108 10 Q76 30 33 33 Z"
            fill="#cbd5e1"
            stroke="#1e293b"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </g>
      )}

      {category === "sledgehammer" && (
        <g>
          {/* Long weathered hickory handle */}
          <rect
            x="12"
            y="22"
            width="82"
            height="5.5"
            rx="2"
            fill="#784b27"
            stroke="#241509"
            strokeWidth="1.4"
          />
          {/* Leather grip wrap */}
          <rect x="16" y="22" width="22" height="5.5" fill="#422814" />
          {/* Heavy forged octagonal iron sledge head */}
          <polygon
            points="86,10 104,10 106,14 106,35 104,39 86,39 84,35 84,14"
            fill="#52525b"
            stroke="#18181b"
            strokeWidth="1.6"
          />
          <line x1="88" y1="14" x2="88" y2="35" stroke="#a1a1aa" strokeWidth="1.4" />
        </g>
      )}

      {category === "derringer" && (
        <g>
          {/* Birds-head walnut grip */}
          <path
            d="M34 25 C28 32, 27 40, 35 42 C41 42, 44 35, 47 28 Z"
            fill="#6e4121"
            stroke="#211309"
            strokeWidth="1.5"
          />
          {/* Over-under double barrels */}
          <rect
            x="43"
            y="16"
            width="36"
            height="11"
            rx="2"
            fill="#64748b"
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          <line x1="45" y1="21.5" x2="78" y2="21.5" stroke="#1e293b" strokeWidth="1.3" />
          {/* Spur hammer & trigger */}
          <path d="M42 17 L37 12 M49 28 Q50 32 47 33" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {category === "revolver" && (
        <g>
          {/* Classic frontier walnut grip with brass medallion */}
          <path
            d="M22 25 L36 23 L30 43 C23 44, 18 39, 22 25 Z"
            fill="#6b3e1e"
            stroke="#1f1108"
            strokeWidth="1.5"
          />
          <circle cx="27" cy="34" r="2" fill="#d4a348" />
          {/* Frame, hammer & trigger guard */}
          <path d="M32 18 L56 18 L56 27 L34 27 Z" fill="#475569" stroke="#1e293b" strokeWidth="1.4" />
          <path d="M32 18 L26 13" stroke="#334155" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M36 27 C37 33, 45 33, 46 27" stroke="#334155" strokeWidth="1.5" />
          {/* Fluted six-shot cylinder */}
          <rect x="40" y="17" width="14" height="10" rx="1.5" fill="#64748b" stroke="#1e293b" strokeWidth="1.4" />
          <line x1="43" y1="20" x2="51" y2="20" stroke="#1e293b" strokeWidth="1.2" />
          <line x1="43" y1="24" x2="51" y2="24" stroke="#1e293b" strokeWidth="1.2" />
          {/* Long barrel + under-barrel ejector rod */}
          <rect x="54" y="17.5" width="40" height="4.5" rx="1" fill="#475569" stroke="#1e293b" strokeWidth="1.4" />
          <rect x="54" y="22" width="32" height="2.8" rx="1" fill="#334155" />
          <polygon points="90,17.5 93,14 94,17.5" fill="#334155" />
        </g>
      )}

      {category === "shotgun" && (
        <g>
          {/* Wooden buttstock */}
          <path
            d="M10 26 L38 22 L40 28 L12 37 Z"
            fill="#6e4120"
            stroke="#211208"
            strokeWidth="1.5"
          />
          {/* Receiver */}
          <rect x="38" y="19" width="18" height="8" rx="1" fill="#475569" stroke="#1e293b" strokeWidth="1.4" />
          {/* Long shotgun barrel + pump tube & ribbed wooden fore-end */}
          <rect x="56" y="18.5" width="54" height="4" rx="1" fill="#334155" stroke="#0f172a" strokeWidth="1.3" />
          <rect x="56" y="22.5" width="46" height="3.2" rx="1" fill="#475569" stroke="#0f172a" strokeWidth="1.1" />
          <rect x="64" y="22" width="22" height="5" rx="1.5" fill="#7c4a25" stroke="#211208" strokeWidth="1.2" />
        </g>
      )}

      {category === "lever_rifle" && (
        <g>
          {/* Western walnut buttstock with brass buttplate */}
          <path
            d="M10 26 L36 22 L38 28 L12 36 Z"
            fill="#754623"
            stroke="#241409"
            strokeWidth="1.5"
          />
          {/* Brass receiver ("Yellow Boy" style) */}
          <rect x="36" y="19" width="18" height="8.5" rx="1" fill="#c9963e" stroke="#2b1e0a" strokeWidth="1.4" />
          {/* Signature under-lever loop */}
          <path
            d="M38 27 C39 35, 50 35, 51 27"
            stroke="#64748b"
            strokeWidth="2"
             fill="none"
          />
          {/* Octagonal barrel + full-length under-barrel tube magazine */}
          <rect x="54" y="18.5" width="56" height="3.8" fill="#334155" stroke="#0f172a" strokeWidth="1.3" />
          <rect x="54" y="22.3" width="52" height="3" fill="#475569" stroke="#0f172a" strokeWidth="1.1" />
          {/* Wooden fore-end with brass barrel band */}
          <rect x="54" y="21.5" width="24" height="5" fill="#754623" stroke="#241409" strokeWidth="1.2" />
          <rect x="76" y="18.5" width="3" height="8" fill="#c9963e" />
        </g>
      )}

      {category === "bolt_rifle" && (
        <g>
          {/* Full wooden rifle stock & handguard */}
          <path
            d="M10 27 L40 21 L82 21 L82 26 L42 28 L12 37 Z"
            fill="#6b3f1f"
            stroke="#211208"
            strokeWidth="1.5"
          />
          {/* Steel receiver & turned-down bolt knob */}
          <rect x="40" y="18.5" width="18" height="5" rx="1" fill="#475569" stroke="#1e293b" strokeWidth="1.3" />
          <line x1="48" y1="21" x2="46" y2="29" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
          <circle cx="46" cy="29" r="2.2" fill="#94a3b8" stroke="#1e293b" strokeWidth="1" />
          {/* Long precision barrel & front blade sight */}
          <rect x="58" y="18.5" width="54" height="3.6" fill="#334155" stroke="#0f172a" strokeWidth="1.3" />
          <polygon points="107,18.5 110,14.5 111,18.5" fill="#334155" />
        </g>
      )}

      {category === "sniper_rifle" && (
        <g>
          {/* Precision stock with leather cheek pad */}
          <path
            d="M8 27 L38 22 L84 22 L84 27 L40 29 L10 38 Z"
            fill="#633a1c"
            stroke="#1f1107"
            strokeWidth="1.5"
          />
          <rect x="16" y="22" width="14" height="5" rx="1.5" fill="#3b2311" />
          {/* Long heavy barrel + muzzle brake */}
          <rect x="38" y="19" width="72" height="3.8" fill="#334155" stroke="#0f172a" strokeWidth="1.3" />
          <rect x="108" y="18" width="6" height="5.8" rx="1" fill="#1e293b" />
          {/* Brass & steel telescopic sight on dual rings */}
          <line x1="44" y1="19" x2="44" y2="14" stroke="#1e293b" strokeWidth="2.2" />
          <line x1="64" y1="19" x2="64" y2="14" stroke="#1e293b" strokeWidth="2.2" />
          <path
            d="M36 11 L74 12 L76 10 L76 16 L74 14 L36 15 Z"
            fill="#b88938"
            stroke="#261b08"
            strokeWidth="1.2"
          />
          {/* Folded bipod legs under fore-end */}
          <line x1="82" y1="26" x2="96" y2="31" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {category === "smg" && (
        <g>
          {/* Folding wire stock & wooden pistol grip */}
          <path d="M12 24 L34 22 L34 26 L12 31 Z" stroke="#475569" strokeWidth="2.2" fill="none" />
          <path d="M36 26 L32 39 L39 39 L42 26 Z" fill="#6b3f1f" stroke="#1f1107" strokeWidth="1.3" />
          {/* Upper receiver & perforated barrel cooling shroud */}
          <rect x="34" y="17" width="32" height="9" rx="1.5" fill="#475569" stroke="#1e293b" strokeWidth="1.5" />
          <rect x="66" y="18.5" width="32" height="6" rx="1.5" fill="#334155" stroke="#0f172a" strokeWidth="1.4" />
          <line x1="71" y1="21.5" x2="93" y2="21.5" stroke="#94a3b8" strokeWidth="1.8" strokeDasharray="3 3" />
          <rect x="98" y="19.8" width="10" height="3.4" fill="#1e293b" />
          {/* Curved 30-round box magazine */}
          <path
            d="M54 26 Q56 38 63 43 L69 41 Q62 35 61 26 Z"
            fill="#334155"
            stroke="#0f172a"
            strokeWidth="1.4"
          />
        </g>
      )}
    </svg>
  );
};

// ============================================================================
// 5. NpcPortraitSvg
// ============================================================================

export const NpcPortraitSvg: React.FC<NpcPortraitSvgProps> = ({
  role,
  tier,
  className = "w-full h-full",
}) => {
  const isFrontier = tier === "frontier_town";

  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${tier.replace("_", " ")} ${role.replace("_", " ")} portrait`}
    >
      {/* Portrait backdrop: Frontier rough timber vs Major City masonry arch */}
      <rect
        x="4"
        y="4"
        width="112"
        height="112"
        rx="8"
        fill={isFrontier ? "#2b1d12" : "#231c18"}
        stroke="#8c6d43"
        strokeWidth="3"
      />
      <rect
        x="8"
        y="8"
        width="104"
        height="104"
        rx="5"
        fill={isFrontier ? "#3d291a" : "#332820"}
        stroke="#523c24"
        strokeWidth="1"
      />

      {/* Ambient environment details */}
      {isFrontier ? (
        <g>
          {/* Rough frontier timber planks */}
          <line x1="8" y1="36" x2="112" y2="36" stroke="#291a0f" strokeWidth="1.2" />
          <line x1="8" y1="70" x2="112" y2="70" stroke="#291a0f" strokeWidth="1.2" />
          {/* Hanging Frontier Brass Oil Lamp + Warm Halo in top-right */}
          <circle cx="96" cy="28" r="16" fill="rgba(234, 179, 8, 0.16)" />
          <circle cx="96" cy="28" r="9" fill="rgba(245, 158, 11, 0.28)" />
          <line x1="96" y1="8" x2="96" y2="18" stroke="#785c38" strokeWidth="1.5" />
          {/* Glass chimney & flame */}
          <path d="M92 28 C92 21, 100 21, 100 28 Z" fill="#fef08a" fillOpacity="0.65" stroke="#b4833e" strokeWidth="1" />
          <path d="M96 22 C94 25, 95 27, 96 27 C97 27, 98 25, 96 22 Z" fill="#f97316" />
          {/* Brass oil reservoir base */}
          <ellipse cx="96" cy="31" rx="6" ry="3" fill="#c9963e" stroke="#3b260e" strokeWidth="1.2" />
        </g>
      ) : (
        <g>
          {/* Major City Classical Archway & Wainscoting */}
          <path
            d="M16 112 L16 42 C16 16, 104 16, 104 42 L104 112"
            stroke="#594633"
            strokeWidth="2"
            fill="rgba(212, 180, 131, 0.05)"
          />
          <circle cx="60" cy="54" r="38" fill="rgba(214, 184, 136, 0.08)" />
        </g>
      )}

      {/* Shoulders & Torso Garments */}
      <g>
        <path
          d="M18 112 C20 86, 36 78, 60 78 C84 78, 100 86, 102 112 Z"
          fill={
            role === "sheriff"
              ? "#4a3222"
              : role === "saloon_barkeep"
                ? "#5c3d28"
                : role === "transport_master"
                  ? "#63462d"
                  : "#543b24"
          }
          stroke="#1c120a"
          strokeWidth="2"
        />

        {/* Tier-specific Neckwear / Shoulder Regalia */}
        {isFrontier ? (
          /* Frontier Town: Weathered Neck Bandana with knotted fold */
          <g>
            <path
              d="M41 75 L60 95 L79 75 Q60 80 41 75 Z"
              fill={
                role === "sheriff"
                  ? "#8f2d24"
                  : role === "saloon_barkeep"
                    ? "#7c4d2b"
                    : "#995c2e"
              }
              stroke="#24140b"
              strokeWidth="1.5"
            />
            <path d="M53 82 L60 89 L67 82" stroke="#d4b483" strokeWidth="1" strokeOpacity="0.6" />
          </g>
        ) : (
          /* Major City: Ornate Military Epaulettes with gold fringe + high collar */
          <g>
            {/* High tailored collar & cravat */}
            <polygon points="46,76 60,94 74,76" fill="#e6d7b8" stroke="#261a10" strokeWidth="1.2" />
            <polygon points="56,80 60,92 64,80" fill="#7c2d12" />
            {/* Left & Right Gold Bullion Epaulettes */}
            <rect x="21" y="80" width="18" height="6" rx="2" transform="rotate(-14 30 83)" fill="#d4a348" stroke="#2b1d09" strokeWidth="1.3" />
            <path d="M22 86 L21 91 M26 85 L25 90 M30 84 L29 89 M34 83 L33 88" stroke="#eab308" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="81" y="80" width="18" height="6" rx="2" transform="rotate(14 90 83)" fill="#d4a348" stroke="#2b1d09" strokeWidth="1.3" />
            <path d="M86 83 L87 88 M90 84 L91 89 M94 85 L95 90 M98 86 L99 91" stroke="#eab308" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        )}

        {/* Role-Specific Chest Props */}
        {role === "sheriff" && (
          /* Six-point Brass Sheriff Star Badge */
          <g transform="translate(72, 90)">
            <polygon
              points="8,0 10.5,5 16,5.5 12,9.5 13,15 8,12 3,15 4,9.5 0,5.5 5.5,5"
              fill="#eab308"
              stroke="#2b1d09"
              strokeWidth="1.1"
            />
            <circle cx="8" cy="8" r="2" fill="#fef08a" />
          </g>
        )}

        {role === "transport_master" && (
          /* Coiled Leather Bullwhip & Brass Harness Ring on Shoulder */
          <g>
            <ellipse
              cx="36"
              cy="96"
              rx="10"
              ry="12"
              stroke="#3b2312"
              strokeWidth="3.5"
              fill="none"
            />
            <circle cx="76" cy="94" r="5" stroke="#d4a348" strokeWidth="2" fill="none" />
          </g>
        )}

        {role === "general_trader" && (
          /* Brass Merchant Scale Emblem & Pocket Chain */
          <g>
            <path d="M40 98 Q60 108 80 96" stroke="#d4a348" strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
            <circle cx="76" cy="96" r="4.5" fill="#c9963e" stroke="#2b1d09" strokeWidth="1" />
          </g>
        )}

        {role === "saloon_barkeep" && (
          /* Barkeep Apron Straps & Foaming Glass Mug */
          <g>
            <path d="M44 82 L42 112 M76 82 L78 112" stroke="#d6c59e" strokeWidth="2.5" />
            <rect x="78" y="92" width="12" height="15" rx="2" fill="#d97706" stroke="#fef3c7" strokeWidth="1.4" />
            <path d="M77 92 Q84 88 91 92" stroke="#fef3c7" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}
      </g>

      {/* Neck & Weathered Caravaneer Head Sculpt */}
      <g>
        <rect x="51" y="66" width="18" height="14" rx="4" fill="#a67c52" stroke="#291a0e" strokeWidth="1.4" />
        {/* Chiseled desert-weathered face */}
        <path
          d="M42 40 C42 28, 78 28, 78 40 L76 60 C74 68, 66 73, 60 73 C54 73, 46 68, 44 60 Z"
          fill="#bf9367"
          stroke="#26170b"
          strokeWidth="1.8"
        />
        {/* Ears */}
        <path d="M42 46 C39 46, 39 55, 43 56 M78 46 C81 46, 81 55, 77 56" stroke="#26170b" strokeWidth="1.5" fill="#a67c52" />

        {/* Furrowed Brow, Eyes & Nose */}
        <path d="M47 45 L56 47 M73 45 L64 47" stroke="#362110" strokeWidth="2" strokeLinecap="round" />
        <circle cx="52" cy="49" r="1.8" fill="#1f130a" />
        <circle cx="68" cy="49" r="1.8" fill="#1f130a" />
        <path d="M60 46 L58 56 L63 57" stroke="#52341b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />

        {/* Major City Wire-Rimmed Spectacles */}
        {!isFrontier && (
          <g stroke="#d4a348" strokeWidth="1.4" fill="rgba(254, 240, 138, 0.14)">
            <circle cx="52" cy="49" r="5.2" />
            <circle cx="68" cy="49" r="5.2" />
            <line x1="57.2" y1="49" x2="62.8" y2="49" />
            <line x1="42" y1="48" x2="46.8" y2="49" />
            <line x1="73.2" y1="49" x2="78" y2="48" />
          </g>
        )}

        {/* Role-Specific Facial Hair / Scars */}
        {role === "saloon_barkeep" && (
          /* Iconic Handlebar Mustache */
          <path
            d="M48 62 Q54 57 60 60 Q66 57 72 62 Q75 63 76 60 M48 62 Q45 63 44 60"
            stroke="#3b2614"
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
          />
        )}
        {role === "sheriff" && (
          /* Grizzled jaw scar & stern mouth + cigarillo */
          <g>
            <line x1="67" y1="53" x2="71" y2="64" stroke="#7c2d12" strokeWidth="1.3" />
            <line x1="53" y1="63" x2="67" y2="63" stroke="#362110" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        )}
        {role === "general_trader" && (
          /* Shrewd goatee & smirk */
          <g>
            <path d="M53 62 Q60 65 67 61" stroke="#362110" strokeWidth="1.6" fill="none" />
            <polygon points="56,66 64,66 60,73" fill="#4a311c" />
          </g>
        )}
        {role === "transport_master" && (
          /* Rugged chin stubble & weather lines */
          <g>
            <path d="M46 58 C47 68, 73 68, 74 58" stroke="#4a321e" strokeWidth="3" strokeOpacity="0.45" fill="none" />
            <line x1="54" y1="62" x2="66" y2="62" stroke="#362110" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        )}
      </g>

      {/* Tier-Specific Headgear: Frontier Cowboy Hat vs Major City Top Hat */}
      {isFrontier ? (
        <g>
          {/* Pinched-crown leather Cowboy Hat */}
          <path
            d="M42 36 L47 18 C51 15, 56 20, 60 20 C64 20, 69 15, 73 18 L78 36 Z"
            fill="#6b4729"
            stroke="#1f1309"
            strokeWidth="1.8"
          />
          {/* Hatband (with goggles for transport_master) */}
          <rect x="43" y="31" width="34" height="4" fill="#3b2412" />
          {role === "transport_master" && (
            <g fill="#a16207" stroke="#fde047" strokeWidth="1.2">
              <circle cx="54" cy="29" r="4" />
              <circle cx="66" cy="29" r="4" />
            </g>
          )}
          {/* Sweeping wide frontier cowboy brim */}
          <path
            d="M22 36 Q60 29 98 36 Q60 42 22 36 Z"
            fill="#855a35"
            stroke="#1f1309"
            strokeWidth="1.8"
          />
        </g>
      ) : (
        <g>
          {/* Tall Major City Stovepipe Top Hat with brass buckle band */}
          <path
            d="M43 36 L41 12 C52 9, 68 9, 79 12 L77 36 Z"
            fill="#29221e"
            stroke="#120e0c"
            strokeWidth="1.8"
          />
          {/* Silk hatband & gold buckle */}
          <rect x="42.5" y="29" width="35" height="5" fill="#7c2d12" />
          <rect x="56" y="28.5" width="8" height="6" rx="1" stroke="#eab308" strokeWidth="1.3" fill="none" />
          {/* Curled formal top-hat brim */}
          <path
            d="M30 35 Q60 32 90 35 Q60 40 30 35 Z"
            fill="#382f29"
            stroke="#120e0c"
            strokeWidth="1.8"
          />
        </g>
      )}
    </svg>
  );
};

// ============================================================================
// 6. drawCaravaneerMapBackground
// ============================================================================

export function drawCaravaneerMapBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  if (width <= 0 || height <= 0) {
    return;
  }

  ctx.save();

  // 1. Base Weathered Parchment & Sun-Bleached Desert Gradient
  const bgGrad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.48,
    Math.min(width, height) * 0.08,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.72
  );
  bgGrad.addColorStop(0, "#d7be91");
  bgGrad.addColorStop(0.55, "#bfa06d");
  bgGrad.addColorStop(0.85, "#9c7b49");
  bgGrad.addColorStop(1, "#664b29");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Alkali Salt Flat Basins (bleached chalk crusts)
  const saltFlats: ReadonlyArray<{
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    angle: number;
  }> = [
    { cx: width * 0.24, cy: height * 0.32, rx: width * 0.14, ry: height * 0.09, angle: -0.2 },
    { cx: width * 0.72, cy: height * 0.64, rx: width * 0.17, ry: height * 0.11, angle: 0.18 },
    { cx: width * 0.48, cy: height * 0.78, rx: width * 0.11, ry: height * 0.07, angle: -0.08 },
  ];

  for (const flat of saltFlats) {
    ctx.save();
    ctx.translate(flat.cx, flat.cy);
    ctx.rotate(flat.angle);

    ctx.beginPath();
    ctx.ellipse(0, 0, flat.rx, flat.ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(239, 229, 205, 0.34)";
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, 0, flat.rx * 0.72, flat.ry * 0.7, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(247, 240, 223, 0.28)";
    ctx.fill();
    ctx.strokeStyle = "rgba(120, 93, 56, 0.28)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Topographical Canyon Contours & Escarpment Lines
  ctx.save();
  ctx.strokeStyle = "rgba(92, 66, 36, 0.32)";
  ctx.lineWidth = 1.25;
  ctx.setLineDash([]);

  const contourCenters: ReadonlyArray<{ x: number; y: number; scale: number }> = [
    { x: width * 0.18, y: height * 0.72, scale: 1.0 },
    { x: width * 0.66, y: height * 0.26, scale: 1.2 },
    { x: width * 0.84, y: height * 0.45, scale: 0.85 },
  ];

  for (const center of contourCenters) {
    for (let ring = 1; ring <= 4; ring += 1) {
      const rx = ring * 26 * center.scale;
      const ry = ring * 15 * center.scale;
      ctx.beginPath();
      for (let step = 0; step <= 32; step += 1) {
        const theta = (step / 32) * Math.PI * 2;
        const wobble =
          1 +
          0.12 * Math.sin(theta * 3 + ring) +
          0.07 * Math.cos(theta * 5 - ring * 0.7);
        const px = center.x + Math.cos(theta) * rx * wobble;
        const py = center.y + Math.sin(theta) * ry * wobble;
        if (step === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();

  // 4. Dry Arroyo / Canyon Riverbed Meandering Path
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(width * 0.05, height * 0.16);
  ctx.bezierCurveTo(
    width * 0.32,
    height * 0.24,
    width * 0.42,
    height * 0.56,
    width * 0.94,
    height * 0.84
  );
  ctx.strokeStyle = "rgba(82, 56, 29, 0.25)";
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.strokeStyle = "rgba(219, 198, 158, 0.35)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  // 5. Faint Cartographic Surveyor Grid Lines
  ctx.save();
  ctx.strokeStyle = "rgba(74, 52, 28, 0.13)";
  ctx.lineWidth = 1;
  const gridSpacing = Math.max(48, Math.round(Math.min(width, height) / 7));
  for (let x = gridSpacing; x < width; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 10);
    ctx.lineTo(x, height - 10);
    ctx.stroke();
  }
  for (let y = gridSpacing; y < height; y += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(width - 10, y);
    ctx.stroke();
  }
  ctx.restore();

  // 6. Deterministic Subtle Desert Grit Noise & Foxing Speckles
  let seed = 133742;
  const nextRand = (): number => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const speckleCount = Math.min(650, Math.floor((width * height) / 420));
  for (let i = 0; i < speckleCount; i += 1) {
    const sx = nextRand() * width;
    const sy = nextRand() * height;
    const radius = 0.6 + nextRand() * 1.6;
    ctx.fillStyle =
      i % 3 === 0
        ? "rgba(58, 39, 19, 0.16)"
        : i % 3 === 1
          ? "rgba(244, 232, 204, 0.18)"
          : "rgba(120, 82, 40, 0.13)";
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 7. Ornate Caravaneer Compass Rose (Bottom-Left or Top-Right safe margin)
  const compassRadius = Math.max(22, Math.min(width, height) * 0.075);
  const compassX = width - compassRadius * 1.75;
  const compassY = compassRadius * 1.75;

  ctx.save();
  ctx.translate(compassX, compassY);

  // Outer degree rings
  ctx.strokeStyle = "rgba(66, 44, 22, 0.65)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, compassRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, compassRadius * 0.82, 0, Math.PI * 2);
  ctx.stroke();

  // 8-point star needles
  for (let i = 0; i < 8; i += 1) {
    const angle = (i * Math.PI) / 4;
    const tipLen = i % 2 === 0 ? compassRadius * 0.95 : compassRadius * 0.62;
    const halfBase = compassRadius * 0.16;

    ctx.save();
    ctx.rotate(angle);

    // Dark sepia half-blade
    ctx.beginPath();
    ctx.moveTo(0, -tipLen);
    ctx.lineTo(halfBase, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(62, 41, 20, 0.78)";
    ctx.fill();

    // Sun-bleached gold half-blade
    ctx.beginPath();
    ctx.moveTo(0, -tipLen);
    ctx.lineTo(-halfBase, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(186, 142, 74, 0.78)";
    ctx.fill();

    ctx.restore();
  }

  // North cardinal label
  ctx.fillStyle = "rgba(54, 34, 16, 0.88)";
  ctx.font = `bold ${Math.max(10, Math.round(compassRadius * 0.38))}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("N", 0, -compassRadius * 1.04);
  ctx.restore();

  // 8. Double-Ruled Antique Map Border Frame
  ctx.save();
  ctx.strokeStyle = "rgba(58, 38, 18, 0.72)";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(5, 5, width - 10, height - 10);

  ctx.strokeStyle = "rgba(89, 61, 32, 0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, width - 20, height - 20);
  ctx.restore();

  ctx.restore();
}
