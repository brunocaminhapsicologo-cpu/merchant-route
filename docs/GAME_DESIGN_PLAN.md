# 📜 Game Design Document (GDD) & Technical Plan: **Merchant Route**

> **High Concept:** A top-down tactical RPG and post-collapse wasteland trade simulator (inspired by *Caravaneer*, *Fallout 1/2*, and *Mount & Blade*), where every bullet fired and every liter of water or gasoline consumed counts directly against your profit margin as a wandering merchant.
> **Language & Localization:** The entire game UI, dialogues, items, and lore are in **English**. Smaller frontier settlements bear gritty **Old West names** (*Dust Creek*, *Deadwood Gulch*, *Leadville Shaft*, *Blackwater Rig*), while the wealthy, educated metropolises retain prestigious **American city names** (*New Denver*, *Saint Louis*).

---

## 1. Setting & Starting Point

### 1.1 The Wasteland Frontier
Industrial civilization has collapsed into an arid, sun-scorched frontier. Clean water and preserved food are survival currencies. Functional firearms and intact ammunition are blood-stained relics, and most survivors rely on animal traction (donkeys, mules, and horses pulling makeshift wagons). Internal combustion engines and refined gasoline still exist, but they are monopolized by the educated elite and industrial barons inside the great walled cities.

### 1.2 Grandfather's Inheritance (Starting Loadout)
You begin your journey in the frontier settlement of **Dust Creek** after burying your grandfather, inheriting everything he owned:
* **Starting Transport:** `1x Old Donkey` (steady pace, carries up to `80 kg` without a wagon, consumes minimal water and forage).
* **Starting Capital:** `$1,000` in Trade Guild script.
* **Combat Gear:** `1x Grandfather's Bolt-Action Rifle` + `12x .308 Rounds` + `1x Rusty Machete` (for melee defense without wasting bullets).
* **Survival Supplies:** Water and Food rations for 3 days of travel + Forage for the donkey.

---

## 2. Character Attributes (RPG System)

| Attribute | Tactical Combat Impact (Top-Down) | Trade & Overworld Impact |
| :--- | :--- | :--- |
| **Grit (GRT)** | Determines max **Hit Points (HP)** (`50 + GRT * 10`), bleed resistance, and melee damage. | Increases personal carry weight (`+5 kg` per point) and reduces heat exhaustion. |
| **Agility (AGI)** | Determines **Action Points (AP)** per turn (`5 + floor(AGI / 2)`) and movement tiles per AP. | Boosts **Flee/Escape** chance in road encounters and combat turn initiative. |
| **Perception (PER)** | Increases **Ranged Accuracy (%)** and optimal weapon range. | Spots raiders earlier on the overworld map, giving better pre-combat reaction options. |
| **Charisma (CHA)** | Intimidates low-morale raiders into surrendering or fleeing mid-battle. | Improves buy/sell prices (`±2.5%` per point), lowers mercenary daily wages, and helps pass Sheriff contraband checks. |

---

## 3. Logistics, Transport & Overworld Movement

### 3.1 Transport Tiers & Fuel/Forage Rules
Caravan speed depends on your **traction + vehicle setup**, terrain type, and current cargo weight ratio.

| Transport Setup | Max Cargo | Base Speed | Idle Consumption | Moving Consumption | Availability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **On Foot (No Animal)** | 35 kg | 4.0 km/h | Water + Food | Water + Food | Anywhere |
| **Old Donkey (Inherited)** | 80 kg | 5.5 km/h | Water + Forage | Water + Forage | Frontier Towns |
| **Wooden Cart + Donkey** | 220 kg | 4.5 km/h | Water + Forage | Water + Forage | Frontier Towns |
| **Heavy Wagon + Draft Horse** | 450 kg | 8.0 km/h | High Water + Forage | High Water + Forage | Ranch Towns (*Deadwood Gulch*) |
| **Scrap Motorcycle** | 120 kg | 28.0 km/h | Crew only | **Gasoline** (1 L / 15 km) | Major Cities (*Saint Louis* / *New Denver*) |
| **Armored Pickup Truck** | 1,200 kg | 38.0 km/h | Crew only | **Gasoline** (1 L / 5 km) | Major Cities (*New Denver*) |

---

## 4. Dynamic Economy, Inflation & Settlements

### 4.1 Frontier Towns (Old West) vs. Major Cities (US Metropolises)

| Settlement Name | Tier | Cultural Profile | Produces (Cheap / Buy Here) | High Demand (Expensive / Sell Here) |
| :--- | :--- | :--- | :--- | :--- |
| **Dust Creek** *(Start)* | Frontier Village | Humble farmers & well-diggers | Well Water, Dry Corn, Animal Forage | Raw Leather, Scrap Tools, Medicine |
| **Deadwood Gulch** | Frontier Outpost | Cattle ranchers, tanners & horse wranglers | Raw Leather, Smoked Jerky, Horses | Clean Water, Salt, .308 & .38 Ammo |
| **Leadville Shaft** | Frontier Mining Camp | Desperate miners & gunpowder smiths | Scrap Metal, Gunpowder, Ammunition | Food, Water, Moonshine Whiskey |
| **Blackwater Rig** | Desert Oil Outpost | Roughneck drillers & grease mechanics | Gasoline, Motor Oil, Engine Parts | Fresh Food, Leather Boots, Rifles |
| **Saint Louis** | Major City | Educated merchants, doctors & old-world gentry | Antibiotics, Luxury Goods, Motorcycles | Raw Leather, Scrap Metal, Dry Corn |
| **New Denver** | Major Metropolis | Wealthy industrial barons & Sheriff HQ | Military Rifles, Pickup Trucks, Electronics | Smoked Jerky, Gunpowder, Crude Oil |

### 4.2 Dynamic Price Formula
`Final Price = Base Price * City Regional Multiplier * Local Stock Scarcity Factor * (1 ± Charisma Modifier)`

---

## 5. Town NPCs & Dialogues

1. **General Goods & Arms Trader:** Buys/sells commodities, water, food, weapons, and scarce ammunition.
2. **Transport & Stable Master / Mechanic:** Sells donkeys, horses, wagons in frontier towns; sells motorcycles, trucks, chassis upgrades, and **Gasoline** in major cities.
3. **Town Sheriff:** Posts **Bounty Contracts** (hunting raider bosses makes trade routes safer) and enforces contraband inspections at city gates.
4. **Saloon Bartender & Mercenaries:** Sells market rumors (droughts, sieges, price spikes) and lets you hire **Mercenary Guards** to fight alongside you on the tactical grid.

---

## 6. Tactical Top-Down Combat (Action Points)

* **Pre-Combat Encounter Modal:** Choose to *Fight*, *Flee* (with option to **Dump Cargo** to gain speed), *Pay Toll*, or *Intimidate* (Charisma + Firepower check).
* **Top-Down Tactical Grid:**
  * Turn-based movement on a 2D square grid where each tile moved costs `1 AP` (or `2 AP` in rough sand/rubble).
  * Cover behind rocks, ruins, and your own **Caravan Wagon** (`-25%` to `-50%` enemy hit chance).
  * Firing Modes: *Melee Strike* (0 ammo), *Snap Shot* (low AP, normal accuracy), *Aimed Shot* (high AP, `+25%` accuracy & critical chance).
