"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const sw=fs.readFileSync(path.join(__dirname,"../sw.js"),"utf8");
const scope="https://willy19960422.github.io/food-app/";
const handlers={};
const index=new Response("<!doctype html><title>食養紀錄</title>",{status:200,headers:{"Content-Type":"text/html"}});
const cache={
 match:async request=>{
  const url=typeof request==="string"?request:(request?.url||String(request));
  return url.includes("/index.html")?index:undefined;
 }
};
const self={
 location:{origin:new URL(scope).origin},registration:{scope},
 addEventListener:(name,listener)=>handlers[name]=listener,
 skipWaiting:()=>Promise.resolve()
};
const ctx=vm.createContext({self,URL,Request,Response,caches:{open:async()=>cache},console,
 fetch:async()=>{throw new Error("offline")}});
vm.runInContext(sw,ctx);
async function offlineFetch(filename,destination,mode){
 let promise;
 handlers.fetch({
  request:{url:scope+filename,method:"GET",destination,mode},
  respondWith:x=>{promise=x},
  waitUntil:()=>{}
 });
 if(filename!=="food-sheet.css")assert.ok(promise,"Service Worker must respond to cacheable resource");
 return promise;
}
(async()=>{
 const script=await offlineFetch("food-cloud.js?v=20261022-1","script","same-origin");
 assert.equal(script.status,503,"Missing JS must not return offline HTML");
 assert.notEqual(script.headers.get("Content-Type"),"text/html");
 console.log("PASS offline missing JavaScript has 503 and no HTML fallback");
 const document=await offlineFetch("index.html","document","navigate");
 assert.equal(document.status,200);
 assert.equal(document.headers.get("Content-Type"),"text/html");
 console.log("PASS offline page navigation returns cached HTML document");
 const missingStyle=await offlineFetch("food-sheet.css","style","same-origin");
 // Standalone stylesheet is not in APP_SHELL and must bypass SW entirely.
 assert.equal(missingStyle,undefined);
 console.log("PASS unrecognized static assets are not intercepted");
})().catch(error=>{console.error(error);process.exitCode=1});
