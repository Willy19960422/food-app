/* Food browser v3 | layered navigation + compact product cards.
 * Presentation only: uses the existing food catalog, candidate provenance,
 * account-specific favorites, and the existing food quantity bottom sheet.
 */
(function () {
  "use strict";
  const root=document.getElementById("foodBrowserV3");
  const box=document.getElementById("boxSelectFood");
  const results=document.getElementById("foodContainer");
  const input=document.getElementById("foodSearch");
  if(!root||!box||!results||!input)return;

  const heading=document.getElementById("foodV3Heading");
  const trail=document.getElementById("foodV3Trail");
  const back=document.getElementById("foodV3Back");
  const tiles=document.getElementById("foodV3Tiles");
  const note=document.getElementById("foodV3Note");
  const categories=[
    ["超商鮮食","超商鮮食"],["連鎖餐飲","連鎖餐飲"],
    ["咖啡輕食","咖啡與輕食"],["餃類點心","水餃・鍋貼"],
    ["夜市小吃","夜市小吃"],["好市多","好市多"],
    ["外食餐飲","外食餐飲"],["基礎食材","基礎食材"],
    ["飲品點心","飲品／點心"],["即食／冷凍食品","即食／冷凍食品"],
    ["營養補充","營養補充"]
  ];
  const brandCategories=new Set(["超商鮮食","連鎖餐飲","咖啡輕食","餃類點心"]);
  const pageSize=12;
  let ctx=null;
  const state={category:null,brand:null,kind:null,special:null,page:1,query:""};

  function categoryOf(item){
    const raw=item.cat===undefined?item.category:item.cat;
    const category=ctx.taxonomy.canonicalCategory(raw);
    // Older official foods were flattened into 外食餐飲 on import. Keep
    // McDonald's/KFC/etc. reachable under the original chain-restaurant menu.
    if(category==="外食餐飲" && item.cat!==undefined){
      const brand=ctx.detectBrand(item);
      if((ctx.subCategories["連鎖餐飲"]||[]).includes(brand))return "連鎖餐飲";
    }
    return category;
  }
  function itemBrand(item){
    if(categoryOf(item)==="超商鮮食"){
      return ctx.taxonomy.brandOf(item);
    }
    if(item.brand)return String(item.brand);
    return ctx.detectBrand(item) || String(item.subCat||item.sub_category||"");
  }
  function itemKind(item){
    if(state.category==="超商鮮食")return ctx.taxonomy.typeOf(item);
    if(state.category==="餃類點心")return ctx.dumplingKindOf(item);
    return String(item.subCat||item.sub_category||"");
  }
  function validNumber(value){
    return value!==null && value!==undefined && value!=="" &&
      Number.isFinite(Number(value)) && Number(value)>=0;
  }
  function fullKnown(item){
    return ["k","p","f","c"].every(key=>validNumber(item[key]));
  }
  function fullCandidate(item){
    return ["kcal","protein","fat","carbs"].every(key=>validNumber(item[key]));
  }
  function collected(){
    if(!ctx)return[];
    const a=[];
    for(const item of ctx.known){
      a.push({type:"known",item,name:String(item.name||""),
        category:categoryOf(item),brand:itemBrand(item),
        recordable:fullKnown(item),verified:false});
    }
    for(const item of ctx.candidates){
      if(ctx.isDuplicate(item))continue;
      if(item.market_status==="discontinued" && !state.query)continue;
      a.push({type:"candidate",item,name:ctx.candidateName(item),
        category:categoryOf(item),brand:itemBrand(item),
        recordable:ctx.isOfficial(item),verified:ctx.isOfficial(item)});
    }
    return a;
  }
  function fullText(row){
    const item=row.item;
    return [row.name,row.brand,row.category,item.barcode,item.subCat,item.sub_category,item.product_type,
      row.brand==="7-ELEVEN"?"7-11 711 統一超商":null,
      row.brand==="全家"?"familymart":null,
      ...(Array.isArray(item.dietary_tags)?item.dietary_tags:[])]
      .filter(Boolean).join(" ").toLocaleLowerCase();
  }
  function recentRows(all){
    const days=Object.keys(ctx.logs||{}).sort().reverse();
    const found=[],used=new Set();
    for(const day of days){
      const entries=Array.isArray(ctx.logs[day])?ctx.logs[day]:[];
      for(let i=entries.length-1;i>=0;i--){
        const entry=entries[i];if(!entry||!entry.name)continue;
        const name=String(entry.name);
        const identity=name.replace(/[（(](?:每份|每顆|[^）)]*g|[^）)]*ml)[）)]\s*$/,"").trim();
        if(used.has(identity))continue;
        const match=all.find(row=>row.type==="known" &&
          (row.name===identity || name===row.name ||
          name.startsWith(row.name+"（") || name.startsWith(row.name+" (")));
        if(match){
          used.add(identity);found.push(match);
        }else if(["k","p","f","c"].every(k=>validNumber(entry[k]))){
          // Historical rows are per-serving inputs, not multiplied totals.
          used.add(identity);
          found.push({type:"recent",item:{
            name:identity,basis:"每份",basisType:"serving",
            k:Number(entry.k),p:Number(entry.p),f:Number(entry.f),c:Number(entry.c),
            cat:"我的常用",subCat:"最近吃過"
          },name:identity,category:"我的常用",brand:"",recordable:true,verified:false});
        }
        if(found.length>=12)return found;
      }
    }
    return found;
  }
  function mode(){
    if(state.query)return"search";
    if(state.special)return"products";
    if(!state.category)return"home";
    if(brandCategories.has(state.category) && state.brand===null)return"brands";
    if(state.category==="超商鮮食" && state.kind===null)return"kinds";
    if(state.category==="餃類點心" && state.kind===null)return"kinds";
    const subs=ctx?.subCategories?.[state.category]||[];
    if(!brandCategories.has(state.category) && subs.length>1 && state.kind===null)return"kinds";
    return"products";
  }
  function displayCategory(cat){
    return categories.find(x=>x[0]===cat)?.[1]||cat;
  }
  function displayBrand(brand){
    const store=ctx.taxonomy.brands.find(x=>x.brand===brand);
    return store?.label||brand;
  }
  function displayKind(kind){
    return kind==="all"?"全部品項":
      kind==="protein"?"蛋白健康系列":kind;
  }
  function setRoute(fields){
    Object.assign(state,fields,{page:1});
    refresh();
    input.scrollIntoView({behavior:"auto",block:"start"});
    heading.focus({preventScroll:true});
  }
  function returnTo(step){
    if(state.query){
      input.value="";state.query="";state.page=1;
      if(step==="search"){refresh();return;}
    }
    if(step==="home")return setRoute({category:null,brand:null,kind:null,special:null});
    if(step==="category")return setRoute({brand:null,kind:null,special:null});
    if(step==="brand")return setRoute({kind:null,special:null});
  }
  function routeParts(){
    const parts=[{label:"全部分類",step:"home"}];
    if(state.special){
      parts.push({label:state.special==="recent"?"最近吃過":"我的常用",step:"current"});
    }else if(state.category){
      parts.push({label:displayCategory(state.category),step:"category"});
      if(state.brand!==null)parts.push({label:displayBrand(state.brand),step:"brand"});
      if(state.kind!==null)parts.push({label:displayKind(state.kind),step:"current"});
    }
    if(state.query)parts.push({label:"搜尋結果",step:"current"});
    return parts;
  }
  function drawHeader(current){
    trail.replaceChildren();
    const parts=routeParts();
    parts.forEach((part,index)=>{
      if(index){
        const sep=document.createElement("span");
        sep.className="food-v3-separator";sep.textContent="›";sep.setAttribute("aria-hidden","true");
        trail.append(sep);
      }
      if(index===parts.length-1){
        const now=document.createElement("span");now.className="food-v3-current";
        now.textContent=part.label;now.setAttribute("aria-current","page");trail.append(now);
      }else{
        const button=document.createElement("button");button.type="button";
        button.className="food-v3-crumb";button.textContent=part.label;
        button.addEventListener("click",()=>returnTo(part.step));trail.append(button);
      }
    });
    if(state.query)heading.textContent="搜尋結果";
    else heading.textContent=({
      home:"想吃什麼？",brands:"選擇品牌",kinds:"選擇食品種類",products:"挑選食品"
    })[current]||"挑選食品";
    back.hidden=current==="home";
    back.textContent=state.query?"清除搜尋・返回":
      current==="brands"?"返回分類":
      current==="kinds"?"返回品牌":"返回上一層";
    note.textContent=current==="home"?"先選分類，或直接搜尋品名與品牌。":
      current==="brands"?"選擇品牌後才會顯示該品牌商品種類。":
      current==="kinds"?"依食品種類縮小範圍；「蛋白健康」是特色篩選，不代表已完成營養驗證。":"";
    note.hidden=!note.textContent;
  }
  function makeTile(label,count,action,extra){
    const b=document.createElement("button");b.type="button";
    b.className="food-v3-tile";
    const name=document.createElement("span");name.className="food-v3-tile-name";name.textContent=label;
    const detail=document.createElement("span");detail.className="food-v3-tile-count";
    detail.textContent=extra || (count==null?"":count+" 筆");
    b.append(name,detail);
    b.disabled=count===0;
    b.addEventListener("click",action);
    return b;
  }
  function showTiles(items,columns){
    tiles.hidden=false;tiles.className="food-v3-tiles food-v3-"+columns;
    tiles.replaceChildren(...items);
    results.replaceChildren();
  }
  function routeFilter(row){
    if(state.special==="favorites")return row.type==="known" && row.item.isFav;
    if(state.category && row.category!==state.category){
      const isExtraNight = state.category==="夜市小吃" &&
        row.category==="外食餐飲" && row.item.subCat==="台式小吃";
      const isCostcoPiece = state.category==="餃類點心" &&
        row.category==="好市多" && row.item.unit_type==="piece";
      if(!isExtraNight&&!isCostcoPiece)return false;
    }
    if(state.brand!==null && state.brand!=="all" && row.brand!==state.brand &&
       String(row.item.subCat||row.item.sub_category||"")!==state.brand)return false;
    if(state.kind!==null && state.kind!=="all"){
      if(state.category==="超商鮮食"){
        if(!ctx.taxonomy.matchesKind(row.item,state.kind))return false;
      }else if(itemKind(row.item)!==state.kind)return false;
    }
    return true;
  }
  function getEntries(all){
    if(state.special==="recent")return recentRows(all);
    if(state.special==="favorites")return all.filter(row=>row.type==="known" && row.item.isFav);
    if(state.query){
      const q=state.query;
      return all.filter(row=>fullText(row).includes(q))
        .sort((a,b)=>(Number(b.recordable)-Number(a.recordable))||
        a.name.localeCompare(b.name,"zh-Hant"));
    }
    return all.filter(routeFilter).sort((a,b)=>
      (Number(b.recordable)-Number(a.recordable)) ||
      a.name.localeCompare(b.name,"zh-Hant"));
  }
  function productCard(row){
    const item=row.item;
    const card=document.createElement("div");card.className="food-v3-card";
    const button=document.createElement("button");button.type="button";
    button.className="food-v3-card-main";
    const name=document.createElement("span");name.className="food-v3-product-name";name.textContent=row.name;
    const status=document.createElement("span");status.className="food-v3-product-status";
    status.textContent=row.type==="candidate"?
      row.verified?"官方完整營養":
      fullCandidate(item)?"數值待複核":"營養待補・需核對":
      item.dataQuality==="legacy_unreviewed"?"既有數值・來源待核對":
      row.type==="recent"?"最近記錄":"既有食品";
    const kcal=document.createElement("span");kcal.className="food-v3-kcal";
    const val=row.type==="candidate"?item.kcal:item.k;
    kcal.textContent=validNumber(val)?String(Math.round(Number(val)*10)/10)+" kcal":"熱量待補";
    const macros=document.createElement("div");macros.className="food-v3-macros";
    for(const [label,key] of [["P",row.type==="candidate"?"protein":"p"],
      ["F",row.type==="candidate"?"fat":"f"],
      ["C",row.type==="candidate"?"carbs":"c"]]){
      const col=document.createElement("span");col.className="food-v3-macro";
      const title=document.createElement("span");title.textContent=label;title.className="food-v3-macro-label";
      const value=document.createElement("span");value.className="food-v3-macro-value";
      value.textContent=validNumber(item[key])?(Math.round(Number(item[key])*10)/10)+"g":"—";
      col.append(title,value);macros.append(col);
    }
    const action=document.createElement("span");action.className="food-v3-card-action";
    action.textContent=row.recordable?"調整份量":"查看並補齊";
    button.append(name,status,kcal,macros,action);
    button.addEventListener("click",()=>{
      if(row.type==="candidate"){
        if(ctx.isOfficial(item))ctx.chooseKnown(ctx.candidateToFood(item));
        else ctx.chooseCandidate(item);
      }else if(fullKnown(item)){
        ctx.chooseKnown(item);
      }else{
        window.alert("此筆食品還缺少完整的營養資訊，請透過手動自訂補齊。");
      }
    });
    card.append(button);
    if(row.type==="candidate" && /^https:\/\/[^\s]+$/i.test(item.source_url||"")){
      const a=document.createElement("a");a.href=item.source_url;
      a.target="_blank";a.rel="noopener noreferrer";a.className="food-v3-source";
      a.textContent="查看資料來源";card.append(a);
    }
    return card;
  }
  function showProducts(all){
    tiles.hidden=true;tiles.replaceChildren();
    const rows=getEntries(all);
    const pages=Math.max(1,Math.ceil(rows.length/pageSize));
    state.page=Math.max(1,Math.min(pages,state.page));
    const start=(state.page-1)*pageSize;
    results.replaceChildren();
    results.classList.add("food-v3-results");
    const info=document.createElement("div");info.className="food-v3-summary";
    const knownCount=rows.filter(x=>x.recordable).length;
    info.textContent="共 "+rows.length+" 筆・可直接選取 "+knownCount+" 筆";
    results.append(info);
    if(!ctx.candidateLoaded || ctx.candidateError){
      const loading=document.createElement("p");loading.className="mute";
      loading.textContent=ctx.candidateError?"部分商品資料載入失敗，顯示已取得的食品。":"其他商品資料載入中…";
      results.append(loading);
    }
    if(!rows.length){
      const empty=document.createElement("div");empty.className="food-v3-empty";
      empty.textContent="目前沒有符合條件的食品，請改選種類或直接搜尋。";
      results.append(empty);return;
    }
    const grid=document.createElement("div");grid.className="food-v3-product-grid";
    rows.slice(start,start+pageSize).forEach(row=>grid.append(productCard(row)));
    results.append(grid);
    if(pages>1){
      const pager=document.createElement("div");pager.className="food-v3-pagination";
      pager.setAttribute("role","navigation");
      pager.setAttribute("aria-label","食品清單分頁");
      const prev=document.createElement("button");prev.type="button";prev.textContent="上一頁";
      prev.disabled=state.page<=1;
      const next=document.createElement("button");next.type="button";next.textContent="下一頁";
      next.disabled=state.page>=pages;
      const counter=document.createElement("span");counter.textContent=state.page+" / "+pages;
      counter.setAttribute("aria-live","polite");
      prev.addEventListener("click",()=>pageTo(state.page-1));
      next.addEventListener("click",()=>pageTo(state.page+1));
      pager.append(prev,counter,next);results.append(pager);
    }
  }
  function pageTo(page){
    state.page=page;
    refresh();
    results.scrollIntoView({block:"start",behavior:"auto"});
  }
  function stageTiles(current,all){
    results.classList.remove("food-v3-results");
    if(current==="home"){
      const top=[];
      const recent=recentRows(all);
      top.push(makeTile("最近吃過",recent.length,()=>setRoute({
        special:"recent",category:null,brand:null,kind:null
      }),"快速選擇"));
      const fav=all.filter(x=>x.type==="known"&&x.item.isFav);
      top.push(makeTile("我的常用",fav.length,()=>setRoute({
        special:"favorites",category:null,brand:null,kind:null
      }),"快速選擇"));
      for(const [key,label] of categories){
        const total=all.filter(x=>x.category===key).length;
        top.push(makeTile(label,total,()=>setRoute({
          category:key,brand:null,kind:null,special:null
        })));
      }
      showTiles(top,"two");return;
    }
    if(current==="brands"){
      let brands=[];
      if(state.category==="超商鮮食"){
        brands=ctx.taxonomy.brands.map(b=>[b.brand,b.label]);
      }else{
        const subs=(ctx.subCategories[state.category]||[]).filter(x=>x!=="全部"&&x!=="全部子類");
        brands=subs.map(x=>[x,x]);
      }
      // Non-store brands may have items under their own label beyond static list.
      const observed=all.filter(x=>x.category===state.category)
        .map(x=>x.brand).filter(Boolean);
      for(const label of observed){
        if(!brands.some(x=>x[0]===label))brands.push([label,label]);
      }
      const rows=all.filter(x=>x.category===state.category);
      // Convenience stores have exactly four brands: one compact 2×2 screen.
      // Other multi-brand categories retain an optional "all brands" shortcut.
      const options=state.category==="超商鮮食"?[]:[makeTile("全部品牌",rows.length,()=>setRoute({
        brand:"all",kind:state.category==="餃類點心"?null:"all"
      }))];
      for(const [key,label] of brands){
        const count=rows.filter(x=>x.brand===key).length;
        if(count===0 && state.category!=="超商鮮食")continue;
        options.push(makeTile(label,count,()=>setRoute({
          brand:key,kind:null
        })));
      }
      showTiles(options,"two");return;
    }
    if(current==="kinds"){
      const rows=all.filter(x=>x.category===state.category &&
        (state.brand===null || state.brand==="all" || x.brand===state.brand));
      let kinds=[];
      if(state.category==="超商鮮食"){
        const health=rows.filter(x=>ctx.taxonomy.isProteinHealth(x.item)).length;
        if(health)kinds.push(["protein","蛋白健康系列"]);
        kinds.push(...ctx.taxonomy.types.map(x=>[x,x]));
      }else if(state.category==="餃類點心"){
        kinds=["水餃","煎餃／鍋貼","小籠包","蒸餃","湯包／湯餃"].map(x=>[x,x]);
      }else{
        const subs=ctx.subCategories[state.category]||[];
        kinds=subs.filter(x=>x!=="全部"&&x!=="全部子類").map(x=>[x,x]);
      }
      const options=[makeTile("全部品項",rows.length,()=>setRoute({kind:"all"}))];
      for(const [kind,label] of kinds){
        const count=rows.filter(x=>kind==="protein"?
          ctx.taxonomy.isProteinHealth(x.item):
          state.category==="超商鮮食"?
            ctx.taxonomy.typeOf(x.item)===kind:
            state.category==="餃類點心"?
              ctx.dumplingKindOf(x.item)===kind:
              String(x.item.subCat||x.item.sub_category||"")===kind).length;
        if(count>0)options.push(makeTile(label,count,()=>setRoute({kind})));
      }
      showTiles(options,"three");
    }
  }
  function render(data){
    ctx=data;
    const typed=input.value.trim().toLocaleLowerCase();
    if(typed!==state.query){state.query=typed;state.page=1;}
    const current=mode();
    drawHeader(current);
    const all=collected();
    if(current==="products"||current==="search")showProducts(all);
    else stageTiles(current,all);
    return true;
  }
  function refresh(){
    if(typeof renderFoodList==="function")renderFoodList();
    else if(ctx)render(ctx);
  }
  back.addEventListener("click",()=>{
    if(state.query){
      input.value="";state.query="";state.page=1;
      refresh();return;
    }
    const current=mode();
    if(current==="products"){
      if(state.special)return returnTo("home");
      if(state.kind!==null)return returnTo("brand");
      if(state.brand!==null)return returnTo("category");
      return returnTo("home");
    }
    if(current==="kinds"){
      if(brandCategories.has(state.category))return returnTo("category");
      return returnTo("home");
    }
    if(current==="brands")return returnTo("home");
    return returnTo("home");
  });
  window.foodBrowserV3={render,ready:true,reset(){
    state.category=null;state.brand=null;state.kind=null;state.special=null;state.page=1;
    state.query="";input.value="";refresh();
  }};
  box.classList.add("food-browser-v3-enabled");
  refresh();
})();