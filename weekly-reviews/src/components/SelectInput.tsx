import styles from './SelectInput.module.css';

interface SelectInputProps {
    label: string;
    value: string;
    options: readonly string[];
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function SelectInput({ label, value, options, onChange, placeholder = "Select..." }: SelectInputProps) {
    return (
        <div className={styles.container}>
            <label className={styles.label}>{label}</label>
            <div className={styles.selectWrapper}>
                <select
                    className={styles.select}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                >
                    <option value="" disabled>{placeholder}</option>
                    {options.map((opt) => (
                        <option key={opt} value={opt}>
                            {opt}
                        </option>
                    ))}
                </select>
                {/* Custom Arrow Icon could go here */}
            </div>
        </div>
    );
}
