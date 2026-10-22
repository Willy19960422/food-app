"use strict";
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const cp=require("node:child_process");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const sheet=fs.readFileSync(path.join(root,"food-sheet.js"),"utf8");
const css=html.match(/<style>([\s\S]*?)<\/style>/)?.[1];assert.ok(css);
function extract(a,b){const x=html.indexOf(a),y=html.indexOf(b,x+a.length);assert.ok(x>=0&&y>x);return html.slice(x,y)}
const beginning=html.indexOf('<div id="selectedFoodInfo"');
const ending=html.indexOf('\n  </div>\n\n  <div id="boxManualFood"',beginning);
assert.ok(beginning>0&&ending>beginning);
const markup=html.slice(beginning,ending);
const selection=extract('let selCalcMode = "serv";','let scanCalcMode = "serv";');
const saving=extract('$("cfAdd").onclick = () => {','function validateNutrition(');
// Pull only the delegation function. The full App also initializes the scan
// chip group, which is intentionally absent from this isolated food-sheet fixture.
const bind=extract('function bindChipGroup(groupId, inputId) {','bindChipGroup("servChips", "serv");');
const chrome=[process.env.CHROME_PATH,"google-chrome","chromium","google-chrome-stable","chromium-browser"]
 .filter(Boolean).find(bin=>cp.spawnSync("which",[bin],{encoding:"utf8"}).status===0);
assert.ok(chrome,"Chromium browser required");
const setup=[
 'let chosenFood=null;const logs=[];',
 'const $=id=>document.getElementById(id);',
 'function isPieceFood(item){return !!item&&(item.cat==="餃類點心"||/^1顆/.test(item.basis||"")||item.basis==="每顆")}',
 'function renderFoodList(){}',
 'function showView(v){window._lastView=v}',
 'function addLog(item,n){logs.push({item,n})}',
 'window._testLogs=logs;'
].join("\n");
const checks=[
 '(function(){',
 'const bad=[];function ok(name,result){if(!result)bad.push(name)}',
 'const id=name=>document.getElementById(name);',
 'const dialog=id("selectedFoodInfo");',
 'function chip(name){return [...id("cfChips").querySelectorAll("button")].find(x=>x.textContent===name)}',
 'function click(name){const b=chip(name);if(!b)throw Error("Missing chip "+name);b.click()}',
 'function bounds(){const r=dialog.getBoundingClientRect();return r.width>150&&r.height>150&&r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1}',
 'try{',
 'const rice={name:"7-11明太子御飯糰",basis:"每份",cat:"超商鮮食",k:190,p:6.2,f:3.1,c:34.2};',
 'selectFoodItem(rice);',
 'ok("dialog opens",dialog.classList.contains("food-v2-open"));',
 'ok("only one quantity card",dialog.querySelectorAll(".food-quantity-card").length===1 && !dialog.querySelector(".card"));',
 'ok("no irrelevant package shortcuts",!chip("整包")&&!chip("半包")&&!chip("¼ 包"));',
 'ok("weight mode hidden",id("selQuantityModes").classList.contains("hide"));',
 'ok("serving bounds",bounds());',
 'click("0.5 份");',
 'ok("half serving amount",id("cfN").value==="0.5");',
 'ok("half serving preview",id("selFoodDetail").textContent.includes("95 大卡"));',
 'id("cfN").value="";id("cfN").dispatchEvent(new Event("input"));',
 'ok("empty quantity error",id("selFoodDetail").textContent.includes("請輸入"));',
 'id("cfN").value="0.5";id("cfN").dispatchEvent(new Event("input"));',
 'id("cfAdd").click();',
 'ok("half serving saved",window._testLogs[0]?.n===0.5);',
 'ok("closed sheet hidden",dialog.classList.contains("hide")&&!dialog.classList.contains("food-v2-open"));',
 'const pack={name:"營養標示每包",basis:"每包",k:220,p:10,f:8,c:28};',
 'selectFoodItem(pack);',
 'ok("pack has only one set",chip("半包")&&chip("整包")&&chip("¼ 包")&&dialog.querySelectorAll(".food-quantity-card").length===1);',
 'click("半包");ok("half pack preview",id("selFoodDetail").textContent.includes("110 大卡"));',
 'id("cfAdd").click();ok("half pack log factor",window._testLogs[1]?.n===0.5);',
 'const piece={name:"韭菜水餃",basis:"每顆",cat:"餃類點心",k:36,p:2.7,f:0.4,c:5.1};',
 'selectFoodItem(piece);click("5 顆");',
 'ok("five-piece preview",id("selFoodDetail").textContent.includes("180 大卡"));',
 'ok("piece bounds",bounds());',
 'id("cfAdd").click();ok("five-piece factor",window._testLogs[2]?.n===5);',
 'const weight={name:"豆腐",basis:"每100g",basisType:"100g",k:120,p:12,f:6,c:3};',
 'selectFoodItem(weight);',
 'ok("weight tab visible",!id("selQuantityModes").classList.contains("hide"));',
 'ok("100g uses ratio choices",!!chip("0.5 倍")&&!chip("半包"));',
 'id("selModeWeight").click();id("selWeightInput").value="150";',
 'id("selWeightInput").dispatchEvent(new Event("input"));',
 'ok("150g preview",id("selFoodDetail").textContent.includes("180 大卡"));',
 'id("cfAdd").click();ok("150g saved factor",window._testLogs[3]?.n===1.5);',
 'selectFoodItem(rice);window.foodV2CloseSheet();',
 'ok("dismiss hides sheet",dialog.classList.contains("hide"));',
 'selectFoodItem(rice);ok("reopen resets scroll",dialog.scrollTop===0);',
 'ok("reopen bounds",bounds());',
 'ok("no horizontal overflow",document.documentElement.scrollWidth-document.documentElement.clientWidth<=4);',
 '}catch(err){bad.push("Exception: "+err.stack)}',
 'id("result").setAttribute("data-failed",encodeURIComponent(JSON.stringify(bad)));',
 '})'
].join("\n");
const fixture=[
 '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">',
 '<meta name="viewport" content="width=device-width,initial-scale=1">',
 '<style>',css,'</style></head><body><main><div id="boxSelectFood" class="card">',
 markup,'</div></main><div id="result"></div>',
 '<script>document.documentElement.style.zoom=Number(new URLSearchParams(location.search).get("scale"))/100;</script>',
 '<script>',setup,'</script><script>',selection,'</script>',
 '<script>',bind,'bindChipGroup("cfChips","cfN");</script>',
 '<script>',saving,'</script><script>',sheet,'</script>',
 '<script>document.addEventListener("DOMContentLoaded",',checks,');</script>',
 '</body></html>'
].join("");
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"food-quantity-"));
const file=path.join(temp,"test.html");
fs.writeFileSync(file,fixture);
try{
 for(const scale of [90,100,110,120]){
  const run=cp.spawnSync(chrome,[
   "--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
   "--no-first-run","--window-size=440,900","--dump-dom","file://"+file+"?scale="+scale
  ],{encoding:"utf8",timeout:30000,maxBuffer:18*1024*1024});
  if(run.error)throw run.error;
  assert.equal(run.status,0,run.stderr.slice(-1200));
  const match=run.stdout.match(/id="result" data-failed="([^"]+)"/);
  assert.ok(match,"No integration result at "+scale+"%; "+run.stderr.slice(-600));
  const errors=JSON.parse(decodeURIComponent(match[1].replaceAll("&amp;","&")));
  assert.deepEqual(errors,[],"Scale "+scale+"%: "+errors.join("; "));
  console.log("PASS Chromium "+scale+"%: no duplicate controls, valid portions, true modal dismiss");
 }
}finally{fs.rmSync(temp,{recursive:true,force:true});}
