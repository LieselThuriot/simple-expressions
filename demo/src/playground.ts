import { parseExpression } from 'simple-expressions';

const formatModel = (model: Record<string, unknown>): string => JSON.stringify(model, null, 2);

export const initialModel = formatModel(
    {
        account: { role: 'editor', active: true },
        document: { status: 'review' }
    }
);

export const initialExpression = `and(
    eq(#account.role, "editor"),
    #account.active,
    eq(#document.status, "review")
)`;

export interface DemoExample {
    id: string;
    label: string;
    model: string;
    expression: string;
}

export const examples: DemoExample[] = [
    {
        id: 'editor-review',
        label: 'Approve an editor review',
        model: initialModel,
        expression: initialExpression
    },
    {
        id: 'shipping-eligibility',
        label: 'Check shipping eligibility',
        model: formatModel({ total: 74.5, country: 'CA', express: false }),
        expression: `and(
    or(
        eq(#country, "US"),
        eq(#country, "CA")
    ),
    gt(#total, 50),
    not(#express)
)`
    },
    {
        id: 'profile-label',
        label: 'Clean up a profile label',
        model: formatModel({ firstName: '  Ada  ', lastName: 'Lovelace', handle: '' }),
        expression: `if(
    empty(#handle),
    concat(upper(trim(#firstName)), " ", trim(#lastName)),
    concat("@", lower(trim(#handle)))
)`
    },
    {
        id: 'slug-check',
        label: 'Validate a project slug',
        model: formatModel({ slug: 'simple-expressions-v2' }),
        expression: `and(
    startswith(#slug, "simple"),
    contains(#slug, "-"),
    endswith(#slug, "v2"),
    match(#slug, "^[a-z0-9-]+$")
)`
    },
    {
        id: 'status-label',
        label: 'Choose a delivery message',
        model: formatModel({ status: 'IN_TRANSIT', attempts: 2, known: ['ready', 'in_transit', 'delivered'] }),
        expression: `if(
    and(
        in(lower(#status), #known),
        lt(#attempts, 3)
    ),
    concat("Package is ", lower(trim(#status))),
    "Needs attention"
)`
    },
    {
        id: 'cart-total',
        label: 'Calculate a cart total',
        model: formatModel({ prices: [19.99, 8.5, 12], quantity: 2, discount: 5.25, shipping: 4.99 }),
        expression: `round(
    sub(
        add(mul(add(#prices), #quantity), #shipping),
        #discount
    ),
    2
)`
    },
    {
        id: 'inventory-range',
        label: 'Summarize inventory levels',
        model: formatModel({ shelves: [[12, 4], [8, 15]], reserved: 3 }),
        expression: `clamp(
    sub(max(#shelves), #reserved),
    min(#shelves),
    20
)`
    },
    {
        id: 'score-normalization',
        label: 'Normalize a review score',
        model: formatModel({ raw: '7.8', baseline: 2, scale: 3 }),
        expression: `ceil(
    sqrt(
        pow(num(#raw), #scale)
    )
)`
    },
    {
        id: 'retry-budget',
        label: 'Calculate a retry budget',
        model: formatModel({ failures: -7.8, limit: 5, step: 2 }),
        expression: `max(
    0,
    sub(#limit, abs(floor(#failures)))
)`
    },
    {
        id: 'batch-progress',
        label: 'Measure batch progress',
        model: formatModel({ completed: 37, total: 50 }),
        expression: `concat(
    int(div(mul(#completed, 100), #total)),
    "% complete, ",
    mod(#completed, #total),
    " items into the current cycle"
)`
    },
    {
        id: 'optional-contact',
        label: 'Format an optional contact',
        model: formatModel({ contact: { name: '  Lin  ', phone: undefined }, fallback: 'support@example.test' }),
        expression: `if(
    and(
        defined(#contact.name),
        not(empty(trim(#contact.name)))
    ),
    concat("Contact ", trim(#contact.name)),
    #fallback
)`
    },
    {
        id: 'compact-summary',
        label: 'Build a compact summary',
        model: formatModel({ title: 'Release notes', tags: ['parser', 'demo', 'v2'], owner: 'Mina' }),
        expression: `concat(
    trim(#title),
    " / ",
    len(#tags),
    " tags / ",
    upper(#owner)
)`
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
