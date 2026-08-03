import { lazy, Suspense, type ChangeEventHandler } from 'react';
import { ExamplePicker } from './ExamplePicker';
import { PlaygroundActions } from './PlaygroundActions';

const ExpressionEditor = lazy(() => import('./ExpressionEditor').then(({ ExpressionEditor }) => ({ default: ExpressionEditor })));
const ModelEditor = lazy(() => import('./ModelEditor').then(({ ModelEditor }) => ({ default: ModelEditor })));

const EditorLoading = ({ className }: { className: string }) => (
    <div className={`${className} editor-loading`} role="status" aria-label="Loading editor" />
);

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
            <Suspense fallback={<EditorLoading className="code-input model-input" />}>
                <ModelEditor value={modelText} onChange={onModelChange} />
            </Suspense>
            <p id="model-help" className="field-help">
                The JSON object passed to the evaluator. Reference values with <code>#</code>, like <code>#user.name</code>.
            </p>

            <div className="field-label">
                <span id="expression-label">Expression</span>
            </div>
            <Suspense fallback={<EditorLoading className="expression-editor expression-input" />}>
                <ExpressionEditor value={expressionText} onChange={onExpressionChange} getModelText={getModelText} />
            </Suspense>
            <p id="expression-help" className="field-help">
                An expression evaluated against the model. Operators like <code>eq</code>, <code>and</code>,{' '}
                <code>concat</code>, and <code>if</code> are case-insensitive.
            </p>

            <PlaygroundActions onReset={onReset} />
        </div>
    );
};
