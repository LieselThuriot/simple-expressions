import { describe, expect, test } from 'vitest';
import { parseExpression } from '..';

const evaluate = (expression: string, model: Record<string, any> = {}): any => parseExpression(expression)(model);

describe('numeric scalar validation', () => {
    test.each([
        'int(#value)', 'num(#value)', 'abs(#value)', 'floor(#value)', 'ceil(#value)', 'sqrt(#value)',
        'round(#value, 2)', 'round(1, #value)', 'pow(#value, 2)', 'pow(2, #value)',
        'clamp(#value, 0, 2)', 'clamp(1, #value, 2)', 'clamp(1, 0, #value)',
        'add(#value, 1)', 'sub(#value, 1)', 'mul(#value, 1)', 'div(#value, 1)',
        'mod(#value, 1)', 'min(#value, 1)', 'max(#value, 1)'
    ])('%s rejects nonnumeric scalar inputs', (expression) => {
        const invalidValues = [true, false, null, undefined, {}, ' ', 'nope', NaN, Infinity, -Infinity];
        for (const value of invalidValues) {
            expect(() => evaluate(expression, { value }), `${expression} should reject ${String(value)}`).toThrow('Invalid numeric value');
        }
    });

    test.each(['int', 'num', 'abs', 'floor', 'ceil', 'sqrt'])('%s rejects a list scalar input', (operator) => {
        expect(() => evaluate(`${operator}(#value)`, { value: [] })).toThrow('Invalid numeric value');
    });

    test('accepts finite numbers and finite numeric strings', () => {
        expect(evaluate('add(#values)', { values: [1, ' 2.5 ', '-3e1'] })).toBe(-26.5);
    });

    test('permits operations themselves to produce nonfinite results', () => {
        expect(evaluate('sqrt(-1)')).toBeNaN();
        expect(evaluate('pow(1e308, 2)')).toBe(Infinity);
        expect(evaluate('add(1e308, 1e308)')).toBe(Infinity);
        expect(evaluate('mul(1e308, 1e308)')).toBe(Infinity);
        expect(evaluate('sub(-1e308, 1e308)')).toBe(-Infinity);
        expect(evaluate('div(1e308, 1e-308)')).toBe(Infinity);
    });

    test.each([
        'abs(sqrt(-1))',
        'add(pow(1e308, 2), 1)',
        'mul(1, sqrt(-1))',
        'round(pow(1e308, 2), 2)',
        'clamp(sqrt(-1), 0, 1)'
    ])('rejects a nonfinite result consumed by an outer numeric operator: %s', (expression) => {
        expect(() => evaluate(expression)).toThrow('Invalid numeric value');
    });

    test.each([
        ['add(1e308, 1e308, -1e308)', Infinity],
        ['sub(-1e308, 1e308, -1e308)', -Infinity],
        ['mul(1e308, 1e308, 0)', NaN],
        ['div(1e308, 1e-308, 2)', Infinity]
    ])('does not revalidate a nonfinite intermediate arithmetic result: %s', (expression, expected) => {
        expect(evaluate(expression)).toBe(expected);
    });
});

describe('arithmetic list expansion', () => {
    test.each([
        ['add', 10], ['sub', -8], ['mul', 24], ['div', 0.041666666666666664], ['mod', 1], ['min', 1], ['max', 4]
    ] as const)('%s recursively flattens arguments depth-first', (operator, expected) => {
        expect(evaluate(`${operator}(#values)`, { values: [1, [2, [3]], 4] })).toBe(expected);
    });

    test('accepts list-producing references and expressions as single arguments', () => {
        const model = { values: [1, [2, 3]], fallback: [4, 5] };
        expect(evaluate('add(#values)', model)).toBe(6);
        expect(evaluate('add(if(true, #values, #fallback))', model)).toBe(6);
        expect(evaluate('mul(if(false, #values, #fallback))', model)).toBe(20);
    });

    test('applies flattened cardinality and identity rules', () => {
        expect(evaluate('add([])')).toBe(0);
        expect(evaluate('mul([])')).toBe(1);
        expect(() => evaluate('sub([1])')).toThrow('Sub requires at least two values');
        expect(() => evaluate('div([1, []])')).toThrow('Div requires at least two values');
        expect(() => evaluate('mod([[], 1])')).toThrow('Mod requires at least two values');
        expect(() => evaluate('min([])')).toThrow('Min requires at least one value');
        expect(() => evaluate('max([])')).toThrow('Max requires at least one value');
    });

    test.each(['add', 'sub', 'mul', 'div', 'mod', 'min', 'max'])('%s rejects one scalar syntactic argument at runtime', (operator) => {
        expect(() => evaluate(`${operator}(1)`)).toThrow(`operator ${operator} expects at least two arguments or one list argument`);
    });

    test('rejects cyclic arrays but permits repeated noncyclic arrays', () => {
        const cycle: any[] = [1];
        cycle.push(cycle);
        const shared = [2, 3];

        expect(() => evaluate('add(#values)', { values: cycle })).toThrow('Invalid numeric value');
        expect(evaluate('add(#values)', { values: [shared, shared] })).toBe(10);
    });
});

describe('regex compilation', () => {
    test('eagerly compiles constant patterns in unselected branches', () => {
        expect(() => parseExpression('if(true, true, match("value", "["))')).toThrow();
    });
});
