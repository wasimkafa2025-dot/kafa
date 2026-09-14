import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  setLogLevel,
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  getDocs, 
  writeBatch 
} from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { setUserLogHandler } from "@firebase/logger";

// Set Firestore log level to silent to turn off internal BloomFilter fallback warnings
try {
  setLogLevel("silent");
} catch {}

// Intercept Firebase internal logger to silently drop benign BloomFilter warnings
try {
  setUserLogHandler((logDetails) => {
    const msg = logDetails.message || "";
    if (msg.includes("BloomFilter") || msg.includes("Invalid hash count")) {
      return;
    }
    if (logDetails.level === "error") {
      console.error(`[${logDetails.type}]:`, logDetails.message);
    }
  });
} catch {}

// The auto-provisioned workspace configurations
export const WORKSPACE_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBc4rd74Ibf7nkV3SfTji8EDPChAZTW_LY",
  authDomain: "ai-studio-applet-webapp-313aa.firebaseapp.com",
  projectId: "ai-studio-applet-webapp-313aa",
  storageBucket: "ai-studio-applet-webapp-313aa.firebasestorage.app",
  messagingSenderId: "833142233878",
  appId: "1:833142233878:web:4878a2f05c54cb14ae0e37"
};

// The custom database configuration explicitly provided by the user
export const USER_FIREBASE_CONFIG = WORKSPACE_FIREBASE_CONFIG;

let activeApp: FirebaseApp | null = null;
let activeDb: Firestore | null = null;

function tryInitializeAnalytics(app: FirebaseApp) {
  if (typeof window !== "undefined") {
    isSupported()
      .then((supported) => {
        if (supported) {
          getAnalytics(app);
          console.log("Firebase Analytics initialized successfully.");
        }
      })
      .catch((err) => {
        console.warn("Firebase Analytics initialization skipped:", err);
      });
  }
}

const WORKSPACE_DB_ID = "ai-studio-40322e71-9f6e-4f6d-8979-34628b9aa6af";

function createDbInstance(app: FirebaseApp, _mode: "user" | "workspace"): Firestore {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, WORKSPACE_DB_ID);
  } catch (err) {
    try {
      return getFirestore(app, WORKSPACE_DB_ID);
    } catch {
      return initializeFirestore(app, {
        localCache: memoryLocalCache()
      }, WORKSPACE_DB_ID);
    }
  }
}

export function getFirebaseInstance(mode: "user" | "workspace" = "user"): { app: FirebaseApp; db: Firestore } {
  const config = mode === "user" ? USER_FIREBASE_CONFIG : WORKSPACE_FIREBASE_CONFIG;
  const appName = `taskflow_${mode}`;

  try {
    if (getApps().some(app => app.name === appName)) {
      const app = getApp(appName);
      const db = createDbInstance(app, mode);
      tryInitializeAnalytics(app);
      return { app, db };
    }

    const app = initializeApp(config, appName);
    const db = createDbInstance(app, mode);
    tryInitializeAnalytics(app);
    return { app, db };
  } catch (error) {
    console.error(`Error initializing Firebase app [${mode}]:`, error);
    if (getApps().length > 0) {
      const app = getApps()[0];
      const db = createDbInstance(app, mode);
      tryInitializeAnalytics(app);
      return { app, db };
    }
    const app = initializeApp(config, appName);
    const db = createDbInstance(app, mode);
    tryInitializeAnalytics(app);
    return { app, db };
  }
}

// Default helper to get active database based on saved preferences
export function getActiveDb(): Firestore {
  const savedMode = (localStorage.getItem("taskflow_db_mode") as "user" | "workspace") || "workspace";
  return getFirebaseInstance(savedMode).db;
}

export function getActiveDbMode(): "user" | "workspace" {
  return (localStorage.getItem("taskflow_db_mode") as "user" | "workspace") || "workspace";
}

export function setActiveDbMode(mode: "user" | "workspace") {
  localStorage.setItem("taskflow_db_mode", mode);
}
