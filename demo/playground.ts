import { parseExpression } from '../src/index';

export const initialModel = JSON.stringify({
    user: { name: 'Ada', role: 'engineer' },
    score: 8
}, null, 2);

export const initialExpression = 'and(eq(#user.name, "Ada"), gt(#score, 5))';

export interface DemoExample {
    id: string;
    label: string;
    model: string;
    expression: string;
}

export const examples: DemoExample[] = [
    {
        id: 'welcome',
        label: 'Check a condition',
        model: initialModel,
        expression: initialExpression
    },
    {
        id: 'greeting',
        label: 'Make a greeting',
        model: JSON.stringify({ user: { name: 'Ada' } }, null, 2),
        expression: 'concat("Hello, ", #user.name, "!")'
    },
    {
        id: 'status',
        label: 'Pick a status',
        model: JSON.stringify({ score: 8 }, null, 2),
        expression: 'if(gt(#score, 5), "ready", "keep practicing")'
    },
    {
        id: 'search',
        label: 'Check some text',
        model: JSON.stringify({ message: 'Simple expressions are useful' }, null, 2),
        expression: 'and(not(empty(#message)), match(lower(#message), "useful$"))'
    }
];

export interface FormattedValue {
    display: string;
    type: string;
}

export type EvaluationResult =
    | { ok: true; value: FormattedValue }
    | { ok: false; error: string };

export const parseModel = (modelText: string): Record<string, unknown> | unknown[] | null => {
    let model: unknown;

    try {
        model = JSON.parse(modelText);
    } catch {
        throw new Error('Model must be valid JSON.');
    }

    if (model !== null && typeof model !== 'object') {
        throw new Error('Model must be a JSON object, array, or null.');
    }

    return model as Record<string, unknown> | unknown[] | null;
};

export const formatValue = (value: unknown): FormattedValue => {
    if (value === undefined) {
        return { display: 'undefined', type: 'undefined' };
    }

    if (value === null) {
        return { display: 'null', type: 'null' };
    }

    if (typeof value === 'string') {
        return { display: JSON.stringify(value), type: 'string' };
    }

    if (typeof value === 'number') {
        return { display: String(value), type: 'number' };
    }

    if (typeof value === 'boolean') {
        return { display: String(value), type: 'boolean' };
    }

    return {
        display: JSON.stringify(value, null, 2) ?? 'undefined',
        type: Array.isArray(value) ? 'array' : 'object'
    };
};

export const evaluatePlayground = (modelText: string, expressionText: string): EvaluationResult => {
    try {
        const model = parseModel(modelText);
        const value = parseExpression(expressionText)(model);
        return { ok: true, value: formatValue(value) };
    } catch (error: unknown) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
};
