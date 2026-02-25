import { JOB_PROGRESS_OPTIONS, DECISION_OPTIONS, FRONTEND_OPTIONS } from './constants';

export type JobProgressOption = typeof JOB_PROGRESS_OPTIONS[number];
export type DecisionOption = typeof DECISION_OPTIONS[number];
export type FrontendOption = typeof FRONTEND_OPTIONS[number];

export type FrontendTag = 'Refactored code' | 'Coded new feature' | 'Practiced basics' | 'Tutorial' | 'Other';

export interface DayData {
    date: string;
    frontendTags: FrontendTag[];
}

export type RecalibrationWeight = 'Low Energy' | 'Friction' | 'Scope';
export type RecalibrationWord = 'Smaller' | 'Rest' | 'Steady';

export interface WeekData {
    id: string;
    weekEnding: string;

    // Legacy
    jobProgress?: JobProgressOption[];
    decisionOwnership?: DecisionOption[];
    frontendOutput?: FrontendOption[];

    strategy?: {
        leverage: JobProgressOption[];
        decision: DecisionOption[];
        frontend: FrontendOption[];
        energy: number;
    };

    recalibration?: {
        weight: RecalibrationWeight;
        word: RecalibrationWord;
    };

    muayThaiSessions: number | null;
    reviewNotes: string;
    submitted?: boolean;
    dailyLogs: Record<string, DayData>;
}

// ── one-off expense entry ────────────────────────────────────────────────────
export interface OneOffExpense {
    id: string;
    label: string;
    amount: number; // KES
}

// ── debt tracking ────────────────────────────────────────────────────────────
export type DebtType =
    | 'Credit Card'
    | 'Mobile Loan'
    | 'Personal Loan'
    | 'Car Loan'
    | 'Student Loan'
    | 'Business Loan'
    | 'Mortgage'
    | 'Other';

export interface DebtEntry {
    id: string;
    label: string;           // e.g. "KCB Loan", "Equity Credit Card"
    type: DebtType;
    balance: number;         // outstanding balance in KES
    monthlyPayment: number;  // what you pay this month in KES
    interestRate: number;    // annual interest rate %
}

// ── expense breakdown ────────────────────────────────────────────────────────
export interface MonthlyExpenses {
    rent: number;
    food: number;
    transport: number;
    water: number;
    internet: number;
    electricity: number;
    phone: number;
    personal: number;
    social: number;
    misc: number;
    houseKeeping: number;
}

// ── EXTENDED MonthlyData ────────────────────────────────────────────────────
export interface MonthlyData {
    month: string; // "YYYY-MM"

    // Existing savings goals (KES / USD)
    emergencyFund: number;  // KES saved this month → emergency goal
    travelFund: number;     // USD saved this month → travel goal
    carFund?: number;       // KES saved this month → car goal

    submitted?: boolean;
    submittedDate?: string;

    // income & expense tracking
    income?: number;                    // KES base salary
    extraIncome?: OneOffExpense[];      // KES gigs, bonuses, etc.
    expenses?: MonthlyExpenses;
    oneOffs?: OneOffExpense[];
    debts?: DebtEntry[];                // debt obligations this month
}

export type MonthlyEntry = MonthlyData;

export interface AppData {
    weeks: Record<string, WeekData>;
    months: Record<string, MonthlyData>;
}

export const INITIAL_DATA: AppData = {
    weeks: {},
    months: {}
};
