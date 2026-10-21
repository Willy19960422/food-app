/* 食養紀錄：完整備份／匯出 CSV／經雙重確認的帳號刪除 */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const active=()=>currentUser&&S.stateOwnerId===currentUser.id&&sbClient;
const status=(id,text)=>{if($(id))$(id).textContent=text;};
function makeDownload(filename,body,mime){
 const blob=new Blob([body],{type:mime}),url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=filename;
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function allCloudLogs(uid){
 if(!navigator.onLine)return null;
 const records=[];
 for(let offset=0;offset<100000;offset+=500){
  const {data,error}=await sbClient.from("diet_logs")
   .select("*").eq("user_id",uid).order("date",{ascending:true})
   .range(offset,offset+499);
  if(error)throw error;
  if(!active()||currentUser.id!==uid)throw new Error("帳號已切換");
  records.push(...(data||[]));
  if(!data||data.length<500)return records;
 }
 throw new Error("匯出資料超過分頁上限，請先聯繫管理者");
}
async function allCloudWeights(uid){
 if(!navigator.onLine){
  const cached=window.foodV2GetWeights?.()||[];
  if(!cached.length)throw new Error("離線時尚無完整體重資料可供備份，請恢復網路後匯出");
  return cached;
 }
 const result=[];
 for(let offset=0;offset<10000;offset+=500){
  const {data,error}=await sbClient.from("food_weight_logs")
   .select("measured_on,kg").eq("user_id",uid).order("measured_on",{ascending:true})
   .range(offset,offset+499);
  if(error)throw error;
  if(!active()||currentUser.id!==uid)throw new Error("帳號已切換");
  result.push(...(data||[]));
  if(!data||data.length<500)return result;
 }
 throw new Error("體重資料超過匯出上限");
}
function localLogs(){
 return Object.entries(S.log||{}).flatMap(([date,items])=>
  (items||[]).map(item=>({
   id:item.id,date,meal:item.meal,name:item.name,servings:item.n,
   kcal:item.k,protein:item.p,fat:item.f,carbs:item.c,
   logged_at:item.t,nutrition_source:item.source||"legacy"
  })));
}
function cell(value){
 let t=value==null?"":String(value);
 if(/^[=+\-@\t\r]/.test(t))t="'"+t;
 return '"'+t.replaceAll('"','""')+'"';
}
async function exportRecords(format){
 if(!active())return;
 const uid=currentUser.id;status("foodExportStatus","正在整理所有歷史紀錄…");
 try{
  const cloud=await allCloudLogs(uid);
  const ids=new Map((cloud||[]).map(item=>[item.id,item]));
  const deleted=new Set(S.pendingDeleteQueue||[]);
  for(const item of localLogs())if(!deleted.has(item.id))ids.set(item.id,item);
  for(const id of deleted)ids.delete(id);
  const logs=[...ids.values()].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const dt=today();
  if(format==="csv"){
   const cols=["date","meal","name","servings","kcal","protein","fat","carbs","logged_at","nutrition_source"];
   const csv="\uFEFF"+cols.join(",")+"\r\n"+
    logs.map(row=>cols.map(c=>cell(row[c])).join(",")).join("\r\n");
   makeDownload("食養紀錄-飲食明細-"+dt+".csv",csv,"text/csv;charset=utf-8");
  }else{
   const weightRows=await allCloudWeights(uid);
   const complete={format_version:2,exported_at:new Date().toISOString(),
    note:"null 代表營養素未知，非 0；估算與未審核商品請核對來源。",
    profile:S.me,targets:S.customTargets||null,
    daily_targets:S.dailyTargets||{},favorites:S.customFavorites||[],
    combos:S.mealCombos||[],weights:weightRows,
    logs,source:cloud?"雲端與手機紀錄合併":"僅離線手機紀錄"};
   makeDownload("食養紀錄-個人完整備份-"+dt+".json",JSON.stringify(complete,null,2),
    "application/json;charset=utf-8");
  }
  status("foodExportStatus","已整理 "+logs.length+" 筆飲食紀錄並產生檔案。");
 }catch(e){status("foodExportStatus","匯出失敗："+e.message);}
}
async function deleteAccount(){
 if(!active())return;
 if($("foodDeleteInput").value.trim()!=="刪除帳號"){
  status("foodDeleteStatus","請輸入完整的「刪除帳號」。");return;
 }
 if(!confirm("永久刪除帳號、飲食紀錄與個人資料，無法還原。請確認已備份並確定刪除。"))return;
 const userId=currentUser.id,button=$("foodDeleteButton");
 button.disabled=true;status("foodDeleteStatus","正在驗證刪除程序…");
 try{
  const {data:{session}}=await sbClient.auth.getSession();
  if(!session)throw new Error("登入狀態已失效");
  const response=await fetch(SB_URL+"/functions/v1/food-account-delete",{
   method:"POST",
   headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},
   body:JSON.stringify({confirmation:"刪除帳號",user_id:userId})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data.ok!==true)throw new Error(data.error||"無法確認資料刪除");
  try{localStorage.removeItem(getStorageKey(userId));}catch(_){}
  await sbClient.auth.signOut();location.reload();
 }catch(e){status("foodDeleteStatus","未完成刪除："+e.message);button.disabled=false;}
}
document.addEventListener("DOMContentLoaded",()=>{
 const screens=[...document.querySelectorAll("#p-me .settings-subpage")];
 const account=screens.find(x=>x.querySelector("h2")?.textContent==="帳號設定");
 if(!account)return;
 const backup=document.createElement("div");backup.className="card";
 backup.innerHTML='<h2>個人資料備份</h2><p class="mute">下載 JSON（包含體重、目標與套餐）或 CSV（飲食明細）。建議定期備份。</p>'+
  '<div class="food-account-actions"><button type="button" class="ghost" id="foodExportJson">下載完整 JSON</button>'+
  '<button type="button" class="ghost" id="foodExportCsv">下載 CSV 明細</button></div>'+
  '<p id="foodExportStatus" class="mute" role="status"></p>';
 account.append(backup);
 $("foodExportJson").addEventListener("click",()=>exportRecords("json"));
 $("foodExportCsv").addEventListener("click",()=>exportRecords("csv"));
 const remove=document.createElement("div");remove.className="card";
 remove.innerHTML='<h2>帳號刪除</h2><p class="mute">此操作不可復原。請先下載完整備份，再輸入確認文字。</p>'+
  '<label for="foodDeleteInput">輸入「刪除帳號」確認</label>'+
  '<input id="foodDeleteInput" autocomplete="off" placeholder="刪除帳號">'+
  '<button type="button" class="ghost" id="foodDeleteButton">永久刪除帳號與個人紀錄</button>'+
  '<p id="foodDeleteStatus" class="mute" role="status"></p>';
 account.append(remove);
 $("foodDeleteButton").addEventListener("click",deleteAccount);
 const css=document.createElement("style");
 css.textContent=".food-account-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}"+
 ".food-account-actions button,#foodDeleteButton{min-height:49px}"+
 "#foodDeleteButton{border-color:var(--warn);color:var(--warn);margin-top:12px}";
 document.head.append(css);
});
})();