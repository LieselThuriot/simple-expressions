export class SimpleExpressionCaches {
    private static _enabled: boolean = true;
    private static _verbose: boolean = false;

    private static _parseCache: { [key: string]: any; } = {
        'true': () => true,
        'false': () => false
    };

    private static _simpleCache: { [key: string]: SimpleExpression; } = {};

    private static logVerbose(message: string, key: string, data: any) {
        if (this._verbose) {
            console.log(message, key, data);
        }
    }

    public static get(e: string | boolean): SimpleExpression {
        const key = '' + e;
        if (this._enabled) {
            const cachedExpression = this._simpleCache[key];
            if (cachedExpression) {
                this.logVerbose('Resolved Simple Expression from cache', key, cachedExpression);
                return cachedExpression;
            }
        }

        const result = new SimpleExpression(e);

        if (this._enabled) {
            this._simpleCache[key] = result;
            this.logVerbose('Cached Simple Expression', key, result);
        }

        return result;
    }

    public static getParsedExpression(expression: string, factory: (value: string) => (model: { [key: string]: any; }) => any): (model: { [key: string]: any; }) => any {
        expression = expression.trim();

        if (expression === '') {
            throw new Error("Invalid Expression: formatting");
        }

        if (this._enabled) {
            const cachedExpression = this._parseCache[expression];
            if (cachedExpression) {
                this.logVerbose('Resolved Parsed Expression from cache', expression, cachedExpression);
                return cachedExpression;
            }
        }

        const parsedResult = factory(expression);

        if (this._enabled) {
            this._parseCache[expression] = parsedResult;
            this.logVerbose('Cached Parsed Expression', expression, parsedResult);
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

    public static disable() {
        this._enabled = false;
    }

    public static enable() {
        this._enabled = true;
    }

    public static verbose(value?: boolean) {
        if (value === undefined) {
            this._verbose = true;
        } else {
            this._verbose = value;
        }
    }
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

    const contains = (value1: any, value2: any): boolean => {
        if (typeof value1 === 'string') {
            return value1.indexOf(value2) >= 0;
        }

        return false;
    }

    const not = (value: any): boolean => {
        return !value;
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

    const parseEmpty = (value: string): (model: { [key: string]: any; }) => boolean => {
        const inner = parseSingleBody(value);
        return (model) => empty(inner(model));
    }

    const resolveParameters = (value: string): { left: (model: { [key: string]: any; }) => boolean; right: (model: { [key: string]: any; }) => boolean } => {
        let bracketCount = 0;
        let insideConstant = false;
        
        for (let i = 0; i < value.length; i++) {
            const character = value[i];
            switch (character) {
                case '(':
                    bracketCount++;
                    break;
                case ')':
                    bracketCount--;
                    break;

                case '"':
                case "'":
                    insideConstant = !insideConstant;
                    break;

                case ',':
                    if (!insideConstant && bracketCount === 1) {
                        const left = innerParseExpression(value.substring(1, i));
                        const right = innerParseExpression(value.substring(i + 1).replace(/\)?\s*$/, ''));

                        return { left, right };
                    }
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

    const parseOperator = (operator: string, body: string): (model: { [key: string]: any; }) => boolean => {
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
    }

    const operatorRegex = /^([a-zA-Z]+)\s*(\(.+?\))$/;
    const parse = (value: string): (model: { [key: string]: any; }) => any => {
        if (value.length > 1) {
            const firstChar = value.charAt(0);
            switch (firstChar) {
                case '#':
                    value = value.substring(1);
                    return (model) => model[value];
                case '"':
                case "'":
                    if (value.charAt(value.length - 1) === firstChar) {
                        value = value.substring(1, value.length - 1);
                        return () => value;
                    }
            }

            switch (value.toLowerCase()) {
                case 'true':
                    return () => true;
                case 'false':
                    return () => false;
            }

            const operatorMatch = operatorRegex.exec(value);
            if (operatorMatch) {
                const operator: string = operatorMatch[1];
                const body: string = operatorMatch[2];
                return parseOperator(operator, body);
            }
        }

        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
            return () => numericValue;
        }

        throw new Error("Invalid Expression: invalid constant format");
    }

    const innerParseExpression = (expression: string): (model: { [key: string]: any; }) => any => {
        return SimpleExpressionCaches.getParsedExpression(expression, parse);
    };

    return innerParseExpression;
})();

export const executeExpression = (model: { [key: string]: any; }, expression: string | boolean): boolean => {
    return SimpleExpressionCaches.get(expression).evaluate(model);
};

export class SimpleExpression {
    private readonly _parsedExpression: (model: { [key: string]: any; }) => any;
    private readonly _needsFlattening: boolean = false;

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