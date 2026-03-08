const firebaseConfig = window.APP_FIREBASE_CONFIG || {};
const appSettings = {
  collectionName: "monthlyInspectionEntries",
  useLocalFallbackWhenFirebaseIsMissing: true,
  ...(window.APP_SETTINGS || {})
};
const CHECK_SEQUENCE = ["", "レ", "×", "▲"];
const HOLIDAY_CHECK = "休";
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const STORAGE_NAMESPACE = "monthly_inspection_app_v1";
const MIN_SELECTABLE_MONTH = "2026-01";
const THEME_COLORS = Object.freeze({
  light: "#f3f5f8",
  dark: "#0f1722"
});
const FIREBASE_REQUIRED_KEYS = ["apiKey", "authDomain", "projectId", "appId"];
const INSPECTION_GUIDE_MESSAGE = "空欄 → レ → × → ▲　未入力日のみ表示しています。休みの日は日付を押すとその日に休を一括入力できます。もう一度押すと解除できます。上の送信ボタンで保存します。";
const APP_VERSION = "20260308-7";
const sharedSettings = window.SharedLauncherSettings || null;

const INSPECTION_GROUPS = [
  {
    id: "brake",
    label: "1. ブレーキ",
    items: [
      { id: "brake_pedal", label: "踏みしろ、きき" },
      { id: "brake_fluid", label: "液量" },
      { id: "air_pressure", label: "空気圧力の上り具合" },
      { id: "exhaust_sound", label: "バルブからの排気音" },
      { id: "parking_brake", label: "レバーの引きしろ" }
    ]
  },
  {
    id: "tire",
    label: "2. タイヤ",
    items: [
      { id: "tire_pressure", label: "空気圧" },
      { id: "tire_damage", label: "亀裂・損傷・異常磨耗" },
      { id: "tire_tread", label: "※溝の深さ" },
      { id: "wheel_nut", label: "ホイールナット・ボルト・スペアの取付状態等" }
    ]
  },
  {
    id: "battery",
    label: "3. バッテリー",
    items: [{ id: "battery_fluid", label: "※液量" }]
  },
  {
    id: "engine",
    label: "4. エンジン",
    items: [
      { id: "coolant", label: "※冷却水の量" },
      { id: "fan_belt", label: "※ファン・ベルトの張り具合、損傷" },
      { id: "engine_oil", label: "※エンジン・オイルの量" },
      { id: "engine_start", label: "※かかり具合、異音" },
      { id: "engine_response", label: "※低速、加速の状態" }
    ]
  },
  {
    id: "lights",
    label: "5. 燈火装置及び方向指示器",
    items: [{ id: "lights_status", label: "点灯・点滅具合、汚れ及び損傷" }]
  },
  {
    id: "wiper",
    label: "6. ウィンド・ウォッシャー及びワイパー",
    items: [
      { id: "washer_fluid", label: "※液量、噴射状態" },
      { id: "wiper_status", label: "※ワイパー払拭状態" }
    ]
  },
  {
    id: "air_tank",
    label: "7. エア・タンク",
    items: [{ id: "air_tank_water", label: "エア・タンクに凝水がない" }]
  },
  {
    id: "others",
    label: "8. その他",
    items: [
      { id: "documents", label: "検査証・保険証・定期点検整備記録簿の備付" },
      { id: "emergency_tools", label: "非常用信号具・工具類・停止表示板備付" },
      { id: "report_changes", label: "報告事項・変更事項" }
    ]
  }
];

const ALL_ITEMS = INSPECTION_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, groupId: group.id, groupLabel: group.label }))
);
const ITEM_LABELS = Object.fromEntries(ALL_ITEMS.map((item) => [item.id, item.label]));

const elements = {
  entryScreen: document.getElementById("entryScreen"),
  inspectionScreen: document.getElementById("inspectionScreen"),
  entryForm: document.getElementById("entryForm"),
  vehicleDisplay: document.getElementById("vehicleDisplay"),
  driverDisplay: document.getElementById("driverDisplay"),
  startButton: document.getElementById("startButton"),
  backButton: document.getElementById("backButton"),
  sendButton: document.getElementById("sendButton"),
  sendConfirmDialog: document.getElementById("sendConfirmDialog"),
  sendConfirmMessage: document.getElementById("sendConfirmMessage"),
  sendConfirmCancelButton: document.getElementById("sendConfirmCancelButton"),
  sendConfirmOkButton: document.getElementById("sendConfirmOkButton"),
  sendFarewell: document.getElementById("sendFarewell"),
  sendFarewellImage: document.getElementById("sendFarewellImage"),
  targetMonthButtons: document.getElementById("targetMonthButtons"),
  entryStatus: document.getElementById("entryStatus"),
  inspectionStatus: document.getElementById("inspectionStatus"),
  sessionTitle: document.getElementById("sessionTitle"),
  pendingSummary: document.getElementById("pendingSummary"),
  storageModeLabel: document.getElementById("storageModeLabel"),
  tableSection: document.getElementById("tableSection"),
  emptyState: document.getElementById("emptyState"),
  emptyStateText: document.getElementById("emptyStateText"),
  tableHead: document.getElementById("inspectionTableHead"),
  tableBody: document.getElementById("inspectionTableBody"),
  themeColorMeta: document.querySelector('meta[name="theme-color"]')
};

const state = {
  session: null,
  sharedSelection: {
    vehicle: "",
    driver: ""
  },
  recordsByMonth: {},
  targetMonth: "",
  availableMonths: [],
  pendingDays: [],
  draftsByMonth: {},
  holidayBackupByMonth: {},
  store: null
};

elements.startButton.disabled = true;

initTheme();
elements.entryForm.addEventListener("submit", handleStart);
elements.backButton.addEventListener("click", handleBack);
elements.sendButton.addEventListener("click", handleSend);
elements.sendConfirmCancelButton?.addEventListener("click", closeSendConfirmDialog);
elements.sendConfirmOkButton?.addEventListener("click", () => {
  closeSendConfirmDialog();
  void submitSend();
});
elements.targetMonthButtons.addEventListener("click", handleTargetMonthSelect);
elements.tableHead.addEventListener("click", handleDayHeadTap);
elements.tableBody.addEventListener("click", handleCheckTap);
document.addEventListener("visibilitychange", handleVisibilityChange);

boot().catch((error) => {
  setEntryStatus(`初期化に失敗しました: ${error.message}`, true);
});

async function boot() {
  await clearLegacyCaches();
  state.store = await createStore();
  refreshSharedSelection();
  elements.startButton.disabled = false;
}

async function handleStart(event) {
  event.preventDefault();
  clearEntryStatus();

  refreshSharedSelection();
  const vehicle = state.sharedSelection.vehicle;
  const driver = state.sharedSelection.driver;

  if (!vehicle || !driver) {
    setEntryStatus("ランチャーの設定で車番と運転者（点検者）を選択してください。", true);
    return;
  }

  toggleBusy(elements.startButton, true, "読込中...");

  try {
    state.session = { vehicle, driver };
    state.recordsByMonth = await loadRecordMap(vehicle, driver);
    syncTargetMonth(getCurrentYearMonth());
    renderInspectionScreen();
    switchScreen("inspection");
    setInspectionStatus(INSPECTION_GUIDE_MESSAGE, false, true);
  } catch (error) {
    setEntryStatus(`読込に失敗しました: ${error.message}`, true);
  } finally {
    toggleBusy(elements.startButton, false, "点検開始");
  }
}

function handleBack() {
  clearInspectionStatus();
  state.session = null;
  refreshSharedSelection();
  switchScreen("entry");
}

function handleVisibilityChange() {
  if (document.visibilityState !== "visible") {
    return;
  }
  syncThemeFromLauncher();
  if (state.session) {
    return;
  }
  refreshSharedSelection();
}

async function handleSend() {
  const sendPlan = getSendPlan();
  if (!sendPlan) {
    return;
  }

  if (!elements.sendConfirmDialog || !elements.sendConfirmMessage) {
    if (window.confirm(buildSendConfirmMessage(sendPlan))) {
      await submitSend();
    }
    return;
  }

  elements.sendConfirmMessage.textContent = buildSendConfirmMessage(sendPlan);
  if (typeof elements.sendConfirmDialog.showModal === "function") {
    elements.sendConfirmDialog.showModal();
  } else {
    elements.sendConfirmDialog.setAttribute("open", "");
  }
}

async function submitSend() {
  const sendPlan = getSendPlan();
  if (!sendPlan) {
    return;
  }

  const { month, monthDraft, completeDays, payload } = sendPlan;
  toggleBusy(elements.sendButton, true, "送信中...");

  try {
    await state.store.saveRecord(payload);
    state.recordsByMonth[month] = payload;
    const remainingDays = state.pendingDays.filter((day) => !completeDays.includes(day));
    const remainingDraft = pickDraftDays(monthDraft, remainingDays);

    if (Object.keys(remainingDraft).length) {
      state.draftsByMonth[month] = remainingDraft;
    } else {
      delete state.draftsByMonth[month];
    }
    dropHolidayBackupDays(month, completeDays);

    await showSendFarewell();
    returnToLauncherHome();
  } catch (error) {
    setInspectionStatus(`送信に失敗しました: ${error.message}`, true);
  } finally {
    toggleBusy(elements.sendButton, false, "送信");
  }
}

function getSendPlan() {
  if (!state.session || !state.pendingDays.length) {
    setInspectionStatus("送信対象の日付がありません。", false, false);
    return null;
  }

  const month = state.targetMonth;
  const record = getRecordForMonth(month);
  const monthDraft = state.draftsByMonth[month] || {};
  const completeDays = state.pendingDays.filter((day) => isDayComplete(monthDraft[String(day)]));

  if (!completeDays.length) {
    setInspectionStatus("1日分すべて入力できた日付がありません。未完了の日はそのまま残ります。", true);
    return null;
  }

  const nextChecksByDay = omitCheckDays(record.checksByDay, completeDays);
  const nextHolidayDays = new Set(record.holidayDays);
  for (const day of completeDays) {
    const dayChecks = normalizeDayChecks(monthDraft[String(day)] || createEmptyDayChecks());
    nextChecksByDay[String(day)] = dayChecks;
    if (isHolidayDay(dayChecks)) {
      nextHolidayDays.add(day);
    } else {
      nextHolidayDays.delete(day);
    }
  }

  const payload = normalizeRecord({
    month,
    vehicle: state.session.vehicle,
    driver: state.session.driver,
    checksByDay: nextChecksByDay,
    holidayDays: [...nextHolidayDays]
  });

  return {
    month,
    monthDraft,
    completeDays,
    payload
  };
}

function buildSendConfirmMessage(sendPlan) {
  return "入力内容に間違いがなければ、OKを押してください。";
}

function handleCheckTap(event) {
  const button = event.target.closest("[data-day][data-item-id]");
  if (!button) return;

  const { day, itemId } = button.dataset;
  const month = state.targetMonth;
  const monthDraft = state.draftsByMonth[month];
  if (!monthDraft?.[day]) return;
  if (isHolidayDay(monthDraft[day])) return;

  const currentValue = monthDraft[day][itemId] || "";
  const nextValue = rotateCheck(currentValue);
  monthDraft[day][itemId] = nextValue;

  button.textContent = nextValue || " ";
  button.className = `check-button ${getCheckButtonClass(nextValue)}`;
  button.setAttribute("aria-label", `${day}日 ${ITEM_LABELS[itemId] || itemId} ${nextValue || "未入力"}`);
}

function handleTargetMonthSelect(event) {
  const button = event.target.closest("[data-target-month]");
  if (!button || !state.session) return;

  const nextMonth = button.dataset.targetMonth;
  if (!nextMonth || nextMonth === state.targetMonth) return;

  syncTargetMonth(nextMonth);
  clearInspectionStatus();
  renderInspectionScreen();
}

async function handleDayHeadTap(event) {
  const button = event.target.closest("[data-day-header]");
  if (!button || !state.session) return;

  const day = Number(button.dataset.dayHeader);
  const month = state.targetMonth;
  const dayKey = String(day);
  const monthDraft = {
    ...(state.draftsByMonth[month] || {})
  };
  const dayDraft = normalizeDayChecks(monthDraft[dayKey] || createEmptyDayChecks());

  if (isHolidayDay(dayDraft)) {
    monthDraft[dayKey] = popHolidayBackup(month, dayKey);
    state.draftsByMonth[month] = monthDraft;
    renderInspectionTable();
    setInspectionStatus(`${formatMonth(month)} の ${day}日の休入力を解除しました。`, false, true);
    return;
  }

  if (hasAnyCheckValue(dayDraft)) {
    const confirmed = window.confirm(`${day}日を休みにしますか？\nOKで入力中の内容を休に置き換えます。送信するまで保存はされません。`);
    if (!confirmed) return;
    storeHolidayBackup(month, dayKey, dayDraft);
  } else {
    clearHolidayBackup(month, dayKey);
  }

  monthDraft[dayKey] = createHolidayDayChecks();
  state.draftsByMonth[month] = monthDraft;
  renderInspectionTable();
  setInspectionStatus(`${formatMonth(month)} の ${day}日に休を一括入力しました。送信で保存されます。`, false, true);
}

async function createStore() {
  if (!hasFirebaseConfig()) {
    return createLocalStore();
  }

  try {
    const [{ initializeApp }, firestoreModule] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js")
    ]);

    const app = initializeApp(firebaseConfig);
    const db = firestoreModule.getFirestore(app);
    return createFirestoreStore(db, firestoreModule);
  } catch (error) {
    console.error(error);
    throw new Error(`Firebase接続に失敗しました: ${error.message}`);
  }
}

function createFirestoreStore(db, firestoreModule) {
  const {
    collection,
    doc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    where
  } = firestoreModule;

  return {
    mode: "firebase",
    label: "Firebase Firestore",
    async listRecords(vehicle, driver) {
      const ref = collection(db, appSettings.collectionName);
      const q = query(ref, where("vehicle", "==", vehicle), where("driver", "==", driver));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((snapshotDoc) => normalizeRecord(snapshotDoc.data()));
    },
    async saveRecord(record) {
      const ref = doc(db, appSettings.collectionName, buildRecordId(record.month, record.vehicle, record.driver));
      await setDoc(
        ref,
        {
          ...record,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }
  };
}

function createLocalStore() {
  return {
    mode: "local",
    label: "ローカル保存（Firebase未設定時の仮保存）",
    async listRecords(vehicle, driver) {
      const store = readLocalStore();
      return Object.values(store.records)
        .filter((record) => record.vehicle === vehicle && record.driver === driver)
        .map((record) => normalizeRecord(record));
    },
    async saveRecord(record) {
      const store = readLocalStore();
      store.records[buildRecordId(record.month, record.vehicle, record.driver)] = normalizeRecord(record);
      localStorage.setItem(STORAGE_NAMESPACE, JSON.stringify(store));
    }
  };
}

async function loadRecordMap(vehicle, driver) {
  const records = await state.store.listRecords(vehicle, driver);
  return records.reduce((map, record) => {
    map[record.month] = record;
    return map;
  }, {});
}

function syncDraftForTargetMonth() {
  const month = state.targetMonth;
  if (!month) {
    state.pendingDays = [];
    return;
  }
  const pendingDays = getPendingDays(month);
  state.pendingDays = pendingDays;

  const existingDraft = state.draftsByMonth[month] || {};
  const recordChecksByDay = getRecordForMonth(month).checksByDay || {};
  const nextDraft = { ...existingDraft };

  for (const day of pendingDays) {
    const key = String(day);
    nextDraft[key] = normalizeDayChecks(nextDraft[key] || recordChecksByDay[key] || createEmptyDayChecks());
  }

  state.draftsByMonth[month] = nextDraft;
}

function renderInspectionScreen() {
  renderTargetMonthButtons();
  elements.sessionTitle.textContent = `車番 ${state.session.vehicle} / 運転者 ${state.session.driver}`;

  if (!state.pendingDays.length) {
    const currentMonth = getCurrentYearMonth();
    const isCurrentMonth = state.targetMonth === currentMonth;
    elements.pendingSummary.textContent = isCurrentMonth
      ? "本日分まで入力済み、または休み登録済みです。次の未入力日が来たら表示されます。"
      : "対象月の未入力日はありません。";
    elements.emptyState.hidden = false;
    elements.tableSection.hidden = true;
    elements.emptyStateText.textContent = isCurrentMonth
      ? "この月は本日分まで完了または休み登録済みです。明日以降に未入力日が出ます。"
      : "対象月の必要日分はすでに送信済み、または休み登録済みです。";
    return;
  }

  elements.pendingSummary.textContent = buildPendingSummary();
  elements.emptyState.hidden = true;
  elements.tableSection.hidden = false;
  renderInspectionTable();
}

function renderTargetMonthButtons() {
  elements.targetMonthButtons.innerHTML = "";

  state.availableMonths.forEach((month) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `month-select-button${month === state.targetMonth ? " is-active" : ""}`;
    button.dataset.targetMonth = month;
    button.textContent = formatTargetMonthButton(month);
    button.setAttribute("aria-pressed", month === state.targetMonth ? "true" : "false");
    elements.targetMonthButtons.append(button);
  });
}

function renderInspectionTable() {
  elements.tableHead.innerHTML = "";
  elements.tableBody.innerHTML = "";

  const headerRow = document.createElement("tr");

  const categoryHead = document.createElement("th");
  categoryHead.className = "category-head";
  categoryHead.scope = "col";
  categoryHead.textContent = "点検個所";
  headerRow.append(categoryHead);

  const itemHead = document.createElement("th");
  itemHead.className = "item-head";
  itemHead.scope = "col";
  itemHead.textContent = "点検内容";
  headerRow.append(itemHead);

  for (const day of state.pendingDays) {
    const dayKey = String(day);
    const dayDraft = state.draftsByMonth[state.targetMonth]?.[dayKey] || createEmptyDayChecks();
    const holidaySelected = isHolidayDay(dayDraft);
    const head = document.createElement("th");
    head.className = "day-head";
    head.scope = "col";
    head.innerHTML = [
      `<button type="button" class="day-head-button${holidaySelected ? " is-holiday-selected" : ""}" data-day-header="${day}" aria-label="${holidaySelected ? `${day}日の休入力を解除する` : `${day}日に休を一括入力する`}">`,
      '<span class="day-stack">',
      `<span class="day-number">${day}</span>`,
      `<span class="day-weekday">${getWeekdayLabel(state.targetMonth, day)}</span>`,
      holidaySelected ? '<span class="day-flag">休</span>' : "",
      "</span>",
      "</button>"
    ].join("");
    headerRow.append(head);
  }

  elements.tableHead.append(headerRow);

  for (const group of INSPECTION_GROUPS) {
    group.items.forEach((item, index) => {
      const row = document.createElement("tr");

      if (index === 0) {
        const categoryCell = document.createElement("th");
        categoryCell.className = "category-cell";
        categoryCell.scope = "rowgroup";
        categoryCell.rowSpan = group.items.length;
        categoryCell.textContent = group.label;
        row.append(categoryCell);
      }

      const itemCell = document.createElement("th");
      itemCell.className = "item-cell";
      itemCell.scope = "row";
      itemCell.textContent = item.label;
      row.append(itemCell);

      for (const day of state.pendingDays) {
        const value = state.draftsByMonth[state.targetMonth]?.[String(day)]?.[item.id] || "";
        const td = document.createElement("td");
        td.className = "check-cell";
        td.innerHTML = `
          <button
            type="button"
            class="check-button ${getCheckButtonClass(value)}"
            data-day="${day}"
            data-item-id="${item.id}"
            aria-label="${day}日 ${item.label} ${value || "未入力"}"
          >${value || " "}</button>
        `;
        row.append(td);
      }

      elements.tableBody.append(row);
    });
  }
}

function switchScreen(mode) {
  const showingInspection = mode === "inspection";
  elements.entryScreen.hidden = showingInspection;
  elements.inspectionScreen.hidden = !showingInspection;
}

function closeSendConfirmDialog() {
  if (!elements.sendConfirmDialog) {
    return;
  }
  if (elements.sendConfirmDialog.open && typeof elements.sendConfirmDialog.close === "function") {
    elements.sendConfirmDialog.close();
  } else {
    elements.sendConfirmDialog.removeAttribute("open");
  }
}

async function showSendFarewell() {
  if (!elements.sendFarewell) {
    return;
  }

  elements.sendFarewell.classList.add("show");
  elements.sendFarewell.setAttribute("aria-hidden", "false");

  const image = elements.sendFarewellImage;
  if (image && !image.complete) {
    await new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) {
          return;
        }
        done = true;
        image.removeEventListener("load", finish);
        image.removeEventListener("error", finish);
        resolve();
      };
      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", finish, { once: true });
      window.setTimeout(finish, 1200);
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 1800));
}

function returnToLauncherHome() {
  closeSendConfirmDialog();
  window.location.replace("../index.html");
}

function refreshSharedSelection() {
  if (!sharedSettings || typeof sharedSettings.ensureState !== "function") {
    state.sharedSelection = { vehicle: "", driver: "" };
    renderSharedSelection();
    return;
  }

  const sharedState = sharedSettings.ensureState();
  state.sharedSelection = {
    vehicle: sharedState.current.vehicleNumber || "",
    driver: sharedState.current.driverName || ""
  };
  renderSharedSelection();
}

function renderSharedSelection() {
  const vehicle = state.sharedSelection.vehicle;
  const driver = state.sharedSelection.driver;

  elements.vehicleDisplay.textContent = vehicle || "未選択";
  elements.vehicleDisplay.classList.toggle("is-placeholder", !vehicle);
  elements.driverDisplay.textContent = driver || "未選択";
  elements.driverDisplay.classList.toggle("is-placeholder", !driver);
}

function getRecordForMonth(month) {
  return (
    state.recordsByMonth[month] ||
    normalizeRecord({
      month,
      vehicle: state.session?.vehicle || "",
      driver: state.session?.driver || "",
      checksByDay: {},
      holidayDays: []
    })
  );
}

function getPendingDays(month) {
  if (!month) return [];

  const currentMonth = getCurrentYearMonth();
  if (compareYearMonth(month, MIN_SELECTABLE_MONTH) < 0) return [];
  const comparison = compareYearMonth(month, currentMonth);
  if (comparison > 0) return [];

  const record = getRecordForMonth(month);
  const holidayDays = new Set(record.holidayDays.map((day) => String(day)));
  const recordedDays = new Set(
    Object.entries(record.checksByDay || {})
      .filter(([, values]) => isDayComplete(values))
      .map(([day]) => String(day))
  );
  const lastDay = comparison === 0 ? new Date().getDate() : getDaysInMonth(month);
  const days = [];

  for (let day = 1; day <= lastDay; day += 1) {
    if (!recordedDays.has(String(day)) && !holidayDays.has(String(day))) {
      days.push(day);
    }
  }

  return days;
}

function buildPendingSummary() {
  const currentMonth = getCurrentYearMonth();
  const isCarryOver = compareYearMonth(state.targetMonth, currentMonth) < 0;
  const prefix = isCarryOver ? "前月分の未入力日を表示中。" : "今月分の未入力日を表示中。";
  return `${prefix} 対象日は ${state.pendingDays.join("、")} 日です。日付を押すと休を一括入力でき、もう一度押すと解除できます。横スクロールで右側まで入力できます。`;
}

function normalizeRecord(record) {
  const month = record.month || getCurrentYearMonth();
  const holidayDays = normalizeHolidayDays(record.holidayDays || [], month);
  const checksByDay = normalizeChecksByDay(record.checksByDay || {});

  for (const day of holidayDays) {
    checksByDay[String(day)] = createHolidayDayChecks();
  }

  return {
    month,
    vehicle: record.vehicle || "",
    driver: record.driver || "",
    checksByDay,
    holidayDays
  };
}

function normalizeChecksByDay(checksByDay) {
  return Object.entries(checksByDay).reduce((result, [day, values]) => {
    result[String(day)] = normalizeDayChecks(values || {});
    return result;
  }, {});
}

function normalizeDayChecks(values) {
  const normalized = {};
  for (const item of ALL_ITEMS) {
    const value = values[item.id];
    normalized[item.id] = CHECK_SEQUENCE.includes(value) || value === HOLIDAY_CHECK ? value : "";
  }
  return normalized;
}

function createEmptyDayChecks() {
  return Object.fromEntries(ALL_ITEMS.map((item) => [item.id, ""]));
}

function createHolidayDayChecks() {
  return Object.fromEntries(ALL_ITEMS.map((item) => [item.id, HOLIDAY_CHECK]));
}

function normalizeHolidayDays(holidayDays, month) {
  const lastDay = getDaysInMonth(month);
  return [...new Set((holidayDays || [])
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= lastDay))]
    .sort((left, right) => left - right);
}

function hasAnyCheckValue(values) {
  return Object.values(normalizeDayChecks(values || {})).some((value) => value !== "");
}

function isHolidayDay(values) {
  return Object.values(normalizeDayChecks(values || {})).every((value) => value === HOLIDAY_CHECK);
}

function isDayComplete(values) {
  return Object.values(normalizeDayChecks(values || {})).every((value) => value !== "");
}

function storeHolidayBackup(month, day, values) {
  const monthBackup = {
    ...(state.holidayBackupByMonth[String(month)] || {})
  };
  monthBackup[String(day)] = normalizeDayChecks(values || {});
  state.holidayBackupByMonth[String(month)] = monthBackup;
}

function popHolidayBackup(month, day) {
  const monthKey = String(month);
  const dayKey = String(day);
  const monthBackup = {
    ...(state.holidayBackupByMonth[monthKey] || {})
  };
  const restored = normalizeDayChecks(monthBackup[dayKey] || createEmptyDayChecks());
  delete monthBackup[dayKey];

  if (Object.keys(monthBackup).length) {
    state.holidayBackupByMonth[monthKey] = monthBackup;
  } else {
    delete state.holidayBackupByMonth[monthKey];
  }

  return restored;
}

function clearHolidayBackup(month, day) {
  const monthKey = String(month);
  const dayKey = String(day);
  const monthBackup = state.holidayBackupByMonth[monthKey];
  if (!monthBackup || !Object.prototype.hasOwnProperty.call(monthBackup, dayKey)) {
    return;
  }

  const nextMonthBackup = { ...monthBackup };
  delete nextMonthBackup[dayKey];

  if (Object.keys(nextMonthBackup).length) {
    state.holidayBackupByMonth[monthKey] = nextMonthBackup;
  } else {
    delete state.holidayBackupByMonth[monthKey];
  }
}

function dropHolidayBackupDays(month, days) {
  const monthKey = String(month);
  const monthBackup = state.holidayBackupByMonth[monthKey];
  if (!monthBackup) {
    return;
  }

  const nextMonthBackup = { ...monthBackup };
  for (const day of days) {
    delete nextMonthBackup[String(day)];
  }

  if (Object.keys(nextMonthBackup).length) {
    state.holidayBackupByMonth[monthKey] = nextMonthBackup;
  } else {
    delete state.holidayBackupByMonth[monthKey];
  }
}

function omitCheckDays(checksByDay, days) {
  const excludedDays = new Set(days.map((day) => String(day)));
  return Object.entries(normalizeChecksByDay(checksByDay || {})).reduce((result, [day, values]) => {
    if (!excludedDays.has(String(day))) {
      result[String(day)] = values;
    }
    return result;
  }, {});
}

function pickDraftDays(monthDraft, days) {
  const allowedDays = new Set(days.map((day) => String(day)));
  return Object.entries(monthDraft || {}).reduce((result, [day, values]) => {
    if (allowedDays.has(String(day))) {
      result[String(day)] = normalizeDayChecks(values || {});
    }
    return result;
  }, {});
}

function readLocalStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_NAMESPACE) || '{"records":{}}');
  } catch {
    return { records: {} };
  }
}

function hasFirebaseConfig() {
  return FIREBASE_REQUIRED_KEYS.every((key) => {
    const value = firebaseConfig[key];
    return typeof value === "string" && value.trim() && !value.includes("YOUR_");
  });
}

function buildRecordId(month, vehicle, driver) {
  return [month, vehicle, driver].map((part) => encodeURIComponent(part)).join("__");
}

function rotateCheck(value) {
  const currentIndex = CHECK_SEQUENCE.indexOf(value);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  return CHECK_SEQUENCE[(safeIndex + 1) % CHECK_SEQUENCE.length];
}

function getCheckButtonClass(value) {
  if (value === HOLIDAY_CHECK) return "is-holiday";
  if (value === "レ") return "is-good";
  if (value === "×") return "is-bad";
  if (value === "▲") return "is-fixed";
  return "is-empty";
}

function getCurrentYearMonth() {
  const now = new Date();
  return toYearMonth(now.getFullYear(), now.getMonth() + 1);
}

function toYearMonth(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseYearMonth(yearMonth) {
  const [yearText, monthText] = yearMonth.split("-");
  return {
    year: Number(yearText),
    month: Number(monthText)
  };
}

function compareYearMonth(left, right) {
  return left.localeCompare(right);
}

function getDaysInMonth(yearMonth) {
  const { year, month } = parseYearMonth(yearMonth);
  return new Date(year, month, 0).getDate();
}

function getWeekdayLabel(yearMonth, day) {
  const { year, month } = parseYearMonth(yearMonth);
  return WEEKDAYS[new Date(year, month - 1, day).getDay()];
}

function formatMonth(yearMonth) {
  const { year, month } = parseYearMonth(yearMonth);
  return `${year}年${month}月`;
}

function formatTargetMonthButton(yearMonth) {
  const currentMonth = getCurrentYearMonth();
  const suffix = compareYearMonth(yearMonth, currentMonth) < 0 ? "前月分" : "今月分";
  return `${formatMonth(yearMonth)}/${suffix}`;
}

function setEntryStatus(message, isError = false, isSuccess = false) {
  setStatus(elements.entryStatus, message, isError, isSuccess);
}

function clearEntryStatus() {
  setStatus(elements.entryStatus, "", false);
}

function setInspectionStatus(message, isError = false, isSuccess = false) {
  setStatus(elements.inspectionStatus, message, isError, isSuccess);
}

function clearInspectionStatus() {
  setStatus(elements.inspectionStatus, "", false, false);
}

function setStatus(element, message, isError = false, isSuccess = false) {
  if (!element) {
    console.warn("Status target element was not found.");
    return;
  }

  element.textContent = message;
  element.classList.toggle("is-error", Boolean(message) && isError);
  element.classList.toggle("is-success", Boolean(message) && !isError && isSuccess);
}

function toggleBusy(button, busy, idleLabel) {
  button.disabled = busy;
  button.textContent = busy ? (button.id === "sendButton" ? "送信中..." : "読込中...") : idleLabel;
}

function applyTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  if (elements.themeColorMeta) {
    elements.themeColorMeta.setAttribute("content", THEME_COLORS[next]);
  }
}

function initTheme() {
  syncThemeFromLauncher();
}

function syncTargetMonth(preferredMonth = getCurrentYearMonth()) {
  state.availableMonths = getSelectableMonths();
  state.targetMonth = resolveSelectableMonth(preferredMonth, state.availableMonths);
  syncDraftForTargetMonth();
}

function getSelectableMonths() {
  const currentMonth = getCurrentYearMonth();
  if (compareYearMonth(currentMonth, MIN_SELECTABLE_MONTH) < 0) {
    return [currentMonth];
  }

  const months = [];
  let cursor = MIN_SELECTABLE_MONTH;

  while (compareYearMonth(cursor, currentMonth) <= 0) {
    if (cursor === currentMonth || getPendingDays(cursor).length > 0) {
      months.push(cursor);
    }
    cursor = addMonths(cursor, 1);
  }

  return months;
}

function resolveSelectableMonth(preferredMonth, availableMonths) {
  const currentMonth = getCurrentYearMonth();
  if (availableMonths.includes(preferredMonth)) {
    return preferredMonth;
  }
  if (availableMonths.includes(currentMonth)) {
    return currentMonth;
  }
  return availableMonths[availableMonths.length - 1] || currentMonth;
}

function addMonths(yearMonth, delta) {
  const { year, month } = parseYearMonth(yearMonth);
  const next = new Date(year, month - 1 + delta, 1);
  return toYearMonth(next.getFullYear(), next.getMonth() + 1);
}

function syncThemeFromLauncher() {
  if (!sharedSettings || typeof sharedSettings.ensureState !== "function") {
    applyTheme("light");
    return;
  }

  const sharedState = sharedSettings.ensureState();
  applyTheme(sharedState.theme);
}

async function clearLegacyCaches() {
  if (!canAccessServiceWorkerApis()) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  const cacheKeys = await caches.keys();
  const legacyCacheKeys = cacheKeys.filter((key) => key.startsWith("monthly-inspection-shell-"));
  const hasLegacyState = registrations.length > 0 || legacyCacheKeys.length > 0;

  await Promise.all(registrations.map((registration) => registration.unregister()));
  await Promise.all(legacyCacheKeys.map((key) => caches.delete(key)));

  if (hasLegacyState && !sessionStorage.getItem("monthlyInspectionCacheReset")) {
    sessionStorage.setItem("monthlyInspectionCacheReset", "1");
    window.location.reload();
    await new Promise(() => {});
  }
}

function canAccessServiceWorkerApis() {
  if (!("serviceWorker" in navigator) || !("caches" in window)) {
    return false;
  }

  if (!window.isSecureContext) {
    return false;
  }

  return window.location.protocol === "http:" || window.location.protocol === "https:";
}




