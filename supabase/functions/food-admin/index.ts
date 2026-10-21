import { createClient } from "npm:@supabase/supabase-js@2.57.0";
// Only service-role backend can approve or publish reviewed food products.
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"OPTIONS,POST","Content-Type":"application/json"};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:H});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(req.method!=="POST")return reply({error:"METHOD_NOT_ALLOWED"},405);
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return reply({error:"CONFIG_MISSING"},503);
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token)return reply({error:"UNAUTHORIZED"},401);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authErr}=await admin.auth.getUser(token);
 if(authErr||!user||user.is_anonymous)return reply({error:"UNAUTHORIZED"},401);
 let body;
 try{body=await req.json();}catch(_){return reply({error:"INVALID_JSON"},400);}
 const action=String(body?.action||"");
 if(action==="link_photo"){
  const id=String(body?.id||""),path=String(body?.path||"");
  if(!/^[0-9a-f-]{36}$/i.test(id) || !path.startsWith(user.id+"/"+id+"/")||path.length>500)
   return reply({error:"INVALID_PHOTO_PATH"},400);
  const {data:submission,error}=await admin.from("food_product_submissions")
   .select("user_id,status").eq("id",id).maybeSingle();
  if(error||!submission||submission.user_id!==user.id||submission.status!=="pending")
   return reply({error:"NO_EDIT_PERMISSION"},403);
  const dir=user.id+"/"+id;
  const {data:files,error:listingError}=await admin.storage.from("food-product-labels")
   .list(dir,{limit:20});
  if(listingError||!(files||[]).some(f=>dir+"/"+f.name===path && f.id))
   return reply({error:"PHOTO_NOT_FOUND"},404);
  const {error:updated}=await admin.from("food_product_submissions")
   .update({photo_path:path}).eq("id",id);
  if(updated)return reply({error:"PHOTO_LINK_FAILED"},503);
  return reply({ok:true});
 }
 const {data:role,error:roleErr}=await admin.from("food_app_admins")
  .select("role").eq("user_id",user.id).maybeSingle();
 if(roleErr)return reply({error:"ADMIN_ROLE_CHECK_FAILED"},503);
 if(action==="status")return reply({is_admin:!!role});
 if(!role)return reply({error:"ADMIN_REQUIRED"},403);
 if(action==="list"){
  const page=Number.isInteger(body?.page)&&body.page>=0&&body.page<1000?body.page:0;
  const state=["pending","approved","rejected"].includes(body?.state)?body.state:"pending";
  const {data,error,count}=await admin.from("food_product_submissions")
   .select("id,barcode,brand,name,category,sub_category,basis_type,serving_quantity,serving_unit,kcal,protein,fat,carbs,source_type,source_url,status,review_notes,photo_path,created_at",{count:"exact"})
   .eq("status",state).order("created_at",{ascending:false}).range(page*30,page*30+29);
  if(error)return reply({error:"ADMIN_LIST_FAILED"},503);
  const barcodes=(data||[]).map(row=>row.barcode);
  let existing=[];
  if(barcodes.length){
   const {data:known,error:lookupErr}=await admin.from("custom_foods")
    .select("barcode,name,is_verified").in("barcode",barcodes);
   if(lookupErr)return reply({error:"CONFLICT_LOOKUP_FAILED"},503);
   existing=known||[];
  }
  const map=new Map(existing.map(x=>[x.barcode,x]));
  const items=[];
  for(const item of data||[]){
   let photo_url=null;
   if(item.photo_path){
    const {data:signed}=await admin.storage.from("food-product-labels")
     .createSignedUrl(item.photo_path,300);
    photo_url=signed?.signedUrl||null;
   }
   items.push({...item,photo_url,conflicting_food:map.get(item.barcode)||null});
  }
  return reply({items,total:count||0,page,state});
 }
 if(action==="review"){
  const id=String(body?.id||""),state=body?.state;
  const notes=String(body?.notes||"").trim().slice(0,1200);
  if(!/^[0-9a-f-]{36}$/i.test(id)||!["approved","rejected"].includes(state))
   return reply({error:"INVALID_REVIEW"},400);
  if(notes.length<5)return reply({error:"REVIEW_NOTES_REQUIRED"},400);
  const {data:item,error:fetchErr}=await admin.from("food_product_submissions")
   .select("*").eq("id",id).maybeSingle();
  if(fetchErr||!item)return reply({error:"NOT_FOUND"},404);
  if(item.status!=="pending")return reply({error:"ALREADY_REVIEWED"},409);
  if(state==="rejected"){
   const {error}=await admin.from("food_product_submissions")
    .update({status:"rejected",review_notes:notes,reviewed_at:new Date().toISOString()})
    .eq("id",id).eq("status","pending");
   if(error)return reply({error:"REVIEW_UPDATE_FAILED"},503);
   return reply({ok:true,status:"rejected"});
  }
  if(body.confirmed!==true)return reply({error:"LABEL_REVIEW_CONFIRMATION_REQUIRED"},400);
  const fields=["kcal","protein","fat","carbs"];
  const limits=[3500,300,300,300];
  if(!fields.every((f,i)=>item[f]!==null && item[f]!==undefined &&
    Number.isFinite(Number(item[f])) && Number(item[f])>=0 && Number(item[f])<=limits[i]))
   return reply({error:"INCOMPLETE_NUTRITION"},400);
  const {data:existing,error:lookupError}=await admin.from("custom_foods")
   .select("barcode,name,is_verified").eq("barcode",item.barcode).maybeSingle();
  if(lookupError)return reply({error:"CATALOG_CHECK_FAILED"},503);
  if(existing)return reply({error:"BARCODE_ALREADY_EXISTS_MERGE_MANUALLY"},409);
  const basis=item.basis_type==="100g"?"每100g":item.basis_type==="100ml"?"每100ml":"每份";
  const record={
   barcode:item.barcode,name:item.name,basis,category:item.category,
   sub_category:item.sub_category||"",basis_type:item.basis_type,
   serving_weight:item.serving_quantity||0,
   kcal:item.kcal,protein:item.protein,fat:item.fat,carbs:item.carbs,
   created_by:null,is_verified:true,data_quality:"verified_label",
   source_name:"經管理員核對的商品營養標示",source_url:item.source_url||null,
   source_checked_at:new Date().toISOString().slice(0,10)
  };
  const {error:writeErr}=await admin.from("custom_foods").insert(record);
  if(writeErr){
   console.error("review catalog insert",writeErr.message);
   return reply({error:"CATALOG_INSERT_FAILED"},503);
  }
  const {error:markError}=await admin.from("food_product_submissions")
   .update({status:"approved",review_notes:notes,reviewed_at:new Date().toISOString()})
   .eq("id",id).eq("status","pending");
  if(markError){
   // Do not erase reviewed shared item here; moderation can reconcile conflicts manually.
   console.error("review marking",markError.message);
   return reply({error:"CATALOG_PUBLISHED_REVIEW_STATUS_NEEDS_RECONCILIATION"},503);
  }
  return reply({ok:true,status:"approved"});
 }
 return reply({error:"UNKNOWN_ACTION"},400);
});
