"use client";

import { useEffect, useState } from 'react';
import { AppData, WeekData, MonthlyData } from '@/lib/types';
import { loadData, getWeek, getMonth } from '@/lib/storage';
import { JOB_PROGRESS_OPTIONS, DECISION_OPTIONS, FRONTEND_OPTIONS } from '@/lib/constants';
import { getLeverageState, getHealthState, getWealthState } from '@/lib/statusCalculators';
import { calculateProgress, countValidOptions } from '@/lib/utils';

export default function GoalDashboard() {
    const [data, setData] = useState<AppData | null>(null);
    const [week, setWeek] = useState<WeekData | null>(null);
    const [month, setMonth] = useState<MonthlyData | null>(null);

    useEffect(() => {
        const fetchData = () => {
            const loaded = loadData();
            setData(loaded);
            setWeek(getWeek(loaded));
            setMonth(getMonth(loaded));
        };

        fetchData();
        window.addEventListener('storage-update', fetchData);
        return () => window.removeEventListener('storage-update', fetchData);
    }, []);

    if (!week || !month) return null;

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '24px' }}>
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
