import styles from './SelectInput.module.css'; // Re-use styling

interface MultiSelectInputProps {
    label: string;
    value: string[];
    options: readonly string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
}

export default function MultiSelectInput({ label, value, options, onChange, placeholder = "Select..." }: MultiSelectInputProps) {

    const toggleOption = (option: string) => {
        if (value.includes(option)) {
            onChange(value.filter(v => v !== option));
        } else {
            onChange([...value, option]);
        }
    };

    return (
        <div className={styles.container}>
            <label className={styles.label}>{label}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {options.map((opt) => {
                    const isSelected = value.includes(opt);
                    return (
                        <div
                            key={opt}
                            onClick={() => toggleOption(opt)}
                            style={{
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border)'}`,
                                background: isSelected ? 'var(--surface-highlight)' : 'var(--background)',
                                color: isSelected ? 'var(--accent-primary)' : 'var(--foreground)',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <span>{opt}</span>
                            {isSelected && <span style={{ fontSize: '1.2rem', lineHeight: 0 }}>✓</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
