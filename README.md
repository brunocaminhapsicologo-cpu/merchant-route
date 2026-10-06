# 🏜️ Merchant Route — Wasteland Caravan & Tactical RPG

A top-down tactical RPG and post-collapse trade route simulator for Windows (`.exe`) and Web.

## 📖 Game Premise
After burying your grandfather outside the humble frontier settlement of **Dust Creek**, you inherit his life's possessions: **1x Pack Donkey, \$1,000 in Trade Guild script, his old .308 Bolt-Action Rifle, 12 rounds of ammunition, and a Rusty Machete**. You set out across the scorched wasteland to build your fortune as a wandering caravan merchant.

### 🏘️ Frontier Old West Towns vs. US Major Metropolises
* **Old West Frontier Settlements (Small/Medium):**
  * **Dust Creek:** Humble farming & artesian well village (Cheap *Purified Water*, *Dry Corn*, *Animal Forage*).
  * **Deadwood Gulch:** Cattle ranching & tannery outpost (Cheap *Raw Leather*, *Smoked Jerky*; sells *Draft Horses & Prairie Wagons*).
  * **Leadville Shaft:** Canyon lead mine & munitions foundry (Cheap *Salvaged Steel*, *Ammunition*, and illicit *Canyon Moonshine*).
  * **Blackwater Rig:** Desert oil derrick & refinery (Cheap *Refined Gasoline* and *Salt*; extreme water scarcity).
* **Major US Cities (Wealthy & Educated Elite):**
  * **Saint Louis:** Educated riverfront metropolis & pharmaceutical hub (Produces *Pre-War Antibiotics*, *Luxury Cigars*, and *Wasteland Scrambler Motorcycles*; strict Sheriff contraband inspection).
  * **New Denver:** Walled industrial citadel (Produces *5.56 Carbines*, *V8 Cargo Trucks*, and *Machinist Tools*; high demand for *Gasoline*, *Smoked Jerky*, and smuggled *Moonshine*).

## ⚙️ Core Mechanics
1. **Dynamic Regional Inflation & Saloon Rumors:** Prices react to regional specialization, local stock scarcity/saturation, active crisis events discovered in the Saloon, and your **Charisma** attribute.
2. **Caravan Logistics & Transport Tiers:** Speed on the overworld map depends on your transport (*On Foot*, *Pack Donkey*, *Two-Wheel Cart*, *Prairie Wagon + Draft Horse*, *Scrambler Motorcycle*, *V8 Cargo Truck*), terrain modifiers, and cargo weight ratio. Animals consume **Water + Forage** daily; motor vehicles consume **Gasoline** per kilometer traveled.
3. **Top-Down Turn-Based Tactical Combat (Action Points):** Road encounters allow you to *Fight*, *Outrun* (with emergency **Cargo Jettison**), *Pay Toll*, or *Intimidate*. Combat takes place on a 12x8 top-down grid with **Action Points (AP)**, directional cover (*Wagon 45%*, *Ruins 35%*, *Rocks 30%*), *Snap Shot* vs. *Aimed Shot*, and hired **Mercenary Guards**.
4. **Town NPCs:** Interact with the **General Goods & Arms Trader**, **Transport & Fuel Shop**, **Town Sheriff (Bounty Board)**, and **Saloon Barkeep**.

## 🚀 Running Locally & Desktop `.exe`
- **Desktop Executable (`.exe`):** Double-click `MerchantRoute.exe` in the project root.
- **Development Server:**
  ```bash
  npm ci
  npm run dev
  ```
- **Run Unit Tests & Build:**
  ```bash
  npm test
  npm run build
  ```

## Version 1.1 — Compass travel and town scenes

The offline Windows executable includes the game and runtime. The earlier web launcher is preserved under `desktop/MerchantRoute-WebLauncher-original.exe`.

- World atlas: measure the distance and bearing to a settlement.
- Travel & compass: enter the bearing manually, start/stop movement, change course and camp. North is 0 degrees, east 90, south 180, west 270. The atlas does not steer your caravan.
- Town & shops: stop near a city, enter it, then choose a building on the overhead town map. Shops have their own interiors and NPCs.
- Combat: moving units slide between tiles; hits trigger recoil and damage feedback. Select an enemy and confirm an attack. Enemy actions happen sequentially.
- Caravan & cargo: deploy owned transports together while in town; review supplies and the trade ledger.
- Saves: automatic device saves, JSON export/import and migration of earlier saves. Export from the old web game and import in the offline edition when changing origins.

To serve the exported game: `npm run build`, then `npm start`. To rebuild the portable Windows executable: `npm run package:win` (output in `release-final/`).

Implementation details, validation and remaining roadmap work are recorded in `docs/IMPLEMENTACAO_1_1.md`.
