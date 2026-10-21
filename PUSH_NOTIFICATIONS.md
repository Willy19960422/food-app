# 食養紀錄｜PWA Web Push 通知系統 v1

更新日期：2026-10-21

## 功能

- 設定頁提供早餐 09:00、午餐 13:00、晚餐 19:00、每日營養摘要 21:00（可以自訂時間與開關）。
- 通知預設停用；使用者須主動啟用並授予 iPhone 或瀏覽器通知權限。
- iPhone 需 iOS 16.4 以上，並安裝 PWA 至主畫面。
- 每分鐘依台灣時間檢查一次；同一天同餐別使用唯一約束去重。
- 已經雲端同步的餐別不再提醒；尚未同步的資料可能無法判斷是否已記錄。
- 每日摘要僅計算雲端已同步的當日熱量及蛋白質。
- 使用者可傳送測試通知；每帳號 60 秒限一次。
- 登出時解除裝置的推播訂閱。

## 架構與權限

- 前端：index.html、push-settings.js、sw.js。
- 可公開的 Supabase RLS 資料表：food_push_preferences、food_push_subscriptions、food_push_public_config。除公開金鑰外，使用者只能管理自身資料。
- 僅服務角色可存取：food_push_delivery、food_push_test_limits。
- Supabase Vault 管理兩個秘密：food_webpush_vapid_private、food_webpush_cron_key，不得寫入 GitHub、公開 SQL、前端程式。
- Supabase Edge Function：food-push，以 Web Push 協定傳輸；加密實作為 jsr:@daaku/webpush@0.2.0。
- 函式的 Gateway verify_jwt=false 是為了接收 Cron；函式內每次仍必須自行驗證使用者 JWT 或受保護的 Cron 密鑰。
- pg_cron + pg_net：排程 food-journal-webpush-every-minute，每分鐘執行一次。
- 每個 user_id、kind、local_date 最多建立一筆發送紀錄。

## 必須的實機驗證

1. 在 iPhone 主畫面啟動食養紀錄。
2. 設定 → 用餐提醒與每日摘要 → 啟用手機通知，允許 iOS 權限。
3. 點選傳送測試通知，觀察鎖定畫面或通知中心。
4. 調整時間並儲存，確認通知可在 APP 不開啟時送達。
5. 紀錄早餐後確認同日早餐不再提醒。
6. 登出、停用、切換帳號時不應收到舊帳號通知。

## 已知限制

- Web Push 不保證必達或準點，系統設定、專注模式、網路及電池狀態會影響接收。
- 初版尚未實作發送失敗的自動重試。
- 首版僅支援台灣時區；未來再擴充其他時區。
- 舊有 90 天飲食紀錄顯示及同步競態問題尚未在本次變更中修復。
- 所有新增功能需經手機實測，不得僅憑 GitHub Actions 部署成功即宣稱 iPhone 推播已實測。
