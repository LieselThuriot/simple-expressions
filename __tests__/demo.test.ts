import { describe, expect, test } from 'vitest';
import {
    evaluatePlayground,
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
        expect(operatorDefinitions).toHaveLength(16);
        expect(new Set(operatorDefinitions.map((operator) => operator.name)).size).toBe(16);
        expect(operatorDefinitions.map((operator) => operator.name)).toContain('startswith');
        expect(operatorDefinitions.map((operator) => operator.name)).toContain('if');
    });
});
