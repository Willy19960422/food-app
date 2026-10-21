/* Accessible food-selection bottom sheet: no long-list scrolling after selecting. */
(()=>{
"use strict";
let previousFocus=null;
const sheet=()=>document.getElementById("selectedFoodInfo");
const backdrop=()=>document.getElementById("foodV2SheetBackdrop");
function close(){
 const node=sheet();
 node?.classList.remove("food-v2-open");
 backdrop()?.classList.add("hide");
 document.body.classList.remove("food-v2-sheet-active");
 if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 previousFocus=null;
}
function open(){
 const node=sheet();
 if(!node||node.classList.contains("hide"))return;
 previousFocus=document.activeElement;
 node.classList.add("food-v2-open");node.setAttribute("role","dialog");
 node.setAttribute("aria-modal","true");node.setAttribute("aria-label","選取食品與食用份量");
 backdrop()?.classList.remove("hide");
 document.body.classList.add("food-v2-sheet-active");
 node.querySelector(".food-v2-close")?.focus({preventScroll:true});
}
window.foodV2OpenSheet=open;window.foodV2CloseSheet=close;
document.addEventListener("keydown",event=>{
 if(event.key==="Escape"&&sheet()?.classList.contains("food-v2-open")){
  event.preventDefault();close();
 }
});
document.addEventListener("DOMContentLoaded",()=>{
 const node=sheet();if(!node)return;
 const overlay=document.createElement("div");
 overlay.id="foodV2SheetBackdrop";overlay.className="hide";
 overlay.setAttribute("aria-hidden","true");
 overlay.addEventListener("click",close);
 document.body.append(overlay);
 const exit=document.createElement("button");exit.type="button";
 exit.className="ghost food-v2-close";exit.textContent="關閉";
 exit.addEventListener("click",close);
 node.prepend(exit);
 const style=document.createElement("style");
 style.textContent="#foodV2SheetBackdrop{position:fixed;inset:0;background:rgba(0,0,0,.50);"+
 "z-index:95;touch-action:manipulation}"+
 "#selectedFoodInfo.food-v2-open{display:block!important;position:fixed;"+
 "left:50%;transform:translateX(-50%);bottom:calc(76px + env(safe-area-inset-bottom));"+
 "width:min(calc(100vw - 24px),480px);max-height:min(65dvh,650px);overflow:auto;"+
 "overscroll-behavior:contain;z-index:96;padding:16px!important;margin:0!important;"+
 "border:2px solid var(--brand);border-radius:17px;background:var(--card);"+
 "box-shadow:0 8px 36px rgba(0,0,0,.26)}"+
 "#selectedFoodInfo.food-v2-open button{min-height:46px}"+
 ".food-v2-close{width:auto!important;display:block;margin:0 0 10px auto!important}";
 document.head.append(style);
});
})();