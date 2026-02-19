"use client";

import { useState } from 'react';
import { WeekData, JobProgressOption, DecisionOption, FrontendOption } from '@/lib/types';
import { JOB_PROGRESS_OPTIONS, FRONTEND_OPTIONS, DECISION_OPTIONS } from '@/lib/constants';
import { useWeekStorage } from '@/lib/hooks/useWeekStorage';
import PillGroup from '@/components/PillGroup';
import CardSelect from './CardSelect'


const DEFAULT_STRATEGY = {
    leverage: [] as JobProgressOption[],
    decision: [] as DecisionOption[],
    frontend: [] as FrontendOption[],
    energy: 0
};

// Helper to format week display as range
function formatWeekDisplay(weekId: string): string {
    const date = new Date(weekId);

    // Get the Monday of this week
    const dayOfWeek = date.getDay();
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust when day is Sunday
    const monday = new Date(date.setDate(diff));

    // Get the Sunday (6 days after Monday)
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatOptions: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric'
    };

    const mondayStr = monday.toLocaleDateString('en-US', formatOptions);
    const sundayStr = sunday.toLocaleDateString('en-US', formatOptions);
    const year = sunday.getFullYear();

    return `${mondayStr} to ${sundayStr}, ${year}`;
}

export default function CurrentWeek() {
    const { week, updateWeek } = useWeekStorage();

    if (!week) {
        return (
            <div className="p-8 text-center text-gray-500">
                Loading review…
            </div>
        );
    }

    const strategy = week.strategy || DEFAULT_STRATEGY;

    const handleMultiSelect = (
        field: 'leverage' | 'frontend' | 'decision',
        val: any
    ) => {
        updateWeek({
            strategy: {
                ...strategy,
                [field]: val
            }
        });
    };

    const handleEnergyUpdate = (value: number) => {
        updateWeek({
            strategy: {
                ...strategy,
                energy: value
            }
        });
    };

    const getStatus = () => {
        const energyStandardMet = strategy.energy >= 2;
        const hasJobProgress = strategy.leverage.length > 0 && !strategy.leverage.includes("No progress this week" as any);
        const hasFrontendOutput = strategy.frontend.length > 0 && !strategy.frontend.includes("No frontend work" as any);

        if (!energyStandardMet) return "Do better";
        if (!hasJobProgress || !hasFrontendOutput) return "Partial progress";
        return "On track";
    };

    const status = getStatus();

    const handleSave = () => {
        updateWeek({ submitted: true });
        window.location.href = '/?submitted=weekly&status=' + status;
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '120px' }}>
            <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#111827' }}>
                    Weekly Review
                </h2>
                <p style={{ color: '#6B7280', marginTop: '4px' }}>
                    Log outcomes. Clear the board.
                </p>

                {/* Week Date Display */}
                <div style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    background: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB'
                }}>
                    <div style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#9CA3AF',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '4px'
                    }}>
                        Week that just ended
                    </div>
                    <div style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: '#111827'
                    }}>
                        {formatWeekDisplay(week.id)}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* Second Job Progress */}
                <div className="glass-panel" style={{ padding: '32px' }}>
                    <h3 className="text-label" style={{ marginBottom: '20px' }}>Second Job Progress</h3>
                    <PillGroup
                        options={JOB_PROGRESS_OPTIONS}
                        value={strategy.leverage}
                        onChange={(val) => handleMultiSelect('leverage', val)}
                        multiSelect={true}
                        colorScheme="purple"
                    />
                </div>

                {/* Decision Ownership */}
                <div className="glass-panel" style={{ padding: '32px' }}>
                    <h3 className="text-label" style={{ marginBottom: '20px' }}>Decision Ownership</h3>
                    <PillGroup
                        options={DECISION_OPTIONS}
                        value={strategy.decision}
                        onChange={(val) => handleMultiSelect('decision', val)}
                        multiSelect={true}
                        colorScheme="blue"
                    />
                </div>

                {/* Frontend Output */}
                <div className="glass-panel" style={{ padding: '32px' }}>
                    <h3 className="text-label" style={{ marginBottom: '20px' }}>Frontend Output</h3>
                    <PillGroup
                        options={FRONTEND_OPTIONS}
                        value={strategy.frontend}
                        onChange={(val) => handleMultiSelect('frontend', val)}
                        multiSelect={true}
                        colorScheme="green"
                    />
                </div>

                {/* Training */}
                <div className="glass-panel" style={{ padding: '32px' }}>
                    <h3 className="text-label" style={{ marginBottom: '20px' }}>Training (Muay Thai)</h3>

                    <CardSelect
                        options={[
                            { value: 1, label: '1 Session', emoji: '👊' },
                            { value: 2, label: '2 Sessions', emoji: '🔥' }
                        ]}
                        value={strategy.energy}
                        onChange={(val) => {
                            // If clicking the same card, deselect it (set to 0)
                            if (strategy.energy === val) {
                                handleEnergyUpdate(0);
                            } else {
                                handleEnergyUpdate(Number(val));
                            }
                        }}
                    />
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    style={{
                        width: '100%',
                        padding: '24px',
                        borderRadius: '999px',
                        background: '#111827',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        border: 'none',
                        transition: 'all 0.2s ease',
                        marginTop: '20px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    Save Weekly Review
                </button>
            </div>
        </div>
    );
}