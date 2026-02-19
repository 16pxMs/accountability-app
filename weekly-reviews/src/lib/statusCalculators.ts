export const STATUS_LABELS = {
    STABLE: 'STABLE',
    MONITORING: 'MONITORING',
    ACTION_REQUIRED: 'ACTION REQUIRED'
} as const;

export function getLeverageState(totalActions: number) {
    if (totalActions >= 4) return { label: STATUS_LABELS.STABLE, color: 'var(--accent-success)' };
    if (totalActions > 0) return { label: STATUS_LABELS.MONITORING, color: 'var(--accent-warning)' };
    return { label: STATUS_LABELS.ACTION_REQUIRED, color: 'var(--accent-failure)' };
}

export function getHealthState(sessions: number) {
    if (sessions >= 2) return { label: STATUS_LABELS.STABLE, color: 'var(--accent-success)' };
    if (sessions === 1) return { label: STATUS_LABELS.MONITORING, color: 'var(--accent-warning)' };
    return { label: STATUS_LABELS.ACTION_REQUIRED, color: 'var(--accent-failure)' };
}

export function getWealthState(contribution: number, target = 50000) {
    if (contribution >= target) return { label: STATUS_LABELS.STABLE, color: 'var(--accent-success)' };
    if (contribution > 0) return { label: STATUS_LABELS.MONITORING, color: 'var(--accent-warning)' };
    return { label: STATUS_LABELS.ACTION_REQUIRED, color: 'var(--accent-failure)' };
}
