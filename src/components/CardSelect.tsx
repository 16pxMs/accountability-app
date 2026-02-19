"use client";

interface CardOption {
    value: number | string;
    label: string;
    emoji: string;
}

interface CardSelectProps {
    options: CardOption[];
    value: number | string;
    onChange: (value: number | string) => void;
}

export default function CardSelect({
    options,
    value,
    onChange
}: CardSelectProps) {

    const getColors = (optionValue: number | string) => {
        const isSelected = value === optionValue;

        if (optionValue === 1) {
            return {
                border: isSelected ? '#f59e0b' : '#E5E7EB',
                background: isSelected ? '#FEF3C7' : '#FFFFFF',
                textColor: isSelected ? '#92400E' : '#4B5563'
            };
        }
        if (optionValue === 2) {
            return {
                border: isSelected ? '#10b981' : '#E5E7EB',
                background: isSelected ? '#D1FAE5' : '#FFFFFF',
                textColor: isSelected ? '#065F46' : '#4B5563'
            };
        }

        return {
            border: isSelected ? '#3b82f6' : '#E5E7EB',
            background: isSelected ? '#DBEAFE' : '#FFFFFF',
            textColor: isSelected ? '#1E40AF' : '#4B5563'
        };
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {options.map((option) => {
                const colors = getColors(option.value);
                const isSelected = value === option.value;

                return (
                    <button
                        key={String(option.value)}
                        onClick={() => onChange(option.value)}
                        style={{
                            padding: '20px',
                            borderRadius: '12px',
                            border: `2px solid ${colors.border}`,
                            background: colors.background,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            textAlign: 'center',
                            outline: 'none'
                        }}
                    >
                        <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
                            {option.emoji}
                        </div>
                        <div style={{
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            color: colors.textColor
                        }}>
                            {option.label}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}