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
const MIN_SELECTABLE_MONTH = "2025-10";
const MAX_SELECTABLE_MONTH_COUNT = 4;
const THEME_COLORS = Object.freeze({
  light: "#f3f5f8",
  dark: "#0f1722"
});
const FIREBASE_REQUIRED_KEYS = ["apiKey", "authDomain", "projectId", "appId"];
const INSPECTION_GUIDE_MESSAGE = `未入力日のみ表示しています。
タップすると空欄 → レ → × → ▲と入力されます。　
休みの日は日付を押して休みとしてください。もう一度押すと解除できます。
一日分以上を入力したら上の送信ボタンを押してください。`;
const APP_VERSION = "20260315-19";
const MONTHLY_COMPLETE_IMAGE_SRC = "./icons/monthly-complete.png";
const MONTHLY_COMPLETE_IMAGE_ALT = "今月分はすべて完了しました。明日もよろしくお願いします。";
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
  entryTargetMonthSection: document.getElementById("entryTargetMonthSection"),
  entryTargetMonthButtons: document.getElementById("entryTargetMonthButtons"),
  vehicleDisplay: document.getElementById("vehicleDisplay"),
  driverDisplay: document.getElementById("driverDisplay"),
  startButton: document.getElementById("startButton"),
  backButton: document.getElementById("backButton"),
  sendButton: document.getElementById("sendButton"),
  sendConfirmDialog: document.getElementById("sendConfirmDialog"),
  sendConfirmMessage: document.getElementById("sendConfirmMessage"),
  sendConfirmNoteField: document.getElementById("sendConfirmNoteField"),
  sendConfirmNoteInput: document.getElementById("sendConfirmNoteInput"),
  sendConfirmNoteStatus: document.getElementById("sendConfirmNoteStatus"),
  sendConfirmCancelButton: document.getElementById("sendConfirmCancelButton"),
  sendConfirmOkButton: document.getElementById("sendConfirmOkButton"),
  sendFarewell: document.getElementById("sendFarewell"),
  sendFarewellImage: document.getElementById("sendFarewellImage"),
  entryStatus: document.getElementById("entryStatus"),
  inspectionStatus: document.getElementById("inspectionStatus"),
  sessionMonthLabel: document.getElementById("sessionMonthLabel"),
  sessionTitle: document.getElementById("sessionTitle"),
  pendingSummary: document.getElementById("pendingSummary"),
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
  loadInfo: {
    source: "",
    vehicle: "",
    driver: "",
    recordCount: 0,
    loadedMonths: [],
    duplicateMonths: []
  },
  recordsByMonth: {},
  targetMonth: "",
  availableMonths: [],
  pendingDays: [],
  draftsByMonth: {},
  holidayDraftByMonth: {},
  pendingSendPlan: null,
  entrySelectionRequestId: 0,
  store: null,
  monthlyCompleteFlowRunning: false
};

elements.startButton.disabled = true;

initTheme();
elements.entryForm.addEventListener("submit", handleStart);
elements.backButton.addEventListener("click", handleBack);
elements.sendButton.addEventListener("click", handleSend);
elements.sendConfirmCancelButton?.addEventListener("click", closeSendConfirmDialog);
elements.sendConfirmOkButton?.addEventListener("click", () => {
  void handleSendConfirmOk();
});
elements.sendConfirmDialog?.addEventListener("close", resetSendConfirmState);
elements.tableHead.addEventListener("click", handleDayHeadTap);
elements.tableBody.addEventListener("click", handleCheckTap);
document.addEventListener("visibilitychange", handleVisibilityChange);

boot().catch((error) => {
  setEntryStatus(`初期化に失敗しました: ${error.message}`, true);
});

async function boot() {
  await clearLegacyCaches();
  clearCompletionMarker();
  state.store = await createStore();
  refreshSharedSelection();
  await refreshEntrySelectionState();
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
    const completedAllMonths = await refreshSessionState({
      preferredMonth: state.targetMonth || getCurrentYearMonth(),
      showMonthlyCompleteOnEmpty: true
    });
    if (!completedAllMonths) {
      switchScreen("inspection");
      setInspectionStatus(INSPECTION_GUIDE_MESSAGE, false, true);
    }
  } catch (error) {
    setEntryStatus(`読込に失敗しました: ${error.message}`, true);
  } finally {
    toggleBusy(elements.startButton, false, "点検開始");
  }
}

function handleBack() {
  clearInspectionStatus();
  state.session = null;
  state.loadInfo = {
    source: state.store?.label || "",
    vehicle: "",
    driver: "",
    recordCount: 0,
    loadedMonths: [],
    duplicateMonths: []
  };
  state.draftsByMonth = {};
  state.holidayDraftByMonth = {};
  refreshSharedSelection();
  void refreshEntrySelectionState();
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
  void refreshEntrySelectionState();
}

async function handleSend() {
  const sendPlan = getSendPlan();
  if (!sendPlan) {
    return;
  }

  if (!elements.sendConfirmDialog || !elements.sendConfirmMessage || !elements.sendConfirmNoteInput) {
    const maintenanceNote = promptMaintenanceNoteIfNeeded(sendPlan);
    if (maintenanceNote === null) {
      return;
    }
    const confirmMessage = buildSendConfirmMessage(sendPlan);
    if (!confirmMessage || window.confirm(confirmMessage)) {
      await submitSend(sendPlan, maintenanceNote);
    }
    return;
  }

  state.pendingSendPlan = sendPlan;
  const confirmMessage = buildSendConfirmMessage(sendPlan);
  elements.sendConfirmMessage.textContent = confirmMessage;
  elements.sendConfirmMessage.hidden = !confirmMessage;
  prepareSendConfirmDialog(sendPlan);
  if (typeof elements.sendConfirmDialog.showModal === "function") {
    elements.sendConfirmDialog.showModal();
  } else {
    elements.sendConfirmDialog.setAttribute("open", "");
  }
}

async function handleSendConfirmOk() {
  const sendPlan = state.pendingSendPlan || getSendPlan();
  if (!sendPlan) {
    closeSendConfirmDialog();
    return;
  }

  const maintenanceNote = readMaintenanceNoteFromDialog(sendPlan);
  if (maintenanceNote === null) {
    return;
  }

  closeSendConfirmDialog();
  await submitSend(sendPlan, maintenanceNote);
}

async function submitSend(sendPlan = null, maintenanceNote = "") {
  const activeSendPlan = sendPlan || getSendPlan();
  if (!activeSendPlan) {
    return;
  }

  const { month, monthDraft, completeDays, payload: basePayload, maintenanceDays } = activeSendPlan;
  const payload = applyMaintenanceNoteToPayload(basePayload, maintenanceDays, maintenanceNote);
  toggleBusy(elements.sendButton, true, "送信中...");

  try {
    await state.store.saveRecord(payload);
    await awardDriverPointsForDailyInspection(activeSendPlan);
    state.recordsByMonth[month] = payload;
    const remainingDays = state.pendingDays.filter((day) => !completeDays.includes(day));
    const remainingDraft = pickDraftDays(monthDraft, remainingDays);

    if (Object.keys(remainingDraft).length) {
      state.draftsByMonth[month] = remainingDraft;
    } else {
      delete state.draftsByMonth[month];
    }
    dropHolidayDraftDays(month, completeDays);
    const completedAllMonths = await refreshSessionState({
      preferredMonth: month,
      showMonthlyCompleteOnEmpty: true
    });

    if (!completedAllMonths) {
      await showSendFarewell();
      returnToLauncherHome();
    }
  } catch (error) {
    setInspectionStatus(`送信に失敗しました: ${error.message}`, true);
  } finally {
    toggleBusy(elements.sendButton, false, "送信");
  }
}

async function awardDriverPointsForDailyInspection(sendPlan) {
  const driverPoints = window.DriverPoints;
  if (!driverPoints || typeof driverPoints.awardDailyInspection !== "function") {
    return;
  }

  const driverName = String(state.session?.driver || sendPlan?.payload?.driver || "").trim();
  const vehicleNumber = String(state.session?.vehicle || sendPlan?.payload?.vehicle || "").trim();
  const month = String(sendPlan?.month || "").trim();
  const completeDays = Array.isArray(sendPlan?.completeDays) ? sendPlan.completeDays : [];

  if (!driverName || !vehicleNumber || !month || !completeDays.length) {
    return;
  }

  try {
    await driverPoints.awardDailyInspection({
      driverName,
      vehicleNumber,
      month,
      completeDays,
      sentAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn("Failed to award driver points for daily inspection:", error);
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
  const completeDays = state.pendingDays.filter((day) => {
    const dayKey = String(day);
    return isHolidaySelected(month, dayKey) || isDayComplete(monthDraft[dayKey]);
  });

  if (!completeDays.length) {
    window.alert("1日分すべて入力できた日付がありません。未完了の日はそのまま残ります。");
    return null;
  }

  const nextChecksByDay = omitCheckDays(record.checksByDay, completeDays);
  const nextHolidayDays = new Set(record.holidayDays);
  const maintenanceDays = [];
  for (const day of completeDays) {
    const dayKey = String(day);
    if (isHolidaySelected(month, dayKey)) {
      nextHolidayDays.add(day);
    } else {
      const dayChecks = normalizeDayChecks(monthDraft[dayKey] || createEmptyDayChecks());
      nextChecksByDay[dayKey] = dayChecks;
      nextHolidayDays.delete(day);
      if (hasMaintenanceMark(dayChecks)) {
        maintenanceDays.push(day);
      }
    }
  }

  const payload = normalizeRecord({
    month,
    vehicle: state.session.vehicle,
    driver: state.session.driver,
    checksByDay: nextChecksByDay,
    holidayDays: [...nextHolidayDays],
    maintenanceNotesByDay: record.maintenanceNotesByDay
  });

  return {
    month,
    monthDraft,
    completeDays,
    maintenanceDays,
    payload
  };
}

function buildSendConfirmMessage(sendPlan) {
  if (sendPlan?.maintenanceDays?.length) {
    return "";
  }
  return "入力内容に間違いがなければ、OKを押してください。";
}

function handleCheckTap(event) {
  const button = event.target.closest("[data-day][data-item-id]");
  if (!button) return;

  const { day, itemId } = button.dataset;
  const month = state.targetMonth;
  const monthDraft = state.draftsByMonth[month];
  if (!monthDraft?.[day]) return;
  if (isHolidaySelected(month, day)) return;

  const currentValue = monthDraft[day][itemId] || "";
  const nextValue = rotateCheck(currentValue);
  monthDraft[day][itemId] = nextValue;

  button.textContent = nextValue || " ";
  button.className = `check-button ${getCheckButtonClass(nextValue)}`;
  button.setAttribute("aria-label", `${day}日 ${ITEM_LABELS[itemId] || itemId} ${nextValue || "未入力"}`);
}

function selectTargetMonth(nextMonth) {
  if (!nextMonth || nextMonth === state.targetMonth) return;
  if (!state.availableMonths.includes(nextMonth)) return;

  state.targetMonth = nextMonth;
  if (!state.session) {
    renderEntryTargetMonthButtons();
    return;
  }
  syncDraftForTargetMonth();
  showInspectionGuide();
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

  if (isHolidaySelected(month, dayKey)) {
    setHolidaySelected(month, dayKey, false);
    renderInspectionTable();
    showInspectionGuide();
    return;
  }

  if (hasAnyCheckValue(dayDraft)) {
    const confirmed = window.confirm(`${day}日を休みにしますか？\nOKでその日を休みとして色付けします。入力内容は送信するまで保存されません。`);
    if (!confirmed) return;
  }

  setHolidaySelected(month, dayKey, true);
  renderInspectionTable();
  showInspectionGuide();
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
      const q = query(ref, where("vehicle", "==", vehicle));
      const snapshot = await getDocs(q);
      return snapshot.docs
        .filter((snapshotDoc) => matchesDriverRecord(snapshotDoc.data(), driver))
        .map((snapshotDoc) => ({
          ...normalizeRecord(snapshotDoc.data()),
          _meta: {
            docId: snapshotDoc.id,
            updatedAtMs: toEpochMillis(snapshotDoc.data().updatedAt)
          }
        }));
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
        .map((record) => ({
          ...normalizeRecord(record),
          _meta: {
            docId: buildRecordId(record.month, record.vehicle, record.driver),
            updatedAtMs: toEpochMillis(record.updatedAt)
          }
        }));
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
  const monthCounts = records.reduce((map, record) => {
    const monthKey = String(record.month || "");
    map[monthKey] = (map[monthKey] || 0) + 1;
    return map;
  }, {});
  const duplicateMonths = Object.entries(monthCounts)
    .filter(([, count]) => count > 1)
    .map(([month]) => month)
    .sort(compareYearMonth);

  state.loadInfo = {
    source: state.store?.label || "",
    vehicle,
    driver,
    recordCount: records.length,
    loadedMonths: records
      .map((record) => record.month)
      .filter(Boolean)
      .sort(compareYearMonth),
    duplicateMonths
  };

  return records.reduce((map, record) => {
    const existing = map[record.month];
    map[record.month] = existing ? mergeMonthRecords(existing, record) : record;
    return map;
  }, {});
}

async function refreshSessionState(options = {}) {
  if (!state.session || !state.store) {
    return false;
  }

  const preferredMonth = options.preferredMonth || state.targetMonth || getCurrentYearMonth();
  state.recordsByMonth = await loadRecordMap(state.session.vehicle, state.session.driver);
  state.draftsByMonth = {};
  state.holidayDraftByMonth = {};
  syncTargetMonth(preferredMonth);

  if (options.showMonthlyCompleteOnEmpty && !state.availableMonths.length) {
    await showMonthlyCompleteAndReturnHome();
    return true;
  }

  renderInspectionScreen();
  return false;
}

async function refreshEntrySelectionState() {
  if (!state.store) {
    return;
  }

  const vehicle = state.sharedSelection.vehicle;
  const driver = state.sharedSelection.driver;
  const requestId = state.entrySelectionRequestId + 1;
  state.entrySelectionRequestId = requestId;

  if (!vehicle || !driver) {
    state.recordsByMonth = {};
    state.availableMonths = [];
    renderEntryTargetMonthButtons();
    clearEntryStatus();
    return;
  }

  try {
    const recordsByMonth = await loadRecordMap(vehicle, driver);
    if (requestId !== state.entrySelectionRequestId || state.session) {
      return;
    }

    state.recordsByMonth = recordsByMonth;
    syncTargetMonth(state.targetMonth || getCurrentYearMonth());
    renderEntryTargetMonthButtons();
    clearEntryStatus();
  } catch (error) {
    if (requestId !== state.entrySelectionRequestId || state.session) {
      return;
    }
    state.recordsByMonth = {};
    state.availableMonths = [];
    renderEntryTargetMonthButtons();
    setEntryStatus(`読込に失敗しました: ${error.message}`, true);
  }
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
  elements.sessionMonthLabel.textContent = state.targetMonth ? `${formatMonth(state.targetMonth)}分` : "";
  elements.sessionTitle.textContent = `車番 ${state.session.vehicle} / 運転者 ${state.session.driver}`;

  if (!state.pendingDays.length) {
    const currentMonth = getCurrentYearMonth();
    const isCurrentMonth = state.targetMonth === currentMonth;
    elements.pendingSummary.hidden = false;
    elements.pendingSummary.setAttribute("aria-hidden", "false");
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

  elements.pendingSummary.textContent = "";
  elements.pendingSummary.hidden = true;
  elements.pendingSummary.setAttribute("aria-hidden", "true");
  elements.emptyState.hidden = true;
  elements.tableSection.hidden = false;
  renderInspectionTable();
}

function renderEntryTargetMonthButtons() {
  if (!elements.entryTargetMonthSection || !elements.entryTargetMonthButtons) {
    return;
  }

  elements.entryTargetMonthButtons.innerHTML = "";
  const shouldShow = Boolean(state.sharedSelection.vehicle && state.sharedSelection.driver && state.availableMonths.length);
  elements.entryTargetMonthSection.hidden = !shouldShow;

  if (!shouldShow) {
    return;
  }

  state.availableMonths.forEach((month) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `month-select-button${month === state.targetMonth ? " is-active" : ""}`;
    button.dataset.targetMonth = month;
    button.textContent = formatTargetMonthButton(month);
    button.setAttribute("aria-pressed", month === state.targetMonth ? "true" : "false");
    button.addEventListener("click", () => {
      selectTargetMonth(month);
    });
    elements.entryTargetMonthButtons.append(button);
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
    const holidaySelected = isHolidaySelected(state.targetMonth, dayKey);
    const head = document.createElement("th");
    head.className = "day-head";
    head.scope = "col";
    head.innerHTML = [
      `<button type="button" class="day-head-button${holidaySelected ? " is-holiday-selected" : ""}" data-day-header="${day}" aria-label="${holidaySelected ? `${day}日の休み指定を解除する` : `${day}日を休みとしてマークする`}">`,
      '<span class="day-stack">',
      `<span class="day-number">${day}</span>`,
      `<span class="day-weekday">${getWeekdayLabel(state.targetMonth, day)}</span>`,
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
        const dayKey = String(day);
        const holidaySelected = isHolidaySelected(state.targetMonth, dayKey);
        const value = holidaySelected ? "" : (state.draftsByMonth[state.targetMonth]?.[dayKey]?.[item.id] || "");
        const buttonClass = holidaySelected ? "is-holiday" : getCheckButtonClass(value);
        const ariaValue = holidaySelected ? "休み" : (value || "未入力");
        const td = document.createElement("td");
        td.className = "check-cell";
        td.innerHTML = `
          <button
            type="button"
            class="check-button ${buttonClass}"
            data-day="${day}"
            data-item-id="${item.id}"
            aria-label="${day}日 ${item.label} ${ariaValue}"
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
    resetSendConfirmState();
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

async function showMonthlyCompleteAndReturnHome() {
  if (state.monthlyCompleteFlowRunning) {
    return;
  }

  state.monthlyCompleteFlowRunning = true;
  const image = elements.sendFarewellImage;
  const previousSrc = image ? image.getAttribute("src") || "" : "";
  const previousAlt = image ? image.getAttribute("alt") || "" : "";

  try {
    if (image) {
      image.src = MONTHLY_COMPLETE_IMAGE_SRC;
      image.alt = MONTHLY_COMPLETE_IMAGE_ALT;
    }
    await showSendFarewell();
    returnToLauncherHome();
  } finally {
    if (image) {
      image.src = previousSrc;
      image.alt = previousAlt;
    }
    state.monthlyCompleteFlowRunning = false;
  }
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
  if (compareYearMonth(month, getSelectableMonthStart(currentMonth)) < 0) return [];
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
  const isCurrentMonth = state.targetMonth === currentMonth;
  const prefix = isCurrentMonth
    ? "今月分の未入力日を表示中。"
    : `${formatMonth(state.targetMonth)} の未入力日を表示中。`;
  return `${prefix} 対象日は ${state.pendingDays.join("、")} 日です。日付を押すと休みとして色付けでき、もう一度押すと解除できます。横スクロールで右側まで入力できます。`;
}

function normalizeRecord(record) {
  const month = record.month || getCurrentYearMonth();
  const legacyHolidayDays = collectLegacyHolidayDays(record.checksByDay || {});
  const holidayDays = normalizeHolidayDays([...(record.holidayDays || []), ...legacyHolidayDays], month);
  const checksByDay = normalizeChecksByDay(record.checksByDay || {});
  const maintenanceNotesByDay = normalizeMaintenanceNotesByDay(record.maintenanceNotesByDay || {}, month);

  for (const day of holidayDays) {
    delete checksByDay[String(day)];
    delete maintenanceNotesByDay[String(day)];
  }

  return {
    month,
    vehicle: record.vehicle || "",
    driver: record.driver || "",
    checksByDay,
    holidayDays,
    maintenanceNotesByDay
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
    const rawValue = values[item.id];
    const value = rawValue === "☓" ? "×" : rawValue;
    normalized[item.id] = CHECK_SEQUENCE.includes(value) ? value : "";
  }
  return normalized;
}

function createEmptyDayChecks() {
  return Object.fromEntries(ALL_ITEMS.map((item) => [item.id, ""]));
}

function normalizeHolidayDays(holidayDays, month) {
  const lastDay = getDaysInMonth(month);
  return [...new Set((holidayDays || [])
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= lastDay))]
    .sort((left, right) => left - right);
}

function normalizeMaintenanceNotesByDay(notesByDay, month) {
  const lastDay = getDaysInMonth(month);
  return Object.entries(notesByDay || {}).reduce((result, [day, note]) => {
    const dayNumber = Number(day);
    const normalizedNote = String(note || "").trim();
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > lastDay || !normalizedNote) {
      return result;
    }
    result[String(dayNumber)] = normalizedNote;
    return result;
  }, {});
}

function hasAnyCheckValue(values) {
  return Object.values(normalizeDayChecks(values || {})).some((value) => value !== "");
}

function isDayComplete(values) {
  return Object.values(normalizeDayChecks(values || {})).every((value) => value !== "");
}

function hasMaintenanceMark(values) {
  return Object.values(normalizeDayChecks(values || {})).includes("▲");
}

function setHolidaySelected(month, day, selected) {
  const monthKey = String(month);
  const dayKey = String(day);
  const monthDraft = {
    ...(state.holidayDraftByMonth[monthKey] || {})
  };

  if (selected) {
    monthDraft[dayKey] = true;
  } else {
    delete monthDraft[dayKey];
  }

  if (Object.keys(monthDraft).length) {
    state.holidayDraftByMonth[monthKey] = monthDraft;
  } else {
    delete state.holidayDraftByMonth[monthKey];
  }
}

function isHolidaySelected(month, day) {
  return Boolean(state.holidayDraftByMonth[String(month)]?.[String(day)]);
}

function dropHolidayDraftDays(month, days) {
  const monthKey = String(month);
  const monthDraft = state.holidayDraftByMonth[monthKey];
  if (!monthDraft) {
    return;
  }

  const nextMonthDraft = { ...monthDraft };
  for (const day of days) {
    delete nextMonthDraft[String(day)];
  }

  if (Object.keys(nextMonthDraft).length) {
    state.holidayDraftByMonth[monthKey] = nextMonthDraft;
  } else {
    delete state.holidayDraftByMonth[monthKey];
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

function applyMaintenanceNoteToPayload(record, maintenanceDays, maintenanceNote) {
  const nextRecord = normalizeRecord(record);
  if (!maintenanceDays?.length) {
    return nextRecord;
  }

  const trimmedNote = String(maintenanceNote || "").trim();
  if (!trimmedNote) {
    throw new Error("整備内容を入力してください。");
  }

  const nextNotesByDay = {
    ...(nextRecord.maintenanceNotesByDay || {})
  };

  for (const day of maintenanceDays) {
    nextNotesByDay[String(day)] = trimmedNote;
  }

  return normalizeRecord({
    ...nextRecord,
    maintenanceNotesByDay: nextNotesByDay
  });
}

function prepareSendConfirmDialog(sendPlan) {
  clearSendConfirmNoteStatus();
  if (!elements.sendConfirmNoteField || !elements.sendConfirmNoteInput) {
    return;
  }

  const requiresMaintenanceNote = Boolean(sendPlan?.maintenanceDays?.length);
  elements.sendConfirmNoteField.hidden = !requiresMaintenanceNote;
  elements.sendConfirmNoteInput.value = "";

  if (!requiresMaintenanceNote) {
    return;
  }

  window.requestAnimationFrame(() => {
    elements.sendConfirmNoteInput?.focus();
    elements.sendConfirmNoteInput?.setSelectionRange(0, 0);
  });
}

function readMaintenanceNoteFromDialog(sendPlan) {
  clearSendConfirmNoteStatus();
  if (!sendPlan?.maintenanceDays?.length) {
    return "";
  }

  if (!elements.sendConfirmNoteInput) {
    return promptMaintenanceNoteIfNeeded(sendPlan);
  }

  const note = elements.sendConfirmNoteInput.value.trim();
  if (note) {
    return note;
  }

  setSendConfirmNoteStatus("整備内容を入力してください。");
  elements.sendConfirmNoteInput.focus();
  return null;
}

function promptMaintenanceNoteIfNeeded(sendPlan) {
  if (!sendPlan?.maintenanceDays?.length) {
    return "";
  }

  while (true) {
    const note = window.prompt("整備したことを記録してください。", "");
    if (note === null) {
      return null;
    }
    const trimmedNote = note.trim();
    if (trimmedNote) {
      return trimmedNote;
    }
    window.alert("整備内容を入力してください。");
  }
}

function resetSendConfirmState() {
  state.pendingSendPlan = null;
  clearSendConfirmNoteStatus();
  if (elements.sendConfirmMessage) {
    elements.sendConfirmMessage.hidden = false;
  }
  if (elements.sendConfirmNoteField) {
    elements.sendConfirmNoteField.hidden = true;
  }
  if (elements.sendConfirmNoteInput) {
    elements.sendConfirmNoteInput.value = "";
  }
}

function setSendConfirmNoteStatus(message) {
  if (!elements.sendConfirmNoteStatus) {
    return;
  }
  elements.sendConfirmNoteStatus.hidden = !message;
  setStatus(elements.sendConfirmNoteStatus, message, true, false);
}

function clearSendConfirmNoteStatus() {
  if (!elements.sendConfirmNoteStatus) {
    return;
  }
  elements.sendConfirmNoteStatus.hidden = true;
  setStatus(elements.sendConfirmNoteStatus, "", false, false);
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
  if (value === "レ") return "is-good";
  if (value === "×") return "is-bad";
  if (value === "▲") return "is-fixed";
  return "is-empty";
}

function collectLegacyHolidayDays(checksByDay) {
  return Object.entries(checksByDay || {})
    .filter(([, values]) => {
      const rows = ALL_ITEMS.map((item) => values?.[item.id] || "");
      return rows.length > 0 && rows.every((value) => value === HOLIDAY_CHECK);
    })
    .map(([day]) => Number(day));
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
  const suffix = yearMonth === currentMonth ? "今月分" : "未入力分";
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

function showInspectionGuide() {
  setInspectionStatus(INSPECTION_GUIDE_MESSAGE, false, true);
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

function visualizeLookupText(value) {
  return String(value || "")
    .replace(/ /g, "[space]")
    .replace(/\u3000/g, "[wide-space]");
}

function normalizeDriverWhitespace(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function stripDriverReading(value) {
  return normalizeDriverWhitespace(value).replace(/\s*[（(][^）)]*[）)]\s*/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeDriverLookupKey(value) {
  return stripDriverReading(value)
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .trim();
}

function matchesDriverRecord(record, driver) {
  const targetKey = normalizeDriverLookupKey(driver);
  if (!targetKey) {
    return false;
  }

  const candidateKeys = new Set(
    [
      record?.driver,
      record?.driverRaw,
      record?.driverDisplay,
      ...(Array.isArray(record?.driverAliases) ? record.driverAliases : [])
    ]
      .map((value) => normalizeDriverLookupKey(value))
      .filter(Boolean)
  );

  const normalizedDriver = String(record?.driverNormalized || "").trim();
  if (normalizedDriver) {
    candidateKeys.add(normalizedDriver);
  }

  return candidateKeys.has(targetKey);
}

function shouldReplaceMonthRecord(currentRecord, nextRecord) {
  const currentUpdatedAt = Number(currentRecord?._meta?.updatedAtMs || 0);
  const nextUpdatedAt = Number(nextRecord?._meta?.updatedAtMs || 0);
  if (nextUpdatedAt !== currentUpdatedAt) {
    return nextUpdatedAt > currentUpdatedAt;
  }

  const currentDocId = String(currentRecord?._meta?.docId || "");
  const nextDocId = String(nextRecord?._meta?.docId || "");
  return nextDocId.localeCompare(currentDocId) > 0;
}

function mergeMonthRecords(currentRecord, nextRecord) {
  const preferred = shouldReplaceMonthRecord(currentRecord, nextRecord) ? nextRecord : currentRecord;
  const secondary = preferred === currentRecord ? nextRecord : currentRecord;
  const preferredRecord = normalizeRecord(preferred);
  const secondaryRecord = normalizeRecord(secondary);
  const allDays = new Set([
    ...Object.keys(secondaryRecord.checksByDay || {}),
    ...Object.keys(preferredRecord.checksByDay || {}),
    ...Object.keys(secondaryRecord.maintenanceNotesByDay || {}),
    ...Object.keys(preferredRecord.maintenanceNotesByDay || {})
  ]);
  const mergedChecksByDay = {};
  const mergedMaintenanceNotesByDay = {};

  allDays.forEach((day) => {
    const mergedDayChecks = mergeDayChecks(
      preferredRecord.checksByDay?.[day],
      secondaryRecord.checksByDay?.[day]
    );
    if (hasAnyCheckValue(mergedDayChecks)) {
      mergedChecksByDay[String(day)] = mergedDayChecks;
    }

    const preferredNote = String(preferredRecord.maintenanceNotesByDay?.[day] || "").trim();
    const secondaryNote = String(secondaryRecord.maintenanceNotesByDay?.[day] || "").trim();
    const mergedNote = preferredNote || secondaryNote;
    if (mergedNote) {
      mergedMaintenanceNotesByDay[String(day)] = mergedNote;
    }
  });

  const mergedRecord = normalizeRecord({
    ...secondaryRecord,
    ...preferredRecord,
    checksByDay: mergedChecksByDay,
    holidayDays: [
      ...secondaryRecord.holidayDays,
      ...preferredRecord.holidayDays
    ],
    maintenanceNotesByDay: mergedMaintenanceNotesByDay
  });

  return {
    ...mergedRecord,
    _meta: preferred._meta
  };
}

function mergeDayChecks(preferredValues, secondaryValues) {
  const preferred = normalizeDayChecks(preferredValues || {});
  const secondary = normalizeDayChecks(secondaryValues || {});
  const merged = {};

  for (const item of ALL_ITEMS) {
    merged[item.id] = preferred[item.id] || secondary[item.id] || "";
  }

  return merged;
}

function toEpochMillis(value) {
  if (!value) {
    return 0;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? 0 : value.getTime();
  }
  if (typeof value.toMillis === "function") {
    try {
      const millis = value.toMillis();
      return Number.isFinite(millis) ? millis : 0;
    } catch {
      return 0;
    }
  }
  if (typeof value.toDate === "function") {
    try {
      const date = value.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
    } catch {
      return 0;
    }
  }
  return 0;
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
  let cursor = getSelectableMonthStart(currentMonth);

  while (compareYearMonth(cursor, currentMonth) <= 0) {
    if (getPendingDays(cursor).length > 0) {
      months.push(cursor);
    }
    cursor = addMonths(cursor, 1);
  }

  return months;
}

function clearCompletionMarker() {
  try {
    localStorage.removeItem("monthly_inspection_completion_marker_v1");
  } catch {
    // noop
  }
}

function getSelectableMonthStart(currentMonth) {
  const rollingStart = addMonths(currentMonth, -(MAX_SELECTABLE_MONTH_COUNT - 1));
  return compareYearMonth(rollingStart, MIN_SELECTABLE_MONTH) < 0 ? MIN_SELECTABLE_MONTH : rollingStart;
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

