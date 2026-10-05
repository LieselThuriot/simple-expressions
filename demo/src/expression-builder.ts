import { operatorDefinitions } from './constants';

export type BuilderValue = { kind: 'string'; value: string } | { kind: 'number'; value: string } | { kind: 'boolean'; value: boolean } | { kind: 'reference'; value: string } | { kind: 'list'; items: BuilderValue[] } | BuilderNode;
export interface BuilderNode { kind: 'call'; operator: string; args: BuilderValue[]; }

const arity = (operator: string): number | 'variadic' => operatorDefinitions.find((definition) => definition.name === operator)?.arity ?? 'variadic';

export const createBuilderNode = (operator = 'eq'): BuilderNode => {
    const count = arity(operator);
    const length = count === 'variadic' ? 2 : count;
    return { kind: 'call', operator, args: Array.from({ length }, (_, index) => index === 0 ? { kind: 'reference', value: '#field' } : index === 1 ? { kind: 'string', value: 'value' } : { kind: 'boolean', value: true }) };
};

export const changeBuilderOperator = (node: BuilderNode, operator: string): BuilderNode => {
    const next = createBuilderNode(operator);
    if (next.args.length < node.args.length && next.args.length !== 2) {
        return { ...next, args: node.args.slice(0, next.args.length) };
    }

    if (next.args.length === 2 && builderOperatorDefinitions.find((item) => item.name === operator)?.arity === 'variadic') {
        return { ...next, args: node.args.length >= 2 ? node.args : [...node.args, ...next.args.slice(node.args.length)] };
    }

    return { ...next, args: next.args.map((fallback, index) => node.args[index] ?? fallback) };
};

export const builderOperatorDefinitions = operatorDefinitions;

export const builderOperatorGroups = [...new Set(operatorDefinitions.map((definition) => definition.category))].map((category) => ({
    category,
    operators: operatorDefinitions.filter((definition) => definition.category === category)
}));

export const builderValue = (value: BuilderValue): string => {
    if (value.kind === 'call') return serializeBuilder(value);
    if (value.kind === 'list') return `[${value.items.map(builderValue).join(', ')}]`;
    if (value.kind === 'reference') return value.value.startsWith('#') ? value.value : `#${value.value}`;
    if (value.kind === 'string') return JSON.stringify(value.value);
    if (value.kind === 'number') return value.value || '0';
    return String(value.value);
};

export const serializeBuilder = (node: BuilderNode): string => `${node.operator}(${node.args.map(builderValue).join(', ')})`;

export const getBuilderReferencePaths = (modelText: string): string[] => {
    let model: unknown;
    try {
        model = JSON.parse(modelText);
    } catch {
        return [];
    }

    const paths: string[] = [];
    const visit = (value: unknown, prefix: string): void => {
        if (value === null || typeof value !== 'object') return;
        for (const key of Object.keys(value)) {
            const path = prefix ? `${prefix}.${key}` : key;
            paths.push(`#${path}`);
            visit((value as Record<string, unknown>)[key], path);
        }
    };
    visit(model, '');
    return paths;
};

export interface BuilderSample { id: string; label: string; model: string; node: BuilderNode; }
export const builderSamples: BuilderSample[] = [
    { id: 'release-gate', label: 'Release gate', model: '{\n  "stage": "review",\n  "tests": 98,\n  "approved": true\n}', node: { kind: 'call', operator: 'and', args: [{ kind: 'call', operator: 'eq', args: [{ kind: 'reference', value: '#stage' }, { kind: 'string', value: 'review' }] }, { kind: 'call', operator: 'gt', args: [{ kind: 'reference', value: '#tests' }, { kind: 'number', value: '95' }] }, { kind: 'reference', value: '#approved' }] } },
    { id: 'queue-label', label: 'Queue label', model: '{\n  "queue": "  priority  ",\n  "items": 4\n}', node: { kind: 'call', operator: 'concat', args: [{ kind: 'call', operator: 'upper', args: [{ kind: 'call', operator: 'trim', args: [{ kind: 'reference', value: '#queue' }] }] }, { kind: 'string', value: ' / ' }, { kind: 'reference', value: '#items' }, { kind: 'string', value: ' items' }] } },
    { id: 'plan-selection', label: 'Select a service plan', model: '{\n  "seats": 12,\n  "region": "EU"\n}', node: { kind: 'call', operator: 'if', args: [{ kind: 'call', operator: 'and', args: [{ kind: 'call', operator: 'gt', args: [{ kind: 'reference', value: '#seats' }, { kind: 'number', value: '10' }] }, { kind: 'call', operator: 'in', args: [{ kind: 'reference', value: '#region' }, { kind: 'list', items: [{ kind: 'string', value: 'US' }, { kind: 'string', value: 'EU' }] }] }] }, { kind: 'string', value: 'team' }, { kind: 'string', value: 'starter' }] } },
    { id: 'invoice-total', label: 'Invoice total', model: '{\n  "lines": [18, 12.5, 4],\n  "tax": 3.25\n}', node: { kind: 'call', operator: 'round', args: [{ kind: 'call', operator: 'add', args: [{ kind: 'reference', value: '#lines' }, { kind: 'reference', value: '#tax' }] }, { kind: 'number', value: '2' }] } }
];
