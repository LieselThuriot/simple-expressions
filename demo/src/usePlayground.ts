import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { evaluatePlayground, examples, initialExpression, initialModel, type EvaluationResult } from './playground';

const evaluationDelay = 250;

const useDebouncedEvaluation = (evaluate: (model: string, expression: string) => void) => {
    const timer = useRef<number | undefined>(undefined);

    const cancel = useCallback(() => {
        if (timer.current !== undefined) {
            window.clearTimeout(timer.current);
            timer.current = undefined;
        }
    }, []);

    const schedule = useCallback(
        (model: string, expression: string) => {
            cancel();
            timer.current = window.setTimeout(() => {
                timer.current = undefined;
                evaluate(model, expression);
            }, evaluationDelay);
        },
        [cancel, evaluate]
    );

    useEffect(() => cancel, [cancel]);

    return { cancel, schedule };
};

export const usePlayground = () => {
    const [modelText, setModelText] = useState(initialModel);
    const [expressionText, setExpressionText] = useState(initialExpression);
    const [selectedExampleId, setSelectedExampleId] = useState('');
    const [result, setResult] = useState<EvaluationResult>(() => evaluatePlayground(initialModel, initialExpression));
    const lastEvaluated = useRef({ model: initialModel, expression: initialExpression });

    const evaluate = useCallback((model: string, expression: string) => {
        lastEvaluated.current = { model, expression };
        setResult(evaluatePlayground(model, expression));
    }, []);
    const { cancel, schedule } = useDebouncedEvaluation(evaluate);

    useEffect(() => {
        if (
            lastEvaluated.current.model === modelText &&
            lastEvaluated.current.expression === expressionText
        ) {
            return;
        }
        schedule(modelText, expressionText);
    }, [expressionText, modelText, schedule]);

    const evaluateImmediately = useCallback(
        (model: string, expression: string) => {
            cancel();
            evaluate(model, expression);
        },
        [cancel, evaluate]
    );

    const handleReset = useCallback(() => {
        setModelText(initialModel);
        setExpressionText(initialExpression);
        setSelectedExampleId('');
        evaluateImmediately(initialModel, initialExpression);
    }, [evaluateImmediately]);

    const handleLoadExample = useCallback(
        (event: ChangeEvent<HTMLSelectElement>) => {
            const id = event.target.value;
            setSelectedExampleId(id);
            const example = examples.find((candidate) => candidate.id === id);
            if (!example) {
                return;
            }
            setModelText(example.model);
            setExpressionText(example.expression);
            evaluateImmediately(example.model, example.expression);
        },
        [evaluateImmediately]
    );

    return {
        expressionText,
        getModelText: useCallback(() => modelText, [modelText]),
        handleLoadExample,
        handleReset,
        modelText,
        result,
        selectedExampleId,
        setExpressionText,
        setModelText
    };
};
