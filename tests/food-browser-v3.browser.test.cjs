"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const os=require("node:os");
const cp=require("node:child_process");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const css=read("index.html").match(/<style>([\s\S]*?)<\/style>/)[1];
const candidates=[process.env.CHROME_PATH,"google-chrome","chromium","google-chrome-stable","chromium-browser"].filter(Boolean);
const chrome=candidates.find(x=>cp.spawnSync("which",[x],{encoding:"utf8"}).status===0);
assert.ok(chrome,"Chromium required for UI integration test");
const mock=[
 'const known=Array.from({length:27},(_,i)=>({',
 'name:"7-11 雞肉咖哩飯 "+i+" 號超長商品名稱",cat:"超商鮮食",',
 'subCat:"7-11鮮食",basis:"每份",k:560+i,p:23,f:16,c:73,isFav:i<2}));',
 'known.push({name:"全家 三明治",cat:"超商鮮食",subCat:"全家鮮食",basis:"每份",k:250,p:12,f:8,c:34});',
 'const candidates=[{brand:"全家",name:"黑胡椒鐵板雞腿排飯",category:"超商鮮食",',
 'sub_category:"全家鮮食",product_type:"微波餐盒",kcal:650,',
 'protein:null,fat:null,carbs:null,nutrition_status:"awaiting_full_label",',
 'source_quality:"official_menu",source_url:"https://www.family.com.tw",market_status:"unreviewed"}];',
 'const actions=[];',
 'const ctx={known,candidates,candidateLoaded:true,candidateError:false,taxonomy:window.FoodTaxonomy,',
 'subCategories:{"超商鮮食":["全部","7-11鮮食","全家鮮食"]},',
 'logs:{"2026-10-22":[{name:known[0].name,k:known[0].k,p:23,f:16,c:73,n:1}]},',
 'detectBrand:x=>x.subCat==="全家鮮食"?"全家":"7-ELEVEN",candidateName:x=>x.brand+" "+x.name,',
 'isOfficial:x=>x.nutrition_status==="complete"&&x.source_quality==="official_nutrition",',
 'candidateToFood:x=>({name:x.name,k:x.kcal,p:x.protein,f:x.fat,c:x.carbs}),',
 'chooseKnown:x=>actions.push("sheet:"+x.name),chooseCandidate:x=>actions.push("manual:"+x.name),',
 'dumplingKindOf:x=>"水餃",isDuplicate:()=>false};',
 'window.renderFoodList=()=>window.foodBrowserV3?.render(ctx);',
 'window.__fixture={ctx,actions};'
].join("\n");
const checks=[
 '(function(){',
 'const failed=[];function test(name,pass){if(!pass)failed.push(name)}',
 'const tiles=()=>[...document.querySelectorAll("#foodV3Tiles .food-v3-tile")];',
 'function clickTile(name){const b=tiles().find(x=>x.querySelector(".food-v3-tile-name")?.textContent===name);if(!b)throw Error("Missing tile "+name);b.click()}',
 'const stage=()=>document.getElementById("foodV3Heading").textContent;',
 'const cards=()=>[...document.querySelectorAll(".food-v3-product-grid .food-v3-card")];',
 'try{',
 'test("initial home",stage()==="想吃什麼？");',
 'clickTile("超商鮮食");test("brands",stage()==="選擇品牌");',
 'clickTile("7-ELEVEN");test("types",stage()==="選擇食品種類");',
 'clickTile("微波餐盒");test("products",stage()==="挑選食品");',
 'test("12 cards",cards().length===12);',
 'test("page 1/3",document.querySelector(".food-v3-pagination")?.textContent.includes("1 / 3"));',
 'test("two columns",getComputedStyle(document.querySelector(".food-v3-product-grid")).gridTemplateColumns.split(" ").length===2);',
 'const rects=cards().map(x=>x.getBoundingClientRect());',
 'test("no overlap",rects.every((r,i)=>r.width>108 && (i+2>=rects.length || rects[i+2].top>=r.bottom-1)));',
 'cards()[0].querySelector("button").click();',
 'test("selected original sheet",window.__fixture.actions.at(-1)?.startsWith("sheet:"));',
 'document.querySelector(".food-v3-pagination button:last-child").click();',
 'test("page 2/3",document.querySelector(".food-v3-pagination")?.textContent.includes("2 / 3"));',
 'const search=document.getElementById("foodSearch");search.value="黑胡椒";window.renderFoodList();',
 'test("global search",stage()==="搜尋結果"&&cards().length===1);',
 'test("unknown macros visible",cards()[0].textContent.includes("—"));',
 'cards()[0].querySelector("button").click();',
 'test("incomplete goes manual",window.__fixture.actions.at(-1)?.startsWith("manual:"));',
 'document.getElementById("foodV3Back").click();',
 'test("clear search and restore",!search.value && stage()==="挑選食品");',
 'document.getElementById("foodV3Back").click();test("return types",stage()==="選擇食品種類");',
 'document.getElementById("foodV3Back").click();test("return brands",stage()==="選擇品牌");',
 'document.getElementById("foodV3Back").click();test("return home",stage()==="想吃什麼？");',
 'clickTile("最近吃過");test("recent",cards().length===1);',
 'document.getElementById("foodV3Back").click();clickTile("我的常用");test("favorites",cards().length===2);',
 'test("no overflow",document.documentElement.scrollWidth-document.documentElement.clientWidth<=3);',
 '}catch(error){failed.push("Exception: "+error.message)}',
 'document.getElementById("report").setAttribute("data-check",encodeURIComponent(JSON.stringify(failed)));',
 '})();'
].join("\n");
const fixture=[
 '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">',
 '<meta name="viewport" content="width=device-width,initial-scale=1"><style>',css,'</style></head>',
 '<body><main><section id="p-list"><div id="boxSelectFood" class="card">',
 '<input id="foodSearch" placeholder="搜尋食品">',
 '<div id="foodBrowserV3" class="food-browser-v3"><div class="food-v3-toolbar">',
 '<button id="foodV3Back" class="ghost food-v3-back" hidden>返回</button>',
 '<div id="foodV3Trail" class="food-v3-trail"></div></div>',
 '<h2 id="foodV3Heading" class="food-v3-heading">想吃什麼？</h2>',
 '<p id="foodV3Note" class="mute food-v3-note"></p>',
 '<div id="foodV3Tiles" class="food-v3-tiles food-v3-two"></div></div>',
 '<div id="foodContainer" class="food-list"></div></div></section></main><div id="report"></div>',
 '<script>',read("food-taxonomy.js"),'</script><script>',mock,'</script>',
 '<script>document.documentElement.style.zoom=Number(new URLSearchParams(location.search).get("scale"))/100;</script>',
 '<script>',read("food-browser-v3.js"),'</script><script>',checks,'</script></body></html>'
].join("");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"food-browser-v3-"));
const filename=path.join(dir,"fixture.html");fs.writeFileSync(filename,fixture);
try{
 for(const pct of [90,100,110,120]){
  const r=cp.spawnSync(chrome,[
   "--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
   "--no-first-run","--window-size=440,900","--dump-dom",
   "file://"+filename+"?scale="+pct
  ],{encoding:"utf8",timeout:30000,maxBuffer:15*1024*1024});
  if(r.error)throw r.error;
  assert.equal(r.status,0,r.stderr.slice(-1000));
  const m=r.stdout.match(/id="report" data-check="([^"]+)"/);
  assert.ok(m,"No browser test result at "+pct+"%; "+r.stderr.slice(-600));
  const failed=JSON.parse(decodeURIComponent(m[1].replaceAll("&amp;","&")));
  assert.deepEqual(failed,[],"Browser "+pct+"%: "+JSON.stringify(failed));
  console.log("PASS real Chromium "+pct+"% layered selection, search, pagination, categories and card geometry");
 }
}finally{fs.rmSync(dir,{recursive:true,force:true});}
