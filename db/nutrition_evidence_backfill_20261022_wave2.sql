-- 第二批 / 2026-10-22：7-ELEVEN 增雞蛋白餐
-- FatSecret 的獨立商品資料與另一份餐點營養整理完整一致：
-- 1份353g / 595kcal / 蛋白質31.1g / 脂肪20.1g / 碳水72.4g。
-- 非 7-ELEVEN 官方完整包裝查驗，故不得升級 source_quality 或 nutrition_status。
BEGIN;
DO $verify$
DECLARE n integer;
BEGIN
 UPDATE public.food_catalog_candidates
 SET protein=31.1,fat=20.1,carbs=72.4,checked_at=CURRENT_DATE,
  review_notes=concat_ws(E'\n',NULLIF(review_notes,''),
    '[2026-10-22有據補件] 7-ELEVEN 增雞蛋白餐：每份353g，595kcal、P31.1g、F20.1g、C72.4g；兩份獨立彙整數字相符，尚非品牌官方包裝驗證。證據：https://www.fatsecret.cn/热量营养/7-11/增雞蛋白餐/1份 ； https://uptogo.com.tw/美食/7-11減脂/'),
  nutrition_status='awaiting_full_label'
 WHERE id=811 AND brand='7-ELEVEN' AND name='增雞蛋白餐' AND kcal=595
   AND protein IS NULL AND fat IS NULL AND carbs IS NULL
   AND nutrition_status='awaiting_full_label';
 GET DIAGNOSTICS n = ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'Expected precisely one original awaiting item, found %; rolled back',n; END IF;
END $verify$;
COMMIT;
