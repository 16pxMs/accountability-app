"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MonthlyData, MonthlyExpenses, OneOffExpense } from '@/lib/types';
import { loadData, saveMonthlyFinance, submitMonthlyFinance, getMonth, getTotalEmergencyFund, getTotalCarFund, getTotalTravelFund } from '@/lib/storage';

// ── Goal constants ──────────────────────────────────────────────────────────
const EMERGENCY_GOAL_KES = 1_350_000;
const CAR_GOAL_KES = 1_500_000;
const TRAVEL_GOAL_USD = 1_500;
const KES_TO_USD = 130;

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
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: 4, background: color, borderRadius: '16px 16px 0 0',
            }} />
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
                    phone: 0, personal: 0, social: 0, misc: 0
                },
                oneOffs: [],
                extraIncome: [],
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
        phone: 0, personal: 0, social: 0, misc: 0
    };
    const oneOffs = month.oneOffs ?? [];
    const extraIncome = month.extraIncome ?? [];
    const baseSalary = month.income ?? 0;

    // ── Derived ───────────────────────────────────────────────────────────────
    const extraTotal = extraIncome.reduce((a: number, e: any) => a + e.amount, 0);
    const income = baseSalary + extraTotal;

    const fixedTotal = Object.values(expenses).reduce((a, b) => a + b, 0);
    const oneOffTotal = oneOffs.reduce((a, o) => a + o.amount, 0);
    const savingsKES = (month.emergencyFund ?? 0) + (month.carFund ?? 0);
    const savingsUSD = month.travelFund ?? 0;
    const totalOut = fixedTotal + oneOffTotal + savingsKES + (savingsUSD * KES_TO_USD);
    const leftover = income - totalOut;

    const emergencyWithThis = totalEmergency + (month.emergencyFund ?? 0);
    const carWithThis = totalCar + (month.carFund ?? 0);
    const travelWithThis = totalTravel + (month.travelFund ?? 0);

    const breakdownItems: { label: string; value: number; color: string }[] = [
        { label: 'Rent', value: expenses.rent, color: '#F87171' },
        { label: 'Food', value: expenses.food, color: '#FB923C' },
        { label: 'Transport', value: expenses.transport, color: '#FBBF24' },
        { label: 'House Keeping', value: expenses.houseKeeping, color: '#A78BFA' },
        { label: 'Water', value: expenses.water, color: '#34D399' },
        { label: 'Internet', value: expenses.internet, color: '#22D3EE' },
        { label: 'Electricity', value: expenses.electricity, color: '#6EE7B7' },
        { label: 'Phone & Subs', value: expenses.phone, color: '#818CF8' },
        { label: 'Personal', value: expenses.personal, color: '#C084FC' },
        { label: 'Social', value: expenses.social, color: '#F472B6' },
        { label: 'Misc', value: expenses.misc, color: '#94A3B8' },
        ...oneOffs.map(o => ({ label: o.label, value: o.amount, color: '#FB923C' })),
    ].filter(i => i.value > 0).sort((a, b) => b.value - a.value);

    const maxExpense = Math.max(...breakdownItems.map(i => i.value), 1);

    // ── Update helpers ────────────────────────────────────────────────────────
    const updateExpense = (field: keyof MonthlyExpenses, val: number) =>
        persist({ ...month, expenses: { ...expenses, [field]: val } });

    const addOneOff = () => {
        persist({
            ...month,
            oneOffs: [...oneOffs, { id: Date.now().toString(), label: '', amount: 0 }]
        });
    };

    const updateOneOff = (id: string, field: 'label' | 'amount', value: string | number) => {
        persist({
            ...month,
            oneOffs: oneOffs.map(o => o.id === id ? { ...o, [field]: value } : o)
        });
    };

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
                >+ Add Extra Item</button>

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
                    <span style={{ flex: 1, fontSize: '0.9rem', color: '#4B5563' }}>Travel Buffer</span>
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
                    marginTop: 16, paddingTop: 16, borderTop: '2px solid #F3F4F6',
                    marginBottom: 24,
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
                <ExpenseRow label="Food & Groceries" icon="🛒" value={expenses.food} onChange={v => updateExpense('food', v)} />

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
                <ExpenseRow label="Transport" icon="🚗" value={expenses.transport} onChange={v => updateExpense('transport', v)} />
                <ExpenseRow label="Personal & Clothing" icon="👕" value={expenses.personal} onChange={v => updateExpense('personal', v)} />
                <ExpenseRow label="Social & Entertainment" icon="🎉" value={expenses.social} onChange={v => updateExpense('social', v)} />
                <ExpenseRow label="Miscellaneous" icon="📦" value={expenses.misc} onChange={v => updateExpense('misc', v)} />
            </div>

            {/* ── 4. ONE-OFF EXPENSES ───────────────────────────────────────── */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: 28, marginBottom: 20 }}>
                <SectionHeader title="One-Off Expenses (Visa, Insurance, etc.)" />

                {oneOffs.map(o => (
                    <div key={o.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 0', borderBottom: '1px solid #F3F4F6',
                    }}>
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
                                    width: 120, padding: '8px 44px 8px 10px',
                                    border: '1px solid #E5E7EB', borderRadius: 8,
                                    fontSize: '0.9rem', color: '#111827', fontWeight: 700,
                                    outline: 'none', textAlign: 'right',
                                }}
                                onFocus={ev => ev.target.style.borderColor = '#3B82F6'}
                                onBlur={ev => ev.target.style.borderColor = '#E5E7EB'}
                            />
                            <span style={{
                                position: 'absolute', right: 10, top: '50%',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Total Monthly Expenses</p>
                        <p style={{ fontSize: '0.85rem', color: '#6B7280' }}>Fixed + One-Offs</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#DC2626' }}>KES {fmt(fixedTotal + oneOffTotal)}</p>
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
            {breakdownItems.length > 0 && (
                <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: 28, marginBottom: 20 }}>
                    <SectionHeader title="Spending Breakdown" />
                    {breakdownItems.map((item, i) => (
                        <div key={i} style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: '0.85rem', color: '#4B5563' }}>{item.label}</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>
                                    KES {fmt(item.value)}
                                    {income > 0 && (
                                        <span style={{ fontWeight: 400, color: '#9CA3AF', marginLeft: 6 }}>
                                            {Math.round((item.value / income) * 100)}%
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', width: `${(item.value / maxExpense) * 100}%`,
                                    background: item.color, borderRadius: 99, transition: 'width 0.3s ease',
                                }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

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