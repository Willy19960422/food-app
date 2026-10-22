"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const base=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(base,p),"utf8");
const html=read("index.html"),database=read("db/v2_1_to_v2_3_safe_additive.sql");
let passed=0;
function check(name,fn){fn();passed++;console.log("PASS "+name);}
const scripts=["food-cloud.js","food-trends.js","food-account.js","food-admin-ui.js","food-candidate-admin.js","food-sheet.js",
 "barcode-v2.js","settings-menu.js","push-settings.js","ui-scale.js","food-taxonomy.js","sw.js"];
check("All HTML inline scripts and all new modules parse",()=>{
 const matches=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 for(let i=0;i<matches.length;i++)new vm.Script(matches[i][1],{filename:"inline-"+i});
 for(const file of scripts)new vm.Script(read(file),{filename:file});
});
check("The app loads exactly one of every local v2 module",()=>{
 for(const file of scripts.filter(x=>x!=="sw.js"&&x!=="food-taxonomy.js")){
  assert.equal((html.match(new RegExp('src="\\./'+file.replaceAll(".","\\.")+'\\?v=',"g"))||[]).length,1,file);
 }
 assert.ok(!html.includes('src="./food-v2.js'));
});
check("Legacy 90-day cloud sync has been removed; all dates use safe pagination",()=>{
 assert.ok(!html.includes("d90Ago"));
 assert.ok(!html.includes(".gte('date'"));
 assert.ok(html.includes('for(let offset=0;offset<100000;offset+=500)'));
 assert.ok(html.includes("if (!syncFetchError)"));
 assert.ok(html.includes("S.log = serverLogs"));
 assert.ok(html.includes("window.foodV2ReconcileCloud"));
});
check("Quick kcal does not invent protein, fat, carbs",()=>{
 assert.ok(html.includes('k: kcalVal, p: null, f: null, c: null'));
 assert.ok(html.includes('row.protein==null?null:Number(row.protein)'));
 assert.ok(html.includes('unknownP:0'));
 assert.ok(database.includes("ALTER COLUMN protein DROP NOT NULL"));
 assert.ok(database.includes("ALTER COLUMN carbs DROP DEFAULT"));
});
check("Nutrition sum preserves true zero but counts unknowns",()=>{
 const begin=html.indexOf("function sumList("),end=html.indexOf("\nfunction bar(",begin);
 assert.ok(begin>0&&end>begin);
 const ctx=vm.createContext({Number,Object,Array});
 vm.runInContext(html.slice(begin,end),ctx);
 const total=vm.runInContext('sumList([{k:100,p:null,f:0,c:null,n:1},{k:150,p:12,f:6,c:14,n:2}])',ctx);
 assert.equal(total.k,400);
 assert.equal(total.p,24);assert.equal(total.f,12);assert.equal(total.c,28);
 assert.equal(total.unknownP,1);assert.equal(total.unknownF,0);assert.equal(total.unknownC,1);
});
check("History and totals label unknown rather than claiming zero intake",()=>{
 assert.ok(html.includes('e.p==null?"未知"'));
 assert.ok(html.includes("T.unknownP||T.unknownF||T.unknownC"));
 assert.ok(read("food-trends.js").includes("無紀錄不代表攝取 0"));
});
check("Food selection supports 100ml and closes the bottom sheet",()=>{
 assert.ok(html.includes('item.basisType === "100g" || item.basisType === "100ml"'));
 assert.ok(html.includes('chosenFood.basisType==="100ml"'));
 assert.ok(html.includes('window.foodV2OpenSheet?.()'));
 assert.ok(html.includes('window.foodV2CloseSheet?.()'));
 const code=read("food-sheet.js");
 assert.ok(code.includes("aria-modal"));
 assert.ok(code.includes('event.key==="Escape"'));
});
check("Settings is routed by card identity, not order",()=>{
 const settings=read("settings-menu.js");
 assert.ok(!settings.includes("cards.slice("));
 assert.ok(settings.includes('page.querySelector("#cardTargets")'));
 assert.ok(settings.includes('byTitle("外觀主題")'));
});
check("Cloud favorites can be deleted across devices and snapshots are owner-only",()=>{
 const c=read("food-cloud.js");
 assert.ok(c.includes('remoteTime>localTime'));
 assert.ok(c.includes("initialMigration"));
 assert.ok(c.includes('eq("user_id",uid)'));
 assert.ok(database.includes("food_user_state_own_select"));
 assert.ok(database.includes("food_weight_logs_own_read"));
});
check("Weight trends use actual recordings and are private",()=>{
 assert.ok(read("food-trends.js").includes('from("food_weight_logs")'));
 assert.ok(read("food-trends.js").includes("S.log"));
 assert.ok(database.includes("ENABLE ROW LEVEL SECURITY"));
});
check("Account export escapes spreadsheets and deletion requires double confirmation",()=>{
 const text=read("food-account.js");
 assert.ok(text.includes("spreadsheet")||text.includes("^[=+"));
 assert.ok(text.includes('value.trim()!=="刪除帳號"'));
 assert.ok(text.includes('confirm("永久刪除帳號'));
 const edge=read("supabase/functions/food-account-delete/index.ts");
 assert.ok(edge.includes('body?.user_id!==user.id'));
 assert.ok(edge.includes('user.is_anonymous'));
 assert.ok(edge.includes("admin.auth.admin.deleteUser(uid,false)"));
});
check("Admin API enforces server-side role, consent and duplicate barcode checks",()=>{
 const edge=read("supabase/functions/food-admin/index.ts");
 assert.ok(edge.includes('from("food_app_admins")'));
 assert.ok(edge.includes('if(!role)return reply({error:"ADMIN_REQUIRED"},403)'));
 assert.ok(edge.includes('body.confirmed!==true'));
 assert.ok(edge.includes("BARCODE_ALREADY_EXISTS_MERGE_MANUALLY"));
 assert.ok(edge.includes('action==="link_photo"'));
 const ui=read("food-admin-ui.js");
 assert.ok(ui.includes('call("status")'));
 assert.ok(ui.includes('photo_url'));
});
check("Nutrition photos are private with correct upload and no unsafe upsert",()=>{
 const front=read("barcode-v2.js");
 assert.ok(front.includes('food-product-labels'));
 assert.ok(front.includes('upsert:false'));
 assert.ok(front.includes('action:"link_photo"'));
 assert.ok(database.includes("storage.foldername(name)"));
 assert.ok(database.includes("public=false"));
});
check("Offline cache contains app shell but never Supabase/auth API responses",()=>{
 const sw=read("sw.js");
 assert.ok(sw.includes("APP_SHELL"));
 assert.ok(sw.includes("food-cloud.js"));
 assert.ok(sw.includes("fetch(req)"));
 assert.ok(sw.includes('url.origin!==self.location.origin'));
 assert.ok(sw.includes('addEventListener("push"')||sw.includes("addEventListener('push'"));
});
check("Candidate completion uses administrator and evidence review",()=>{
 const ui=read("food-candidate-admin.js");
 const edge=read("supabase/functions/food-admin/index.ts");
 assert.ok(ui.includes('api("complete_candidate"'));
 assert.ok(ui.includes('api("status")'));
 assert.ok(edge.includes('action==="candidate_gaps"'));
 assert.ok(edge.includes('action==="complete_candidate"'));
 assert.ok(edge.includes("OFFICIAL_EVIDENCE_REQUIRED"));
 assert.ok(edge.includes("source_quality:\"official_nutrition\""));
});
check("Complete JSON export pulls weight history from server, not just on-screen cache",()=>{
 const code=read("food-account.js");
 assert.ok(code.includes("async function allCloudWeights(uid)"));
 assert.ok(code.includes('from("food_weight_logs")'));
 assert.ok(code.includes("const weightRows=await allCloudWeights(uid)"));
 assert.ok(code.includes("weights:weightRows"));
});
check("Removed privileged public database helper permissions",()=>{
 assert.ok(database.includes("REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC,anon,authenticated"));
 assert.ok(database.includes("user_id=(SELECT auth.uid())"));
});
check("Offline service-worker fallback cannot substitute HTML for missing JavaScript",()=>{
 const sw=read("sw.js");
 assert.ok(sw.includes('if(req.mode==="navigate" || req.destination==="document")'));
 assert.ok(sw.includes('new Response("Offline asset not cached",{status:503'));
 assert.ok(sw.includes('const cached=await cache.match(req,{ignoreSearch:true})'));
});
check("Local-only diet entries stay recoverable without undoing cloud deletions",()=>{
 assert.ok(html.includes("S.localRecovery=[...previous.values()]"));
 assert.ok(html.includes("const cloudIds=new Set(data.map(row=>row.id))"));
 assert.ok(html.includes("!pendingIds.has(item.id) && !deletedIds.has(item.id)"));
 assert.ok(read("food-account.js").includes("recovered_local_only_logs:S.localRecovery||[]"));
 assert.ok(html.includes("偵測到本機舊紀錄備份"));
});

console.log("Comprehensive v2 regression tests passed:",passed);
