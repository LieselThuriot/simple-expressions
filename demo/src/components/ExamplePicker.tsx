import type { ChangeEventHandler } from 'react';
import { examples } from '../playground';

interface ExamplePickerProps {
    selectedExampleId: string;
    onChange: ChangeEventHandler<HTMLSelectElement>;
}

export const ExamplePicker = ({ selectedExampleId, onChange }: ExamplePickerProps) => {
    return (
        <label className="example-picker">
            <span>Load an example</span>
            <select value={selectedExampleId} onChange={onChange}>
                <option value="">Choose one…</option>
                {examples.map((example) => (
                    <option key={example.id} value={example.id}>
                        {example.label}
                    </option>
                ))}
            </select>
        </label>
    );
};
