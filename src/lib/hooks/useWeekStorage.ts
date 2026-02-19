import { useState, useEffect } from 'react';
import { WeekData } from '@/lib/types';
import { loadData, saveData, getWeek } from '@/lib/storage';

export function useWeekStorage() {
    const [week, setWeek] = useState<WeekData | null>(null);

    useEffect(() => {
        const data = loadData();
        if (data) {
            setWeek(getWeek(data));
        }
    }, []);

    const updateWeek = (updates: Partial<WeekData>) => {
        if (!week) return;

        const updatedWeek = { ...week, ...updates };
        setWeek(updatedWeek);

        const currentData = loadData() || { weeks: {}, months: {} };
        saveData({
            ...currentData,
            weeks: { ...currentData.weeks, [updatedWeek.id]: updatedWeek }
        });

        window.dispatchEvent(new Event('storage-update'));
    };

    return { week, updateWeek };
}
