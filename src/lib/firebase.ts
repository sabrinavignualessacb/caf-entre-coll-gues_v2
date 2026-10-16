import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Connect to the specific firestore database provisioned for this applet with persistent local cache
let firestoreDb;
let persistentCacheActive = false;

try {
  firestoreDb = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    },
    firebaseConfig.firestoreDatabaseId || '(default)'
  );
  persistentCacheActive = true;
} catch (error) {
  // Warn explicitly in console if persistent IndexedDB cache could not be initialized
  // (e.g., if already initialized, private navigation, or iframe restrictions)
  console.warn(
    '[Firestore] Échec de l’initialisation du cache persistant multi-onglets (IndexedDB). Bascule de sécurité vers getFirestore() :',
    error
  );
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
  persistentCacheActive = false;
}

export const db = firestoreDb;

/**
 * Expose un indicateur fiable et vérifié de l'initialisation du cache persistant IndexedDB
 */
export const isPersistentCacheConfigured: boolean = persistentCacheActive;
