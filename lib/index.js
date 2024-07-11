"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleExpression = exports.executeExpression = exports.parseExpression = exports.SimpleExpressions = void 0;
var SimpleExpressions = (function () {
    function SimpleExpressions() {
    }
    SimpleExpressions.get = function (e) {
        var key = '' + e;
        if (this._enabledCaches) {
            var cachedExpression = this._simpleCache[key];
            if (cachedExpression) {
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
            throw new Error("Invalid Expression: formatting");
        }
        if (this._enabledCaches) {
            var cachedExpression = this._parseCache[expression];
            if (cachedExpression) {
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
    SimpleExpressions.disableCaches = function () {
        this._enabledCaches = false;
    };
    SimpleExpressions.enableChaches = function () {
        this._enabledCaches = true;
    };
    SimpleExpressions._enabledCaches = true;
    SimpleExpressions._parseCache = {
        'true': function () { return true; },
        'false': function () { return false; }
    };
    SimpleExpressions._simpleCache = {};
    return SimpleExpressions;
}());
exports.SimpleExpressions = SimpleExpressions;
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
        var constantStart = false;
        var canConstantStart = true;
        for (var i = 0; i < value.length; i++) {
            var character = value.charAt(i);
            switch (character) {
                case '(':
                    if (!constantStart) {
                        bracketCount++;
                    }
                    break;
                case ')':
                    if (!constantStart) {
                        bracketCount--;
                    }
                    break;
                case '`':
                case '"':
                case "'":
                    if (!constantStart) {
                        if (canConstantStart) {
                            constantStart = character;
                            canConstantStart = false;
                        }
                        else {
                            throw new Error("Invalid Expression: invalid constant start: " + value);
                        }
                    }
                    else if (constantStart === character) {
                        var backslashCount = 0;
                        var backslashIndex = i - 1;
                        while (backslashIndex >= 0 && value.charAt(backslashIndex) === '\\') {
                            backslashCount++;
                            backslashIndex--;
                        }
                        if (backslashCount > 0 && backslashCount % 2 !== 0) {
                        }
                        else {
                            constantStart = false;
                        }
                    }
                    break;
                case ',':
                    if (!constantStart) {
                        if (bracketCount === 1) {
                            var leftBody = value.substring(1, i);
                            var left = innerParseExpression(leftBody);
                            var rightBody = value.substring(i + 1).replace(/^\s*$/, '');
                            if (rightBody.charAt(rightBody.length - 1) !== ')') {
                                throw new Error("Invalid Expression: missing closing bracket: " + rightBody);
                            }
                            var right = innerParseExpression(rightBody.substring(0, rightBody.length - 1));
                            return { left: left, right: right };
                        }
                        canConstantStart = true;
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
    var operatorRegex = /^([a-zA-Z]+)\s*(\(.+?\))$/;
    var parse = function (value) {
        if (value.length > 1) {
            var firstChar = value.charAt(0);
            switch (firstChar) {
                case '#':
                    value = value.substring(1);
                    return function (model) { return model[value]; };
                case '`':
                case '"':
                case "'":
                    if (value.charAt(value.length - 1) === firstChar) {
                        value = value.substring(1, value.length - 1);
                        var escapeCheckRegex = new RegExp('(?:\\\\)*' + firstChar, 'g');
                        {
                            var match = void 0;
                            while ((match = escapeCheckRegex.exec(value)) !== null) {
                                var backslashCount = match[0].length - 1;
                                if (backslashCount % 2 === 0) {
                                    throw new Error("Invalid Expression: invalid escaped constant: " + value);
                                }
                            }
                        }
                        {
                            var match = value.match(/(?:\\)+$/);
                            if (match) {
                                var backslashCount = match[0].length;
                                if (backslashCount % 2 !== 0) {
                                    throw new Error("Invalid Expression: escaped constant ending: " + value);
                                }
                            }
                        }
                        return function () { return value; };
                    }
                    throw new Error("Invalid Expression: end quotes don't match starting quotes for constant: " + value);
            }
            switch (value.toLowerCase()) {
                case 'true':
                    return function () { return true; };
                case 'false':
                    return function () { return false; };
            }
            var operatorMatch = operatorRegex.exec(value);
            if (operatorMatch) {
                var operator = operatorMatch[1];
                if (!operator) {
                    throw new Error("Invalid Operator: " + operator);
                }
                var body = operatorMatch[2];
                if (!body) {
                    throw new Error("Invalid body: " + body);
                }
                return parseOperator(operator, body);
            }
        }
        var numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
            return function () { return numericValue; };
        }
        throw new Error("Invalid Expression: invalid constant format: " + value);
    };
    var innerParseExpression = function (expression) {
        return SimpleExpressions.getParsedExpression(expression, parse);
    };
    return innerParseExpression;
})();
var executeExpression = function (model, expression) {
    return SimpleExpressions.get(expression).evaluate(model);
};
exports.executeExpression = executeExpression;
var SimpleExpression = (function () {
    function SimpleExpression(expression) {
        this._needsFlattening = false;
        if (typeof expression === 'boolean') {
            this._parsedExpression = function () { return expression; };
        }
        else {
            if (!(typeof expression === 'string')) {
                throw new Error("Invalid Expression: unsupported type" + (typeof expression));
            }
            if (!expression) {
                throw new Error("Invalid Expression: empty");
            }
            expression = expression.replace(/(\r\n|\n|\r)/gm, '');
            expression = expression.trim();
            if (!expression) {
                throw new Error("Invalid Expression: whitespace");
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
            if ((typeof ob[i]) === 'object' && ob[i] !== null) {
                var flatObject = this.flattenObject(ob[i]);
                for (var x in flatObject) {
                    if (!flatObject.hasOwnProperty(x)) {
                        continue;
                    }
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
//# sourceMappingURL=index.js.map