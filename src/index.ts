export { ExpressionParseException, ExpressionEvaluationException } from './errors';
import { ExpressionParseException } from './errors';
import { compileExpression } from './parser';
import { Evaluator, constantEvaluator, trimPortableWhitespace } from './runtime';

type Model = { [key: string]: any; };

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
        if (typeof e !== 'string' && typeof e !== 'boolean') {
            throw new TypeError('Invalid Expression: unsupported type ' + (typeof e));
        }
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
        expression = trimPortableWhitespace(expression);

        if (expression === '') {
            throw new ExpressionParseException('Invalid Expression: formatting');
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
    if (typeof expression !== 'string') {
        throw new TypeError('Invalid Expression: unsupported type ' + (typeof expression));
    }
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
            throw new TypeError('Invalid Expression: unsupported type ' + (typeof expression));
        }

        const normalizedExpression = trimPortableWhitespace(expression);
        if (!normalizedExpression) {
            throw new ExpressionParseException('Invalid Expression: whitespace');
        }

        this._parsedExpression = parseExpression(normalizedExpression);
    }

    public evaluate(model: Model): boolean {
        return !!this._parsedExpression(model);
    }
}
