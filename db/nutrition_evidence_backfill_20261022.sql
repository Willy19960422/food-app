-- 食養紀錄 / 2026-10-22：實證補值（6筆）
-- 只補有可信來源的缺失欄位。不從熱量反推；不自行補0；不刪資料。
-- P/F/C 基準須與每份／每顆一致，且商品名稱、品牌、原熱量相同。
-- 原有數值優先保留。來源尚無單一一致官方完整標示，全部維持 awaiting_full_label。
-- 準則：兩家資訊來源吻合的 KFC／21Plus，兩份官方標示 F/C 相同的義美。
BEGIN;
DO $verify$
DECLARE updated_count integer;
BEGIN
  WITH evidence(id,brand,name,expected_kcal,protein,fat,carbs,details) AS (
    VALUES
    (30, '7-ELEVEN', '21Plus剝皮辣椒雞胸肉', 163, 30.2, 4.1, 1.4, '2025 140g 增量款：163.3 kcal、P30.2g、F4.1g、C1.4g；既存官網熱量四捨五入 163 kcal。資料來自 FatSecret 品項及 140g 包裝開箱，非 7-ELEVEN 官方完整營養表；100g 舊款營養不同，須以實際包裝再次核對。 證據：https://www.fatsecret.cn/热量营养/7-11/剝皮辣椒風味雞胸肉/1份 ; https://woman.udn.com/woman/story/123162/8853469'),
    (192, '肯德基', '香酥脆薯（小）', 203, 3.3, 8.4, 28.7, 'KFC 香酥脆薯小份（74g）203kcal、P3.3、F8.4、C28.7；日日營養與 Nuli 獨立彙整數值一致。屬第三方轉載，不提升為官方營養標示。 證據：https://dailydietitian.com.tw/肯德基熱量圖鑑/ ; https://nuli.app/blog/kfc-diet-guide/'),
    (209, '肯德基', '香酥脆薯（大）', 393, 6.3, 16.2, 55.5, 'KFC 香酥脆薯大份（143g）393kcal、P6.3、F16.2、C55.5；日日營養與 Nuli 獨立彙整數值一致。屬第三方轉載，不提升為官方營養標示。 證據：https://dailydietitian.com.tw/肯德基熱量圖鑑/ ; https://nuli.app/blog/kfc-diet-guide/'),
    (225, '肯德基', '香酥脆薯（中）', 288, 4.6, 11.9, 40.7, 'KFC 香酥脆薯中份（105g）288kcal、P4.6、F11.9、C40.7；日日營養與 Nuli 獨立彙整數值一致。屬第三方轉載，不提升為官方營養標示。 證據：https://dailydietitian.com.tw/肯德基熱量圖鑑/ ; https://nuli.app/blog/kfc-diet-guide/'),
    (537, '義美', 'W PROTEIN FIT 雞胸肉韭菜水餃', 35.25, 2.875, 0.375, 5.1, '義美官方兩版本每4顆 88g 均為脂肪1.5g、碳水20.4g，故以每1顆基準補 F=1.5/4=0.375g、C=20.4/4=5.1g。官方頁在熱量與蛋白質上有 141kcal/P11.5g vs 143kcal/P12g 版本差異，原欄位保留不覆蓋；須核對實際包裝。 證據：https://imec.imeifoods.com.tw/products/biomedimei-w-protein-fit-dumpling-chinesechives ; https://cdn-general.cybassets.com/s/files/11940/ckeditor/pictures/content_2302ff42-3cdd-4338-b165-b2c721914a9f.png'),
    (538, '義美', 'W PROTEIN FIT 雞胸肉高麗菜水餃', 36.25, 2.75, 0.4, 5.4, '義美官方兩版本每4顆 88g 均為脂肪1.6g、碳水21.6g，故以每1顆基準補 F=1.6/4=0.4g、C=21.6/4=5.4g。官方頁在熱量與蛋白質上有 145kcal/P11.1g vs 147kcal/P11.5g 版本差異，原欄位保留不覆蓋；須核對實際包裝。 證據：https://www.biomedimei.com/products/wproteinfit-dumplings-chicken-16pieces ; https://imec.imeifoods.com.tw/products/biomedimei-w-protein-fit-dumpling-chicken')
  )
  UPDATE public.food_catalog_candidates AS c
  SET protein=COALESCE(c.protein,e.protein),
      fat=COALESCE(c.fat,e.fat),
      carbs=COALESCE(c.carbs,e.carbs),
      checked_at=CURRENT_DATE,
      review_notes=CASE
        WHEN COALESCE(c.review_notes,'') LIKE '%[2026-10-22有據補件]%'
          THEN c.review_notes
        ELSE concat_ws(E'\n',NULLIF(c.review_notes,''),'[2026-10-22有據補件] '||e.details)
      END
  FROM evidence e
  WHERE c.id=e.id AND c.brand=e.brand AND c.name=e.name
    AND c.kcal=e.expected_kcal
    AND (c.protein IS NULL OR c.protein=e.protein)
    AND (c.fat IS NULL OR c.fat=e.fat)
    AND (c.carbs IS NULL OR c.carbs=e.carbs)
    AND c.nutrition_status='awaiting_full_label';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count<>6 THEN
    RAISE EXCEPTION 'Nutrition evidence guards passed for % rows, expected 6; no changes committed',updated_count;
  END IF;
END $verify$;
COMMIT;
