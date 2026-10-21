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
  assert.ok(html.includes('FoodTaxonomy.typeOf(f)===currentConvenienceKind'));
  assert.ok(html.includes('FoodTaxonomy.typeOf(x)===currentConvenienceKind'));
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
    ["7-11關東煮炙燒雞胸肉","沙拉／健康餐"],
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

console.log("Food browser regression tests passed:",passed);
