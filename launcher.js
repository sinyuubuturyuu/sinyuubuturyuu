const STORAGE_KEY = "sinyuubuturyuu-launcher-settings";

const DEFAULT_SETTINGS = {
  app1Name: "月次タイヤ点検表",
  app1Path: "./getjityretenkenhyou/index.html",
  app2Name: "月次日常点検表",
  app2Path: "./getujinitijyoutenkenhyou/index.html",
};

const elements = {
  app1Button: document.getElementById("app1Button"),
  app2Button: document.getElementById("app2Button"),
  settingsButton: document.getElementById("settingsButton"),
  installHint: document.getElementById("installHint"),
  settingsDialog: document.getElementById("settingsDialog"),
  settingsForm: document.getElementById("settingsForm"),
  closeSettingsButton: document.getElementById("closeSettingsButton"),
  resetSettingsButton: document.getElementById("resetSettingsButton"),
  settingsStatus: document.getElementById("settingsStatus"),
  app1Name: document.getElementById("app1Name"),
  app1Path: document.getElementById("app1Path"),
  app2Name: document.getElementById("app2Name"),
  app2Path: document.getElementById("app2Path"),
};

let currentSettings = loadSettings();

render();
bindEvents();
registerServiceWorker();

function loadSettings() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return { ...DEFAULT_SETTINGS };
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch (error) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(nextSettings) {
  currentSettings = { ...DEFAULT_SETTINGS, ...nextSettings };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
  render();
}

function render() {
  elements.app1Button.textContent = currentSettings.app1Name;
  elements.app2Button.textContent = currentSettings.app2Name;
  elements.app1Name.value = currentSettings.app1Name;
  elements.app1Path.value = currentSettings.app1Path;
  elements.app2Name.value = currentSettings.app2Name;
  elements.app2Path.value = currentSettings.app2Path;
}

function bindEvents() {
  elements.app1Button.addEventListener("click", () => openApp(currentSettings.app1Path));
  elements.app2Button.addEventListener("click", () => openApp(currentSettings.app2Path));

  elements.settingsButton.addEventListener("click", () => {
    elements.settingsStatus.textContent = "";
    elements.settingsDialog.showModal();
  });

  elements.closeSettingsButton.addEventListener("click", () => {
    elements.settingsDialog.close();
  });

  elements.resetSettingsButton.addEventListener("click", () => {
    saveSettings(DEFAULT_SETTINGS);
    elements.settingsStatus.textContent = "初期値に戻しました。";
  });

  elements.settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const nextSettings = {
      app1Name: elements.app1Name.value.trim() || DEFAULT_SETTINGS.app1Name,
      app1Path: normalizePath(elements.app1Path.value, DEFAULT_SETTINGS.app1Path),
      app2Name: elements.app2Name.value.trim() || DEFAULT_SETTINGS.app2Name,
      app2Path: normalizePath(elements.app2Path.value, DEFAULT_SETTINGS.app2Path),
    };

    saveSettings(nextSettings);
    elements.settingsStatus.textContent = "設定を保存しました。";
    window.setTimeout(() => {
      elements.settingsDialog.close();
    }, 350);
  });

  elements.settingsDialog.addEventListener("click", (event) => {
    const rect = elements.settingsDialog.getBoundingClientRect();
    const isInDialog =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width;

    if (!isInDialog) {
      elements.settingsDialog.close();
    }
  });

  window.addEventListener("appinstalled", () => {
    elements.installHint.textContent = "ホーム画面への追加が完了しました。";
  });
}

function normalizePath(value, fallback) {
  const trimmed = value.trim();
  return trimmed || fallback;
}

function openApp(path) {
  if (!path) {
    return;
  }
  window.location.href = path;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      elements.installHint.textContent = "インストール準備に失敗しました。ブラウザを再読み込みしてください。";
    });
  });
}
