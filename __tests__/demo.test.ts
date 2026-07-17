import { describe, expect, test } from 'vitest';
import {
    evaluatePlayground,
    formatValue,
    initialExpression,
    initialModel,
    parseModel
} from '../demo/playground';

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
});
