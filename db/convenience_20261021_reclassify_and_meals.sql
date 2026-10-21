-- 2026-10-21: normalize convenience brand as category, health as a cross-cutting tag.
-- This script is additive and preserves all original macro data and source provenance.
-- All new candidate products were observed on the linked brands' official product pages.
-- Product name and possibly kcal are sourced; missing protein/fat/carbs stay NULL.

BEGIN;
ALTER TABLE public.food_catalog_candidates
  ADD COLUMN IF NOT EXISTS dietary_tags text[] NOT NULL DEFAULT ARRAY[]::text[];
ALTER TABLE public.food_catalog_candidates
  ADD COLUMN IF NOT EXISTS product_type text;
COMMENT ON COLUMN public.food_catalog_candidates.dietary_tags
  IS 'Food discovery facets, independent of category and brand. Never imply verified nutrition.';
COMMENT ON COLUMN public.food_catalog_candidates.product_type
  IS 'Curated display format; not proof of a complete nutrient label or current store availability.';

-- This group must be exactly the 20 convenience-store rows found in the pre-migration audit.
DO $assert$
DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.food_catalog_candidates
  WHERE category='蛋白健康' AND brand IN ('7-ELEVEN','全家');
  IF cnt NOT IN (0,20) THEN
    RAISE EXCEPTION 'Unexpected number of legacy protein-health candidate rows: %',cnt;
  END IF;
  IF EXISTS(SELECT 1 FROM public.food_catalog_candidates WHERE category='蛋白健康'
       AND brand NOT IN ('7-ELEVEN','全家')) THEN
    RAISE EXCEPTION 'Unrecognized health category brand: review required';
  END IF;
END $assert$;
UPDATE public.food_catalog_candidates
SET category='超商鮮食',
    dietary_tags=CASE WHEN dietary_tags @> ARRAY['蛋白健康']::text[] THEN dietary_tags
      ELSE array_append(dietary_tags,'蛋白健康') END,
    product_type=CASE
      WHEN name ~ '(豆乳|豆奶|豆漿|牛奶)' THEN '飲品'
      WHEN name ~ '(關東煮)' THEN '熱食小吃'
      WHEN name ~ '(餐盒|便當|時蔬餐|穀物飯|義大利麵)' AND name !~ '(麵沙拉)' THEN '微波餐盒'
      WHEN name ~ '(沙拉|鮮蔬捲餅|雞胸|蛋白棒|藜麥毛豆嫩雞丁)' THEN '沙拉／健康餐'
      ELSE '其他鮮食'
    END
WHERE category='蛋白健康' AND brand IN ('7-ELEVEN','全家');

-- One user-visible record per (brand, normalized name): no duplicate reimport.
-- Existing custom_foods and user's diet logs are untouched.
LOCK TABLE public.food_catalog_candidates IN SHARE ROW EXCLUSIVE MODE;
WITH observed (brand,name,kcal,source_url) AS (
  VALUES
    ('7-ELEVEN','雙拼起司紅醬焗飯',684,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','Homeal 奶香起司烤雞筆管麵',569,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','這不是滷肉飯',406,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','歐姆蛋牛肉咖哩飯',666,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','一鍋燒-滑蛋嫩雞親子丼',613,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','黃金炸豬排玉子丼',629,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','香炸豬排歐姆蛋咖哩飯',727,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','頌丹樂-泰式打拋豬肉飯',575,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','歐姆蛋包飯',498,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','日式雪花牛丼',669,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','星宇航空-雙醬雞排咖哩飯',764,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','爪哇咖哩豬肉飯',553,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','增雞蛋白餐',595,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','牛角-炙燒雙拼便當',614,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','日式佛蒙特咖哩雞肉飯',795,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','Homeal 泰式綠咖哩雞肉飯',NULL,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','Homeal 重量級日式牛丼',NULL,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','Homeal牛肉歐姆蛋咖哩飯',NULL,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','牛角-蔥鹽炙燒豬肉便當',NULL,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','牛角-霜降牛燒肉便當',NULL,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','21Plus私房功夫菜乾鍋雞便當',NULL,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','牛角-牛豚大盛燒肉丼飯',NULL,'https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1'),
    ('7-ELEVEN','香草岩鹽雞胸鮮蔬餐盒',NULL,'https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430'),
    ('7-ELEVEN','極饗-四川風味麻辣豆腐飯',655,'https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430'),
    ('7-ELEVEN','極饗-炸豬排炒飯',807,'https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430'),
    ('7-ELEVEN','極饗-真飽米糕炊粉大雙拼',NULL,'https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430'),
    ('7-ELEVEN','極饗-蜜汁大雞排便當',NULL,'https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430'),
    ('7-ELEVEN','嫩烤里肌多彩便當',NULL,'https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430'),
    ('7-ELEVEN','極饗-滑蛋牛肉燴飯',580,'https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430'),
    ('7-ELEVEN','極饗-奮起湖秘製滷排',NULL,'https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430'),
    ('7-ELEVEN','肉絲黃金蛋炒飯',616,'https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430'),
    ('7-ELEVEN','極饗-馬上大吉(雞) 腿便當',701,'https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430'),
    ('7-ELEVEN','紅燒牛雙寶燴飯',574,'https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430'),
    ('7-ELEVEN','極饗-沙茶豬肉燴飯',684,'https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430'),
    ('7-ELEVEN','Homeal x 壹番屋 奶油咖哩雞肉飯',592,'https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430'),
    ('7-ELEVEN','Homeal x 日式牛丼',497,'https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430'),
    ('7-ELEVEN','極饗-香腸雙拼便當',701,'https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430'),
    ('7-ELEVEN','極饗-豪華秘製雙拼餐盒',715,'https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430'),
    ('全家','黑胡椒鐵板雞腿排飯',NULL,'https://www.family.com.tw/Marketing/zh/FreshFood/Product'),
    ('全家','香料烤魚青醬燉飯',NULL,'https://www.family.com.tw/Marketing/zh/FreshFood/Product'),
    ('全家','義式蒜香鮮蝦義大利麵',NULL,'https://www.family.com.tw/Marketing/zh/FreshFood/Product'),
    ('全家','卡波納拉義大利麵',NULL,'https://www.family.com.tw/Marketing/zh/FreshFood/Product'),
    ('全家','熊本麥味噌炸豬排丼飯',NULL,'https://www.family.com.tw/Marketing/zh/FreshFood/Product'),
    ('全家','韓式泡菜起司雞肉粥',NULL,'https://www.family.com.tw/Marketing/zh/FreshFood/Product'),
    ('全家','菌菇雞湯粥',NULL,'https://www.family.com.tw/Marketing/zh/FreshFood/Product'),
    ('全家','排骨蛋炒飯',NULL,'https://www.family.com.tw/Marketing/zh/FreshFood/Product'),
    ('全家','香鮭蛋炒飯',NULL,'https://www.family.com.tw/Marketing/zh/FreshFood/Product'),
    ('全家','青醬烤雞焗飯',NULL,'https://www.family.com.tw/Marketing/zh/FreshFood/Product')
),
new_rows AS (
  SELECT o.*,
    row_number() OVER (ORDER BY o.brand,o.name) AS rn
  FROM observed o
  WHERE NOT EXISTS (
    SELECT 1 FROM public.food_catalog_candidates c
    WHERE c.brand=o.brand
      AND lower(regexp_replace(c.name,'[[:space:]　_\\-]+','','g'))
        = lower(regexp_replace(o.name,'[[:space:]　_\\-]+','','g'))
  )
),
base AS (SELECT COALESCE(MAX(id),0) maxid FROM public.food_catalog_candidates)
INSERT INTO public.food_catalog_candidates
  (id,brand,name,category,sub_category,kcal,protein,fat,carbs,basis,
   source_name,source_url,checked_at,nutrition_status,market_status,last_seen_at,
   review_due_at,source_quality,review_notes,unit_type,product_type,dietary_tags)
SELECT b.maxid+n.rn,
  n.brand,n.name,'超商鮮食',
  CASE WHEN n.brand='7-ELEVEN' THEN '7-11鮮食' ELSE '全家鮮食' END,
  n.kcal,NULL,NULL,NULL,'每份',
  CASE WHEN n.brand='7-ELEVEN' THEN '7-ELEVEN 小七食堂官方商品頁'
       ELSE '全家便利商店官方鮮食新品頁' END,
  n.source_url,CURRENT_DATE,'awaiting_full_label','unreviewed',
  CURRENT_DATE,(CURRENT_DATE + INTERVAL '3 months')::date,
  'official_menu',
  '官方商品頁確認品名；若頁面列出熱量僅填熱量。蛋白質、脂肪、碳水尚缺完整包裝營養標示，勿將缺值填0；上市與供應狀態依各店與包裝再核對。',
  'serving','微波餐盒',ARRAY[]::text[]
FROM new_rows n CROSS JOIN base b;
COMMIT;
