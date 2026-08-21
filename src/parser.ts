import { compileOperator, getOperatorArity, supportsSingleListArgument } from './operator-compiler';
import { Evaluator, constantEvaluator, referenceEvaluator } from './runtime';
import { TokenKind, Tokenizer } from './tokenizer';

class ExpressionParser {
    private readonly tokenizer: Tokenizer;

    public constructor(expression: string) {
        this.tokenizer = new Tokenizer(expression);
    }

    public parse(): Evaluator {
        const result = this.parseValue();
        if (this.tokenizer.kind !== TokenKind.End) {
            this.fail('unexpected trailing input');
        }
        return result;
    }

    private parseValue(): Evaluator {
        switch (this.tokenizer.kind) {
            case TokenKind.String: {
                const value = this.tokenizer.value;
                this.tokenizer.next();
                return constantEvaluator(value);
            }
            case TokenKind.Number: {
                const value = Number(this.tokenizer.value);
                this.tokenizer.next();
                return constantEvaluator(value);
            }
            case TokenKind.Reference: {
                const path = this.tokenizer.value;
                this.tokenizer.next();
                return referenceEvaluator(path);
            }
            case TokenKind.Identifier: {
                const identifier = this.tokenizer.value;
                this.tokenizer.next();

                if (identifier.toLowerCase() === 'true') {
                    return constantEvaluator(true);
                }
                if (identifier.toLowerCase() === 'false') {
                    return constantEvaluator(false);
                }

                return this.parseCall(identifier);
            }
            case TokenKind.OpenBracket:
                return this.parseList();
            default:
                this.fail('expected an expression');
        }
    }

    private parseList(): Evaluator {
        this.tokenizer.next();

        if (this.tokenizer.kind === TokenKind.CloseBracket) {
            this.tokenizer.next();
            return constantEvaluator([]);
        }

        const values: Evaluator[] = [this.parseValue()];
        while (this.tokenizer.kind === TokenKind.Comma) {
            this.tokenizer.next();
            values.push(this.parseValue());
        }

        if ((this.tokenizer.kind as TokenKind) !== TokenKind.CloseBracket) {
            this.fail('expected closing bracket');
        }
        this.tokenizer.next();

        return (model) => values.map((value) => value(model));
    }

    private parseCall(operator: string): Evaluator {
        if (this.tokenizer.kind !== TokenKind.OpenParen) {
            this.fail('invalid operator: ' + operator);
        }

        const normalizedOperator = operator.toLowerCase();
        const arity = getOperatorArity(normalizedOperator);
        if (arity === undefined) {
            this.fail('invalid operator: ' + normalizedOperator);
        }
        this.tokenizer.next();

        if ((this.tokenizer.kind as TokenKind) === TokenKind.CloseParen) {
            this.fail('missing operator argument');
        }

        const left = this.parseValue();

        if (arity === 1) {
            if ((this.tokenizer.kind as TokenKind) !== TokenKind.CloseParen) {
                this.fail('operator ' + operator + ' expects one argument');
            }
            this.tokenizer.next();
            return compileOperator(normalizedOperator, [left]);
        }

        if (arity === 'variadic') {
            if ((this.tokenizer.kind as TokenKind) !== TokenKind.Comma) {
                if ((this.tokenizer.kind as TokenKind) !== TokenKind.CloseParen || !supportsSingleListArgument(normalizedOperator)) {
                    this.fail('operator ' + operator + ' expects at least two arguments');
                }

                this.tokenizer.next();
                return compileOperator(normalizedOperator, [left]);
            }

            const values: Evaluator[] = [left];
            while ((this.tokenizer.kind as TokenKind) === TokenKind.Comma) {
                this.tokenizer.next();
                values.push(this.parseValue());
            }

            if ((this.tokenizer.kind as TokenKind) !== TokenKind.CloseParen) {
                this.fail('operator ' + operator + ' expects at least two arguments');
            }
            this.tokenizer.next();
            return compileOperator(normalizedOperator, values);
        }

        if ((this.tokenizer.kind as TokenKind) !== TokenKind.Comma) {
            this.fail('operator ' + operator + ' expects two arguments');
        }
        this.tokenizer.next();

        const right = this.parseValue();

        if (arity === 2) {
            if ((this.tokenizer.kind as TokenKind) !== TokenKind.CloseParen) {
                this.fail('operator ' + operator + ' expects two arguments');
            }
            this.tokenizer.next();
            return compileOperator(normalizedOperator, [left, right]);
        }

        if ((this.tokenizer.kind as TokenKind) !== TokenKind.Comma) {
            this.fail('operator ' + operator + ' expects three arguments');
        }
        this.tokenizer.next();

        const whenFalse = this.parseValue();
        if ((this.tokenizer.kind as TokenKind) !== TokenKind.CloseParen) {
            this.fail('operator ' + operator + ' expects three arguments');
        }
        this.tokenizer.next();
        return compileOperator(normalizedOperator, [left, right, whenFalse]);
    }

    private fail(message: string): never {
        throw new Error('Invalid Expression at ' + this.tokenizer.position + ': ' + message);
    }
}

export const compileExpression = (expression: string): Evaluator => new ExpressionParser(expression).parse();
