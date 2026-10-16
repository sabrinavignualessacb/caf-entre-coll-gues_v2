import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  getDocs,
  deleteField,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Colleague, CoffeeRound, GroupSettings, ColleagueBalance } from '../types';

const COLLEAGUES_COLLECTION = 'colleagues';
const ROUNDS_COLLECTION = 'coffee_rounds';
const SETTINGS_COLLECTION = 'group_settings';
const DEFAULT_SETTINGS_DOC = 'main';

// Default Group Settings
export const DEFAULT_SETTINGS: GroupSettings = {
  pricePerCup: 1.20,
  currency: '€',
  groupName: 'Pause Café Équipe',
  theme: 'epure_slate',
};

// Default seed colleagues requested by user
export const USER_PRESET_DATA = [
  { name: 'Vincent', avatar: '👨‍💼', cupsPaid: 5, cupsConsumed: 0 },
  { name: 'Samir', avatar: '👨‍💻', cupsPaid: 1, cupsConsumed: 0 },
  { name: 'Fred', avatar: '🙋‍♂️', cupsPaid: 4, cupsConsumed: 0 },
  { name: 'Sabrina', avatar: '👩‍💼', cupsPaid: 5, cupsConsumed: 0 },
  { name: 'Invité', avatar: '☕', cupsPaid: 0, cupsConsumed: 15 },
];

// Offline & Quota Persistence Keys
const PENDING_ROUNDS_KEY = 'coffeeround_pending_rounds';
const PENDING_DELETIONS_KEY = 'coffeeround_pending_deletions';
const PENDING_UPDATES_KEY = 'coffeeround_pending_updates';
const QUOTA_EXCEEDED_KEY = 'coffeeround_quota_exceeded';
const QUOTA_TIMESTAMP_KEY = 'coffeeround_quota_timestamp';

// ============================================================================
// 1. IN-MEMORY & CROSS-TAB DIAGNOSTIC INSTRUMENTATION
// Note: Client-side event tracking only. This is NOT a server billing meter.
// ============================================================================
export interface FirebaseMetrics {
  cachedDocsRendered: number;   // Documents rendered from local IndexedDB cache
  liveUpdatesReceived: number;  // Real-time document updates/deltas received during session
  writesSent: number;           // Write operations initiated by the user
  deletesSent: number;          // Delete operations initiated by the user
  activeListenersCount: number; // Number of active singleton subscription channels
  listenerCreations: number;
  listenerCleanups: number;
  lastOperation: string;
  sessionStartTime: number;
}

const metrics: FirebaseMetrics = {
  cachedDocsRendered: 0,
  liveUpdatesReceived: 0,
  writesSent: 0,
  deletesSent: 0,
  activeListenersCount: 0,
  listenerCreations: 0,
  listenerCleanups: 0,
  lastOperation: 'Initialisation',
  sessionStartTime: Date.now(),
};

const metricsSubscribers = new Set<(m: FirebaseMetrics) => void>();

// Cross-tab metrics sync via BroadcastChannel (Web standard)
let metricsChannel: BroadcastChannel | null = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    metricsChannel = new BroadcastChannel('coffeeround_metrics_channel');
    metricsChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'SYNC_METRICS') {
        const remote = event.data.metrics as FirebaseMetrics;
        // Merge counters
        metrics.cachedDocsRendered = Math.max(metrics.cachedDocsRendered, remote.cachedDocsRendered);
        metrics.liveUpdatesReceived = Math.max(metrics.liveUpdatesReceived, remote.liveUpdatesReceived);
        metrics.writesSent = Math.max(metrics.writesSent, remote.writesSent);
        metrics.deletesSent = Math.max(metrics.deletesSent, remote.deletesSent);
        metrics.lastOperation = remote.lastOperation;
        metricsSubscribers.forEach((cb) => {
          try { cb({ ...metrics }); } catch {}
        });
      }
    };
  }
} catch {}

function notifyMetrics(operation: string) {
  metrics.lastOperation = `${operation} (${new Date().toLocaleTimeString('fr-FR')})`;
  metricsSubscribers.forEach((cb) => {
    try {
      cb({ ...metrics });
    } catch {
      // ignore subscriber error
    }
  });

  if (metricsChannel) {
    try {
      metricsChannel.postMessage({ type: 'SYNC_METRICS', metrics: { ...metrics } });
    } catch {}
  }
}

export function getFirebaseMetrics(): FirebaseMetrics {
  return { ...metrics };
}

export function subscribeFirebaseMetrics(callback: (m: FirebaseMetrics) => void): () => void {
  metricsSubscribers.add(callback);
  callback({ ...metrics });
  return () => {
    metricsSubscribers.delete(callback);
  };
}

export function resetFirebaseMetrics() {
  metrics.cachedDocsRendered = 0;
  metrics.liveUpdatesReceived = 0;
  metrics.writesSent = 0;
  metrics.deletesSent = 0;
  metrics.lastOperation = 'Réinitialisation métriques';
  notifyMetrics('Compteurs remis à zéro');
}

// ============================================================================
// 2. QUOTA DETECTION & STATE MANAGEMENT
// ============================================================================
export function isQuotaError(err: unknown): boolean {
  if (!err) return false;
  const str = String(err);
  return (
    str.includes('resource-exhausted') ||
    str.includes('RESOURCE_EXHAUSTED') ||
    str.includes('Quota limit exceeded') ||
    str.includes('Quota exceeded') ||
    str.includes('quota') ||
    str.includes('Free daily write units') ||
    str.includes('Free daily read units')
  );
}

let quotaExceededState = false;
try {
  quotaExceededState = localStorage.getItem(QUOTA_EXCEEDED_KEY) === 'true';
} catch {}

const quotaListeners = new Set<(exceeded: boolean) => void>();

export function setGlobalQuotaExceeded(exceeded: boolean) {
  quotaExceededState = exceeded;
  try {
    localStorage.setItem(QUOTA_EXCEEDED_KEY, exceeded ? 'true' : 'false');
    if (exceeded) {
      localStorage.setItem(QUOTA_TIMESTAMP_KEY, String(Date.now()));
    } else {
      localStorage.removeItem(QUOTA_TIMESTAMP_KEY);
    }
  } catch {}
  quotaListeners.forEach((fn) => fn(exceeded));
}

export function subscribeQuotaState(callback: (exceeded: boolean) => void) {
  quotaListeners.add(callback);
  callback(quotaExceededState);
  return () => {
    quotaListeners.delete(callback);
  };
}

// ============================================================================
// 3. OFFLINE & LOCAL PENDING QUEUES (Deduplicated)
// ============================================================================
const pendingListeners = new Set<(count: number) => void>();

export function getPendingRounds(): CoffeeRound[] {
  try {
    const raw = localStorage.getItem(PENDING_ROUNDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePendingRounds(rounds: CoffeeRound[]) {
  try {
    localStorage.setItem(PENDING_ROUNDS_KEY, JSON.stringify(rounds));
  } catch {}
  pendingListeners.forEach((fn) => fn(rounds.length));
}

export function getPendingDeletions(): string[] {
  try {
    const raw = localStorage.getItem(PENDING_DELETIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePendingDeletions(ids: string[]) {
  try {
    localStorage.setItem(PENDING_DELETIONS_KEY, JSON.stringify(ids));
  } catch {}
}

export function getPendingUpdates(): Record<string, Partial<CoffeeRound>> {
  try {
    const raw = localStorage.getItem(PENDING_UPDATES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePendingUpdates(updates: Record<string, Partial<CoffeeRound>>) {
  try {
    localStorage.setItem(PENDING_UPDATES_KEY, JSON.stringify(updates));
  } catch {}
}

export function subscribePendingState(callback: (count: number) => void) {
  pendingListeners.add(callback);
  callback(getPendingRounds().length);
  return () => {
    pendingListeners.delete(callback);
  };
}

// Combined cache and subscribers
let latestFirestoreRounds: CoffeeRound[] = [];
try {
  const saved = localStorage.getItem('coffeeround_rounds_backup');
  if (saved) latestFirestoreRounds = JSON.parse(saved);
} catch {}

const roundSubscribers = new Set<(rounds: CoffeeRound[]) => void>();

export function getCombinedRounds(): CoffeeRound[] {
  const pending = getPendingRounds();
  const deletions = new Set(getPendingDeletions());
  const updates = getPendingUpdates();

  // 1. Filter out deleted rounds and apply local updates
  const validFirestore = latestFirestoreRounds
    .filter((r) => !deletions.has(r.id))
    .map((r) => {
      if (updates[r.id]) {
        return { ...r, ...updates[r.id] };
      }
      return r;
    });

  // 2. Combine with pending local rounds (pending take precedence)
  const combinedMap = new Map<string, CoffeeRound>();
  pending.forEach((r) => combinedMap.set(r.id, r));
  validFirestore.forEach((r) => {
    if (!combinedMap.has(r.id)) {
      combinedMap.set(r.id, r);
    }
  });

  const list = Array.from(combinedMap.values());
  // Sort date desc
  list.sort((a, b) => {
    const timeA = new Date(a.date).getTime() || 0;
    const timeB = new Date(b.date).getTime() || 0;
    return timeB - timeA;
  });

  return list;
}

export function notifyRoundSubscribers() {
  const combined = getCombinedRounds();
  try {
    localStorage.setItem('coffeeround_rounds_backup', JSON.stringify(combined));
  } catch {}
  roundSubscribers.forEach((cb) => cb(combined));
}

// ============================================================================
// 4. SINGLETON LISTENER MANAGERS (Prevents duplicate onSnapshot subscriptions)
// ============================================================================

// --- Colleagues Singleton Listener ---
let colleaguesUnsub: (() => void) | null = null;
const colleaguesSubscribers = new Set<(colleagues: Colleague[]) => void>();
let cachedColleagues: Colleague[] = [];
try {
  const saved = localStorage.getItem('coffeeround_colleagues_backup');
  if (saved) cachedColleagues = JSON.parse(saved);
} catch {}

export function subscribeColleagues(
  callback: (colleagues: Colleague[]) => void,
  onError?: (error: unknown) => void
): () => void {
  colleaguesSubscribers.add(callback);

  // Deliver cached data synchronously
  if (cachedColleagues.length > 0) {
    callback(cachedColleagues);
  }

  // Only open ONE onSnapshot connection to Firestore for the entire app
  if (colleaguesSubscribers.size === 1 && !colleaguesUnsub) {
    metrics.listenerCreations++;
    metrics.activeListenersCount++;
    notifyMetrics('Écouteur Collègues connecté');

    let initialCacheRead = true;
    const q = query(collection(db, COLLEAGUES_COLLECTION));
    colleaguesUnsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const isFromCache = snapshot.metadata.fromCache;
        if (isFromCache) {
          if (initialCacheRead) {
            initialCacheRead = false;
            metrics.cachedDocsRendered += snapshot.size;
            notifyMetrics(`Cache local Collègues (${snapshot.size} docs)`);
          }
        } else {
          const deltaCount = snapshot.docChanges().length;
          if (deltaCount > 0) {
            metrics.liveUpdatesReceived += deltaCount;
            notifyMetrics(`Direct Collègues (+${deltaCount} màj)`);
          } else {
            notifyMetrics('Flux Collègues synchronisé');
          }
        }

        cachedColleagues = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Colleague, 'id'>),
        }));
        try {
          localStorage.setItem('coffeeround_colleagues_backup', JSON.stringify(cachedColleagues));
        } catch {}
        colleaguesSubscribers.forEach((cb) => cb(cachedColleagues));
      },
      (error) => {
        console.error('Error listening to colleagues:', error);
        if (isQuotaError(error)) {
          setGlobalQuotaExceeded(true);
        }
        if (onError) onError(error);
      }
    );
  }

  return () => {
    colleaguesSubscribers.delete(callback);
    // Unsubscribe from Firestore only when ALL app components unmounted
    if (colleaguesSubscribers.size === 0 && colleaguesUnsub) {
      colleaguesUnsub();
      colleaguesUnsub = null;
      metrics.activeListenersCount = Math.max(0, metrics.activeListenersCount - 1);
      metrics.listenerCleanups++;
      notifyMetrics('Écouteur Collègues fermé');
    }
  };
}

// --- Coffee Rounds Singleton Listener ---
let roundsUnsub: (() => void) | null = null;

export function subscribeCoffeeRounds(
  callback: (rounds: CoffeeRound[]) => void,
  onError?: (error: unknown) => void,
  maxRounds: number = 50
): () => void {
  roundSubscribers.add(callback);

  // Deliver initial combined rounds synchronously
  const initial = getCombinedRounds();
  if (initial.length > 0) {
    callback(initial);
  }

  // Only open ONE onSnapshot connection to Firestore for the entire app
  if (roundSubscribers.size === 1 && !roundsUnsub) {
    metrics.listenerCreations++;
    metrics.activeListenersCount++;
    notifyMetrics('Écouteur Tournées connecté');

    let initialCacheRead = true;
    const q = query(
      collection(db, ROUNDS_COLLECTION),
      orderBy('date', 'desc'),
      limit(maxRounds)
    );

    roundsUnsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const isFromCache = snapshot.metadata.fromCache;
        if (isFromCache) {
          if (initialCacheRead) {
            initialCacheRead = false;
            metrics.cachedDocsRendered += snapshot.size;
            notifyMetrics(`Cache local Tournées (${snapshot.size} docs)`);
          }
        } else {
          const deltaCount = snapshot.docChanges().length;
          if (deltaCount > 0) {
            metrics.liveUpdatesReceived += deltaCount;
            notifyMetrics(`Direct Tournées (+${deltaCount} màj)`);
          } else {
            notifyMetrics('Flux Tournées synchronisé');
          }
        }

        latestFirestoreRounds = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CoffeeRound, 'id'>),
        }));
        notifyRoundSubscribers();
      },
      (error) => {
        console.error('Error listening to coffee rounds:', error);
        if (isQuotaError(error)) {
          setGlobalQuotaExceeded(true);
        }
        if (onError) onError(error);
        notifyRoundSubscribers();
      }
    );
  }

  return () => {
    roundSubscribers.delete(callback);
    // Unsubscribe from Firestore only when ALL app components unmounted
    if (roundSubscribers.size === 0 && roundsUnsub) {
      roundsUnsub();
      roundsUnsub = null;
      metrics.activeListenersCount = Math.max(0, metrics.activeListenersCount - 1);
      metrics.listenerCleanups++;
      notifyMetrics('Écouteur Tournées fermé');
    }
  };
}

// --- Settings Singleton Listener ---
let settingsUnsub: (() => void) | null = null;
const settingsSubscribers = new Set<(settings: GroupSettings) => void>();
let cachedSettings: GroupSettings = DEFAULT_SETTINGS;
try {
  const saved = localStorage.getItem('coffeeround_settings_backup');
  if (saved) cachedSettings = JSON.parse(saved);
} catch {}

export function subscribeSettings(
  callback: (settings: GroupSettings) => void,
  onError?: (error: unknown) => void
): () => void {
  settingsSubscribers.add(callback);
  callback(cachedSettings);

  if (settingsSubscribers.size === 1 && !settingsUnsub) {
    metrics.listenerCreations++;
    metrics.activeListenersCount++;
    notifyMetrics('Écouteur Paramètres connecté');

    let initialCacheRead = true;
    const settingsRef = doc(db, SETTINGS_COLLECTION, DEFAULT_SETTINGS_DOC);
    settingsUnsub = onSnapshot(
      settingsRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        const isFromCache = snapshot.metadata.fromCache;
        if (isFromCache) {
          if (initialCacheRead) {
            initialCacheRead = false;
            const count = snapshot.exists() ? 1 : 0;
            metrics.cachedDocsRendered += count;
            notifyMetrics(`Cache Paramètres (${count} doc)`);
          }
        } else {
          metrics.liveUpdatesReceived += 1;
          notifyMetrics('Direct Paramètres actualisé');
        }

        if (snapshot.exists()) {
          cachedSettings = snapshot.data() as GroupSettings;
        } else {
          cachedSettings = DEFAULT_SETTINGS;
        }
        try {
          localStorage.setItem('coffeeround_settings_backup', JSON.stringify(cachedSettings));
        } catch {}
        settingsSubscribers.forEach((cb) => cb(cachedSettings));
      },
      (error) => {
        console.error('Error listening to settings:', error);
        if (isQuotaError(error)) {
          setGlobalQuotaExceeded(true);
        }
        if (onError) onError(error);
      }
    );
  }

  return () => {
    settingsSubscribers.delete(callback);
    if (settingsSubscribers.size === 0 && settingsUnsub) {
      settingsUnsub();
      settingsUnsub = null;
      metrics.activeListenersCount = Math.max(0, metrics.activeListenersCount - 1);
      metrics.listenerCleanups++;
      notifyMetrics('Écouteur Paramètres fermé');
    }
  };
}

// ============================================================================
// 5. SEEDING & BASE IMPORT (Protected against unwanted execution)
// ============================================================================
export async function seedInitialDataIfEmpty() {
  try {
    // If we already know colleagues exist in cache, abort immediately without any query
    if (cachedColleagues.length > 0) {
      return;
    }

    const colleaguesSnap = await getDocs(query(collection(db, COLLEAGUES_COLLECTION), limit(1)));
    notifyMetrics(`Vérification collègues pour seed (${colleaguesSnap.size} doc)`);

    if (!colleaguesSnap.empty) {
      return;
    }

    const roundsSnap = await getDocs(query(collection(db, ROUNDS_COLLECTION), limit(1)));
    notifyMetrics(`Vérification tournées pour seed (${roundsSnap.size} doc)`);

    if (colleaguesSnap.empty && roundsSnap.empty) {
      console.log('Seeding initial baseline data...');
      await importBaseData(USER_PRESET_DATA, DEFAULT_SETTINGS.pricePerCup);
      await setDoc(doc(db, SETTINGS_COLLECTION, DEFAULT_SETTINGS_DOC), DEFAULT_SETTINGS, { merge: true });
      metrics.writesSent += 1;
    }
  } catch (err) {
    console.warn('Could not check seed status (quota or network limitation):', err);
  }
}

// ============================================================================
// 6. COLLEAGUE CRUD OPERATIONS (Tracked)
// ============================================================================
export async function addColleague(name: string, avatar: string = '☕', color: string = 'bg-indigo-500') {
  const newId = `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newColleague: Colleague = {
    id: newId,
    name: name.trim(),
    avatar,
    status: 'active',
    color,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, COLLEAGUES_COLLECTION, newId), newColleague);
  metrics.writesSent += 1;
  notifyMetrics(`Ajout collègue (${name})`);
  return newId;
}

export async function updateColleague(id: string, updates: Partial<Colleague>) {
  const ref = doc(db, COLLEAGUES_COLLECTION, id);
  await updateDoc(ref, updates);
  metrics.writesSent += 1;
  notifyMetrics(`Mise à jour collègue (${id})`);
}

export async function deleteColleague(id: string) {
  const ref = doc(db, COLLEAGUES_COLLECTION, id);
  await deleteDoc(ref);
  metrics.deletesSent += 1;
  notifyMetrics(`Suppression collègue (${id})`);
}

// ============================================================================
// 7. SMART THROTTLED SYNC (Prevents retry loops when quota is exceeded)
// ============================================================================
let isSyncInProgress = false;

export async function syncPendingRounds(isManual: boolean = false): Promise<{ synced: number; remaining: number; error?: string }> {
  if (isSyncInProgress) {
    return { synced: 0, remaining: getPendingRounds().length };
  }

  // Automatic sync throttle: If not manual, do NOT retry if quota was marked exceeded within the last 4 hours
  if (!isManual && quotaExceededState) {
    const lastTimestamp = localStorage.getItem(QUOTA_TIMESTAMP_KEY);
    if (lastTimestamp) {
      const elapsed = Date.now() - Number(lastTimestamp);
      // Wait at least 4 hours before auto-trying again in background
      if (elapsed < 4 * 3600 * 1000) {
        return { synced: 0, remaining: getPendingRounds().length, error: 'Attente réinitialisation quota' };
      }
    }
  }

  const pending = getPendingRounds();
  const deletions = getPendingDeletions();
  const updates = getPendingUpdates();

  if (pending.length === 0 && deletions.length === 0 && Object.keys(updates).length === 0) {
    return { synced: 0, remaining: 0 };
  }

  isSyncInProgress = true;
  let syncedCount = 0;

  try {
    // 1. Process deletions
    const remainingDeletions: string[] = [];
    for (const delId of deletions) {
      try {
        await deleteDoc(doc(db, ROUNDS_COLLECTION, delId));
        metrics.deletesSent += 1;
        notifyMetrics(`Suppression tournée distante (${delId})`);
        syncedCount++;
      } catch (e) {
        if (isQuotaError(e)) {
          setGlobalQuotaExceeded(true);
          savePendingDeletions(deletions.slice(syncedCount));
          notifyRoundSubscribers();
          return { synced: syncedCount, remaining: pending.length + deletions.length, error: 'Quota toujours actif' };
        }
        remainingDeletions.push(delId);
      }
    }
    savePendingDeletions(remainingDeletions);

    // 2. Process updates
    const remainingUpdates: Record<string, Partial<CoffeeRound>> = { ...updates };
    for (const [upId, upData] of Object.entries(updates)) {
      try {
        const payload: Record<string, any> = { ...upData, updatedAt: new Date().toISOString() };
        if (!payload.note) payload.note = deleteField();
        await updateDoc(doc(db, ROUNDS_COLLECTION, upId), payload);
        metrics.writesSent += 1;
        notifyMetrics(`Mise à jour tournée distante (${upId})`);
        delete remainingUpdates[upId];
        syncedCount++;
      } catch (e) {
        if (isQuotaError(e)) {
          setGlobalQuotaExceeded(true);
          savePendingUpdates(remainingUpdates);
          notifyRoundSubscribers();
          return { synced: syncedCount, remaining: pending.length + Object.keys(remainingUpdates).length, error: 'Quota toujours actif' };
        }
      }
    }
    savePendingUpdates(remainingUpdates);

    // 3. Process new pending rounds
    const remainingRounds: CoffeeRound[] = [];
    for (let i = 0; i < pending.length; i++) {
      const r = pending[i];

      // If document already exists in latestFirestoreRounds, skip write to avoid duplicate billing!
      const alreadyInFirestore = latestFirestoreRounds.some((f) => f.id === r.id);
      if (alreadyInFirestore) {
        syncedCount++;
        continue;
      }

      try {
        const firestorePayload: Record<string, any> = {
          payerId: r.payerId,
          payerName: r.payerName,
          cupsPaid: r.cupsPaid,
          totalAmount: r.totalAmount,
          beneficiaryIds: r.beneficiaryIds,
          beneficiaryNames: r.beneficiaryNames,
          date: r.date,
          createdAt: r.createdAt || new Date().toISOString(),
        };
        if (r.note && r.note.trim()) {
          firestorePayload.note = r.note.trim();
        }

        // Idempotent write: setDoc using round.id
        await setDoc(doc(db, ROUNDS_COLLECTION, r.id), firestorePayload, { merge: true });
        metrics.writesSent += 1;
        notifyMetrics(`Synchronisation tournée (${r.id})`);
        syncedCount++;
      } catch (e) {
        if (isQuotaError(e)) {
          setGlobalQuotaExceeded(true);
          const allRemaining = [...remainingRounds, ...pending.slice(i)];
          savePendingRounds(allRemaining);
          notifyRoundSubscribers();
          return { synced: syncedCount, remaining: allRemaining.length, error: 'Quota Firestore encore actif' };
        }
        remainingRounds.push(r);
      }
    }

    savePendingRounds(remainingRounds);
    if (remainingRounds.length === 0 && remainingDeletions.length === 0 && Object.keys(remainingUpdates).length === 0) {
      setGlobalQuotaExceeded(false);
    }
    notifyRoundSubscribers();

    return { synced: syncedCount, remaining: remainingRounds.length };
  } finally {
    isSyncInProgress = false;
  }
}

// ============================================================================
// 8. IDEMPOTENT RECORD COFFEE ROUND
// ============================================================================
export async function recordCoffeeRound(roundData: {
  id?: string;
  payerId: string;
  payerName: string;
  cupsPaid: number;
  totalAmount: number;
  beneficiaryIds: string[];
  beneficiaryNames: string[];
  date: string;
  note?: string;
}): Promise<CoffeeRound> {
  const safeDate = roundData.date || new Date().toISOString();
  const createdAt = new Date().toISOString();
  // Generate deterministic ID upfront to guarantee idempotency and avoid duplicates on retry
  const targetId = roundData.id || `round_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const firestorePayload: Record<string, any> = {
    payerId: roundData.payerId,
    payerName: roundData.payerName,
    cupsPaid: roundData.cupsPaid,
    totalAmount: roundData.totalAmount,
    beneficiaryIds: roundData.beneficiaryIds,
    beneficiaryNames: roundData.beneficiaryNames,
    date: safeDate,
    createdAt,
  };

  if (roundData.note && roundData.note.trim()) {
    firestorePayload.note = roundData.note.trim();
  }

  try {
    // setDoc with targetId is idempotent: never creates duplicates if retried
    await setDoc(doc(db, ROUNDS_COLLECTION, targetId), firestorePayload, { merge: true });
    metrics.writesSent += 1;
    notifyMetrics(`Enregistrement tournée (${targetId})`);

    setGlobalQuotaExceeded(false);
    const created: CoffeeRound = {
      id: targetId,
      payerId: roundData.payerId,
      payerName: roundData.payerName,
      cupsPaid: roundData.cupsPaid,
      totalAmount: roundData.totalAmount,
      beneficiaryIds: roundData.beneficiaryIds,
      beneficiaryNames: roundData.beneficiaryNames,
      date: safeDate,
      note: roundData.note?.trim(),
      createdAt,
      isLocalPending: false,
    };

    // Update memory cache immediately
    const existingIdx = latestFirestoreRounds.findIndex((r) => r.id === targetId);
    if (existingIdx !== -1) {
      latestFirestoreRounds[existingIdx] = created;
    } else {
      latestFirestoreRounds.unshift(created);
    }
    notifyRoundSubscribers();

    return created;
  } catch (err) {
    console.warn('Enregistrement Firestore différé (quota ou hors-ligne), sauvegarde locale sécurisée:', err);
    if (isQuotaError(err)) {
      setGlobalQuotaExceeded(true);
    }

    const localRound: CoffeeRound = {
      id: targetId,
      payerId: roundData.payerId,
      payerName: roundData.payerName,
      cupsPaid: roundData.cupsPaid,
      totalAmount: roundData.totalAmount,
      beneficiaryIds: roundData.beneficiaryIds,
      beneficiaryNames: roundData.beneficiaryNames,
      date: safeDate,
      note: roundData.note?.trim(),
      createdAt,
      isLocalPending: true,
    };

    const pending = getPendingRounds();
    const existingIndex = pending.findIndex((r) => r.id === targetId);
    if (existingIndex !== -1) {
      pending[existingIndex] = localRound;
    } else {
      pending.unshift(localRound);
    }
    savePendingRounds(pending);
    notifyRoundSubscribers();

    return localRound;
  }
}

// ============================================================================
// 9. UPDATE & DELETE COFFEE ROUND
// ============================================================================
export async function updateCoffeeRound(
  id: string,
  roundData: {
    payerId: string;
    payerName: string;
    cupsPaid: number;
    totalAmount: number;
    beneficiaryIds: string[];
    beneficiaryNames: string[];
    date: string;
    note?: string;
  }
) {
  // If it's a locally pending round, update it in local pending queue directly (zero Firestore cost)
  const pending = getPendingRounds();
  const idx = pending.findIndex((r) => r.id === id);
  if (idx !== -1) {
    pending[idx] = {
      ...pending[idx],
      payerId: roundData.payerId,
      payerName: roundData.payerName,
      cupsPaid: roundData.cupsPaid,
      totalAmount: roundData.totalAmount,
      beneficiaryIds: roundData.beneficiaryIds,
      beneficiaryNames: roundData.beneficiaryNames,
      date: roundData.date || pending[idx].date,
      note: roundData.note?.trim() || undefined,
    };
    savePendingRounds(pending);
    notifyRoundSubscribers();
    return;
  }

  const ref = doc(db, ROUNDS_COLLECTION, id);
  const updatePayload: Record<string, any> = {
    payerId: roundData.payerId,
    payerName: roundData.payerName,
    cupsPaid: roundData.cupsPaid,
    totalAmount: roundData.totalAmount,
    beneficiaryIds: roundData.beneficiaryIds,
    beneficiaryNames: roundData.beneficiaryNames,
    date: roundData.date || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (roundData.note && roundData.note.trim()) {
    updatePayload.note = roundData.note.trim();
  } else {
    updatePayload.note = deleteField();
  }

  try {
    await updateDoc(ref, updatePayload);
    metrics.writesSent += 1;
    notifyMetrics(`Modification tournée (${id})`);
  } catch (err) {
    if (isQuotaError(err)) {
      setGlobalQuotaExceeded(true);
      const updates = getPendingUpdates();
      updates[id] = {
        payerId: roundData.payerId,
        payerName: roundData.payerName,
        cupsPaid: roundData.cupsPaid,
        totalAmount: roundData.totalAmount,
        beneficiaryIds: roundData.beneficiaryIds,
        beneficiaryNames: roundData.beneficiaryNames,
        date: roundData.date,
        note: roundData.note?.trim(),
      };
      savePendingUpdates(updates);
      notifyRoundSubscribers();
      return;
    }
    throw err;
  }
}

export async function deleteCoffeeRound(id: string) {
  // If it's a locally pending round, remove it from local queue directly (zero Firestore cost)
  const pending = getPendingRounds();
  const filtered = pending.filter((r) => r.id !== id);
  if (filtered.length !== pending.length) {
    savePendingRounds(filtered);
    notifyRoundSubscribers();
    return;
  }

  const ref = doc(db, ROUNDS_COLLECTION, id);
  try {
    await deleteDoc(ref);
    metrics.deletesSent += 1;
    notifyMetrics(`Suppression tournée (${id})`);
  } catch (err) {
    if (isQuotaError(err)) {
      setGlobalQuotaExceeded(true);
      const deletions = getPendingDeletions();
      if (!deletions.includes(id)) {
        deletions.push(id);
        savePendingDeletions(deletions);
      }
      notifyRoundSubscribers();
      return;
    }
    throw err;
  }
}

// ============================================================================
// 10. SETTINGS, COUNTER RESET & IMPORT
// ============================================================================
export async function saveGroupSettings(settings: GroupSettings) {
  const settingsRef = doc(db, SETTINGS_COLLECTION, DEFAULT_SETTINGS_DOC);
  await setDoc(settingsRef, settings, { merge: true });
  metrics.writesSent += 1;
  notifyMetrics('Enregistrement réglages');
}

export async function resetAllRounds() {
  const snapshot = await getDocs(collection(db, ROUNDS_COLLECTION));
  notifyMetrics(`Lecture pour purge (${snapshot.size} docs)`);
  if (snapshot.empty) return;

  const docs = snapshot.docs;
  const chunkSize = 400;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    metrics.deletesSent += chunk.length;
  }
  notifyMetrics(`Remise à zéro de l'historique (${docs.length} supprimés)`);
}

export async function resetColleagueCounter(
  colleagueId: string,
  colleagueName: string,
  netCupsBalance: number,
  pricePerCup: number = 1.20
) {
  if (Math.abs(netCupsBalance) < 0.05) return;

  if (netCupsBalance < 0) {
    const cupsToPay = Math.abs(netCupsBalance);
    await recordCoffeeRound({
      payerId: colleagueId,
      payerName: colleagueName,
      cupsPaid: cupsToPay,
      totalAmount: cupsToPay * pricePerCup,
      beneficiaryIds: [colleagueId],
      beneficiaryNames: [colleagueName],
      date: new Date().toISOString(),
      note: 'Remise à zéro du solde (Ajustement)',
    });
  } else if (netCupsBalance > 0) {
    const excessCups = Math.abs(netCupsBalance);
    const count = Math.max(1, Math.round(excessCups));
    const beneIds = Array(count).fill(colleagueId);
    const beneNames = Array(count).fill(colleagueName);

    await recordCoffeeRound({
      payerId: colleagueId,
      payerName: colleagueName,
      cupsPaid: 0,
      totalAmount: 0,
      beneficiaryIds: beneIds,
      beneficiaryNames: beneNames,
      date: new Date().toISOString(),
      note: 'Remise à zéro du solde (Ajustement)',
    });
  }
}

export async function importBaseData(
  colleaguesData: { name: string; avatar?: string; cupsPaid: number; cupsConsumed: number }[],
  pricePerCup: number = 1.20
) {
  const existingColleaguesSnap = await getDocs(collection(db, COLLEAGUES_COLLECTION));
  notifyMetrics(`Lecture collègues pour import (${existingColleaguesSnap.size} docs)`);

  const existingColleagues = existingColleaguesSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Colleague, 'id'>),
  }));

  await resetAllRounds();

  const colleagueMap: Record<string, { id: string; name: string; avatar: string }> = {};

  for (const item of colleaguesData) {
    if (!item.name.trim()) continue;

    let colleague = existingColleagues.find(
      (c) => c.name.toLowerCase() === item.name.trim().toLowerCase()
    );
    let colleagueId = colleague?.id;

    if (!colleagueId) {
      const generatedId = `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await setDoc(doc(db, COLLEAGUES_COLLECTION, generatedId), {
        name: item.name.trim(),
        avatar: item.avatar || '☕',
        status: 'active',
        createdAt: new Date().toISOString(),
      });
      metrics.writesSent += 1;
      colleagueId = generatedId;
    } else {
      if (item.avatar) {
        await updateDoc(doc(db, COLLEAGUES_COLLECTION, colleagueId), { avatar: item.avatar });
        metrics.writesSent += 1;
      }
    }

    colleagueMap[item.name.trim().toLowerCase()] = {
      id: colleagueId,
      name: item.name.trim(),
      avatar: item.avatar || '☕',
    };
  }

  const validNames = colleaguesData.map((c) => c.name.trim().toLowerCase());
  for (const ex of existingColleagues) {
    if (!validNames.includes(ex.name.toLowerCase())) {
      await deleteDoc(doc(db, COLLEAGUES_COLLECTION, ex.id));
      metrics.deletesSent += 1;
    }
  }

  const consumerPool: { id: string; name: string }[] = [];
  colleaguesData.forEach((c) => {
    const colInfo = colleagueMap[c.name.trim().toLowerCase()];
    if (colInfo && c.cupsConsumed > 0) {
      for (let i = 0; i < c.cupsConsumed; i++) {
        consumerPool.push({ id: colInfo.id, name: colInfo.name });
      }
    }
  });

  for (const item of colleaguesData) {
    const colInfo = colleagueMap[item.name.trim().toLowerCase()];
    if (!colInfo || item.cupsPaid <= 0) continue;

    const paidCount = item.cupsPaid;
    const pulledBeneficiaries = consumerPool.splice(0, paidCount);

    while (pulledBeneficiaries.length < paidCount) {
      pulledBeneficiaries.push({ id: colInfo.id, name: colInfo.name });
    }

    const beneIds = pulledBeneficiaries.map((b) => b.id);
    const beneNames = pulledBeneficiaries.map((b) => b.name);
    const roundId = `init_${colInfo.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await setDoc(doc(db, ROUNDS_COLLECTION, roundId), {
      payerId: colInfo.id,
      payerName: colInfo.name,
      cupsPaid: paidCount,
      totalAmount: paidCount * pricePerCup,
      beneficiaryIds: beneIds,
      beneficiaryNames: beneNames,
      date: new Date().toISOString(),
      note: 'Saisie initiale (Solde de départ)',
      createdAt: new Date().toISOString(),
    });
    metrics.writesSent += 1;
  }

  if (consumerPool.length > 0) {
    const beneIds = consumerPool.map((b) => b.id);
    const beneNames = consumerPool.map((b) => b.name);
    const firstBene = consumerPool[0];
    const roundId = `init_cons_${firstBene.id}_${Date.now()}`;

    await setDoc(doc(db, ROUNDS_COLLECTION, roundId), {
      payerId: firstBene.id,
      payerName: firstBene.name,
      cupsPaid: 0,
      totalAmount: 0,
      beneficiaryIds: beneIds,
      beneficiaryNames: beneNames,
      date: new Date().toISOString(),
      note: 'Saisie initiale (Consommations)',
      createdAt: new Date().toISOString(),
    });
    metrics.writesSent += 1;
  }

  notifyMetrics('Importation base initiale terminée');
}

// ============================================================================
// 11. BALANCE CALCULATION ENGINE (Pure memory computation, zero database calls)
// ============================================================================
export function calculateBalances(
  colleagues: Colleague[],
  rounds: CoffeeRound[],
  pricePerCup: number = 1.20
): ColleagueBalance[] {
  const map: Record<string, ColleagueBalance> = {};

  colleagues.forEach((col) => {
    map[col.id] = {
      colleague: col,
      cupsPaid: 0,
      cupsConsumed: 0,
      netCupsBalance: 0,
      eurosPaid: 0,
      eurosConsumed: 0,
      netEurosBalance: 0,
      roundsPaidCount: 0,
      roundsBenefitedCount: 0,
      lastPaidDate: undefined,
    };
  });

  rounds.forEach((round) => {
    if (map[round.payerId]) {
      map[round.payerId].cupsPaid += round.cupsPaid;
      map[round.payerId].eurosPaid += round.totalAmount || round.cupsPaid * pricePerCup;
      map[round.payerId].roundsPaidCount += 1;

      const rDate = new Date(round.date).getTime();
      const currentLast = map[round.payerId].lastPaidDate
        ? new Date(map[round.payerId].lastPaidDate!).getTime()
        : 0;
      if (rDate > currentLast) {
        map[round.payerId].lastPaidDate = round.date;
      }
    }

    const beneCount = round.beneficiaryIds.length;
    if (beneCount > 0) {
      const cupsPerBeneficiary = round.cupsPaid / beneCount;
      const eurosPerBeneficiary = (round.totalAmount || round.cupsPaid * pricePerCup) / beneCount;

      round.beneficiaryIds.forEach((beneId) => {
        if (map[beneId]) {
          map[beneId].cupsConsumed += cupsPerBeneficiary;
          map[beneId].eurosConsumed += eurosPerBeneficiary;
          map[beneId].roundsBenefitedCount += 1;
        }
      });
    }
  });

  return Object.values(map).map((b) => {
    const netCups = b.cupsPaid - b.cupsConsumed;
    const netEuros = b.eurosPaid - b.eurosConsumed;
    return {
      ...b,
      netCupsBalance: Math.round(netCups * 10) / 10,
      netEurosBalance: Math.round(netEuros * 100) / 100,
      eurosPaid: Math.round(b.eurosPaid * 100) / 100,
      eurosConsumed: Math.round(b.eurosConsumed * 100) / 100,
    };
  });
}
