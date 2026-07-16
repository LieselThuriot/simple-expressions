"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleExpression = exports.executeExpression = exports.parseExpression = exports.SimpleExpressions = void 0;
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
var Tokenizer = (function () {
    function Tokenizer(source) {
        this.source = source;
        this.index = 0;
        this._kind = TokenKind.End;
        this._value = '';
        this.next();
    }
    Object.defineProperty(Tokenizer.prototype, "kind", {
        get: function () {
            return this._kind;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Tokenizer.prototype, "value", {
        get: function () {
            return this._value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Tokenizer.prototype, "position", {
        get: function () {
            return this.index;
        },
        enumerable: false,
        configurable: true
    });
    Tokenizer.prototype.next = function () {
        var length = this.source.length;
        while (this.index < length && this.source.charCodeAt(this.index) <= 32) {
            this.index++;
        }
        if (this.index >= length) {
            this._kind = TokenKind.End;
            this._value = '';
            return;
        }
        var start = this.index;
        var character = this.source.charAt(this.index);
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
        var value = this.source.substring(start, this.index);
        if (Tokenizer.numericPattern.test(value)) {
            this._kind = TokenKind.Number;
            this._value = value;
            return;
        }
        this.fail('unexpected token ' + value);
    };
    Tokenizer.prototype.readDelimitedToken = function () {
        while (this.index < this.source.length) {
            var character = this.source.charAt(this.index);
            if (character === '(' || character === ')' || character === ',' || character.charCodeAt(0) <= 32) {
                return;
            }
            this.index++;
        }
    };
    Tokenizer.prototype.readString = function (quote) {
        var start = this.index + 1;
        this.index++;
        var backslashCount = 0;
        while (this.index < this.source.length) {
            var character = this.source.charAt(this.index);
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
    };
    Tokenizer.prototype.isIdentifierStart = function (character) {
        var code = character.charCodeAt(0);
        return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    };
    Tokenizer.prototype.isIdentifierPart = function (character) {
        return this.isIdentifierStart(character);
    };
    Tokenizer.prototype.fail = function (message) {
        throw new Error('Invalid Expression at ' + this.index + ': ' + message);
    };
    Tokenizer.numericPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
    return Tokenizer;
}());
var equals = function (value1, value2) { return value1 == value2; };
var greaterThan = function (value1, value2) { return value1 > value2; };
var lessThan = function (value1, value2) { return value1 < value2; };
var regexInput = function (value) {
    return !value ? '' : typeof value === 'string' ? value : value.toString();
};
var evaluateRegex = function (value, pattern) {
    if (!!pattern && typeof pattern === 'string') {
        return new RegExp(pattern).test(regexInput(value));
    }
    return false;
};
var evaluateCompiledRegex = function (value, regex) {
    return regex.test(regexInput(value));
};
var concat = function (value1, value2) {
    var string1 = !!value1 ? value1.toString() : '';
    var string2 = !!value2 ? value2.toString() : '';
    return string1 + string2;
};
var contains = function (value1, value2) {
    return typeof value1 === 'string' && value1.indexOf(value2) >= 0;
};
var len = function (value) {
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
var empty = function (value) {
    return value === undefined || value === null || (typeof value === 'string' && value.length === 0);
};
var constantEvaluator = function (value) {
    var evaluator = function () { return value; };
    evaluator.hasConstantValue = true;
    evaluator.constantValue = value;
    return evaluator;
};
var referenceEvaluator = function (path) {
    var segments = path.split('.');
    for (var _i = 0, segments_1 = segments; _i < segments_1.length; _i++) {
        var segment = segments_1[_i];
        if (!segment) {
            throw new Error('Invalid Expression: invalid model reference: #' + path);
        }
    }
    if (segments.length === 1) {
        return function (model) { return model == null ? undefined : model[path]; };
    }
    return function (model) {
        if (model == null) {
            return undefined;
        }
        if (Object.prototype.hasOwnProperty.call(model, path)) {
            return model[path];
        }
        var value = model;
        for (var _i = 0, segments_2 = segments; _i < segments_2.length; _i++) {
            var segment = segments_2[_i];
            if (value == null) {
                return undefined;
            }
            value = value[segment];
        }
        return value;
    };
};
var ExpressionParser = (function () {
    function ExpressionParser(expression) {
        this.tokenizer = new Tokenizer(expression);
    }
    ExpressionParser.prototype.parse = function () {
        var result = this.parseValue();
        if (this.tokenizer.kind !== TokenKind.End) {
            this.fail('unexpected trailing input');
        }
        return result;
    };
    ExpressionParser.prototype.parseValue = function () {
        switch (this.tokenizer.kind) {
            case TokenKind.String: {
                var value = this.tokenizer.value;
                this.tokenizer.next();
                return constantEvaluator(value);
            }
            case TokenKind.Number: {
                var value = Number(this.tokenizer.value);
                this.tokenizer.next();
                return constantEvaluator(value);
            }
            case TokenKind.Reference: {
                var path = this.tokenizer.value;
                this.tokenizer.next();
                return referenceEvaluator(path);
            }
            case TokenKind.Identifier: {
                var identifier = this.tokenizer.value;
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
    };
    ExpressionParser.prototype.parseCall = function (operator) {
        if (this.tokenizer.kind !== TokenKind.OpenParen) {
            this.fail('invalid operator: ' + operator);
        }
        var normalizedOperator = operator.toLowerCase();
        var arity = this.operatorArity(normalizedOperator);
        this.tokenizer.next();
        if (this.tokenizer.kind === TokenKind.CloseParen) {
            this.fail('missing operator argument');
        }
        var left = this.parseValue();
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
        var right = this.parseValue();
        if (this.tokenizer.kind !== TokenKind.CloseParen) {
            this.fail('operator ' + operator + ' expects two arguments');
        }
        this.tokenizer.next();
        return this.compileBinary(normalizedOperator, left, right);
    };
    ExpressionParser.prototype.operatorArity = function (operator) {
        switch (operator) {
            case 'not':
            case 'empty':
            case 'len':
                return 1;
            case 'eq':
            case 'or':
            case 'and':
            case 'contains':
            case 'gt':
            case 'lt':
            case 'match':
            case 'concat':
                return 2;
            default:
                this.fail('invalid operator: ' + operator);
        }
    };
    ExpressionParser.prototype.compileUnary = function (operator, inner) {
        switch (operator) {
            case 'not':
                return function (model) { return !inner(model); };
            case 'empty':
                return function (model) { return empty(inner(model)); };
            case 'len':
                return function (model) { return len(inner(model)); };
            default:
                this.fail('invalid operator: ' + operator);
        }
    };
    ExpressionParser.prototype.compileBinary = function (operator, left, right) {
        switch (operator) {
            case 'eq':
                return function (model) { return equals(left(model), right(model)); };
            case 'or':
                return function (model) { return !!left(model) || !!right(model); };
            case 'and':
                return function (model) { return !!left(model) && !!right(model); };
            case 'contains':
                return function (model) { return contains(left(model), right(model)); };
            case 'gt':
                return function (model) { return greaterThan(left(model), right(model)); };
            case 'lt':
                return function (model) { return lessThan(left(model), right(model)); };
            case 'match':
                if (right.hasConstantValue && !!right.constantValue && typeof right.constantValue === 'string') {
                    var regex_1 = new RegExp(right.constantValue);
                    return function (model) { return evaluateCompiledRegex(left(model), regex_1); };
                }
                return function (model) { return evaluateRegex(left(model), right(model)); };
            case 'concat':
                if (left.hasConstantValue && right.hasConstantValue) {
                    return constantEvaluator(concat(left.constantValue, right.constantValue));
                }
                return function (model) { return concat(left(model), right(model)); };
            default:
                this.fail('invalid operator: ' + operator);
        }
    };
    ExpressionParser.prototype.fail = function (message) {
        throw new Error('Invalid Expression at ' + this.tokenizer.position + ': ' + message);
    };
    return ExpressionParser;
}());
var compileExpression = function (expression) { return new ExpressionParser(expression).parse(); };
var SimpleExpressions = (function () {
    function SimpleExpressions() {
    }
    SimpleExpressions.get = function (e) {
        var key = '' + e;
        if (this._enabledCaches) {
            var cachedExpression = this._simpleCache[key];
            if (cachedExpression !== undefined) {
                return cachedExpression;
            }
        }
        var result = new SimpleExpression(e);
        if (this._enabledCaches) {
            this._simpleCache[key] = result;
        }
        return result;
    };
    SimpleExpressions.getParsedExpression = function (expression, factory) {
        expression = expression.trim();
        if (expression === '') {
            throw new Error('Invalid Expression: formatting');
        }
        if (this._enabledCaches) {
            var cachedExpression = this._parseCache[expression];
            if (cachedExpression !== undefined) {
                return cachedExpression;
            }
        }
        var parsedResult = factory(expression);
        if (this._enabledCaches) {
            this._parseCache[expression] = parsedResult;
        }
        return parsedResult;
    };
    SimpleExpressions.clear = function (options) {
        if (!options) {
            options = { parsed: true, expression: true };
        }
        if (options.parsed) {
            this._parseCache = Object.create(null);
        }
        if (options.expression) {
            this._simpleCache = Object.create(null);
        }
    };
    SimpleExpressions.disableCaches = function () {
        this._enabledCaches = false;
    };
    SimpleExpressions.enableCaches = function () {
        this._enabledCaches = true;
    };
    SimpleExpressions._enabledCaches = true;
    SimpleExpressions._parseCache = Object.create(null);
    SimpleExpressions._simpleCache = Object.create(null);
    return SimpleExpressions;
}());
exports.SimpleExpressions = SimpleExpressions;
var parseExpression = function (expression) {
    return SimpleExpressions.getParsedExpression(expression, compileExpression);
};
exports.parseExpression = parseExpression;
var executeExpression = function (model, expression) {
    return SimpleExpressions.get(expression).evaluate(model);
};
exports.executeExpression = executeExpression;
var SimpleExpression = (function () {
    function SimpleExpression(expression) {
        if (typeof expression === 'boolean') {
            this._parsedExpression = constantEvaluator(expression);
            return;
        }
        if (typeof expression !== 'string') {
            throw new Error('Invalid Expression: unsupported type' + (typeof expression));
        }
        var normalizedExpression = expression.trim();
        if (!normalizedExpression) {
            throw new Error('Invalid Expression: whitespace');
        }
        this._parsedExpression = (0, exports.parseExpression)(normalizedExpression);
    }
    SimpleExpression.prototype.evaluate = function (model) {
        return !!this._parsedExpression(model);
    };
    return SimpleExpression;
}());
exports.SimpleExpression = SimpleExpression;
//# sourceMappingURL=index.js.map