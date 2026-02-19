"use client";

interface PillGroupProps {
    options: readonly string[];
    value: string[] | string | number;
    onChange: (val: any) => void;
    multiSelect?: boolean;
    colorScheme?: 'purple' | 'green' | 'blue' | 'orange';
}

export default function PillGroup({
    options,
    value,
    onChange,
    multiSelect = true,
    colorScheme = 'purple'
}: PillGroupProps) {

    const isSelected = (option: string) => {
        if (multiSelect && Array.isArray(value)) {
            return value.includes(option);
        }
        return String(value) === String(option);
    };

    const toggleOption = (option: string) => {
        if (multiSelect && Array.isArray(value)) {
            if (value.includes(option)) {
                onChange(value.filter(v => v !== option));
            } else {
                onChange([...value, option]);
            }
        } else {
            onChange(option);
        }
    };

    const getColors = (isSelected: boolean) => {
        const schemes = {
            purple: {
                border: isSelected ? '#667eea' : '#E5E7EB',
                background: isSelected ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#4B5563',
                shadow: isSelected ? '0 4px 16px rgba(102, 126, 234, 0.4)' : 'none'
            },
            green: {
                border: isSelected ? '#10b981' : '#E5E7EB',
                background: isSelected ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#4B5563',
                shadow: isSelected ? '0 4px 16px rgba(16, 185, 129, 0.4)' : 'none'
            },
            blue: {
                border: isSelected ? '#3b82f6' : '#E5E7EB',
                background: isSelected ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#4B5563',
                shadow: isSelected ? '0 4px 16px rgba(59, 130, 246, 0.4)' : 'none'
            },
            orange: {
                border: isSelected ? '#f59e0b' : '#E5E7EB',
                background: isSelected ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#4B5563',
                shadow: isSelected ? '0 4px 16px rgba(245, 158, 11, 0.4)' : 'none'
            }
        };

        return schemes[colorScheme];
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {options.map((opt) => {
                const active = isSelected(opt);
                const colors = getColors(active);

                return (
                    <button
                        key={opt}
                        onClick={() => toggleOption(opt)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 18px',
                            borderRadius: '50px',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            border: `2px solid ${colors.border}`,
                            background: colors.background,
                            color: colors.color,
                            boxShadow: colors.shadow,
                            outline: 'none'
                        }}
                        onMouseEnter={(e) => {
                            if (!active) {
                                e.currentTarget.style.borderColor = '#D1D5DB';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!active) {
                                e.currentTarget.style.borderColor = '#E5E7EB';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }
                        }}
                    >
                        {active && (
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                style={{ flexShrink: 0 }}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="3"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        )}
                        {opt}
                    </button>
                );
            })}
        </div>
    );
}