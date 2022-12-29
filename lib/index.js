"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeExpression = void 0;
exports.executeExpression = (function () {
    var ___expressionCache = {};
    var ___parseExpression = function (expression) {
        var cachedExpression = ___expressionCache[expression];
        if (cachedExpression) {
            return cachedExpression;
        }
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
        var parseSingleBody = function (value) { return parse(value.replace(/^\s*\(/, '').replace(/\)\s*$/, '')); };
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
                            var left = parse(value.substring(1, i));
                            var right = parse(value.substring(i + 1).replace(/\)?\s*$/, ''));
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
                    ;
            }
        };
        var operatorRegex = /^\s*(?<operator>[a-zA-Z]+)\s*(?<body>\(.+?\))\s*$/;
        var parse = function (value) {
            value = value.trim();
            switch (value.toLowerCase()) {
                case 'true':
                    return function () { return true; };
                case 'false':
                    return function () { return false; };
                default:
                    var match = operatorRegex.exec(value);
                    if (match) {
                        var groups = match['groups'];
                        if (groups) {
                            var operator = groups.operator;
                            var body = groups.body;
                            return parseOperator(operator, body);
                        }
                    }
                    //return as constant since we didn't find an operator
                    if (value.indexOf('#') === 0) {
                        value = value.substring(1);
                        return function (model) { return model[value]; };
                    }
                    var numericValue_1 = parseFloat(value);
                    if (isNaN(numericValue_1)) {
                        return function () { return value; };
                    }
                    return function () { return numericValue_1; };
            }
        };
        var parsedResult = parse(expression);
        ___expressionCache[expression] = parsedResult;
        return parsedResult;
    };
    var ___flattenObject = function (ob) {
        var toReturn = {};
        for (var i in ob) {
            if (!ob.hasOwnProperty(i))
                continue;
            if ((typeof ob[i]) == 'object' && ob[i] !== null) {
                var flatObject = ___flattenObject(ob[i]);
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
    return function (m, e) {
        if (typeof e === 'boolean') {
            return function () { return e; };
        }
        if (!e) {
            throw new Error("Invalid Expression: empty");
        }
        e = ('' + e).trim();
        if (!e) {
            throw new Error("Invalid Expression: whitespace");
        }
        if (e.indexOf('.') > 0) {
            m = ___flattenObject(m);
        }
        return ___parseExpression(e)(m);
    };
})();
