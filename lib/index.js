"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleExpression = exports.executeExpression = exports.parseExpression = exports.SimpleExpressionCaches = void 0;
var SimpleExpressionCaches = /** @class */ (function () {
    function SimpleExpressionCaches() {
    }
    SimpleExpressionCaches.get = function (e) {
        var key = '' + e;
        return this._simpleCache[key] || (this._simpleCache[key] = new SimpleExpression(e));
    };
    SimpleExpressionCaches.getParsedExpression = function (expression, factory) {
        expression = expression.trim();
        if (expression === '') {
            throw new Error("Invalid Expression: formatting");
        }
        var cachedExpression = this._parseCache[expression];
        if (cachedExpression) {
            return cachedExpression;
        }
        var parsedResult = factory(expression);
        this._parseCache[expression] = parsedResult;
        return parsedResult;
    };
    SimpleExpressionCaches.clear = function (options) {
        if (!options) {
            options = {
                parsed: true,
                expression: true
            };
        }
        if (!!options.parsed) {
            this._parseCache = {
                'true': function () { return true; },
                'false': function () { return false; }
            };
        }
        if (!!options.expression) {
            this._simpleCache = {};
        }
    };
    SimpleExpressionCaches._parseCache = {
        'true': function () { return true; },
        'false': function () { return false; }
    };
    SimpleExpressionCaches._simpleCache = {};
    return SimpleExpressionCaches;
}());
exports.SimpleExpressionCaches = SimpleExpressionCaches;
exports.parseExpression = (function () {
    var equals = function (value1, value2) {
        return value1 == value2;
    };
    var greaterThan = function (value1, value2) {
        return value1 > value2;
    };
    var lessThan = function (value1, value2) {
        return value1 < value2;
    };
    var contains = function (value1, value2) {
        if (typeof value1 === 'string') {
            return value1.indexOf(value2) >= 0;
        }
        return false;
    };
    var not = function (value) {
        return !value;
    };
    var or = function (value1, value2) {
        return !!value1 || !!value2;
    };
    var and = function (value1, value2) {
        return !!value1 && !!value2;
    };
    var empty = function (value) {
        if (value === undefined || value === null) {
            return true;
        }
        if (typeof value === 'string' && value.length === 0) {
            return true;
        }
        return false;
    };
    var parseSingleBody = function (value) { return innerParseExpression(value.replace(/^\s*\(/, '').replace(/\)\s*$/, '')); };
    var parseNot = function (value) {
        var inner = parseSingleBody(value);
        return function (model) { return not(inner(model)); };
    };
    var parseEmpty = function (value) {
        var inner = parseSingleBody(value);
        return function (model) { return empty(inner(model)); };
    };
    var resolveParameters = function (value) {
        var bracketCount = 0;
        for (var i = 0; i < value.length; i++) {
            var character = value[i];
            switch (character) {
                case '(':
                    bracketCount++;
                    break;
                case ')':
                    bracketCount--;
                    break;
                case ',':
                    if (bracketCount === 1) {
                        var left = innerParseExpression(value.substring(1, i));
                        var right = innerParseExpression(value.substring(i + 1).replace(/\)?\s*$/, ''));
                        return { left: left, right: right };
                    }
                    break;
            }
        }
        throw new Error("Invalid Expression Part: " + value);
    };
    var parseEquals = function (value) {
        var parameters = resolveParameters(value);
        return function (model) { return equals(parameters.left(model), parameters.right(model)); };
    };
    var parseOr = function (value) {
        var parameters = resolveParameters(value);
        return function (model) { return or(parameters.left(model), parameters.right(model)); };
    };
    var parseAnd = function (value) {
        var parameters = resolveParameters(value);
        return function (model) { return and(parameters.left(model), parameters.right(model)); };
    };
    var parseContains = function (value) {
        var parameters = resolveParameters(value);
        return function (model) { return contains(parameters.left(model), parameters.right(model)); };
    };
    var parseGreaterThan = function (value) {
        var parameters = resolveParameters(value);
        return function (model) { return greaterThan(parameters.left(model), parameters.right(model)); };
    };
    var parseLessThan = function (value) {
        var parameters = resolveParameters(value);
        return function (model) { return lessThan(parameters.left(model), parameters.right(model)); };
    };
    var parseOperator = function (operator, body) {
        if (!operator) {
            throw new Error("Invalid Expression: no operator");
        }
        switch (operator.toLowerCase()) {
            case 'not':
                return parseNot(body);
            case 'eq':
                return parseEquals(body);
            case 'or':
                return parseOr(body);
            case 'and':
                return parseAnd(body);
            case 'contains':
                return parseContains(body);
            case 'gt':
                return parseGreaterThan(body);
            case 'lt':
                return parseLessThan(body);
            case 'empty':
                return parseEmpty(body);
            default:
                throw new Error("Invalid Operator: " + operator);
        }
    };
    var operatorRegex = /^\s*([a-zA-Z]+)\s*(\(.+?\))\s*$/;
    var stringRegex = /^\s*\"(.*)\"\s*$/;
    var parse = function (value) {
        switch (value.toLowerCase()) {
            case 'true':
                return function () { return true; };
            case 'false':
                return function () { return false; };
            default:
                var match = operatorRegex.exec(value);
                if (match) {
                    var operator = match[1];
                    var body = match[2];
                    return parseOperator(operator, body);
                }
                //return as constant since we didn't find an operator
                if (value.indexOf('#') === 0) {
                    value = value.substring(1);
                    return function (model) { return model[value]; };
                }
                var numericValue_1 = parseFloat(value);
                if (isNaN(numericValue_1)) {
                    var stringMatch = stringRegex.exec(value);
                    if (stringMatch) {
                        var stringValue_1 = stringMatch[1];
                        return function () { return stringValue_1; };
                    }
                    throw new Error("Invalid Expression: invalid constant format");
                }
                return function () { return numericValue_1; };
        }
    };
    var innerParseExpression = function (expression) {
        return SimpleExpressionCaches.getParsedExpression(expression, parse);
    };
    return innerParseExpression;
})();
exports.executeExpression = (function () {
    return function (m, e) {
        return SimpleExpressionCaches.get(e).evaluate(m);
    };
})();
var SimpleExpression = /** @class */ (function () {
    function SimpleExpression(expression) {
        this._needsFlattening = false;
        if (typeof expression === 'boolean') {
            this._parsedExpression = function () { return expression; };
        }
        else {
            if (!(typeof expression === 'string')) {
                throw new Error("Invalid Expression: unsupported type");
            }
            if (!expression) {
                throw new Error("Invalid Expression: empty");
            }
            expression = expression.replace(/(\r\n|\n|\r)/gm, '');
            expression = expression.trim();
            if (!expression) {
                throw new Error("Invalid Expression: whitespace");
            }
            if ((expression.match(/\(/g) || []).length !== (expression.match(/\)/g) || []).length) {
                throw new Error("Invalid Expression: unbalanced parenthesis");
            }
            if (expression.indexOf('.') > 0) {
                this._needsFlattening = true;
            }
            this._parsedExpression = (0, exports.parseExpression)(expression);
        }
    }
    SimpleExpression.prototype.flattenObject = function (ob) {
        var toReturn = {};
        for (var i in ob) {
            if (!ob.hasOwnProperty(i))
                continue;
            if ((typeof ob[i]) == 'object' && ob[i] !== null) {
                var flatObject = this.flattenObject(ob[i]);
                for (var x in flatObject) {
                    if (!flatObject.hasOwnProperty(x))
                        continue;
                    toReturn[i + '.' + x] = flatObject[x];
                }
            }
            else {
                toReturn[i] = ob[i];
            }
        }
        return toReturn;
    };
    SimpleExpression.prototype.evaluate = function (model) {
        if (this._needsFlattening) {
            model = this.flattenObject(model);
        }
        return !!this._parsedExpression(model);
    };
    return SimpleExpression;
}());
exports.SimpleExpression = SimpleExpression;
