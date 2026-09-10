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
 * Realtime listener for colleagues
 */
export function subscribeColleagues(callback: (colleagues: Colleague[]) => void) {
  const q = query(collection(db, COLLEAGUES_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const list: Colleague[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Colleague, 'id'>),
    }));
    callback(list);
  }, (error) => {
    console.error('Error listening to colleagues:', error);
  });
}

/**
 * Realtime listener for coffee rounds
 */
export function subscribeCoffeeRounds(callback: (rounds: CoffeeRound[]) => void) {
  const q = query(collection(db, ROUNDS_COLLECTION), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: CoffeeRound[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<CoffeeRound, 'id'>),
    }));
    callback(list);
  }, (error) => {
    console.error('Error listening to coffee rounds:', error);
  });
}

/**
 * Realtime listener for settings
 */
export function subscribeSettings(callback: (settings: GroupSettings) => void) {
  const settingsRef = doc(db, SETTINGS_COLLECTION, DEFAULT_SETTINGS_DOC);
  return onSnapshot(settingsRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as GroupSettings);
    } else {
      callback(DEFAULT_SETTINGS);
    }
  });
}

/**
 * Initialize data if DB is empty or has old demo colleagues
 */
export async function seedInitialDataIfEmpty() {
  try {
    const colleaguesSnap = await getDocs(collection(db, COLLEAGUES_COLLECTION));
    const roundsSnap = await getDocs(collection(db, ROUNDS_COLLECTION));
    const names = colleaguesSnap.docs.map((d) => d.data().name);
    const isOldDemo = names.includes('Sophie') || names.includes('Thomas');

    if (colleaguesSnap.empty || roundsSnap.empty || isOldDemo) {
      console.log('Seeding user baseline data (Vincent +5, Samir +1, Fred +4, Sabrina +5, Invité -15)...');
      await importBaseData(USER_PRESET_DATA, DEFAULT_SETTINGS.pricePerCup);
      await setDoc(doc(db, SETTINGS_COLLECTION, DEFAULT_SETTINGS_DOC), DEFAULT_SETTINGS, { merge: true });
    }
  } catch (err) {
    console.error('Error seeding data:', err);
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
 * Record a coffee round
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
}) {
  const newRound: Record<string, any> = {
    payerId: roundData.payerId,
    payerName: roundData.payerName,
    cupsPaid: roundData.cupsPaid,
    totalAmount: roundData.totalAmount,
    beneficiaryIds: roundData.beneficiaryIds,
    beneficiaryNames: roundData.beneficiaryNames,
    date: roundData.date || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  if (roundData.note && roundData.note.trim()) {
    newRound.note = roundData.note.trim();
  }

  return await addDoc(collection(db, ROUNDS_COLLECTION), newRound);
}

/**
 * Update an existing coffee round
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

  return await updateDoc(ref, updatePayload);
}

/**
 * Delete a coffee round
 */
export async function deleteCoffeeRound(id: string) {
  const ref = doc(db, ROUNDS_COLLECTION, id);
  return await deleteDoc(ref);
}

/**
 * Save Group Settings
 */
export async function saveGroupSettings(settings: GroupSettings) {
  const settingsRef = doc(db, SETTINGS_COLLECTION, DEFAULT_SETTINGS_DOC);
  return await setDoc(settingsRef, settings, { merge: true });
}

/**
 * Reset all coffee round history (resets all counters to zero)
 */
export async function resetAllRounds() {
  const snapshot = await getDocs(collection(db, ROUNDS_COLLECTION));
  const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletePromises);
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
    await addDoc(collection(db, ROUNDS_COLLECTION), {
      payerId: colleagueId,
      payerName: colleagueName,
      cupsPaid: cupsToPay,
      totalAmount: cupsToPay * pricePerCup,
      beneficiaryIds: [colleagueId],
      beneficiaryNames: [colleagueName],
      date: new Date().toISOString(),
      note: 'Remise à zéro du solde (Ajustement)',
      createdAt: new Date().toISOString(),
    });
  } else if (netCupsBalance > 0) {
    // Colleague has positive balance -> add a balancing consumption
    const excessCups = Math.abs(netCupsBalance);
    const count = Math.max(1, Math.round(excessCups));
    const beneIds = Array(count).fill(colleagueId);
    const beneNames = Array(count).fill(colleagueName);

    await addDoc(collection(db, ROUNDS_COLLECTION), {
      payerId: colleagueId,
      payerName: colleagueName,
      cupsPaid: 0,
      totalAmount: 0,
      beneficiaryIds: beneIds,
      beneficiaryNames: beneNames,
      date: new Date().toISOString(),
      note: 'Remise à zéro du solde (Ajustement)',
      createdAt: new Date().toISOString(),
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
