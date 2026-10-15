import {
  collection,
  doc,
  onSnapshot,
  addDoc,
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

const INITIAL_DEMO_COLLEAGUES: Omit<Colleague, 'id'>[] = USER_PRESET_DATA.map((item) => ({
  name: item.name,
  avatar: item.avatar,
  status: 'active',
  color: 'bg-slate-800',
  createdAt: new Date().toISOString(),
}));

/**
 * Realtime listener for colleagues (optimized without metadata spam)
 */
export function subscribeColleagues(
  callback: (colleagues: Colleague[]) => void,
  onError?: (error: unknown) => void
) {
  const q = query(collection(db, COLLEAGUES_COLLECTION));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Colleague[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Colleague, 'id'>),
      }));
      callback(list);
    },
    (error) => {
      console.error('Error listening to colleagues:', error);
      if (onError) onError(error);
    }
  );
}

// Offline & Quota Persistence Keys
const PENDING_ROUNDS_KEY = 'coffeeround_pending_rounds';
const PENDING_DELETIONS_KEY = 'coffeeround_pending_deletions';
const PENDING_UPDATES_KEY = 'coffeeround_pending_updates';
const QUOTA_EXCEEDED_KEY = 'coffeeround_quota_exceeded';

/**
 * Checks if an error is due to Firestore quota exhaustion
 */
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

// Global Quota Exceeded state
let quotaExceededState = false;
try {
  quotaExceededState = localStorage.getItem(QUOTA_EXCEEDED_KEY) === 'true';
} catch {}

const quotaListeners = new Set<(exceeded: boolean) => void>();

export function setGlobalQuotaExceeded(exceeded: boolean) {
  quotaExceededState = exceeded;
  try {
    localStorage.setItem(QUOTA_EXCEEDED_KEY, exceeded ? 'true' : 'false');
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

// Global Pending Rounds state
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

// Memory cache for Firestore rounds + active UI subscribers
let latestFirestoreRounds: CoffeeRound[] = [];
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

/**
 * Realtime listener for coffee rounds combining Firestore + Local pending rounds
 */
export function subscribeCoffeeRounds(
  callback: (rounds: CoffeeRound[]) => void,
  onError?: (error: unknown) => void,
  maxRounds: number = 50
) {
  roundSubscribers.add(callback);

  // Send initial data immediately from cache/pending
  const initial = getCombinedRounds();
  if (initial.length > 0) {
    callback(initial);
  } else {
    try {
      const backupRaw = localStorage.getItem('coffeeround_rounds_backup');
      if (backupRaw) {
        const parsed = JSON.parse(backupRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          callback(parsed);
        }
      }
    } catch {}
  }

  const q = query(
    collection(db, ROUNDS_COLLECTION),
    orderBy('date', 'desc'),
    limit(maxRounds)
  );

  const unsub = onSnapshot(
    q,
    (snapshot) => {
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

  return () => {
    roundSubscribers.delete(callback);
    unsub();
  };
}

/**
 * Realtime listener for settings (optimized without metadata spam)
 */
export function subscribeSettings(
  callback: (settings: GroupSettings) => void,
  onError?: (error: unknown) => void
) {
  const settingsRef = doc(db, SETTINGS_COLLECTION, DEFAULT_SETTINGS_DOC);
  return onSnapshot(
    settingsRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as GroupSettings);
      } else {
        callback(DEFAULT_SETTINGS);
      }
    },
    (error) => {
      console.error('Error listening to settings:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Initialize data only if DB is empty and explicitly requested
 */
export async function seedInitialDataIfEmpty() {
  try {
    const colleaguesSnap = await getDocs(collection(db, COLLEAGUES_COLLECTION));
    // If colleagues collection has documents, do NOT overwrite anything
    if (!colleaguesSnap.empty) {
      return;
    }

    // Only if completely empty:
    const roundsSnap = await getDocs(collection(db, ROUNDS_COLLECTION));
    if (colleaguesSnap.empty && roundsSnap.empty) {
      console.log('Seeding initial baseline data...');
      await importBaseData(USER_PRESET_DATA, DEFAULT_SETTINGS.pricePerCup);
      await setDoc(doc(db, SETTINGS_COLLECTION, DEFAULT_SETTINGS_DOC), DEFAULT_SETTINGS, { merge: true });
    }
  } catch (err) {
    console.warn('Could not check seed status (quota or network limitation):', err);
  }
}

/**
 * Add a new colleague
 */
export async function addColleague(name: string, avatar: string = '☕', color: string = 'bg-indigo-500') {
  const newColleague: Omit<Colleague, 'id'> = {
    name: name.trim(),
    avatar,
    status: 'active',
    color,
    createdAt: new Date().toISOString(),
  };
  return await addDoc(collection(db, COLLEAGUES_COLLECTION), newColleague);
}

/**
 * Update colleague details (status, avatar, name)
 */
export async function updateColleague(id: string, updates: Partial<Colleague>) {
  const ref = doc(db, COLLEAGUES_COLLECTION, id);
  return await updateDoc(ref, updates);
}

/**
 * Delete a colleague
 */
export async function deleteColleague(id: string) {
  const ref = doc(db, COLLEAGUES_COLLECTION, id);
  return await deleteDoc(ref);
}

/**
 * Synchronize local pending rounds/updates/deletions with Firestore
 */
export async function syncPendingRounds(): Promise<{ synced: number; remaining: number; error?: string }> {
  const pending = getPendingRounds();
  const deletions = getPendingDeletions();
  const updates = getPendingUpdates();

  if (pending.length === 0 && deletions.length === 0 && Object.keys(updates).length === 0) {
    return { synced: 0, remaining: 0 };
  }

  let syncedCount = 0;

  // 1. Process deletions
  const remainingDeletions: string[] = [];
  for (const delId of deletions) {
    try {
      await deleteDoc(doc(db, ROUNDS_COLLECTION, delId));
      syncedCount++;
    } catch (e) {
      if (isQuotaError(e)) {
        setGlobalQuotaExceeded(true);
        savePendingDeletions(deletions.slice(syncedCount));
        notifyRoundSubscribers();
        return { synced: syncedCount, remaining: pending.length + deletions.length, error: 'Quota toujours dépassé' };
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
      delete remainingUpdates[upId];
      syncedCount++;
    } catch (e) {
      if (isQuotaError(e)) {
        setGlobalQuotaExceeded(true);
        savePendingUpdates(remainingUpdates);
        notifyRoundSubscribers();
        return { synced: syncedCount, remaining: pending.length + Object.keys(remainingUpdates).length, error: 'Quota toujours dépassé' };
      }
    }
  }
  savePendingUpdates(remainingUpdates);

  // 3. Process new pending rounds
  const remainingRounds: CoffeeRound[] = [];
  for (let i = 0; i < pending.length; i++) {
    const r = pending[i];
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
      await addDoc(collection(db, ROUNDS_COLLECTION), firestorePayload);
      syncedCount++;
    } catch (e) {
      if (isQuotaError(e)) {
        setGlobalQuotaExceeded(true);
        // Add this round and all subsequent ones back to pending
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
}

/**
 * Record a coffee round (With automatic offline & quota resilience)
 */
export async function recordCoffeeRound(roundData: {
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
    const docRef = await addDoc(collection(db, ROUNDS_COLLECTION), firestorePayload);
    // Write succeeded! Quota is available
    setGlobalQuotaExceeded(false);
    const created: CoffeeRound = {
      id: docRef.id,
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
    return created;
  } catch (err) {
    console.warn('Enregistrement Firestore impossible (quota ou hors-ligne), enregistrement local sécurisé:', err);
    if (isQuotaError(err)) {
      setGlobalQuotaExceeded(true);
    }

    const localId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const localRound: CoffeeRound = {
      id: localId,
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
    pending.unshift(localRound);
    savePendingRounds(pending);
    notifyRoundSubscribers();

    return localRound;
  }
}

/**
 * Update an existing coffee round (With automatic offline & quota resilience)
 */
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
  // If it's a locally pending round, update it in local pending queue
  if (id.startsWith('local_')) {
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

/**
 * Delete a coffee round (With automatic offline & quota resilience)
 */
export async function deleteCoffeeRound(id: string) {
  if (id.startsWith('local_')) {
    const pending = getPendingRounds();
    const filtered = pending.filter((r) => r.id !== id);
    savePendingRounds(filtered);
    notifyRoundSubscribers();
    return;
  }

  const ref = doc(db, ROUNDS_COLLECTION, id);
  try {
    await deleteDoc(ref);
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

/**
 * Save Group Settings
 */
export async function saveGroupSettings(settings: GroupSettings) {
  const settingsRef = doc(db, SETTINGS_COLLECTION, DEFAULT_SETTINGS_DOC);
  return await setDoc(settingsRef, settings, { merge: true });
}

/**
 * Reset all coffee round history (resets all counters to zero) using writeBatch
 */
export async function resetAllRounds() {
  const snapshot = await getDocs(collection(db, ROUNDS_COLLECTION));
  if (snapshot.empty) return;

  // Split into chunks of 400 (Firestore maximum batch size is 500)
  const docs = snapshot.docs;
  const chunkSize = 400;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

/**
 * Reset a single colleague's counter to 0
 * Option 1: Adjust balance via a balancing adjustment round
 * Option 2: Remove rounds where colleague is sole participant or clean rounds
 */
export async function resetColleagueCounter(
  colleagueId: string,
  colleagueName: string,
  netCupsBalance: number,
  pricePerCup: number = 1.20
) {
  if (Math.abs(netCupsBalance) < 0.05) return;

  if (netCupsBalance < 0) {
    // Colleague owes cups -> add a balancing round where they pay the exact missing cups
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
    // Colleague has positive balance -> add a balancing consumption
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

/**
 * Bulk import or initial setup from user base
 */
export async function importBaseData(
  colleaguesData: { name: string; avatar?: string; cupsPaid: number; cupsConsumed: number }[],
  pricePerCup: number = 1.20
) {
  // Fetch existing colleagues
  const existingColleaguesSnap = await getDocs(collection(db, COLLEAGUES_COLLECTION));
  const existingColleagues = existingColleaguesSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Colleague, 'id'>),
  }));

  // Clear existing rounds
  await resetAllRounds();

  // Create or update colleagues map
  const colleagueMap: Record<string, { id: string; name: string; avatar: string }> = {};

  for (const item of colleaguesData) {
    if (!item.name.trim()) continue;

    let colleague = existingColleagues.find(
      (c) => c.name.toLowerCase() === item.name.trim().toLowerCase()
    );
    let colleagueId = colleague?.id;

    if (!colleagueId) {
      const newRef = await addDoc(collection(db, COLLEAGUES_COLLECTION), {
        name: item.name.trim(),
        avatar: item.avatar || '☕',
        status: 'active',
        createdAt: new Date().toISOString(),
      });
      colleagueId = newRef.id;
    } else {
      if (item.avatar) {
        await updateDoc(doc(db, COLLEAGUES_COLLECTION, colleagueId), { avatar: item.avatar });
      }
    }

    colleagueMap[item.name.trim().toLowerCase()] = {
      id: colleagueId,
      name: item.name.trim(),
      avatar: item.avatar || '☕',
    };
  }

  // Remove old colleagues that are not in the new dataset
  const validNames = colleaguesData.map((c) => c.name.trim().toLowerCase());
  for (const ex of existingColleagues) {
    if (!validNames.includes(ex.name.toLowerCase())) {
      await deleteDoc(doc(db, COLLEAGUES_COLLECTION, ex.id));
    }
  }

  // Build consumer pool (queue of colleague IDs that consumed cups)
  const consumerPool: { id: string; name: string }[] = [];
  colleaguesData.forEach((c) => {
    const colInfo = colleagueMap[c.name.trim().toLowerCase()];
    if (colInfo && c.cupsConsumed > 0) {
      for (let i = 0; i < c.cupsConsumed; i++) {
        consumerPool.push({ id: colInfo.id, name: colInfo.name });
      }
    }
  });

  // For each colleague with cupsPaid > 0, create baseline rounds pulling from consumer pool
  for (const item of colleaguesData) {
    const colInfo = colleagueMap[item.name.trim().toLowerCase()];
    if (!colInfo || item.cupsPaid <= 0) continue;

    const paidCount = item.cupsPaid;
    // Pull up to paidCount beneficiaries from consumer pool
    const pulledBeneficiaries = consumerPool.splice(0, paidCount);

    // If consumer pool didn't have enough, fill remaining with self
    while (pulledBeneficiaries.length < paidCount) {
      pulledBeneficiaries.push({ id: colInfo.id, name: colInfo.name });
    }

    const beneIds = pulledBeneficiaries.map((b) => b.id);
    const beneNames = pulledBeneficiaries.map((b) => b.name);

    await addDoc(collection(db, ROUNDS_COLLECTION), {
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
  }

  // If there are leftover consumers in the consumerPool not matched by any payer:
  if (consumerPool.length > 0) {
    const beneIds = consumerPool.map((b) => b.id);
    const beneNames = consumerPool.map((b) => b.name);
    const firstBene = consumerPool[0];

    await addDoc(collection(db, ROUNDS_COLLECTION), {
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
  }
}


/**
 * Balance Calculation Engine
 * Calculates exact cups/euros contributed vs consumed per colleague.
 */
export function calculateBalances(
  colleagues: Colleague[],
  rounds: CoffeeRound[],
  pricePerCup: number = 1.20
): ColleagueBalance[] {
  const map: Record<string, ColleagueBalance> = {};

  // Initialize for all current colleagues
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

  // Process all rounds chronologically or as list
  rounds.forEach((round) => {
    // Payer logic
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

    // Beneficiaries logic
    const beneCount = round.beneficiaryIds.length;
    if (beneCount > 0) {
      // Each beneficiary consumed (total cups paid in round / number of beneficiaries)
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

  // Calculate Net Balances
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
