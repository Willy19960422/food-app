/* 食養紀錄 barcode v2: independent controller; previous barcode handlers removed from index.html.
 * Never treat unavailable nutrition values as zero or publish unchecked foods to the shared catalog.
 */
let barcodeV2SourceUrl = null;
let barcodeV2PhotoUsed = false;
let barcodeV2SubmissionId = null;
let barcodeV2Submitting = false;

function isValidScanBarcode(code) {
  const s = String(code || "").trim();
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(s)) return false;
  let sum = 0, weight = 1;
  for (let i = s.length - 1; i >= 0; i--) {
    sum += Number(s[i]) * weight;
    weight = weight === 1 ? 3 : 1;
  }
  return sum % 10 === 0;
}
function barcodeV2Numeric(id) {
  const raw = $(id).value.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
function barcodeV2ShowStatus(message) { $("scanMsg").textContent = message || ""; }
function barcodeV2SetField(id,value) {
  $(id).value = value === null || value === undefined ? "" : String(value);
}
function barcodeV2Prefill(candidate) {
  const data = candidate || {};
  barcodeV2SetField("nName",data.name || "");
  barcodeV2SetField("nBrand",data.brand || "");
  barcodeV2SetField("nK",data.kcal === undefined ? data.k : data.kcal);
  barcodeV2SetField("nP",data.protein === undefined ? data.p : data.protein);
  barcodeV2SetField("nF",data.fat === undefined ? data.f : data.fat);
  barcodeV2SetField("nC",data.carbs === undefined ? data.c : data.carbs);
  const serving = data.serving_quantity === undefined ? data.servingWeight : data.serving_quantity;
  barcodeV2SetField("nServingQty",serving > 0 ? serving : null);
  $("nServingUnit").value = data.serving_unit || data.weightUnit || "g";
  const basis = data.basis_type || data.basisType || "serving";
  $("nB").value = basis === "100g" ? "每100g" : basis === "100ml" ? "每100ml" : "每份";
  $("nCat").value = data.category || "超商鮮食";
  barcodeV2SetField("nSubCat",data.sub_category || "");
}
function barcodeV2Complete(data) {
  return [data.kcal,data.protein,data.fat,data.carbs]
    .every(value => value !== null && value !== undefined && Number.isFinite(Number(value)));
}
function barcodeV2ToFood(data) {
  const basis = data.basis_type || "serving";
  return {
    name:data.name,
    basis:basis === "100g" ? "每100g" : basis === "100ml" ? "每100ml" : "每份",
    basisType:basis,
    servingWeight:Number(data.serving_quantity) || 0,
    weightUnit:data.serving_unit || "g",
    k:Number(data.kcal),p:Number(data.protein),f:Number(data.fat),c:Number(data.carbs)
  };
}

async function fetchOpenFoodFacts(barcode) {
  const {data:{session}} = await sbClient.auth.getSession();
  if (!session) throw new Error("請先登入後再查詢商品。");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(),12000);
  try {
    const response = await fetch(SB_URL + "/functions/v1/food-barcode-lookup", {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer " + session.access_token
      },
      body:JSON.stringify({barcode:barcode}),
      signal:controller.signal
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (result.error === "INVALID_BARCODE") throw new Error("條碼檢查碼不正確，請重新輸入。");
      if (result.error === "SOURCE_BUSY") throw new Error("外部食品資料目前忙碌，請稍後再試。");
      throw new Error("外部食品查詢暫時無法使用。");
    }
    return result;
  } catch(error) {
    if (error.name === "AbortError") throw new Error("查詢超時，請檢查網路或稍後重試。");
    throw error;
  } finally { clearTimeout(timeout); }
}

async function lookup(code) {
  const seq = ++lookupSequenceId;
  const targetUid = currentUser ? currentUser.id : null;
  const targetSession = loginSessionId;
  const barcode = String(code || "").trim();
  const active = () => seq === lookupSequenceId &&
    loginSessionId === targetSession && currentUser && currentUser.id === targetUid;
  if (!isValidScanBarcode(barcode)) {
    $("scanLoading").classList.add("hide");
    $("lookBtn").disabled = false;
    barcodeV2ShowStatus("條碼格式不正確。請輸入有效的 8、12、13 或 14 位商品條碼並檢查末位數字。");
    return;
  }
  if (!targetUid || !sbClient) { barcodeV2ShowStatus("請先登入再查詢食品。"); return; }

  stopScan();
  curBarcode = barcode;
  curItem = null;
  barcodeV2SourceUrl = null;
  barcodeV2PhotoUsed = false;
  barcodeV2SubmissionId = null;
  $("manual").value = barcode;
  $("lookBtn").disabled = true;
  $("scanLoading").classList.remove("hide");
  $("found").classList.add("hide");
  $("newForm").classList.add("hide");
  $("submitProductStatus").textContent = "";
  barcodeV2ShowStatus("正在查詢商品資料…");
  let food = null, source = "", draft = null, external = null;
  let lookupError = "", localReadError = false;
  try {
    try {
      const {data,error} = await sbClient.from("custom_foods")
        .select("*").eq("barcode",barcode).maybeSingle();
      if (error) throw error;
      if (!active()) return;
      let matched = data;
      if (!matched) {
        const alias = await sbClient.from("food_barcode_aliases")
          .select("canonical_barcode").eq("alias_barcode",barcode).maybeSingle();
        if (alias.error) throw alias.error;
        if (alias.data && alias.data.canonical_barcode) {
          const canonical = await sbClient.from("custom_foods")
            .select("*").eq("barcode",alias.data.canonical_barcode).maybeSingle();
          if (canonical.error) throw canonical.error;
          matched = canonical.data;
        }
      }
      if (!active()) return;
      if (matched) {
        food = {
          name:matched.name,basis:matched.basis || "每份",basisType:matched.basis_type || "serving",
          servingWeight:Number(matched.serving_weight) || 0,weightUnit:"g",
          k:Number(matched.kcal),p:Number(matched.protein),
          f:Number(matched.fat),c:Number(matched.carbs)
        };
        source = matched.is_verified && matched.data_quality !== "legacy_unreviewed"
          ? "已審核共用食品" : "既有食品（營養來源待複核，請核對包裝）";
      }
    } catch(error) {
      console.warn("Barcode local catalog lookup failed",error);
      localReadError = true;
    }
    if (!active()) return;
    if (!food) {
      try {
        const pending = await sbClient.from("food_product_submissions")
          .select("id,barcode,name,brand,category,sub_category,kcal,protein,fat,carbs,basis_type,serving_quantity,serving_unit,source_url")
          .eq("barcode",barcode).eq("user_id",targetUid).eq("status","pending").maybeSingle();
        if (pending.error) throw pending.error;
        draft = pending.data;
        if (draft) {
          barcodeV2SubmissionId = draft.id;
          if (barcodeV2Complete(draft)) {
            food = barcodeV2ToFood(draft);
            source = "我的待審核商品（尚未加入共用食品庫）";
          }
        }
      } catch(error) {
        console.warn("Barcode pending submission lookup failed",error);
        localReadError = true;
      }
    }
    if (!active()) return;
    if (!food) {
      try {
        external = await fetchOpenFoodFacts(barcode);
        barcodeV2SourceUrl = external.source_url || null;
        if (external.state === "complete" && external.item) {
          food = external.item;
          source = external.source_name || "Open Food Facts 公共資料";
          if (external.stale) source += "（快取待更新）";
        }
      } catch(error) { lookupError = error.message || "外部查詢服務暫時無法使用。"; }
    }
    if (!active()) return;
    curItem = food;
    $("found").classList.toggle("hide",!food);
    $("newForm").classList.toggle("hide",!!food);

    if (!food) {
      barcodeV2Prefill(draft || (external && external.state === "incomplete" ? external.item : null));
      let hint = lookupError ? lookupError + " 可以依包裝內容手動建檔並送審。" :
        draft ? "你已提交此商品，可補齊資料並更新審核申請。" :
        external && external.state === "incomplete" ?
        "找到商品名稱，但營養資訊不完整。缺少的數字保留空白，請核對包裝標示。" :
        "目前查無商品資料。你可以拍攝營養標示或手動建立商品。";
      if (localReadError) hint += "（部分本地資料查詢失敗）";
      barcodeV2ShowStatus(hint);
      return;
    }

    const display = value => value === null || value === undefined ? "待確認" : String(value);
    $("fSrc").textContent = source;
    $("fName").textContent = food.name;
    $("fInfo").textContent = (food.basis || "每份") + " " + display(food.k) + " 大卡・蛋白質 " +
      display(food.p) + " g・脂肪 " + display(food.f) + " g・碳水 " + display(food.c) + " g" +
      (food.servingWeight ? "（每份 " + food.servingWeight + (food.weightUnit || "g") + "）" : "");
    $("fTag").textContent = "條碼：" + barcode;
    const is100 = food.basisType === "100g" || food.basisType === "100ml";
    const hasWeight = Number(food.servingWeight) > 0;
    $("calcModeWeight").classList.toggle("hide",!(is100 || hasWeight));
    $("weightInputLabel").textContent = is100 ?
      (food.basisType === "100ml" ? "實際食用容量（ml，每100ml基準）" :
        "實際食用重量（g，每100g基準）") :
      "實際食用重量／容量（" + (food.weightUnit || "g") + "，每份 " + food.servingWeight + (food.weightUnit || "g") + "）";
    $("serv").value = 1;
    $("actualWeightInput").value = is100 ? 100 : hasWeight ? food.servingWeight : "";
    setScanCalcMode("serv");
    document.querySelectorAll("#servChips .serving-chip").forEach(chip=>{
      chip.classList.toggle("active",chip.dataset.v === "1");
    });
    barcodeV2ShowStatus(localReadError ? "已找到商品；部分本地資料查詢異常。" : "");
  } catch(error) {
    console.error("Barcode lookup unexpected error",error);
    barcodeV2ShowStatus("商品查詢發生異常，請重新輸入條碼或稍後再試。");
    $("newForm").classList.remove("hide");
    barcodeV2Prefill(null);
  } finally {
    if (active()) {
      $("scanLoading").classList.add("hide");
      $("lookBtn").disabled = false;
    }
  }
}

$("lookBtn").onclick = () => lookup($("manual").value);
$("manual").addEventListener("keydown",event=>{
  if(event.key === "Enter"){event.preventDefault();lookup($("manual").value);}
});

$("addBtn").onclick = async () => {
  if (!currentUser || S.stateOwnerId !== currentUser.id || !curItem) return;
  const item = Object.assign({},curItem);
  let multiplier = 1, label = item.name + "（" + (item.basis || "每份") + "）";
  if (scanCalcMode === "serv") {
    multiplier = Number($("serv").value);
    if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 100) {
      alert("請輸入有效的食用份數（0～100）。"); return;
    }
  } else {
    const amount = Number($("actualWeightInput").value);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
      alert("請輸入有效的食用重量或容量。"); return;
    }
    if (item.basisType === "100g" || item.basisType === "100ml") {
      multiplier = amount / 100;
    } else if (Number(item.servingWeight) > 0) {
      multiplier = amount / Number(item.servingWeight);
    } else {
      alert("此商品沒有可換算的份量基準，請改用份數。"); return;
    }
    label = item.name + "（" + amount + (item.weightUnit || "g") + "）";
  }
  $("addBtn").disabled = true;
  try {
    await addLog({name:label,k:item.k,p:item.p,f:item.f,c:item.c},multiplier);
    $("found").classList.add("hide");
    showView("today");
  } finally { $("addBtn").disabled = false; }
  // Do not publish external records merely because the user scanned or logged them.
};

$("photoBtn").onclick = () => $("photo").click();
$("photo").onchange = async event => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const seq = ++photoSequenceId;
  const userId = currentUser ? currentUser.id : null;
  const sessionId = loginSessionId;
  $("photoLoading").classList.remove("hide");
  $("photoBtn").disabled = true;
  barcodeV2ShowStatus("");
  try {
    const result = await callGeminiVision(
      '你是營養標示逐字讀取助理。只擷取照片實際看得到的欄位，不得猜測。回傳JSON：{"name":null,"basis":null,"k":null,"p":null,"f":null,"c":null}。未知請保持null，不可填0；每100ml請標為每100ml。',file);
    if (seq !== photoSequenceId || !currentUser || currentUser.id !== userId || loginSessionId !== sessionId) return;
    barcodeV2PhotoUsed = true;
    if (result && typeof result.name === "string" && result.name.trim()) $("nName").value = result.name.trim();
    if (result.basis === "每100g" || result.basis === "每100ml") $("nB").value = result.basis;
    else if (result.basis === "每份") $("nB").value = "每份";
    const values = [["nK","k"],["nP","p"],["nF","f"],["nC","c"]];
    values.forEach(([id,key])=>{
      const value = result ? result[key] : null;
      if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
        $(id).value = "";
      } else { $(id).value = String(value); }
    });
    barcodeV2ShowStatus("已填入照片中辨識到的營養資訊；請逐欄核對，未辨識欄位會保持空白。");
  } catch(error) {
    if (seq === photoSequenceId && loginSessionId === sessionId) barcodeV2ShowStatus("營養標示辨識失敗：" + error.message);
  } finally {
    if (seq === photoSequenceId) {
      $("photoLoading").classList.add("hide");
      $("photoBtn").disabled = false;
      event.target.value = "";
    }
  }
};

function barcodeV2ReadSubmission() {
  const name = $("nName").value.trim(), brand = $("nBrand").value.trim();
  const basisText = $("nB").value;
  const basisType = basisText === "每100g" ? "100g" : basisText === "每100ml" ? "100ml" : "serving";
  const qty = barcodeV2Numeric("nServingQty");
  return {
    name:name,brand:brand || null,
    category:$("nCat").value || "超商鮮食",
    sub_category:$("nSubCat").value.trim() || null,
    basis_type:basisType,
    serving_quantity:basisType === "serving" ? qty : null,
    serving_unit:basisType === "serving" && qty !== null ? $("nServingUnit").value : null,
    kcal:barcodeV2Numeric("nK"),protein:barcodeV2Numeric("nP"),
    fat:barcodeV2Numeric("nF"),carbs:barcodeV2Numeric("nC"),
    source_type:barcodeV2PhotoUsed ? "label_ocr" : "manual",
    source_url:barcodeV2SourceUrl
  };
}
function barcodeV2ValidateSubmission(row) {
  if (!isValidScanBarcode(curBarcode)) return "條碼不正確，請重新掃描。";
  if (row.name.length < 2 || row.name.length > 200) return "商品名稱需為 2～200 個字。";
  if (row.serving_quantity !== null && (row.serving_quantity <= 0 || row.serving_quantity > 100000)) {
    return "每份重量或容量必須大於 0。";
  }
  for (const [name,max] of [["kcal",3500],["protein",300],["fat",300],["carbs",300]]) {
    if (row[name] !== null && (row[name] < 0 || row[name] > max)) return name + " 超出合理範圍。";
  }
  return "";
}
async function barcodeV2Submit(row) {
  if (barcodeV2Submitting) return {ok:false,message:"正在提交，請勿重複點擊。"};
  const problem = barcodeV2ValidateSubmission(row);
  if (problem) return {ok:false,message:problem};
  if (!currentUser || S.stateOwnerId !== currentUser.id) return {ok:false,message:"請先登入。"};
  const userId = currentUser.id, sessionId = loginSessionId;
  const barcode = curBarcode;
  barcodeV2Submitting = true;
  $("saveNew").disabled = true;
  $("submitProductBtn").disabled = true;
  $("submitProductStatus").textContent = "正在送交商品資料…";
  try {
    let response;
    if (barcodeV2SubmissionId) {
      response = await sbClient.from("food_product_submissions")
        .update(row).eq("id",barcodeV2SubmissionId).eq("status","pending").select("id").single();
    } else {
      response = await sbClient.from("food_product_submissions")
        .insert(Object.assign({user_id:userId,barcode:barcode,status:"pending"},row))
        .select("id").single();
    }
    if (!currentUser || currentUser.id !== userId || loginSessionId !== sessionId) {
      return {ok:false,message:"登入狀態已改變，請重新確認。"};
    }
    if (response.error) {
      if (response.error.code === "23505") {
        return {ok:false,duplicate:true,message:"這個商品已有待審核申請；請重新查詢後修改。"};
      }
      throw response.error;
    }
    barcodeV2SubmissionId = response.data.id;
    $("submitProductStatus").textContent = "已送交待審核清單；審核通過前不會加入所有人的共用食品庫。";
    return {ok:true};
  } catch(error) {
    console.warn("Barcode submission failed",error);
    const text = "送審失敗，請檢查網路後重試。";
    $("submitProductStatus").textContent = text;
    return {ok:false,message:text};
  } finally {
    barcodeV2Submitting = false;
    $("saveNew").disabled = false;
    $("submitProductBtn").disabled = false;
  }
}

$("submitProductBtn").onclick = async () => {
  const row = barcodeV2ReadSubmission();
  const result = await barcodeV2Submit(row);
  if (!result.ok) $("submitProductStatus").textContent = result.message;
};
$("saveNew").onclick = async () => {
  if (!currentUser || S.stateOwnerId !== currentUser.id) return;
  const row = barcodeV2ReadSubmission();
  const error = barcodeV2ValidateSubmission(row);
  if (error) { $("submitProductStatus").textContent = error; return; }
  if (!barcodeV2Complete(row)) {
    $("submitProductStatus").textContent = "要加入完整飲食統計，必須填齊熱量、蛋白質、脂肪與碳水；資料不足可先點「只送交審核」。";
    return;
  }
  if (!(row.kcal === 0 && row.protein === 0 && row.fat === 0 && row.carbs === 0)) {
    const warning = validateNutrition(row.name,row.kcal,row.protein,row.fat,row.carbs);
    if (warning) { $("submitProductStatus").textContent = warning; return; }
  }
  const it = {name:row.name+"（"+$("nB").value+"）",
    k:row.kcal,p:row.protein,f:row.fat,c:row.carbs};
  const userId = currentUser.id;
  const submission = await barcodeV2Submit(row);
  if (!currentUser || currentUser.id !== userId) return;
  await addLog(it,1);
  if (!submission.ok) alert("本次飲食已記錄，但商品未成功送審：" + submission.message);
  $("newForm").classList.add("hide");
  showView("today");
};
