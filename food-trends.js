/* Food v2: seven/thirty-day nutrition trends and optional weight history. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const ready=()=>currentUser&&S.stateOwnerId===currentUser.id&&sbClient;
let period=7,rows=[],loadedUid=null,loadedAt=0,loading=false;
const td=()=>today();
const info=(id,text)=>{if($(id))$(id).textContent=text;};
function trends(){
 if(!ready()||!$("v2TrendContent"))return;
 const holder=$("v2TrendContent");holder.replaceChildren();
 const end=new Date(td()+"T12:00:00");const sums=[];
 let total=0,protein=0,filled=0,partial=0;
 for(let i=period-1;i>=0;i--){
  const d=new Date(end);d.setDate(d.getDate()-i);
  const key=d.toLocaleDateString("sv"),logs=(S.log||{})[key]||[];
  const sum=sumList(logs),recorded=logs.length>0;
  if(recorded){filled++;total+=sum.k;protein+=sum.p;}
  if(recorded&&(sum.unknownP||sum.unknownF||sum.unknownC))partial++;
  sums.push({day:key.slice(5),cal:sum.k,recorded});
 }
 const note=document.createElement("p");note.className="mute";
 note.textContent="期間 "+period+" 天｜有紀錄 "+filled+" 天｜記錄日平均 "+
  (filled?Math.round(total/filled):0)+" kcal｜已知蛋白質平均 "+
  (filled?Math.round(protein/filled):0)+"g"+
  (partial?"｜"+partial+" 天營養不完整":"");
 holder.append(note);
 const max=Math.max(1,...sums.map(s=>s.cal));const chart=document.createElement("div");chart.className="food-v2-chart";
 for(const day of sums){
  const line=document.createElement("div");line.className="food-v2-chart-row";
  const label=document.createElement("span");label.textContent=day.day;
  const bar=document.createElement("div");bar.className="food-v2-chart-track";
  const fill=document.createElement("div");fill.className="food-v2-chart-fill";
  fill.style.width=(day.recorded?Math.max(2,day.cal*100/max):0)+"%";bar.append(fill);
  const count=document.createElement("span");count.textContent=day.recorded?Math.round(day.cal)+" kcal":"無紀錄";
  line.append(label,bar,count);chart.append(line);
 }
 holder.append(chart);
 const disclaimer=document.createElement("p");disclaimer.className="mute";
 disclaimer.textContent="無紀錄不代表攝取 0；AI 估算、缺少營養標示的食品不視為完整數值。";
 holder.append(disclaimer);
}
function showWeights(){
 const box=$("v2WeightList");if(!box)return;box.replaceChildren();
 if(!rows.length){box.textContent="還沒有體重紀錄。";return;}
 if(rows.length>1){
  const a=Number(rows[0].kg),b=Number(rows[rows.length-1].kg);
  const p=document.createElement("p");p.className="mute";
  const delta=Math.round((a-b)*100)/100;
  p.textContent="最新 "+a+" kg，與最早留存紀錄相差 "+(delta>=0?"+":"")+delta+" kg";
  box.append(p);
 }
 for(const v of rows.slice(0,12)){
  const line=document.createElement("div");line.className="food-v2-weight-row";
  const label=document.createElement("span");label.textContent=v.measured_on+"　"+v.kg+" kg";
  const del=document.createElement("button");del.className="sm ghost";del.type="button";del.textContent="刪除";
  del.addEventListener("click",async()=>{
   if(!ready()||!confirm("確定刪除 "+v.measured_on+" 的體重紀錄？"))return;
   const {error}=await sbClient.from("food_weight_logs").delete().eq("id",v.id).eq("user_id",currentUser.id);
   if(error){info("v2WeightStatus","刪除失敗");return;}
   loadedAt=0;await getWeights(true);
  });line.append(label,del);box.append(line);
 }
}
async function getWeights(force=false){
 if(!ready()||!navigator.onLine||loading)return;
 const uid=currentUser.id;if(!force&&loadedUid===uid&&Date.now()-loadedAt<60000)return;
 loading=true;
 try{
  const {data,error}=await sbClient.from("food_weight_logs")
   .select("id,measured_on,kg").eq("user_id",uid).order("measured_on",{ascending:false}).limit(365);
  if(error)throw error;
  if(!ready()||currentUser.id!==uid)return;
  rows=data||[];loadedUid=uid;loadedAt=Date.now();showWeights();
 }catch(e){info("v2WeightStatus","體重資料載入失敗："+e.message)}
 finally{loading=false;}
}
async function saveWeight(){
 if(!ready())return;
 const date=$("v2WeightDate").value,kg=Number($("v2WeightKg").value);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>td()||!Number.isFinite(kg)||kg<20||kg>350){
  info("v2WeightStatus","請填寫有效日期與 20～350 公斤的體重");return;
 }
 if(!navigator.onLine){info("v2WeightStatus","體重需連線才能保存，請恢復網路後再試");return;}
 const btn=$("v2WeightSave");btn.disabled=true;
 try{
  const {error}=await sbClient.from("food_weight_logs").upsert({
   user_id:currentUser.id,measured_on:date,kg
  },{onConflict:"user_id,measured_on"});
  if(error)throw error;info("v2WeightStatus","體重已儲存");loadedAt=0;await getWeights(true);
 }catch(e){info("v2WeightStatus","保存失敗："+e.message)}
 finally{btn.disabled=false;}
}
window.foodV2GetWeights=()=>rows.slice();
window.foodV2Refresh=()=>{
 if(!ready())return;
 if(currentActiveView==="hist"){
  trends();if(loadedUid!==currentUser.id||Date.now()-loadedAt>60000)getWeights();
 }
 if(currentActiveView==="today"){
  const n=(S.pendingSyncQueue||[]).length+(S.pendingDeleteQueue||[]).length;
  if(!navigator.onLine)window.foodV2SyncStatus?.("offline","離線中：新增紀錄已保存在本機");
  else if(n)window.foodV2SyncStatus?.("pending","還有 "+n+" 筆紀錄等待同步");
 }
};
document.addEventListener("DOMContentLoaded",()=>{
 const hist=$("p-hist");if(!hist)return;
 const trend=document.createElement("section");trend.className="card food-v2-card";
 trend.innerHTML='<h2>營養趨勢報告</h2><div class="food-v2-period">'+
  '<button type="button" data-days="7" class="sm ghost on">最近 7 天</button>'+
  '<button type="button" data-days="30" class="sm ghost">最近 30 天</button>'+
  '</div><div id="v2TrendContent"></div>';
 hist.append(trend);
 trend.querySelectorAll("[data-days]").forEach(button=>{
  button.addEventListener("click",()=>{
   period=Number(button.dataset.days);
   trend.querySelectorAll("[data-days]").forEach(x=>x.classList.toggle("on",x===button));trends();
  });
 });
 const weight=document.createElement("section");weight.className="card food-v2-card";
 weight.innerHTML='<h2>體重變化紀錄</h2>'+
  '<div class="food-v2-period"><label>測量日期<input id="v2WeightDate" type="date"></label>'+
  '<label>體重（kg）<input id="v2WeightKg" type="number" inputmode="decimal" step="0.1" min="20" max="350" placeholder="例如 65.5"></label></div>'+
  '<button id="v2WeightSave" type="button">儲存／更新體重</button>'+
  '<p class="mute" id="v2WeightStatus" role="status"></p><div id="v2WeightList"></div>';
 hist.append(weight);
 $("v2WeightDate").value=td();$("v2WeightSave").addEventListener("click",saveWeight);
 const style=document.createElement("style");
 style.textContent=".food-v2-card{margin-top:16px}.food-v2-period{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}"+
 ".food-v2-period>*{flex:1 1 120px;min-width:0}.food-v2-period input{min-height:46px;width:100%}"+
 ".food-v2-period button{min-height:46px}.food-v2-chart{display:grid;gap:7px;max-height:360px;overflow-y:auto;margin:12px 0}"+
 ".food-v2-chart-row{display:grid;grid-template-columns:42px minmax(0,1fr) 80px;align-items:center;gap:7px;font-size:12px}"+
 ".food-v2-chart-track{height:12px;border-radius:6px;background:var(--line);overflow:hidden}"+
 ".food-v2-chart-fill{height:100%;background:var(--brand);border-radius:6px}"+
 ".food-v2-weight-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--line)}"+
 ".food-v2-weight-row button{max-width:86px;min-height:44px}";
 document.head.append(style);window.foodV2Refresh();
});
})();