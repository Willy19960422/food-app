"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process");
const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"index.html"),"utf8");
const sheet=fs.readFileSync(path.join(root,"food-sheet.js"),"utf8");
const css=source.match(/<style>([\s\S]*?)<\/style>/)?.[1];assert.ok(css);
const chrome=[process.env.CHROME_PATH,"google-chrome","google-chrome-stable","chromium","chromium-browser"]
 .filter(Boolean).find(bin=>cp.spawnSync("which",[bin]).status===0);
assert.ok(chrome,"Chromium is needed for mobile-scale geometry checks");
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"food-v2-browser-"));
const fixture=path.join(temp,"sheet.html");
const html=['<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
'<style>',css,'</style></head><body><main>',
'<section id="p-list"><div id="boxSelectFood" class="card">',
'<div id="selectedFoodInfo" class="hide"><h2 id="selFoodName">7-ELEVEN 超長名稱鹽烤嫩雞胸低脂高蛋白營養雙拼餐盒測試</h2>',
'<p>每 100 ml／每 100 g 使用量</p><input type="number" value="250"><button id="cfAdd">確認加入這餐</button>',
'</div></div></section></main><nav id="bottomNav"><button>今日</button><button>紀錄</button><button>設定</button></nav>',
'<div id="testResults"></div><script>',sheet,'</script>',
'<script>document.addEventListener("DOMContentLoaded",()=>{',
'const factor=Number(new URLSearchParams(location.search).get("scale")||100);',
'document.documentElement.style.zoom=factor/100;',
'const selected=document.getElementById("selectedFoodInfo");selected.classList.remove("hide");',
'window.foodV2OpenSheet();',
'const r=selected.getBoundingClientRect(),nav=document.getElementById("bottomNav").getBoundingClientRect();',
'const overlay=document.getElementById("foodV2SheetBackdrop");',
'const result={scale:factor,display:getComputedStyle(selected).display,',
'overlayVisible:!overlay.classList.contains("hide"),',
'width:r.width,right:r.right,left:r.left,top:r.top,bottom:r.bottom,navTop:nav.top,',
'viewportWidth:document.documentElement.clientWidth,viewportHeight:document.documentElement.clientHeight,',
'overflowX:document.documentElement.scrollWidth-document.documentElement.clientWidth,',
'selectionButton:!!selected.querySelector(".food-v2-close")};',
'selected.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));',
'result.escCloses=overlay.classList.contains("hide");',
'document.getElementById("testResults").setAttribute("data-result",btoa(JSON.stringify(result)));',
'});</script></body></html>'].join("");
fs.writeFileSync(fixture,html);
try{
 for(const p of [90,100,110,120]){
  const res=cp.spawnSync(chrome,["--headless=new","--no-sandbox","--disable-dev-shm-usage",
   "--disable-gpu","--window-size=440,950","--virtual-time-budget=600","--dump-dom",
   "file://"+fixture+"?scale="+p],{encoding:"utf8",timeout:30000,maxBuffer:8*1024*1024});
  if(res.error)throw res.error;
  assert.equal(res.status,0,res.stderr.slice(-1200));
  const match=res.stdout.match(/id="testResults" data-result="([^"]+)"/);
  assert.ok(match,"missing DOM report at "+p+"%");
  const value=JSON.parse(Buffer.from(match[1],"base64").toString("utf8"));
  assert.equal(value.display,"block");
  assert.equal(value.overlayVisible,true);
  assert.equal(value.selectionButton,true);
  assert.equal(value.escCloses,true);
  assert.ok(value.left>=-3&&value.right<=value.viewportWidth+3,
   "sheet horizontally overflows at "+p+"%: "+JSON.stringify(value));
  assert.ok(value.top>=0&&value.bottom<=value.navTop+3,
   "sheet overlaps the bottom navigation at "+p+"%: "+JSON.stringify(value));
  assert.ok(value.overflowX<=3,"document horizontally overflows "+p+"%");
  console.log("PASS mobile food bottom sheet @ "+p+"% no overlay collision");
 }
}finally{fs.rmSync(temp,{recursive:true,force:true});}
