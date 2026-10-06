import {describe,it,expect} from "vitest";
import {performEnemyAction} from "../combatActions";
import {initializeCombatWithAmmo,generateRoadEncounter} from "../combatEngine";
import {createInitialGameState,ROUTES} from "../worldData";

function battle(){return initializeCombatWithAmmo(createInitialGameState(),generateRoadEncounter(createInitialGameState(),ROUTES[0]));}
describe("Sequential enemy decisions",()=>{
  it("moves one tile per action and pays the destination terrain cost",()=>{
    const state=battle(),combat=state.combatState!;
    const enemy=combat.units.find(u=>!u.isPlayerTeam)!;
    enemy.weapon="rusty_machete";enemy.x=5;enemy.y=3;enemy.ap=7;
    combat.tiles[3][4].moveApCost=2;
    const result=performEnemyAction(state,enemy.id,()=>.5);
    const moved=result.state.combatState!.units.find(u=>u.id===enemy.id)!;
    expect(Math.abs(moved.x-enemy.x)+Math.abs(moved.y-enemy.y)).toBe(1);
    expect(moved.ap).toBe(5);expect(enemy.x).toBe(5);
  });
  it("cannot reload or fire with an empty magazine and empty finite reserve",()=>{
    const state=battle(),combat=state.combatState!,enemy=combat.units.find(u=>!u.isPlayerTeam)!;
    enemy.weapon="bolt_rifle_308";enemy.x=4;enemy.y=3;enemy.currentMagAmmo=0;enemy.reserveAmmo=0;enemy.ap=10;
    const result=performEnemyAction(state,enemy.id,()=>0);
    expect(result.done).toBe(true);expect(result.sound).toBe(null);
    expect(result.state.combatState!.units.find(u=>u.isMainCharacter)!.hp).toBe(combat.units.find(u=>u.isMainCharacter)!.hp);
  });
  it("transfers a partial enemy reserve rather than creating a full magazine",()=>{
    const state=battle(),enemy=state.combatState!.units.find(u=>!u.isPlayerTeam)!;
    enemy.weapon="bolt_rifle_308";enemy.x=4;enemy.y=3;enemy.currentMagAmmo=0;enemy.reserveAmmo=1;enemy.ap=10;
    const result=performEnemyAction(state,enemy.id,()=>0),updated=result.state.combatState!.units.find(u=>u.id===enemy.id)!;
    expect(updated.currentMagAmmo).toBe(1);expect(updated.reserveAmmo).toBe(0);expect(result.sound).toBe("reload");
  });
  it("a hit spends a loaded round and updates HP so impact can animate",()=>{
    const state=battle(),combat=state.combatState!,enemy=combat.units.find(u=>!u.isPlayerTeam)!;
    enemy.weapon="bolt_rifle_308";enemy.x=4;enemy.y=3;enemy.currentMagAmmo=2;enemy.ap=10;
    const result=performEnemyAction(state,enemy.id,()=>0),units=result.state.combatState!.units;
    expect(units.find(u=>u.id===enemy.id)!.currentMagAmmo).toBe(1);
    expect(units.find(u=>u.isMainCharacter)!.hp).toBeLessThan(combat.units.find(u=>u.isMainCharacter)!.hp);
    expect(result.sound).toBe("hit");
  });
});
