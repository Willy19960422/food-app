"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=name=>fs.readFileSync(path.join(root,name),"utf8");
const html=read("index.html"),script=read("food-browser-v3.js"),sw=read("sw.js");
let passed=0;
function check(name,fn){fn();passed++;console.log("PASS "+name);}
check("Layered browser script and full existing HTML parse",()=>{
  new vm.Script(script);
  [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .forEach((m,i)=>new vm.Script(m[1],{filename:"index-inline-"+i}));
});
check("Original food selection and nutrition provenance are reused",()=>{
  assert.ok(html.includes('window.foodBrowserV3?.ready'));
  assert.ok(html.includes('chooseKnown:selectFoodItem'));
  assert.ok(html.includes('chooseCandidate:prefillOfficialFood'));
  assert.ok(html.includes('candidateToFood:officialCatalogToFoodItem'));
  assert.ok(html.includes('isOfficial:canQuickRecordOfficial'));
  assert.ok(html.includes('known:knownForBrowser'));
  assert.ok(!script.includes('from("custom_foods")'));
  assert.ok(!script.includes('from("diet_logs")'));
});
check("Food browser routes categories, store brands, types and products",()=>{
  for(const id of ["foodBrowserV3","foodV3Back","foodV3Trail","foodV3Heading","foodV3Tiles","foodContainer"]){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  for(const stage of ["home","brands","kinds","products","search"]){
    assert.ok(script.includes('"'+stage+'"'));
  }
  assert.ok(script.includes('"protein"'));
  assert.ok(script.includes('state.query'));
  assert.ok(script.includes('returnTo'));
});
check("Two-column cards and 12-item pages instead of Load more",()=>{
  assert.ok(script.includes("const pageSize=12"));
  assert.ok(html.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
  assert.ok(html.includes('food-v3-product-grid'));
  assert.ok(html.includes('food-v3-card-main'));
  assert.ok(script.includes('document.createElement("div");pager.className="food-v3-pagination"'));
  assert.ok(!script.includes('document.createElement("nav")'));
});
check("Incomplete candidates stay incomplete, zero is preserved",()=>{
  assert.ok(script.includes('validNumber(value)'));
  assert.ok(script.includes('value.textContent=validNumber(item[key])'));
  assert.ok(script.includes(':"—"'));
  assert.ok(script.includes('if(ctx.isOfficial(item))ctx.chooseKnown'));
  assert.ok(script.includes('else ctx.chooseCandidate(item)'));
  assert.ok(script.includes('fullCandidate(item)?"數值待核對"'));
});
check("Recent and saved food use existing log/favorite models",()=>{
  assert.ok(script.includes('ctx.logs'));
  assert.ok(script.includes('ctx.known'));
  assert.ok(script.includes('x.item.isFav'));
  assert.ok(script.includes('type:"recent"'));
});
check("Service Worker caches the new browser and changes version",()=>{
  assert.ok(sw.includes('"./food-browser-v3.js"'));
  assert.match(sw,/const CACHE_NAME = "food-shell-20261022-v3-[^"]+"/);
});
check("Food cards use restrained readable typography and a single compact macro row",()=>{
  assert.ok(html.includes('font-size:12px;font-weight:650;line-height:1.4'));
  assert.ok(html.includes('font-size:16px;font-weight:750;line-height:1.25'));
  assert.ok(html.includes('min-height:120px'));
  assert.ok(html.includes('flex-direction:row;gap:2px;align-items:center'));
  assert.ok(html.includes('background:transparent;border:0;color:var(--brand)'));
  assert.ok(html.includes('font-size:10px;line-height:1.3'));
  assert.ok(html.includes('food-browser-v3.js?v=20261022-2'));
});
check("Condensed store-card names preserve original product name for assistive access",()=>{
  assert.ok(script.includes('const selectedStore=state.category==="超商鮮食"'));
  assert.ok(script.includes('name.title=row.name'));
  assert.ok(script.includes('button.title=row.name'));
  assert.ok(script.includes('button.setAttribute("aria-label",row.name'));
  assert.ok(script.includes('"來源待核對"'));
  assert.ok(script.includes('else ctx.chooseCandidate(item)'));
});

console.log("Food browser v3 structural regression checks passed:",passed);
