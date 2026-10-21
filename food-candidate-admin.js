/* Food v2: admin-only candidate nutrition completion with official evidence URL. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);let page=0,allowed=false;
const valid=()=>currentUser&&S.stateOwnerId===currentUser.id&&sbClient;
async function api(action,payload={}){
 if(!valid())throw new Error("請先登入");
 const {data:{session}}=await sbClient.auth.getSession();
 if(!session)throw new Error("登入失效");
 const r=await fetch(SB_URL+"/functions/v1/food-admin",{
  method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},
  body:JSON.stringify({action,...payload})
 });
 const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"服務暫時無法使用");
 return data;
}
const say=text=>{if($("foodCandidateMsg"))$("foodCandidateMsg").textContent=text};
function row(item){
 const card=document.createElement("div");card.className="food-candidate-row";
 const title=document.createElement("h3");title.textContent=item.brand+"｜"+item.name;card.append(title);
 const base=document.createElement("p");base.className="mute";
 base.textContent="原基準："+item.basis+"｜來源："+item.source_name;card.append(base);
 const inputs=document.createElement("div");inputs.className="food-candidate-fields";
 const els={};
 for(const [key,label] of [["kcal","熱量 kcal"],["protein","蛋白質 g"],["fat","脂肪 g"],["carbs","碳水 g"]]){
  const l=document.createElement("label");l.textContent=label;
  const input=document.createElement("input");input.type="number";input.min="0";input.step="any";
  input.inputMode="decimal";input.value=item[key]==null?"":String(item[key]);
  input.placeholder="待補";l.append(input);inputs.append(l);els[key]=input;
 }
 card.append(inputs);
 const basis=document.createElement("select");
 for(const v of ["每份","每100g","每100ml"]){
  const option=document.createElement("option");option.value=v;option.textContent=v;basis.append(option);
 }
 basis.value=["每份","每100g","每100ml"].includes(item.basis)?item.basis:"每份";
 const basisLabel=document.createElement("label");
 basisLabel.textContent="營養標示計算基準";basisLabel.append(basis);card.append(basisLabel);
 const url=document.createElement("input");url.type="url";url.placeholder="品牌官方營養標示 https:// 來源網址";
 url.value=item.source_quality==="official_nutrition"?item.source_url:"";
 const proof=document.createElement("label");proof.textContent="可供核對的官方營養來源網址";
 proof.append(url);card.append(proof);
 const notes=document.createElement("textarea");notes.rows=3;
 notes.placeholder="必填：核對來源、包裝版本、每份重量及確認日期";
 const notesLabel=document.createElement("label");notesLabel.textContent="資料審核備註";
 notesLabel.append(notes);card.append(notesLabel);
 const agreement=document.createElement("label");agreement.className="check-inline";
 const confirm=document.createElement("input");confirm.type="checkbox";
 const msg=document.createElement("span");msg.textContent="我已確認這四項數值來自同一版本的品牌官方營養標示";
 agreement.append(confirm,msg);card.append(agreement);
 const button=document.createElement("button");button.type="button";
 button.textContent="完成核對並開放食品記錄";card.append(button);
 const status=document.createElement("p");status.className="mute";status.setAttribute("role","status");card.append(status);
 button.addEventListener("click",async()=>{
  const nutrition={};
  for(const key of ["kcal","protein","fat","carbs"]){
   if(els[key].value.trim()==="" || !Number.isFinite(Number(els[key].value))||
    Number(els[key].value)<0){status.textContent="請補齊四項有效營養數字";return;}
   nutrition[key]=Number(els[key].value);
  }
  if(!confirm.checked||!/^https:\/\//i.test(url.value)||notes.value.trim().length<10){
   status.textContent="必須核對官方營養網址、備註十個字以上，並勾選確認";return;
  }
  if(!window.confirm("確定要將此商品設為官方完整營養資訊？"))return;
  button.disabled=true;status.textContent="正在審核…";
  try{
   await api("complete_candidate",{id:item.id,nutrition,basis:basis.value,
     evidence_url:url.value.trim(),notes:notes.value.trim(),confirmed:confirm.checked});
   await refresh();
  }catch(e){status.textContent="審核失敗："+e.message;button.disabled=false;}
 });
 return card;
}
async function refresh(){
 if(!allowed||!valid())return;say("載入候選食品中…");
 try{
  const data=await api("candidate_gaps",{page});
  const list=$("foodCandidateList");list.replaceChildren();
  for(const item of data.items||[])list.append(row(item));
  if(!data.items?.length)list.textContent="沒有待補齊的候選食品";
  say("待補 "+data.total+" 筆｜第 "+(page+1)+" 頁");
  $("foodCandidatePrev").disabled=page===0;
  $("foodCandidateNext").disabled=(page+1)*30>=data.total;
 }catch(e){say("候選食品載入失敗："+e.message);}
}
function init(){
 const account=[...document.querySelectorAll("#p-me .settings-subpage")]
  .find(x=>x.querySelector("h2")?.textContent==="帳號設定");
 if(!account)return;
 const panel=document.createElement("div");panel.id="foodCandidatePanel";
 panel.className="card hide";
 panel.innerHTML='<h2>候選食品營養補齊</h2>'+
  '<p class="mute">僅具管理員權限，且有完整品牌官方營養表證據，才能將候選食品從待補轉為可記錄。不得猜測蛋白質／脂肪／碳水。</p>'+
  '<p id="foodCandidateMsg" class="mute" role="status"></p>'+
  '<div id="foodCandidateList"></div>'+
  '<div class="food-candidate-actions"><button id="foodCandidatePrev" type="button" class="ghost">上一頁</button>'+
  '<button id="foodCandidateNext" type="button" class="ghost">下一頁</button></div>';
 account.append(panel);
 $("foodCandidatePrev").addEventListener("click",()=>{page=Math.max(0,page-1);refresh()});
 $("foodCandidateNext").addEventListener("click",()=>{page++;refresh()});
 const style=document.createElement("style");
 style.textContent=".food-candidate-row{border-bottom:1px solid var(--line);padding:14px 0;overflow-wrap:anywhere}"+
 ".food-candidate-row h3{font-size:16px;line-height:1.5}"+
 ".food-candidate-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}"+
 ".food-candidate-row input,.food-candidate-row select{min-height:46px}"+
 ".food-candidate-row textarea{width:100%;min-height:88px;padding:10px}"+
 ".food-candidate-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}"+
 ".food-candidate-actions button{min-height:46px}";
 document.head.append(style);
 window.foodCandidateAdminCheck=async()=>{
  if(!valid()){panel.classList.add("hide");return;}
  try{const data=await api("status");allowed=!!data.is_admin;
   panel.classList.toggle("hide",!allowed);if(allowed)await refresh();
  }catch(_){allowed=false;panel.classList.add("hide");}
 };
 window.foodCandidateAdminCheck();
}
document.addEventListener("DOMContentLoaded",init);
})();