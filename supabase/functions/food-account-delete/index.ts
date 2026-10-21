import { createClient } from "npm:@supabase/supabase-js@2.57.0";
// Destructive operation runs only on explicit confirmation from the signed-in owner.
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"OPTIONS,POST","Content-Type":"application/json"};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(req.method!=="POST")return reply({error:"METHOD_NOT_ALLOWED"},405);
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return reply({error:"CONFIG_MISSING"},503);
 const jwt=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!jwt)return reply({error:"NOT_AUTHORIZED"},401);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await admin.auth.getUser(jwt);
 if(authError||!user||user.is_anonymous)return reply({error:"NOT_AUTHORIZED"},401);
 let body={};try{body=await req.json();}catch(_){return reply({error:"INVALID_JSON"},400);}
 if(body?.confirmation!=="刪除帳號"||body?.user_id!==user.id)return reply({error:"EXPLICIT_CONFIRMATION_REQUIRED"},400);
 const uid=user.id;
 try{
  // Delete private food images first. Leave account intact on failed media cleanup.
  const bucket=admin.storage.from("food-product-labels");
  const {data:folders,error:folderError}=await bucket.list(uid,{limit:1000});
  if(folderError)throw folderError;
  const files=[];
  for(const folder of folders||[]){
   if(folder.id){files.push(uid+"/"+folder.name);continue;}
   const {data:inside,error}=await bucket.list(uid+"/"+folder.name,{limit:1000});
   if(error)throw error;
   for(const file of inside||[])if(file.id)files.push(uid+"/"+folder.name+"/"+file.name);
  }
  if(files.length){
   const {error}=await bucket.remove(files);if(error)throw error;
  }
  // Unreviewed personal additions cannot remain orphaned in the shared catalog.
  const {data:myFoods,error:ownedError}=await admin.from("custom_foods")
   .select("barcode,is_verified").eq("created_by",uid);
  if(ownedError)throw ownedError;
  const personal=(myFoods||[]).filter(x=>x.is_verified!==true).map(x=>x.barcode);
  const reviewed=(myFoods||[]).filter(x=>x.is_verified===true).map(x=>x.barcode);
  if(personal.length){
   const {error:aliasError}=await admin.from("food_barcode_aliases")
    .delete().in("canonical_barcode",personal);
   if(aliasError)throw aliasError;
   const {error:foodError}=await admin.from("custom_foods")
    .delete().eq("created_by",uid).in("barcode",personal);
   if(foodError)throw foodError;
  }
  // Reviewed shared food remains public but becomes anonymous.
  if(reviewed.length){
   const {error}=await admin.from("custom_foods").update({created_by:null})
    .eq("created_by",uid).in("barcode",reviewed);
   if(error)throw error;
  }
  // Other personally owned tables use ON DELETE CASCADE.
  const {error:deleted}=await admin.auth.admin.deleteUser(uid,false);
  if(deleted)throw deleted;
  return reply({ok:true});
 }catch(error){
  console.error("Account deletion failed",String(error));
  return reply({error:"ACCOUNT_DELETE_FAILED: "+String(error).slice(0,160)},500);
 }
});
