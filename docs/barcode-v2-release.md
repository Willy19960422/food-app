# 食養紀錄條碼 v2｜部署與驗收紀錄（2026-10-21）

## 部署拓撲與版本
- 正式前端：GitHub Pages 主線 main。先以 feature/barcode-v2-20261021 分支與 PR #11 隔離。
- Supabase food-app 專案：增量遷移 barcode_v2_review_cache_rls、barcode_v2_pending_corrections、barcode_v2_external_rate_budget。
- Edge Function：food-barcode-lookup v3（JWT 驗證開啟），先部署後再切換前端。
- GitHub Actions：Barcode v2 checks，含語法、條碼校驗、資料缺值、RLS 規則、模擬查詢操作測試。

## 本次實際處理項目
- EAN-8、UPC-A、EAN-13、GTIN-14 長度及檢查碼；舊食品內部 ID 不受影響。
- Open Food Facts 由 Edge Function 查詢，不再由瀏覽器直連公共 API；外部資料以來源及授權標記快取。
- 缺失營養保留 null，不自動填 0，也不允許缺值商品被當成完整數值記錄。
- 新商品寫入 food_product_submissions 待審核；本人可修正，但不可自行核准或修改別人的資料。
- 不再因掃到商品就將外部資料自動寫進 custom_foods。
- 收緊 custom_foods 舊版過寬的讀取／新增政策；保留所有既有商品與飲食紀錄。
- 手動輸入、回報商品錯誤、拍照辨識後確認、立即記錄與只送審兩種流程。
- 防止上一張營養照片的遲到 AI 回應覆蓋新條碼的資料。
- 外部查詢上限：每分鐘最多 10 個未快取請求，保留公共 API 原本 15 次／分鐘／IP 的緩衝。
- 真實 0（例如純水）仍是 0，未知必須保持空白。

## 發版驗收清單
1. GitHub Actions barcode-tests 通過，PR HEAD 與測試 SHA 相同。
2. food_product_submissions 的 RLS：匿名不能讀、使用者不能改審核狀態。
3. Edge Function ACTIVE，verify_jwt=true，快取／限流只允許服務端寫入。
4. 在 iPhone PWA 實測：相機掃碼、手動輸入、無效條碼、查無商品、資料缺欄、拍營養標示與提交。
5. 測重複提交、重新掃描、切換登入、離線／逾時、單位換算以及返回今日。
6. 確認飲食紀錄仍在，通知、設定、歷史與搜尋頁面沒有回歸。
7. 測試通過才合併 PR；合併後比對部署頁面的腳本版本與 Edge 日誌。

## 如何處理待審商品
可在 Supabase Table Editor 的 food_product_submissions 篩選 status=pending。
逐筆核對條碼、品名、包裝規格、營養標示來源、重複條碼。
審核通過前，不可把申請直接標為官方完整營養。
完成人工複核後，管理員以受控後台或 SQL 交易先將確認品項寫入 custom_foods，
然後更新提交狀態為 approved。資料缺欄保留 pending，來源矛盾可 rejected。
本版提供資料隔離與待審清單，但尚未提供可視化審核後台與照片長期保存。
AI OCR 僅用於填寫前的輔助辨識，不是自動驗證。

## 已知限制
- 既有非數字食品內部 ID 仍可在非掃碼模式使用，掃碼只接受標準 GTIN。
- 舊食品多數標記 legacy_unreviewed；不應視為官方複核。
- Open Food Facts 資料為 ODbL 授權，需要保留來源並遵守授權規定。
- 尚未自動填補 39 筆缺乏完整官方營養表的候選食品；不得虛構數值。
- 公共資料來源忙碌／超時時，可手動提交，不會把查詢失敗誤報成不存在。
- 自動化測試不等於真實 iOS 相機或登入完整流程測試。

## 回滾程序
- 主線合併前：關閉 PR，正式前端不受該分支影響。
- 合併後有重大前端錯誤：Revert PR 合併提交，恢復前一版 HTML 與 script 引用。
- 回復前端時不刪任何使用者提交或既有飲食紀錄。
- Edge Function 可保留，舊版前端不會調用；需要時才按版本回滾。
- Supabase 新表及提交資料保留不 DROP；安全性較嚴格的 RLS 原則上不回退。
