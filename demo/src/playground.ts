import { parseExpression } from 'simple-expressions';

const formatModel = (model: Record<string, unknown>): string => JSON.stringify(model, null, 2);

export const initialModel = formatModel(
    {
        user: { name: 'Ada', role: 'engineer' },
        score: 8
    }
);

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
        label: 'Build a greeting',
        model: formatModel({ user: { name: 'Ada' } }),
        expression: 'concat("Hello, ", #user.name, "!")'
    },
    {
        id: 'status',
        label: 'Choose a score status',
        model: formatModel({ score: 8 }),
        expression: 'if(and(gt(#score, 5), lt(#score, 10)), "ready", "keep practicing")'
    },
    {
        id: 'search',
        label: 'Search normalized text',
        model: formatModel({ message: 'Simple expressions are useful' }),
        expression: 'and(not(empty(#message)), match(lower(#message), "useful$"))'
    },
    {
        id: 'membership',
        label: 'Check access with OR',
        model: formatModel({ role: 'editor', allowedRoles: ['editor', 'reviewer'] }),
        expression: 'or(eq(#role, "admin"), in(#role, #allowedRoles))'
    },
    {
        id: 'normalize-name',
        label: 'Trim an optional name',
        model: formatModel({ displayName: '  Ada Lovelace  ' }),
        expression: 'if(defined(#displayName), trim(#displayName), "Anonymous")'
    },
    {
        id: 'text-boundaries',
        label: 'Check text boundaries',
        model: formatModel({ slug: 'simple-expressions' }),
        expression: `and(
    startswith(#slug, "simple"),
    contains(#slug, "-"),
    endswith(#slug, "expressions")
)`
    },
    {
        id: 'literal-list',
        label: 'Check a literal list',
        model: formatModel({ status: 'READY' }),
        expression: 'in(lower(#status), ["ready", "approved"])'
    },
    {
        id: 'tag-count',
        label: 'Count model values',
        model: formatModel({ tags: ['expressions', 'demo', 'typed'] }),
        expression: 'len(#tags)'
    },
    {
        id: 'math',
        label: 'Calculate an order total',
        model: formatModel({ quantity: 3, price: 12.5, shipping: 4 }),
        expression: 'add(mul(#quantity, #price), #shipping)'
    },
    {
        id: 'list-total',
        label: 'Total a list of values',
        model: formatModel({ amounts: [12.5, 8, 4.25], fee: 1.25 }),
        expression: 'add(#amounts, #fee)'
    },
    {
        id: 'rounded-total',
        label: 'Round a decimal total',
        model: formatModel({ subtotal: 26.021, tax: 1.234 }),
        expression: 'round(add(#subtotal, #tax), 2)'
    },
    {
        id: 'bounded-score',
        label: 'Keep a score in range',
        model: formatModel({ score: 108, minimum: 0, maximum: 100 }),
        expression: 'clamp(max(#score, #minimum), #minimum, #maximum)'
    },
    {
        id: 'display-label',
        label: 'Format a display label',
        model: formatModel({ user: { name: 'Ada' }, role: 'engineer' }),
        expression: 'concat(upper(#user.name), " / ", upper(#role))'
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
        const value = parseExpression(expressionText)(model ?? {});
        return { ok: true, value: formatValue(value) };
    } catch (error: unknown) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
};
