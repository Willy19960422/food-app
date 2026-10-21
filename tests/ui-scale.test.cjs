"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const read = filename => fs.readFileSync(path.join(__dirname,"..",filename),"utf8");
const html = read("index.html"), ui = read("ui-scale.js"), menu = read("settings-menu.js");
let passed = 0;
function check(description,callback) {
  callback(); passed++; console.log("PASS " + description);
}
check("Viewport has fixed page scale for a native-like PWA",()=>{
  const meta = html.match(/<meta name="viewport" content="([^"]+)"/);
  assert.ok(meta);
  assert.match(meta[1],/width=device-width/);
  assert.match(meta[1],/maximum-scale=1/);
  assert.match(meta[1],/user-scalable=no/);
  assert.match(html,/html\{zoom:var\(--food-ui-scale,1\)/);
});
check("Appearance screen contains four fixed size options and no added menu cards",()=>{
  const appearanceStart = html.indexOf('<h2>外觀主題</h2>');
  const appearanceEnd = html.indexOf('<div class="card" id="foodPushCard">',appearanceStart);
  assert.ok(appearanceStart>0 && appearanceEnd>appearanceStart);
  const appearance = html.slice(appearanceStart,appearanceEnd);
  assert.ok(appearance.includes('id="themeGroup"'));
  assert.ok(appearance.includes('id="uiScaleOptions"'));
  for (const size of [90,100,110,120]){
    assert.equal((appearance.match(new RegExp('data-scale="'+size+'"','g'))||[]).length,1);
  }
  assert.ok(menu.includes('detail:"主題與介面大小（90%～120%）"'));
  assert.ok(menu.includes("cards.slice(3,4)"));
});
check("Size controller and initial boot preference are included and syntactically valid",()=>{
  assert.equal((html.match(/src="\.\/ui-scale\.js\?v=20261021-1"/g)||[]).length,1);
  assert.ok(html.includes('localStorage.getItem("food_ui_scale_v1")'));
  assert.ok(html.includes("--food-ui-control-font"));
  assert.match(html,/input,select,textarea\{font-size:var\(--food-ui-control-font,16px\)!important\}/);
  new vm.Script(ui);
  const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  inline.forEach((part,index)=>new vm.Script(part[1],{filename:"inline-"+index}));
});

function createHarness(initialValue){
  const values = new Map();
  if(initialValue!==undefined)values.set("food_ui_scale_v1",String(initialValue));
  const rootStyle={};
  const node={style:{setProperty:(name,value)=>{rootStyle[name]=value;}},dataset:{}};
  const eventHandlers={};
  const buttons=[90,100,110,120].map(pct=>{
    const classes=new Set(pct===100?["ui-scale-option","on"]:["ui-scale-option"]);
    const buttonEvents={};
    return {
      dataset:{scale:String(pct)},attrs:{"aria-pressed":pct===100?"true":"false"},
      classList:{toggle:(name,on)=>on?classes.add(name):classes.delete(name),contains:name=>classes.has(name)},
      setAttribute:(name,value)=>{buttonsPlaceholder();}, // replaced below
      addEventListener:(type,fn)=>{buttonEvents[type]=fn},
      click:()=>buttonEvents.click(),
      classes
    };
  });
  function buttonsPlaceholder(){}
  buttons.forEach(button=>{
    button.setAttribute=(name,value)=>{button.attrs[name]=String(value)};
  });
  const localStorage={
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>values.set(key,String(value))
  };
  const document={
    documentElement:node,
    querySelectorAll:selector=>selector==="#uiScaleOptions .ui-scale-option"?buttons:[],
    addEventListener:(name,fn)=>{eventHandlers["document:"+name]=fn}
  };
  const window={
    addEventListener:(name,fn)=>{eventHandlers["window:"+name]=fn}
  };
  const sandbox={document,window,localStorage,Number,String,Array};
  vm.runInNewContext(ui,sandbox);
  return {buttons,values,node,rootStyle,eventHandlers};
}
check("Saved 110 percent applies on initialization without changing storage",()=>{
  const app=createHarness(110);
  assert.equal(app.rootStyle["--food-ui-scale"],"1.1");
  assert.equal(app.rootStyle["--food-ui-control-font"],"16px");
  assert.equal(app.node.dataset.uiScale,"110");
  assert.equal(app.buttons.find(b=>b.dataset.scale==="110").attrs["aria-pressed"],"true");
  assert.equal(app.buttons.find(b=>b.dataset.scale==="100").attrs["aria-pressed"],"false");
});
check("Tapping 90 percent updates layout and persists preference",()=>{
  const app=createHarness(100);
  app.buttons[0].click();
  assert.equal(app.rootStyle["--food-ui-scale"],"0.9");
  assert.equal(app.rootStyle["--food-ui-control-font"],"18px");
  assert.equal(app.values.get("food_ui_scale_v1"),"90");
  assert.equal(app.buttons[0].attrs["aria-pressed"],"true");
  assert.equal(app.buttons[1].attrs["aria-pressed"],"false");
});
check("Tapping 120 percent updates layout and persists preference",()=>{
  const app=createHarness(90);
  app.buttons[3].click();
  assert.equal(app.rootStyle["--food-ui-scale"],"1.2");
  assert.equal(app.values.get("food_ui_scale_v1"),"120");
  assert.equal(app.buttons[3].attrs["aria-pressed"],"true");
});
check("Invalid saved scales fall back to 100 percent",()=>{
  const app=createHarness(500);
  assert.equal(app.rootStyle["--food-ui-scale"],"1");
  assert.equal(app.buttons[1].attrs["aria-pressed"],"true");
});
check("Preference changes on another tab update this tab",()=>{
  const app=createHarness(100);
  app.values.set("food_ui_scale_v1","90");
  app.eventHandlers["window:storage"]({key:"food_ui_scale_v1"});
  assert.equal(app.rootStyle["--food-ui-scale"],"0.9");
});
check("Pinch gestures are blocked but ordinary single-finger scrolling is allowed",()=>{
  const app=createHarness(100);
  let prevented=0;
  const event=(touchCount=0,ctrlKey=false)=>({
    cancelable:true,ctrlKey,touches:Array(touchCount).fill({}),
    preventDefault(){prevented++;}
  });
  app.eventHandlers["document:gesturestart"](event(2));
  app.eventHandlers["document:gesturechange"](event(2));
  app.eventHandlers["document:touchmove"](event(2));
  app.eventHandlers["document:touchmove"](event(1));
  app.eventHandlers["document:wheel"](event(0,true));
  app.eventHandlers["document:wheel"](event(0,false));
  assert.equal(prevented,4);
});
console.log("UI scale tests passed:",passed);
