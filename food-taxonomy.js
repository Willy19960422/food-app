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

  function canonicalCategory(value) {
    const cat=String(value||"");
    if(cat==="蛋白健康")return "超商鮮食";
    if(cat==="飲品"||cat==="點心零食")return "飲品點心";
    if(cat==="蛋豆肉")return "基礎食材";
    if(cat==="即食食品"||cat==="冷凍食品")return "即食／冷凍食品";
    return cat;
  }

  function isProteinHealth(item) {
    if(!item)return false;
    const tags=item.dietary_tags||item.dietaryTags||[];
    if(Array.isArray(tags)&&tags.includes("蛋白健康"))return true;
    if(item.cat==="蛋白健康"||item.category==="蛋白健康")return true;
    if(canonicalCategory(item.cat||item.category)!=="超商鮮食")return false;
    // Previously indexed complete catalog: this filter is only a discovery
    // convenience and does not imply official nutrient verification.
    return /增肌|蛋白餐|蛋白棒|雞胸|舒肥|健身|補力/.test(String(item.name||""))
      || (Number(item.p)>=20 && item.p!==null && item.p!==undefined && item.p!=="");
  }

  function matchesKind(item,kind) {
    if(!kind||kind==="all")return true;
    if(kind==="protein")return isProteinHealth(item);
    return typeOf(item)===kind;
  }

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

  // Product format and health characteristic are independent facets.
  // Curated product_type always takes precedence over name heuristics.
  function typeOf(item) {
    if(item && types.includes(item.product_type)) return item.product_type;
    const name=String((item && item.name)||"").replace(/^(7[-\\s]?11|7[-\\s]?ELEVEN|全家|萊爾富|OK超商)[\\s　-]*/i,"");
    const sub=String((item && (item.sub_category||item.subCat))||"");
    const text=name+" "+sub.replace(/7[-\\s]?11鮮食|全家鮮食|萊爾富鮮食|OK超商鮮食/gi,"");
    if(/熱壓|壓烤吐司|熱烤吐司|帕尼尼/i.test(text))return "熱壓吐司";
    if(/三明治|三文治|三角吐司|夾心吐司|總匯吐司/.test(text))return "三明治";
    if(/米漢堡/.test(text))return "飯糰";
    if(/漢堡|大亨堡|漢堡排堡|(?:起司|雞腿|牛肉|香雞|魚)堡/.test(text))return "漢堡";
    if(/御飯糰|御飯團|新極上|新極大/.test(text))return "御飯糰";
    if(/飯糰|飯團|壽司|手卷|手捲/.test(text))return "飯糰";
    if(/豆奶|豆乳|豆漿|牛奶|鮮乳|優酪乳|咖啡|拿鐵|奶茶|果汁|無糖茶|綠茶|紅茶|氣泡水|飲料|飲品/.test(text))return "飲品";
    if(/關東煮|茶葉蛋|地瓜|熱狗|雞球|雞塊|鹹酥|蒸蛋|魚板|炸雞|炸物|麻辣燙|湯品|雞排|滷味/.test(text))return "熱食小吃";
    // A meal can also be high-protein: packaging form determines the type.
    if(/便當|餐盒|飯盒|握便當|時蔬餐|燴飯|咖哩飯|丼飯|義大利麵|燉飯|炒飯|焗飯|丼|炒麵|涼麵|烏龍麵|鍋燒麵|焗烤|筆管麵|通心粉|雞肉飯|麻油雞飯|蓋飯|穀物飯|粥|麵食|蛋包飯|鐵板.*飯|雞腿排飯|米糕炊粉/.test(text))return "微波餐盒";
    if(/沙拉|生菜|雞胸|舒肥|蛋白棒|高蛋白|健身G肉|鮮蔬捲餅|蔬滿|藜麥毛豆嫩雞丁/.test(text))return "沙拉／健康餐";
    if(/麵包|可頌|貝果|蛋糕|泡芙|羅宋|菠蘿|蛋塔|蛋撻|甜甜圈|銅鑼燒|鬆餅|布丁|吐司|丹麥|派司|檸檬塔|水果塔|巧克力塔/.test(text))return "麵包／甜點";
    if(/燒烤|烤雞|雞排|雞胸|烤魚/.test(text))return "熱食小吃";
    return "其他鮮食";
  }

  const api = Object.freeze({brands:Object.freeze(brands),types:Object.freeze(types),brandOf,typeOf,canonicalCategory,isProteinHealth,matchesKind});
  root.FoodTaxonomy = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
