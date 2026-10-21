"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname,"..");
const read = p => fs.readFileSync(path.join(root,p),"utf8");
const html = read("index.html");
const client = read("barcode-v2.js");
const backend = read("supabase/functions/food-barcode-lookup/index.ts");
const schema = read("db/barcode_v2_schema.sql");
const corrections = read("db/barcode_v2_allow_pending_corrections.sql");
let passed = 0;
function check(name,fn){try{fn();passed++;console.log("PASS "+name);}catch(err){console.error("FAIL "+name);throw err;}}

check("All inline application scripts parse",()=>{
  const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(inline.length >= 2);
  inline.forEach((part,i)=>new vm.Script(part[1],{filename:"index-inline-"+i}));
});
check("Standalone barcode controller parses",()=>new vm.Script(client,{filename:"barcode-v2.js"}));
check("Barcode controller loads once and legacy conflicting handlers are removed",()=>{
  assert.equal((html.match(/src="\.\/barcode-v2\.js/g)||[]).length,1);
  assert.ok(html.includes('id="submitProductBtn"'));
  assert.ok(!html.includes('async function lookup(code) {'));
  assert.ok(!html.includes('$("saveNew").onclick'));
  assert.ok(!html.includes('async function fetchOpenFoodFacts(barcode)'));
  assert.ok(html.includes('function stopScan()'));
  assert.ok(html.includes('async function addLog(it, n)'));
});
check("Critical barcode form IDs occur exactly once",()=>{
  for(const id of ["manual","lookBtn","scanMsg","found","newForm","reportBarcodeBtn","nName","nBrand","nK","nP","nF","nC","nB","nServingQty","nServingUnit","saveNew","submitProductBtn","submitProductStatus"]){
    const count=(html.match(new RegExp('id="'+id+'"','g'))||[]).length;
    assert.equal(count,1,"id="+id+" count="+count);
  }
});
function loadPure(source,end) {
  const context = {console,Number,String,Math,Date,setTimeout,clearTimeout};
  const snippet = source.split(end)[0].replace(/^import[^\n]*\n/gm,"");
  vm.runInNewContext(snippet,context);
  return context;
}
const fe = loadPure(client,'$("lookBtn").onclick');
const be = loadPure(backend,"Deno.serve(");
check("GTIN check-digit recognizes valid EAN-8/UPC-A/EAN-13 and rejects invalid codes",()=>{
  for(const code of ["96385074","036000291452","4006381333931","4710088410009"]){
    assert.equal(fe.isValidScanBarcode(code),true,code);
    assert.equal(be.validBarcode(code),true,code);
  }
  for(const code of ["12345678","1234567890123","4710088410008","custom_123","0123456789","abc"]){
    assert.equal(fe.isValidScanBarcode(code),false,code);
    assert.equal(be.validBarcode(code),false,code);
  }
});
check("Unknown macros remain null and result is INCOMPLETE",()=>{
  const out=be.normalizeProduct("4006381333931",{product_name:"測試",nutriments:{"energy-kcal_100g":100,"proteins_100g":3}});
  assert.equal(out.state,"incomplete");
  assert.equal(out.item.f,null);
  assert.equal(out.item.c,null);
});
check("True-zero nutrition item is COMPLETE",()=>{
  const out=be.normalizeProduct("4006381333931",{product_name:"water",nutriments:{"energy-kcal_100g":0,"proteins_100g":0,"fat_100g":0,"carbohydrates_100g":0}});
  assert.equal(out.state,"complete");
  assert.equal(out.item.k,0);
  assert.equal(out.item.p,0);
});
check("Choose full per-serving nutrition when serving quantity known",()=>{
  const n={"energy-kcal_serving":80,"proteins_serving":3,"fat_serving":2,"carbohydrates_serving":10,
   "energy-kcal_100g":150};
  const out=be.normalizeProduct("4006381333931",{product_name:"food",serving_size:"50 g",serving_quantity:50,nutriments:n});
  assert.equal(out.state,"complete");
  assert.equal(out.item.basisType,"serving");
  assert.equal(out.item.servingWeight,50);
});
check("Own pending submission cannot modify review/status fields",()=>{
  assert.ok(schema.includes("status='pending'"));
  assert.ok(schema.includes("user_id=(select auth.uid())"));
  assert.ok(!corrections.includes("grant update (status"));
  assert.ok(!corrections.includes("grant update (user_id"));
});
check("No automatic shared-food publication from scans",()=>{
  assert.ok(!client.includes('from("custom_foods").insert'));
  assert.ok(client.includes('from("food_product_submissions")'));
  assert.ok(backend.includes('food_barcode_cache'));
});

async function simulateLookup(result,existing=null){
  const nodes = Object.create(null);
  const $ = id => {
    if (!nodes[id]) {
      const flags = new Set(["found","newForm","scanLoading"].includes(id)?["hide"]:[]);
      nodes[id] = {value:"",textContent:"",disabled:false,
        classList:{add:k=>flags.add(k),remove:k=>flags.delete(k),
          toggle:(k,show)=>{if(show)flags.add(k);else flags.delete(k);},
          contains:k=>flags.has(k)}};
    }
    return nodes[id];
  };
  const chain = {select(){return this;},eq(){return this;},
    async maybeSingle(){return {data:this.table==="custom_foods"?existing:null,error:null};}};
  const context = vm.createContext({console,Number,String,Math,Date,
    setTimeout,clearTimeout,AbortController,
    $: $, sbClient:{from:table=>Object.assign(Object.create(chain),{table}),
      auth:{getSession:async()=>({data:{session:{access_token:"unit-jwt"}}})}},
    currentUser:{id:"unit-user"},loginSessionId:10,lookupSequenceId:0,photoSequenceId:0,
    curBarcode:null,curItem:null,stopScan:()=>{},setScanCalcMode:()=>{},
    SB_URL:"https://unit.example",
    fetch:async()=>({ok:true,json:async()=>result}),
    document:{querySelectorAll:()=>[]}
  });
  const head = client.split('$("lookBtn").onclick')[0];
  vm.runInContext(head,context);
  await vm.runInContext('lookup("4006381333931")',context);
  return {nodes,food:context.curItem};
}
(async()=>{
  const partial=await simulateLookup({state:"incomplete",source_url:"https://world.openfoodfacts.org/product/4006381333931",
    item:{name:"部分營養資料",k:120,p:3,f:null,c:null,basisType:"100g",weightUnit:"g"}});
  assert.equal(partial.nodes.nK.value,"120");
  assert.equal(partial.nodes.nP.value,"3");
  assert.equal(partial.nodes.nF.value,"");
  assert.equal(partial.nodes.nC.value,"");
  assert.equal(partial.nodes.newForm.classList.contains("hide"),false);
  assert.equal(partial.nodes.found.classList.contains("hide"),true);
  console.log("PASS End-to-end mocked incomplete barcode lookup preserves blanks");
  const full=await simulateLookup({state:"complete",source_name:"Open Food Facts",
    item:{name:"測試飲品",basis:"每100g",basisType:"100g",k:0,p:0,f:0,c:0,weightUnit:"g"}});
  assert.equal(full.nodes.found.classList.contains("hide"),false);
  assert.equal(full.nodes.newForm.classList.contains("hide"),true);
  assert.equal(full.nodes.fName.textContent,"測試飲品");
  assert.equal(full.food.k,0);
  console.log("PASS End-to-end mocked complete barcode lookup supports real zero values");
  const legacy=await simulateLookup(null,{
    barcode:"4006381333931",name:"舊版飲品",basis:"每100ml",basis_type:"serving",
    serving_weight:0,kcal:10,protein:0,fat:0,carbs:2,
    is_verified:true,data_quality:"legacy_unreviewed"
  });
  assert.equal(legacy.food.basisType,"100ml");
  assert.equal(legacy.nodes.actualWeightInput.value,100);
  assert.ok(legacy.nodes.weightInputLabel.textContent.includes("每100ml"));
  console.log("PASS Legacy per-100ml basis overrides incorrect serving default");
  console.log("Barcode v2 all tests passed:",passed+3);
})().catch(error=>{console.error("FAIL Barcode flow integration",error);process.exitCode=1;});

