import type { ChangeEventHandler } from 'react';
import { ExpressionEditor } from './ExpressionEditor';
import { ExamplePicker } from './ExamplePicker';
import { ModelEditor } from './ModelEditor';
import { PlaygroundActions } from './PlaygroundActions';

interface PlaygroundEditorProps {
    expressionText: string;
    getModelText: () => string;
    modelText: string;
    selectedExampleId: string;
    onLoadExample: ChangeEventHandler<HTMLSelectElement>;
    onReset: () => void;
    onExpressionChange: (value: string) => void;
    onModelChange: (value: string) => void;
}

export const PlaygroundEditor = ({
    expressionText,
    getModelText,
    modelText,
    selectedExampleId,
    onLoadExample,
    onReset,
    onExpressionChange,
    onModelChange
}: PlaygroundEditorProps) => {
    return (
        <div className="editor-column">
            <div className="section-heading">
                <div>
                    <p className="section-kicker">Playground</p>
                    <h2>Model and expression</h2>
                </div>
                <ExamplePicker selectedExampleId={selectedExampleId} onChange={onLoadExample} />
            </div>

            <div className="field-label">
                <span id="model-label">Model</span>
                <span className="field-hint">JSON</span>
            </div>
            <ModelEditor value={modelText} onChange={onModelChange} />
            <p id="model-help" className="field-help">
                The JSON object passed to the evaluator. Reference values with <code>#</code>, like <code>#user.name</code>.
            </p>

            <div className="field-label">
                <span id="expression-label">Expression</span>
            </div>
            <ExpressionEditor value={expressionText} onChange={onExpressionChange} getModelText={getModelText} />
            <p id="expression-help" className="field-help">
                An expression evaluated against the model. Operators like <code>eq</code>, <code>and</code>,{' '}
                <code>concat</code>, and <code>if</code> are case-insensitive.
            </p>

            <PlaygroundActions onReset={onReset} />
        </div>
    );
};
