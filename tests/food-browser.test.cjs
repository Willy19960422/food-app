"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const taxonomy= require("../food-taxonomy.js");
let passed=0;
function check(label,fn){fn();console.log("PASS",label);passed++;}
check("Existing full app inline scripts still parse",()=>{
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length>3);
  scripts.forEach((script,i)=>new vm.Script(script[1],{filename:"index-script-"+i}));
});
check("Legacy fixed-height/shrink constraints are overridden",()=>{
  assert.match(html,/#boxSelectFood \.food-list\{\s*max-height:none;overflow:visible;height:auto;/);
  assert.match(html,/#boxSelectFood \.food-list > \.food-card\{\s*flex:0 0 auto;flex-shrink:0;/);
  assert.match(html,/#boxSelectFood \.food-card:not\(\[style\*="display: block"\]\)\{\s*display:grid;grid-template-columns:minmax\(0,1fr\) auto;/);
  assert.match(html,/#boxSelectFood \.food-title\{[^}]*flex-wrap:wrap;/);
  assert.match(html,/#boxSelectFood \.macro-pills\{[^}]*flex-wrap:wrap;/);
  assert.match(html,/#boxSelectFood \.food-card > button\{[^}]*min-height:46px;/);
});
check("Main category is one compact native selector with direct convenience-store shortcuts",()=>{
  assert.ok(html.includes('id="foodMainSelect"'));
  for(const value of ["all","超商鮮食","brand:7-11鮮食","brand:全家鮮食","brand:萊爾富鮮食","brand:OK超商鮮食","連鎖餐飲","我的常用"]){
    assert.ok(html.includes('value="'+value+'"'),value);
  }
  assert.ok(html.includes('id="mainCatBar" aria-hidden="true"'));
  assert.match(html,/#boxSelectFood #mainCatBar\{display:none!important\}/);
});
check("Brand-to-type filters have a dedicated area and use complete lookup data",()=>{
  for(const id of ["convenienceTypePanel","convenienceTypeBar","convenienceTypeHint","foodContainer","subCatBar"]){
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  assert.ok(html.includes('FoodTaxonomy.matchesKind(f,currentConvenienceKind)'));
  assert.ok(html.includes('FoodTaxonomy.matchesKind(x,currentConvenienceKind)'));
  assert.ok(html.includes('renderConvenienceTypeBar(foods);'));
});
check("The product list shows at most 20 rows initially without losing Load more",()=>{
  assert.match(html,/let foodListLimit = 20;/);
  assert.ok((html.match(/foodListLimit \+= 20/g)||[]).length>=2);
  assert.ok(html.includes('載入更多'));
});
check("GTIN and existing navigation, appearance, barcode scripts are preserved",()=>{
  for(const name of ["food-taxonomy.js","ui-scale.js","barcode-v2.js","settings-menu.js","push-settings.js"]){
    assert.ok(html.includes(name),name);
  }
});
check("Brand classifier recognizes convenience sources rather than generic 7-11 string only",()=>{
  for(const [input,expected] of [
    [{brand:"7-ELEVEN",name:"鮭魚飯糰"},"7-ELEVEN"],
    [{name:"7-11 紅鮭御飯糰",subCat:"7-11鮮食"},"7-ELEVEN"],
    [{name:"全家 青醬義大利麵",subCat:"全家鮮食"},"全家"],
    [{brand:"萊爾富",name:"夾心飯糰"},"萊爾富"],
    [{name:"OK超商 鮪魚飯糰"},"OK超商"],
    [{name:"夜市肉圓",subCat:"夜市小吃"},""]
  ]) assert.equal(taxonomy.brandOf(input),expected,JSON.stringify(input));
});
check("7-ELEVEN product classifier distinguishes the requested food types",()=>{
  const cases=[
    ["7-11紅鮭御飯糰","御飯糰"],
    ["新極上飯糰-炭烤銀鮭","御飯糰"],
    ["櫸木燻雞飯糰","飯糰"],
    ["7-11經典奮起湖便當","微波餐盒"],
    ["全家肉醬義大利麵","微波餐盒"],
    ["全家雞蛋沙拉三明治","三明治"],
    ["7-11熱壓吐司","熱壓吐司"],
    ["7-11鮪魚起司漢堡","漢堡"],
    ["21Plus主廚烤雞沙拉","沙拉／健康餐"],
    ["7-11原味舒肥即食沙拉胸","沙拉／健康餐"],
    ["全家大納言紅豆麵包","麵包／甜點"],
    ["全家無加糖高蛋白豆奶","飲品"],
    ["7-11關東煮炙燒雞胸肉","熱食小吃"],
    ["7-11某新品無分類線索","其他鮮食"]
  ];
  for(const [name,kind] of cases)assert.equal(taxonomy.typeOf({name}),kind,name);
  assert.ok(taxonomy.types.includes("其他鮮食"));
});
check("Type choices contain no icons and display category-specific counts",()=>{
  assert.ok(html.includes('button.className="convenience-type-btn"'));
  assert.ok(html.includes('num.className="convenience-type-count"'));
  assert.ok(html.includes('button.disabled=kind!=="all" && count===0'));
  assert.ok(!/icon|svg/i.test(taxonomy.types.join("")));
});
check("Dynamic store-type UI counts items by brand and changes the selected kind",()=>{
  const a=html.indexOf("function renderConvenienceTypeBar(foods) {");
  const b=html.indexOf("function renderCatalogSection(",a);
  assert.ok(a>=0 && b>a);
  const panel={hidden:false,classList:{toggle:(_,v)=>panel.hidden=v}};
  const bar={children:[],replaceChildren(){this.children=[]},append(el){this.children.push(el)}};
  const context={
    window:{FoodTaxonomy:taxonomy},FoodTaxonomy:taxonomy,
    currentMainCat:"超商鮮食",currentSubCat:"7-11鮮食",currentConvenienceKind:"all",
    chosenFood:null,foodListLimit:20,
    foodCatalogCandidates:[{brand:"7-ELEVEN",category:"超商鮮食",name:"新極上飯糰-煙燻銀鮭",market_status:"confirmed_active"}],
    $:key=>({convenienceTypePanel:panel,convenienceTypeBar:bar,selectedFoodInfo:{classList:{add(){}}}})[key],
    catalogMatch:(item,cat)=>item.cat===cat,
    candidateHasCompleteDuplicate:()=>false,
    renderFoodList(){context.renders++},renders:0,
    document:{createElement(tag){return {tag,dataset:{},attributes:{},children:[],
      className:"",disabled:false,
      setAttribute(k,v){this.attributes[k]=String(v)},
      append(...els){this.children.push(...els)},
      addEventListener(name,handler){this["on"+name]=handler}
    }}}
  };
  vm.runInNewContext(html.slice(a,b),context);
  const foods=[
    {name:"7-11熟成御飯糰",cat:"超商鮮食",subCat:"7-11鮮食"},
    {name:"7-11雞肉微波便當",cat:"超商鮮食",subCat:"7-11鮮食"},
    {name:"全家鮪魚飯糰",cat:"超商鮮食",subCat:"全家鮮食"}
  ];
  context.renderConvenienceTypeBar(foods);
  assert.equal(panel.hidden,false);
  const counts=Object.fromEntries(bar.children.map(el=>[el.dataset.type,Number(el.children[1].textContent)]));
  assert.equal(counts.all,3);
  assert.equal(counts["御飯糰"],2);
  assert.equal(counts["微波餐盒"],1);
  assert.equal(counts["飯糰"],0);
  const selected=bar.children.find(x=>x.dataset.type==="御飯糰");
  selected.onclick();
  assert.equal(context.currentConvenienceKind,"御飯糰");
  assert.equal(context.renders,1);
  context.currentSubCat="全家鮮食";
  context.currentConvenienceKind="all";
  context.renderConvenienceTypeBar(foods);
  const family=Object.fromEntries(bar.children.map(el=>[el.dataset.type,Number(el.children[1].textContent)]));
  assert.equal(family.all,1);
  assert.equal(family["飯糰"],1);
  assert.equal(family["御飯糰"],0);
});


check("Protein-health categories remain inside store brands and are not top-level",()=>{
  const picker=html.slice(html.indexOf('<select id="foodMainSelect"'),html.indexOf("</select>",html.indexOf('<select id="foodMainSelect"')));
  assert.ok(!picker.includes('value="蛋白健康"'));
  assert.ok(picker.includes('value="brand:7-11鮮食"'));
  assert.ok(picker.includes('value="brand:全家鮮食"'));
  assert.ok(html.includes('makeButton("protein","蛋白健康系列"'));
  assert.ok(html.includes('dietary_tags'));
  assert.ok(html.includes('product_type'));
});
check("Protein-health is a facet, so protein meals are searchable inside microwave type too",()=>{
  const food={brand:"7-ELEVEN",category:"超商鮮食",name:"21Plus主廚烤雞時蔬餐",
    product_type:"微波餐盒",dietary_tags:["蛋白健康"],protein:null};
  assert.equal(taxonomy.brandOf(food),"7-ELEVEN");
  assert.equal(taxonomy.typeOf(food),"微波餐盒");
  assert.equal(taxonomy.matchesKind(food,"protein"),true);
  assert.equal(taxonomy.matchesKind(food,"微波餐盒"),true);
  assert.equal(taxonomy.matchesKind(food,"三明治"),false);
  const family={brand:"全家",category:"超商鮮食",name:"義美無加糖6.0高蛋白豆奶",
    product_type:"飲品",dietary_tags:["蛋白健康"]};
  assert.equal(taxonomy.brandOf(family),"全家");
  assert.equal(taxonomy.typeOf(family),"飲品");
  assert.equal(taxonomy.matchesKind(family,"protein"),true);
});
check("Legacy categories map to selectable parent groups without rewriting nutrition",()=>{
  for(const [legacy,canonical] of [
    ["蛋白健康","超商鮮食"],
    ["飲品","飲品點心"],["點心零食","飲品點心"],
    ["蛋豆肉","基礎食材"],
    ["即食食品","即食／冷凍食品"],["冷凍食品","即食／冷凍食品"],
    ["營養補充","營養補充"]]){
      assert.equal(taxonomy.canonicalCategory(legacy),canonical,legacy);
      assert.ok(html.includes('value="'+canonical+'"'),canonical);
  }
  assert.ok(html.includes('FoodTaxonomy.canonicalCategory(item.cat)===currentMainCat'));
});
check("Favorites retain original group when food is both favorite and a store item",()=>{
  assert.ok(html.includes('cat:f.cat || "我的常用"'));
  assert.ok(html.includes('const existing=(communityFoodsCache || []).find(v => v.name===f.name)'));
});
check("Official microwave names and curated food type are not falsely called verified nutrition",()=>{
  const sql=fs.readFileSync(path.join(root,"db/convenience_20261021_reclassify_and_meals.sql"),"utf8");
  assert.ok(sql.includes("n.kcal,NULL,NULL,NULL"));
  assert.ok(sql.includes("'awaiting_full_label'"));
  assert.ok(sql.includes("'unreviewed'"));
  assert.ok(sql.includes("'official_menu'"));
  assert.ok(sql.includes("NOT EXISTS"));
  assert.ok(sql.includes("dietary_tags"));
  assert.ok(sql.includes("product_type"));
  for(const name of ["雙拼起司紅醬焗飯","極饗-滑蛋牛肉燴飯","義式蒜香鮮蝦義大利麵",
    "黑胡椒鐵板雞腿排飯","菌菇雞湯粥"]){
    assert.ok(sql.includes(name),name);
  }
  for(const [name,kind] of [
    ["21Plus主廚烤雞時蔬餐","微波餐盒"],
    ["一鍋燒-滑蛋嫩雞親子丼","微波餐盒"],
    ["香鮭蛋炒飯","微波餐盒"],
    ["菌菇雞湯粥","微波餐盒"],
    ["燒肉烤米堡","飯糰"],
    ["炙燒雞胸肉（關東煮）","熱食小吃"]
  ])assert.equal(taxonomy.typeOf({name}),kind,name);
});

console.log("Food browser regression tests passed:",passed);
