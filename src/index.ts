export class SimpleExpressions {

    /** @internal */
    private static _enabledCaches: boolean = true;

    // /** @internal */ 
    // private static _verboseLogging: boolean = false;

    /** @internal */
    private static _parseCache: { [key: string]: any; } = {
        'true': () => true,
        'false': () => false
    };

    /** @internal */
    private static _simpleCache: { [key: string]: SimpleExpression; } = {};

    // /** @internal */ 
    // static logVerbose(message: string, key: string, data: any) {
    //     if (this._verboseLogging) {
    //         console.log(message, key, data);
    //     }
    // }

    /** @internal */
    static get(e: string | boolean): SimpleExpression {
        const key = '' + e;
        if (this._enabledCaches) {
            const cachedExpression = this._simpleCache[key];
            if (cachedExpression) {
                //this.logVerbose('Resolved Simple Expression from cache', key, cachedExpression);
                return cachedExpression;
            }
        }

        const result = new SimpleExpression(e);

        if (this._enabledCaches) {
            this._simpleCache[key] = result;
            //this.logVerbose('Cached Simple Expression', key, result);
        }

        return result;
    }

    /** @internal */
    static getParsedExpression(expression: string, factory: (value: string) => (model: { [key: string]: any; }) => any): (model: { [key: string]: any; }) => any {
        expression = expression.trim();

        if (expression === '') {
            //this.logVerbose('Invalid Expression: formatting', expression, {});
            throw new Error("Invalid Expression: formatting");
        }

        if (this._enabledCaches) {
            const cachedExpression = this._parseCache[expression];
            if (cachedExpression) {
                //this.logVerbose('Resolved Parsed Expression from cache', expression, cachedExpression);
                return cachedExpression;
            }
        }

        const parsedResult = factory(expression);

        if (this._enabledCaches) {
            this._parseCache[expression] = parsedResult;
            //this.logVerbose('Cached Parsed Expression', expression, parsedResult);
        }

        return parsedResult;
    }

    public static clear(options?: { parsed?: boolean, expression?: boolean }) {
        if (!options) {
            options = {
                parsed: true,
                expression: true
            };
        }

        if (!!options.parsed) {
            this._parseCache = {
                'true': () => true,
                'false': () => false
            };
        }

        if (!!options.expression) {
            this._simpleCache = {};
        }
    }

    public static disableCaches() {
        this._enabledCaches = false;
    }

    public static enableChaches() {
        this._enabledCaches = true;
    }

    // /** @internal */ 
    // static verbose(value?: boolean) {
    //     if (value === undefined) {
    //         this._verboseLogging = true;
    //     } else {
    //         this._verboseLogging = value;
    //     }
    // }
}

export const parseExpression = (function (): (expression: string) => (model: { [key: string]: any; }) => any {
    const equals = (value1: any, value2: any): boolean => {
        return value1 == value2;
    }

    const greaterThan = (value1: any, value2: any): boolean => {
        return value1 > value2;
    }

    const lessThan = (value1: any, value2: any): boolean => {
        return value1 < value2;
    }

    const evaluateRegex = (value: any, pattern: any): boolean => {
        if (!!pattern && typeof pattern === 'string') {
            const stringValue = !value
                ? ''
                : typeof value === 'string'
                    ? value
                    : value.toString();

            const regex = new RegExp(pattern, 'g');
            return regex.test(stringValue);
        }

        return false;
    }

    const concat = (value1: any, value2: any): string => {
        const string1 = !!value1 ? value1.toString() : '';
        const string2 = !!value2 ? value2.toString() : '';

        return string1 + string2;
    }

    const contains = (value1: any, value2: any): boolean => {
        if (typeof value1 === 'string') {
            return value1.indexOf(value2) >= 0;
        }

        return false;
    }

    const not = (value: any): boolean => {
        return !value;
    }

    const len = (value: any): number => {
        if (value === undefined || value === null) {
            return 0;
        }

        if (typeof value === 'string') {
            return value.length;
        }

        if (value.hasOwnProperty('length')) {
            return value.length;
        }

        throw new Error('Input does not have a length');
    }

    const or = (value1: any, value2: any): boolean => {
        return !!value1 || !!value2;
    }

    const and = (value1: any, value2: any): boolean => {
        return !!value1 && !!value2;
    }

    const empty = (value: any): boolean => {
        if (value === undefined || value === null) {
            return true;
        }

        if (typeof value === 'string' && value.length === 0) {
            return true;
        }

        return false;
    }

    const parseSingleBody = (value: any) => innerParseExpression(value.replace(/^\s*\(/, '').replace(/\)\s*$/, ''));

    const parseNot = (value: string): (model: { [key: string]: any; }) => boolean => {
        const inner = parseSingleBody(value);
        return (model) => not(inner(model));
    }

    const parseLength = (value: string) : (model: { [key: string]: any; }) => number => {
        const inner = parseSingleBody(value);
        return (model) => len(inner(model));
    }

    const parseEmpty = (value: string): (model: { [key: string]: any; }) => boolean => {
        const inner = parseSingleBody(value);
        return (model) => empty(inner(model));
    }

    const resolveParameters = (value: string): { left: (model: { [key: string]: any; }) => boolean; right: (model: { [key: string]: any; }) => boolean } => {
        let bracketCount = 0;
        let constantStart: string | boolean = false;
        let canConstantStart = true;

        //SimpleExpressions.logVerbose('Resolving Parameters', value, { bracketCount, constantStart, canConstantStart });

        for (let i = 0; i < value.length; i++) {
            const character = value.charAt(i);
            switch (character) {
                case '(':
                    if (!constantStart) {
                        bracketCount++;
                    }
                    //SimpleExpressions.logVerbose('Open Bracket at ' + i, value, { bracketCount, constantStart, canConstantStart });
                    break;
                case ')':
                    if (!constantStart) {
                        bracketCount--;
                    }
                    //SimpleExpressions.logVerbose('Close Bracket at ' + i, value, { bracketCount, constantStart, canConstantStart });
                    break;

                case '`':
                case '"':
                case "'":
                    if (!constantStart) {
                        //SimpleExpressions.logVerbose('Constant Start at ' + i, value, { bracketCount, constantStart, canConstantStart, character });
                        if (canConstantStart) {
                            constantStart = character;
                            canConstantStart = false;
                        } else {
                            throw new Error("Invalid Expression: invalid constant start: " + value);
                        }
                    } else if (constantStart === character) {
                        let backslashCount = 0;
                        let backslashIndex = i - 1;
                        while (backslashIndex >= 0 && value.charAt(backslashIndex) === '\\') {
                            backslashCount++;
                            backslashIndex--;
                        }

                        if (backslashCount > 0 && backslashCount % 2 !== 0) {
                            //SimpleExpressions.logVerbose('Escaped Constant at ' + i, value, { bracketCount, constantStart, canConstantStart, character, backslashCount, backslashIndex });
                        } else {
                            //SimpleExpressions.logVerbose('End of Constant at ' + i, value, { bracketCount, constantStart, canConstantStart, character, backslashCount, backslashIndex });
                            constantStart = false;
                        }
                    }

                    //SimpleExpressions.logVerbose('Constant at ' + i, value, { bracketCount, constantStart, canConstantStart, character });
                    break;

                case ',':
                    if (!constantStart) {
                        if (bracketCount === 1) {
                            const leftBody = value.substring(1, i);
                            //SimpleExpressions.logVerbose('Left Body', value, { leftBody });
                            const left = innerParseExpression(leftBody);

                            const rightBody = value.substring(i + 1).replace(/^\s*$/, '');
                            //SimpleExpressions.logVerbose('Right Body', value, { rightBody });
                            if (rightBody.charAt(rightBody.length - 1) !== ')') {
                                throw new Error("Invalid Expression: missing closing bracket: " + rightBody);
                            }

                            const right = innerParseExpression(rightBody.substring(0, rightBody.length - 1));

                            return { left, right };
                        }

                        canConstantStart = true;
                    }

                    //SimpleExpressions.logVerbose('Comma at ' + i, value, { bracketCount, constantStart, canConstantStart });
                    break;
            }
        }

        throw new Error("Invalid Expression Part: " + value);
    }

    const parseEquals = (value: string): (model: { [key: string]: any; }) => boolean => {
        const parameters = resolveParameters(value);
        return (model) => equals(parameters.left(model), parameters.right(model));
    }

    const parseOr = (value: string): (model: { [key: string]: any; }) => boolean => {
        const parameters = resolveParameters(value);
        return (model) => or(parameters.left(model), parameters.right(model));
    }

    const parseAnd = (value: string): (model: { [key: string]: any; }) => boolean => {
        const parameters = resolveParameters(value);
        return (model) => and(parameters.left(model), parameters.right(model));
    }

    const parseContains = (value: string): (model: { [key: string]: any; }) => boolean => {
        const parameters = resolveParameters(value);
        return (model) => contains(parameters.left(model), parameters.right(model));
    }

    const parseGreaterThan = (value: string): (model: { [key: string]: any; }) => boolean => {
        const parameters = resolveParameters(value);
        return (model) => greaterThan(parameters.left(model), parameters.right(model));
    }

    const parseLessThan = (value: string): (model: { [key: string]: any; }) => boolean => {
        const parameters = resolveParameters(value);
        return (model) => lessThan(parameters.left(model), parameters.right(model));
    }

    const parseRegex = (value: string): (model: { [key: string]: any; }) => boolean => {
        const parameters = resolveParameters(value);
        return (model) => evaluateRegex(parameters.left(model), parameters.right(model));
    }

    const parseConcat = (value: string): (model: { [key: string]: any; }) => string => {
        const parameters = resolveParameters(value);
        return (model) => concat(parameters.left(model), parameters.right(model));
    }

    const parseOperator = (operator: string, body: string): (model: { [key: string]: any; }) => boolean | string | number => {
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

            case 'len':
                return parseLength(body);

            case 'match':
                return parseRegex(body);

            case 'concat': // Special case since this is not a boolean
                return parseConcat(body);

            default:
                throw new Error("Invalid Operator: " + operator);
        }
    }

    const operatorRegex = /^([a-zA-Z]+)\s*(\(.+?\))$/;

    const parse = (value: string): (model: { [key: string]: any; }) => any => {
        //SimpleExpressions.logVerbose('Parsing', value, null);

        if (value.length > 1) {
            const firstChar = value.charAt(0);
            switch (firstChar) {
                case '#':
                    value = value.substring(1);
                    return (model) => model[value];

                case '`':
                case '"':
                case "'":
                    if (value.charAt(value.length - 1) === firstChar) {
                        value = value.substring(1, value.length - 1);
                        const escapeCheckRegex = new RegExp('(?:\\\\)*' + firstChar, 'g');

                        {
                            let match: RegExpExecArray | null;
                            while ((match = escapeCheckRegex.exec(value)) !== null) {
                                const backslashCount = match[0].length - 1;
                                if (backslashCount % 2 === 0) {
                                    throw new Error("Invalid Expression: invalid escaped constant: " + value);
                                }
                            }
                        }

                        {
                            let match = value.match(/(?:\\)+$/);
                            if (match) {
                                const backslashCount = match[0].length;
                                if (backslashCount % 2 !== 0) {
                                    throw new Error("Invalid Expression: escaped constant ending: " + value);
                                }
                            }
                        }

                        return () => value;
                    }

                    throw new Error("Invalid Expression: end quotes don't match starting quotes for constant: " + value);
            }

            switch (value.toLowerCase()) {
                case 'true':
                    return () => true;
                case 'false':
                    return () => false;
            }

            const operatorMatch = operatorRegex.exec(value);
            if (operatorMatch) {
                const operator = operatorMatch[1];

                if (!operator) {
                    throw new Error("Invalid Operator: " + operator)
                }

                const body = operatorMatch[2];

                if (!body) {
                    throw new Error("Invalid body: " + body)
                }

                return parseOperator(operator, body);
            }
        }

        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
            return () => numericValue;
        }

        //SimpleExpressions.logVerbose('Invalid Constant', value, {});
        throw new Error("Invalid Expression: invalid constant format: " + value);
    }

    const innerParseExpression = (expression: string): (model: { [key: string]: any; }) => any => {
        return SimpleExpressions.getParsedExpression(expression, parse);
    };

    return innerParseExpression;
})();

export const executeExpression = (model: { [key: string]: any; }, expression: string | boolean): boolean => {
    return SimpleExpressions.get(expression).evaluate(model);
};

export class SimpleExpression {
    /** @internal */
    private readonly _parsedExpression: (model: { [key: string]: any; }) => any;

    /** @internal */
    private readonly _needsFlattening: boolean = false;

    /** @internal */
    private flattenObject(ob: any) {
        const toReturn: any = {};

        for (const i in ob) {
            if (!ob.hasOwnProperty(i)) continue;

            if ((typeof ob[i]) === 'object' && ob[i] !== null) {
                const flatObject = this.flattenObject(ob[i]);
                for (const x in flatObject) {
                    if (!flatObject.hasOwnProperty(x)) {
                        continue;
                    }

                    toReturn[i + '.' + x] = flatObject[x];
                }
            } else {
                toReturn[i] = ob[i];
            }
        }

        return toReturn;
    }

    constructor(expression: string | boolean) {
        if (typeof expression === 'boolean') {
            this._parsedExpression = () => expression;
        } else {
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

            const flatteningRegex = /[,\(]\s*#\w+\.\w+\s*[,\)]/;
            if (flatteningRegex.test(expression)) {
                this._needsFlattening = true;
            }

            this._parsedExpression = parseExpression(expression);
        }
    }

    public evaluate(model: { [key: string]: any; }): boolean {
        if (this._needsFlattening) {
            model = this.flattenObject(model);
        }

        return !!this._parsedExpression(model);
    }
}