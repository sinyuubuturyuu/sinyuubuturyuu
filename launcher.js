const APP_CONFIG = {
  app1Name: "月次タイヤ点検表",
  app1Path: "./getjityretenkenhyou/index.html",
  app2Name: "月次日常点検表",
  app2Path: "./getujinitijyoutenkenhyou/index.html",
};
const SETTINGS_BACKUP_KIND = Object.freeze({
  VEHICLES: "vehicles",
  DRIVERS: "drivers",
});

const SETTINGS_BACKUP_SLOT = 1;
const MONTHLY_COMPLETE_IMAGE_SRC = "./getjityretenkenhyou/icons/monthly-complete.png";
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
  settingsDialog: document.getElementById("settingsDialog"),
  settingsForm: document.getElementById("settingsForm"),
  closeSettingsButton: document.getElementById("closeSettingsButton"),
  confirmSettingsButton: document.getElementById("confirmSettingsButton"),
  themeMode: document.getElementById("themeMode"),
  newVehicleNumber: document.getElementById("newVehicleNumber"),
  addVehicleBtn: document.getElementById("addVehicleBtn"),
  saveVehicleBackupBtn: document.getElementById("saveVehicleBackupBtn"),
  restoreVehicleBackupBtn: document.getElementById("restoreVehicleBackupBtn"),
  deleteVehicleBackupBtn: document.getElementById("deleteVehicleBackupBtn"),
  vehicleBackupStatus: document.getElementById("vehicleBackupStatus"),
  vehicleList: document.getElementById("vehicleList"),
  newDriverName: document.getElementById("newDriverName"),
  newDriverReading: document.getElementById("newDriverReading"),
  addDriverBtn: document.getElementById("addDriverBtn"),
  saveDriverBackupBtn: document.getElementById("saveDriverBackupBtn"),
  restoreDriverBackupBtn: document.getElementById("restoreDriverBackupBtn"),
  deleteDriverBackupBtn: document.getElementById("deleteDriverBackupBtn"),
  driverBackupStatus: document.getElementById("driverBackupStatus"),
  driverList: document.getElementById("driverList"),
  newTruckType: document.getElementById("newTruckType"),
  addTruckTypeBtn: document.getElementById("addTruckTypeBtn"),
  truckTypeList: document.getElementById("truckTypeList"),
  settingsStatus: document.getElementById("settingsStatus"),
  sendFarewell: document.getElementById("sendFarewell"),
  sendFarewellImage: document.getElementById("sendFarewellImage"),
};

const state = {
  shared: sharedSettings.ensureState(),
  backupMeta: {
    [SETTINGS_BACKUP_KIND.VEHICLES]: null,
    [SETTINGS_BACKUP_KIND.DRIVERS]: null,
  },
  cloudReady: false,
  backupLoading: false,
  backupWorking: false,
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
  renderSettings();
  renderBackupControls();
}

function renderLauncherButtons() {
  elements.app1Button.textContent = APP_CONFIG.app1Name;
  elements.app2Button.textContent = APP_CONFIG.app2Name;
}

function renderSettings() {
  elements.themeMode.value = state.shared.theme;
  renderVehicleList();
  renderDriverList();
  renderTruckTypeCatalogSelect();
  renderTruckTypeList();
  renderBackupStatus(SETTINGS_BACKUP_KIND.VEHICLES);
  renderBackupStatus(SETTINGS_BACKUP_KIND.DRIVERS);
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.shared.theme === "dark" ? "dark" : "light");
}

function renderVehicleList() {
  renderValueList({
    container: elements.vehicleList,
    rows: state.shared.vehicles,
    currentValue: state.shared.current.vehicleNumber,
    labelFor: (value) => value,
    onSelect: (value) => setCurrentVehicleNumber(value),
    onRemove: (value) => removeVehicleNumber(value),
  });
}

function renderDriverList() {
  renderValueList({
    container: elements.driverList,
    rows: state.shared.drivers,
    currentValue: state.shared.current.driverName,
    labelFor: (value) => sharedSettings.normalizeDriverName(value),
    currentKeyFor: (value) => sharedSettings.normalizeDriverName(value),
    onSelect: (value) => setCurrentDriverName(value),
    onRemove: (value) => removeDriverName(value),
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
    onRemove: (value) => removeTruckType(value),
  });
}

function renderValueList({
  container,
  rows,
  currentValue,
  labelFor,
  onSelect,
  onRemove,
  currentKeyFor = (value) => value,
}) {
  container.innerHTML = "";

  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "empty-list";
    empty.textContent = "まだ登録されていません。";
    container.appendChild(empty);
    return;
  }

  rows.forEach((value) => {
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

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "mini-button";
    removeButton.textContent = "削除";
    removeButton.addEventListener("click", () => onRemove(value));

    actions.appendChild(selectButton);
    actions.appendChild(removeButton);
    row.appendChild(label);
    row.appendChild(actions);
    container.appendChild(row);
  });
}

function renderBackupStatus(kind) {
  const element = kind === SETTINGS_BACKUP_KIND.VEHICLES
    ? elements.vehicleBackupStatus
    : elements.driverBackupStatus;

  if (!state.cloudReady) {
    element.textContent = "バックアップ: 利用できません";
    return;
  }

  if (state.backupLoading) {
    element.textContent = "バックアップ: 読み込み中";
    return;
  }

  const entry = state.backupMeta[kind];
  if (!entry) {
    element.textContent = "バックアップ: 未保存";
    return;
  }

  const updatedAt = entry.serverUpdatedAt || entry.clientUpdatedAt;
  const updatedText = updatedAt ? formatDateTimeMinute(updatedAt) : "日時不明";
  element.textContent = `バックアップ: ${updatedText} / ${entry.valueCount}件`;
}

function renderBackupControls() {
  const disabledBase = state.backupWorking || !state.cloudReady;
  elements.saveVehicleBackupBtn.disabled = disabledBase || !state.shared.vehicles.length;
  elements.restoreVehicleBackupBtn.disabled = disabledBase || !state.backupMeta[SETTINGS_BACKUP_KIND.VEHICLES];
  elements.deleteVehicleBackupBtn.disabled = disabledBase || !state.backupMeta[SETTINGS_BACKUP_KIND.VEHICLES];
  elements.saveDriverBackupBtn.disabled = disabledBase || !state.shared.drivers.length;
  elements.restoreDriverBackupBtn.disabled = disabledBase || !state.backupMeta[SETTINGS_BACKUP_KIND.DRIVERS];
  elements.deleteDriverBackupBtn.disabled = disabledBase || !state.backupMeta[SETTINGS_BACKUP_KIND.DRIVERS];
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
    void refreshSettingsBackups();
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

  elements.addVehicleBtn.addEventListener("click", addVehicleNumber);
  elements.newVehicleNumber.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addVehicleNumber();
  });

  elements.addDriverBtn.addEventListener("click", addDriverName);
  elements.newDriverName.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (!String(elements.newDriverReading.value || "").trim()) {
      elements.newDriverReading.focus();
      return;
    }
    addDriverName();
  });
  elements.newDriverReading.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addDriverName();
  });

  elements.addTruckTypeBtn.addEventListener("click", addTruckType);

  elements.saveVehicleBackupBtn.addEventListener("click", () => {
    void saveSettingsBackup(SETTINGS_BACKUP_KIND.VEHICLES);
  });
  elements.restoreVehicleBackupBtn.addEventListener("click", () => {
    void restoreSettingsBackup(SETTINGS_BACKUP_KIND.VEHICLES);
  });
  elements.deleteVehicleBackupBtn.addEventListener("click", () => {
    void deleteSettingsBackup(SETTINGS_BACKUP_KIND.VEHICLES);
  });

  elements.saveDriverBackupBtn.addEventListener("click", () => {
    void saveSettingsBackup(SETTINGS_BACKUP_KIND.DRIVERS);
  });
  elements.restoreDriverBackupBtn.addEventListener("click", () => {
    void restoreSettingsBackup(SETTINGS_BACKUP_KIND.DRIVERS);
  });
  elements.deleteDriverBackupBtn.addEventListener("click", () => {
    void deleteSettingsBackup(SETTINGS_BACKUP_KIND.DRIVERS);
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
  setStatus("乗務員を更新しました。");
}

function setCurrentTruckType(value) {
  sharedSettings.updateCurrent({ truckType: value });
  renderAll();
  setStatus("車種を更新しました。");
}

function addVehicleNumber() {
  const value = String(elements.newVehicleNumber.value || "").trim();
  if (!value) {
    setStatus("車両番号を入力してください。");
    return;
  }

  if (state.shared.vehicles.includes(value)) {
    setStatus("同じ車両番号は登録済みです。");
    return;
  }

  const nextVehicles = state.shared.vehicles.concat(value).sort((left, right) => left.localeCompare(right, "ja"));
  sharedSettings.saveVehicles(nextVehicles);
  elements.newVehicleNumber.value = "";
  renderAll();
  setStatus("車両番号を登録しました。");
}

function removeVehicleNumber(value) {
  if (!window.confirm(`「${value}」を削除しますか？`)) {
    return;
  }
  sharedSettings.saveVehicles(state.shared.vehicles.filter((entry) => entry !== value));
  renderAll();
  setStatus("車両番号を削除しました。");
}

function addDriverName() {
  const rawName = String(elements.newDriverName.value || "").trim();
  const rawReading = String(elements.newDriverReading.value || "").trim();
  const driverName = sharedSettings.normalizeDriverName(rawName);

  if (!driverName) {
    setStatus("乗務員名（漢字）を入力してください。");
    return;
  }

  const normalizedEntry = sharedSettings.normalizeDriverEntry(
    rawReading ? `${driverName}（${rawReading}）` : driverName
  );
  const existingIndex = state.shared.drivers.findIndex(
    (entry) => sharedSettings.normalizeDriverName(entry) === driverName
  );

  if (existingIndex >= 0) {
    if (state.shared.drivers[existingIndex] === normalizedEntry) {
      setStatus("同じ乗務員は登録済みです。");
      return;
    }

    const nextDrivers = state.shared.drivers.slice();
    nextDrivers.splice(existingIndex, 1, normalizedEntry);
    sharedSettings.saveDrivers(nextDrivers);
    elements.newDriverName.value = "";
    elements.newDriverReading.value = "";
    renderAll();
    setStatus("乗務員の読みを更新しました。");
    return;
  }

  sharedSettings.saveDrivers(state.shared.drivers.concat(normalizedEntry));
  elements.newDriverName.value = "";
  elements.newDriverReading.value = "";
  renderAll();
  setStatus("乗務員を登録しました。");
}

function removeDriverName(value) {
  const label = sharedSettings.normalizeDriverName(value);
  if (!window.confirm(`「${label}」を削除しますか？`)) {
    return;
  }
  sharedSettings.saveDrivers(state.shared.drivers.filter((entry) => entry !== value));
  renderAll();
  setStatus("乗務員を削除しました。");
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
    renderBackupControls();
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
  if (state.cloudReady) {
    void refreshSettingsBackups();
  }
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

async function refreshSettingsBackups() {
  if (!state.cloudReady || typeof window.FirebaseCloudSync.loadSettingsBackup !== "function") {
    return;
  }

  state.backupLoading = true;
  renderSettings();
  renderBackupControls();

  try {
    const [vehicleResult, driverResult] = await Promise.all([
      window.FirebaseCloudSync.loadSettingsBackup(SETTINGS_BACKUP_KIND.VEHICLES, SETTINGS_BACKUP_SLOT, { metadataOnly: true }),
      window.FirebaseCloudSync.loadSettingsBackup(SETTINGS_BACKUP_KIND.DRIVERS, SETTINGS_BACKUP_SLOT, { metadataOnly: true }),
    ]);

    state.backupMeta[SETTINGS_BACKUP_KIND.VEHICLES] = vehicleResult.ok ? vehicleResult.backup : null;
    state.backupMeta[SETTINGS_BACKUP_KIND.DRIVERS] = driverResult.ok ? driverResult.backup : null;
  } catch (error) {
    console.warn("Failed to refresh settings backups:", error);
  } finally {
    state.backupLoading = false;
    renderSettings();
    renderBackupControls();
  }
}

async function saveSettingsBackup(kind) {
  if (!state.cloudReady || typeof window.FirebaseCloudSync.saveSettingsBackup !== "function") {
    setStatus("バックアップは利用できません。");
    return;
  }

  const values = kind === SETTINGS_BACKUP_KIND.VEHICLES ? state.shared.vehicles : state.shared.drivers;
  if (!values.length) {
    setStatus("保存する設定がありません。");
    return;
  }

  state.backupWorking = true;
  renderBackupControls();

  try {
    const result = await window.FirebaseCloudSync.saveSettingsBackup(
      kind,
      SETTINGS_BACKUP_SLOT,
      values,
      { source: "launcher" }
    );

    if (!result.ok || !result.backup) {
      setStatus("バックアップの保存に失敗しました。");
      return;
    }

    state.backupMeta[kind] = result.backup;
    renderSettings();
    setStatus("バックアップを保存しました。");
  } catch (error) {
    console.warn("Failed to save settings backup:", error);
    setStatus("バックアップの保存に失敗しました。");
  } finally {
    state.backupWorking = false;
    renderBackupControls();
  }
}

async function restoreSettingsBackup(kind) {
  if (!state.cloudReady || typeof window.FirebaseCloudSync.loadSettingsBackup !== "function") {
    setStatus("バックアップは利用できません。");
    return;
  }

  state.backupWorking = true;
  renderBackupControls();

  try {
    const result = await window.FirebaseCloudSync.loadSettingsBackup(kind, SETTINGS_BACKUP_SLOT);
    if (!result.ok || !result.backup) {
      setStatus("バックアップの復元に失敗しました。");
      return;
    }

    if (kind === SETTINGS_BACKUP_KIND.VEHICLES) {
      sharedSettings.saveVehicles(result.backup.values);
    } else {
      sharedSettings.saveDrivers(result.backup.values);
    }

    state.backupMeta[kind] = result.backup;
    renderAll();
    setStatus("バックアップを復元しました。");
  } catch (error) {
    console.warn("Failed to restore settings backup:", error);
    setStatus("バックアップの復元に失敗しました。");
  } finally {
    state.backupWorking = false;
    renderBackupControls();
  }
}

async function deleteSettingsBackup(kind) {
  if (!state.cloudReady || typeof window.FirebaseCloudSync.deleteSettingsBackup !== "function") {
    setStatus("バックアップは利用できません。");
    return;
  }

  if (!window.confirm("バックアップを削除しますか？")) {
    return;
  }

  state.backupWorking = true;
  renderBackupControls();

  try {
    const result = await window.FirebaseCloudSync.deleteSettingsBackup(kind, SETTINGS_BACKUP_SLOT);
    if (!result.ok) {
      setStatus("バックアップの削除に失敗しました。");
      return;
    }

    state.backupMeta[kind] = null;
    renderSettings();
    setStatus("バックアップを削除しました。");
  } catch (error) {
    console.warn("Failed to delete settings backup:", error);
    setStatus("バックアップの削除に失敗しました。");
  } finally {
    state.backupWorking = false;
    renderBackupControls();
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
