/* 食養紀錄食品分類：純前端顯示用分類，不改寫官方營養數值。
 * 用於「超商鮮食 → 品牌 → 商品類型」，舊資料 sub_category 多數只有品牌名稱。
 */
(function (root) {
  "use strict";

  const brands = [
    {key:"7-11鮮食", label:"7-ELEVEN", brand:"7-ELEVEN"},
    {key:"全家鮮食", label:"全家", brand:"全家"},
    {key:"萊爾富鮮食", label:"萊爾富", brand:"萊爾富"},
    {key:"OK超商鮮食", label:"OK 超商", brand:"OK超商"}
  ];

  const types = [
    "御飯糰",
    "飯糰",
    "微波餐盒",
    "三明治",
    "漢堡",
    "熱壓吐司",
    "沙拉／健康餐",
    "熱食小吃",
    "麵包／甜點",
    "飲品",
    "其他鮮食"
  ];

  function brandOf(item) {
    const raw = String((item && (item.brand || item.subCat || item.sub_category)) || "");
    const name = String((item && item.name) || "");
    const combined = raw + " " + name;
    if (/7[\s-]?11|7[\s-]?ELEVEN|統一超商/i.test(combined)) return "7-ELEVEN";
    if (/全家|familymart/i.test(combined)) return "全家";
    if (/萊爾富|hilife/i.test(combined)) return "萊爾富";
    if (/OK超商|OK\s*mart/i.test(combined)) return "OK超商";
    return "";
  }

  // Exact food type comes from name, not a guessed nutritional value.
  // More specific formats come before generic "鮮食" or "飯".
  function typeOf(item) {
    const name = String((item && item.name) || "").replace(/^(7[-\s]?11|7[-\s]?ELEVEN|全家|萊爾富|OK超商)[\s　-]*/i,"");
    const sub = String((item && (item.sub_category || item.subCat)) || "");
    const text = name + " " + sub.replace(/7[-\s]?11鮮食|全家鮮食|萊爾富鮮食|OK超商鮮食/gi,"");
    if (/熱壓|壓烤吐司|熱烤吐司|帕尼尼/i.test(text)) return "熱壓吐司";
    if (/三明治|三文治|三角吐司|夾心吐司|總匯吐司/.test(text)) return "三明治";
    if (/漢堡|大亨堡|漢堡排堡|(?:起司|雞腿|牛肉|香雞|魚)堡/.test(text)) return "漢堡";
    if (/御飯糰|御飯團|新極上|新極大/.test(text)) return "御飯糰";
    if (/飯糰|飯團|壽司|手卷|手捲|米漢堡/.test(text)) return "飯糰";
    if (/豆奶|豆乳|豆漿|牛奶|鮮乳|優酪乳|咖啡|拿鐵|奶茶|果汁|無糖茶|綠茶|紅茶|氣泡水|飲料|飲品/.test(text)) return "飲品";
    if (/沙拉|生菜|雞胸|舒肥|蛋白棒|高蛋白|健身G肉|鮮蔬捲餅|蔬滿/.test(text)) return "沙拉／健康餐";
    if (/便當|餐盒|飯盒|握便當|燴飯|咖哩飯|丼飯|義大利麵|燉飯|炒麵|涼麵|烏龍麵|鍋燒麵|焗烤|通心粉|雞肉飯|麻油雞飯|蓋飯|穀物飯/.test(text)) return "微波餐盒";
    if (/麵包|可頌|貝果|蛋糕|泡芙|羅宋|菠蘿|蛋塔|蛋撻|甜甜圈|銅鑼燒|鬆餅|布丁|吐司|丹麥|派司|塔/.test(text)) return "麵包／甜點";
    if (/關東煮|茶葉蛋|地瓜|熱狗|雞球|雞塊|鹹酥|蒸蛋|魚板|炸雞|炸物|烤雞|燒烤|麻辣燙|湯品|雞排|滷味/.test(text)) return "熱食小吃";
    return "其他鮮食";
  }

  const api = Object.freeze({brands:Object.freeze(brands),types:Object.freeze(types),brandOf,typeOf});
  root.FoodTaxonomy = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
