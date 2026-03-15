// Firebase runtime config
// Fill production values and set enabled=true.
// Keep keys out of index.html by using this file.
(function () {
  "use strict";

  window.APP_FIREBASE_CONFIG = {
    apiKey: "AIzaSyCvoqg9H2OZewp8nni1tKeOLJlXjO06s7w",
    authDomain: "getujityretenkenhyou-a92f3.firebaseapp.com",
    projectId: "getujityretenkenhyou-a92f3",
    appId: "1:976212280398:web:2857aef38c5b11cdf46f1f",
    messagingSenderId: "976212280398",
    storageBucket: "getujityretenkenhyou-a92f3.firebasestorage.app",
    measurementId: "G-2V09L51NDY"
  };
  window.APP_FIREBASE_SYNC_OPTIONS = {
    enabled: true,
    // Firestore collection name
    collection: "monthly_tire_autosave",
    // Reuse existing collection to avoid additional Firestore rules setup
    settingsBackupCollection: "monthly_tire_autosave",
    // Prefix for document id
    documentPrefix: "monthly_tire",
    // Company identifier for future access control
    companyCode: "company",
    // Use anonymous auth (no user login UI)
    useAnonymousAuth: true,
    // Retry flush interval (ms)
    autoFlushIntervalMs: 15000
  };
})();
