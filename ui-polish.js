/* Food diary UI polish | visual-only enhancements for shared dialogs.
   Does not change account, nutrition, persistence, scanner or cloud logic. */
(()=>{
  "use strict";
  document.addEventListener("DOMContentLoaded",()=>{
    const modal=document.getElementById("editLogModal");
    const cancel=document.getElementById("editLogCancelBtn");
    const card=modal?.querySelector(".modal-card");
    const heading=card?.querySelector("h2");
    if(!modal||!cancel||!card||!heading)return;

    modal.setAttribute("role","dialog");
    modal.setAttribute("aria-modal","true");
    heading.id=heading.id||"editLogTitle";
    modal.setAttribute("aria-labelledby",heading.id);

    const header=document.createElement("div");
    header.className="ui-dialog-header";
    const x=document.createElement("button");
    x.type="button";
    x.className="ui-dialog-close";
    x.textContent="×";
    x.setAttribute("aria-label","關閉修改紀錄視窗");
    x.title="關閉";
    header.append(heading,x);
    card.prepend(header);
    x.addEventListener("click",()=>cancel.click());

    modal.addEventListener("click",event=>{
      if(event.target===modal)cancel.click();
    });

    // Keep keyboard focus within the dialog when it opens and restore focus
    // on close. The original Save/Cancel handlers remain authoritative.
    let previousFocus=null,wasOpen=false;
    const observer=new MutationObserver(()=>{
      const open=!modal.classList.contains("hide");
      if(open&&!wasOpen){
        previousFocus=document.activeElement;
        card.scrollTop=0;
        x.focus({preventScroll:true});
      }else if(!open&&wasOpen){
        if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
        previousFocus=null;
      }
      wasOpen=open;
    });
    observer.observe(modal,{attributes:true,attributeFilter:["class"]});

    document.addEventListener("keydown",event=>{
      if(modal.classList.contains("hide"))return;
      if(event.key==="Escape"){
        event.preventDefault();
        cancel.click();
        return;
      }
      if(event.key!=="Tab")return;
      const focusable=[...card.querySelectorAll(
        'button:not(:disabled),input:not([type="hidden"]):not(:disabled),'+
        'select:not(:disabled),textarea:not(:disabled),a[href]'
      )].filter(el=>el.getClientRects().length>0);
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&(document.activeElement===first||!card.contains(document.activeElement))){
        event.preventDefault();last.focus();
      }else if(!event.shiftKey&&(document.activeElement===last||!card.contains(document.activeElement))){
        event.preventDefault();first.focus();
      }
    });
  });
})();