/* Food v2: cloud favorites, combos and daily target snapshots. */
(()=>{
"use strict";
let activeUid=null,lastFingerprint=null,syncing=false,timer=null;
const fingerprint=()=>JSON.stringify([S.customFavorites||[],S.mealCombos||[],S.dailyTargets||{}]);
const valid=()=>currentUser&&S.stateOwnerId===currentUser.id&&sbClient;
function status(kind,text){
 const node=document.getElementById("foodV2SyncStatus");
 if(node){node.textContent=text;node.dataset.state=kind;}
}
window.foodV2SyncStatus=status;
window.foodV2TrackPrefs=()=>{
 if(!valid())return;
 const uid=currentUser.id,next=fingerprint();
 if(activeUid!==uid){activeUid=uid;lastFingerprint=next;return;}
 if(lastFingerprint===next)return;
 lastFingerprint=next;S.cloudPrefsUpdatedAt=Date.now();
 if(timer)clearTimeout(timer);
 timer=setTimeout(()=>{if(valid()&&navigator.onLine)window.foodV2ReconcileCloud();},1800);
};
const combine=(local,remote)=>{
 const rows=new Map();
 for(const row of [...(Array.isArray(remote)?remote:[]),...(Array.isArray(local)?local:[])]){
  if(row&&typeof row.name==="string"&&row.name.trim())rows.set(row.name.trim(),row);
 }
 return [...rows.values()].slice(0,500);
};
window.foodV2ReconcileCloud=async()=>{
 if(syncing||!valid()||!navigator.onLine)return;
 const uid=currentUser.id;syncing=true;
 try{
  status("pending","正在同步個人設定…");
  const {data:remote,error}=await sbClient.from("food_user_state")
   .select("favorites,combos,daily_targets,updated_at").eq("user_id",uid).maybeSingle();
  if(error)throw error;
  if(!valid()||currentUser.id!==uid)return;
  const localTime=Number(S.cloudPrefsUpdatedAt||0);
  const remoteTime=remote?Date.parse(remote.updated_at)||0:0;
  // After initial migration, honor the newest snapshot so deliberate removals
  // do not reappear as a side effect of union-merging multiple devices.
  const initialMigration=localTime===0;
  const fav=!remote?S.customFavorites||[]:initialMigration?
    combine(S.customFavorites,remote.favorites):remoteTime>localTime?
    remote.favorites||[]:S.customFavorites||[];
  const combos=!remote?S.mealCombos||[]:initialMigration?
    combine(S.mealCombos,remote.combos):remoteTime>localTime?
    remote.combos||[]:S.mealCombos||[];
  const targets=remoteTime>localTime?
   {...(S.dailyTargets||{}),...(remote?.daily_targets||{})}:
   {...(remote?.daily_targets||{}),...(S.dailyTargets||{})};
  const changed=!remote || JSON.stringify(remote.favorites)!==JSON.stringify(fav) ||
   JSON.stringify(remote.combos)!==JSON.stringify(combos) ||
   JSON.stringify(remote.daily_targets)!==JSON.stringify(targets);
  S.customFavorites=fav;S.mealCombos=combos;S.dailyTargets=targets;
  if(changed){
   const {data,error:saveError}=await sbClient.from("food_user_state")
    .upsert({user_id:uid,favorites:fav,combos,daily_targets:targets,updated_at:new Date().toISOString()},{onConflict:"user_id"})
    .select("updated_at").single();
   if(saveError)throw saveError;
   if(!valid()||currentUser.id!==uid)return;
   S.cloudPrefsUpdatedAt=Date.parse(data.updated_at)||Date.now();
  }else{S.cloudPrefsUpdatedAt=Math.max(localTime,remoteTime);}
  activeUid=uid;lastFingerprint=fingerprint();save();
  status("ok","飲食紀錄及個人設定已同步");
  if(currentActiveView==="add")renderRecentFoods();
  if(currentActiveView==="list")renderFoodList();
 }catch(e){console.warn("cloud preferences sync failed",e);status("failed","偏好設定同步失敗；原資料已保留");}
 finally{syncing=false;}
};
window.addEventListener("offline",()=>status("offline","目前離線，紀錄將保存在此裝置"));
window.addEventListener("online",()=>{
 status("pending","連線恢復，正在同步");
 if(valid())runSyncPipeline();
});
document.addEventListener("DOMContentLoaded",()=>{
 const node=document.createElement("div");
 node.id="foodV2SyncStatus";node.className="food-v2-sync";
 node.setAttribute("role","status");node.setAttribute("aria-live","polite");
 node.textContent="檢查同步狀態…";
 const parent=document.getElementById("p-today");
 parent?.insertBefore(node,parent.querySelector("#sum"));
 const style=document.createElement("style");
 style.textContent=".food-v2-sync{padding:9px 12px;margin:0 0 12px;border:1px solid var(--line);"+
 "border-radius:11px;font-size:13px;color:var(--mute);background:var(--card)}"+
 ".food-v2-sync[data-state=failed]{border-color:#be8e65}";
 document.head.append(style);
 if(valid()&&navigator.onLine)window.foodV2ReconcileCloud();
});
})();