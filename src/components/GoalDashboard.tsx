"use client";

import { useEffect, useState } from 'react';
import { AppData, WeekData, MonthlyData } from '@/lib/types';
import { loadData, getWeek, getMonth } from '@/lib/storage';
import { JOB_PROGRESS_OPTIONS, DECISION_OPTIONS, FRONTEND_OPTIONS } from '@/lib/constants';
import { getLeverageState, getHealthState, getWealthState } from '@/lib/statusCalculators';
import { calculateProgress, countValidOptions } from '@/lib/utils';

const RANGES = [
    { label: 'This month', key: '1m',  n: 1   },
    { label: '3 months',   key: '3m',  n: 3   },
    { label: '6 months',   key: '6m',  n: 6   },
    { label: '1 year',     key: '1y',  n: 12  },
    { label: 'All time',   key: 'all', n: 999 },
];
const applyRange = (all: MonthlyData[], key: string) =>
    all.slice(-(RANGES.find(r => r.key === key) || RANGES[1]).n);

const FIXED_KEYS = ['rent', 'houseKeeping', 'water', 'internet', 'electricity', 'phone'];

function derive(m: MonthlyData) {
    const inc      = (m.income ?? 0) + (m.extraIncome ?? []).reduce((a: number, e: any) => a + e.amount, 0);
    const fixed    = FIXED_KEYS.reduce((a, k) => a + ((m.expenses && (m.expenses as any)[k]) ? (m.expenses as any)[k] : 0), 0);
    const daySpend = (m.budgets ?? []).reduce((a, b) => a + b.items.reduce((s, i) => s + i.amount, 0), 0);
    const ooTotal  = (m.oneOffs ?? []).reduce((a, o) => a + o.amount, 0);
    const debtPmt  = (m.debts ?? []).reduce((a, d) => a + d.monthlyPayment, 0);
    const savings  = (m.emergencyFund ?? 0) + (m.carFund ?? 0) + (m.travelFund ?? 0) * 130;
    const totalOut = fixed + daySpend + ooTotal + debtPmt + savings;
    const leftover = inc - totalOut;
    const savRate  = inc > 0 ? (savings / inc) * 100 : 0;
    const dti      = inc > 0 && debtPmt > 0 ? (debtPmt / inc) * 100 : 0;
    return { inc, fixed, daySpend, ooTotal, debtPmt, savings, totalOut, leftover, savRate, dti };
}

type InsightSev = 'danger' | 'warn' | 'info' | 'good';
interface Insight { type: InsightSev; emoji: string; headline: string; body: string; cta: string; }

function getInsights(win: MonthlyData[], all: MonthlyData[]): Insight[] {
    const out: Insight[] = [];
    if (win.length === 0) return out;

    const latest     = win[win.length - 1];
    const prev       = win.length > 1 ? win[win.length - 2] : null;
    const ld         = derive(latest);
    const budgets    = latest.budgets || [];
    const winLen     = win.length;
    const winAvgDay  = win.reduce((a, mo) => a + derive(mo).daySpend, 0) / winLen;
    const winAvgSav  = win.reduce((a, mo) => a + derive(mo).savRate,  0) / winLen;

    // 1. Over-budget categories (latest month)
    for (const b of budgets) {
        if (b.limit > 0) {
            const spent = b.items.reduce((s, i) => s + i.amount, 0);
            if (spent > b.limit) {
                const pctOver = Math.round(((spent - b.limit) / b.limit) * 100);
                const cat = b.category || 'A budget';
                out.push({
                    type: 'warn', emoji: '\u26a0\ufe0f',
                    headline: cat + ' is ' + pctOver + '% over limit',
                    body: 'You set a limit of KES ' + Math.round(b.limit).toLocaleString('en-KE') + ' for ' + cat + ' but spent KES ' + Math.round(spent).toLocaleString('en-KE') + '. Overspending in one category often cascades into others.',
                    cta: 'Review individual items under ' + cat + ' and identify what to cut or defer next month.',
                });
            }
        }
    }

    // 2. Category improvement vs previous month (15%+ lower)
    if (prev) {
        const prevBudgets = prev.budgets || [];
        for (const b of budgets) {
            const prevB = prevBudgets.find(pb => pb.category === b.category);
            if (prevB) {
                const cur = b.items.reduce((s, i) => s + i.amount, 0);
                const old = prevB.items.reduce((s, i) => s + i.amount, 0);
                if (old > 0 && cur < old * 0.85) {
                    const pct = Math.round(((old - cur) / old) * 100);
                    const cat = b.category || 'A category';
                    out.push({
                        type: 'good', emoji: '\ud83c\udf89',
                        headline: cat + ' spending down ' + pct + '% vs last month',
                        body: 'You spent KES ' + Math.round(cur).toLocaleString('en-KE') + ' on ' + cat + ' this month, down from KES ' + Math.round(old).toLocaleString('en-KE') + '. That is a ' + pct + '% improvement.',
                        cta: 'Redirect the KES ' + Math.round(old - cur).toLocaleString('en-KE') + ' saved here into your emergency fund this month.',
                    });
                }
            }
        }
    }

    // 3. Savings rate (window average)
    if (winAvgSav < 10) {
        out.push({
            type: 'warn', emoji: '\ud83d\udcb8',
            headline: 'Savings rate is only ' + Math.round(winAvgSav) + '%',
            body: 'A healthy savings rate is at least 10-20% of income. Saving less than 10% means your financial cushion grows very slowly and leaves you exposed to unexpected costs.',
            cta: 'Find one recurring expense to cut and redirect it to your emergency fund this month.',
        });
    } else if (winAvgSav >= 20) {
        out.push({
            type: 'good', emoji: '\u2705',
            headline: 'Savings rate is ' + Math.round(winAvgSav) + '% — excellent',
            body: 'You are saving over 20% of income on average this period. This puts you well ahead of most people and accelerates your path to financial security.',
            cta: 'Make sure savings are spread across emergency fund and other goals, not just one bucket.',
        });
    } else {
        out.push({
            type: 'info', emoji: '\ud83d\udcca',
            headline: 'Savings rate is ' + Math.round(winAvgSav) + '% — on track',
            body: 'You are saving between 10-20% of income on average. That is a solid foundation. Pushing past 20% would dramatically accelerate your goals.',
            cta: 'Automate a small top-up to your emergency fund each month. Even KES 1,000 more compounds over time.',
        });
    }

    // 4. Leftover (latest month)
    if (ld.leftover < 0) {
        out.push({
            type: 'danger', emoji: '\ud83d\udea8',
            headline: 'Over budget by KES ' + Math.round(Math.abs(ld.leftover)).toLocaleString('en-KE') + ' this month',
            body: 'Total outgoings exceeded income by KES ' + Math.round(Math.abs(ld.leftover)).toLocaleString('en-KE') + '. You either dipped into savings or went into debt to cover the gap.',
            cta: 'Identify which category pushed you over. Do not carry a credit card balance month to month.',
        });
    } else if (ld.inc > 0 && (ld.leftover / ld.inc) > 0.12) {
        out.push({
            type: 'info', emoji: '\ud83d\udca1',
            headline: Math.round((ld.leftover / ld.inc) * 100) + '% of income is unallocated this month',
            body: 'You have KES ' + Math.round(ld.leftover).toLocaleString('en-KE') + ' sitting unallocated. Idle money loses value to inflation and misses compounding.',
            cta: 'Allocate this now: emergency fund first, then car fund, then travel buffer.',
        });
    }

    // 5. Debt-to-income (latest month)
    if (ld.dti > 36) {
        out.push({
            type: 'danger', emoji: '\ud83d\udea8',
            headline: 'Debt payments are ' + Math.round(ld.dti) + '% of income',
            body: 'A debt-to-income ratio above 36% is in the danger zone. Lenders flag this as high-risk and it severely limits your ability to save or absorb emergencies.',
            cta: 'Stop taking on new debt. Pay minimums on all debts and put every spare shilling toward the highest-rate one.',
        });
    } else if (ld.dti > 0 && ld.dti < 28) {
        out.push({
            type: 'info', emoji: '\u2705',
            headline: 'Debt-to-income at ' + Math.round(ld.dti) + '% — healthy range',
            body: 'Your monthly debt payments are within a healthy range. Keep making payments on time to protect your credit rating.',
            cta: 'Consider making one extra payment on your highest-interest debt this month to reduce total interest paid.',
        });
    }

    // 6. Day-to-day trend vs window average
    if (winLen >= 2 && winAvgDay > 0) {
        if (ld.daySpend > winAvgDay * 1.15) {
            const pctAbove = Math.round(((ld.daySpend - winAvgDay) / winAvgDay) * 100);
            out.push({
                type: 'warn', emoji: '\ud83d\udcc8',
                headline: 'Day-to-day spending ' + pctAbove + '% above your average',
                body: 'You spent KES ' + Math.round(ld.daySpend).toLocaleString('en-KE') + ' on variable categories vs your ' + winLen + '-month average of KES ' + Math.round(winAvgDay).toLocaleString('en-KE') + '.',
                cta: 'Review each budget category and choose one to trim by 20% next month.',
            });
        } else if (ld.daySpend < winAvgDay * 0.88) {
            const pctBelow = Math.round(((winAvgDay - ld.daySpend) / winAvgDay) * 100);
            out.push({
                type: 'good', emoji: '\ud83d\udcc9',
                headline: 'Day-to-day spending ' + pctBelow + '% below your average',
                body: 'You spent KES ' + Math.round(ld.daySpend).toLocaleString('en-KE') + ' on variable categories, ' + pctBelow + '% below your ' + winLen + '-month average of KES ' + Math.round(winAvgDay).toLocaleString('en-KE') + '.',
                cta: 'Redirect the difference into your lowest-funded goal.',
            });
        }
    }

    // 7. Emergency fund projection (cumulative from all months)
    const cumEFAll    = all.reduce((a, mo) => a + (mo.emergencyFund || 0), 0);
    const efRemaining = 1350000 - cumEFAll;
    const efAlloc     = latest.emergencyFund || 0;
    if (efRemaining > 0 && efAlloc > 0) {
        const mos = Math.ceil(efRemaining / efAlloc);
        if (ld.dti > 28) {
            out.push({
                type: 'warn', emoji: '\ud83d\udee1\ufe0f',
                headline: 'Emergency fund: ~' + mos + ' months to goal',
                body: 'At KES ' + Math.round(efAlloc).toLocaleString('en-KE') + '/month you will hit your KES 1,350,000 goal in ~' + mos + ' months. Your high debt payments (' + Math.round(ld.dti) + '% DTI) are slowing this down.',
                cta: 'Paying off debt faster frees up cash for your emergency fund. Target your highest-rate debt first.',
            });
        } else {
            out.push({
                type: 'info', emoji: '\ud83d\udee1\ufe0f',
                headline: 'Emergency fund: ~' + mos + ' months to goal',
                body: 'You have KES ' + Math.round(cumEFAll).toLocaleString('en-KE') + ' saved toward your KES 1,350,000 goal. At KES ' + Math.round(efAlloc).toLocaleString('en-KE') + '/month you will reach it in ~' + mos + ' months.',
                cta: 'Stay consistent. A small top-up this month shortens the timeline.',
            });
        }
    }

    // 8. One-time costs > 10% of income
    if (ld.inc > 0 && ld.ooTotal > ld.inc * 0.1) {
        const pct = Math.round((ld.ooTotal / ld.inc) * 100);
        out.push({
            type: 'warn', emoji: '\ud83d\udcb0',
            headline: 'One-time costs are ' + pct + '% of income this month',
            body: 'You spent KES ' + Math.round(ld.ooTotal).toLocaleString('en-KE') + ' on one-off expenses (' + pct + '% of income). Large one-offs can derail your savings plan.',
            cta: 'If these were unavoidable, plan to offset them by reducing discretionary spending next month.',
        });
    }

    // Sort: danger → warn → info → good
    const SEV_ORDER: Record<InsightSev, number> = { danger: 0, warn: 1, info: 2, good: 3 };
    out.sort((a, b) => SEV_ORDER[a.type] - SEV_ORDER[b.type]);
    return out;
}

export default function GoalDashboard() {
    const [data, setData] = useState<AppData | null>(null);
    const [week, setWeek] = useState<WeekData | null>(null);
    const [month, setMonth] = useState<MonthlyData | null>(null);
    const [allMonths, setAllMonths] = useState<MonthlyData[]>([]);
    const [range, setRange] = useState('3m');
    const [selIdx, setSelIdx] = useState(0);
    const [hoveredBar, setHoveredBar] = useState<number | null>(null);
    const [expandedInsight, setExpandedInsight] = useState<number | null>(null);
    const [showAllInsights, setShowAllInsights] = useState(false);
    const [showSnapshotTip, setShowSnapshotTip] = useState(false);

    useEffect(() => {
        const fetchData = () => {
            const loaded = loadData();
            setData(loaded);
            setWeek(getWeek(loaded));
            setMonth(getMonth(loaded));
            const sorted = Object.values(loaded.months).sort((a, b) => a.month.localeCompare(b.month));
            setAllMonths(sorted);
        };

        fetchData();
        window.addEventListener('storage-update', fetchData);
        return () => window.removeEventListener('storage-update', fetchData);
    }, []);

    // Reset selected month to latest whenever the range changes
    useEffect(() => {
        const ms = applyRange(allMonths, range);
        setSelIdx(ms.length > 0 ? ms.length - 1 : 0);
    }, [range]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!week || !month) return null;

    // ── Filter-window computed values ─────────────────────────────────────────
    const months     = applyRange(allMonths, range);
    const idx        = Math.min(selIdx, months.length - 1);
    const m          = months.length > 0 ? months[idx] : null;
    const d          = m ? derive(m) : null;
    const avgSavRate = months.reduce((a, mo) => a + derive(mo).savRate,   0) / (months.length || 1);
    const avgDaySpend= months.reduce((a, mo) => a + derive(mo).daySpend,  0) / (months.length || 1);
    const avgFixed   = months.reduce((a, mo) => a + derive(mo).fixed,     0) / (months.length || 1);
    const avgTotal   = months.reduce((a, mo) => a + derive(mo).totalOut,  0) / (months.length || 1);

    // ── All-time cumulative goal totals ───────────────────────────────────────
    let cumEF = 0, cumCar = 0, cumTravel = 0;
    allMonths.forEach(mo => {
        cumEF     += mo.emergencyFund ?? 0;
        cumCar    += mo.carFund ?? 0;
        cumTravel += mo.travelFund ?? 0;
    });


    const TARGET_ACTIONS = 4;
    const FINANCE_GOAL = 1350000;

    const NO_JOB = JOB_PROGRESS_OPTIONS[JOB_PROGRESS_OPTIONS.length - 1];
    const NO_DECISION = DECISION_OPTIONS[DECISION_OPTIONS.length - 1];
    const NO_FRONTEND = FRONTEND_OPTIONS[FRONTEND_OPTIONS.length - 1];

    const jobCount = countValidOptions(week.strategy?.leverage || [], NO_JOB);
    const decisionCount = countValidOptions(week.strategy?.decision || [], NO_DECISION);
    const frontendCount = countValidOptions(week.strategy?.frontend || [], NO_FRONTEND);
    const totalActions = jobCount + decisionCount + frontendCount;

    const leveragePercentage = calculateProgress(totalActions, TARGET_ACTIONS);
    const healthProgress = calculateProgress(week.muayThaiSessions || 0, 2);
    const financeProgress = calculateProgress(month.emergencyFund, FINANCE_GOAL);

    const leverageState = getLeverageState(totalActions);
    const healthState = getHealthState(week.muayThaiSessions || 0);
    const wealthState = getWealthState(month.emergencyFund || 0);

    return (
        <div style={{ background: '#FAFAF8', fontFamily: "'DM Sans', sans-serif" }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');`}</style>

            {/* ── Sticky header ──────────────────────────────────────────────── */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: '#FAFAF8',
                borderBottom: '1.5px solid #E2E8F0',
                paddingBottom: 12,
            }}>
                {/* Row 1: title + range buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px 12px' }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1E293B', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                        Finance Overview
                    </h1>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {RANGES.map(r => (
                            <button
                                key={r.key}
                                onClick={() => setRange(r.key)}
                                style={{
                                    padding: '6px 12px',
                                    background: range === r.key ? '#1E293B' : 'transparent',
                                    color: range === r.key ? '#FFFFFF' : '#64748B',
                                    border: '1.5px solid ' + (range === r.key ? '#1E293B' : '#E2E8F0'),
                                    borderRadius: 8,
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontFamily: "'DM Sans', sans-serif",
                                    transition: 'all 0.15s',
                                }}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Row 2: month pills */}
                {months.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, padding: '0 24px', flexWrap: 'wrap' }}>
                        {months.map((mo, i) => {
                            const parts = mo.month.split('-');
                            const label = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1)
                                .toLocaleDateString('en-US', { month: 'short' }) + ' ' + parts[0].slice(2);
                            const isSelected = i === idx;
                            return (
                                <button
                                    key={mo.month}
                                    onClick={() => setSelIdx(i)}
                                    style={{
                                        padding: '4px 12px',
                                        background: isSelected ? '#1E293B' : '#FFFFFF',
                                        color: isSelected ? '#FFFFFF' : '#64748B',
                                        border: '1.5px solid ' + (isSelected ? '#1E293B' : '#E2E8F0'),
                                        borderRadius: 99,
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontFamily: "'DM Sans', sans-serif",
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Insights card ──────────────────────────────────────────────── */}
            {(() => {
                const insights = getInsights(months, allMonths);
                if (insights.length === 0) return null;
                const SEV_COLOR: Record<InsightSev, string> = { danger: '#EF4444', warn: '#F59E0B', info: '#3B82F6', good: '#10B981' };
                const SEV_BG:    Record<InsightSev, string> = { danger: '#FEF2F2', warn: '#FFFBEB', info: '#EFF6FF', good: '#F0FDF4' };
                const dangerCount = insights.filter(ins => ins.type === 'danger').length;
                const warnCount   = insights.filter(ins => ins.type === 'warn').length;
                const infoCount   = insights.filter(ins => ins.type === 'info').length;
                const goodCount   = insights.filter(ins => ins.type === 'good').length;
                const visible     = showAllInsights ? insights : insights.slice(0, 4);
                const remaining   = insights.length - 4;

                return (
                    <div style={{ padding: '24px 24px 0' }}>
                        <div style={{ background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 16, padding: '20px' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <p style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
                                    What to know
                                </p>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    {dangerCount > 0 && (
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#EF4444', background: '#FEF2F2', borderRadius: 99, padding: '2px 8px', fontFamily: "'DM Sans', sans-serif" }}>
                                            {dangerCount + ' critical'}
                                        </span>
                                    )}
                                    {warnCount > 0 && (
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#F59E0B', background: '#FFFBEB', borderRadius: 99, padding: '2px 8px', fontFamily: "'DM Sans', sans-serif" }}>
                                            {warnCount + ' warning'}
                                        </span>
                                    )}
                                    {infoCount > 0 && (
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3B82F6', background: '#EFF6FF', borderRadius: 99, padding: '2px 8px', fontFamily: "'DM Sans', sans-serif" }}>
                                            {infoCount + ' tip'}
                                        </span>
                                    )}
                                    {goodCount > 0 && (
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10B981', background: '#F0FDF4', borderRadius: 99, padding: '2px 8px', fontFamily: "'DM Sans', sans-serif" }}>
                                            {goodCount + ' win'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Rows */}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {visible.map((ins, i) => {
                                    const isExpanded = expandedInsight === i;
                                    return (
                                        <div key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid #F1F5F9' }}>
                                            <button
                                                onClick={() => setExpandedInsight(isExpanded ? null : i)}
                                                style={{
                                                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    padding: '12px 0', textAlign: 'left',
                                                }}
                                            >
                                                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{ins.emoji}</span>
                                                <span style={{
                                                    fontSize: '0.68rem', fontWeight: 700,
                                                    color: SEV_COLOR[ins.type], background: SEV_BG[ins.type],
                                                    borderRadius: 99, padding: '2px 7px', flexShrink: 0,
                                                    fontFamily: "'DM Sans', sans-serif",
                                                }}>
                                                    {ins.type}
                                                </span>
                                                <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: '#1E293B', fontFamily: "'DM Sans', sans-serif" }}>
                                                    {ins.headline}
                                                </span>
                                                <span style={{
                                                    color: '#94A3B8', fontSize: '1rem', flexShrink: 0,
                                                    display: 'inline-block',
                                                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                                                    transition: 'transform 0.15s',
                                                }}>
                                                    {'\u203a'}
                                                </span>
                                            </button>

                                            {isExpanded && (
                                                <div style={{ paddingBottom: 14 }}>
                                                    <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.65, marginBottom: 12, fontFamily: "'Lora', serif" }}>
                                                        {ins.body}
                                                    </p>
                                                    <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '10px 14px' }}>
                                                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>
                                                            Do this
                                                        </p>
                                                        <p style={{ fontSize: '0.8rem', color: '#1E293B', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                                                            {ins.cta + ' \u2192'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Show more / less toggle */}
                            {insights.length > 4 && (
                                <button
                                    onClick={() => setShowAllInsights(!showAllInsights)}
                                    style={{
                                        width: '100%', marginTop: 8, padding: '8px 0',
                                        background: 'none', border: 'none', borderTop: '1px solid #F1F5F9',
                                        cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                                        color: '#64748B', fontFamily: "'DM Sans', sans-serif",
                                    }}
                                >
                                    {showAllInsights ? 'Show less' : ('Show ' + remaining + ' more')}
                                </button>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* ── A. Snapshot stats ──────────────────────────────────────────── */}
            <div style={{ padding: '24px 24px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                        Snapshot
                    </p>
                    <div
                        style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
                        onMouseEnter={() => setShowSnapshotTip(true)}
                        onMouseLeave={() => setShowSnapshotTip(false)}
                    >
                        <span style={{ fontSize: '0.7rem', color: '#CBD5E1', cursor: 'default', userSelect: 'none', lineHeight: 1 }}>
                            {'\u24d8'}
                        </span>
                        {showSnapshotTip && (
                            <div style={{
                                position: 'absolute',
                                bottom: 'calc(100% + 6px)',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#1E293B',
                                color: '#F8FAFC',
                                borderRadius: 10,
                                padding: '10px 12px',
                                fontSize: '0.73rem',
                                lineHeight: 1.55,
                                width: 240,
                                zIndex: 30,
                                fontFamily: "'DM Sans', sans-serif",
                                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                                pointerEvents: 'none',
                                fontWeight: 400,
                                textTransform: 'none',
                                letterSpacing: 0,
                            }}>
                                These numbers are averaged across the selected time period. Switch the filter above to see how your spending and savings have changed over different windows.
                            </div>
                        )}
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>

                    {/* 1. Total spent / month */}
                    <div style={{ background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 16, padding: '18px 20px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>Total spent / month</p>
                        <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1E293B', marginBottom: 4, fontFamily: "'Lora', serif" }}>
                            {'KES ' + Math.round(avgTotal).toLocaleString('en-KE')}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#94A3B8', fontFamily: "'DM Sans', sans-serif" }}>averaged across period</p>
                    </div>

                    {/* 2. Savings rate */}
                    {(() => {
                        const savColor = avgSavRate >= 20 ? '#10B981' : avgSavRate >= 10 ? '#F59E0B' : '#EF4444';
                        const savLabel = avgSavRate >= 20 ? 'Great rate' : avgSavRate >= 10 ? 'On track' : 'Below target';
                        return (
                            <div style={{ background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 16, padding: '18px 20px' }}>
                                <p style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>Savings rate</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: savColor, marginBottom: 4, fontFamily: "'Lora', serif" }}>
                                    {Math.round(avgSavRate) + '%'}
                                </p>
                                <p style={{ fontSize: '0.75rem', color: savColor, fontFamily: "'DM Sans', sans-serif" }}>{savLabel}</p>
                            </div>
                        );
                    })()}

                    {/* 3. Unallocated - latest */}
                    {(() => {
                        const lColor = d ? (d.leftover >= 0 ? '#10B981' : '#EF4444') : '#94A3B8';
                        const lVal   = d ? (d.leftover < 0 ? '-KES ' : 'KES ') + Math.round(Math.abs(d.leftover)).toLocaleString('en-KE') : '--';
                        const lSub   = d ? (d.leftover >= 0 ? 'surplus' : 'over budget') : '';
                        return (
                            <div style={{ background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 16, padding: '18px 20px' }}>
                                <p style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>{'Unallocated \u00b7 latest'}</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: lColor, marginBottom: 4, fontFamily: "'Lora', serif" }}>{lVal}</p>
                                <p style={{ fontSize: '0.75rem', color: lColor, fontFamily: "'DM Sans', sans-serif" }}>{lSub}</p>
                            </div>
                        );
                    })()}

                    {/* 4. Bills & rent / month */}
                    <div style={{ background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 16, padding: '18px 20px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>Bills and rent / month</p>
                        <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1E293B', marginBottom: 4, fontFamily: "'Lora', serif" }}>
                            {'KES ' + Math.round(avgFixed).toLocaleString('en-KE')}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#94A3B8', fontFamily: "'DM Sans', sans-serif" }}>averaged across period</p>
                    </div>

                    {/* 5. Day-to-day spending */}
                    <div style={{ background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 16, padding: '18px 20px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>Day-to-day spending</p>
                        <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1E293B', marginBottom: 4, fontFamily: "'Lora', serif" }}>
                            {'KES ' + Math.round(avgDaySpend).toLocaleString('en-KE')}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#94A3B8', fontFamily: "'DM Sans', sans-serif" }}>avg from tracked categories</p>
                    </div>

                    {/* 6. Debt repayments - latest */}
                    {(() => {
                        const debtColor = d ? (d.dti >= 36 ? '#EF4444' : d.dti >= 28 ? '#F59E0B' : d.dti > 0 ? '#10B981' : '#94A3B8') : '#94A3B8';
                        const debtSub   = d && d.dti > 0 ? Math.round(d.dti) + '% DTI' : 'No debt';
                        const debtVal   = d ? 'KES ' + Math.round(d.debtPmt).toLocaleString('en-KE') : '--';
                        return (
                            <div style={{ background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 16, padding: '18px 20px' }}>
                                <p style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>{'Debt repayments \u00b7 latest'}</p>
                                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: debtColor, marginBottom: 4, fontFamily: "'Lora', serif" }}>{debtVal}</p>
                                <p style={{ fontSize: '0.75rem', color: debtColor, fontFamily: "'DM Sans', sans-serif" }}>{debtSub}</p>
                            </div>
                        );
                    })()}

                </div>
            </div>

            {/* ── B. Stacked spending chart ───────────────────────────────────── */}
            {months.length > 0 && (() => {
                const SEGS = [
                    { key: 'fixed',    label: 'Bills & rent',    color: '#94A3B8' },
                    { key: 'debtPmt',  label: 'Debt repayments', color: '#F87171' },
                    { key: 'daySpend', label: 'Day-to-day',      color: '#FCD34D' },
                    { key: 'savings',  label: 'Savings',         color: '#34D399' },
                    { key: 'ooTotal',  label: 'One-time costs',  color: '#C084FC' },
                ];
                const derived  = months.map(mo => derive(mo));
                const maxTotal = Math.max(...derived.map(dv => dv.totalOut), 1);
                const BAR_H    = 160;

                return (
                    <div style={{ padding: '0 24px 24px' }}>
                        <div style={{ background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 16, padding: '20px 20px 16px', overflowX: 'auto' }}>
                            <p style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>
                                Monthly spending
                            </p>

                            {/* Legend */}
                            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
                                {SEGS.map(s => (
                                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.72rem', color: '#64748B', fontFamily: "'DM Sans', sans-serif" }}>{s.label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Bars */}
                            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: 12 }}>
                                {months.map((mo, i) => {
                                    const dv       = derived[i];
                                    const barH     = Math.max(Math.round((dv.totalOut / maxTotal) * BAR_H), 2);
                                    const isSelected = i === idx;
                                    const isHovered  = hoveredBar === i;
                                    const parts    = mo.month.split('-');
                                    const shortLbl = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1)
                                        .toLocaleDateString('en-US', { month: 'short' }) + ' ' + parts[0].slice(2);

                                    return (
                                        <div
                                            key={mo.month}
                                            style={{ width: 48, minWidth: 48, maxWidth: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
                                            onMouseEnter={() => setHoveredBar(i)}
                                            onMouseLeave={() => setHoveredBar(null)}
                                            onClick={() => setSelIdx(i)}
                                        >
                                            {/* Tooltip */}
                                            {isHovered && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: (barH + 28) + 'px',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    background: '#1E293B',
                                                    color: '#F8FAFC',
                                                    borderRadius: 10,
                                                    padding: '10px 12px',
                                                    fontSize: '0.73rem',
                                                    whiteSpace: 'nowrap',
                                                    zIndex: 20,
                                                    fontFamily: "'DM Sans', sans-serif",
                                                    lineHeight: 1.7,
                                                    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                                                    pointerEvents: 'none',
                                                }}>
                                                    {SEGS.map(s => (
                                                        <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                                                            <span style={{ color: '#94A3B8' }}>{s.label}</span>
                                                            <span style={{ fontWeight: 700 }}>{'KES ' + Math.round((dv as any)[s.key]).toLocaleString('en-KE')}</span>
                                                        </div>
                                                    ))}
                                                    <div style={{ borderTop: '1px solid #334155', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                                                        <span style={{ color: '#94A3B8' }}>Total</span>
                                                        <span style={{ fontWeight: 700 }}>{'KES ' + Math.round(dv.totalOut).toLocaleString('en-KE')}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Stacked bar */}
                                            <div style={{
                                                width: '100%',
                                                height: barH + 'px',
                                                display: 'flex',
                                                flexDirection: 'column-reverse',
                                                borderRadius: '6px 6px 0 0',
                                                overflow: 'hidden',
                                                outline: isSelected ? '2px solid #1E293B' : 'none',
                                                outlineOffset: 1,
                                                cursor: 'pointer',
                                                opacity: isHovered ? 0.85 : 1,
                                                transition: 'opacity 0.15s',
                                            }}>
                                                {SEGS.map(s => {
                                                    const segH = dv.totalOut > 0 ? Math.round(((dv as any)[s.key] / dv.totalOut) * barH) : 0;
                                                    return segH > 0 ? (
                                                        <div key={s.key} style={{ width: '100%', height: segH + 'px', background: s.color, flexShrink: 0 }} />
                                                    ) : null;
                                                })}
                                            </div>

                                            {/* Month label */}
                                            <p style={{
                                                fontSize: '0.65rem',
                                                color: isSelected ? '#1E293B' : '#94A3B8',
                                                marginTop: 5,
                                                fontWeight: isSelected ? 700 : 400,
                                                fontFamily: "'DM Sans', sans-serif",
                                                textAlign: 'center',
                                            }}>
                                                {shortLbl}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── C. Day-to-day spending breakdown ───────────────────────────── */}
            {m && (() => {
                const budgets = m.budgets || [];
                if (budgets.length === 0) return null;
                const fmt = (n: number) => 'KES ' + Math.round(n).toLocaleString('en-KE');

                return (
                    <div style={{ padding: '0 24px 24px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>
                            Day-to-day spending
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: 14, fontFamily: "'DM Sans', sans-serif" }}>
                            From the categories you track in the finance tracker each month.
                        </p>
                        <div style={{ background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
                            {budgets.map((b, bi) => {
                                const spent    = b.items.reduce((s, it) => s + it.amount, 0);
                                const pct      = b.limit > 0 ? (spent / b.limit) * 100 : 0;
                                const barColor = pct > 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#10B981';
                                const isOver   = b.limit > 0 && spent > b.limit;

                                return (
                                    <div key={b.id} style={{ padding: '16px 20px', borderTop: bi === 0 ? 'none' : '1px solid #F1F5F9' }}>
                                        {/* Name + amounts + badge */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B', fontFamily: "'DM Sans', sans-serif" }}>
                                                    {b.category || 'Unnamed'}
                                                </span>
                                                {isOver && (
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#EF4444', background: '#FEF2F2', borderRadius: 99, padding: '2px 7px', fontFamily: "'DM Sans', sans-serif" }}>
                                                        OVER
                                                    </span>
                                                )}
                                            </div>
                                            <span style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: "'Lora', serif" }}>
                                                {fmt(spent) + (b.limit > 0 ? ' / ' + fmt(b.limit) : '')}
                                            </span>
                                        </div>

                                        {/* Progress bar */}
                                        {b.limit > 0 && (
                                            <div style={{ height: 6, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: Math.min(pct, 100) + '%',
                                                    background: barColor,
                                                    borderRadius: 99,
                                                    transition: 'width 0.3s ease',
                                                }} />
                                            </div>
                                        )}

                                        {/* Line item chips */}
                                        {b.items.length > 0 && (
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                {b.items.map(it => (
                                                    <span key={it.id} style={{
                                                        fontSize: '0.7rem', color: '#475569',
                                                        background: '#F8FAFC', border: '1px solid #E2E8F0',
                                                        borderRadius: 99, padding: '3px 9px',
                                                        fontFamily: "'DM Sans', sans-serif",
                                                    }}>
                                                        {it.label + ' \u00b7 ' + fmt(it.amount)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* ── Divider: filter-controlled / all-time ──────────────────────── */}
            <div style={{ padding: '0 24px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                <span style={{
                    fontSize: '0.7rem', fontWeight: 600, color: '#94A3B8',
                    background: '#FAFAF8', border: '1.5px solid #E2E8F0',
                    borderRadius: 99, padding: '4px 14px',
                    fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
                }}>
                    Not affected by the filter
                </span>
                <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            </div>

            {/* ── D. Savings goals (all-time) ────────────────────────────────── */}
            {(() => {
                const fmtKES = (n: number) => 'KES ' + Math.round(n).toLocaleString('en-KE');
                const fmtUSD = (n: number) => '$' + Math.round(n).toLocaleString('en-KE');
                const GOALS = [
                    { label: 'Emergency Fund', saved: cumEF,     goal: 1350000, rate: m ? (m.emergencyFund ?? 0) : 0, color: '#10B981', fmt: fmtKES, goalStr: 'KES 1,350,000' },
                    { label: 'Car Fund',        saved: cumCar,    goal: 1500000, rate: m ? (m.carFund ?? 0)        : 0, color: '#3B82F6', fmt: fmtKES, goalStr: 'KES 1,500,000' },
                    { label: 'Travel Buffer',   saved: cumTravel, goal: 1500,    rate: m ? (m.travelFund ?? 0)     : 0, color: '#8B5CF6', fmt: fmtUSD, goalStr: '$1,500'         },
                ];

                return (
                    <div style={{ padding: '0 24px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
                            <p style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
                                Savings goals
                            </p>
                            <p style={{ fontSize: '0.7rem', color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
                                total saved, all time
                            </p>
                        </div>
                        <div style={{ background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
                            {GOALS.map((g, gi) => {
                                const pct     = Math.min((g.saved / g.goal) * 100, 100);
                                const reached = g.saved >= g.goal;
                                const mosLeft = !reached && g.rate > 0 ? Math.ceil((g.goal - g.saved) / g.rate) : null;
                                return (
                                    <div key={g.label} style={{ padding: '16px 20px', borderTop: gi === 0 ? 'none' : '1px solid #F1F5F9' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B', fontFamily: "'DM Sans', sans-serif" }}>
                                                {g.label}
                                            </span>
                                            <span style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: "'Lora', serif" }}>
                                                {g.fmt(g.saved) + ' / ' + g.goalStr}
                                            </span>
                                        </div>
                                        <div style={{ height: 8, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                                            <div style={{ height: '100%', width: pct + '%', background: g.color, borderRadius: 99, transition: 'width 0.3s ease' }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontFamily: "'DM Sans', sans-serif" }}>
                                                {Math.round(pct) + '% of goal'}
                                            </span>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: reached ? g.color : '#94A3B8', fontFamily: "'DM Sans', sans-serif" }}>
                                                {reached ? 'Goal reached!' : (mosLeft !== null ? ('~' + mosLeft + ' months to go') : 'No contribution this month')}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* ── E. Debt repayments (selected month) ────────────────────────── */}
            {m && (() => {
                const debts = m.debts || [];
                if (debts.length === 0) return null;
                const fmt = (n: number) => 'KES ' + Math.round(n).toLocaleString('en-KE');

                return (
                    <div style={{ padding: '0 24px 24px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, fontFamily: "'DM Sans', sans-serif" }}>
                            Debt repayments
                        </p>
                        <div style={{ background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
                            {debts.map((debt, di) => {
                                const monthsLeft = debt.monthlyPayment > 0 ? Math.ceil(debt.balance / debt.monthlyPayment) : 0;
                                const barFill    = monthsLeft > 0 ? Math.max(0, 100 - (monthsLeft / 36) * 100) : 100;
                                const isHighRate = debt.interestRate > 20;

                                return (
                                    <div key={debt.id} style={{ padding: '16px 20px', borderTop: di === 0 ? 'none' : '1px solid #F1F5F9' }}>
                                        {/* Name + type + rate */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B', fontFamily: "'DM Sans', sans-serif" }}>
                                                {debt.label}
                                            </span>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#64748B', background: '#F1F5F9', borderRadius: 99, padding: '2px 7px', fontFamily: "'DM Sans', sans-serif" }}>
                                                {debt.type}
                                            </span>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: isHighRate ? '#EF4444' : '#64748B', background: isHighRate ? '#FEF2F2' : '#F1F5F9', borderRadius: 99, padding: '2px 7px', fontFamily: "'DM Sans', sans-serif" }}>
                                                {debt.interestRate + '% APR'}
                                            </span>
                                        </div>
                                        {/* Stats */}
                                        <div style={{ display: 'flex', gap: 24, marginBottom: 10 }}>
                                            <div>
                                                <p style={{ fontSize: '0.65rem', color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", marginBottom: 2 }}>Monthly payment</p>
                                                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E293B', fontFamily: "'Lora', serif" }}>{fmt(debt.monthlyPayment)}</p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '0.65rem', color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", marginBottom: 2 }}>Balance remaining</p>
                                                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E293B', fontFamily: "'Lora', serif" }}>{fmt(debt.balance)}</p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '0.65rem', color: '#94A3B8', fontFamily: "'DM Sans', sans-serif", marginBottom: 2 }}>Est. months left</p>
                                                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E293B', fontFamily: "'Lora', serif" }}>{monthsLeft > 0 ? ('~' + monthsLeft) : '--'}</p>
                                            </div>
                                        </div>
                                        {/* Progress bar */}
                                        <div style={{ height: 5, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden', marginBottom: isHighRate ? 8 : 0 }}>
                                            <div style={{ height: '100%', width: barFill + '%', background: '#F87171', borderRadius: 99, transition: 'width 0.3s ease' }} />
                                        </div>
                                        {/* High rate warning */}
                                        {isHighRate && (
                                            <p style={{ fontSize: '0.73rem', color: '#EF4444', fontFamily: "'DM Sans', sans-serif" }}>
                                                {'\u26a0\ufe0f High interest rate. Prioritise paying this off ahead of other debts.'}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* ── F. One-time costs (selected month) ─────────────────────────── */}
            {m && (() => {
                const oneOffs = m.oneOffs || [];
                if (oneOffs.length === 0) return null;
                const fmt   = (n: number) => 'KES ' + Math.round(n).toLocaleString('en-KE');
                const total = oneOffs.reduce((a, o) => a + o.amount, 0);

                return (
                    <div style={{ padding: '0 24px 24px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, fontFamily: "'DM Sans', sans-serif" }}>
                            One-time costs
                        </p>
                        <div style={{ background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
                            {oneOffs.map((o, oi) => (
                                <div key={o.id} style={{ padding: '12px 20px', borderTop: oi === 0 ? 'none' : '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.83rem', color: '#1E293B', fontFamily: "'DM Sans', sans-serif" }}>{o.label}</span>
                                    <span style={{ fontSize: '0.83rem', fontWeight: 600, color: '#1E293B', fontFamily: "'Lora', serif" }}>{fmt(o.amount)}</span>
                                </div>
                            ))}
                            <div style={{ padding: '12px 20px', borderTop: '1.5px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.83rem', fontWeight: 700, color: '#1E293B', fontFamily: "'DM Sans', sans-serif" }}>Total</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E293B', fontFamily: "'Lora', serif" }}>{fmt(total)}</span>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── Existing dashboard cards (unchanged) ───────────────────────── */}
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '24px' }}>
                {/* Leverage Card */}
                <DashboardCard title="Leverage">
                    <div style={{
                        height: '8px', width: '100%', background: 'var(--surface-highlight)',
                        borderRadius: '4px', overflow: 'hidden', marginTop: '8px'
                    }}>
                        <div style={{
                            height: '100%', width: `${leveragePercentage}%`,
                            background: leverageState.color,
                            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '6px' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            {totalActions} / {TARGET_ACTIONS} Actions
                        </p>
                        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: leverageState.color }}>
                            {leverageState.label}
                        </p>
                    </div>
                </DashboardCard>

                {/* Health Card */}
                <DashboardCard title="Health">
                    <CircularProgress percentage={healthProgress} color={healthState.color} />
                    <div style={{ marginTop: '6px', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: healthState.color, marginBottom: '2px' }}>
                            {healthState.label}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            {week.muayThaiSessions} / 2 Sessions
                        </p>
                    </div>
                </DashboardCard>

                {/* Finance Card */}
                <DashboardCard title="Wealth">
                    <CircularProgress percentage={financeProgress} color={wealthState.color} />
                    <div style={{ marginTop: '6px', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: wealthState.color, marginBottom: '2px' }}>
                            {wealthState.label}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            {Math.round(financeProgress)}% of Goal
                        </p>
                    </div>
                </DashboardCard>
            </div>
        </div>
    );
}

function DashboardCard({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="glass-panel" style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{title}</h3>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {children}
            </div>
        </div>
    );
}

function CircularProgress({ percentage, color }: { percentage: number, color: string }) {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div style={{ position: 'relative', width: '40px', height: '40px' }}>
            <svg height="40" width="40" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                    stroke="var(--surface-highlight)"
                    strokeWidth="4"
                    fill="transparent"
                    r={radius}
                    cx="20"
                    cy="20"
                />
                <circle
                    stroke={color}
                    strokeWidth="4"
                    fill="transparent"
                    r={radius}
                    cx="20"
                    cy="20"
                    style={{
                        strokeDasharray: circumference,
                        strokeDashoffset,
                        transition: 'stroke-dashoffset 0.5s ease'
                    }}
                />
            </svg>
        </div>
    );
}
