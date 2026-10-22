"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const dir=path.resolve(__dirname,"..");
const read=n=>fs.readFileSync(path.join(dir,n),"utf8");
const html=read("index.html"),css=read("ui-polish.css"),
  ui=read("ui-polish.js"),sheet=read("food-sheet.js"),sw=read("sw.js");
let passed=0;
function check(label,fn){fn();console.log("PASS "+label);passed++;}
check("All inline and new external scripts parse",()=>{
  [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .forEach((m,i)=>new vm.Script(m[1],{filename:"inline-"+i}));
  for(const file of ["ui-polish.js","food-sheet.js","settings-menu.js","push-settings.js"])
    new vm.Script(read(file),{filename:file});
});
check("Visual assets are versioned and included in the offline shell",()=>{
  assert.ok(html.includes('<link rel="stylesheet" href="./ui-polish.css?v=20261022-1">'));
  assert.ok(html.includes('src="./ui-polish.js?v=20261022-1"'));
  assert.ok(html.includes('src="./food-sheet.js?v=20261022-ui1"'));
  assert.ok(sw.includes('"./ui-polish.css","./ui-polish.js"'));
  assert.ok(sw.includes('food-shell-20261022-ui-polish-1'));
});
check("Food sheet Close control is only one unobtrusive accessible X",()=>{
  assert.ok(sheet.includes('exit.textContent="×"'));
  assert.ok(sheet.includes('exit.setAttribute("aria-label","關閉份量視窗")'));
  assert.ok(sheet.includes('header.className="food-v2-sheet-header"'));
  assert.ok(sheet.includes('header.append(exit)'));
  assert.ok(sheet.includes('node.prepend(header)'));
  assert.ok(!sheet.includes('exit.textContent="關閉"'));
  assert.ok(css.includes('#selectedFoodInfo.food-v2-open .food-v2-close'));
  assert.ok(css.includes('width:40px!important'));
  assert.ok(sheet.includes('node.scrollTop=0'));
});
check("Record editor gets equivalent X and keyboard focus without altering saving",()=>{
  assert.ok(ui.includes('x.textContent="×"'));
  assert.ok(ui.includes('x.setAttribute("aria-label","關閉修改紀錄視窗")'));
  assert.ok(ui.includes('cancel.click()'));
  assert.ok(ui.includes('if(event.key==="Escape")'));
  assert.ok(ui.includes('new MutationObserver'));
  assert.ok(ui.includes('event.target===modal'));
});
check("All main pages have compact typography, forms and tap targets",()=>{
  assert.ok(css.includes('main > section > h1'));
  assert.ok(css.includes('font-size:20px'));
  assert.ok(css.includes('font-size:14px'));
  assert.ok(css.includes('font-size:16px; /* Avoid WebKit focus zoom */'));
  assert.ok(css.includes('min-height:44px'));
  assert.ok(css.includes('.meal-tabs label'));
  assert.ok(css.includes('#bottomNav button.on'));
  assert.ok(css.includes('#p-hist .history-date-control'));
  assert.ok(css.includes('#boxSelectFood .food-v3-tile'));
});
check("Settings, notification, data export, weight and admin views are themed",()=>{
 for(const selector of [
  "#settingsMenu .settings-menu-item",
  "#p-me .settings-subpage > h2",
  "#p-me #foodPushScreen",
  "#p-me .food-push-line",
  "#p-me .food-v2-chart-row",
  "#p-me .food-v2-weight-row",
  "#p-me .food-account-actions",
  "#p-me .food-admin-entry",
  "#p-me .food-candidate-row",
  "#p-me #foodDeleteButton"
 ])assert.ok(css.includes(selector),selector);
});
check("Theme and zoom controls are preserved",()=>{
 assert.ok(html.includes('id="uiScaleOptions"'));
 for(const n of [90,100,110,120])assert.ok(html.includes('data-scale="'+n+'"'));
 assert.ok(css.includes('var(--brand)'));
 assert.ok(css.includes('var(--line)'));
 assert.ok(css.includes('var(--card)'));
 assert.ok(css.includes(':root[data-theme="dark"]'));
 assert.ok(!/\.card\s*\{[^}]*!important/.test(css));
});
check("No application data operations or unsafe external dependency",()=>{
 const combined=ui+css;
 assert.ok(!/delete\s+from|create\s+table|alter\s+table|\.from\(|fetch\(/i.test(combined));
 assert.ok(!ui.includes("localStorage"));
 assert.ok(!ui.includes("innerHTML"));
});
console.log("Unified UI design system checks passed:",passed);
