export type ColleagueStatus = 'active' | 'holiday' | 'inactive';

export interface Colleague {
  id: string;
  name: string;
  avatar: string;
  status: ColleagueStatus;
  color?: string;
  createdAt: string;
  holidayStartDate?: string;
  holidayEndDate?: string;
}

export interface CoffeeRound {
  id: string;
  payerId: string;
  payerName: string;
  cupsPaid: number;
  totalAmount: number;
  beneficiaryIds: string[];
  beneficiaryNames: string[];
  date: string;
  note?: string;
  createdAt: string;
}

export type ThemeId = 'epure_slate' | 'warm_coffee' | 'indigo_minimal' | 'monochrome_clean' | 'nordic_blue';

export interface GroupSettings {
  pricePerCup: number;
  currency: string;
  groupName: string;
  theme?: ThemeId;
}

export interface ColleagueBalance {
  colleague: Colleague;
  cupsPaid: number;
  cupsConsumed: number;
  netCupsBalance: number; // Positive = gave more than took (généreux); Negative = owes coffee
  eurosPaid: number;
  eurosConsumed: number;
  netEurosBalance: number;
  roundsPaidCount: number;
  roundsBenefitedCount: number;
  lastPaidDate?: string;
}
