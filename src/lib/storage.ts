import { AppData, WeekData, MonthlyData } from './types';
import { syncToCloud } from './supabase';

const STORAGE_KEY = 'weekly_review_data_v1';

const dispatchUpdate = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage-update'));
    }
};

export const saveData = (data: AppData) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    syncToCloud(data).catch(console.error); // Auto-sync to Supabase
    dispatchUpdate();
};

export const loadData = (): AppData => {
    if (typeof window === 'undefined') return { weeks: {}, months: {} };

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { weeks: {}, months: {} };

    try {
        const parsed = JSON.parse(stored);
        if (!parsed || typeof parsed !== 'object') {
            return { weeks: {}, months: {} };
        }
        return {
            weeks: parsed.weeks || {},
            months: parsed.months || {}
        };
    } catch (e) {
        console.error("Failed to parse data", e);
        return { weeks: {}, months: {} };
    }
};

export const getWeek = (data: AppData, date: Date = new Date()): WeekData => {
    let targetDate = new Date(date);

    for (let i = 0; i < 52; i++) {
        const sunday = new Date(targetDate);
        const day = targetDate.getDay();
        const diff = day === 0 ? 0 : 7 - day;
        sunday.setDate(targetDate.getDate() + diff);
        sunday.setHours(0, 0, 0, 0);
        const id = sunday.toISOString().split('T')[0];

        const existing = data.weeks[id];
        if (existing && existing.submitted) {
            targetDate.setDate(targetDate.getDate() + 7);
            continue;
        }

        if (!existing) {
            return {
                id,
                weekEnding: sunday.toDateString(),
                jobProgress: [],
                decisionOwnership: [],
                frontendOutput: [],
                muayThaiSessions: null,
                reviewNotes: '',
                dailyLogs: {},
                submitted: false
            };
        }

        const sanitizeArray = (val: any) => {
            if (Array.isArray(val)) return val;
            if (typeof val === 'string' && val !== '') return [val];
            return [];
        };
        return {
            ...existing,
            jobProgress: sanitizeArray(existing.jobProgress),
            decisionOwnership: sanitizeArray(existing.decisionOwnership),
            frontendOutput: sanitizeArray(existing.frontendOutput)
        };
    }

    return getWeek(data, new Date());
};

export const getMonth = (data: AppData, date: Date = new Date()): MonthlyData => {
    const id = date.toISOString().slice(0, 7);
    const existing = data.months[id];

    if (existing) {
        // Migrate old "utilities" field to water/internet/electricity
        const exp = existing.expenses as any;
        if (exp && 'utilities' in exp && !('water' in exp)) {
            existing.expenses = {
                rent: exp.rent || 0,
                food: exp.food || 0,
                transport: exp.transport || 0,
                water: 0,
                internet: exp.utilities || 0,
                electricity: 0,
                phone: exp.phone || 0,
                personal: exp.personal || 0,
                social: exp.social || 0,
                misc: exp.misc || 0,
                houseKeeping: 0,
            };
        }
        if (existing.expenses) {
            const e = existing.expenses as any;
            if (!('water' in e)) e.water = 0;
            if (!('internet' in e)) e.internet = 0;
            if (!('electricity' in e)) e.electricity = 0;
        }
        if (!(existing as any).extraIncome) (existing as any).extraIncome = [];
        if (!existing.carFund) existing.carFund = 0;
        return existing;
    }

    return {
        month: id,
        emergencyFund: 0,
        travelFund: 0,
        carFund: 0,
        submitted: false,
        income: 0,
        expenses: {
            rent: 0, food: 0, transport: 0,
            water: 0, internet: 0, electricity: 0,
            phone: 0, personal: 0, social: 0, misc: 0,
            houseKeeping: 0,
        },
        oneOffs: [],
    };
};

export const saveMonthlyFinance = (entry: MonthlyData) => {
    const data = loadData();
    data.months[entry.month] = entry;
    saveData(data);
};

export const submitMonthlyFinance = (entry: MonthlyData) => {
    const data = loadData();
    data.months[entry.month] = { ...entry, submitted: true, submittedDate: new Date().toISOString() };
    saveData(data);
};

export const getTotalEmergencyFund = (data: AppData): number => {
    return Object.values(data.months)
        .filter(m => m.submitted)
        .reduce((sum, m) => sum + (m.emergencyFund || 0), 0);
};

export const getTotalCarFund = (data: AppData): number => {
    return Object.values(data.months)
        .filter(m => m.submitted)
        .reduce((sum, m) => sum + (m.carFund || 0), 0);
};

export const getTotalTravelFund = (data: AppData): number => {
    return Object.values(data.months)
        .filter(m => m.submitted)
        .reduce((sum, m) => sum + (m.travelFund || 0), 0);
};

export const getLatestMonthlyStatus = (data: AppData): boolean => {
    const currentMonthId = new Date().toISOString().slice(0, 7);
    const entry = data.months[currentMonthId];
    return !!(entry && entry.submitted);
};