const APP_CONFIG = {
  app1Name: "月次タイヤ点検表",
  app1Path: "./getjityretenkenhyou/index.html",
  app2Name: "月次日常点検表",
  app2Path: "./getujinitijyoutenkenhyou/index.html",
};

const MONTHLY_COMPLETE_IMAGE_SRC = "./getjityretenkenhyou/icons/monthly-complete.png";
const REFERENCE_FIREBASE_CONFIG = Object.freeze(window.APP_FIREBASE_CONFIG || {
  apiKey: "AIzaSyCvoqg9H2OZewp8nni1tKeOLJlXjO06s7w",
  authDomain: "getujityretenkenhyou-a92f3.firebaseapp.com",
  projectId: "getujityretenkenhyou-a92f3",
  storageBucket: "getujityretenkenhyou-a92f3.firebasestorage.app",
  messagingSenderId: "976212280398",
  appId: "1:976212280398:web:2857aef38c5b11cdf46f1f",
  measurementId: "G-2V09L51NDY",
});
const REFERENCE_VEHICLE_SETTINGS_DOC = Object.freeze({
  collection: "monthly_tire_autosave",
  id: "monthly_tire_company_settings_backup_vehicles_slot1",
});
const REFERENCE_DRIVER_SETTINGS_DOC = Object.freeze({
  collection: "monthly_tire_autosave",
  id: "monthly_tire_company_settings_backup_drivers_slot1",
});
const REFERENCE_SYAINMEIBO_DOC = Object.freeze({
  collection: "monthly_tire_autosave",
  id: "syainmeibo",
});
const REFERENCE_SOURCE_KIND = Object.freeze({
  VEHICLES: "vehicles",
  DRIVERS: "drivers",
});
const REFERENCE_SOURCE_CONFIG = Object.freeze({
  [REFERENCE_SOURCE_KIND.VEHICLES]: Object.freeze({
    fieldNames: Object.freeze(["車両番号", "車番", "vehicles", "vehicleNumbers", "values"]),
    primaryFieldName: "車両番号",
    metaFieldName: "vehiclesMeta",
  }),
  [REFERENCE_SOURCE_KIND.DRIVERS]: Object.freeze({
    fieldNames: Object.freeze(["乗務員名", "乗務員", "drivers", "driverNames", "values"]),
    primaryFieldName: "乗務員名",
    metaFieldName: "driversMeta",
  }),
});
const MONTHLY_COMPLETE_IMAGE_ALT = "Monthly inspection complete.";
const DAILY_INSPECTION_COMPLETE_IMAGE_SRC = "./getujinitijyoutenkenhyou/icons/monthly-complete.png";
const DAILY_INSPECTION_COMPLETE_IMAGE_ALT = "Daily inspection complete for this month.";
const DAILY_INSPECTION_FIREBASE_CONFIG = Object.freeze({
  apiKey: "AIzaSyA5_YI9ONMCkjX-MTGiKSwvYeAYmJWeGmQ",
  authDomain: "getujinitijyoutenkenhyou.firebaseapp.com",
  projectId: "getujinitijyoutenkenhyou",
  storageBucket: "getujinitijyoutenkenhyou.firebasestorage.app",
  messagingSenderId: "683991833697",
  appId: "1:683991833697:web:a7e0e3b3a85993e7729e20",
});
const DAILY_INSPECTION_APP_SETTINGS = Object.freeze({
  collectionName: "monthlyInspectionEntries",
  useLocalFallbackWhenFirebaseIsMissing: true,
});
const DAILY_INSPECTION_STORAGE_NAMESPACE = "monthly_inspection_app_v1";
const DAILY_INSPECTION_MIN_SELECTABLE_MONTH = "2026-01";
const DAILY_INSPECTION_FIREBASE_REQUIRED_KEYS = ["apiKey", "authDomain", "projectId", "appId"];
const DAILY_INSPECTION_CHECK_SEQUENCE = ["", "レ", "×", "▲"];
const DAILY_INSPECTION_HOLIDAY_CHECK = "休";
const DAILY_INSPECTION_ITEM_IDS = Object.freeze([
  "brake_pedal",
  "brake_fluid",
  "air_pressure",
  "exhaust_sound",
  "parking_brake",
  "tire_pressure",
  "tire_damage",
  "tire_tread",
  "wheel_nut",
  "battery_fluid",
  "coolant",
  "fan_belt",
  "engine_oil",
  "engine_start",
  "engine_response",
  "lights_status",
  "washer_fluid",
  "wiper_status",
  "air_tank_water",
  "documents",
  "emergency_tools",
  "report_changes",
]);
const sharedSettings = window.SharedLauncherSettings;

const elements = {
  app1Button: document.getElementById("app1Button"),
  app2Button: document.getElementById("app2Button"),
  settingsButton: document.getElementById("settingsButton"),
  currentVehicleNumber: document.getElementById("currentVehicleNumber"),
  currentDriverName: document.getElementById("currentDriverName"),
  currentTruckType: document.getElementById("currentTruckType"),
  settingsDialog: document.getElementById("settingsDialog"),
  settingsForm: document.getElementById("settingsForm"),
  closeSettingsButton: document.getElementById("closeSettingsButton"),
  confirmSettingsButton: document.getElementById("confirmSettingsButton"),
  themeMode: document.getElementById("themeMode"),
  vehicleSelect: document.getElementById("vehicleSelect"),
  driverSelect: document.getElementById("driverSelect"),
  truckTypeSelect: document.getElementById("truckTypeSelect"),
  truckTypeList: document.getElementById("truckTypeList"),
  settingsStatus: document.getElementById("settingsStatus"),
  sendFarewell: document.getElementById("sendFarewell"),
  sendFarewellImage: document.getElementById("sendFarewellImage"),
};
const state = {
  shared: sharedSettings.ensureState(),
  cloudReady: false,
  referenceOptions: {
    vehicles: [],
    drivers: [],
    loading: false,
  },
  monthlyLaunchBusy: false,
  dailyLaunchBusy: false,
};
renderAll();
bindEvents();
registerServiceWorker();
void initializeCloudSync();

function refreshSharedState() {
  state.shared = sharedSettings.ensureState();
}

function renderAll() {
  refreshSharedState();
  applyTheme();
  renderLauncherButtons();
  renderCurrentSelection();
  renderSettings();
}

function renderLauncherButtons() {
  elements.app1Button.textContent = APP_CONFIG.app1Name;
  elements.app2Button.textContent = APP_CONFIG.app2Name;
}

function renderCurrentSelection() {
  const current = state.shared.current || {};
  elements.currentVehicleNumber.textContent = String(current.vehicleNumber || "").trim() || "未選択";
  elements.currentDriverName.textContent = String(current.driverName || "").trim() || "未選択";
  elements.currentTruckType.textContent = current.truckType
    ? sharedSettings.truckTypeLabel(current.truckType)
    : "未選択";
}

function renderSettings() {
  elements.themeMode.value = state.shared.theme;
  renderVehicleSelect();
  renderDriverSelect();
  renderTruckTypeSelect();
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.shared.theme === "dark" ? "dark" : "light");
}

function renderVehicleSelect() {
  renderChoiceSelect({
    select: elements.vehicleSelect,
    rows: getDisplayedVehicleRows(),
    currentValue: state.shared.current.vehicleNumber,
    labelFor: (value) => value,
    loadingText: "読み込み中です。",
    emptyText: "登録された車両番号はありません。",
  });

}

function renderDriverSelect() {
  renderChoiceSelect({
    select: elements.driverSelect,
    rows: getDisplayedDriverRows(),
    currentValue: state.shared.current.driverName,
    labelFor: (value) => sharedSettings.normalizeDriverName(value),
    currentKeyFor: (value) => sharedSettings.normalizeDriverName(value),
    loadingText: "読み込み中です。",
    emptyText: "登録された乗務員名はありません。",
  });

}

function renderTruckTypeSelect() {
  renderChoiceSelect({
    select: elements.truckTypeSelect,
    rows: state.shared.truckTypes,
    currentValue: state.shared.current.truckType,
    labelFor: (value) => sharedSettings.truckTypeLabel(value),
    emptyText: "登録された車種はありません。",
  });
}

function renderVehicleList() {
  renderValueList({
    container: elements.vehicleList,
    rows: getDisplayedVehicleRows(),
    currentValue: state.shared.current.vehicleNumber,
    labelFor: (value) => value,
    onSelect: (value) => setCurrentVehicleNumber(value),
    emptyText: state.referenceOptions.loading ? "読み込み中です。" : "登録された車両番号はありません。",
  });
}

function renderDriverList() {
  renderValueList({
    container: elements.driverList,
    rows: getDisplayedDriverRows(),
    currentValue: state.shared.current.driverName,
    labelFor: (value) => sharedSettings.normalizeDriverName(value),
    currentKeyFor: (value) => sharedSettings.normalizeDriverName(value),
    onSelect: (value) => setCurrentDriverName(value),
    emptyText: state.referenceOptions.loading ? "読み込み中です。" : "登録された乗務員名はありません。",
  });
}

function renderTruckTypeCatalogSelect() {
  const options = sharedSettings.TRUCK_TYPE_CATALOG.filter(
    (item) => !state.shared.truckTypes.includes(item.value)
  );

  elements.newTruckType.innerHTML = "";
  if (!options.length) {
    elements.newTruckType.appendChild(new Option("登録できる車種はありません", ""));
    elements.newTruckType.value = "";
    elements.addTruckTypeBtn.disabled = true;
    return;
  }

  elements.newTruckType.appendChild(new Option("選択してください", ""));
  options.forEach((item) => {
    elements.newTruckType.appendChild(new Option(item.label, item.value));
  });
  elements.newTruckType.value = "";
  elements.addTruckTypeBtn.disabled = false;
}

function renderTruckTypeList() {
  renderValueList({
    container: elements.truckTypeList,
    rows: state.shared.truckTypes,
    currentValue: state.shared.current.truckType,
    labelFor: (value) => sharedSettings.truckTypeLabel(value),
    onSelect: (value) => setCurrentTruckType(value),
  });
}

function getDisplayedVehicleRows() {
  const rows = [...state.referenceOptions.vehicles];
  const currentValue = String(state.shared.current.vehicleNumber || "").trim();
  if (currentValue && !rows.includes(currentValue)) {
    rows.unshift(currentValue);
  }
  return rows;
}

function getDisplayedDriverRows() {
  const rows = [...state.referenceOptions.drivers];
  const currentValue = String(state.shared.current.driverName || "").trim();
  if (
    currentValue
    && !rows.some((value) => sharedSettings.normalizeDriverName(value) === currentValue)
  ) {
    rows.unshift(currentValue);
  }
  return rows;
}

function renderChoiceSelect({
  select,
  rows,
  currentValue,
  labelFor,
  loadingText = "読み込み中です。",
  emptyText = "項目はありません。",
  currentKeyFor = (value) => value,
}) {
  select.innerHTML = "";

  if (state.referenceOptions.loading) {
    select.appendChild(new Option(loadingText, ""));
    select.value = "";
    select.disabled = true;
    return;
  }

  const uniqueRows = [];
  const seenKeys = new Set();
  rows.forEach((value) => {
    const key = String(currentKeyFor(value) ?? "");
    if (!key || seenKeys.has(key)) return;
    seenKeys.add(key);
    uniqueRows.push(value);
  });

  if (!uniqueRows.length) {
    select.appendChild(new Option(emptyText, ""));
    select.value = "";
    select.disabled = true;
    return;
  }

  uniqueRows.forEach((value) => {
    select.appendChild(new Option(labelFor(value), value));
  });

  const selectedRow = uniqueRows.find((value) => currentKeyFor(value) === currentValue) || uniqueRows[0];
  select.value = selectedRow;
  select.disabled = false;
}

function renderValueList({
  container,
  rows,
  currentValue,
  labelFor,
  onSelect,
  emptyText = "項目はありません。",
  currentKeyFor = (value) => value,
}) {
  container.innerHTML = "";

  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "empty-list";
    empty.textContent = emptyText;
    container.appendChild(empty);
    return;
  }

  [...new Set(rows)].forEach((value) => {
    const row = document.createElement("div");
    const isCurrent = currentKeyFor(value) === currentValue;
    row.className = `value-item${isCurrent ? " current" : ""}`;

    const label = document.createElement("span");
    label.className = "value-label";
    label.textContent = labelFor(value);

    const actions = document.createElement("div");
    actions.className = "value-actions";

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "mini-button primary";
    selectButton.textContent = isCurrent ? "選択中" : "表示";
    selectButton.disabled = isCurrent;
    selectButton.addEventListener("click", () => onSelect(value));
    actions.appendChild(selectButton);
    row.appendChild(label);
    row.appendChild(actions);
    container.appendChild(row);
  });
}

function getStringArray(source, fieldName = "values") {
  if (!source || typeof source !== "object" || !Array.isArray(source[fieldName])) {
    return [];
  }
  return source[fieldName].map((value) => String(value ?? "").trim()).filter(Boolean);
}

function getStringArrayFromFieldNames(source, fieldNames = ["values"]) {
  for (const fieldName of fieldNames) {
    const values = getStringArray(source, fieldName);
    if (values.length) {
      return values;
    }
  }
  return [];
}

function extractReferenceOptionsFromSyainmeibo(source) {
  return {
    vehicles: sortReferenceRows(
      getStringArrayFromFieldNames(
        source,
        REFERENCE_SOURCE_CONFIG[REFERENCE_SOURCE_KIND.VEHICLES].fieldNames
      )
    ),
    drivers: sharedSettings.normalizeDrivers(
      getStringArrayFromFieldNames(
        source,
        REFERENCE_SOURCE_CONFIG[REFERENCE_SOURCE_KIND.DRIVERS].fieldNames
      )
    ),
  };
}

function sortReferenceRows(rows, labelFor = (value) => String(value || "")) {
  return [...rows].sort((left, right) => labelFor(left).localeCompare(labelFor(right), "ja"));
}

let referenceSettingsRuntimePromise = null;

async function getReferenceSettingsRuntime() {
  if (referenceSettingsRuntimePromise) {
    return referenceSettingsRuntimePromise;
  }

  referenceSettingsRuntimePromise = (async () => {
    const [appModule, authModule, firestoreModule] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js"),
    ]);

    const appName = "__launcher_reference_settings__";
    const existingApp = typeof appModule.getApps === "function"
      ? appModule.getApps().find((app) => app.name === appName)
      : null;
    const app = existingApp || appModule.initializeApp(REFERENCE_FIREBASE_CONFIG, appName);

    return {
      auth: authModule.getAuth(app),
      authModule,
      db: firestoreModule.getFirestore(app),
      firestoreModule,
    };
  })().catch((error) => {
    referenceSettingsRuntimePromise = null;
    throw error;
  });

  return referenceSettingsRuntimePromise;
}

async function ensureReferenceSettingsAuth(runtime) {
  if (runtime.auth.currentUser) {
    return runtime.auth.currentUser;
  }
  const credential = await runtime.authModule.signInAnonymously(runtime.auth);
  return credential.user;
}

async function loadLegacyReferenceOptions(runtime) {
  const { db, firestoreModule } = runtime;
  const [vehicleSnapshot, driverSnapshot] = await Promise.all([
    firestoreModule.getDoc(firestoreModule.doc(db, REFERENCE_VEHICLE_SETTINGS_DOC.collection, REFERENCE_VEHICLE_SETTINGS_DOC.id)),
    firestoreModule.getDoc(firestoreModule.doc(db, REFERENCE_DRIVER_SETTINGS_DOC.collection, REFERENCE_DRIVER_SETTINGS_DOC.id)),
  ]);

  return {
    vehicles: sortReferenceRows(getStringArray(vehicleSnapshot.exists() ? vehicleSnapshot.data() : {})),
    drivers: sharedSettings.normalizeDrivers(
      getStringArray(driverSnapshot.exists() ? driverSnapshot.data() : {})
    ),
  };
}

async function saveSyainmeiboReferenceValues(runtime, referenceKind, values) {
  const referenceConfig = REFERENCE_SOURCE_CONFIG[referenceKind];
  if (!referenceConfig) {
    throw new Error(`Unknown reference kind: ${referenceKind}`);
  }

  const normalizedValues = [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
  const { db, firestoreModule } = runtime;
  const nowIso = new Date().toISOString();
  await firestoreModule.setDoc(
    firestoreModule.doc(db, REFERENCE_SYAINMEIBO_DOC.collection, REFERENCE_SYAINMEIBO_DOC.id),
    {
      [referenceConfig.primaryFieldName]: normalizedValues,
      [referenceConfig.metaFieldName]: {
        valueCount: normalizedValues.length,
        clientUpdatedAt: nowIso,
        updatedAt: firestoreModule.serverTimestamp(),
        source: "launcher-settings",
      },
      updatedAt: firestoreModule.serverTimestamp(),
    },
    { merge: true }
  );
  return normalizedValues;
}

async function loadReferenceOptionsFromFirebase() {
  const runtime = await getReferenceSettingsRuntime();
  await ensureReferenceSettingsAuth(runtime);
  const { db, firestoreModule } = runtime;
  const syainmeiboSnapshot = await firestoreModule.getDoc(
    firestoreModule.doc(db, REFERENCE_SYAINMEIBO_DOC.collection, REFERENCE_SYAINMEIBO_DOC.id)
  );
  const syainmeiboOptions = syainmeiboSnapshot.exists()
    ? extractReferenceOptionsFromSyainmeibo(syainmeiboSnapshot.data())
    : { vehicles: [], drivers: [] };

  if (syainmeiboOptions.vehicles.length && syainmeiboOptions.drivers.length) {
    return syainmeiboOptions;
  }

  const legacyOptions = await loadLegacyReferenceOptions(runtime);
  if (!syainmeiboOptions.vehicles.length && legacyOptions.vehicles.length) {
    await saveSyainmeiboReferenceValues(runtime, REFERENCE_SOURCE_KIND.VEHICLES, legacyOptions.vehicles);
  }
  if (!syainmeiboOptions.drivers.length && legacyOptions.drivers.length) {
    await saveSyainmeiboReferenceValues(runtime, REFERENCE_SOURCE_KIND.DRIVERS, legacyOptions.drivers);
  }

  return {
    vehicles: syainmeiboOptions.vehicles.length ? syainmeiboOptions.vehicles : legacyOptions.vehicles,
    drivers: syainmeiboOptions.drivers.length ? syainmeiboOptions.drivers : legacyOptions.drivers,
  };
}

async function saveReferenceValues(referenceKind, values) {
  const runtime = await getReferenceSettingsRuntime();
  await ensureReferenceSettingsAuth(runtime);
  const referenceConfig = REFERENCE_SOURCE_CONFIG[referenceKind];
  if (!referenceConfig) {
    throw new Error(`Unknown reference kind: ${referenceKind}`);
  }
  const normalizedValues = [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];

  await saveSyainmeiboReferenceValues(runtime, referenceKind, normalizedValues);

  return normalizedValues;
}

async function refreshReferenceOptions() {
  state.referenceOptions.loading = true;
  renderSettings();

  try {
    const referenceOptions = await loadReferenceOptionsFromFirebase();
    sharedSettings.saveVehicles(referenceOptions.vehicles);
    sharedSettings.saveDrivers(referenceOptions.drivers);
    state.referenceOptions = {
      ...referenceOptions,
      loading: false,
    };
    renderSettings();
  } catch (error) {
    state.referenceOptions.loading = false;
    renderSettings();
    console.warn("Failed to load vehicle/driver options:", error);
    setStatus(`車両番号と乗務員名の読み込みに失敗しました: ${error.message}`);
  }
}
function bindEvents() {
  elements.app1Button.addEventListener("click", () => {
    void openMonthlyApp();
  });
  elements.app2Button.addEventListener("click", () => {
    void openDailyInspectionApp();
  });

  elements.settingsButton.addEventListener("click", () => {
    clearStatus();
    renderAll();
    elements.settingsDialog.showModal();
    void refreshReferenceOptions();
  });

  elements.closeSettingsButton.addEventListener("click", closeSettingsDialog);
  elements.confirmSettingsButton.addEventListener("click", closeSettingsDialog);
  elements.settingsForm.addEventListener("submit", (event) => event.preventDefault());

  elements.settingsDialog.addEventListener("click", (event) => {
    const rect = elements.settingsDialog.getBoundingClientRect();
    const isInDialog =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width;

    if (!isInDialog) {
      closeSettingsDialog();
    }
  });

  elements.themeMode.addEventListener("change", (event) => {
    sharedSettings.saveTheme(event.target.value);
    renderAll();
    setStatus("表示モードを更新しました。");
  });
  elements.vehicleSelect.addEventListener("change", (event) => {
    const value = String(event.target.value || "").trim();
    if (!value) return;
    setCurrentVehicleNumber(value);
  });

  elements.driverSelect.addEventListener("change", (event) => {
    const value = String(event.target.value || "").trim();
    if (!value) return;
    setCurrentDriverName(value);
  });

  elements.truckTypeSelect.addEventListener("change", (event) => {
    const value = String(event.target.value || "").trim();
    if (!value) return;
    setCurrentTruckType(value);
  });
}
function closeSettingsDialog() {
  elements.settingsDialog.close();
}

function clearStatus() {
  elements.settingsStatus.textContent = "";
}

function setStatus(message) {
  elements.settingsStatus.textContent = message;
}

function setCurrentVehicleNumber(value) {
  sharedSettings.updateCurrent({ vehicleNumber: value });
  renderAll();
  setStatus("車両番号を更新しました。");
}

function setCurrentDriverName(value) {
  sharedSettings.updateCurrent({ driverName: value });
  renderAll();
  setStatus("乗務員名を更新しました。");
}

function setCurrentTruckType(value) {
  sharedSettings.updateCurrent({ truckType: value });
  renderAll();
  setStatus("車種を更新しました。");
}

async function removeVehicleNumber(value) {
  if (!window.confirm(`「${value}」を削除しますか？`)) {
    return;
  }

  try {
    const nextVehicles = getDisplayedVehicleRows().filter((entry) => entry !== value);
    const savedVehicles = await saveReferenceValues(REFERENCE_SOURCE_KIND.VEHICLES, nextVehicles);
    sharedSettings.saveVehicles(savedVehicles);

    if (String(state.shared.current.vehicleNumber || "").trim() === value) {
      sharedSettings.updateCurrent({ vehicleNumber: savedVehicles[0] || "" });
    }

    state.referenceOptions.vehicles = savedVehicles;
    renderAll();
    setStatus("車両番号を削除しました。");
  } catch (error) {
    console.warn("Failed to delete vehicle number:", error);
    setStatus(`車両番号の削除に失敗しました: ${error.message}`);
  }
}

async function removeDriverName(value) {
  const label = sharedSettings.normalizeDriverName(value);
  if (!window.confirm(`「${label}」を削除しますか？`)) {
    return;
  }

  try {
    const nextDrivers = getDisplayedDriverRows().filter((entry) => entry !== value);
    const savedDrivers = await saveReferenceValues(REFERENCE_SOURCE_KIND.DRIVERS, nextDrivers);
    sharedSettings.saveDrivers(savedDrivers);

    if (String(state.shared.current.driverName || "").trim() === label) {
      sharedSettings.updateCurrent({ driverName: sharedSettings.normalizeDriverName(savedDrivers[0] || "") });
    }

    state.referenceOptions.drivers = savedDrivers;
    renderAll();
    setStatus("乗務員名を削除しました。");
  } catch (error) {
    console.warn("Failed to delete driver name:", error);
    setStatus(`乗務員名の削除に失敗しました: ${error.message}`);
  }
}
function addTruckType() {
  const value = String(elements.newTruckType.value || "").trim();
  if (!value) {
    setStatus("車種を選択してください。");
    return;
  }

  if (state.shared.truckTypes.includes(value)) {
    setStatus("同じ車種は登録済みです。");
    return;
  }

  sharedSettings.saveTruckTypes(state.shared.truckTypes.concat(value));
  renderAll();
  setStatus("車種を登録しました。");
}

function removeTruckType(value) {
  if (state.shared.truckTypes.length <= 1) {
    setStatus("車種は1件以上必要です。");
    return;
  }
  if (!window.confirm(`「${sharedSettings.truckTypeLabel(value)}」を削除しますか？`)) {
    return;
  }
  sharedSettings.saveTruckTypes(state.shared.truckTypes.filter((entry) => entry !== value));
  renderAll();
  setStatus("車種を削除しました。");
}

async function initializeCloudSync() {
  if (!window.FirebaseCloudSync || typeof window.FirebaseCloudSync.init !== "function") {
    return;
  }

  try {
    await window.FirebaseCloudSync.init({
      getPayload: buildCloudPayload,
    });
    state.cloudReady = typeof window.FirebaseCloudSync.isEnabled === "function"
      ? window.FirebaseCloudSync.isEnabled()
      : true;
  } catch (error) {
    console.warn("Failed to initialize Firebase cloud sync:", error);
    state.cloudReady = false;
  }

  renderAll();
}
function buildCloudPayload() {
  const current = state.shared.current;
  return {
    current: {
      inspectionDate: todayText(),
      driverName: current.driverName || "",
      vehicleNumber: current.vehicleNumber || "",
      truckType: current.truckType || sharedSettings.TRUCK_TYPES.LOW12,
    },
  };
}

function buildSelectableMonthKeys(date = new Date()) {
  const keys = [];
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  for (let currentMonth = month; currentMonth >= 1; currentMonth -= 1) {
    keys.push(`${year}-${String(currentMonth).padStart(2, "0")}`);
  }

  const previousYearMonthCount = Math.max(0, 4 - month);
  for (let offset = 0; offset < previousYearMonthCount; offset += 1) {
    keys.push(`${year - 1}-${String(12 - offset).padStart(2, "0")}`);
  }

  return keys;
}

function hasMonthlySelectionTarget() {
  const current = state.shared.current || {};
  return Boolean(
    String(current.driverName || "").trim()
    && String(current.vehicleNumber || "").trim()
    && String(current.truckType || "").trim()
    && state.shared.truckTypes.includes(current.truckType)
  );
}

function hideSendFarewell() {
  if (!elements.sendFarewell) {
    return;
  }

  elements.sendFarewell.classList.remove("show");
  elements.sendFarewell.setAttribute("aria-hidden", "true");
}

async function showSendFarewell(options = {}) {
  if (!elements.sendFarewell) {
    return;
  }

  const image = elements.sendFarewellImage;
  if (image) {
    if (options.src) image.src = options.src;
    if (options.alt) image.alt = options.alt;
  }

  elements.sendFarewell.classList.add("show");
  elements.sendFarewell.setAttribute("aria-hidden", "false");

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

  await new Promise((resolve) => window.setTimeout(resolve, Number(options.durationMs) || 1800));
  hideSendFarewell();
}

async function shouldShowMonthlyCompleteImage() {
  refreshSharedState();

  if (!state.cloudReady) {
    return false;
  }

  if (!hasMonthlySelectionTarget()) {
    return false;
  }

  if (!window.FirebaseCloudSync || typeof window.FirebaseCloudSync.listSubmittedMonthsForPayload !== "function") {
    return false;
  }

  const lookupMonths = buildSelectableMonthKeys();
  if (!lookupMonths.length) {
    return false;
  }

  let timeoutId = 0;
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(new Error("month_lookup_timeout"));
      }, 5000);
    });
    const result = await Promise.race([
      window.FirebaseCloudSync.listSubmittedMonthsForPayload(
        buildCloudPayload(),
        { monthKeys: lookupMonths }
      ),
      timeoutPromise,
    ]);

    if (!result || !result.ok) {
      return false;
    }

    const submittedSet = new Set(Array.isArray(result.months) ? result.months : []);
    return lookupMonths.every((monthKey) => submittedSet.has(monthKey));
  } catch (error) {
    console.warn("Failed to check monthly inspection availability:", error);
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function openMonthlyApp() {
  if (state.monthlyLaunchBusy) {
    return;
  }

  state.monthlyLaunchBusy = true;
  elements.app1Button.disabled = true;

  try {
    if (await shouldShowMonthlyCompleteImage()) {
      await showSendFarewell({
        src: MONTHLY_COMPLETE_IMAGE_SRC,
        alt: MONTHLY_COMPLETE_IMAGE_ALT,
      });
      return;
    }

    openApp(APP_CONFIG.app1Path);
  } finally {
    state.monthlyLaunchBusy = false;
    elements.app1Button.disabled = false;
  }
}

function getCurrentYearMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function compareYearMonth(left, right) {
  return String(left || "").localeCompare(String(right || ""));
}

function parseYearMonth(yearMonth) {
  const [yearText, monthText] = String(yearMonth || "").split("-");
  return {
    year: Number(yearText),
    month: Number(monthText),
  };
}

function getDaysInMonth(yearMonth) {
  const { year, month } = parseYearMonth(yearMonth);
  return new Date(year, month, 0).getDate();
}

function addMonths(yearMonth, delta) {
  const { year, month } = parseYearMonth(yearMonth);
  const next = new Date(year, month - 1 + delta, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function getDailyInspectionLookupMonths() {
  const currentMonth = getCurrentYearMonth();
  if (compareYearMonth(currentMonth, DAILY_INSPECTION_MIN_SELECTABLE_MONTH) < 0) {
    return [];
  }

  const lookupMonths = [];
  let cursor = DAILY_INSPECTION_MIN_SELECTABLE_MONTH;

  while (compareYearMonth(cursor, currentMonth) <= 0) {
    lookupMonths.push(cursor);
    cursor = addMonths(cursor, 1);
  }

  return lookupMonths;
}

function normalizeDailyInspectionChecksByDay(checksByDay) {
  return Object.entries(checksByDay || {}).reduce((result, [day, values]) => {
    result[String(day)] = normalizeDailyInspectionDayChecks(values || {});
    return result;
  }, {});
}

function normalizeDailyInspectionDayChecks(values) {
  const normalized = {};
  DAILY_INSPECTION_ITEM_IDS.forEach((itemId) => {
    const value = values[itemId];
    normalized[itemId] = DAILY_INSPECTION_CHECK_SEQUENCE.includes(value) ? value : "";
  });
  return normalized;
}

function collectDailyInspectionLegacyHolidayDays(checksByDay) {
  return Object.entries(checksByDay || {})
    .filter(([, values]) => {
      const rows = DAILY_INSPECTION_ITEM_IDS.map((itemId) => values?.[itemId] || "");
      return rows.length > 0 && rows.every((value) => value === DAILY_INSPECTION_HOLIDAY_CHECK);
    })
    .map(([day]) => Number(day));
}

function normalizeDailyInspectionHolidayDays(holidayDays, month) {
  const lastDay = getDaysInMonth(month);
  return [...new Set((holidayDays || [])
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= lastDay))]
    .sort((left, right) => left - right);
}

function normalizeDailyInspectionRecord(record) {
  const month = record.month || getCurrentYearMonth();
  const legacyHolidayDays = collectDailyInspectionLegacyHolidayDays(record.checksByDay || {});
  const holidayDays = normalizeDailyInspectionHolidayDays([...(record.holidayDays || []), ...legacyHolidayDays], month);
  const checksByDay = normalizeDailyInspectionChecksByDay(record.checksByDay || {});

  holidayDays.forEach((day) => {
    delete checksByDay[String(day)];
  });

  return {
    month,
    vehicle: record.vehicle || "",
    driver: record.driver || "",
    checksByDay,
    holidayDays,
    _meta: record._meta || {},
  };
}

function isDailyInspectionDayComplete(values) {
  return Object.values(normalizeDailyInspectionDayChecks(values || {})).every((value) => value !== "");
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

function shouldReplaceDailyInspectionMonthRecord(currentRecord, nextRecord) {
  const currentUpdatedAt = Number(currentRecord?._meta?.updatedAtMs || 0);
  const nextUpdatedAt = Number(nextRecord?._meta?.updatedAtMs || 0);
  if (nextUpdatedAt !== currentUpdatedAt) {
    return nextUpdatedAt > currentUpdatedAt;
  }

  const currentDocId = String(currentRecord?._meta?.docId || "");
  const nextDocId = String(nextRecord?._meta?.docId || "");
  return nextDocId.localeCompare(currentDocId) > 0;
}

function readDailyInspectionLocalStoreRecords(vehicle, driver) {
  try {
    const store = JSON.parse(localStorage.getItem(DAILY_INSPECTION_STORAGE_NAMESPACE) || "{\"records\":{}}");
    return Object.values(store.records || {})
      .filter((record) => record && record.vehicle === vehicle && record.driver === driver)
      .map((record) => normalizeDailyInspectionRecord(record));
  } catch {
    return [];
  }
}

function hasDailyInspectionFirebaseConfig(firebaseConfig) {
  return DAILY_INSPECTION_FIREBASE_REQUIRED_KEYS.every((key) => {
    const value = firebaseConfig[key];
    return typeof value === "string" && value.trim() && !value.includes("YOUR_");
  });
}

async function listDailyInspectionRecords(vehicle, driver) {
  const runtime = {
    firebaseConfig: DAILY_INSPECTION_FIREBASE_CONFIG,
    appSettings: DAILY_INSPECTION_APP_SETTINGS,
  };

  if (!hasDailyInspectionFirebaseConfig(runtime.firebaseConfig)) {
    return readDailyInspectionLocalStoreRecords(vehicle, driver);
  }

  const [{ getApps, initializeApp }, firestoreModule] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js"),
  ]);

  const appName = "__launcher_daily_inspection__";
  const existingApp = typeof getApps === "function"
    ? getApps().find((app) => app.name === appName)
    : null;
  const app = existingApp || initializeApp(runtime.firebaseConfig, appName);
  const db = firestoreModule.getFirestore(app);
  const collectionName = String(runtime.appSettings.collectionName || "monthlyInspectionEntries");
  const ref = firestoreModule.collection(db, collectionName);
  const q = firestoreModule.query(
    ref,
    firestoreModule.where("vehicle", "==", vehicle),
    firestoreModule.where("driver", "==", driver)
  );
  const snapshot = await firestoreModule.getDocs(q);

  return snapshot.docs.map((snapshotDoc) => normalizeDailyInspectionRecord({
    ...snapshotDoc.data(),
    _meta: {
      docId: snapshotDoc.id,
      updatedAtMs: toEpochMillis(snapshotDoc.data().updatedAt),
    },
  }));
}

function getDailyInspectionPendingDays(month, record) {
  const currentMonth = getCurrentYearMonth();
  if (compareYearMonth(month, DAILY_INSPECTION_MIN_SELECTABLE_MONTH) < 0) {
    return [];
  }
  const comparison = compareYearMonth(month, currentMonth);
  if (comparison > 0) {
    return [];
  }

  const safeRecord = normalizeDailyInspectionRecord(record || {
    month,
    vehicle: "",
    driver: "",
    checksByDay: {},
    holidayDays: [],
  });
  const holidayDays = new Set((safeRecord.holidayDays || []).map((day) => String(day)));
  const recordedDays = new Set(
    Object.entries(safeRecord.checksByDay || {})
      .filter(([, values]) => isDailyInspectionDayComplete(values))
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

function isDailyInspectionCurrentDayComplete(record) {
  const currentMonth = getCurrentYearMonth();
  const today = String(new Date().getDate());
  const safeRecord = normalizeDailyInspectionRecord(record || {
    month: currentMonth,
    vehicle: "",
    driver: "",
    checksByDay: {},
    holidayDays: [],
  });

  if (String(safeRecord.month || "") !== currentMonth) {
    return false;
  }

  if ((safeRecord.holidayDays || []).some((day) => String(day) === today)) {
    return true;
  }

  return isDailyInspectionDayComplete((safeRecord.checksByDay || {})[today]);
}

async function shouldShowDailyInspectionCompleteImage() {
  refreshSharedState();

  const current = state.shared.current || {};
  const vehicle = String(current.vehicleNumber || "").trim();
  const driver = String(current.driverName || "").trim();
  if (!vehicle || !driver) {
    return false;
  }

  const lookupMonths = getDailyInspectionLookupMonths();
  if (!lookupMonths.length) {
    return false;
  }

  let records;
  try {
    records = await listDailyInspectionRecords(vehicle, driver);
  } catch (error) {
    console.warn("Failed to check daily inspection availability:", error);
    return false;
  }

  const recordsByMonth = (records || []).reduce((result, record) => {
    const monthKey = String(record.month || "");
    const existing = result[monthKey];
    if (!existing || shouldReplaceDailyInspectionMonthRecord(existing, record)) {
      result[monthKey] = record;
    }
    return result;
  }, {});

  return lookupMonths.every((monthKey) => getDailyInspectionPendingDays(monthKey, recordsByMonth[monthKey]).length === 0);
}

async function openDailyInspectionApp() {
  if (state.dailyLaunchBusy) {
    return;
  }

  state.dailyLaunchBusy = true;
  elements.app2Button.disabled = true;

  try {
    if (await shouldShowDailyInspectionCompleteImage()) {
      await showSendFarewell({
        src: DAILY_INSPECTION_COMPLETE_IMAGE_SRC,
        alt: DAILY_INSPECTION_COMPLETE_IMAGE_ALT,
      });
      return;
    }

    openApp(APP_CONFIG.app2Path);
  } finally {
    state.dailyLaunchBusy = false;
    elements.app2Button.disabled = false;
  }
}

function todayText() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTimeMinute(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function openApp(path) {
  if (!path) {
    return;
  }
  window.location.href = path;
}

function canRegisterServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  if (!window.isSecureContext) {
    return false;
  }

  return window.location.protocol === "http:" || window.location.protocol === "https:";
}

function registerServiceWorker() {
  if (!canRegisterServiceWorker()) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {
        console.warn("Service worker registration failed.");
      });
  });
}

