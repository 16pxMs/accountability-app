"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MonthlyData, MonthlyExpenses, DebtEntry, DebtType, BudgetEntry, BudgetLineItem } from '@/lib/types';
import { loadData, saveMonthlyFinance, submitMonthlyFinance, getMonth, getTotalEmergencyFund, getTotalCarFund, getTotalTravelFund } from '@/lib/storage';

// ── Goal constants ──────────────────────────────────────────────────────────
const EMERGENCY_GOAL_KES = 1_350_000;
const CAR_GOAL_KES = 1_500_000;
const TRAVEL_GOAL_USD = 1_500;
const KES_TO_USD = 130;

// ── Budget category presets (for datalist autocomplete) ──────────────────────
const BUDGET_CATEGORY_PRESETS = [
    'Food & Groceries', 'Transport', 'Personal & Clothing',
    'Social & Entertainment', 'Miscellaneous',
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => Math.round(n).toLocaleString('en-KE');

function monthsRemaining(current: number, goal: number, monthlyAlloc: number): string {
    if (monthlyAlloc <= 0) return '—';
    const remaining = goal - current;
    if (remaining <= 0) return 'Goal reached ✓';
    const months = Math.ceil(remaining / monthlyAlloc);
    return months === 1 ? '1 month' : `${months} months`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
    return (
        <p style={{
            fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: '16px', marginTop: '8px',
        }}>{title}</p>
    );
}

function ExpenseRow({ label, icon, value, onChange, unit = 'KES' }: {
    label: string; icon: string; value: number;
    onChange: (v: number) => void; unit?: string;
}) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 0', borderBottom: '1px solid #F3F4F6',
        }}>
            <span style={{ width: 20, textAlign: 'center', fontSize: 16 }}>{icon}</span>
            <span style={{ flex: 1, fontSize: '0.9rem', color: '#4B5563' }}>{label}</span>
            <div style={{ position: 'relative' }}>
                <input
                    type="number"
                    value={value || ''}
                    placeholder="0"
                    onChange={e => onChange(Number(e.target.value) || 0)}
                    style={{
                        width: 140, padding: '8px 44px 8px 10px',
                        border: '1px solid #E5E7EB', borderRadius: 8,
                        fontSize: '0.9rem', color: '#111827', fontWeight: 600,
                        outline: 'none', background: 'white', textAlign: 'right',
                    }}
                    onFocus={e => e.target.style.borderColor = '#3B82F6'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
                <span style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.75rem', color: '#9CA3AF', pointerEvents: 'none',
                }}>{unit}</span>
            </div>
        </div>
    );
}


function GoalCard({ title, currentTotal, monthlyAlloc, goal, unit, color, icon, milestone }: {
    title: string; currentTotal: number; monthlyAlloc: number;
    goal: number; unit: string; color: string; icon: string; milestone?: number;
}) {
    const pct = Math.min((currentTotal / goal) * 100, 100);
    const milestonePct = milestone ? Math.min((milestone / goal) * 100, 100) : 0;
    const remaining = monthsRemaining(currentTotal, goal, monthlyAlloc);
    const isComplete = currentTotal >= goal;

    return (
        <div style={{
            background: 'white', border: '1px solid #E5E7EB',
            borderRadius: 16, padding: '24px',
            position: 'relative', overflow: 'hidden',
        }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                    <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {icon} {title}
                    </p>
                    <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', lineHeight: 1.2, marginTop: 4 }}>
                        {fmt(currentTotal)} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#9CA3AF' }}>{unit}</span>
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 2 }}>of {fmt(goal)} {unit}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{Math.round(pct)}%</p>
                    {!isComplete && monthlyAlloc > 0 && (
                        <p style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: 2, fontWeight: 500 }}>
                            ~{remaining} left
                        </p>
                    )}
                </div>
            </div>

            {/* Progress Bar Container */}
            <div style={{ position: 'relative', height: 8, background: '#F3F4F6', borderRadius: 99, marginBottom: 10 }}>
                {/* Milestone Marker */}
                {milestone && (
                    <div style={{
                        position: 'absolute',
                        left: `${milestonePct}%`,
                        top: 0, bottom: 0, width: 2,
                        background: '#9CA3AF',
                        zIndex: 5,
                    }} title={`Milestone: ${fmt(milestone)}`} />
                )}
                <div style={{
                    height: '100%', width: `${pct}%`, background: color,
                    borderRadius: 99, transition: 'width 0.4s ease',
                    position: 'relative', zIndex: 6,
                }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                    This month: <strong style={{ color: '#111827' }}>+{fmt(monthlyAlloc)} {unit}</strong>
                </p>

                {milestone && currentTotal < milestone ? (
                    <p style={{ fontSize: '0.75rem', color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: 6 }}>
                        Destination: <strong>{fmt(milestone)}</strong> ({Math.round((currentTotal / milestone) * 100)}%)
                    </p>
                ) : (
                    <p style={{
                        fontSize: '0.78rem', fontWeight: 700,
                        color: isComplete ? '#059669' : '#6B7280',
                        background: isComplete ? '#ECFDF5' : '#F9FAFB',
                        padding: '3px 10px', borderRadius: 99,
                        border: `1px solid ${isComplete ? '#A7F3D0' : '#E5E7EB'}`,
                    }}>
                        {isComplete ? '✓ Goal Reached' : remaining === '—' ? 'Set allocation' : `📅 ${remaining} to go`}
                    </p>
                )}
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FinanceCard() {
    const router = useRouter();

    const [date, setDate] = useState(new Date());
    const [month, setMonth] = useState<MonthlyData | null>(null);
    const [totalEmergency, setTotalEmergency] = useState(0);
    const [totalCar, setTotalCar] = useState(0);
    const [totalTravel, setTotalTravel] = useState(0);

    // Savings saved feedback
    const [savingsSaved, setSavingsSaved] = useState(false);

    const [isStored, setIsStored] = useState(false);

    // ── Load ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        const load = () => {
            const data = loadData();
            const id = date.toISOString().slice(0, 7);
            const exists = !!data.months[id];
            setIsStored(exists);

            const m = getMonth(data, date);
            setMonth({
                income: 0,
                expenses: {
                    rent: 0, food: 0, transport: 0,
                    houseKeeping: 0,
                    water: 0, internet: 0, electricity: 0,
                    phone: 0, personal: 0, social: 0, misc: 0,
                },
                oneOffs: [],
                extraIncome: [],
                debts: [],
                carFund: 0,
                ...m,
            });

            // Calculate totals excluding the current month to avoid double counting
            // if the current month is already marked as submitted
            const rawEmer = getTotalEmergencyFund(data);
            const subEmer = (m.submitted && m.emergencyFund) ? m.emergencyFund : 0;
            setTotalEmergency(rawEmer - subEmer);

            const rawCar = getTotalCarFund(data);
            const subCar = (m.submitted && m.carFund) ? m.carFund : 0;
            setTotalCar(rawCar - subCar);

            const rawTravel = getTotalTravelFund(data);
            const subTravel = (m.submitted && m.travelFund) ? m.travelFund : 0;
            setTotalTravel(rawTravel - subTravel);
        };
        load();
        window.addEventListener('storage-update', load);
        return () => window.removeEventListener('storage-update', load);
    }, [date]);

    const persist = useCallback((updated: MonthlyData) => {
        setMonth(updated);
        saveMonthlyFinance(updated);
    }, []);

    if (!month) return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading...</div>;

    const expenses = month.expenses ?? {
        rent: 0, food: 0, transport: 0,
        houseKeeping: 0,
        water: 0, internet: 0, electricity: 0,
        phone: 0, personal: 0, social: 0, misc: 0,
    };
    const oneOffs = month.oneOffs ?? [];
    const extraIncome = month.extraIncome ?? [];
    const debts = month.debts ?? [];
    const baseSalary = month.income ?? 0;

    // ── Derived ───────────────────────────────────────────────────────────────
    const extraTotal = extraIncome.reduce((a: number, e: any) => a + e.amount, 0);
    const income = baseSalary + extraTotal;

    // Fixed costs: only truly fixed items (variable categories tracked in Flexible Budgets)
    const FIXED_KEYS: (keyof MonthlyExpenses)[] = ['rent', 'houseKeeping', 'water', 'internet', 'electricity', 'phone'];
    const fixedTotal = FIXED_KEYS.reduce((a, k) => a + (expenses[k] ?? 0), 0);

    // Migrate old data: ensure every entry has an items array
    const budgets: BudgetEntry[] = (month.budgets ?? []).map(b => ({
        ...b,
        items: (b as any).items ?? [],
    }));
    const budgetTotal = budgets.reduce((a, b) => a + b.items.reduce((s, it) => s + it.amount, 0), 0);
    const oneOffTotal = oneOffs.reduce((a, o) => a + o.amount, 0);
    const debtMonthlyTotal = debts.reduce((a, d) => a + d.monthlyPayment, 0);
    const savingsKES = (month.emergencyFund ?? 0) + (month.carFund ?? 0);
    const savingsUSD = month.travelFund ?? 0;
    const totalOut = fixedTotal + budgetTotal + oneOffTotal + debtMonthlyTotal + savingsKES + (savingsUSD * KES_TO_USD);
    const leftover = income - totalOut;

    // ── Debt health assessment ────────────────────────────────────────────────
    const dti = income > 0 && debtMonthlyTotal > 0 ? (debtMonthlyTotal / income) * 100 : 0;
    const debtHealth = debtMonthlyTotal > 0 ? (() => {
        let status: string, statusColor: string, statusBg: string;
        if (dti < 15)       { status = 'Excellent'; statusColor = '#059669'; statusBg = '#ECFDF5'; }
        else if (dti < 28)  { status = 'Healthy';   statusColor = '#0EA5E9'; statusBg = '#F0F9FF'; }
        else if (dti < 36)  { status = 'Caution';   statusColor = '#D97706'; statusBg = '#FFFBEB'; }
        else if (dti < 50)  { status = 'Warning';   statusColor = '#EA580C'; statusBg = '#FFF7ED'; }
        else                { status = 'Critical';  statusColor = '#DC2626'; statusBg = '#FEF2F2'; }

        const advice: { type: 'info' | 'warn' | 'danger'; text: string }[] = [];

        if (dti >= 50)
            advice.push({ type: 'danger', text: `CRITICAL: ${Math.round(dti)}% of your income goes to debt payments. Stop all non-essential spending and seek debt restructuring advice from your bank immediately.` });
        else if (dti >= 36)
            advice.push({ type: 'warn', text: `WARNING: Your debt-to-income ratio (${Math.round(dti)}%) is in the danger zone. Lenders consider above 36% high risk. Do not take on any new debt until this is below 30%.` });
        else if (dti >= 28)
            advice.push({ type: 'warn', text: `CAUTION: Your DTI of ${Math.round(dti)}% is elevated. Prioritise paying down high-interest debt before building savings goals further.` });
        else
            advice.push({ type: 'info', text: `Your debt-to-income ratio is ${Math.round(dti)}% — within a healthy range. Keep up payments and avoid new consumer debt.` });

        const mobileLoans = debts.filter(d => d.type === 'Mobile Loan');
        if (mobileLoans.length > 0)
            advice.push({ type: 'danger', text: 'Mobile loans (M-Shwari, Tala, Branch, etc.) carry effective annual rates of 90–180%. These are the most expensive money you can borrow. Pay these off first before everything else — even before saving.' });

        const highRateDebts = debts.filter(d => d.interestRate > 20 && d.type !== 'Mobile Loan');
        if (highRateDebts.length > 0) {
            const names = highRateDebts.map(d => d.label || d.type).join(', ');
            advice.push({ type: 'danger', text: `"${names}" carries interest above 20% p.a. — this is bad debt. Use the Avalanche method: pay minimums on all debts, then throw every extra shilling at the highest-rate debt first.` });
        }

        const creditCards = debts.filter(d => d.type === 'Credit Card');
        if (creditCards.length > 0)
            advice.push({ type: 'warn', text: 'Never carry a credit card balance month to month. The compounding interest erases any rewards benefit. Always pay the full statement balance before the due date.' });

        if (debts.length > 2 && debts.some(d => d.interestRate > 15))
            advice.push({ type: 'info', text: 'With multiple debts, ask your bank about debt consolidation — a single personal loan at a lower rate can simplify payments and reduce total interest paid.' });

        return { dti, status, statusColor, statusBg, advice, debtTotal: debtMonthlyTotal };
    })() : null;

    const emergencyWithThis = totalEmergency + (month.emergencyFund ?? 0);
    const carWithThis = totalCar + (month.carFund ?? 0);
    const travelWithThis = totalTravel + (month.travelFund ?? 0);

    // Fixed costs only (variable categories go into the categorical budget section)
    const fixedBreakdownItems: { label: string; value: number; color: string }[] = [
        { label: 'Rent', value: expenses.rent, color: '#F87171' },
        { label: 'House Keeping', value: expenses.houseKeeping, color: '#A78BFA' },
        { label: 'Water', value: expenses.water, color: '#34D399' },
        { label: 'Internet', value: expenses.internet, color: '#22D3EE' },
        { label: 'Electricity', value: expenses.electricity, color: '#6EE7B7' },
        { label: 'Phone & Subs', value: expenses.phone, color: '#818CF8' },
        ...debts.filter(d => d.monthlyPayment > 0).map(d => ({ label: d.label || d.type, value: d.monthlyPayment, color: '#EF4444' })),
    ].filter(i => i.value > 0).sort((a, b) => b.value - a.value);

    const maxFixed = Math.max(...fixedBreakdownItems.map(i => i.value), 1);

    // ── Update helpers ────────────────────────────────────────────────────────
    const updateExpense = (field: keyof MonthlyExpenses, val: number) =>
        persist({ ...month, expenses: { ...expenses, [field]: val } });

    const addOneOff = () => {
        persist({
            ...month,
            oneOffs: [...oneOffs, { id: Date.now().toString(), label: '', amount: 0 }]
        });
    };

    const addBudget = () => persist({
        ...month,
        budgets: [...budgets, { id: Date.now().toString(), category: '', limit: 0, items: [] }],
    });

    const updateBudget = (id: string, field: 'category' | 'limit', value: string | number) =>
        persist({ ...month, budgets: budgets.map(b => b.id === id ? { ...b, [field]: value } : b) });

    const removeBudget = (id: string) =>
        persist({ ...month, budgets: budgets.filter(b => b.id !== id) });

    const addBudgetItem = (budgetId: string) => {
        const newItem: BudgetLineItem = { id: Date.now().toString(), label: '', amount: 0 };
        persist({
            ...month,
            budgets: budgets.map(b => b.id === budgetId ? { ...b, items: [...b.items, newItem] } : b),
        });
    };

    const updateBudgetItem = (budgetId: string, itemId: string, field: 'label' | 'amount', value: string | number) =>
        persist({
            ...month,
            budgets: budgets.map(b =>
                b.id === budgetId
                    ? { ...b, items: b.items.map(it => it.id === itemId ? { ...it, [field]: value } : it) }
                    : b
            ),
        });

    const removeBudgetItem = (budgetId: string, itemId: string) =>
        persist({
            ...month,
            budgets: budgets.map(b =>
                b.id === budgetId ? { ...b, items: b.items.filter(it => it.id !== itemId) } : b
            ),
        });

    const updateOneOff = (id: string, field: 'label' | 'amount', value: string | number) =>
        persist({ ...month, oneOffs: oneOffs.map(o => o.id === id ? { ...o, [field]: value } : o) });

    const removeOneOff = (id: string) =>
        persist({ ...month, oneOffs: oneOffs.filter(o => o.id !== id) });

    const addExtraIncome = () => {
        const updated = {
            ...month,
            extraIncome: [...extraIncome, { id: Date.now().toString(), label: '', amount: 0 }]
        };
        persist(updated);
    };

    const updateExtraIncome = (id: string, field: 'label' | 'amount', value: string | number) => {
        persist({
            ...month,
            extraIncome: extraIncome.map(e => e.id === id ? { ...e, [field]: value } : e)
        });
    };

    const removeExtraIncome = (id: string) => {
        const updated = { ...month, extraIncome: extraIncome.filter(e => e.id !== id) };
        persist(updated);
    };

    const addDebt = () => persist({
        ...month,
        debts: [...debts, { id: Date.now().toString(), label: '', type: 'Personal Loan' as DebtType, balance: 0, monthlyPayment: 0, interestRate: 0 }],
    });

    const updateDebt = (id: string, field: keyof DebtEntry, value: string | number) =>
        persist({ ...month, debts: debts.map(d => d.id === id ? { ...d, [field]: value } : d) });

    const removeDebt = (id: string) =>
        persist({ ...month, debts: debts.filter(d => d.id !== id) });

    const handlePrevMonth = () => {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() - 1);
        setDate(newDate);
    };

    const handleNextMonth = () => {
        if (!isStored) return; // Prevent navigation if current month not started
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + 1);
        setDate(newDate);
    };

    const handleSubmit = () => {
        if (!month) return;

        // Validation: Ensure key fields are entered
        const missingFields = [];
        if (!month.income) missingFields.push("Base Salary");
        if (!month.expenses?.rent) missingFields.push("Rent");

        // Utilities
        if (!month.expenses?.water && month.expenses?.water !== 0) missingFields.push("Water"); // Allow 0 if explicitly entered, but usually bills are > 0. unique logic?
        // Actually user said explicitly "if ... have not been entered". 
        // Let's assume > 0 for simplicity as bills usually are cost.
        if (!month.expenses?.water) missingFields.push("Water");
        if (!month.expenses?.internet) missingFields.push("Internet");
        if (!month.expenses?.electricity) missingFields.push("Electricity");

        if (missingFields.length > 0) {
            alert(`Please enter the following before completing the month:\n- ${missingFields.join('\n- ')}`);
            return;
        }

        submitMonthlyFinance(month);
        // Advance to next month immediately
        handleNextMonth();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const formatMonthDisplay = (monthId: string) => {
        const [y, m] = monthId.split('-');
        return new Date(parseInt(y), parseInt(m) - 1, 1)
            .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 120 }}>

            {/* Month header */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 32, padding: '14px 20px',
                background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {(date.getFullYear() > 2026 || (date.getFullYear() === 2026 && date.getMonth() > 1)) ? (
                        <button onClick={handlePrevMonth} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '1.2rem', color: '#9CA3AF', padding: '4px 8px'
                        }}>‹</button>
                    ) : (
                        <div style={{ width: 28 }}></div> /* Placeholder to keep alignment */
                    )}
                    <div>
                        <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Tracking</p>
                        <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827' }}>{formatMonthDisplay(month.month)}</p>
                    </div>
                    {isStored && (
                        <button onClick={handleNextMonth} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '1.2rem', color: '#9CA3AF', padding: '4px 8px'
                        }}>›</button>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {month.submitted && (
                        <span style={{
                            fontSize: '0.8rem', fontWeight: 700, color: '#059669',
                            background: '#ECFDF5', padding: '6px 14px', borderRadius: 99,
                            border: '1px solid #A7F3D0',
                        }}>✓ Submitted</span>
                    )}
                </div>
            </div>

            {/* ── 1. INCOME ─────────────────────────────────────────────────── */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: 28, marginBottom: 20 }}>
                <SectionHeader title="Income" />

                {/* Base salary — locked once set, can clear to re-enter */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0', borderBottom: '1px solid #F3F4F6',
                }}>
                    <span style={{ width: 20, textAlign: 'center', fontSize: 16 }}>💰</span>
                    <span style={{ flex: 1, fontSize: '0.9rem', color: '#4B5563', fontWeight: 500 }}>Base Salary</span>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="number"
                            value={baseSalary || ''}
                            placeholder="0"
                            onChange={e => persist({ ...month, income: Number(e.target.value) || 0 })}
                            style={{
                                width: 160, padding: '10px 50px 10px 12px',
                                border: '2px solid #3B82F6', borderRadius: 8,
                                fontSize: '1rem', fontWeight: 700, color: '#111827',
                                outline: 'none', background: 'white', textAlign: 'right',
                            }}
                        />
                        <span style={{
                            position: 'absolute', right: 10, top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '0.75rem', color: '#6B7280', pointerEvents: 'none',
                        }}>KES</span>
                    </div>
                </div>

                {/* Extra income entries */}
                {extraIncome.map((e: any) => (
                    <div key={e.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 0', borderBottom: '1px solid #F3F4F6',
                    }}>
                        <span style={{ fontSize: 16 }}>➕</span>
                        <input
                            value={e.label}
                            placeholder="Label"
                            onChange={ev => updateExtraIncome(e.id, 'label', ev.target.value)}
                            style={{
                                flex: 1, padding: '8px 12px',
                                border: '1px solid #E5E7EB', borderRadius: 8,
                                fontSize: '0.9rem', color: '#111827', outline: 'none',
                            }}
                            onFocus={ev => ev.target.style.borderColor = '#10B981'}
                            onBlur={ev => ev.target.style.borderColor = '#E5E7EB'}
                        />
                        <div style={{ position: 'relative' }}>
                            <input
                                type="number"
                                value={e.amount || ''}
                                placeholder="0"
                                onChange={ev => updateExtraIncome(e.id, 'amount', Number(ev.target.value))}
                                style={{
                                    width: 120, padding: '8px 44px 8px 10px',
                                    border: '1px solid #E5E7EB', borderRadius: 8,
                                    fontSize: '0.9rem', color: '#059669', fontWeight: 700,
                                    outline: 'none', textAlign: 'right',
                                }}
                                onFocus={ev => ev.target.style.borderColor = '#10B981'}
                                onBlur={ev => ev.target.style.borderColor = '#E5E7EB'}
                            />
                            <span style={{
                                position: 'absolute', right: 10, top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '0.7rem', color: '#9CA3AF', pointerEvents: 'none',
                            }}>KES</span>
                        </div>
                        <button
                            onClick={() => removeExtraIncome(e.id)}
                            style={{
                                background: 'none', border: 'none', color: '#D1D5DB',
                                cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px',
                            }}
                            onMouseEnter={ev => (ev.currentTarget.style.color = '#EF4444')}
                            onMouseLeave={ev => (ev.currentTarget.style.color = '#D1D5DB')}
                        >×</button>
                    </div>
                ))}

                <button
                    onClick={addExtraIncome}
                    style={{
                        marginTop: 14, padding: '9px 16px',
                        background: '#059669', color: 'white',
                        border: 'none', borderRadius: 8, fontWeight: 700,
                        cursor: 'pointer', fontSize: '0.85rem', width: 'fit-content',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#047857')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#059669')}
                >Add Extra income</button>

                {/* Income total */}
                {extraTotal > 0 && (
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginTop: 14, paddingTop: 14, borderTop: '2px solid #F3F4F6',
                    }}>
                        <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>Total income this month</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#059669' }}>KES {fmt(income)}</span>
                    </div>
                )}
            </div>

            {/* ── 2. SAVINGS ALLOCATION ─────────────────────────────────────── */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: 28, marginBottom: 20 }}>
                <SectionHeader title="Savings Allocation This Month" />

                <ExpenseRow label="Emergency Fund" icon="🛡️" value={month.emergencyFund ?? 0} onChange={v => persist({ ...month, emergencyFund: v })} />
                <ExpenseRow label="Car Fund" icon="🚘" value={month.carFund ?? 0} onChange={v => persist({ ...month, carFund: v })} />

                {/* Travel — USD */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0', borderBottom: '1px solid #F3F4F6',
                }}>
                    <span style={{ width: 20, textAlign: 'center', fontSize: 16 }}>✈️</span>
                    <span style={{ flex: 1, fontSize: '0.9rem', color: '#4B5563' }}>Travel</span>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="number"
                            value={month.travelFund || ''}
                            placeholder="0"
                            onChange={e => persist({ ...month, travelFund: Number(e.target.value) || 0 })}
                            style={{
                                width: 140, padding: '8px 44px 8px 10px',
                                border: '1px solid #E5E7EB', borderRadius: 8,
                                fontSize: '0.9rem', fontWeight: 600, color: '#111827',
                                outline: 'none', background: 'white', textAlign: 'right',
                            }}
                            onFocus={e => e.target.style.borderColor = '#3B82F6'}
                            onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                        />
                        <span style={{
                            position: 'absolute', right: 10, top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '0.75rem', color: '#9CA3AF', pointerEvents: 'none',
                        }}>USD</span>
                    </div>
                </div>

                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginTop: 16, paddingTop: 16, marginBottom: 24,
                }}>
                    <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>Total saved this month</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#111827' }}>KES {fmt(savingsKES)}</span>
                </div>

                {/* Goal Projections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    <GoalCard
                        title="Emergency Fund" currentTotal={emergencyWithThis}
                        monthlyAlloc={month.emergencyFund ?? 0}
                        goal={EMERGENCY_GOAL_KES} unit="KES" color="#10B981" icon="🛡️"
                        milestone={400000}
                    />
                    <GoalCard
                        title="Car Fund" currentTotal={carWithThis}
                        monthlyAlloc={month.carFund ?? 0}
                        goal={CAR_GOAL_KES} unit="KES" color="#3B82F6" icon="🚘"
                        milestone={1000000}
                    />
                    <GoalCard
                        title="Travel Buffer" currentTotal={travelWithThis}
                        monthlyAlloc={month.travelFund ?? 0}
                        goal={TRAVEL_GOAL_USD} unit="USD" color="#8B5CF6" icon="✈️"
                    />
                </div>

                {/* Save to Dashboard button */}
                <button
                    onClick={() => {
                        const hasSavings = (month.emergencyFund ?? 0) > 0 || (month.carFund ?? 0) > 0 || (month.travelFund ?? 0) > 0;
                        if (!hasSavings) return;
                        submitMonthlyFinance(month);
                        setSavingsSaved(true);
                        setTimeout(() => setSavingsSaved(false), 2500);
                    }}
                    disabled={(month.emergencyFund ?? 0) === 0 && (month.carFund ?? 0) === 0 && (month.travelFund ?? 0) === 0}
                    style={{
                        width: '100%',
                        marginTop: 16,
                        padding: '12px',
                        background: savingsSaved ? '#ECFDF5' : '#111827',
                        color: savingsSaved ? '#059669' : 'white',
                        border: savingsSaved ? '1px solid #A7F3D0' : 'none',
                        borderRadius: 10,
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: ((month.emergencyFund ?? 0) === 0 && (month.carFund ?? 0) === 0 && (month.travelFund ?? 0) === 0) ? 0.4 : 1,
                    }}
                >
                    {savingsSaved ? '✓ Saved to Dashboard' : '↑ Save Savings to Dashboard'}
                </button>
            </div>

            {/* ── 3. FIXED EXPENSES ─────────────────────────────────────────── */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: 28, marginBottom: 20 }}>
                <SectionHeader title="Fixed Monthly Expenses" />
                <ExpenseRow label="Rent" icon="🏠" value={expenses.rent} onChange={v => updateExpense('rent', v)} />
                <ExpenseRow label="House Keeping" icon="🧹" value={expenses.houseKeeping} onChange={v => updateExpense('houseKeeping', v)} />

                {/* Utilities subsection */}
                <div style={{ margin: '8px 0 0' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 0 6px',
                        borderBottom: '1px solid #F3F4F6',
                    }}>
                        <span style={{ width: 20, textAlign: 'center', fontSize: 16 }}>💡</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Utilities</span>
                    </div>
                    <div style={{ paddingLeft: 16, borderLeft: '2px solid #F3F4F6', marginLeft: 10 }}>
                        <ExpenseRow label="Water" icon="💧" value={expenses.water} onChange={v => updateExpense('water', v)} />
                        <ExpenseRow label="Internet" icon="📡" value={expenses.internet} onChange={v => updateExpense('internet', v)} />
                        <ExpenseRow label="Electricity" icon="⚡" value={expenses.electricity} onChange={v => updateExpense('electricity', v)} />
                    </div>
                </div>

                <ExpenseRow label="Phone & Subscriptions" icon="📱" value={expenses.phone} onChange={v => updateExpense('phone', v)} />
            </div>

            {/* ── 3.5 FLEXIBLE BUDGETS ──────────────────────────────────────── */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: 28, marginBottom: 20 }}>
                <SectionHeader title="Flexible Budgets" />
                <p style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: 16 }}>
                    Track variable spending categories with a monthly limit. Use this for Food, Transport, Personal, Social, and Miscellaneous.
                </p>

                {/* shared datalist for category autocomplete */}
                {(() => {
                    const customCats = budgets
                        .map(b => b.category.trim())
                        .filter(c => c && !BUDGET_CATEGORY_PRESETS.includes(c));
                    const allOptions = [...BUDGET_CATEGORY_PRESETS, ...Array.from(new Set(customCats))];
                    return (
                        <datalist id="budget-category-list">
                            {allOptions.map(opt => <option key={opt} value={opt} />)}
                        </datalist>
                    );
                })()}

                {budgets.map(b => {
                    const spentTotal = b.items.reduce((s, it) => s + it.amount, 0);
                    const hasLimit = b.limit > 0;
                    const pct = hasLimit ? Math.min((spentTotal / b.limit) * 100, 100) : 0;
                    const over = hasLimit && spentTotal > b.limit;
                    const near = hasLimit && !over && pct >= 80;
                    const barColor = over ? '#DC2626' : near ? '#D97706' : '#10B981';

                    return (
                        <div key={b.id} style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 18, marginBottom: 14, background: '#FAFAFA' }}>

                            {/* Category name (free-text + datalist) + remove */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                <input
                                    type="text"
                                    list="budget-category-list"
                                    value={b.category}
                                    placeholder="Category name…"
                                    onChange={ev => updateBudget(b.id, 'category', ev.target.value)}
                                    style={{
                                        flex: 1, padding: '8px 12px',
                                        border: '1px solid #E5E7EB', borderRadius: 8,
                                        fontSize: '0.95rem', fontWeight: 700, color: '#111827',
                                        outline: 'none', background: 'white',
                                    }}
                                    onFocus={ev => ev.target.style.borderColor = '#3B82F6'}
                                    onBlur={ev => ev.target.style.borderColor = '#E5E7EB'}
                                />
                                <button
                                    onClick={() => removeBudget(b.id)}
                                    style={{ background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }}
                                    onMouseEnter={ev => (ev.currentTarget.style.color = '#EF4444')}
                                    onMouseLeave={ev => (ev.currentTarget.style.color = '#D1D5DB')}
                                >×</button>
                            </div>

                            {/* Budget Limit (left) | Total Spent auto-sum (right) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                                {/* LEFT — Limit input */}
                                <div>
                                    <p style={{ fontSize: '0.62rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Budget Limit</p>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="number"
                                            value={b.limit || ''}
                                            placeholder="Set limit"
                                            onChange={ev => updateBudget(b.id, 'limit', Number(ev.target.value) || 0)}
                                            style={{ width: '100%', padding: '8px 40px 8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600, color: '#111827', outline: 'none', textAlign: 'right', boxSizing: 'border-box', background: 'white' }}
                                            onFocus={ev => ev.target.style.borderColor = '#3B82F6'}
                                            onBlur={ev => ev.target.style.borderColor = '#E5E7EB'}
                                        />
                                        <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '0.68rem', color: '#9CA3AF', pointerEvents: 'none' }}>KES</span>
                                    </div>
                                </div>
                                {/* RIGHT — Total Spent (read-only, auto-summed) */}
                                <div>
                                    <p style={{ fontSize: '0.62rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Total Spent</p>
                                    <div style={{
                                        padding: '8px 12px', borderRadius: 8, textAlign: 'right',
                                        border: `1px solid ${over ? '#FCA5A5' : '#E5E7EB'}`,
                                        background: over ? '#FEF2F2' : '#F3F4F6',
                                        fontSize: '0.9rem', fontWeight: 700,
                                        color: over ? '#DC2626' : spentTotal > 0 ? '#111827' : '#9CA3AF',
                                    }}>
                                        {spentTotal > 0 ? `KES ${fmt(spentTotal)}` : '—'}
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar */}
                            {hasLimit && (
                                <div style={{ marginBottom: 14 }}>
                                    <div style={{ height: 6, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                                        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width 0.3s ease' }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                                            {over
                                                ? <span style={{ color: '#DC2626', fontWeight: 700 }}>Over by KES {fmt(spentTotal - b.limit)}</span>
                                                : `KES ${fmt(b.limit - spentTotal)} remaining`}
                                        </span>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: barColor }}>{Math.round(pct)}%</span>
                                    </div>
                                </div>
                            )}

                            {/* Individual expense line items */}
                            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 12 }}>
                                {b.items.map(item => (
                                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D1D5DB', flexShrink: 0 }} />
                                        <input
                                            type="text"
                                            value={item.label}
                                            placeholder="Description"
                                            onChange={ev => updateBudgetItem(b.id, item.id, 'label', ev.target.value)}
                                            style={{ flex: 1, padding: '6px 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: '0.85rem', color: '#374151', outline: 'none', background: 'white' }}
                                            onFocus={ev => ev.target.style.borderColor = '#3B82F6'}
                                            onBlur={ev => ev.target.style.borderColor = '#E5E7EB'}
                                        />
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="number"
                                                value={item.amount || ''}
                                                placeholder="0"
                                                onChange={ev => updateBudgetItem(b.id, item.id, 'amount', Number(ev.target.value) || 0)}
                                                style={{ width: 110, padding: '6px 36px 6px 8px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: '0.85rem', fontWeight: 600, color: '#111827', outline: 'none', textAlign: 'right', background: 'white' }}
                                                onFocus={ev => ev.target.style.borderColor = '#3B82F6'}
                                                onBlur={ev => ev.target.style.borderColor = '#E5E7EB'}
                                            />
                                            <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.65rem', color: '#9CA3AF', pointerEvents: 'none' }}>KES</span>
                                        </div>
                                        <button
                                            onClick={() => removeBudgetItem(b.id, item.id)}
                                            style={{ background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1 }}
                                            onMouseEnter={ev => (ev.currentTarget.style.color = '#EF4444')}
                                            onMouseLeave={ev => (ev.currentTarget.style.color = '#D1D5DB')}
                                        >×</button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => addBudgetItem(b.id)}
                                    style={{ marginTop: 4, padding: '6px 14px', background: 'white', color: '#6B7280', border: '1px dashed #D1D5DB', borderRadius: 7, fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem', width: '100%', transition: 'all 0.15s' }}
                                    onMouseEnter={ev => { ev.currentTarget.style.background = '#F9FAFB'; ev.currentTarget.style.borderColor = '#9CA3AF'; }}
                                    onMouseLeave={ev => { ev.currentTarget.style.background = 'white'; ev.currentTarget.style.borderColor = '#D1D5DB'; }}
                                >+ Add expense</button>
                            </div>
                        </div>
                    );
                })}

                <button
                    onClick={addBudget}
                    style={{ marginTop: 4, padding: '9px 18px', background: '#F0F9FF', color: '#0EA5E9', border: '1px solid #BAE6FD', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#E0F2FE'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#F0F9FF'; }}
                >+ Add Budget Category</button>

                {budgetTotal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '2px solid #F3F4F6' }}>
                        <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>Total budget spend</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#111827' }}>KES {fmt(budgetTotal)}</span>
                    </div>
                )}
            </div>

            {/* ── 3.8 DEBT TRACKER ──────────────────────────────────────────── */}
            <div style={{ background: 'white', border: '2px solid #FEE2E2', borderRadius: 16, padding: 28, marginBottom: 20 }}>
                <SectionHeader title="Debt Tracker" />

                {debts.length === 0 && (
                    <p style={{ fontSize: '0.85rem', color: '#9CA3AF', marginBottom: 16, fontStyle: 'italic' }}>
                        No debts tracked this month. Add any loans, credit cards, or mobile loans below.
                    </p>
                )}

                {debts.map((d) => (
                    <div key={d.id} style={{ border: '1px solid #FEE2E2', borderRadius: 12, padding: 16, marginBottom: 12, background: '#FFFBFB' }}>
                        {/* Name + Type + Remove */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
                            <span style={{ fontSize: 18 }}>💳</span>
                            <input
                                value={d.label}
                                placeholder="Debt name (e.g. KCB Loan)"
                                onChange={ev => updateDebt(d.id, 'label', ev.target.value)}
                                style={{ flex: 1, padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: '0.9rem', color: '#111827', outline: 'none' }}
                                onFocus={ev => ev.target.style.borderColor = '#EF4444'}
                                onBlur={ev => ev.target.style.borderColor = '#E5E7EB'}
                            />
                            <select
                                value={d.type}
                                onChange={ev => updateDebt(d.id, 'type', ev.target.value)}
                                style={{ padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: '0.85rem', color: '#374151', background: 'white', cursor: 'pointer', outline: 'none' }}
                            >
                                <option>Credit Card</option>
                                <option>Mobile Loan</option>
                                <option>Personal Loan</option>
                                <option>Car Loan</option>
                                <option>Student Loan</option>
                                <option>Business Loan</option>
                                <option>Mortgage</option>
                                <option>Other</option>
                            </select>
                            <button
                                onClick={() => removeDebt(d.id)}
                                style={{ background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}
                                onMouseEnter={ev => (ev.currentTarget.style.color = '#EF4444')}
                                onMouseLeave={ev => (ev.currentTarget.style.color = '#D1D5DB')}
                            >×</button>
                        </div>

                        {/* Three numeric fields */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                            {/* Outstanding Balance */}
                            <div>
                                <p style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>Outstanding Balance</p>
                                <p style={{ fontSize: '0.65rem', color: '#D1D5DB', marginBottom: 4 }}>tracking only</p>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number" value={d.balance || ''} placeholder="0"
                                        onChange={ev => updateDebt(d.id, 'balance', Number(ev.target.value))}
                                        style={{ width: '100%', padding: '8px 40px 8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600, color: '#111827', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }}
                                        onFocus={ev => ev.target.style.borderColor = '#EF4444'}
                                        onBlur={ev => ev.target.style.borderColor = '#E5E7EB'}
                                    />
                                    <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '0.68rem', color: '#9CA3AF', pointerEvents: 'none' }}>KES</span>
                                </div>
                            </div>

                            {/* Monthly Payment */}
                            <div>
                                <p style={{ fontSize: '0.68rem', color: '#DC2626', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>Monthly Payment</p>
                                <p style={{ fontSize: '0.65rem', color: '#DC2626', opacity: 0.6, marginBottom: 4 }}>affects budget & breakdown</p>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number" value={d.monthlyPayment || ''} placeholder="0"
                                        onChange={ev => updateDebt(d.id, 'monthlyPayment', Number(ev.target.value))}
                                        style={{ width: '100%', padding: '8px 40px 8px 10px', border: `2px solid ${d.monthlyPayment === 0 ? '#FCA5A5' : '#EF4444'}`, borderRadius: 8, fontSize: '0.9rem', fontWeight: 600, color: '#DC2626', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }}
                                        onFocus={ev => ev.target.style.borderColor = '#EF4444'}
                                        onBlur={ev => ev.target.style.borderColor = d.monthlyPayment === 0 ? '#FCA5A5' : '#EF4444'}
                                    />
                                    <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '0.68rem', color: '#9CA3AF', pointerEvents: 'none' }}>KES</span>
                                </div>
                            </div>

                            {/* Interest Rate */}
                            <div>
                                <p style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>Interest Rate p.a.</p>
                                <p style={{ fontSize: '0.65rem', color: '#D1D5DB', marginBottom: 4 }}>for health assessment</p>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number" value={d.interestRate || ''} placeholder="0"
                                        onChange={ev => updateDebt(d.id, 'interestRate', Number(ev.target.value))}
                                        style={{ width: '100%', padding: '8px 28px 8px 10px', border: `1px solid ${d.interestRate > 20 ? '#FCA5A5' : '#E5E7EB'}`, borderRadius: 8, fontSize: '0.9rem', fontWeight: 600, color: d.interestRate > 20 ? '#DC2626' : '#111827', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }}
                                        onFocus={ev => ev.target.style.borderColor = '#EF4444'}
                                        onBlur={ev => ev.target.style.borderColor = d.interestRate > 20 ? '#FCA5A5' : '#E5E7EB'}
                                    />
                                    <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '0.68rem', color: '#9CA3AF', pointerEvents: 'none' }}>%</span>
                                </div>
                                {d.interestRate > 20 && (
                                    <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: 3, fontWeight: 600 }}>⚠ High interest</p>
                                )}
                            </div>
                        </div>

                        {/* Warning when monthly payment is not set */}
                        {d.monthlyPayment === 0 && (
                            <div style={{ marginTop: 10, padding: '8px 12px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14 }}>⚠️</span>
                                <p style={{ fontSize: '0.78rem', color: '#92400E', margin: 0 }}>
                                    Monthly payment is 0 — this debt won't appear in your budget or spending breakdown until you set it.
                                </p>
                            </div>
                        )}
                    </div>
                ))}

                <button
                    onClick={addDebt}
                    style={{ marginTop: 4, padding: '9px 18px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#FEF2F2'; }}
                >+ Add Debt</button>

                {/* ── Debt Health Assessment ── */}
                {debtHealth && (
                    <div style={{ marginTop: 24, borderTop: '2px solid #FEE2E2', paddingTop: 20 }}>

                        {/* DTI banner */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, background: debtHealth.statusBg, border: `1px solid ${debtHealth.statusColor}40`, borderRadius: 12, padding: '16px 20px' }}>
                            <div style={{ minWidth: 110 }}>
                                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Debt-to-Income</p>
                                <p style={{ fontSize: '2.2rem', fontWeight: 900, color: debtHealth.statusColor, lineHeight: 1 }}>{Math.round(debtHealth.dti)}%</p>
                                <p style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 3 }}>KES {fmt(debtHealth.debtTotal)}/mo in payments</p>
                            </div>

                            {/* Gauge bar */}
                            <div style={{ flex: 1 }}>
                                <div style={{ position: 'relative', height: 10, background: 'linear-gradient(to right, #10B981 0%, #FBBF24 56%, #EF4444 100%)', borderRadius: 99 }}>
                                    <div style={{
                                        position: 'absolute',
                                        left: `${Math.min(debtHealth.dti * 2, 98)}%`,
                                        top: '50%', transform: 'translate(-50%, -50%)',
                                        width: 16, height: 16, background: 'white',
                                        border: `3px solid ${debtHealth.statusColor}`,
                                        borderRadius: '50%', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                                    }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                                    <span style={{ fontSize: '0.68rem', color: '#10B981', fontWeight: 600 }}>0% Excellent</span>
                                    <span style={{ fontSize: '0.68rem', color: '#D97706', fontWeight: 600 }}>28% Caution</span>
                                    <span style={{ fontSize: '0.68rem', color: '#EF4444', fontWeight: 600 }}>50%+ Critical</span>
                                </div>
                            </div>

                            <div style={{ textAlign: 'center', background: debtHealth.statusColor, color: 'white', padding: '8px 14px', borderRadius: 10, fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                                {debtHealth.status}
                            </div>
                        </div>

                        {/* Advice cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {debtHealth.advice.map((a, i) => (
                                <div key={i} style={{
                                    display: 'flex', gap: 12, alignItems: 'flex-start',
                                    padding: '12px 16px', borderRadius: 10,
                                    background: a.type === 'danger' ? '#FEF2F2' : a.type === 'warn' ? '#FFFBEB' : '#F0F9FF',
                                    border: `1px solid ${a.type === 'danger' ? '#FECACA' : a.type === 'warn' ? '#FDE68A' : '#BAE6FD'}`,
                                }}>
                                    <span style={{ fontSize: 18, flexShrink: 0 }}>
                                        {a.type === 'danger' ? '🚨' : a.type === 'warn' ? '⚠️' : '💡'}
                                    </span>
                                    <p style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.55, margin: 0 }}>{a.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── 4. ONE-OFF EXPENSES ───────────────────────────────────────── */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: 28, marginBottom: 20 }}>
                <SectionHeader title="One-Off Expenses (Visa, Insurance, etc.)" />

                {oneOffs.map(o => (
                    <div key={o.id} style={{
                        padding: '10px 0', borderBottom: '1px solid #F3F4F6',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 16 }}>⚡</span>
                            <input
                                value={o.label}
                                placeholder="Label"
                                onChange={ev => updateOneOff(o.id, 'label', ev.target.value)}
                                style={{
                                    flex: 1, padding: '8px 12px',
                                    border: '1px solid #E5E7EB', borderRadius: 8,
                                    fontSize: '0.9rem', color: '#111827', outline: 'none',
                                }}
                                onFocus={ev => ev.target.style.borderColor = '#3B82F6'}
                                onBlur={ev => ev.target.style.borderColor = '#E5E7EB'}
                            />
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    value={o.amount || ''}
                                    placeholder="0"
                                    onChange={ev => updateOneOff(o.id, 'amount', Number(ev.target.value))}
                                    style={{
                                        width: 110, padding: '8px 40px 8px 10px',
                                        border: '1px solid #E5E7EB', borderRadius: 8,
                                        fontSize: '0.9rem', color: '#111827', fontWeight: 700,
                                        outline: 'none', textAlign: 'right',
                                    }}
                                    onFocus={ev => ev.target.style.borderColor = '#3B82F6'}
                                    onBlur={ev => ev.target.style.borderColor = '#E5E7EB'}
                                />
                                <span style={{
                                    position: 'absolute', right: 8, top: '50%',
                                    transform: 'translateY(-50%)',
                                    fontSize: '0.7rem', color: '#9CA3AF', pointerEvents: 'none',
                                }}>KES</span>
                            </div>
                            <button
                                onClick={() => removeOneOff(o.id)}
                                style={{
                                    background: 'none', border: 'none', color: '#D1D5DB',
                                    cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#D1D5DB')}
                            >×</button>
                        </div>
                    </div>
                ))}

                <button
                    onClick={addOneOff}
                    style={{
                        marginTop: 16, padding: '9px 18px',
                        background: '#111827', color: 'white',
                        border: 'none', borderRadius: 8, fontWeight: 700,
                        cursor: 'pointer', fontSize: '0.9rem', width: 'fit-content',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#374151')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#111827')}
                >+ Add One-Off Expense</button>

                {oneOffTotal > 0 && (
                    <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        marginTop: 16, paddingTop: 16, borderTop: '2px solid #F3F4F6',
                    }}>
                        <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>One-off total</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#111827' }}>KES {fmt(oneOffTotal)}</span>
                    </div>
                )}
            </div>

            {/* ── 4.5 TOTAL EXPENSES ────────────────────────────────────────── */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Total Monthly Expenses</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.88rem', color: '#6B7280' }}>Fixed expenses</span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827' }}>KES {fmt(fixedTotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.88rem', color: debtMonthlyTotal > 0 ? '#DC2626' : '#6B7280' }}>Debt payments</span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: debtMonthlyTotal > 0 ? '#DC2626' : '#9CA3AF' }}>
                            {debtMonthlyTotal > 0 ? `KES ${fmt(debtMonthlyTotal)}` : '—'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.88rem', color: '#6B7280' }}>One-off expenses</span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: oneOffTotal > 0 ? '#111827' : '#9CA3AF' }}>
                            {oneOffTotal > 0 ? `KES ${fmt(oneOffTotal)}` : '—'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '2px solid #F3F4F6', marginTop: 2 }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>Total</span>
                        <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827' }}>KES {fmt(fixedTotal + debtMonthlyTotal + oneOffTotal)}</span>
                    </div>
                </div>
            </div>

            {/* ── 5. SUMMARY ────────────────────────────────────────────────── */}
            <div style={{
                background: leftover < 0 ? '#FEF2F2' : '#F0FDF4',
                border: `1px solid ${leftover < 0 ? '#FECACA' : '#BBF7D0'}`,
                borderRadius: 16, padding: 24, marginBottom: 20,
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Income</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>KES {fmt(income)}</p>
                    </div>
                    <div style={{ textAlign: 'center', borderLeft: '1px solid #E5E7EB', borderRight: '1px solid #E5E7EB' }}>
                        <p style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Spent + Saved</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>KES {fmt(totalOut)}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Unallocated</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: 800, color: leftover < 0 ? '#DC2626' : '#059669' }}>
                            {leftover < 0 ? '−' : ''}KES {fmt(Math.abs(leftover))}
                        </p>
                    </div>
                </div>
                {leftover < 0 && (
                    <p style={{ textAlign: 'center', marginTop: 12, fontSize: '0.82rem', color: '#DC2626', fontWeight: 600 }}>
                        ⚠ You're over budget by KES {fmt(Math.abs(leftover))}
                    </p>
                )}
            </div>

            {/* ── 6. SPENDING BREAKDOWN ─────────────────────────────────────── */}
            {(() => {
                const hasAnyData = budgets.length > 0 || fixedBreakdownItems.length > 0 || oneOffs.some(o => o.amount > 0);
                if (!hasAnyData) return null;

                return (
                    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: 28, marginBottom: 20 }}>
                        <SectionHeader title="Spending Breakdown" />

                        {/* — Flexible Budgets — */}
                        {budgets.length > 0 && (
                            <div style={{ marginBottom: 24 }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Flexible Budgets</p>
                                {budgets.map(b => {
                                    const spentTotal = b.items.reduce((s, it) => s + it.amount, 0);
                                    const hasLimit = b.limit > 0;
                                    const pct = hasLimit ? Math.min((spentTotal / b.limit) * 100, 100) : 0;
                                    const over = hasLimit && spentTotal > b.limit;
                                    const near = hasLimit && !over && pct >= 80;
                                    const barColor = over ? '#DC2626' : near ? '#D97706' : '#10B981';

                                    return (
                                        <div key={b.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #F3F4F6' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>
                                                    {b.category || 'Unnamed'}
                                                </span>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: over ? '#DC2626' : '#111827' }}>
                                                    KES {fmt(spentTotal)}
                                                    {hasLimit && <span style={{ fontWeight: 400, color: '#9CA3AF' }}> / {fmt(b.limit)}</span>}
                                                </span>
                                            </div>
                                            <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                                                <div style={{ height: '100%', width: `${hasLimit ? pct : 0}%`, background: barColor, borderRadius: 99, transition: 'width 0.3s ease' }} />
                                            </div>
                                            {hasLimit && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                                                        {over
                                                            ? <span style={{ color: '#DC2626', fontWeight: 700 }}>Over by KES {fmt(spentTotal - b.limit)}</span>
                                                            : `KES ${fmt(b.limit - spentTotal)} remaining`}
                                                    </span>
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: barColor }}>{Math.round(pct)}%</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* — Fixed Costs — */}
                        {fixedBreakdownItems.length > 0 && (
                            <div style={{ marginBottom: 24 }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Fixed Costs</p>
                                {fixedBreakdownItems.map((item, i) => (
                                    <div key={i} style={{ marginBottom: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontSize: '0.85rem', color: '#4B5563' }}>{item.label}</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>
                                                KES {fmt(item.value)}
                                                {income > 0 && <span style={{ fontWeight: 400, color: '#9CA3AF', marginLeft: 6 }}>{Math.round((item.value / income) * 100)}%</span>}
                                            </span>
                                        </div>
                                        <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${(item.value / maxFixed) * 100}%`, background: item.color, borderRadius: 99, transition: 'width 0.3s ease' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* — One-off Expenses — */}
                        {oneOffs.some(o => o.amount > 0) && (
                            <div>
                                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>One-off Expenses</p>
                                {oneOffs.filter(o => o.amount > 0).map(o => (
                                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#4B5563' }}>{o.label || 'Unlabelled'}</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>KES {fmt(o.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ── 8. SUBMIT ─────────────────────────────────────────────────── */}
            {!month.submitted ? (
                <button
                    onClick={handleSubmit}
                    style={{
                        width: '100%', padding: '18px',
                        background: '#111827', color: 'white',
                        border: 'none', borderRadius: 999,
                        fontSize: '1rem', fontWeight: 700,
                        cursor: 'pointer', transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = '#1F2937';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = '#111827';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    Complete & Start {(() => {
                        const next = new Date(date);
                        next.setMonth(next.getMonth() + 1);
                        return next.toLocaleDateString('en-US', { month: 'long' });
                    })()}
                </button>
            ) : (
                <div style={{ textAlign: 'center', padding: 16, color: '#6B7280', fontSize: '0.9rem' }}>
                    Month confirmed and locked ✓
                </div>
            )}
        </div>
    );
}