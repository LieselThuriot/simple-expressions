import { beforeEach, describe, expect, test } from 'vitest';
import * as se from '..';
import { executeExpression, parseExpression } from '..';

beforeEach(() => {
    se.SimpleExpressions.enableCaches();
    se.SimpleExpressions.setCacheLimit(1000);
    se.SimpleExpressions.clear();
});

describe('structural equality', () => {
    test('handles cyclic objects without a depth limit', () => {
        const left: { value: number; self?: unknown } = { value: 1 };
        const right: { value: number; self?: unknown } = { value: 1 };
        left.self = left;
        right.self = right;

        expect(executeExpression({ left, right }, 'eq(#left, #right)')).toBe(true);
    });

    test('uses explicit primitive and collection domains', () => {
        expect(executeExpression({}, 'eq(#missing, #alsoMissing)')).toBe(true);
        expect(executeExpression({ value: null }, 'eq(#missing, #value)')).toBe(true);
        expect(executeExpression({}, 'eq("01", "1")')).toBe(false);
        expect(executeExpression({}, 'eq(1, "1.")')).toBe(true);
        expect(executeExpression({}, 'eq(true, "1e0")')).toBe(true);
        expect(executeExpression({}, 'eq(false, "0")')).toBe(true);
        expect(executeExpression({}, 'eq(false, "   ")')).toBe(false);
        expect(executeExpression({}, 'eq(16, "0x10")')).toBe(false);
        expect(executeExpression({ list: [], object: {} }, 'eq(#list, #object)')).toBe(false);
        expect(executeExpression({ object: {} }, 'eq(#object, "[object Object]")')).toBe(false);
        expect(executeExpression({ value: Infinity }, 'eq(#value, "Infinity")')).toBe(false);
    });

    test('treats sparse array holes as undefined symmetrically', () => {
        const hole = Array(1);
        const explicit = [undefined];

        expect(executeExpression({ left: hole, right: explicit }, 'eq(#left, #right)')).toBe(true);
        expect(executeExpression({ left: explicit, right: hole }, 'eq(#left, #right)')).toBe(true);
        expect(executeExpression({ value: undefined, list: hole }, 'in(#value, #list)')).toBe(true);
    });

    test('compares only supported values and uses UTF-16 code-unit string order', () => {
        const supplementary = String.fromCharCode(0xd83d, 0xde00);
        const privateUse = String.fromCharCode(0xe000);
        expect(executeExpression({}, 'lt("10", "2")')).toBe(true);
        expect(executeExpression({}, `lt("${supplementary}", "${privateUse}")`)).toBe(true);
        expect(executeExpression({}, 'gt(10, "2")')).toBe(true);
        expect(executeExpression({}, 'lt(".5", 1)')).toBe(true);
        for (const value of [true, null, undefined, [], {}, NaN, Infinity, 'invalid', '   ']) {
            expect(executeExpression({ value }, 'gt(#value, 0)')).toBe(false);
        }
    });
});

describe('portable runtime values', () => {
    test('uses JavaScript-style truthiness', () => {
        for (const value of [undefined, null, false, 0, -0, NaN, '']) {
            expect(executeExpression({ value }, '#value')).toBe(false);
        }
        for (const value of [1, '0', [], {}]) {
            expect(executeExpression({ value }, '#value')).toBe(true);
        }
    });

    test('uses the explicit Unicode White_Space set and excludes FEFF', () => {
        const whitespace = [
            ...Array.from({ length: 5 }, (_, index) => 0x0009 + index),
            0x0020, 0x0085, 0x00a0, 0x1680,
            ...Array.from({ length: 11 }, (_, index) => 0x2000 + index),
            0x2028, 0x2029, 0x202f, 0x205f, 0x3000
        ];
        for (const code of whitespace) {
            const space = String.fromCharCode(code);
            expect(parseExpression(`${space}true${space}`)({})).toBe(true);
            expect(parseExpression(`add(1${space},${space}2)`)({})).toBe(3);
            expect(parseExpression('num(#value)')({ value: `${space}2${space}` })).toBe(2);
            expect(parseExpression('trim(#value)')({ value: `${space}x${space}` })).toBe('x');
        }

        const bom = '\ufeff';
        expect(() => parseExpression(`${bom}true${bom}`)).toThrow('unexpected token');
        expect(() => parseExpression('num(#value)')({ value: `${bom}2${bom}` })).toThrow('Invalid numeric value');
        expect(parseExpression('trim(#value)')({ value: `${bom}x${bom}` })).toBe(`${bom}x${bom}`);
    });

    test('converts lists to comma text and detects only active cycles', () => {
        const cyclic: any[] = [];
        cyclic.push(cyclic);
        for (const expression of [
            'concat(#value, "")', 'contains("x", #value)', 'startswith("x", #value)',
            'endswith("x", #value)', 'match(#value, "x")', 'trim(#value)', 'lower(#value)', 'upper(#value)'
        ]) {
            expect(() => parseExpression(expression)({ value: cyclic }), expression).toThrow('Cyclic list value');
        }

        const shared = [1, 2];
        const sparse = Array(3);
        sparse[1] = [null, undefined, 2];
        expect(parseExpression('concat(#value, "")')({ value: [shared, shared] })).toBe('1,2,1,2');
        expect(parseExpression('concat(#value, "")')({ value: sparse })).toBe(',,,2,');
    });

    test('returns a fresh empty list on each evaluation', () => {
        const evaluator = parseExpression('[]');
        const first = evaluator({});
        const second = evaluator({});

        expect(first).toEqual([]);
        expect(second).toEqual([]);
        expect(first).not.toBe(second);
    });
});

describe('cache lifecycle', () => {
    test('validates expression types before cache lookup', () => {
        se.SimpleExpressions.get('1');
        expect(() => se.SimpleExpressions.get(1 as any)).toThrow('unsupported type number');
        expect(() => parseExpression(true as any)).toThrow('unsupported type boolean');
    });

    test('shares Boolean cache keys with lowercase strings', () => {
        const booleanFirst = se.SimpleExpressions.get(true);
        expect(se.SimpleExpressions.get('true')).toBe(booleanFirst);

        se.SimpleExpressions.clear({ expression: true });
        const stringFirst = se.SimpleExpressions.get('false');
        expect(se.SimpleExpressions.get(false)).toBe(stringFirst);
        expect(se.SimpleExpressions.get('True')).not.toBe(se.SimpleExpressions.get(true));
    });

    test('positive cache limits do not re-enable caching', () => {
        se.SimpleExpressions.disableCaches();
        se.SimpleExpressions.setCacheLimit(10);

        expect(se.SimpleExpressions.get('true')).not.toBe(se.SimpleExpressions.get('true'));
    });

    test.each([0, -1])('invalid cache limit %s throws without changing cache state', (limit) => {
        expect(() => se.SimpleExpressions.setCacheLimit(limit)).toThrow('Cache limit must be at least 1');

        se.SimpleExpressions.enableCaches();
        expect(() => se.SimpleExpressions.setCacheLimit(limit)).toThrow('Cache limit must be at least 1');
        expect(se.SimpleExpressions.get('true')).toBe(se.SimpleExpressions.get('true'));
    });
});
