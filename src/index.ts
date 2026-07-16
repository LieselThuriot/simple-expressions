type Model = { [key: string]: any; };

const unsafeReferenceSegments = new Set(['__proto__', 'constructor', 'prototype']);

interface Evaluator {
    (model: Model): any;
    hasConstantValue?: boolean;
    constantValue?: any;
}

enum TokenKind {
    End,
    Identifier,
    Number,
    String,
    Reference,
    OpenParen,
    CloseParen,
    Comma
}

class Tokenizer {
    private index: number = 0;
    private _kind: TokenKind = TokenKind.End;
    private _value: string = '';

    public constructor(private readonly source: string) {
        this.next();
    }

    public get kind(): TokenKind {
        return this._kind;
    }

    public get value(): string {
        return this._value;
    }

    public get position(): number {
        return this.index;
    }

    public next(): void {
        const length = this.source.length;

        while (this.index < length && this.source.charCodeAt(this.index) <= 32) {
            this.index++;
        }

        if (this.index >= length) {
            this._kind = TokenKind.End;
            this._value = '';
            return;
        }

        const start = this.index;
        const character = this.source.charAt(this.index);

        switch (character) {
            case '(':
                this.index++;
                this._kind = TokenKind.OpenParen;
                this._value = character;
                return;
            case ')':
                this.index++;
                this._kind = TokenKind.CloseParen;
                this._value = character;
                return;
            case ',':
                this.index++;
                this._kind = TokenKind.Comma;
                this._value = character;
                return;
            case '#':
                this.index++;
                this.readDelimitedToken();
                if (this.index === start + 1) {
                    this.fail('missing model reference');
                }
                this._kind = TokenKind.Reference;
                this._value = this.source.substring(start + 1, this.index);
                return;
            case '`':
            case '"':
            case "'":
                this.readString(character);
                return;
        }

        if (this.isIdentifierStart(character)) {
            this.index++;
            while (this.index < length && this.isIdentifierPart(this.source.charAt(this.index))) {
                this.index++;
            }
            this._kind = TokenKind.Identifier;
            this._value = this.source.substring(start, this.index);
            return;
        }

        this.readDelimitedToken();
        const value = this.source.substring(start, this.index);
        if (Tokenizer.numericPattern.test(value)) {
            this._kind = TokenKind.Number;
            this._value = value;
            return;
        }

        this.fail('unexpected token ' + value);
    }

    private static readonly numericPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

    private readDelimitedToken(): void {
        while (this.index < this.source.length) {
            const character = this.source.charAt(this.index);
            if (character === '(' || character === ')' || character === ',' || character.charCodeAt(0) <= 32) {
                return;
            }
            this.index++;
        }
    }

    private readString(quote: string): void {
        const start = this.index + 1;
        this.index++;
        let backslashCount = 0;

        while (this.index < this.source.length) {
            const character = this.source.charAt(this.index);

            if (character === '\\') {
                backslashCount++;
                this.index++;
                continue;
            }

            if (character === quote && backslashCount % 2 === 0) {
                this._kind = TokenKind.String;
                this._value = this.source.substring(start, this.index);
                this.index++;
                return;
            }

            backslashCount = 0;
            this.index++;
        }

        this.fail('unterminated string');
    }

    private isIdentifierStart(character: string): boolean {
        const code = character.charCodeAt(0);
        return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    }

    private isIdentifierPart(character: string): boolean {
        return this.isIdentifierStart(character);
    }

    private fail(message: string): never {
        throw new Error('Invalid Expression at ' + this.index + ': ' + message);
    }
}

const equals = (value1: any, value2: any): boolean => value1 == value2;
const greaterThan = (value1: any, value2: any): boolean => value1 > value2;
const lessThan = (value1: any, value2: any): boolean => value1 < value2;

const regexInput = (value: any): string => {
    return !value ? '' : typeof value === 'string' ? value : value.toString();
};

const evaluateRegex = (value: any, pattern: any): boolean => {
    if (!!pattern && typeof pattern === 'string') {
        return new RegExp(pattern).test(regexInput(value));
    }

    return false;
};

const evaluateCompiledRegex = (value: any, regex: RegExp): boolean => {
    return regex.test(regexInput(value));
};

const concat = (value1: any, value2: any): string => {
    const string1 = !!value1 ? value1.toString() : '';
    const string2 = !!value2 ? value2.toString() : '';
    return string1 + string2;
};

const contains = (value1: any, value2: any): boolean => {
    return typeof value1 === 'string' && value1.indexOf(value2) >= 0;
};

const startsWith = (value1: any, value2: any): boolean => {
    return typeof value1 === 'string' && value1.startsWith(value2);
};

const endsWith = (value1: any, value2: any): boolean => {
    return typeof value1 === 'string' && value1.endsWith(value2);
};

const lower = (value: any): string => regexInput(value).toLowerCase();

const upper = (value: any): string => regexInput(value).toUpperCase();

const len = (value: any): number => {
    if (value === undefined || value === null) {
        return 0;
    }

    if (typeof value === 'string') {
        return value.length;
    }

    if (Object.prototype.hasOwnProperty.call(value, 'length')) {
        return value.length;
    }

    throw new Error('Input does not have a length');
};

const empty = (value: any): boolean => {
    return value === undefined || value === null || (typeof value === 'string' && value.length === 0);
};

const constantEvaluator = (value: any): Evaluator => {
    const evaluator: Evaluator = () => value;
    evaluator.hasConstantValue = true;
    evaluator.constantValue = value;
    return evaluator;
};

const referenceEvaluator = (path: string): Evaluator => {
    const segments = path.split('.');

    for (const segment of segments) {
        if (!segment || unsafeReferenceSegments.has(segment)) {
            throw new Error('Invalid Expression: invalid model reference: #' + path);
        }
    }

    if (segments.length === 1) {
        return (model) => model == null || !Object.prototype.hasOwnProperty.call(model, path) ? undefined : model[path];
    }

    return (model) => {
        if (model == null) {
            return undefined;
        }

        if (Object.prototype.hasOwnProperty.call(model, path)) {
            return model[path];
        }

        let value: any = model;
        for (const segment of segments) {
            if (value == null || !Object.prototype.hasOwnProperty.call(value, segment)) {
                return undefined;
            }
            value = value[segment];
        }
        return value;
    };
};

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
            default:
                this.fail('expected an expression');
        }
    }

    private parseCall(operator: string): Evaluator {
        if (this.tokenizer.kind !== TokenKind.OpenParen) {
            this.fail('invalid operator: ' + operator);
        }

        const normalizedOperator = operator.toLowerCase();
        const arity = this.operatorArity(normalizedOperator);
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
            return this.compileUnary(normalizedOperator, left);
        }

        if (arity === 'variadic') {
            if ((this.tokenizer.kind as TokenKind) !== TokenKind.Comma) {
                this.fail('operator ' + operator + ' expects at least two arguments');
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
            return this.compileVariadic(normalizedOperator, values);
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
            return this.compileBinary(normalizedOperator, left, right);
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
        return this.compileTernary(normalizedOperator, left, right, whenFalse);
    }

    private operatorArity(operator: string): 1 | 2 | 3 | 'variadic' {
        switch (operator) {
            case 'not':
            case 'empty':
            case 'len':
            case 'lower':
            case 'upper':
                return 1;
            case 'eq':
            case 'contains':
            case 'startswith':
            case 'endswith':
            case 'gt':
            case 'lt':
            case 'match':
                return 2;
            case 'or':
            case 'and':
            case 'concat':
                return 'variadic';
            case 'if':
                return 3;
            default:
                this.fail('invalid operator: ' + operator);
        }
    }

    private compileUnary(operator: string, inner: Evaluator): Evaluator {
        switch (operator) {
            case 'not':
                return (model) => !inner(model);
            case 'empty':
                return (model) => empty(inner(model));
            case 'len':
                return (model) => len(inner(model));
            case 'lower':
                return (model) => lower(inner(model));
            case 'upper':
                return (model) => upper(inner(model));
            default:
                this.fail('invalid operator: ' + operator);
        }
    }

    private compileBinary(operator: string, left: Evaluator, right: Evaluator): Evaluator {
        switch (operator) {
            case 'eq':
                return (model) => equals(left(model), right(model));
            case 'contains':
                return (model) => contains(left(model), right(model));
            case 'startswith':
                return (model) => startsWith(left(model), right(model));
            case 'endswith':
                return (model) => endsWith(left(model), right(model));
            case 'gt':
                return (model) => greaterThan(left(model), right(model));
            case 'lt':
                return (model) => lessThan(left(model), right(model));
            case 'match':
                if (right.hasConstantValue && !!right.constantValue && typeof right.constantValue === 'string') {
                    const regex = new RegExp(right.constantValue);
                    return (model) => evaluateCompiledRegex(left(model), regex);
                }
                return (model) => evaluateRegex(left(model), right(model));
            default:
                this.fail('invalid operator: ' + operator);
        }
    }

    private compileVariadic(operator: string, values: Evaluator[]): Evaluator {
        switch (operator) {
            case 'or':
                return (model) => {
                    for (const value of values) {
                        if (!!value(model)) {
                            return true;
                        }
                    }
                    return false;
                };
            case 'and':
                return (model) => {
                    for (const value of values) {
                        if (!value(model)) {
                            return false;
                        }
                    }
                    return true;
                };
            case 'concat':
                if (values.every((value) => value.hasConstantValue)) {
                    return constantEvaluator(values.reduce((result, value) => concat(result, value.constantValue), ''));
                }
                return (model) => {
                    let result = '';
                    for (const value of values) {
                        result = concat(result, value(model));
                    }
                    return result;
                };
            default:
                this.fail('invalid operator: ' + operator);
        }
    }

    private compileTernary(operator: string, condition: Evaluator, whenTrue: Evaluator, whenFalse: Evaluator): Evaluator {
        switch (operator) {
            case 'if':
                return (model) => condition(model) ? whenTrue(model) : whenFalse(model);
            default:
                this.fail('invalid operator: ' + operator);
        }
    }

    private fail(message: string): never {
        throw new Error('Invalid Expression at ' + this.tokenizer.position + ': ' + message);
    }
}

const compileExpression = (expression: string): Evaluator => new ExpressionParser(expression).parse();

export class SimpleExpressions {
    private static _cacheLimit: number = 1000;

    /** @internal */
    private static _enabledCaches: boolean = true;

    /** @internal */
    private static _parseCache: Map<string, Evaluator> = new Map<string, Evaluator>();

    /** @internal */
    private static _simpleCache: Map<string, SimpleExpression> = new Map<string, SimpleExpression>();

    /** @internal */
    static get(e: string | boolean): SimpleExpression {
        const key = '' + e;
        if (this._enabledCaches) {
            const cachedExpression = this._simpleCache.get(key);
            if (cachedExpression !== undefined) {
                return cachedExpression;
            }
        }

        const result = new SimpleExpression(e);

        if (this._enabledCaches) {
            this.setCacheValue(this._simpleCache, key, result);
        }

        return result;
    }

    /** @internal */
    static getParsedExpression(expression: string, factory: (value: string) => Evaluator): Evaluator {
        expression = expression.trim();

        if (expression === '') {
            throw new Error('Invalid Expression: formatting');
        }

        if (this._enabledCaches) {
            const cachedExpression = this._parseCache.get(expression);
            if (cachedExpression !== undefined) {
                return cachedExpression;
            }
        }

        const parsedResult = factory(expression);

        if (this._enabledCaches) {
            this.setCacheValue(this._parseCache, expression, parsedResult);
        }

        return parsedResult;
    }

    public static clear(options?: { parsed?: boolean, expression?: boolean }): void {
        if (!options) {
            options = { parsed: true, expression: true };
        }

        if (options.parsed) {
            this._parseCache.clear();
        }

        if (options.expression) {
            this._simpleCache.clear();
        }
    }

    public static disableCaches(): void {
        this._enabledCaches = false;
        this.clear();
    }

    public static enableCaches(): void {
        this._enabledCaches = true;
    }

    public static setCacheLimit(limit: number): void {
        if (!Number.isSafeInteger(limit)) {
            throw new Error('Cache limit must be a safe integer');
        }

        if (limit <= 0) {
            this.disableCaches();
            return;
        }

        this._cacheLimit = limit;
        this.trimCache(this._parseCache);
        this.trimCache(this._simpleCache);
    }

    private static setCacheValue<T>(cache: Map<string, T>, key: string, value: T): void {
        if (cache.size >= this._cacheLimit) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey !== undefined) {
                cache.delete(oldestKey);
            }
        }
        cache.set(key, value);
    }

    private static trimCache<T>(cache: Map<string, T>): void {
        while (cache.size > this._cacheLimit) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey === undefined) {
                return;
            }
            cache.delete(oldestKey);
        }
    }
}

export const parseExpression = (expression: string): (model: Model) => any => {
    return SimpleExpressions.getParsedExpression(expression, compileExpression);
};

export const executeExpression = (model: Model, expression: string | boolean): boolean => {
    return SimpleExpressions.get(expression).evaluate(model);
};

export class SimpleExpression {
    /** @internal */
    private readonly _parsedExpression: Evaluator;

    public constructor(expression: string | boolean) {
        if (typeof expression === 'boolean') {
            this._parsedExpression = constantEvaluator(expression);
            return;
        }

        if (typeof expression !== 'string') {
            throw new Error('Invalid Expression: unsupported type' + (typeof expression));
        }

        const normalizedExpression = expression.trim();
        if (!normalizedExpression) {
            throw new Error('Invalid Expression: whitespace');
        }

        this._parsedExpression = parseExpression(normalizedExpression);
    }

    public evaluate(model: Model): boolean {
        return !!this._parsedExpression(model);
    }
}
