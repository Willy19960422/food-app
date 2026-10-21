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
  for(const id of ["manual","lookBtn","scanMsg","found","newForm","nName","nBrand","nK","nP","nF","nC","nB","nServingQty","nServingUnit","saveNew","submitProductBtn","submitProductStatus"]){
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
console.log("Barcode v2 tests passed:",passed);
