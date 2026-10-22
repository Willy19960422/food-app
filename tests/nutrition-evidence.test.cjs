"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const first=fs.readFileSync(path.join(root,"db/nutrition_evidence_backfill_20261022.sql"),"utf8");
const second=fs.readFileSync(path.join(root,"db/nutrition_evidence_backfill_20261022_wave2.sql"),"utf8");
const report=fs.readFileSync(path.join(root,"docs/nutrition-gap-inventory-20261022.md"),"utf8");

function pass(label,test){test();console.log("PASS "+label);}
pass("Guarded nutrition updates must not overwrite existing non-null values",()=>{
 assert.ok(first.includes("COALESCE(c.protein,e.protein)"));
 assert.ok(first.includes("COALESCE(c.fat,e.fat)"));
 assert.ok(first.includes("COALESCE(c.carbs,e.carbs)"));
 assert.ok(first.includes("c.kcal=e.expected_kcal"));
 assert.ok(first.includes("updated_count<>6"));
 assert.ok(first.includes("c.nutrition_status='awaiting_full_label'"));
 assert.ok(!/\bDELETE\s+FROM\b|\bTRUNCATE\b/i.test(first));
});
pass("Second batch is exact-match, missing-only, atomic and review-pending",()=>{
 assert.ok(second.includes("id=811 AND brand='7-ELEVEN'"));
 assert.ok(second.includes("name='增雞蛋白餐' AND kcal=595"));
 assert.ok(second.includes("protein IS NULL AND fat IS NULL AND carbs IS NULL"));
 assert.ok(second.includes("n<>1"));
 assert.ok(second.includes("nutrition_status='awaiting_full_label'"));
 assert.ok(!/\bDELETE\s+FROM\b|\bTRUNCATE\b/i.test(second));
});
pass("Dumpling per-piece values are derived from cited four-piece labels",()=>{
 assert.equal(1.5/4,.375);
 assert.equal(20.4/4,5.1);
 assert.equal(1.6/4,.4);
 assert.equal(21.6/4,5.4);
 assert.ok(first.includes("(537, '義美'"));
 assert.ok(first.includes("2.875, 0.375, 5.1"));
 assert.ok(first.includes("(538, '義美'"));
 assert.ok(first.includes("2.75, 0.4, 5.4"));
 assert.ok(first.includes("141kcal/P11.5g vs 143kcal/P12g"));
 assert.ok(first.includes("145kcal/P11.1g vs 147kcal/P11.5g"));
});
pass("KFC fries use separately published exact sizes, not kcal-derived macros",()=>{
 const expected=[
  ["（小）","203, 3.3, 8.4, 28.7"],
  ["（中）","288, 4.6, 11.9, 40.7"],
  ["（大）","393, 6.3, 16.2, 55.5"]
 ];
 for(const [size,values] of expected){assert.ok(first.includes("香酥脆薯"+size));assert.ok(first.includes(values));}
 assert.ok(first.includes("https://nuli.app/blog/kfc-diet-guide"));
});
pass("Supermarket high-protein product retains distinct packaging and third-party caution",()=>{
 assert.ok(first.includes("21Plus剝皮辣椒雞胸肉"));
 assert.ok(first.includes("163, 30.2, 4.1, 1.4"));
 assert.ok(first.includes("100g 舊款營養不同"));
 assert.ok(second.includes("353g，595kcal、P31.1g、F20.1g、C72.4g"));
 assert.ok(second.includes("https://www.fatsecret.cn"));
});
pass("The audit file enumerates every unresolved product with source",()=>{
 const matches=[...report.matchAll(/^\|\s*(\d{1,5})\s*\|/gm)].map(x=>Number(x[1]));
 assert.equal(matches.length,79);
 assert.equal(new Set(matches).size,79);
 assert.ok(report.includes("7-ELEVEN 63"));
 assert.ok(report.includes("全家 16"));
 assert.ok(report.includes("實際包裝版本"));
 assert.ok(report.includes("NULL"));
});
pass("Manufacturer food label provides matching per-100ml macros without approving automatically",()=>{
 const third=fs.readFileSync(path.join(root,"db/nutrition_evidence_backfill_20261022_wave3.sql"),"utf8");
 assert.ok(third.includes("id=48 AND brand='全家'"));
 assert.ok(third.includes("name='元初無加糖6.0高蛋白濃豆乳'"));
 assert.ok(third.includes("basis='每100ml' AND protein=6"));
 assert.ok(third.includes("SET kcal=69.0,fat=3.8,carbs=2.7"));
 assert.ok(third.includes("kcal IS NULL AND fat IS NULL AND carbs IS NULL"));
 assert.ok(third.includes("n<>1"));
 assert.ok(third.includes("nutrition_status='awaiting_full_label'"));
 assert.ok(third.includes("https://www.dauling.com.tw/pages/daydaydauling"));
 assert.ok(report.includes("8 筆有據補值"));
});

console.log("Nutrition evidence audit regression checks passed");
