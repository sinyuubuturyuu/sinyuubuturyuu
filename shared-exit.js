(function () {
  const EXIT_SIGNAL_KEY = "sinyuubuturyuu.exit.signal.v1";
  const EXIT_ACK_KEY = "sinyuubuturyuu.exit.ack.v1";
  const EXIT_CHANNEL_NAME = "sinyuubuturyuu.exit.channel.v1";
  const EXIT_SIGNAL_TTL_MS = 12000;
  const EXIT_MESSAGE_TYPE = "sinyuubuturyuu-exit-request";
  const EXIT_ACK_TYPE = "sinyuubuturyuu-exit-ack";
  const handledTokens = new Set();
  const handledAckTokens = new Set();
  const listeners = new Set();
  const runtimeStartedAt = now();
  const instanceId = createInstanceId();
  let channel = null;
  let listening = false;

  function now() {
    return Date.now();
  }

  function safeJsonParse(value) {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function createInstanceId() {
    return `${now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
  }

  function isFreshSignal(signal) {
    if (!signal || signal.type !== EXIT_MESSAGE_TYPE || !signal.token) {
      return false;
    }

    if (typeof signal.at !== "number") {
      return false;
    }

    return now() - signal.at <= EXIT_SIGNAL_TTL_MS;
  }

  function isFreshAck(ack) {
    if (!ack || ack.type !== EXIT_ACK_TYPE || !ack.signalToken || !ack.instanceId) {
      return false;
    }

    if (typeof ack.at !== "number") {
      return false;
    }

    return now() - ack.at <= EXIT_SIGNAL_TTL_MS;
  }

  function rememberToken(token) {
    handledTokens.add(token);
    if (handledTokens.size > 32) {
      const tokens = [...handledTokens].slice(-16);
      handledTokens.clear();
      tokens.forEach((value) => handledTokens.add(value));
    }
  }

  function normalizeTargetAppIds(targetAppIds) {
    if (!Array.isArray(targetAppIds) || !targetAppIds.length) {
      return [];
    }

    return [...new Set(targetAppIds.filter((value) => typeof value === "string" && value))];
  }

  function matchesTarget(signal, appId) {
    if (!appId) {
      return true;
    }

    if (!Array.isArray(signal.targetAppIds) || !signal.targetAppIds.length) {
      return true;
    }

    return signal.targetAppIds.includes(appId);
  }

  function notify(signal) {
    listeners.forEach((entry) => {
      try {
        if (!matchesTarget(signal, entry.appId)) {
          return;
        }

        entry.listener(signal);
      } catch (error) {
        console.warn("Exit listener failed.", error);
      }
    });
  }

  function handleSignal(signal) {
    if (!isFreshSignal(signal) || handledTokens.has(signal.token) || signal.senderInstanceId === instanceId) {
      return false;
    }

    rememberToken(signal.token);
    notify(signal);
    return true;
  }

  function handleAck(ack) {
    if (!isFreshAck(ack)) {
      return false;
    }

    const ackToken = `${ack.signalToken}:${ack.instanceId}`;
    if (handledAckTokens.has(ackToken)) {
      return false;
    }

    rememberAckToken(ackToken);
    return true;
  }

  function rememberAckToken(token) {
    handledAckTokens.add(token);
    if (handledAckTokens.size > 64) {
      const tokens = [...handledAckTokens].slice(-24);
      handledAckTokens.clear();
      tokens.forEach((value) => handledAckTokens.add(value));
    }
  }

  function readPendingSignal() {
    try {
      return safeJsonParse(window.localStorage.getItem(EXIT_SIGNAL_KEY));
    } catch {
      return null;
    }
  }

  function createSignal(source, options = {}) {
    return {
      type: EXIT_MESSAGE_TYPE,
      source: source || window.location.pathname || "unknown",
      sourceAppId: options.sourceAppId || "",
      senderInstanceId: instanceId,
      targetAppIds: normalizeTargetAppIds(options.targetAppIds),
      token: `${now()}-${Math.random().toString(16).slice(2)}`,
      at: now(),
    };
  }

  function clearPendingSignal(expectedToken) {
    try {
      const currentSignal = safeJsonParse(window.localStorage.getItem(EXIT_SIGNAL_KEY));
      if (!currentSignal) {
        return;
      }

      if (expectedToken && currentSignal.token !== expectedToken) {
        return;
      }

      window.localStorage.removeItem(EXIT_SIGNAL_KEY);
    } catch {
      // noop
    }
  }

  function writeBroadcastMessage(message) {
    try {
      if (channel) {
        channel.postMessage(message);
      }
    } catch {
      // noop
    }
  }

  function writeStorageMessage(key, payload) {
    try {
      window.localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // noop
    }
  }

  function requestExit(source, options = {}) {
    const signal = createSignal(source, options);
    rememberToken(signal.token);

    writeStorageMessage(EXIT_SIGNAL_KEY, signal);
    writeBroadcastMessage(signal);

    window.setTimeout(() => {
      clearPendingSignal(signal.token);
    }, EXIT_SIGNAL_TTL_MS);

    return signal;
  }

  function acknowledgeExit(signal, appId) {
    if (!signal || !signal.token) {
      return null;
    }

    const ack = {
      type: EXIT_ACK_TYPE,
      signalToken: signal.token,
      sourceAppId: signal.sourceAppId || "",
      recipientAppId: appId || "",
      instanceId,
      at: now(),
    };

    rememberAckToken(`${ack.signalToken}:${ack.instanceId}`);
    writeStorageMessage(EXIT_ACK_KEY, ack);
    writeBroadcastMessage(ack);
    return ack;
  }

  function ensureListening() {
    if (listening) {
      return;
    }

    listening = true;

    window.addEventListener("storage", (event) => {
      if (!event.newValue) {
        return;
      }

      if (event.key === EXIT_SIGNAL_KEY) {
        handleSignal(safeJsonParse(event.newValue));
        return;
      }

      if (event.key === EXIT_ACK_KEY) {
        handleAck(safeJsonParse(event.newValue));
      }
    });

    if ("BroadcastChannel" in window) {
      try {
        channel = new BroadcastChannel(EXIT_CHANNEL_NAME);
        channel.addEventListener("message", (event) => {
          const payload = event.data;
          if (payload?.type === EXIT_MESSAGE_TYPE) {
            handleSignal(payload);
            return;
          }

          if (payload?.type === EXIT_ACK_TYPE) {
            handleAck(payload);
          }
        });
      } catch {
        channel = null;
      }
    }

    const pendingSignal = readPendingSignal();
    if (isFreshSignal(pendingSignal) && pendingSignal.at >= runtimeStartedAt) {
      window.setTimeout(() => {
        handleSignal(pendingSignal);
      }, 0);
    } else if (pendingSignal && !isFreshSignal(pendingSignal)) {
      clearPendingSignal();
    }
  }

  function subscribe(listener, options = {}) {
    if (typeof listener !== "function") {
      return () => {};
    }

    const entry = {
      appId: typeof options.appId === "string" ? options.appId : "",
      listener,
    };

    listeners.add(entry);
    return () => {
      listeners.delete(entry);
    };
  }

  function buildFallbackExitUrl() {
    const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>終了中</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: sans-serif;
      background: #0f172a;
      color: #f8fafc;
      text-align: center;
      padding: 24px;
      box-sizing: border-box;
    }
    p {
      margin: 0;
      line-height: 1.7;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <p>終了中です。<br>閉じない場合はこの画面を閉じてください。</p>
  <script>
    setTimeout(function () {
      try { window.open("", "_self"); } catch (error) {}
      try { window.close(); } catch (error) {}
    }, 60);
  </script>
</body>
</html>`;

    return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  }

  async function closeCurrentWindow() {
    try {
      window.close();
    } catch {
      // noop
    }

    await new Promise((resolve) => window.setTimeout(resolve, 160));

    if (document.visibilityState === "hidden") {
      return true;
    }

    try {
      window.open("", "_self");
      window.close();
    } catch {
      // noop
    }

    await new Promise((resolve) => window.setTimeout(resolve, 160));

    if (document.visibilityState === "hidden") {
      return true;
    }

    // 確実にドキュメントを空にする
    try {
      const blankDoc = document.open();
      blankDoc.write("");
      blankDoc.close();
    } catch {
      // noop
    }

    try {
      window.location.replace("about:blank");
    } catch {
      // noop
    }

    return false;
  }

  window.AppExitBridge = Object.freeze({
    acknowledgeExit,
    closeCurrentWindow,
    ensureListening,
    getInstanceId: () => instanceId,
    isFreshSignal,
    readPendingSignal,
    requestExit,
    subscribe,
  });
})();
