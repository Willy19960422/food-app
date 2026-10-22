"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const read=filename=>fs.readFileSync(path.join(root,filename),"utf8");
const html=read("index.html"),sheet=read("food-sheet.js"),sw=read("sw.js");

const a=html.indexOf("function foodQuantitySpec(");
const b=html.indexOf("function selectFoodItem(",a);
assert.ok(a>=0 && b>a,"Missing shared quantity calculation module");
const sandbox={
 isPieceFood:item=>!!item&&(item.cat==="餃類點心" ||
   /^1顆/.test(item.basis||"")||item.basis==="每顆")
};
const api=vm.runInNewContext(html.slice(a,b)+";({foodQuantitySpec,foodQuantityFactor});",sandbox);
const {foodQuantitySpec:spec,foodQuantityFactor:factor}=api;
let passed=0;
function test(name,fn){fn();passed++;console.log("PASS "+name);}
function eq(x,y){assert.equal(x,y);}

test("Never show two independent package/serving panels",()=>{
 assert.ok(!html.includes("function packagePanel("));
 assert.ok(!html.includes("refreshFood = packagePanel"));
 assert.ok(!html.includes("refreshScan = packagePanel"));
 assert.ok(!html.includes("每包有幾份？請依包裝標示填寫"));
 eq((html.match(/id="selQuantityCard"/g)||[]).length,1);
 eq((html.match(/id="cfN"/g)||[]).length,1);
 eq((html.match(/id="cfChips"/g)||[]).length,1);
});
test("Per serving nutritional basis uses servings, not packs",()=>{
 const item={name:"7-11 明太子御飯糰",cat:"超商鮮食",basis:"每份",
  basisType:"serving",k:190,p:6.2,f:3.1,c:34.2};
 eq(spec(item).kind,"serving");
 assert.deepEqual(Array.from(spec(item).presets,x=>x[1]),["0.5 份","1 份","1.5 份","2 份"]);
 eq(factor(item,"serv","0.5","").factor,0.5);
 eq(item.k*factor(item,"serv","0.5","").factor,95);
 assert.ok(!spec(item).presets.some(x=>/包/.test(x[1])));
});
test("Only explicitly per-package products get whole/half/quarter package labels",()=>{
 const base={basis:"每包",k:250,p:10,f:8,c:32};
 const pkg=spec(base);
 eq(pkg.kind,"pack");
 assert.deepEqual(Array.from(pkg.presets,x=>x[1]),["¼ 包","半包","整包","2 包"]);
 eq(factor(base,"serv","0.5","").factor,0.5);
 eq(factor({...base,basis:"1包(40g)"},"serv","1","").factor,1);
 eq(spec({...base,basis:"每袋"}).unit,"袋");
 eq(spec({...base,basis:"每份(106g)"}).kind,"serving");
});
test("Per piece keeps integer quantities and rejects fractional item counts",()=>{
 const item={name:"韭菜水餃",cat:"餃類點心",basis:"每顆",k:36.2,p:2.8,f:0.4,c:5.1};
 eq(spec(item).kind,"piece");
 assert.deepEqual(Array.from(spec(item).presets,x=>x[1]),["1 顆","5 顆","8 顆","10 顆"]);
 eq(factor(item,"serv","8","").factor,8);
 assert.ok(factor(item,"serv","0.5","").error);
 assert.ok(factor(item,"serv","201","").error);
});
test("Per 100g and per 100ml carry explicit baseline rather than an invented pack size",()=>{
 const g={name:"雞胸",basis:"每100g",basisType:"100g",k:120,p:24,f:2,c:0};
 const ml={name:"無加糖豆奶",basis:"每100ml",basisType:"100ml",k:69,p:6,f:3.8,c:2.7};
 eq(spec(g).kind,"per100");
 assert.ok(spec(g).label.includes("100 g"));
 assert.ok(spec(ml).label.includes("100 ml"));
 eq(factor(g,"weight","1","150").factor,1.5);
 eq(factor(ml,"weight","1","250").factor,2.5);
 eq(factor(g,"serv","0.5","").factor,0.5);
 eq(factor(g,"serv","0.5","").display,"50 g");
});
test("Weight conversion requires an actual serving weight; no silent guess",()=>{
 const withWeight={name:"御飯糰",basis:"每份",k:190,servingWeight:106};
 const unknown={name:"便當",basis:"每份",k:600};
 eq(factor(withWeight,"weight","1","53").factor,0.5);
 assert.ok(factor(unknown,"weight","1","53").error);
 eq(factor(unknown,"serv","1","").factor,1);
});
test("Invalid empty, zero, negative and NaN amounts cannot save as one serving",()=>{
 const food={name:"飯糰",basis:"每份",k:190};
 for(const value of ["","  ","0","-1","invalid","Infinity"]){
   assert.ok(factor(food,"serv",value,"").error,"should reject "+value);
 }
 for(const value of ["","0","-50","NaN","Infinity"]){
   assert.ok(factor({...food,servingWeight:105},"weight","1",value).error);
 }
});
test("Food preview and final Save use exactly the same conversion function",()=>{
 assert.ok(html.includes('const value=foodQuantityFactor(chosenFood,selCalcMode'));
 assert.ok(html.includes('const selected=foodQuantityFactor(chosenFood,selCalcMode'));
 assert.ok(html.includes('selected.factor);'));
 assert.ok(html.includes("value.error"));
});
test("Quantity chip buttons are keyboard focusable and iPhone UI has compact constraints",()=>{
 assert.ok(html.includes('<button type="button" class="serving-chip'));
 assert.ok(html.includes('role="group" aria-label="快捷份量"'));
 assert.ok(html.includes('#selectedFoodInfo #cfChips'));
 assert.ok(html.includes('grid-template-columns:repeat(4,minmax(0,1fr))'));
 assert.ok(html.includes('font-size:16px!important'));
 assert.ok(html.includes('id="selQuantityModes"'));
});
test("Modal resets old scroll position and hides cleanly on cancel",()=>{
 assert.ok(sheet.includes("node.scrollTop=0"));
 assert.ok(sheet.includes('node?.classList.add("hide")'));
 assert.ok(sheet.includes('max-height:min(73dvh,600px)'));
 assert.ok(sheet.includes('event.key!=="Tab"'));
});
test("PWA updates both quantity view scripts and cached shell",()=>{
 assert.ok(html.includes('food-sheet.js?v=20261022-ui1'));
 assert.ok(sw.includes('food-shell-20261022-ui-polish-1'));
});
test("All inline JavaScript and sheet code remain syntactically valid",()=>{
 [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .forEach((m,i)=>new vm.Script(m[1],{filename:"inline-"+i}));
 new vm.Script(sheet);
});
console.log("Food quantity regression checks passed:",passed);
