(()=>{
  const page=document.getElementById("p-me");
  if(!page)return;
  const heading=page.querySelector("h1");
  const cards=[...page.querySelectorAll(":scope > .card")].filter(card=>card.id!=="foodPushEntryCard");
  const notificationEntry=document.getElementById("foodPushEntryCard");
  const menu=document.createElement("div");
  menu.id="settingsMenu";
  menu.className="settings-menu";
  heading.after(menu);
  const style=document.createElement("style");
  style.textContent=`
  .settings-menu{display:grid;gap:10px;margin-bottom:16px}
  .settings-menu-item{display:flex;align-items:center;justify-content:space-between;width:100%;margin:0;padding:17px 18px;text-align:left;border:1px solid var(--line);border-radius:15px;background:var(--card,#fff);color:var(--ink);font-weight:700}
  .settings-menu-item small{display:block;font-size:.83em;font-weight:400;color:var(--muted,#74817d);margin-top:4px}
  .settings-subpage.hide,.settings-menu.hide{display:none!important}
  .settings-back{margin:0 0 16px;width:auto}
  #settingsMenu #foodPushEntryCard{margin:0;padding:0;border:0;background:transparent;box-shadow:none}
  #settingsMenu #foodPushOpen{width:100%;margin:0;padding:17px 18px;border:1px solid var(--line);border-radius:15px;background:var(--card,#fff);color:var(--ink);text-align:left;font-weight:700}
  #settingsMenu #foodPushOpen small{display:block;font-size:.83em;font-weight:400;color:var(--muted,#74817d);margin-top:4px}
  #settingsMenu #foodPushOpen span[aria-hidden]{display:none}
  `;
  document.head.append(style);
  const groups=[
    {title:"身體資料與目標",detail:"身高、體重、活動量及目標類型",items:cards.slice(0,2)},
    {title:"每日營養目標",detail:"自動計算與自訂營養素",items:cards.slice(2,3)},
    {title:"外觀設定",detail:"主題與介面大小（90%～120%）",items:cards.slice(3,4)},
    {title:"帳號設定",detail:"登入密碼及登出",items:cards.slice(-1)}
  ];
  let active=null;
  function close(){
    if(active)active.classList.add("hide");
    active=null;menu.classList.remove("hide");heading.classList.remove("hide");
    window.scrollTo(0,0);
  }
  for(const group of groups){
    const screen=document.createElement("section");
    screen.className="settings-subpage hide";
    const back=document.createElement("button");
    back.type="button";back.className="ghost settings-back";back.textContent="‹ 返回設定";
    back.addEventListener("click",close);
    const h=document.createElement("h2");h.textContent=group.title;
    screen.append(back,h);
    for(const card of group.items)screen.append(card);
    page.append(screen);
    const btn=document.createElement("button");btn.type="button";btn.className="settings-menu-item";
    const label=document.createElement("span");
    const strong=document.createElement("span");strong.textContent=group.title;
    const small=document.createElement("small");small.textContent=group.detail;
    label.append(strong,small);btn.append(label);
    btn.addEventListener("click",()=>{
      close();menu.classList.add("hide");heading.classList.add("hide");
      screen.classList.remove("hide");active=screen;window.scrollTo(0,0);
    });
    menu.append(btn);
  }
  if(notificationEntry)menu.append(notificationEntry);
  document.querySelectorAll("#bottomNav button").forEach(b=>b.addEventListener("click",close));
})();