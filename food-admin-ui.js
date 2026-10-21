/* Food v2 admin-only moderation console; every action checked again server-side. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
let ready=false,page=0,state="pending",listBox=null,total=0;
const active=()=>currentUser&&S.stateOwnerId===currentUser.id&&sbClient;
async function call(action,payload={}){
 if(!active())throw new Error("請先登入");
 const {data:{session}}=await sbClient.auth.getSession();
 if(!session)throw new Error("登入已失效");
 const resp=await fetch(SB_URL+"/functions/v1/food-admin",{
  method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},
  body:JSON.stringify({action,...payload})
 });
 const result=await resp.json().catch(()=>({}));
 if(!resp.ok)throw new Error(result.error||"審核服務無法連線");
 return result;
}
const status=text=>{const node=$("foodAdminStatus");if(node)node.textContent=text;};
const field=(parent,label,value)=>{
 const item=document.createElement("p");item.className="mute";
 item.textContent=label+"："+(value==null?"待補":String(value));parent.append(item);
};
function renderItem(row){
 const card=document.createElement("section");card.className="food-admin-entry";
 const header=document.createElement("h3");header.textContent=(row.brand||"未填品牌")+"｜"+row.name;
 card.append(header);
 field(card,"條碼",row.barcode);
 field(card,"營養基準",row.basis_type==="100g"?"每100g":row.basis_type==="100ml"?"每100ml":"每份");
 field(card,"熱量 kcal",row.kcal);field(card,"蛋白質 g",row.protein);
 field(card,"脂肪 g",row.fat);field(card,"碳水 g",row.carbs);
 field(card,"來源類型",row.source_type);field(card,"提交時間",row.created_at?.slice(0,10));
 let mergeControl=null;
 if(row.conflicting_food){
  field(card,"條碼衝突","共用庫已有「"+row.conflicting_food.name+"」，請核對是否同商品版本");
  const mergeLabel=document.createElement("label");mergeLabel.className="check-inline";
  mergeControl=document.createElement("input");mergeControl.type="checkbox";
  const mergeText=document.createElement("span");
  mergeText.textContent="已核對現有商品，明確同意用此份營養標示更新該條碼資料";
  mergeLabel.append(mergeControl,mergeText);card.append(mergeLabel);
 }
 if(typeof row.source_url==="string" && /^https:\/\//i.test(row.source_url)){
  const link=document.createElement("a");link.href=row.source_url;link.target="_blank";
  link.rel="noopener noreferrer";link.textContent="查看提交來源";card.append(link);
 }
 if(row.photo_url && /^https:\/\//i.test(row.photo_url)){
  const link=document.createElement("a");link.href=row.photo_url;link.target="_blank";
  link.rel="noopener noreferrer";link.textContent="查看私人營養標示照片（短效連結）";
  link.style.display="block";card.append(link);
 }
 if(state!=="pending"){
  field(card,"審核備註",row.review_notes||"");return card;
 }
 const label=document.createElement("label");label.textContent="審核備註與來源確認";
 const notes=document.createElement("textarea");notes.rows=3;
 notes.placeholder="註明核對的包裝照片／官方營養表版本、日期及判定依據";
 label.append(notes);card.append(label);
 const checkLabel=document.createElement("label");checkLabel.className="check-inline";
 const confirm=document.createElement("input");confirm.type="checkbox";
 const checkText=document.createElement("span");
 checkText.textContent="我已逐項核對正式商品名稱、條碼與完整營養標示";
 checkLabel.append(confirm,checkText);card.append(checkLabel);
 const actions=document.createElement("div");actions.className="food-admin-actions";
 const approve=document.createElement("button");approve.type="button";approve.textContent="核准上架";
 approve.disabled=[row.kcal,row.protein,row.fat,row.carbs].some(x=>x==null);
 const reject=document.createElement("button");reject.type="button";reject.className="ghost";
 reject.textContent="退回更正";
 const detail=document.createElement("p");detail.className="mute";detail.setAttribute("role","status");
 const submit=async next=>{
  if(notes.value.trim().length<5){detail.textContent="請先填寫至少五個字的審核原因";return;}
  if(next==="approved"&&!confirm.checked){detail.textContent="請勾選已核對標示";return;}
  if(next==="approved"&&mergeControl&&!mergeControl.checked){
   detail.textContent="同條碼資料已有紀錄，請核對並勾選同意合併";return;
  }
  if(!window.confirm(next==="approved"?"確定將此商品公布到共用庫？":"確定退回此商品？"))return;
  approve.disabled=true;reject.disabled=true;detail.textContent="處理中…";
  try{
   await call("review",{id:row.id,state:next,notes:notes.value.trim(),confirmed:confirm.checked,merge_existing:!!mergeControl?.checked});
   detail.textContent="已完成"+(next==="approved"?"核准":"退回");
   await refresh();
  }catch(e){detail.textContent="處理失敗："+e.message;}
  finally{approve.disabled=!!row.conflicting_food || [row.kcal,row.protein,row.fat,row.carbs].some(x=>x==null);
    reject.disabled=false;}
 };
 approve.addEventListener("click",()=>submit("approved"));
 reject.addEventListener("click",()=>submit("rejected"));
 actions.append(approve,reject);card.append(actions,detail);
 return card;
}
async function refresh(){
 if(!ready||!active()||!listBox)return;
 status("讀取審核清單中…");
 try{
  const result=await call("list",{page,state});
  total=result.total;listBox.replaceChildren();
  for(const row of result.items||[])listBox.append(renderItem(row));
  if(!result.items?.length){listBox.textContent="目前沒有符合狀態的商品。";}
  status("共 "+total+" 筆｜第 "+(page+1)+" 頁（每頁 30 筆）");
  $("foodAdminPrev").disabled=page===0;
  $("foodAdminNext").disabled=(page+1)*30>=total;
 }catch(error){status("載入失敗："+error.message);}
}
function init(){
 const account=[...document.querySelectorAll("#p-me .settings-subpage")]
  .find(s=>s.querySelector("h2")?.textContent==="帳號設定");
 if(!account)return;
 const card=document.createElement("div");card.className="card";card.id="foodAdminPanel";
 card.innerHTML='<h2>食品資料審核管理</h2><p class="mute">僅管理員可查看提交、包裝照片及執行審核。未審核商品不會自動進入共用庫。</p>'+
  '<label>審核狀態<select id="foodAdminFilter"><option value="pending">待審核</option>'+
  '<option value="approved">已核准</option><option value="rejected">已退回</option></select></label>'+
  '<p class="mute" id="foodAdminStatus" role="status"></p>'+
  '<div id="foodAdminList"></div>'+
  '<div class="food-admin-actions"><button type="button" class="ghost" id="foodAdminPrev">上一頁</button>'+
  '<button type="button" class="ghost" id="foodAdminNext">下一頁</button></div>';
 card.classList.add("hide");account.append(card);
 listBox=$("foodAdminList");
 $("foodAdminFilter").addEventListener("change",()=>{state=$("foodAdminFilter").value;page=0;refresh();});
 $("foodAdminPrev").addEventListener("click",()=>{page=Math.max(0,page-1);refresh();});
 $("foodAdminNext").addEventListener("click",()=>{page++;refresh();});
 const style=document.createElement("style");
 style.textContent=".food-admin-entry{padding:14px 0;border-bottom:1px solid var(--line);overflow-wrap:anywhere}"+
 ".food-admin-entry h3{font-size:16px;line-height:1.5;margin:0 0 8px}"+
 ".food-admin-entry p{margin:4px 0;font-size:13px}"+
 ".food-admin-entry textarea{min-height:84px;width:100%;padding:10px;margin:7px 0}"+
 ".food-admin-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:10px 0}"+
 ".food-admin-actions button{min-height:48px}";
 document.head.append(style);
 let lastUser=null;
 async function checkAdmin(){
  if(!active()){card.classList.add("hide");return;}
  if(lastUser===currentUser.id&&ready)return;
  lastUser=currentUser.id;
  try{
   const response=await call("status");
   ready=!!response.is_admin;card.classList.toggle("hide",!ready);
   if(ready)await refresh();
  }catch(e){ready=false;card.classList.add("hide");}
 }
 window.foodAdminCheck=checkAdmin;checkAdmin();
}
document.addEventListener("DOMContentLoaded",init);
})();