export function calculateProgress(current: number, target: number): number {
    return Math.min((current / target) * 100, 100);
}

export function countValidOptions(items: string[], excludeOption: string): number {
    if (!items || !Array.isArray(items)) return 0;
    return items.filter(i => i !== excludeOption).length;
}

export function monthsRemaining(current: number, goal: number, monthlyAlloc: number): string {
    if (monthlyAlloc <= 0) return '—';
    const remaining = goal - current;
    if (remaining <= 0) return 'Goal reached ✓';
    const months = Math.ceil(remaining / monthlyAlloc);
    return months === 1 ? '1 month' : `${months} months`;
}
