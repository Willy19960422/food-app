# 食養紀錄：未完整營養資料待核對清單

資料庫盤點日：2026-10-22；直接讀取 `public.food_catalog_candidates`。任何新資料入庫前，必須再以實際包裝版本確認。

## 補件成果
- 候選食品共 351 筆。起初 87 筆缺至少一項熱量／蛋白質／脂肪／碳水。
- 2026-10-22 第一批 6 筆與第二批 1 筆共完成 7 筆「有據補值」。
- 剩餘 **80 筆**：7-ELEVEN 63、全家 17。
- 本次沒有刪除已存在的數據、沒有將空值當成 0，也沒有自動將第三方數值標記官方驗證。
- 蛋白質與熱量可能有來源差異；標示值的不同版本不可無條件合併。

## 仍缺漏的 80 筆

| ID | 品牌 | 品名 | 類型 | 仍缺欄位 | 已登錄來源 |
|---:|---|---|---|---|---|
| 19 | 7-ELEVEN | 21Plus主廚烤雞時蔬餐 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx) |
| 35 | 7-ELEVEN | 香蒜烤雞鮮蔬餐盒 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430) |
| 51 | 7-ELEVEN | 豆酥烤魚鮮蔬餐盒 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx) |
| 803 | 7-ELEVEN | 21Plus私房功夫菜乾鍋雞便當 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 804 | 7-ELEVEN | Homeal x 壹番屋 奶油咖哩雞肉飯 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430) |
| 805 | 7-ELEVEN | Homeal x 日式牛丼 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430) |
| 806 | 7-ELEVEN | Homeal 奶香起司烤雞筆管麵 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 807 | 7-ELEVEN | Homeal 泰式綠咖哩雞肉飯 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 808 | 7-ELEVEN | Homeal 重量級日式牛丼 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 809 | 7-ELEVEN | Homeal牛肉歐姆蛋咖哩飯 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 810 | 7-ELEVEN | 一鍋燒-滑蛋嫩雞親子丼 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 812 | 7-ELEVEN | 嫩烤里肌多彩便當 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430) |
| 813 | 7-ELEVEN | 日式佛蒙特咖哩雞肉飯 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 814 | 7-ELEVEN | 日式雪花牛丼 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 815 | 7-ELEVEN | 星宇航空-雙醬雞排咖哩飯 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 816 | 7-ELEVEN | 極饗-四川風味麻辣豆腐飯 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430) |
| 817 | 7-ELEVEN | 極饗-奮起湖秘製滷排 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430) |
| 818 | 7-ELEVEN | 極饗-沙茶豬肉燴飯 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430) |
| 819 | 7-ELEVEN | 極饗-滑蛋牛肉燴飯 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430) |
| 820 | 7-ELEVEN | 極饗-炸豬排炒飯 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430) |
| 821 | 7-ELEVEN | 極饗-真飽米糕炊粉大雙拼 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430) |
| 822 | 7-ELEVEN | 極饗-蜜汁大雞排便當 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430) |
| 823 | 7-ELEVEN | 極饗-豪華秘製雙拼餐盒 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430) |
| 824 | 7-ELEVEN | 極饗-香腸雙拼便當 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430) |
| 825 | 7-ELEVEN | 極饗-馬上大吉(雞) 腿便當 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430) |
| 826 | 7-ELEVEN | 歐姆蛋包飯 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 827 | 7-ELEVEN | 歐姆蛋牛肉咖哩飯 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 828 | 7-ELEVEN | 爪哇咖哩豬肉飯 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 829 | 7-ELEVEN | 牛角-炙燒雙拼便當 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 830 | 7-ELEVEN | 牛角-牛豚大盛燒肉丼飯 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 831 | 7-ELEVEN | 牛角-蔥鹽炙燒豬肉便當 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 832 | 7-ELEVEN | 牛角-霜降牛燒肉便當 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 833 | 7-ELEVEN | 紅燒牛雙寶燴飯 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430) |
| 834 | 7-ELEVEN | 肉絲黃金蛋炒飯 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430) |
| 835 | 7-ELEVEN | 這不是滷肉飯 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 836 | 7-ELEVEN | 雙拼起司紅醬焗飯 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 837 | 7-ELEVEN | 頌丹樂-泰式打拋豬肉飯 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 838 | 7-ELEVEN | 香炸豬排歐姆蛋咖哩飯 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 839 | 7-ELEVEN | 香草岩鹽雞胸鮮蔬餐盒 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/3_Cuisine/index.aspx?vid=53430) |
| 840 | 7-ELEVEN | 黃金炸豬排玉子丼 | 微波餐盒 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/5_ForeignDishes/index.aspx?OpBrowser=1) |
| 1 | 7-ELEVEN | 肉鬆海苔新極大壽司 | 未分類 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/1_Ricerolls/) |
| 2 | 7-ELEVEN | 櫸木燻雞飯糰 | 未分類 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/1_Ricerolls/) |
| 3 | 7-ELEVEN | 新極上飯糰-煙燻銀鮭 | 未分類 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/1_Ricerolls/) |
| 4 | 7-ELEVEN | 新極上飯糰-炭烤銀鮭 | 未分類 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/1_Ricerolls/) |
| 5 | 7-ELEVEN | 新極上飯糰-炙烤鮭魚腹 | 未分類 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/1_Ricerolls/) |
| 6 | 7-ELEVEN | 新極上飯糰-炙燒明太子鮭魚 | 未分類 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/1_Ricerolls/) |
| 7 | 7-ELEVEN | 新極上飯糰-蔥鹽生鮭 | 未分類 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/1_Ricerolls/) |
| 8 | 7-ELEVEN | 新極上飯糰-天使紅蝦 | 未分類 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/1_Ricerolls/) |
| 9 | 7-ELEVEN | 新極上飯糰-鮭魚鮭魚卵 | 未分類 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/1_Ricerolls/) |
| 10 | 7-ELEVEN | 奮起湖秘製雙拼握便當 | 未分類 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/1_Ricerolls/) |
| 11 | 7-ELEVEN | 台鐵梅干扣肉握便當 | 未分類 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/1_Ricerolls/) |
| 12 | 7-ELEVEN | 海南雞飯糰 | 未分類 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/1_Ricerolls/) |
| 13 | 7-ELEVEN | 魚卵龍蝦風味沙拉飯糰 | 未分類 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/1_Ricerolls/) |
| 14 | 7-ELEVEN | 林聰明-雞肉飯飯糰 | 未分類 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/1_Ricerolls/) |
| 23 | 7-ELEVEN | 21Plus地中海風味雞肉麵沙拉 | 沙拉／健康餐 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/hot.aspx) |
| 24 | 7-ELEVEN | 21Plus主廚烤雞沙拉 | 沙拉／健康餐 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/hot.aspx) |
| 28 | 7-ELEVEN | 炙燒雞胸肉（關東煮） | 熱食小吃 | F、C | [來源頁](https://www.7-11.com.tw/freshfoods/7_Oden/) |
| 31 | 7-ELEVEN | 21Plus藜麥毛豆嫩雞丁 | 沙拉／健康餐 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/4_Snacks/index.aspx) |
| 34 | 7-ELEVEN | 雞肉蛋白棒-黑胡椒風味 | 沙拉／健康餐 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/4_Snacks/index.aspx) |
| 36 | 7-ELEVEN | 黑金松露嫩雞胸 | 沙拉／健康餐 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/4_Snacks/index.aspx) |
| 46 | 7-ELEVEN | 凱薩風味嫩雞鮮蔬捲餅 | 沙拉／健康餐 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/4_Snacks/index.aspx) |
| 52 | 7-ELEVEN | 博客海鹽嫩雞胸 | 沙拉／健康餐 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/4_Snacks/index.aspx) |
| 56 | 7-ELEVEN | 21xBEING Fit桃木燻雞胸 | 沙拉／健康餐 | P、F、C | [來源頁](https://www.7-11.com.tw/freshfoods/4_Snacks/index.aspx) |
| 22 | 全家 | 雞肉穀物飯 | 微波餐盒 | 熱量、F、C | [來源頁](https://www.family.com.tw/ESG/NewsShow?NSNO=202606300000178) |
| 27 | 全家 | 香烤鱈魚輕蔬餐盒 | 微波餐盒 | 熱量、F、C | [來源頁](https://www.cna.com.tw/news/afe/202608250307.aspx) |
| 29 | 全家 | 益活雞胸補力餐盒 | 微波餐盒 | 熱量、F、C | [來源頁](https://www.family.com.tw/Marketing/en/FreshFood/Product) |
| 44 | 全家 | 嫩烤魚排佐花椰菜義大利麵 | 微波餐盒 | 熱量、F、C | [來源頁](https://www.family.com.tw/Marketing/en/FreshFood/Product) |
| 47 | 全家 | 鮪魚穀物飯 | 微波餐盒 | 熱量、F、C | [來源頁](https://www.family.com.tw/ESG/NewsShow?NSNO=202606300000178) |
| 841 | 全家 | 卡波納拉義大利麵 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.family.com.tw/Marketing/zh/FreshFood/Product) |
| 842 | 全家 | 排骨蛋炒飯 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.family.com.tw/Marketing/zh/FreshFood/Product) |
| 843 | 全家 | 熊本麥味噌炸豬排丼飯 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.family.com.tw/Marketing/zh/FreshFood/Product) |
| 844 | 全家 | 義式蒜香鮮蝦義大利麵 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.family.com.tw/Marketing/zh/FreshFood/Product) |
| 845 | 全家 | 菌菇雞湯粥 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.family.com.tw/Marketing/zh/FreshFood/Product) |
| 846 | 全家 | 青醬烤雞焗飯 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.family.com.tw/Marketing/zh/FreshFood/Product) |
| 847 | 全家 | 韓式泡菜起司雞肉粥 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.family.com.tw/Marketing/zh/FreshFood/Product) |
| 848 | 全家 | 香料烤魚青醬燉飯 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.family.com.tw/Marketing/zh/FreshFood/Product) |
| 849 | 全家 | 香鮭蛋炒飯 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.family.com.tw/Marketing/zh/FreshFood/Product) |
| 850 | 全家 | 黑胡椒鐵板雞腿排飯 | 微波餐盒 | 熱量、P、F、C | [來源頁](https://www.family.com.tw/Marketing/zh/FreshFood/Product) |
| 18 | 全家 | 義美無加糖6.0高蛋白豆奶 | 飲品 | 熱量、F、C | [來源頁](https://www.family.com.tw/ESG/NewsShow?NSNO=202606300000178) |
| 48 | 全家 | 元初無加糖6.0高蛋白濃豆乳 | 飲品 | 熱量、F、C | [來源頁](https://www.family.com.tw/ESG/NewsShow?NSNO=202606300000178) |

## 人工核對流程與資料標準

1. **先確認商品版本**：品牌、完整品名、條碼、包裝重量、份量與販售年度。如果同名商品熱量不同，先視為不同版本，暫停改值。
2. **優先完整的官方包裝營養標示**：核對每份基準；可接受官方品牌標示、清晰的實體外包裝照片或可確認同版包裝的可信零售標示。
3. **第三方資料僅暫存與待核對**：公開頁面即使有四項數值，也不等同品牌查核完成；記錄來源網址與檢查日期，保留 `awaiting_full_label`。
4. **嚴禁熱量反推 P／F／C**：熱量並不能唯一決定蛋白質、脂肪與碳水。沒有證據就維持 `NULL`。
5. **登錄到既有後台**：食養紀錄 → 設定 → 帳號設定 →「候選食品營養補齊」，管理員輸入來源、對應基準及四項營養後，確認才可變更為可直接記錄。
6. **變更必須留跡**：保留來源與 `review_notes`；發布前後跑回歸測試及查詢實際 Supabase 值。

## 注意事項
- 這張清單是缺**數值**的候選商品，不表示既有 358 筆共用食品已完成營養正確性驗證。舊庫部分數值原為人工匯入或未審核資料，需要獨立稽核來源。
- 超商鮮食官網通常只列品名與熱量，完整 P／F／C 以包裝標示優先。
- 本次補件 SQL：`db/nutrition_evidence_backfill_20261022.sql`、`db/nutrition_evidence_backfill_20261022_wave2.sql`。
