import {describe,it,expect} from "vitest";
import {createInitialGameState,TRANSPORTS,ROUTES} from "../worldData";
import {getMaxCargoCapacityKg,getDailyUpkeepSummary,getCaravanSpeedBreakdown} from "../economyEngine";
import {generateRoadEncounter,initializeCombatWithAmmo,calculateShotPreview} from "../combatEngine";
describe("Caravan composition and tactical visibility",()=>{
  it("adds active capacity and animal upkeep while using the slowest transport",()=>{
    const state=createInitialGameState();state.activeTransports=["old_donkey","heavy_wagon_horse"];
    expect(getMaxCargoCapacityKg(state)).toBe(TRANSPORTS.old_donkey.maxCargoKg+TRANSPORTS.heavy_wagon_horse.maxCargoKg+state.attributes.grit*6);
    expect(getDailyUpkeepSummary(state).animalForagePerDay).toBe(TRANSPORTS.old_donkey.foragePerDay+TRANSPORTS.heavy_wagon_horse.foragePerDay);
    expect(getCaravanSpeedBreakdown(state).baseSpeedKmh).toBe(TRANSPORTS.old_donkey.baseSpeedKmh);
  });
  it("blocks shooting through ruins, allowing a different clear angle",()=>{
    const state=createInitialGameState(),combat=initializeCombatWithAmmo(state,generateRoadEncounter(state,ROUTES[0])).combatState!;
    const player=combat.units.find(u=>u.isMainCharacter)!,enemy=combat.units.find(u=>!u.isPlayerTeam)!;
    player.x=2;player.y=3;player.ap=10;enemy.x=8;enemy.y=3;
    expect(calculateShotPreview(combat,player,enemy,"snap").reason).toContain("line of sight");
    player.y=2;enemy.y=2;expect(calculateShotPreview(combat,player,enemy,"snap").canAttack).toBe(true);
  });
  it("flanking defeats protection from the covered side",()=>{
    const state=createInitialGameState(),combat=initializeCombatWithAmmo(state,generateRoadEncounter(state,ROUTES[0])).combatState!;
    const player=combat.units.find(u=>u.isMainCharacter)!,enemy=combat.units.find(u=>!u.isPlayerTeam)!;
    enemy.x=4;enemy.y=1;combat.tiles[1][4].coverDirection="west";player.x=2;player.y=1;
    const protectedShot=calculateShotPreview(combat,player,enemy,"snap");player.x=6;
    const flanking=calculateShotPreview(combat,player,enemy,"snap");
    expect(flanking.hitChancePercent).toBeGreaterThan(protectedShot.hitChancePercent);
  });
});
