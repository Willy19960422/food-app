// 食養紀錄 Web Push settings. Does not include private signing keys or service credentials.
(() => {
  "use strict";
  const el = id => document.getElementById(id);
  const prefix = "foodPush";
  const fields = [
    ["Breakfast","breakfast_enabled","breakfast_time"],
    ["Lunch","lunch_enabled","lunch_time"],
    ["Dinner","dinner_enabled","dinner_time"],
    ["Summary","summary_enabled","summary_time"]
  ];
  let cachedEnabled = false;
  let loadedFor = null;
  let requestSerial = 0;
  let busy = false;
  const signedIn = () => typeof currentUser !== "undefined" && !!currentUser &&
    typeof S !== "undefined" && S.stateOwnerId === currentUser.id && !!sbClient;
  const owned = (uid,sid) => signedIn() && currentUser.id === uid && loginSessionId === sid;
  const status = message => { if (el(prefix+"Status")) el(prefix+"Status").textContent=message; };
  const installed = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
  const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const validTime = val => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(val);
  const displayTime = x => String(x||"").slice(0,5);
  function setBusy(value){
    busy=value;
    for(const id of ["Enable","Disable","Save","Test"]){
      const button=el(prefix+id);
      if(button)button.disabled=value;
    }
  }
  function readForm(){
    const prefs={timezone:"Asia/Taipei"};
    for(const [n,active,time] of fields){
      prefs[active]=el(prefix+n).checked;
      prefs[time]=displayTime(el(prefix+n+"Time").value);
      if(!validTime(prefs[time]))throw Error("請檢查四項提醒時間，格式應為 HH:MM。");
    }
    return prefs;
  }
  function refreshVisibleTimes(){
    for(const [n] of fields){
      const label=el(prefix+n+"TimeDisplay");
      if(label)label.textContent=displayTime(el(prefix+n+"Time").value)||"--:--";
    }
  }
  function applyForm(prefs){
    for(const [n,active,time] of fields){
      if(prefs[active]!==undefined)el(prefix+n).checked=!!prefs[active];
      if(prefs[time])el(prefix+n+"Time").value=displayTime(prefs[time]);
    }
    refreshVisibleTimes();
  }
  function humanStatus(){
    if(!signedIn())return "請先登入以設定通知。";
    if(isIOS()&&!installed())return "iPhone 請先使用 Safari「分享 → 加入主畫面」，再從主畫面開啟本 APP。";
    if(!supported())return "此瀏覽器不支援 Web Push，請更新系統或使用支援的瀏覽器。";
    if(Notification.permission==="denied")return "通知權限已遭拒絕，請在 iPhone「設定 → 通知」允許食養紀錄的通知。";
    if(cachedEnabled && Notification.permission==="granted")return "已啟用手機推播｜依下列台灣時間提醒（背景推播需網路連線）。";
    return "目前通知未啟用。調整下列時間後，點「啟用手機通知」。";
  }
  async function loadSettings(){
    if(!signedIn()) {status("請先登入以設定通知。");return;}
    const uid=currentUser.id,sid=loginSessionId,seq=++requestSerial;
    status("正在讀取通知設定…");
    try{
      const {data,error}=await sbClient.from("food_push_preferences").select("*").eq("user_id",uid).maybeSingle();
      if(!owned(uid,sid)||seq!==requestSerial)return;
      if(error)throw error;
      cachedEnabled=!!data?.enabled;
      loadedFor=uid;
      if(data)applyForm(data);
      status(humanStatus());
    }catch(err){
      if(owned(uid,sid))status("讀取設定失敗，請檢查網路後重新開啟設定頁。");
      console.warn("Push preferences load failed",err?.message||err);
    }
  }
  async function storeSettings(enabled,uid,sid){
    if(!owned(uid,sid))throw Error("帳號已切換，請重新進入設定頁。");
    const values={user_id:uid,enabled,...readForm(),updated_at:new Date().toISOString()};
    const {error}=await sbClient.from("food_push_preferences").upsert(values,{onConflict:"user_id"});
    if(error)throw error;
    if(!owned(uid,sid))throw Error("帳號已切換，設定狀態待重新確認。");
    cachedEnabled=enabled;
    loadedFor=uid;
    status(humanStatus());
  }
  function b64ToArray(base64){
    const padded=base64.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-base64.length%4)%4);
    return Uint8Array.from(atob(padded),c=>c.charCodeAt(0));
  }
  async function enable(){
    if(busy||!signedIn())return;
    if(isIOS()&&!installed()){status(humanStatus());return;}
    if(!supported()){status(humanStatus());return;}
    if(Notification.permission==="denied"){status(humanStatus());return;}
    // iOS requires requestPermission() to run directly from a deliberate user click.
    const permissionPromise=Notification.permission==="granted"?Promise.resolve("granted"):Notification.requestPermission();
    setBusy(true);
    const uid=currentUser.id,sid=loginSessionId;
    try{
      const permission=await permissionPromise;
      if(permission!=="granted"){status("尚未授權通知，食養紀錄不會主動推送。");return;}
      if(!owned(uid,sid))throw Error("登入狀態已改變。");
      const {data:cfg,error:cfgError}=await sbClient.from("food_push_public_config")
        .select("vapid_public_key").eq("singleton",true).single();
      if(cfgError||!cfg?.vapid_public_key)throw Error("通知服務尚未準備完成。");
      const registration=await navigator.serviceWorker.register("./sw.js");
      const ready=await navigator.serviceWorker.ready;
      if(!owned(uid,sid))throw Error("登入狀態已改變。");
      let subscription=await ready.pushManager.getSubscription();
      if(!subscription){
        subscription=await ready.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:b64ToArray(cfg.vapid_public_key)
        });
      }
      const entry=subscription.toJSON();
      if(!subscription.endpoint||!entry.keys?.p256dh||!entry.keys?.auth)throw Error("無法取得完整裝置推播憑證。");
      const {error:subError}=await sbClient.from("food_push_subscriptions").upsert({
        endpoint:subscription.endpoint,user_id:uid,p256dh:entry.keys.p256dh,
        auth_secret:entry.keys.auth,last_seen_at:new Date().toISOString()
      },{onConflict:"endpoint"});
      if(subError)throw Error("儲存推播裝置失敗："+subError.message);
      await storeSettings(true,uid,sid);
      status("推播已啟用。可以點「傳送測試通知」檢查 iPhone 是否收到。");
    }catch(e){status("啟用失敗："+(e?.message||String(e)));console.warn("Enable food push failed",e);}
    finally{setBusy(false);}
  }
  async function disable(){
    if(busy||!signedIn())return;
    setBusy(true);
    const uid=currentUser.id,sid=loginSessionId;
    try{
      await storeSettings(false,uid,sid);
      if("serviceWorker" in navigator){
        const reg=await navigator.serviceWorker.getRegistration("./sw.js");
        const sub=reg?await reg.pushManager.getSubscription():null;
        if(sub){
          await sbClient.from("food_push_subscriptions").delete().eq("endpoint",sub.endpoint).eq("user_id",uid);
          await sub.unsubscribe();
        }
      }
      status("已停用用餐提醒與營養摘要。");
    }catch(e){status("停用失敗："+(e?.message||String(e)));}
    finally{setBusy(false);}
  }
  async function save(){
    if(busy||!signedIn())return;
    setBusy(true);
    const uid=currentUser.id,sid=loginSessionId;
    try{
      // Saving schedules never turns on push without explicit opt-in.
      await storeSettings(cachedEnabled,uid,sid);
      status(cachedEnabled?"已儲存提醒時間；通知仍然開啟。":"已儲存提醒時間；通知仍維持關閉。");
    }catch(e){status("儲存失敗："+(e?.message||String(e)));}
    finally{setBusy(false);}
  }
  async function sendTest(){
    if(busy||!signedIn())return;
    if(!cachedEnabled||Notification.permission!=="granted"){status("請先啟用並允許手機通知。");return;}
    setBusy(true);
    const uid=currentUser.id,sid=loginSessionId;
    status("正在傳送測試通知…");
    try{
      const {data,error}=await sbClient.functions.invoke("food-push",{body:{action:"test"}});
      if(!owned(uid,sid))return;
      if(error||!data?.ok)throw Error(data?.error||"未成功發送；請等待一分鐘再試。");
      status("測試通知已送往 "+data.delivered+" 台裝置。若沒出現，請檢查 iPhone 通知及專注模式設定。");
    }catch(e){if(owned(uid,sid))status("測試通知失敗："+(e?.message||String(e)));}
    finally{setBusy(false);}
  }
  async function unsubscribeOnSignout(){
    // Prevent a signed-out iPhone from continuing to receive notifications.
    try{
      const reg=await navigator.serviceWorker?.getRegistration("./sw.js");
      const sub=reg?await reg.pushManager.getSubscription():null;
      if(sub)await sub.unsubscribe();
    }catch(e){console.warn("Could not unsubscribe signed-out device",e);}
    loadedFor=null;cachedEnabled=false;
  }
  for(const [id,fn] of [["Enable",enable],["Disable",disable],["Save",save],["Test",sendTest]]){
    const button=el(prefix+id);
    if(button)button.addEventListener("click",fn);
  }
  for(const [n] of fields){
    const picker=el(prefix+n+"Time");
    if(picker){
      picker.addEventListener("input",refreshVisibleTimes);
      picker.addEventListener("change",refreshVisibleTimes);
    }
  }
  refreshVisibleTimes();
  // showView('me') invokes renderMe(). Preserve original rendering and refresh
  // preferences on each visit, including after a sign-in or account change.
  const originalRenderMe=renderMe;
  renderMe=function(...args){
    const result=originalRenderMe.apply(this,args);
    void loadSettings();
    return result;
  };
  document.addEventListener("DOMContentLoaded",()=>{
    if(sbClient?.auth){
      sbClient.auth.onAuthStateChange((event)=>{
        if(event==="SIGNED_OUT")void unsubscribeOnSignout();
      });
    }
  });
})();
