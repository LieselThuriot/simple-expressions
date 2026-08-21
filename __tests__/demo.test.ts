import { describe, expect, test } from 'vitest';
import {
    evaluatePlayground,
    examples,
    formatValue,
    initialExpression,
    initialModel,
    parseModel
} from '../demo/src/playground';
import {
    getModelPropertyCompletions,
    getModelPropertyNames,
    getReferenceCompletionContext,
    operatorDefinitions,
    resolveModelPath
} from '../demo/src/expression-completions';
import { builderOperatorDefinitions, builderSamples, changeBuilderOperator, createBuilderNode, getBuilderReferencePaths, serializeBuilder } from '../demo/src/expression-builder';

describe('demo playground helpers', () => {
    test('parses JSON object, array, and null models', () => {
        expect(parseModel('{"value": 1}')).toEqual({ value: 1 });
        expect(parseModel('[1, 2]')).toEqual([1, 2]);
        expect(parseModel('null')).toBeNull();
    });

    test('rejects invalid and primitive model JSON', () => {
        expect(() => parseModel('{invalid}')).toThrow('Model must be valid JSON.');
        expect(() => parseModel('"text"')).toThrow('Model must be a JSON object, array, or null.');
    });

    test('formats the result types exposed by parseExpression', () => {
        expect(formatValue(true)).toEqual({ display: 'true', type: 'boolean' });
        expect(formatValue('hello')).toEqual({ display: '"hello"', type: 'string' });
        expect(formatValue(42)).toEqual({ display: '42', type: 'number' });
        expect(formatValue(null)).toEqual({ display: 'null', type: 'null' });
        expect(formatValue(undefined)).toEqual({ display: 'undefined', type: 'undefined' });
        expect(formatValue({ answer: 42 })).toEqual({ display: '{\n  "answer": 42\n}', type: 'object' });
    });

    test('evaluates the default expression and preserves a string result', () => {
        expect(evaluatePlayground(initialModel, initialExpression)).toEqual({
            ok: true,
            value: { display: 'true', type: 'boolean' }
        });
        expect(evaluatePlayground('{"user":{"name":"Ada"}}', 'concat("Hello, ", #user.name)')).toEqual({
            ok: true,
            value: { display: '"Hello, Ada"', type: 'string' }
        });
    });

    test('includes a defined and trim example', () => {
        const example = examples.find((candidate) => candidate.id === 'normalize-name');

        expect(example).toBeDefined();
        expect(evaluatePlayground(example!.model, example!.expression)).toEqual({
            ok: true,
            value: { display: '"Ada Lovelace"', type: 'string' }
        });
    });

    test('every playground example has a unique id and evaluates successfully', () => {
        expect(new Set(examples.map((example) => example.id)).size).toBe(examples.length);

        for (const example of examples) {
            const result = evaluatePlayground(example.model, example.expression);

            expect(result.ok, `${example.id} should evaluate successfully`).toBe(true);
        }
    });

    test('returns useful errors for invalid expressions and models', () => {
        expect(evaluatePlayground('{"value": 1}', 'unknown(#value)')).toEqual({
            ok: false,
            error: 'Invalid Expression at 8: invalid operator: unknown'
        });
        expect(evaluatePlayground('{invalid}', 'true')).toEqual({
            ok: false,
            error: 'Model must be valid JSON.'
        });
    });

    test('offers filtered root and nested model property completions', () => {
        const model = {
            user: { name: 'Ada', role: 'engineer' },
            score: 8,
            items: [{ id: 1 }],
            '__proto__': 'unsafe',
            'bad.key': true,
            'has space': true
        };

        expect(getModelPropertyNames(model)).toEqual(['items', 'score', 'user']);
        expect(getModelPropertyNames(model, [], 'US')).toEqual(['user']);
        expect(getModelPropertyNames(model, ['user'], 'r')).toEqual(['role']);
        expect(getModelPropertyNames(model, ['items'])).toEqual(['0', 'length']);
        expect(getModelPropertyNames(model, ['items', '0'])).toEqual(['id']);
        expect(getModelPropertyCompletions('{"user":{"name":"Ada"}}', ['user'])).toEqual(['name']);
        expect(getModelPropertyCompletions('{invalid}', [])).toEqual([]);
        expect(getModelPropertyCompletions('null', [])).toEqual([]);
        expect(getModelPropertyCompletions('{"constructor":{"secret":true}}', ['constructor'])).toEqual([]);
    });

    test('resolves dotted model paths with the evaluator precedence', () => {
        const model = {
            user: { name: 'nested' },
            'user.name': 'direct'
        };

        expect(resolveModelPath(model, ['user', 'name'])).toBe('direct');
        expect(resolveModelPath(model, ['user'])).toEqual({ name: 'nested' });
        expect(resolveModelPath(model, ['missing'])).toBeUndefined();
    });

    test('finds reference completion ranges without suggesting inside strings', () => {
        expect(getReferenceCompletionContext('#us')).toEqual({
            from: 1,
            to: 3,
            path: [],
            prefix: 'us'
        });
        expect(getReferenceCompletionContext('[#us')).toEqual({
            from: 2,
            to: 4,
            path: [],
            prefix: 'us'
        });
        expect(getReferenceCompletionContext('eq(#user.na')).toEqual({
            from: 9,
            to: 11,
            path: ['user'],
            prefix: 'na'
        });
        expect(getReferenceCompletionContext('eq("#user')).toBeNull();
        expect(getReferenceCompletionContext('value#user')).toBeNull();
    });

    test('exposes every case-insensitive parser operator for completion', () => {
        expect(operatorDefinitions).toHaveLength(35);
        expect(new Set(operatorDefinitions.map((operator) => operator.name)).size).toBe(35);
        expect(operatorDefinitions.map((operator) => operator.name)).toContain('startswith');
        expect(operatorDefinitions.map((operator) => operator.name)).toContain('in');
        expect(operatorDefinitions.map((operator) => operator.name)).toContain('if');
        expect(operatorDefinitions.map((operator) => operator.name)).toContain('trim');
        expect(operatorDefinitions.map((operator) => operator.name)).toContain('defined');
        expect(operatorDefinitions.map((operator) => operator.name)).toContain('add');
        expect(operatorDefinitions.map((operator) => operator.name)).toContain('mod');
        expect(operatorDefinitions.map((operator) => operator.name)).toContain('round');
        expect(operatorDefinitions.map((operator) => operator.name)).toContain('clamp');
    });
});

describe('demo expression builder helpers', () => {
    test('exposes every operator with its expected arity', () => {
        expect(builderOperatorDefinitions).toHaveLength(35);
        expect(builderOperatorDefinitions.filter((item) => item.arity === 1)).toHaveLength(13);
        expect(builderOperatorDefinitions.filter((item) => item.arity === 2)).toHaveLength(10);
        expect(builderOperatorDefinitions.filter((item) => item.arity === 3)).toHaveLength(2);
        expect(builderOperatorDefinitions.filter((item) => item.arity === 'variadic')).toHaveLength(10);
    });

    test('creates correctly shaped nodes for fixed and variadic operators', () => {
        expect(createBuilderNode('not').args).toHaveLength(1);
        expect(createBuilderNode('if').args).toHaveLength(3);
        expect(createBuilderNode('and').args).toHaveLength(2);
    });

    test('preserves and fills arguments when changing operators', () => {
        const source = createBuilderNode('if');
        source.args[0] = { kind: 'reference', value: '#ready' };
        source.args[1] = { kind: 'string', value: 'yes' };

        expect(changeBuilderOperator(source, 'not')).toEqual({
            kind: 'call', operator: 'not', args: [source.args[0]]
        });
        expect(changeBuilderOperator(source, 'if').args).toEqual(source.args);
        expect(changeBuilderOperator({ ...source, args: source.args.slice(0, 1) }, 'if').args).toHaveLength(3);
        expect(changeBuilderOperator(source, 'and').args).toEqual(source.args);
    });

    test('serializes references, literals, lists, and nested calls', () => {
        expect(serializeBuilder({ kind: 'call', operator: 'in', args: [
            { kind: 'call', operator: 'lower', args: [{ kind: 'reference', value: '#status' }] },
            { kind: 'list', items: [{ kind: 'string', value: 'ready' }, { kind: 'string', value: 'approved' }] }
        ] })).toBe('in(lower(#status), ["ready", "approved"])');
    });

    test('builds reference dropdown paths from nested model data', () => {
        expect(getBuilderReferencePaths('{"user":{"name":"Ada","roles":["editor"]},"active":true}')).toEqual([
            '#user', '#user.name', '#user.roles', '#user.roles.0', '#active'
        ]);
        expect(getBuilderReferencePaths('{invalid}')).toEqual([]);
    });

    test('provides valid, evaluatable builder samples', () => {
        expect(new Set(builderSamples.map((sample) => sample.id)).size).toBe(builderSamples.length);
        for (const sample of builderSamples) {
            const result = evaluatePlayground(sample.model, serializeBuilder(sample.node));
            expect(result.ok, `${sample.id} should evaluate`).toBe(true);
        }
    });

    test('includes a math example', () => {
        const example = examples.find((candidate) => candidate.id === 'math');

        expect(example).toBeDefined();
        expect(evaluatePlayground(example!.model, example!.expression)).toEqual({
            ok: true,
            value: { display: '41.5', type: 'number' }
        });
    });

    test('includes the rounding and clamping examples', () => {
        expect(examples.find((candidate) => candidate.id === 'rounded-total')).toBeDefined();
        expect(examples.find((candidate) => candidate.id === 'bounded-score')).toBeDefined();
    });
});
