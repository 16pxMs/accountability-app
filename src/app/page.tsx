"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from "next/navigation";
import { AppData, WeekData } from '@/lib/types';
import { loadData, getTotalEmergencyFund, getTotalCarFund } from '@/lib/storage';
import { monthsRemaining } from '@/lib/utils';

// --- Types ---
const DEFAULT_STATS = {
  wealth: {
    emergency: 0,
    emergencyPct: 0,
    car: 0,
    carPct: 0,
    travel: 0,
    travelPct: 0,
    projectedTotal: 0,
    // Allocation strings for "months left"
    emergencyRemaining: '—',
    carRemaining: '—',
    travelRemaining: '—'
  }
};

const LIFESTYLE_LOCK_THRESHOLD = 400000;
const EMERGENCY_GOAL = 1350000;
const CAR_GOAL = 1500000;
const TRAVEL_GOAL = 1500;

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const showSuccess = !!searchParams.get('submitted');

  const [stats, setStats] = useState<any>(DEFAULT_STATS);
  const [history, setHistory] = useState<WeekData[]>([]);
  const [currentWeek, setCurrentWeek] = useState<WeekData | null>(null);
  const [data, setData] = useState<AppData | null>(null);

  const handleCloseSuccess = () => {
    router.replace('/');
  };

  useEffect(() => {
    const loadDataAndUpdate = () => {
      const loadedData = loadData();
      setData(loadedData);

      if (loadedData && loadedData.weeks) {
        const computed = calculateStats(loadedData);
        setStats(computed);

        const weeksList = Object.values(loadedData.weeks)
          .sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime());

        setHistory(weeksList.filter(w => w.submitted));

        const latest = weeksList[0];
        if (latest) {
          // Normalize strategy for display
          if (!latest.strategy) {
            // @ts-ignore - defaults for legacy
            latest.strategy = { leverage: [], decision: [], frontend: [], energy: 0 };
          }
          setCurrentWeek(latest);
        }
      }
    };

    // Load data on mount
    loadDataAndUpdate();

    // Listen for storage updates
    window.addEventListener('storage-update', loadDataAndUpdate);

    // Also reload when coming back from another page
    const handleFocus = () => {
      loadDataAndUpdate();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage-update', loadDataAndUpdate);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Check if there's any submitted data (weekly or monthly)
  const hasSubmittedMonths = data?.months
    ? Object.values(data.months).some((m: any) => m.submitted)
    : false;

  const isEmpty = history.length === 0 && !currentWeek && !hasSubmittedMonths;
  const isLifestyleLocked = stats.wealth.projectedTotal < LIFESTYLE_LOCK_THRESHOLD;

  // Formatting helper
  const fmt = (n: number) => Math.round(n).toLocaleString('en-KE');

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px 120px 24px' }}>

      {/* Header */}
      <header style={{ marginBottom: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 800,
            marginBottom: '8px',
            color: '#111827',
            letterSpacing: '-0.02em',
            marginTop: '20px'
          }}>
            Dashboard v1.0
          </h1>
          <p style={{
            color: '#6B7280',
            fontSize: '1.1rem',
            maxWidth: '500px',
            fontWeight: 400,
            lineHeight: '1.6'
          }}>
            Track your progress across leverage, health, and wealth. Review weekly outcomes and maintain your standards.
          </p>
        </div>
        <Link href="/review">
          <button className="glass-panel" style={{
            padding: '14px 28px', borderRadius: '999px',
            background: 'white',
            color: '#111827',
            border: '1px solid rgba(0,0,0,0.05)',
            fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}>
            Start weekly review
          </button>
        </Link>
      </header>

      {isEmpty ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827' }}>Offline</h2>
          <p style={{ color: '#6B7280', marginTop: '8px' }}>Start a review to bring the monitor online.</p>
        </div>
      ) : (
        <>
          {/* Strategy Pulse (This Week) - NEW CARDS */}
          {currentWeek && currentWeek.strategy && (
            <div style={{ marginBottom: '60px' }}>
              <h3 className="text-label" style={{ color: '#9CA3AF', marginBottom: '24px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                This Week
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>

                {/* 1. Hiring Momentum */}
                <div className="glass-panel" style={{ padding: '24px', minHeight: '160px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ color: '#9CA3AF', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Hiring Momentum
                    </span>
                    {/* Micro-cue dot */}
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: (currentWeek.strategy.leverage && currentWeek.strategy.leverage.length > 0 && !currentWeek.strategy.leverage.includes("No progress this week" as any)) ? '#10B981' : '#E5E7EB'
                    }} />
                  </div>

                  <div style={{ marginTop: 'auto' }}>
                    {(() => {
                      const leverageList = Array.isArray(currentWeek.strategy.leverage)
                        ? currentWeek.strategy.leverage
                        : (currentWeek.strategy.leverage ? [currentWeek.strategy.leverage] : []);

                      const validItems = leverageList.filter((item: string) => item !== "No progress this week");

                      if (validItems.length === 0) {
                        return (
                          <div style={{ color: '#D1D5DB', fontSize: '0.9rem', fontStyle: 'italic' }}>
                            No hiring actions logged
                          </div>
                        );
                      }

                      const primary = validItems[0];
                      const additionalCount = validItems.length - 1;

                      return (
                        <>
                          <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            marginBottom: additionalCount > 0 ? '8px' : '0'
                          }}>
                            <span style={{ color: '#10B981', fontSize: '0.9rem', flexShrink: 0 }}>✓</span>
                            <span style={{ color: '#111827', fontSize: '0.9rem', lineHeight: '1.4' }}>
                              {primary}
                            </span>
                          </div>
                          {additionalCount > 0 && (
                            <div style={{
                              color: '#6B7280',
                              fontSize: '0.85rem',
                              marginLeft: '20px'
                            }}>
                              +{additionalCount} more
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* 2. Decision Ownership */}
                <div className="glass-panel" style={{ padding: '24px', minHeight: '160px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ color: '#9CA3AF', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Decision Ownership
                    </span>
                  </div>

                  <div style={{ marginTop: 'auto' }}>
                    {(() => {
                      const decisionList = Array.isArray(currentWeek.strategy.decision)
                        ? currentWeek.strategy.decision
                        : (currentWeek.strategy.decision ? [currentWeek.strategy.decision] : []);

                      const validDecisions = decisionList.filter((item: string) => item !== "No major decisions");

                      if (validDecisions.length === 0) {
                        return (
                          <div style={{ color: '#D1D5DB', fontSize: '0.9rem', fontStyle: 'italic' }}>
                            No decision ownership logged
                          </div>
                        );
                      }

                      return (
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px'
                        }}>
                          <span style={{ color: '#3B82F6', fontSize: '0.9rem', flexShrink: 0 }}>✓</span>
                          <span style={{ color: '#111827', fontSize: '0.9rem', lineHeight: '1.4' }}>
                            {validDecisions[0]}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 3. Build Output - with Sparkline */}
                <div className="glass-panel" style={{ padding: '24px', minHeight: '160px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ color: '#9CA3AF', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Build Output
                    </span>
                  </div>

                  <div style={{ marginTop: 'auto' }}>
                    {(() => {
                      // Get last 6 weeks of data for sparkline
                      const weeksList = Object.values(data?.weeks || {})
                        .filter(w => w.submitted)
                        .sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime())
                        .slice(0, 6)
                        .reverse();

                      const frontendList = Array.isArray(currentWeek.strategy.frontend)
                        ? currentWeek.strategy.frontend
                        : (currentWeek.strategy.frontend ? [currentWeek.strategy.frontend] : []);

                      const hasCurrentOutput = frontendList.length > 0 && !frontendList.includes("No frontend work" as any);

                      return (
                        <>
                          {/* Sparkline */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: '3px',
                            height: '32px',
                            marginBottom: '12px'
                          }}>
                            {weeksList.map((w, i) => {
                              const wFrontend = Array.isArray(w.strategy?.frontend)
                                ? w.strategy.frontend
                                : (w.strategy?.frontend ? [w.strategy.frontend] : []);

                              const hasOutput = wFrontend.length > 0 && !wFrontend.includes("No frontend work" as any);

                              const height = hasOutput ? '100%' : '25%';

                              return (
                                <div
                                  key={i}
                                  style={{
                                    flex: 1,
                                    height: height,
                                    background: '#E5E7EB',
                                    borderRadius: '2px'
                                  }}
                                />
                              );
                            })}
                          </div>

                          {/* Current week status */}
                          {hasCurrentOutput ? (
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px'
                            }}>
                              <span style={{ color: '#10B981', fontSize: '0.9rem', flexShrink: 0 }}>✓</span>
                              <span style={{ color: '#111827', fontSize: '0.9rem', lineHeight: '1.4' }}>
                                {frontendList[0]}
                              </span>
                            </div>
                          ) : (
                            <div style={{ color: '#D1D5DB', fontSize: '0.9rem', fontStyle: 'italic' }}>
                              No build output logged
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* 4. Training - Discrete Dots */}
                <div className="glass-panel" style={{ padding: '24px', minHeight: '160px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ color: '#9CA3AF', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Training (Muay Thai)
                    </span>
                  </div>

                  <div style={{ marginTop: 'auto' }}>
                    {/* Discrete dot indicators */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      marginBottom: '16px',
                      fontSize: '1.5rem'
                    }}>
                      {[1, 2].map(slot => {
                        const filled = (currentWeek?.strategy?.energy || 0) >= slot;
                        return (
                          <span key={slot} style={{ color: filled ? '#F59E0B' : '#E5E7EB' }}>
                            ●
                          </span>
                        );
                      })}
                    </div>

                    {/* Session count */}
                    <div style={{ fontSize: '0.9rem', color: '#6B7280' }}>
                      {currentWeek.strategy.energy === 0 && 'No sessions logged'}
                      {currentWeek.strategy.energy === 1 && '1 of 2 sessions'}
                      {currentWeek.strategy.energy === 2 && '2 sessions completed'}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Stability Floor (Money) */}
          <div style={{ marginBottom: '60px' }}>
            <Link href="/review?tab=monthly" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 className="text-label" style={{ color: '#9CA3AF' }}>
                  Stability floor
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Update ➝</span>
              </div>
            </Link>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>

              {/* Emergency Fund */}
              <div className="glass-panel" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
                {/* Milestone Marker for 400k */}
                <div style={{
                  position: 'absolute',
                  left: `${(LIFESTYLE_LOCK_THRESHOLD / EMERGENCY_GOAL) * 100}%`,
                  top: 0, bottom: 0, width: '2px',
                  background: 'rgba(0,0,0,0.05)',
                  zIndex: 0,
                  pointerEvents: 'none'
                }} />

                <div className="text-label" style={{ marginBottom: '16px' }}>Emergency Fund</div>

                <div style={{ marginBottom: '4px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827' }}>
                    {stats.wealth.emergency.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '1rem', color: '#9CA3AF', fontWeight: 500, marginLeft: '6px' }}>KES</span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '20px' }}>
                  of {fmt(EMERGENCY_GOAL)} KES
                </div>

                <div style={{ width: '100%', height: '6px', background: '#F3F4F6', borderRadius: '3px', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
                  <div style={{ width: `${stats.wealth.emergencyPct}%`, height: '100%', background: '#10B981' }} />
                </div>

                {/* Months left */}
                <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#6B7280', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{Math.round(stats.wealth.emergencyPct)}%</span>
                  <span>{stats.wealth.emergencyRemaining !== '—' && `~${stats.wealth.emergencyRemaining} left`}</span>
                </div>

                {/* Lock message */}
                {isLifestyleLocked && (
                  <div style={{
                    marginTop: '16px',
                    fontSize: '0.8rem',
                    color: '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#F9FAFB',
                    padding: '8px 12px',
                    borderRadius: '8px'
                  }}>
                    <span>🔒</span>
                    <span>Lifestyle locked until 400k</span>
                  </div>
                )}
              </div>

              {/* Car Fund */}
              <div className="glass-panel" style={{ padding: '32px' }}>
                <div className="text-label" style={{ marginBottom: '16px' }}>Car Fund</div>

                <div style={{ marginBottom: '4px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827' }}>
                    {stats.wealth.car.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '1rem', color: '#9CA3AF', fontWeight: 500, marginLeft: '6px' }}>KES</span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '20px' }}>
                  of {fmt(CAR_GOAL)} KES
                </div>

                <div style={{ width: '100%', height: '6px', background: '#F3F4F6', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${stats.wealth.carPct}%`, height: '100%', background: '#3B82F6' }} />
                </div>

                <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#6B7280', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{Math.round(stats.wealth.carPct)}%</span>
                  <span>{stats.wealth.carRemaining !== '—' && `~${stats.wealth.carRemaining} left`}</span>
                </div>
              </div>

              {/* Travel */}
              <div className="glass-panel" style={{ padding: '32px' }}>
                <div className="text-label" style={{ marginBottom: '16px' }}>Travel Buffer</div>

                <div style={{ marginBottom: '4px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827' }}>
                    {stats.wealth.travel.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '1rem', color: '#9CA3AF', fontWeight: 500, marginLeft: '6px' }}>USD</span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '20px' }}>
                  of {fmt(TRAVEL_GOAL)} USD
                </div>

                <div style={{ width: '100%', height: '6px', background: '#F3F4F6', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${stats.wealth.travelPct}%`, height: '100%', background: '#8B5CF6' }} />
                </div>

                <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#6B7280', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{Math.round(stats.wealth.travelPct)}%</span>
                  <span>{stats.wealth.travelRemaining !== '—' && `~${stats.wealth.travelRemaining} left`}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Savings History */}
          {data && data.months && Object.keys(data.months).length > 0 && (
            <div style={{ marginBottom: '60px' }}>
              <h3 className="text-label" style={{ marginBottom: '16px', color: '#9CA3AF' }}>
                Monthly Savings History
              </h3>
              <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', boxShadow: '0 4px 6px -2px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', padding: '16px 32px', borderBottom: '1px solid #F3F4F6', background: '#F9FAFB' }}>
                  <div style={{ width: '30%', fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF' }}>MONTH</div>
                  <div style={{ width: '25%', fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF' }}>EMERGENCY</div>
                  <div style={{ width: '25%', fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF' }}>TRAVEL</div>
                  <div style={{ width: '20%', fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF' }}>STATUS</div>
                </div>
                {Object.values(data.months)
                  .filter((m: any) => m.submitted)
                  .sort((a: any, b: any) => b.month.localeCompare(a.month))
                  .map((monthData: any) => {
                    const formatMonthDisplay = (monthId: string, submittedDate?: string): string => {
                      const [year, month] = monthId.split('-');
                      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                      const monthStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

                      // Add day if submittedDate exists
                      if (submittedDate) {
                        const submitDate = new Date(submittedDate);
                        const day = submitDate.getDate();
                        const suffix = day === 1 || day === 21 || day === 31 ? 'st'
                          : day === 2 || day === 22 ? 'nd'
                            : day === 3 || day === 23 ? 'rd'
                              : 'th';
                        return `${monthStr} ${day}${suffix}`;
                      }

                      return monthStr;
                    };

                    const emergencyMet = (monthData.emergencyFund || 0) >= 50000;
                    const travelMet = (monthData.travelFund || 0) >= 250;
                    const rulesMet = emergencyMet && travelMet;

                    return (
                      <div key={monthData.month} style={{ display: 'flex', padding: '20px 32px', borderBottom: '1px solid #F3F4F6', alignItems: 'center' }}>
                        <div style={{ width: '30%', fontWeight: 600, fontSize: '0.9rem', color: '#4B5563' }}>
                          {formatMonthDisplay(monthData.month, monthData.submittedDate)}
                        </div>
                        <div style={{ width: '25%', fontSize: '0.9rem', color: '#111827', fontWeight: 500 }}>
                          {(monthData.emergencyFund || 0).toLocaleString()} KES
                        </div>
                        <div style={{ width: '25%', fontSize: '0.9rem', color: '#111827', fontWeight: 500 }}>
                          {(monthData.travelFund || 0).toLocaleString()} USD
                        </div>
                        <div style={{ width: '20%' }}>
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '6px',
                            background: rulesMet ? '#ECFDF5' : emergencyMet || travelMet ? '#FFFBEB' : '#FEF2F2',
                            color: rulesMet ? '#059669' : emergencyMet || travelMet ? '#D97706' : '#DC2626',
                          }}>
                            {rulesMet ? '✓ MET' : (emergencyMet || travelMet) ? 'PARTIAL' : 'DIDN\'T MEET'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* The Verdict Table */}
          <div>
            <h3 className="text-label" style={{ marginBottom: '16px', color: '#9CA3AF' }}>
              History
            </h3>
            <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', boxShadow: '0 4px 6px -2px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', padding: '16px 32px', borderBottom: '1px solid #F3F4F6', background: '#F9FAFB' }}>
                <div style={{ width: '20%', fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF' }}>WEEK</div>
                <div style={{ width: '20%', fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF' }}>STATUS</div>
                <div style={{ width: '60%', fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF' }}>RECORDED OUTCOME</div>
              </div>
              {history.map((week, index) => {
                const verdict = calculateVerdict(week);
                const isOnTrack = verdict === 'On track';
                const isPartialProgress = verdict === 'Partial progress';
                const isDoBetter = verdict === 'Do better';

                // Generate Outcome Summary
                const strat = week.strategy || { leverage: [], energy: 0 };
                const leverageList = Array.isArray(strat.leverage) ? strat.leverage : (strat.leverage ? [strat.leverage] : []);
                const outcomeText = leverageList.length > 0 ? leverageList.join(", ") : "No key outcomes";
                const trainingText = strat.energy === 0 ? "no training" : strat.energy === 1 ? "min training" : "training met";

                return (
                  <div key={week.id} style={{ display: 'flex', padding: '20px 32px', borderBottom: '1px solid #F3F4F6', alignItems: 'center' }}>
                    <div style={{ width: '20%', fontWeight: 600, fontSize: '0.9rem', color: '#4B5563' }}>
                      Week {history.length - index}
                    </div>
                    <div style={{ width: '20%' }}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '6px',
                        background: isOnTrack ? '#ECFDF5' : isPartialProgress ? '#FFFBEB' : '#FEF2F2',
                        color: isOnTrack ? '#059669' : isPartialProgress ? '#D97706' : '#DC2626',
                      }}>
                        {verdict.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ width: '60%', color: '#6B7280', fontSize: '0.9rem' }}>
                      {outcomeText}, {trainingText}
                    </div>
                  </div>
                );
              })}
              {history.length === 0 && <div style={{ padding: '32px', textAlign: 'center', color: '#D1D5DB' }}>No history recorded.</div>}
            </div>
          </div>
        </>
      )}

      {/* Success/Verdict Modal */}
      {showSuccess && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-panel" style={{
            padding: '48px', maxWidth: '400px', width: '90%', textAlign: 'center',
            background: 'white', border: '1px solid #E5E7EB', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
              {(searchParams.get('status') || searchParams.get('verdict')) === 'On track' ? '🛡️' : '⚖️'}
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
              Weekly review logged
            </h2>
            <p style={{ color: '#6B7280', marginBottom: '32px' }}>
              Status recorded based on outcomes and energy rules.
            </p>
            <button onClick={handleCloseSuccess} style={{
              width: '100%', padding: '16px', borderRadius: '999px', background: '#111827', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer'
            }}>
              Done
            </button>
          </div>
        </div>
      )}

    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

// --- LOGIC HELPERS ---

function calculateStats(data: AppData) {
  const EMERGENCY_GOAL = 1350000;
  const CAR_GOAL = 1500000;
  const TRAVEL_GOAL = 1500;

  if (!data || !data.months) return {
    wealth: {
      emergency: 0, emergencyPct: 0,
      car: 0, carPct: 0,
      travel: 0, travelPct: 0,
      projectedTotal: 0,
      emergencyRemaining: '—', carRemaining: '—', travelRemaining: '—'
    }
  };

  const emergencyTotal = getTotalEmergencyFund(data);
  const carTotal = getTotalCarFund(data);
  const travelTotal = Object.values(data.months)
    .filter(m => m.submitted)
    .reduce((sum, m) => sum + (m.travelFund || 0), 0);

  // Get latest month for "months remaining" calculation
  const sortedMonths = Object.values(data.months).sort((a, b) => b.month.localeCompare(a.month));
  const latestMonth = sortedMonths[0] || { emergencyFund: 0, carFund: 0, travelFund: 0 };

  return {
    wealth: {
      emergency: emergencyTotal,
      emergencyPct: Math.min((emergencyTotal / EMERGENCY_GOAL) * 100, 100),
      car: carTotal,
      carPct: Math.min((carTotal / CAR_GOAL) * 100, 100),
      travel: travelTotal,
      travelPct: Math.min((travelTotal / TRAVEL_GOAL) * 100, 100),
      projectedTotal: emergencyTotal,

      // Calculate months remaining based on LATEST month's allocation
      emergencyRemaining: monthsRemaining(emergencyTotal, EMERGENCY_GOAL, latestMonth.emergencyFund ?? 0),
      carRemaining: monthsRemaining(carTotal, CAR_GOAL, latestMonth.carFund ?? 0),
      travelRemaining: monthsRemaining(travelTotal, TRAVEL_GOAL, latestMonth.travelFund ?? 0),
    }
  };
}

function calculateVerdict(week: WeekData): string {
  // Legacy support
  if (!week.strategy) {
    return "On track";
  }

  const strat = week.strategy;
  const energy = strat.energy;

  const leverageList = Array.isArray(strat.leverage) ? strat.leverage : (strat.leverage ? [strat.leverage] : []);
  const frontendList = Array.isArray(strat.frontend) ? strat.frontend : (strat.frontend ? [strat.frontend] : []);

  const hasNeedle = leverageList.length > 0 && !leverageList.includes("No progress this week" as any);
  const hasCode = frontendList.length > 0 && !frontendList.includes("No frontend work" as any);

  const energyOk = energy >= 2;

  // NEW STATUS LABELS:
  // 1. "Do better" - Training = 0 OR no outcomes at all
  if (!energyOk) return "Do better";

  // 2. "Partial progress" - Energy kept but outcomes missing
  if (!hasNeedle || !hasCode) return "Partial progress";

  // 3. "On track" - All standards met
  return "On track";
}