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
    Comma,
    OpenBracket,
    CloseBracket
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
            case '[':
                this.index++;
                this._kind = TokenKind.OpenBracket;
                this._value = character;
                return;
            case ']':
                this.index++;
                this._kind = TokenKind.CloseBracket;
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
            if (character === '(' || character === ')' || character === ',' || character === '[' || character === ']' || character.charCodeAt(0) <= 32) {
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

const equals = (value1: any, value2: any, compared: WeakMap<object, WeakSet<object>> = new WeakMap()): boolean => {
    if (value1 === value2) {
        return true;
    }

    if (value1 !== null && typeof value1 === 'object' && value2 !== null && typeof value2 === 'object') {
        let counterparts = compared.get(value1);
        if (counterparts?.has(value2)) {
            return true;
        }
        if (!counterparts) {
            counterparts = new WeakSet<object>();
            compared.set(value1, counterparts);
        }
        counterparts.add(value2);

        if (Array.isArray(value1) && Array.isArray(value2)) {
            return value1.length === value2.length && value1.every((item, index) => equals(item, value2[index], compared));
        }

        if (!Array.isArray(value1) && !Array.isArray(value2)) {
            const keys1 = Object.keys(value1);
            const keys2 = Object.keys(value2);
            return keys1.length === keys2.length && keys1.every((key) =>
                Object.prototype.hasOwnProperty.call(value2, key) && equals(value1[key], value2[key], compared));
        }
    }

    return value1 == value2;
};
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

const inList = (value: any, list: any): boolean => {
    return Array.isArray(list) && list.some((item) => equals(value, item));
};

const lower = (value: any): string => regexInput(value).toLowerCase();

const upper = (value: any): string => regexInput(value).toUpperCase();

const trim = (value: any): any => {
    if (value === null || value === undefined) {
        return value;
    }

    return regexInput(value).trim();
};

const defined = (value: any): boolean => value !== null && value !== undefined;

const toNumber = (value: any, strict: boolean = false): number => {
    const result = Number(value);
    if (strict && typeof value === 'string' && (value.trim() === '' || Number.isNaN(result))) {
        throw new Error('Invalid numeric value');
    }
    return result;
};

const expandNumericValues = (operator: string, values: Evaluator[], model: Model): any[] => {
    const expanded: any[] = [];
    for (const value of values) {
        const result = value(model);
        if (values.length === 1 && !Array.isArray(result)) {
            throw new Error('Invalid Expression: operator ' + operator + ' expects at least two arguments');
        }
        if (Array.isArray(result)) {
            expanded.push(...result);
        } else {
            expanded.push(result);
        }
    }
    return expanded;
};

const int = (value: any): number => Math.trunc(toNumber(value, true));
const abs = (value: any): number => Math.abs(toNumber(value, true));
const floor = (value: any): number => Math.floor(toNumber(value, true));
const ceil = (value: any): number => Math.ceil(toNumber(value, true));
const sqrt = (value: any): number => Math.sqrt(toNumber(value, true));
const round = (value: any, decimals: any): number => {
    const places = toNumber(decimals, true);
    if (!Number.isSafeInteger(places) || places < 0) {
        throw new Error('Round precision must be a non-negative safe integer');
    }
    const factor = 10 ** places;
    if (!Number.isFinite(factor)) {
        throw new Error('Round precision is too large');
    }
    return Math.round(toNumber(value, true) * factor) / factor;
};
const power = (value: any, exponent: any): number => Math.pow(toNumber(value, true), toNumber(exponent, true));
const clamp = (value: any, minimum: any, maximum: any): number => Math.min(Math.max(toNumber(value, true), toNumber(minimum, true)), toNumber(maximum, true));

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
                if ((this.tokenizer.kind as TokenKind) !== TokenKind.CloseParen || !this.supportsSingleListArgument(normalizedOperator)) {
                    this.fail('operator ' + operator + ' expects at least two arguments');
                }

                this.tokenizer.next();
                return this.compileVariadic(normalizedOperator, [left]);
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
            case 'trim':
            case 'defined':
            case 'int':
            case 'num':
            case 'abs':
            case 'floor':
            case 'ceil':
            case 'sqrt':
                return 1;
            case 'eq':
            case 'contains':
            case 'startswith':
            case 'endswith':
            case 'gt':
            case 'lt':
            case 'match':
            case 'in':
            case 'round':
            case 'pow':
                return 2;
            case 'clamp':
                return 3;
            case 'or':
            case 'and':
            case 'concat':
            case 'add':
            case 'sub':
            case 'mul':
            case 'div':
            case 'mod':
            case 'min':
            case 'max':
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
            case 'trim':
                return (model) => trim(inner(model));
            case 'defined':
                return (model) => defined(inner(model));
            case 'int':
                return (model) => int(inner(model));
            case 'num':
                return (model) => toNumber(inner(model), true);
            case 'abs':
                return (model) => abs(inner(model));
            case 'floor':
                return (model) => floor(inner(model));
            case 'ceil':
                return (model) => ceil(inner(model));
            case 'sqrt':
                return (model) => sqrt(inner(model));
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
            case 'in':
                return (model) => inList(left(model), right(model));
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
            case 'round':
                return (model) => round(left(model), right(model));
            case 'pow':
                return (model) => power(left(model), right(model));
            default:
                this.fail('invalid operator: ' + operator);
        }
    }

    private supportsSingleListArgument(operator: string): boolean {
        return operator === 'add' || operator === 'mul' || operator === 'min' || operator === 'max';
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
            case 'add':
                return (model) => expandNumericValues(operator, values, model).reduce((result, value) => result + toNumber(value, true), 0);
            case 'sub':
        return (model) => values.slice(1).reduce((result, value) => result - toNumber(value(model), true), toNumber(values[0]!(model), true));
            case 'mul':
                return (model) => expandNumericValues(operator, values, model).reduce((result, value) => result * toNumber(value, true), 1);
            case 'div':
                return (model) => values.slice(1).reduce((result, value) => {
                const divisor = toNumber(value(model), true);
                    if (divisor === 0) {
                        throw new Error('Division by zero');
                    }
                    return result / divisor;
                }, toNumber(values[0]!(model), true));
            case 'mod':
                return (model) => values.slice(1).reduce((result, value) => {
                const divisor = toNumber(value(model), true);
                    if (divisor === 0) {
                        throw new Error('Division by zero');
                    }
                    return result % divisor;
                }, toNumber(values[0]!(model), true));
            case 'min':
                return (model) => {
                    const expanded = expandNumericValues(operator, values, model);
                    if (expanded.length === 0) {
                        throw new Error('Min requires at least one value');
                    }
                    return expanded.slice(1).reduce((result, value) => Math.min(result, toNumber(value, true)), toNumber(expanded[0], true));
                };
            case 'max':
                return (model) => {
                    const expanded = expandNumericValues(operator, values, model);
                    if (expanded.length === 0) {
                        throw new Error('Max requires at least one value');
                    }
                    return expanded.slice(1).reduce((result, value) => Math.max(result, toNumber(value, true)), toNumber(expanded[0], true));
                };
            default:
                this.fail('invalid operator: ' + operator);
        }
    }

    private compileTernary(operator: string, condition: Evaluator, whenTrue: Evaluator, whenFalse: Evaluator): Evaluator {
        switch (operator) {
            case 'if':
                return (model) => condition(model) ? whenTrue(model) : whenFalse(model);
            case 'clamp':
                return (model) => clamp(condition(model), whenTrue(model), whenFalse(model));
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
            throw new Error('Cache limit must be at least 1');
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
