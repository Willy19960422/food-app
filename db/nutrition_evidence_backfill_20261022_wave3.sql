-- 2026-10-22 第三批：元初豆坊 x 全家 6.0 高蛋白濃豆乳（無加糖）
-- 品牌官方產品介紹與營養標示圖，單瓶375ml，標示每100ml：
-- 熱量69.0kcal、蛋白質6.0g、脂肪3.8g、碳水2.7g。
-- 官方產品圖：https://www.dauling.com.tw/pages/daydaydauling
-- 另有盲飲會活動的每300ml熱量數字與官方標示不一致，
-- 因此保留 awaiting_full_label，後續核對實際瓶身版次。
BEGIN;
DO $verify$
DECLARE n integer;
BEGIN
 UPDATE public.food_catalog_candidates
 SET kcal=69.0,fat=3.8,carbs=2.7,
     source_name='元初豆坊 6.0 高蛋白濃豆乳原廠營養標示',
     source_url='https://www.dauling.com.tw/pages/daydaydauling',
     checked_at=CURRENT_DATE,
     review_notes=concat_ws(E'\n',NULLIF(review_notes,''),
       '[2026-10-22有據補件] 官方每100ml包裝標示 69.0 kcal / P6.0g / F3.8g / C2.7g；每瓶375ml。官方圖源 https://www.dauling.com.tw/pages/daydaydauling 。其他第三方活動的熱量換算與此標示有差異，因此尚未核准為唯一正式版本，請以實際瓶身標示再核實。')
 WHERE id=48 AND brand='全家' AND name='元初無加糖6.0高蛋白濃豆乳'
   AND basis='每100ml' AND protein=6
   AND kcal IS NULL AND fat IS NULL AND carbs IS NULL
   AND nutrition_status='awaiting_full_label';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'Expected one original matching FamilyMart Dauling item, got %',n; END IF;
END $verify$;
COMMIT;
