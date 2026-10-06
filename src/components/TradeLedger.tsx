"use client";
import { GameState } from "@/domain/types";
import { ITEMS, SETTLEMENTS } from "@/domain/worldData";

export function TradeLedger({state}: {state:GameState}) {
  const entries = state.tradeLedger ?? [];
  const margin = entries.reduce((sum,e)=>sum+(e.profit??0),0);
  return <section className="game-panel mt-4"><h3 className="font-serif text-xl text-amber-100">Merchant's ledger</h3><p className="mt-1 text-sm text-stone-400">Recorded trade margin: <strong className="text-emerald-300">${margin.toFixed(2)}</strong>. Acquisition costs use a moving average. Recorded upkeep and clinic costs: ${(state.operatingCosts??0).toFixed(2)}. Estimated realized result: ${(margin-(state.operatingCosts??0)).toFixed(2)}. Transport purchases are capital investments; inherited goods have zero recorded acquisition cost.</p>{entries.length === 0 ? <p className="mt-4 text-sm text-stone-400">Your first purchase or sale will appear here.</p> : <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-amber-300"><tr><th className="p-2">Day / town</th><th>Trade</th><th>Amount</th><th>Unit price</th><th>Trade margin</th></tr></thead><tbody>{entries.slice(0,30).map((e,i)=><tr key={i} className="border-t border-stone-800"><td className="p-2">{e.day} · {SETTLEMENTS[e.settlementId].name}</td><td>{e.kind} · {ITEMS[e.itemId].name}</td><td>{e.quantity}</td><td>${e.unitPrice}</td><td>{e.profit === undefined ? "—" : `$${e.profit.toFixed(2)}`}</td></tr>)}</tbody></table></div>}</section>;
}
