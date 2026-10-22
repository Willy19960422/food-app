/* Accessible food-selection bottom sheet: no long-list scrolling after selecting. */
(()=>{
"use strict";
let previousFocus=null;
const sheet=()=>document.getElementById("selectedFoodInfo");
const backdrop=()=>document.getElementById("foodV2SheetBackdrop");
function close(){
 const node=sheet();
 node?.classList.remove("food-v2-open");
 // Leaving the dialog open in page flow after dismissing caused duplicate
 // controls below the food grid. Always hide it on close, including backdrop.
 node?.classList.add("hide");
 backdrop()?.classList.add("hide");
 document.body.classList.remove("food-v2-sheet-active");
 if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 previousFocus=null;
}
function fitToViewport(node){
 const computed=getComputedStyle(document.documentElement);
 const scale=Number(computed.zoom)||1;
 const deviceWidth=document.documentElement.clientWidth||window.innerWidth;
 const maxCss=Math.max(160,deviceWidth/scale-30);
 node.style.width=Math.min(480,maxCss)+"px";
}
function open(){
 const node=sheet();
 if(!node||node.classList.contains("hide"))return;
 previousFocus=document.activeElement;
 fitToViewport(node);
 node.classList.add("food-v2-open");
 // Reopening the same DOM node otherwise preserves an old scroll position:
 // the selected food title and close button can appear cut off above the top.
 node.scrollTop=0;
 node.setAttribute("role","dialog");
 node.setAttribute("aria-modal","true");node.setAttribute("aria-label","選取食品與食用份量");
 backdrop()?.classList.remove("hide");
 document.body.classList.add("food-v2-sheet-active");
 node.querySelector(".food-v2-close")?.focus({preventScroll:true});
}
window.foodV2OpenSheet=open;window.foodV2CloseSheet=close;
window.addEventListener("resize",()=>{if(sheet()?.classList.contains("food-v2-open"))fitToViewport(sheet());});
document.addEventListener("keydown",event=>{
 const node=sheet();
 if(!node?.classList.contains("food-v2-open"))return;
 if(event.key==="Escape"){
  event.preventDefault();close();return;
 }
 if(event.key!=="Tab")return;
 // A modal sheet should not allow keyboard focus to leave its controls.
 const focusable=[...node.querySelectorAll(
  'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]'
 )].filter(el=>el.getClientRects().length>0);
 if(!focusable.length){event.preventDefault();return;}
 const first=focusable[0],last=focusable[focusable.length-1];
 if(event.shiftKey&&(document.activeElement===first||!node.contains(document.activeElement))){
  event.preventDefault();last.focus();
 }else if(!event.shiftKey&&(document.activeElement===last||!node.contains(document.activeElement))){
  event.preventDefault();first.focus();
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
 "width:min(calc(100vw - 24px),480px);max-height:min(73dvh,600px);overflow:auto;"+
 "overscroll-behavior:contain;z-index:96;padding:16px!important;margin:0!important;"+
 "border:2px solid var(--brand);border-radius:17px;background:var(--card);"+
 "box-shadow:0 8px 36px rgba(0,0,0,.26)}"+
 "#selectedFoodInfo.food-v2-open button{min-height:46px}"+
 ".food-v2-close{width:auto!important;display:block;margin:0 0 10px auto!important}";
 document.head.append(style);
});
})();