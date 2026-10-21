// Barcode v2 lookup proxy. External data is NOT automatically promoted to custom_foods.
// Open Food Facts requires a identifying User-Agent and rate-conscious requests.
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const USER_AGENT = "ShiYangFoodJournal/2.0 (https://github.com/Willy19960422/food-app)";
const NUTRIENTS = ["energy-kcal","proteins","fat","carbohydrates"];
const json = (body,status=200) => new Response(JSON.stringify(body),{status,headers:CORS});

function validBarcode(barcode) {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(barcode)) return false;
  let sum=0,weight=1;
  for(let i=barcode.length-1;i>=0;i--){sum+=Number(barcode[i])*weight;weight=weight===3?1:3;}
  return sum%10===0;
}
function nutrient(nutrients,field,suffix){
  const v=nutrients[field+"_"+suffix];
  if(v===null||v===undefined||v==="")return null;
  const n=Number(v);
  return Number.isFinite(n)&&n>=0&&n<=(field==="energy-kcal"?3500:300)?Math.round(n*100)/100:null;
}
function normalizeProduct(code,p){
  const nut=p.nutriments&&typeof p.nutriments==="object"?p.nutriments:{};
  const serving=NUTRIENTS.map(f=>nutrient(nut,f,"serving"));
  const per100=NUTRIENTS.map(f=>nutrient(nut,f,"100g"));
  const servingQuantity=Number(p.serving_quantity)||Number.parseFloat(String(p.serving_size||""))||0;
  const servingUnit=/\bml\b/i.test(String(p.serving_size||""))?"ml":"g";
  const servingUsable=servingQuantity>0 && servingQuantity<=100000;
  const useServing=servingUsable&&serving.every(v=>v!==null);
  const use100=per100.some(v=>v!==null);
  const choice=useServing?"serving":use100?"100g":"serving";
  const vals=choice==="serving"?serving:per100;
  const rawName=(p.product_name_zh||p.product_name||"").trim().slice(0,200);
  const item={
    name:rawName,
    brand:String(p.brands||"").slice(0,120),
    basis:choice==="serving"?"每份":"每100g",
    basisType:choice,
    servingWeight:choice==="serving"&&servingUsable?servingQuantity:0,
    weightUnit:servingUnit,
    k:vals[0],p:vals[1],f:vals[2],c:vals[3],
    sourceUrl:"https://world.openfoodfacts.org/product/"+code
  };
  return {state:rawName&&vals.every(v=>v!==null)?"complete":"incomplete",item};
}
async function loadOpenFoodFacts(code){
  const controller=new AbortController();
  const t=setTimeout(()=>controller.abort(),8000);
  try{
    const fields="code,product_name,product_name_zh,brands,serving_size,serving_quantity,nutriments";
    const url="https://world.openfoodfacts.org/api/v2/product/"+code+".json?fields="+fields;
    const resp=await fetch(url,{
      headers:{"User-Agent":USER_AGENT,"Accept":"application/json"},
      signal:controller.signal
    });
    if(resp.status===429)throw new Error("OFF_RATE_LIMIT");
    if(!resp.ok)throw new Error("OFF_HTTP_"+resp.status);
    const result=await resp.json();
    if(result.status!==1||!result.product)return {state:"not_found",item:null};
    return normalizeProduct(code,result.product);
  }finally{clearTimeout(t);}
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
  const url=Deno.env.get("SUPABASE_URL")||"";
  const anon=Deno.env.get("SUPABASE_ANON_KEY")||"";
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url||!anon||!service)return json({error:"SERVER_NOT_CONFIGURED"},503);
  const authHeader=req.headers.get("authorization")||"";
  if(!/^Bearer\s+\S+$/i.test(authHeader))return json({error:"UNAUTHORIZED"},401);
  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=authHeader.replace(/^Bearer\s+/i,"");
  const {data:{user},error:authError}=await auth.auth.getUser(token);
  if(authError||!user||user.is_anonymous)return json({error:"UNAUTHORIZED"},401);
  let body;
  try{body=await req.json();}catch(_){return json({error:"INVALID_JSON"},400);}
  const code=String(body?.barcode||"").trim();
  if(!validBarcode(code))return json({error:"INVALID_BARCODE"},400);

  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:cached,error:readError}=await admin.from("food_barcode_cache")
    .select("state,payload,source_name,source_url,expires_at").eq("barcode",code).maybeSingle();
  if(readError){console.error("barcode cache read",readError.message);return json({error:"CACHE_UNAVAILABLE"},503);}
  const source="Open Food Facts（公共資料，非品牌驗證）";
  if(cached&&Date.parse(cached.expires_at)>Date.now()){
    return json({state:cached.state,item:cached.payload?.item||null,
      source_name:cached.source_name,source_url:cached.source_url,cached:true});
  }
  let result;
  try{result=await loadOpenFoodFacts(code);}
  catch(e){
    console.error("barcode external lookup failed",String(e));
    if(cached&&cached.state==="complete"){
      return json({state:cached.state,item:cached.payload?.item||null,
        source_name:cached.source_name,source_url:cached.source_url,cached:true,stale:true});
    }
    return json({error:String(e).includes("OFF_RATE_LIMIT")?"SOURCE_BUSY":"SOURCE_UNAVAILABLE"},503);
  }
  const ttlDays=result.state==="complete"?45:result.state==="incomplete"?14:1;
  const entry={
    barcode:code,state:result.state,payload:{item:result.item},
    source_name:source,source_url:"https://world.openfoodfacts.org/product/"+code,
    attribution:"Open Food Facts (ODbL)",
    retrieved_at:new Date().toISOString(),
    expires_at:new Date(Date.now()+ttlDays*86400000).toISOString()
  };
  const {error:writeError}=await admin.from("food_barcode_cache").upsert(entry,{onConflict:"barcode"});
  if(writeError)console.error("barcode cache write",writeError.message);
  return json({state:result.state,item:result.item,source_name:source,
    source_url:entry.source_url,cached:false});
});
