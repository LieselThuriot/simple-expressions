"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileExpression = void 0;
const operator_compiler_1 = require("./operator-compiler");
const runtime_1 = require("./runtime");
const tokenizer_1 = require("./tokenizer");
class ExpressionParser {
    constructor(expression) {
        this.tokenizer = new tokenizer_1.Tokenizer(expression);
    }
    parse() {
        const result = this.parseValue();
        if (this.tokenizer.kind !== tokenizer_1.TokenKind.End) {
            this.fail('unexpected trailing input');
        }
        return result;
    }
    parseValue() {
        switch (this.tokenizer.kind) {
            case tokenizer_1.TokenKind.String: {
                const value = this.tokenizer.value;
                this.tokenizer.next();
                return (0, runtime_1.constantEvaluator)(value);
            }
            case tokenizer_1.TokenKind.Number: {
                const value = Number(this.tokenizer.value);
                this.tokenizer.next();
                return (0, runtime_1.constantEvaluator)(value);
            }
            case tokenizer_1.TokenKind.Reference: {
                const path = this.tokenizer.value;
                this.tokenizer.next();
                return (0, runtime_1.referenceEvaluator)(path);
            }
            case tokenizer_1.TokenKind.Identifier: {
                const identifier = this.tokenizer.value;
                this.tokenizer.next();
                if (identifier.toLowerCase() === 'true') {
                    return (0, runtime_1.constantEvaluator)(true);
                }
                if (identifier.toLowerCase() === 'false') {
                    return (0, runtime_1.constantEvaluator)(false);
                }
                return this.parseCall(identifier);
            }
            case tokenizer_1.TokenKind.OpenBracket:
                return this.parseList();
            default:
                this.fail('expected an expression');
        }
    }
    parseList() {
        this.tokenizer.next();
        if (this.tokenizer.kind === tokenizer_1.TokenKind.CloseBracket) {
            this.tokenizer.next();
            return (0, runtime_1.constantEvaluator)([]);
        }
        const values = [this.parseValue()];
        while (this.tokenizer.kind === tokenizer_1.TokenKind.Comma) {
            this.tokenizer.next();
            values.push(this.parseValue());
        }
        if (this.tokenizer.kind !== tokenizer_1.TokenKind.CloseBracket) {
            this.fail('expected closing bracket');
        }
        this.tokenizer.next();
        return (model) => values.map((value) => value(model));
    }
    parseCall(operator) {
        if (this.tokenizer.kind !== tokenizer_1.TokenKind.OpenParen) {
            this.fail('invalid operator: ' + operator);
        }
        const normalizedOperator = operator.toLowerCase();
        const arity = (0, operator_compiler_1.getOperatorArity)(normalizedOperator);
        if (arity === undefined) {
            this.fail('invalid operator: ' + normalizedOperator);
        }
        this.tokenizer.next();
        if (this.tokenizer.kind === tokenizer_1.TokenKind.CloseParen) {
            this.fail('missing operator argument');
        }
        const left = this.parseValue();
        if (arity === 1) {
            if (this.tokenizer.kind !== tokenizer_1.TokenKind.CloseParen) {
                this.fail('operator ' + operator + ' expects one argument');
            }
            this.tokenizer.next();
            return (0, operator_compiler_1.compileOperator)(normalizedOperator, [left]);
        }
        if (arity === 'variadic') {
            if (this.tokenizer.kind !== tokenizer_1.TokenKind.Comma) {
                if (this.tokenizer.kind !== tokenizer_1.TokenKind.CloseParen || !(0, operator_compiler_1.supportsSingleListArgument)(normalizedOperator)) {
                    this.fail('operator ' + operator + ' expects at least two arguments');
                }
                this.tokenizer.next();
                return (0, operator_compiler_1.compileOperator)(normalizedOperator, [left]);
            }
            const values = [left];
            while (this.tokenizer.kind === tokenizer_1.TokenKind.Comma) {
                this.tokenizer.next();
                values.push(this.parseValue());
            }
            if (this.tokenizer.kind !== tokenizer_1.TokenKind.CloseParen) {
                this.fail('operator ' + operator + ' expects at least two arguments');
            }
            this.tokenizer.next();
            return (0, operator_compiler_1.compileOperator)(normalizedOperator, values);
        }
        if (this.tokenizer.kind !== tokenizer_1.TokenKind.Comma) {
            this.fail('operator ' + operator + ' expects two arguments');
        }
        this.tokenizer.next();
        const right = this.parseValue();
        if (arity === 2) {
            if (this.tokenizer.kind !== tokenizer_1.TokenKind.CloseParen) {
                this.fail('operator ' + operator + ' expects two arguments');
            }
            this.tokenizer.next();
            return (0, operator_compiler_1.compileOperator)(normalizedOperator, [left, right]);
        }
        if (this.tokenizer.kind !== tokenizer_1.TokenKind.Comma) {
            this.fail('operator ' + operator + ' expects three arguments');
        }
        this.tokenizer.next();
        const whenFalse = this.parseValue();
        if (this.tokenizer.kind !== tokenizer_1.TokenKind.CloseParen) {
            this.fail('operator ' + operator + ' expects three arguments');
        }
        this.tokenizer.next();
        return (0, operator_compiler_1.compileOperator)(normalizedOperator, [left, right, whenFalse]);
    }
    fail(message) {
        throw new Error('Invalid Expression at ' + this.tokenizer.position + ': ' + message);
    }
}
const compileExpression = (expression) => new ExpressionParser(expression).parse();
exports.compileExpression = compileExpression;
