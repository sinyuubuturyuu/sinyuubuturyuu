(function () {
  const EXIT_SIGNAL_KEY = "sinyuubuturyuu.exit.signal.v1";
  const EXIT_CHANNEL_NAME = "sinyuubuturyuu.exit.channel.v1";
  const EXIT_SIGNAL_TTL_MS = 12000;
  const EXIT_MESSAGE_TYPE = "sinyuubuturyuu-exit-request";
  const handledTokens = new Set();
  const listeners = new Set();
  const runtimeStartedAt = now();
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

  function isFreshSignal(signal) {
    if (!signal || signal.type !== EXIT_MESSAGE_TYPE || !signal.token) {
      return false;
    }

    if (typeof signal.at !== "number") {
      return false;
    }

    return now() - signal.at <= EXIT_SIGNAL_TTL_MS;
  }

  function rememberToken(token) {
    handledTokens.add(token);
    if (handledTokens.size > 32) {
      const tokens = [...handledTokens].slice(-16);
      handledTokens.clear();
      tokens.forEach((value) => handledTokens.add(value));
    }
  }

  function notify(signal) {
    listeners.forEach((listener) => {
      try {
        listener(signal);
      } catch (error) {
        console.warn("Exit listener failed.", error);
      }
    });
  }

  function handleSignal(signal) {
    if (!isFreshSignal(signal) || handledTokens.has(signal.token)) {
      return false;
    }

    rememberToken(signal.token);
    notify(signal);
    return true;
  }

  function readPendingSignal() {
    try {
      return safeJsonParse(window.localStorage.getItem(EXIT_SIGNAL_KEY));
    } catch {
      return null;
    }
  }

  function createSignal(source) {
    return {
      type: EXIT_MESSAGE_TYPE,
      source: source || window.location.pathname || "unknown",
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

  function requestExit(source) {
    const signal = createSignal(source);
    rememberToken(signal.token);

    try {
      window.localStorage.setItem(EXIT_SIGNAL_KEY, JSON.stringify(signal));
    } catch {
      // noop
    }

    try {
      if (channel) {
        channel.postMessage(signal);
      }
    } catch {
      // noop
    }

    window.setTimeout(() => {
      clearPendingSignal(signal.token);
    }, EXIT_SIGNAL_TTL_MS);

    return signal;
  }

  function ensureListening() {
    if (listening) {
      return;
    }

    listening = true;

    window.addEventListener("storage", (event) => {
      if (event.key !== EXIT_SIGNAL_KEY || !event.newValue) {
        return;
      }
      handleSignal(safeJsonParse(event.newValue));
    });

    if ("BroadcastChannel" in window) {
      try {
        channel = new BroadcastChannel(EXIT_CHANNEL_NAME);
        channel.addEventListener("message", (event) => {
          handleSignal(event.data);
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

  function subscribe(listener) {
    if (typeof listener !== "function") {
      return () => {};
    }

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
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

    window.location.replace(buildFallbackExitUrl());
    return false;
  }

  window.AppExitBridge = Object.freeze({
    closeCurrentWindow,
    ensureListening,
    isFreshSignal,
    readPendingSignal,
    requestExit,
    subscribe,
  });
})();
