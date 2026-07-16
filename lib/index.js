"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleExpression = exports.executeExpression = exports.parseExpression = exports.SimpleExpressions = void 0;
const unsafeReferenceSegments = new Set(['__proto__', 'constructor', 'prototype']);
var TokenKind;
(function (TokenKind) {
    TokenKind[TokenKind["End"] = 0] = "End";
    TokenKind[TokenKind["Identifier"] = 1] = "Identifier";
    TokenKind[TokenKind["Number"] = 2] = "Number";
    TokenKind[TokenKind["String"] = 3] = "String";
    TokenKind[TokenKind["Reference"] = 4] = "Reference";
    TokenKind[TokenKind["OpenParen"] = 5] = "OpenParen";
    TokenKind[TokenKind["CloseParen"] = 6] = "CloseParen";
    TokenKind[TokenKind["Comma"] = 7] = "Comma";
})(TokenKind || (TokenKind = {}));
class Tokenizer {
    constructor(source) {
        this.source = source;
        this.index = 0;
        this._kind = TokenKind.End;
        this._value = '';
        this.next();
    }
    get kind() {
        return this._kind;
    }
    get value() {
        return this._value;
    }
    get position() {
        return this.index;
    }
    next() {
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
    readDelimitedToken() {
        while (this.index < this.source.length) {
            const character = this.source.charAt(this.index);
            if (character === '(' || character === ')' || character === ',' || character.charCodeAt(0) <= 32) {
                return;
            }
            this.index++;
        }
    }
    readString(quote) {
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
    isIdentifierStart(character) {
        const code = character.charCodeAt(0);
        return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    }
    isIdentifierPart(character) {
        return this.isIdentifierStart(character);
    }
    fail(message) {
        throw new Error('Invalid Expression at ' + this.index + ': ' + message);
    }
}
Tokenizer.numericPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const equals = (value1, value2) => value1 == value2;
const greaterThan = (value1, value2) => value1 > value2;
const lessThan = (value1, value2) => value1 < value2;
const regexInput = (value) => {
    return !value ? '' : typeof value === 'string' ? value : value.toString();
};
const evaluateRegex = (value, pattern) => {
    if (!!pattern && typeof pattern === 'string') {
        return new RegExp(pattern).test(regexInput(value));
    }
    return false;
};
const evaluateCompiledRegex = (value, regex) => {
    return regex.test(regexInput(value));
};
const concat = (value1, value2) => {
    const string1 = !!value1 ? value1.toString() : '';
    const string2 = !!value2 ? value2.toString() : '';
    return string1 + string2;
};
const contains = (value1, value2) => {
    return typeof value1 === 'string' && value1.indexOf(value2) >= 0;
};
const startsWith = (value1, value2) => {
    return typeof value1 === 'string' && value1.startsWith(value2);
};
const endsWith = (value1, value2) => {
    return typeof value1 === 'string' && value1.endsWith(value2);
};
const lower = (value) => regexInput(value).toLowerCase();
const upper = (value) => regexInput(value).toUpperCase();
const len = (value) => {
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
const empty = (value) => {
    return value === undefined || value === null || (typeof value === 'string' && value.length === 0);
};
const constantEvaluator = (value) => {
    const evaluator = () => value;
    evaluator.hasConstantValue = true;
    evaluator.constantValue = value;
    return evaluator;
};
const referenceEvaluator = (path) => {
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
        let value = model;
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
    constructor(expression) {
        this.tokenizer = new Tokenizer(expression);
    }
    parse() {
        const result = this.parseValue();
        if (this.tokenizer.kind !== TokenKind.End) {
            this.fail('unexpected trailing input');
        }
        return result;
    }
    parseValue() {
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
    parseCall(operator) {
        if (this.tokenizer.kind !== TokenKind.OpenParen) {
            this.fail('invalid operator: ' + operator);
        }
        const normalizedOperator = operator.toLowerCase();
        const arity = this.operatorArity(normalizedOperator);
        this.tokenizer.next();
        if (this.tokenizer.kind === TokenKind.CloseParen) {
            this.fail('missing operator argument');
        }
        const left = this.parseValue();
        if (arity === 1) {
            if (this.tokenizer.kind !== TokenKind.CloseParen) {
                this.fail('operator ' + operator + ' expects one argument');
            }
            this.tokenizer.next();
            return this.compileUnary(normalizedOperator, left);
        }
        if (this.tokenizer.kind !== TokenKind.Comma) {
            this.fail('operator ' + operator + ' expects two arguments');
        }
        this.tokenizer.next();
        const right = this.parseValue();
        if (arity === 2) {
            if (this.tokenizer.kind !== TokenKind.CloseParen) {
                this.fail('operator ' + operator + ' expects two arguments');
            }
            this.tokenizer.next();
            return this.compileBinary(normalizedOperator, left, right);
        }
        if (this.tokenizer.kind !== TokenKind.Comma) {
            this.fail('operator ' + operator + ' expects three arguments');
        }
        this.tokenizer.next();
        const whenFalse = this.parseValue();
        if (this.tokenizer.kind !== TokenKind.CloseParen) {
            this.fail('operator ' + operator + ' expects three arguments');
        }
        this.tokenizer.next();
        return this.compileTernary(normalizedOperator, left, right, whenFalse);
    }
    operatorArity(operator) {
        switch (operator) {
            case 'not':
            case 'empty':
            case 'len':
            case 'lower':
            case 'upper':
                return 1;
            case 'eq':
            case 'or':
            case 'and':
            case 'contains':
            case 'startswith':
            case 'endswith':
            case 'gt':
            case 'lt':
            case 'match':
            case 'concat':
                return 2;
            case 'if':
                return 3;
            default:
                this.fail('invalid operator: ' + operator);
        }
    }
    compileUnary(operator, inner) {
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
    compileBinary(operator, left, right) {
        switch (operator) {
            case 'eq':
                return (model) => equals(left(model), right(model));
            case 'or':
                return (model) => !!left(model) || !!right(model);
            case 'and':
                return (model) => !!left(model) && !!right(model);
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
            case 'concat':
                if (left.hasConstantValue && right.hasConstantValue) {
                    return constantEvaluator(concat(left.constantValue, right.constantValue));
                }
                return (model) => concat(left(model), right(model));
            default:
                this.fail('invalid operator: ' + operator);
        }
    }
    compileTernary(operator, condition, whenTrue, whenFalse) {
        switch (operator) {
            case 'if':
                return (model) => condition(model) ? whenTrue(model) : whenFalse(model);
            default:
                this.fail('invalid operator: ' + operator);
        }
    }
    fail(message) {
        throw new Error('Invalid Expression at ' + this.tokenizer.position + ': ' + message);
    }
}
const compileExpression = (expression) => new ExpressionParser(expression).parse();
class SimpleExpressions {
    static get(e) {
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
    static getParsedExpression(expression, factory) {
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
    static clear(options) {
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
    static disableCaches() {
        this._enabledCaches = false;
        this.clear();
    }
    static enableCaches() {
        this._enabledCaches = true;
    }
    static setCacheLimit(limit) {
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
    static setCacheValue(cache, key, value) {
        if (cache.size >= this._cacheLimit) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey !== undefined) {
                cache.delete(oldestKey);
            }
        }
        cache.set(key, value);
    }
    static trimCache(cache) {
        while (cache.size > this._cacheLimit) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey === undefined) {
                return;
            }
            cache.delete(oldestKey);
        }
    }
}
exports.SimpleExpressions = SimpleExpressions;
SimpleExpressions._cacheLimit = 1000;
SimpleExpressions._enabledCaches = true;
SimpleExpressions._parseCache = new Map();
SimpleExpressions._simpleCache = new Map();
const parseExpression = (expression) => {
    return SimpleExpressions.getParsedExpression(expression, compileExpression);
};
exports.parseExpression = parseExpression;
const executeExpression = (model, expression) => {
    return SimpleExpressions.get(expression).evaluate(model);
};
exports.executeExpression = executeExpression;
class SimpleExpression {
    constructor(expression) {
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
        this._parsedExpression = (0, exports.parseExpression)(normalizedExpression);
    }
    evaluate(model) {
        return !!this._parsedExpression(model);
    }
}
exports.SimpleExpression = SimpleExpression;
