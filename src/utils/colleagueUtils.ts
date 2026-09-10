import { Colleague } from '../types';

/**
 * Returns today's local date string in YYYY-MM-DD format (accounting for user's timezone).
 */
export function getLocalDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type HolidayState = 'none' | 'manual' | 'current_period' | 'upcoming_period' | 'expired_period';

export interface ColleagueHolidayInfo {
  isOnHoliday: boolean;
  state: HolidayState;
  badgeLabel: string;
  tooltipText: string;
  periodText: string | null;
  startDateFormatted?: string;
  endDateFormatted?: string;
}

/**
 * Checks if a colleague is on holiday for a specific date (defaults to today).
 * If holiday dates (start/end) are defined, the calendar window strictly determines
 * whether the colleague is on holiday or has automatically returned.
 */
export function isColleagueOnHoliday(col: Colleague, dateStr?: string): boolean {
  if (col.status === 'inactive') return false;

  const target = dateStr || getLocalDateStr();

  // 1. Both start and end dates are specified: strictly between start and end inclusive
  if (col.holidayStartDate && col.holidayEndDate) {
    return target >= col.holidayStartDate && target <= col.holidayEndDate;
  }

  // 2. Only start date specified: active from start date onwards
  if (col.holidayStartDate && !col.holidayEndDate) {
    return target >= col.holidayStartDate;
  }

  // 3. Only end date specified: active until end date inclusive
  if (!col.holidayStartDate && col.holidayEndDate) {
    return target <= col.holidayEndDate;
  }

  // 4. No dates specified: fallback to manual toggle status
  return col.status === 'holiday';
}

/**
 * Returns detailed holiday information and human-readable French labels.
 */
export function getColleagueHolidayInfo(col: Colleague, dateStr?: string): ColleagueHolidayInfo {
  const target = dateStr || getLocalDateStr();

  if (col.status === 'inactive') {
    return {
      isOnHoliday: false,
      state: 'none',
      badgeLabel: 'Inactif',
      tooltipText: 'Collègue inactif',
      periodText: null,
    };
  }

  const hasStart = Boolean(col.holidayStartDate);
  const hasEnd = Boolean(col.holidayEndDate);

  if (hasStart && hasEnd) {
    const startFR = formatDateFR(col.holidayStartDate!);
    const endFR = formatDateFR(col.holidayEndDate!);
    const periodText = `du ${startFR} au ${endFR}`;

    if (target < col.holidayStartDate!) {
      return {
        isOnHoliday: false,
        state: 'upcoming_period',
        badgeLabel: `Congé prévu (${periodText})`,
        tooltipText: `Actuellement présent. En congé ${periodText}`,
        periodText,
        startDateFormatted: startFR,
        endDateFormatted: endFR,
      };
    }

    if (target >= col.holidayStartDate! && target <= col.holidayEndDate!) {
      return {
        isOnHoliday: true,
        state: 'current_period',
        badgeLabel: `En congé (jusqu'au ${endFR})`,
        tooltipText: `En congé ${periodText}. Retour automatique le ${getNextDayFR(col.holidayEndDate!)}`,
        periodText,
        startDateFormatted: startFR,
        endDateFormatted: endFR,
      };
    }

    // target > holidayEndDate -> automatically returned!
    return {
      isOnHoliday: false,
      state: 'expired_period',
      badgeLabel: `De retour (congé terminé le ${endFR})`,
      tooltipText: `Congés terminés le ${endFR}. Réintégré automatiquement dans le café hebdo.`,
      periodText,
      startDateFormatted: startFR,
      endDateFormatted: endFR,
    };
  }

  if (hasEnd && !hasStart) {
    const endFR = formatDateFR(col.holidayEndDate!);
    const periodText = `jusqu'au ${endFR}`;

    if (target <= col.holidayEndDate!) {
      return {
        isOnHoliday: true,
        state: 'current_period',
        badgeLabel: `En congé (jusqu'au ${endFR})`,
        tooltipText: `En congé ${periodText}. Retour automatique le ${getNextDayFR(col.holidayEndDate!)}`,
        periodText,
        endDateFormatted: endFR,
      };
    }

    return {
      isOnHoliday: false,
      state: 'expired_period',
      badgeLabel: `De retour (congé terminé le ${endFR})`,
      tooltipText: `Congés terminés le ${endFR}. Réintégré automatiquement.`,
      periodText,
      endDateFormatted: endFR,
    };
  }

  if (hasStart && !hasEnd) {
    const startFR = formatDateFR(col.holidayStartDate!);
    const periodText = `à partir du ${startFR}`;

    if (target >= col.holidayStartDate!) {
      return {
        isOnHoliday: true,
        state: 'current_period',
        badgeLabel: `En congé (${periodText})`,
        tooltipText: `En congé ${periodText}`,
        periodText,
        startDateFormatted: startFR,
      };
    }

    return {
      isOnHoliday: false,
      state: 'upcoming_period',
      badgeLabel: `Congé prévu (${periodText})`,
      tooltipText: `Actuellement présent. En congé ${periodText}`,
      periodText,
      startDateFormatted: startFR,
    };
  }

  // No dates
  if (col.status === 'holiday') {
    return {
      isOnHoliday: true,
      state: 'manual',
      badgeLabel: 'En congé',
      tooltipText: 'En congé (sans date programmée)',
      periodText: null,
    };
  }

  return {
    isOnHoliday: false,
    state: 'none',
    badgeLabel: 'Présent',
    tooltipText: 'Présent',
    periodText: null,
  };
}

/**
 * Returns a human-readable string for the colleague's holiday period.
 */
export function formatHolidayPeriod(col: Colleague): string | null {
  const info = getColleagueHolidayInfo(col);
  return info.periodText || (info.isOnHoliday ? 'En congé' : null);
}

function formatDateFR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

function getNextDayFR(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    const nextD = String(date.getDate()).padStart(2, '0');
    const nextM = String(date.getMonth() + 1).padStart(2, '0');
    return `${nextD}/${nextM}`;
  } catch {
    return formatDateFR(dateStr);
  }
}

