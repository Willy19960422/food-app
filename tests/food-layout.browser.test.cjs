"use strict";
/* Headless real-Chromium visual geometry regression for iPhone-like food cards.
   Uses current index.html CSS; fails on squashed cards or horizontal overflow. */
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const cp=require("node:child_process");
const assert=require("node:assert/strict");
const index=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
const css=index.match(/<style>([\s\S]*?)<\/style>/);
assert.ok(css,"index CSS was not found");
const candidates=[process.env.CHROME_PATH,"google-chrome","google-chrome-stable","chromium","chromium-browser"].filter(Boolean);
const chrome=candidates.find(executable=>cp.spawnSync("which",[executable],{encoding:"utf8"}).status===0);
assert.ok(chrome,"Chromium/Chrome is required for visual regression checks.");
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"food-browser-"));
const escapeHtml=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
function card(i) {
  const name=[
    "7-11黑胡椒風味舒肥即食沙拉雞胸肉長名稱測試食品",
    "7-11熟成明太子御飯糰雙拼鮭魚新口味",
    "7-ELEVEN熱壓吐司雞肉起司及鮮蔬食品",
    "全家嫩雞胸肉沙拉義大利麵餐盒",
    "7-11奮起湖秘製雙拼握便當",
    "全家綜合鮮蔬蛋白健康即食沙拉胸",
    "7-11鮪魚起司雙拼熱壓三明治",
    "全家燒肉飯飯糰口味特選"
  ][i%8];
  return '<div class="food-card"><div style="flex:1"><div class="food-title"><span>'+
    escapeHtml(name)+'</span><span class="cat-tag">7-11鮮食</span></div>'+
    '<div class="food-subinfo">每100g｜需核對營養來源資訊</div>'+
    '<div class="macro-pills"><span class="pill pill-kcal">190 kcal</span>'+
    '<span class="pill pill-pro">P 23.3g</span><span class="pill pill-fat">F 3.1g</span>'+
    '<span class="pill pill-carb">C 34.2g</span></div></div>'+
    '<button type="button" class="sm ghost">選取</button></div>';
}
const js=[
  '(function(){',
  'const pct=Number(new URLSearchParams(location.search).get("scale")||100);',
  'document.documentElement.style.zoom=(pct/100);',
  'const cards=[...document.querySelectorAll("#foodContainer .food-card")];',
  'const list=document.getElementById("foodContainer");',
  'const result={scale:pct,maxHeight:getComputedStyle(list).maxHeight,',
  'overflow:getComputedStyle(list).overflowY,',
  'shrink:getComputedStyle(cards[0]).flexShrink,',
  'display:getComputedStyle(cards[0]).display,',
  'horizontalOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,',
  'bad:[]};',
  'cards.forEach((card,i)=>{',
  'const rect=card.getBoundingClientRect();',
  'const next=cards[i+1]?.getBoundingClientRect();',
  'const contents=card.firstElementChild.getBoundingClientRect();',
  'const button=card.querySelector("button").getBoundingClientRect();',
  'const title=card.querySelector(".food-title").getBoundingClientRect();',
  'const sub=card.querySelector(".food-subinfo").getBoundingClientRect();',
  'const pills=card.querySelector(".macro-pills").getBoundingClientRect();',
  'if(next && next.top < rect.bottom-1)result.bad.push("overlap-cards-"+i);',
  'if(rect.height < 105)result.bad.push("compressed-height-"+i+"="+rect.height);',
  'if(contents.right>button.left+2)result.bad.push("content-crosses-button-"+i);',
  'if(button.right>rect.right+1)result.bad.push("button-outside-"+i);',
  'if(title.bottom>sub.top+2)result.bad.push("title-crosses-sub-"+i);',
  'if(sub.bottom>pills.top+2)result.bad.push("sub-crosses-pills-"+i);',
  '});',
  'document.getElementById("report").setAttribute("data-check",btoa(JSON.stringify(result)));',
  '})();'
].join("");
const html=[
  '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  '<style>',css[1],'</style></head><body><main>',
  '<section id="p-list"><div id="boxSelectFood" class="card"><div id="foodContainer" class="food-list">',
  Array.from({length:14},(_,i)=>card(i)).join(""),
  '</div></div></section></main><div id="report"></div><script>',js,'</script></body></html>'
].join("");
const fixture=path.join(temp,"layout.html");
fs.writeFileSync(fixture,html);
try{
  for(const percent of [90,100,110,120]){
    const run=cp.spawnSync(chrome,[
      "--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
      "--no-first-run","--window-size=440,900","--dump-dom",
      "file://"+fixture+"?scale="+percent
    ],{encoding:"utf8",timeout:30000,maxBuffer:10*1024*1024});
    if(run.error)throw run.error;
    assert.equal(run.status,0,run.stderr.slice(-1200));
    const match=run.stdout.match(/id="report" data-check="([^"]+)"/);
    assert.ok(match,"missing visual result at "+percent+"%");
    const result=JSON.parse(Buffer.from(match[1],"base64").toString("utf8"));
    assert.equal(result.maxHeight,"none","list must not be height-clamped");
    assert.equal(result.shrink,"0","cards must not shrink under CSS zoom");
    assert.equal(result.display,"grid");
    assert.ok(result.horizontalOverflow<=3,"horizontal overflow at "+percent+"%: "+result.horizontalOverflow);
    assert.deepEqual(result.bad,[],"visual overlaps at "+percent+"%: "+result.bad.join(", "));
    console.log("PASS headless "+percent+"% food cards: no overlap, no compression");
  }
} finally {
  fs.rmSync(temp,{force:true,recursive:true});
}
