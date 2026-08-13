import { operatorDefinitions } from './constants';

export type BuilderValue = { kind: 'string'; value: string } | { kind: 'number'; value: string } | { kind: 'boolean'; value: boolean } | { kind: 'reference'; value: string } | { kind: 'list'; items: BuilderValue[] } | BuilderNode;
export interface BuilderNode { kind: 'call'; operator: string; args: BuilderValue[]; }

const arity = (operator: string): number | 'variadic' => {
    if (['not', 'empty', 'len', 'lower', 'upper', 'trim', 'defined'].includes(operator)) return 1;
    if (['eq', 'contains', 'startswith', 'endswith', 'in', 'gt', 'lt', 'match'].includes(operator)) return 2;
    if (operator === 'if') return 3;
    return 'variadic';
};

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

export const builderOperatorDefinitions = operatorDefinitions.map((definition) => ({ ...definition, arity: arity(definition.name) }));

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
    { id: 'access', label: 'Access check', model: '{\n  "role": "editor",\n  "active": true\n}', node: { kind: 'call', operator: 'and', args: [{ kind: 'call', operator: 'eq', args: [{ kind: 'reference', value: '#role' }, { kind: 'string', value: 'editor' }] }, { kind: 'reference', value: '#active' }] } },
    { id: 'status', label: 'Status membership', model: '{\n  "status": "ready"\n}', node: { kind: 'call', operator: 'in', args: [{ kind: 'call', operator: 'lower', args: [{ kind: 'reference', value: '#status' }] }, { kind: 'list', items: [{ kind: 'string', value: 'ready' }, { kind: 'string', value: 'approved' }] }] } },
    { id: 'conditional', label: 'Conditional label', model: '{\n  "score": 8\n}', node: { kind: 'call', operator: 'if', args: [{ kind: 'call', operator: 'gt', args: [{ kind: 'reference', value: '#score' }, { kind: 'number', value: '5' }] }, { kind: 'string', value: 'ready' }, { kind: 'string', value: 'keep practicing' }] } },
    { id: 'text', label: 'Format text', model: '{\n  "name": "Ada",\n  "role": "engineer"\n}', node: { kind: 'call', operator: 'concat', args: [{ kind: 'string', value: 'Hello, ' }, { kind: 'reference', value: '#name' }, { kind: 'string', value: ' / ' }, { kind: 'reference', value: '#role' }] } }
];
