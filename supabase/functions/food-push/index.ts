import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import { send } from "jsr:@daaku/webpush@0.2.0";

// Web Push sender: credentials stay in Supabase Vault, accessed only via a service-role RPC.
// This endpoint deliberately disables gateway JWT checks to allow a signed Cron webhook;
// every request is authenticated here (Cron secret or verified Supabase user token).
const allowedOrigin = "https://willy19960422.github.io";
const headers = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-food-cron-key",
  "Content-Type": "application/json; charset=utf-8"
};
const json = (obj: unknown, status = 200) => new Response(JSON.stringify(obj), { status, headers });
const encodeB64 = (buf: Uint8Array) => btoa(String.fromCharCode(...buf)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const decodeB64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4-s.length%4)%4)), c => c.charCodeAt(0));
const safeEq = (a: string, b: string) => {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length,y.length); i++) diff |= (x[i]||0) ^ (y[i]||0);
  return diff === 0;
};
type Credentials = { private_key: string | null; cron_key: string | null };
type Delivery = { id: string; user_id: string; kind: string; title: string; body: string };
type PushRow = { endpoint: string; p256dh: string; auth_secret: string };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({error:"Method not allowed"},405);
  const sourceUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!sourceUrl || !serviceKey) return json({error:"Push server not configured"},503);
  const admin = createClient(sourceUrl, serviceKey, {auth:{autoRefreshToken:false,persistSession:false}});
  const { data: cred, error: credError } = await admin.rpc("food_push_credentials");
  const secrets = cred as Credentials | null;
  if (credError || !secrets?.private_key || !secrets.cron_key) {
    console.error("Push credentials unavailable",credError?.code || "");
    return json({error:"Push credentials unavailable"},503);
  }
  const {data: keyRow,error:keyError} = await admin.from("food_push_public_config").select("vapid_public_key").eq("singleton",true).single();
  if (keyError || !keyRow?.vapid_public_key) return json({error:"Push public key unavailable"},503);
  let jwk: JsonWebKey;
  try {
    const raw = decodeB64(String(keyRow.vapid_public_key));
    if(raw.length !== 65 || raw[0] !== 4) throw Error("Bad public key");
    jwk = { kty:"EC", crv:"P-256",
      x:encodeB64(raw.slice(1,33)), y:encodeB64(raw.slice(33,65)),
      d:secrets.private_key };
  } catch {
    return json({error:"Push key configuration invalid"},503);
  }

  const pushToUser = async (userId: string, title: string, body: string) => {
    const {data: subscriptions, error} = await admin.from("food_push_subscriptions")
      .select("endpoint,p256dh,auth_secret").eq("user_id",userId).limit(12);
    if(error) throw error;
    let delivered = 0, failed = 0;
    for (const row of (subscriptions || []) as PushRow[]) {
      try {
        await send(
          {endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth_secret}},
          JSON.stringify({title,body,url:"./",tag:"food-journal-"+title}),
          {vapid:jwk,subscriber:"https://willy19960422.github.io/food-app/",ttl:3600}
        );
        delivered++;
      } catch(e) {
        failed++;
        const code = Number((e as {statusCode?:number}).statusCode || 0);
        console.warn("Web Push failed",code || String(e).slice(0,150));
        if(code === 404 || code === 410) {
          await admin.from("food_push_subscriptions").delete().eq("endpoint",row.endpoint).eq("user_id",userId);
        }
      }
    }
    return {delivered,failed};
  };

  let payload: {action?:string} = {};
  try {payload = await req.json();} catch {return json({error:"Invalid JSON"},400);}
  if (payload.action === "cron") {
    const cronKey = req.headers.get("x-food-cron-key") || "";
    if(!cronKey || !safeEq(cronKey,secrets.cron_key)) return json({error:"Forbidden"},403);
    const {data:due,error} = await admin.rpc("food_push_claim_due");
    if(error){console.error("Unable to claim notifications",error.code);return json({error:"Unable to claim scheduled notifications"},500);}
    let sent=0,failed=0;
    for(const entry of (due || []) as Delivery[]){
      try{
        const result=await pushToUser(entry.user_id,entry.title,entry.body);
        const status=result.delivered>0?"sent":"failed";
        const {error:writeError}=await admin.from("food_push_delivery")
          .update({state:status,sent_at:status==="sent"?new Date().toISOString():null,error_message:status==="failed"?"沒有可用的推播端點":null})
          .eq("id",entry.id).eq("user_id",entry.user_id);
        if(writeError) console.error("Delivery status error",writeError.code);
        sent+=result.delivered;failed+=result.failed;
      }catch(e){
        failed++;
        console.error("Scheduled push send error",String(e).slice(0,180));
        await admin.from("food_push_delivery").update({state:"failed",error_message:"Push service failed"})
          .eq("id",entry.id).eq("user_id",entry.user_id);
      }
    }
    return json({ok:true,claimed:(due||[]).length,sent,failed});
  }
  if (payload.action === "test") {
    const auth = req.headers.get("authorization") || "";
    const match = /^Bearer\s+(.+)$/i.exec(auth);
    if (!match) return json({error:"Authentication required"},401);
    const {data:{user},error} = await admin.auth.getUser(match[1]);
    if(error || !user?.id) return json({error:"Session expired"},401);
    const {data:preference} = await admin.from("food_push_preferences").select("enabled")
      .eq("user_id",user.id).maybeSingle();
    if(!preference?.enabled) return json({error:"Notifications are not enabled"},409);
    const {data:allowed,error:limitError} = await admin.rpc("food_push_claim_test",{p_user_id:user.id});
    if(limitError) return json({error:"Test rate limit unavailable"},503);
    if(!allowed) return json({error:"Please wait 60 seconds before retrying"},429);
    try{
      const count=await pushToUser(user.id,"食養紀錄｜測試通知","通知設定成功！以後可以收到用餐提醒與每日摘要。");
      return json({ok:count.delivered>0,delivered:count.delivered,failed:count.failed},
        count.delivered>0?200:502);
    }catch(e){
      console.error("Test push failed",String(e).slice(0,180));
      return json({error:"Failed to send test push"},502);
    }
  }
  return json({error:"Unsupported action"},400);
});