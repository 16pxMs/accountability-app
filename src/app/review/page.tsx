"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from "next/navigation";
import styles from "../page.module.css";
import CurrentWeek from "@/components/CurrentWeek";
import FinanceCard from "@/components/FinanceCard";
import Navbar from "@/components/Navbar";

function ReviewContent() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly');

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam === 'monthly' || tabParam === 'weekly') {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    return (
        <main style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>

            {/* Tab Switcher */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '40px', marginTop: '20px' }}>
                <div style={{
                    background: '#F3F4F6', padding: '4px', borderRadius: '999px', display: 'flex', gap: '4px'
                }}>
                    <button
                        onClick={() => setActiveTab('weekly')}
                        style={{
                            padding: '8px 24px', borderRadius: '999px', border: 'none',
                            background: activeTab === 'weekly' ? '#fff' : 'transparent',
                            boxShadow: activeTab === 'weekly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                            color: activeTab === 'weekly' ? '#000' : '#6B7280',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Weekly
                    </button>
                    <button
                        onClick={() => setActiveTab('monthly')}
                        style={{
                            padding: '8px 24px', borderRadius: '999px', border: 'none',
                            background: activeTab === 'monthly' ? '#fff' : 'transparent',
                            boxShadow: activeTab === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                            color: activeTab === 'monthly' ? '#000' : '#6B7280',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Monthly
                    </button>
                </div>
            </div>

            {/* Dynamic Header */}
            <div style={{ textAlign: 'left', marginBottom: '40px' }}>
                {activeTab === 'monthly' ? (
                    <>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px', fontFamily: 'var(--font-nunito)' }}>Monthly Finance Check-in</h1>
                        <p style={{ color: '#6B7280', fontSize: '1rem' }}>Update your monthly buffers. This takes less than 2 minutes.</p>
                    </>
                ) : null}
            </div>

            {/* Content Area */}
            {activeTab === 'weekly' ? (
                <CurrentWeek />
            ) : (
                <FinanceCard />
            )}

        </main>
    );
}

export default function ReviewPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ReviewContent />
        </Suspense>
    );
}
