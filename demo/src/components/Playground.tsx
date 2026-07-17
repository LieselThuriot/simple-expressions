import { ResultPanel } from './ResultPanel';
import { PlaygroundEditor } from './PlaygroundEditor';
import { usePlayground } from '../usePlayground';

export const Playground = () => {
    const {
        expressionText,
        getModelText,
        handleLoadExample,
        handleReset,
        modelText,
        result,
        selectedExampleId,
        setExpressionText,
        setModelText
    } = usePlayground();

    return (
        <section className="workspace" aria-label="Expression playground">
            <PlaygroundEditor
                expressionText={expressionText}
                getModelText={getModelText}
                modelText={modelText}
                selectedExampleId={selectedExampleId}
                onLoadExample={handleLoadExample}
                onReset={handleReset}
                onExpressionChange={setExpressionText}
                onModelChange={setModelText}
            />
            <ResultPanel result={result} />
        </section>
    );
};
