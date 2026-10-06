import { GameState } from "./types";
import { ITEMS } from "./worldData";
import { calculateShotPreview, getManhattanDistance } from "./combatEngine";

/** One enemy decision per call: movement and impact can be shown between decisions. */
export function performEnemyAction(state: GameState, enemyId: string, random: () => number = Math.random): { state: GameState; done: boolean; sound: "step" | "shot" | "hit" | "miss" | "reload" | null } {
  const combat=state.combatState;
  if(!combat || combat.outcome!=="ongoing")return {state,done:true,sound:null};
  const units=combat.units.map(u=>({...u,...(u.magazines?{magazines:{...u.magazines}}:{})}));
  const enemy=units.find(u=>u.id===enemyId);
  const targets=units.filter(u=>u.isPlayerTeam && u.hp>0 && !u.isFled);
  if(!enemy || enemy.hp<=0 || enemy.isFled || targets.length===0 || enemy.ap<=0)return {state,done:true,sound:null};
  targets.sort((a,b)=>getManhattanDistance(enemy.x,enemy.y,a.x,a.y)-getManhattanDistance(enemy.x,enemy.y,b.x,b.y));
  const target=targets[0],stats=ITEMS[enemy.weapon].weaponStats!;
  enemy.magazines={...enemy.magazines};
  const distance=getManhattanDistance(enemy.x,enemy.y,target.x,target.y);
  let message="",sound:"step"|"shot"|"hit"|"miss"|"reload"|null=null;
  if(distance>stats.optimalRangeTiles || !calculateShotPreview(combat,enemy,target,stats.ammoType?"snap":"melee").canAttack && enemy.ap>=stats.snapShotAp && (!stats.ammoType || enemy.currentMagAmmo>0)) {
    const candidates=[{x:enemy.x+1,y:enemy.y},{x:enemy.x-1,y:enemy.y},{x:enemy.x,y:enemy.y+1},{x:enemy.x,y:enemy.y-1}].filter(p=>p.x>=0 && p.y>=0 && p.x<combat.gridWidth && p.y<combat.gridHeight && !units.some(u=>u.hp>0&&!u.isFled&&u.x===p.x&&u.y===p.y));
    candidates.sort((a,b)=>getManhattanDistance(a.x,a.y,target.x,target.y)-getManhattanDistance(b.x,b.y,target.x,target.y));
    const step=candidates.find(p=>(combat.tiles[p.y][p.x].moveApCost*(enemy.crippledLegs?2:1))<=enemy.ap && getManhattanDistance(p.x,p.y,target.x,target.y)<distance);
    if(!step)return {state,done:true,sound:null};
    enemy.ap-=combat.tiles[step.y][step.x].moveApCost*(enemy.crippledLegs?2:1);enemy.x=step.x;enemy.y=step.y;
    message=`${enemy.name} moved to (${step.x},${step.y}).`;sound="step";
  } else if(stats.ammoType && enemy.currentMagAmmo<=0) {
    // Enemy reserves are explicit and finite, separate from the player's cargo.
    const reserve=enemy.reserveAmmo??0;
    if(reserve<=0 || enemy.ap<stats.reloadAp)return {state,done:true,sound:null};
    const amount=Math.min(stats.magazineSize,reserve);
    enemy.currentMagAmmo=amount;enemy.reserveAmmo=reserve-amount;enemy.ap-=stats.reloadAp;
    enemy.magazines![enemy.weapon]=amount;message=`${enemy.name} reloaded ${amount} rounds.`;sound="reload";
  } else {
    const preview=calculateShotPreview({...combat,units},enemy,target,stats.ammoType?"snap":"melee");
    if(!preview.canAttack)return {state,done:true,sound:null};
    enemy.ap-=preview.apCost;
    if(stats.ammoType){enemy.currentMagAmmo--;enemy.magazines![enemy.weapon]=enemy.currentMagAmmo;}
    const hit=random()*100<=preview.hitChancePercent;
    const damage=hit?Math.floor(preview.minDamage+random()*(preview.maxDamage-preview.minDamage+1)):0;
    target.hp=Math.max(0,target.hp-damage);target.morale=Math.max(0,target.morale-damage*.6);
    message=hit?`${enemy.name} hit ${target.name} for ${damage} HP.`:`${enemy.name} missed ${target.name}.`;
    sound=hit?"hit":"miss";
  }
  const defeat=units.some(u=>u.isMainCharacter && u.hp<=0);
  return {state:{...state,combatState:{...combat,units,activeUnitId:enemy.id,combatLog:[message,...combat.combatLog].slice(0,50),outcome:defeat?"defeat":"ongoing"}},done:enemy.ap<=0 || defeat,sound};
}
