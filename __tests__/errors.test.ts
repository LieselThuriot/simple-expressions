import { describe, expect, it } from 'vitest';
import { ExpressionEvaluationException, ExpressionParseException, parseExpression } from '../src/index';

describe('exceptions', () => {
    it('reports parse failures as ExpressionParseException', () => {
        for (const expression of ['1e309', 'eq(1', 'match(#a, "(")', 'nope(1)']) {
            expect(() => parseExpression(expression), expression).toThrow(ExpressionParseException);
        }
    });

    it('reports ternary arity as three arguments', () => {
        expect(() => parseExpression('if(1)')).toThrow('expects three arguments');
        expect(() => parseExpression('clamp(1)')).toThrow('expects three arguments');
        expect(() => parseExpression('eq(1)')).toThrow('expects two arguments');
    });

    it('reports runtime failures as ExpressionEvaluationException', () => {
        expect(() => parseExpression('num("x")')({})).toThrow(ExpressionEvaluationException);
        expect(() => parseExpression('div(1, 0)')({})).toThrow(ExpressionEvaluationException);
        expect(() => parseExpression('match("a", #p)')({ p: '(' })).toThrow(ExpressionEvaluationException);
    });

    it('evaluates match input before the pattern', () => {
        expect(() => parseExpression('match(num("x"), #p)')({ p: 1 })).toThrow('Invalid numeric value');
    });

    it('keeps unsupported input as TypeError', () => {
        expect(() => parseExpression(5 as any)).toThrow(TypeError);
    });
});
