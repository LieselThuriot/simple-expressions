"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeExpression = void 0;
exports.executeExpression = (function () {
    var ___expressionCache = {};
    var ___parseExpression = function (expression) {
        var cachedExpression = ___expressionCache[expression];
        if (cachedExpression) {
            //console.log('Resolved cached expression');
            return cachedExpression;
        }
        var equals = function (value1, value2) {
            return value1 == value2;
        };
        var largerThan = function (value1, value2) {
            return value1 > value2;
        };
        var smallerThan = function (value1, value2) {
            return value1 < value2;
        };
        var contains = function (value1, value2) {
            value1 = value1;
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
            //(#2, 5)
            //( not(eq(#2, 5)), eq(#2, 10) )
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
            throw new Error("Invalid Expression");
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
        var parseLargerThan = function (value) {
            var parameters = resolveParameters(value);
            return function (model) { return largerThan(parameters.left(model), parameters.right(model)); };
        };
        var parseSmallerThan = function (value) {
            var parameters = resolveParameters(value);
            return function (model) { return smallerThan(parameters.left(model), parameters.right(model)); };
        };
        var parseOperator = function (operator, body) {
            if (!operator) {
                throw new Error("Invalid Expression: no operator");
            }
            //console.log(`Parsing operator: ${operator} ---- ${body}`);
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
                case 'lt':
                    return parseLargerThan(body);
                case 'st':
                    return parseSmallerThan(body);
                case 'empty':
                    return parseEmpty(body);
                default:
                    throw new Error("Invalid Operator: " + operator);
                    ;
            }
        };
        var operatorRegex = /^\s*(?<operator>[a-zA-Z]+)\s*(?<body>\(.+?\))\s*$/;
        //or( not(eq(#2, 5)), eq(#2, 10) )
        var parse = function (value) {
            value = value.trim();
            switch (value.toLowerCase()) {
                case 'true':
                    return function () { return true; };
                case 'false':
                    return function () { return false; };
                default:
                    //console.log(`Parsing: ${value}`);
                    var match = operatorRegex.exec(value);
                    if (match) {
                        var groups = match['groups'];
                        if (groups) {
                            var operator = groups.operator;
                            var body = groups.body;
                            return parseOperator(operator, body);
                        }
                    }
                    else {
                        //console.log('Could not match operators');
                    }
                    //return as constant since we didn't find an operator
                    if (value.indexOf('#') === 0) {
                        value = value.substring(1);
                        //console.log(`Model Constant: ${value}`);
                        return function (model) { return model[value]; };
                    }
                    var numericValue_1 = parseFloat(value);
                    if (isNaN(numericValue_1)) {
                        //console.log(`Constant: ${value}`);
                        return function () { return value; };
                    }
                    //console.log(`Numeric Constant: ${value}`);
                    return function () { return numericValue_1; };
            }
        };
        var parsedResult = parse(expression.trim());
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
        if (e.indexOf('.') > 0) {
            m = ___flattenObject(m);
        }
        return ___parseExpression(e)(m);
    };
})();
