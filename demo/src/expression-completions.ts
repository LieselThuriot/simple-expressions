import { operatorDefinitions } from './constants';
import { parseModel } from './playground';

export { operatorDefinitions };
export type { OperatorDefinition } from './constants';

export interface ReferenceCompletionContext {
    from: number;
    to: number;
    path: string[];
    prefix: string;
}

const referenceSegmentPattern = /^[A-Za-z0-9_$-]+$/;
const referenceTextPattern = /^(?:[A-Za-z0-9_$-]+\.)*[A-Za-z0-9_$-]*$/;
const unsafeReferenceSegments = new Set(['__proto__', 'constructor', 'prototype']);

const isQuote = (character: string): boolean => character === '"' || character === "'" || character === '`';

export const isInsideStringAt = (source: string, position: number): boolean => {
    let quote: string | null = null;
    let escaped = false;

    for (let index = 0; index < position; index++) {
        const character = source.charAt(index);

        if (quote === null) {
            if (isQuote(character)) {
                quote = character;
            }
            continue;
        }

        if (character === '\\') {
            escaped = !escaped;
            continue;
        }

        if (character === quote && !escaped) {
            quote = null;
        }
        escaped = false;
    }

    return quote !== null;
};

export const getReferenceCompletionContext = (
    source: string,
    position: number = source.length
): ReferenceCompletionContext | null => {
    const beforeCursor = source.slice(0, position);
    const hashIndex = beforeCursor.lastIndexOf('#');

    if (hashIndex < 0 || isInsideStringAt(source, hashIndex) || isInsideStringAt(source, position)) {
        return null;
    }

    const previousCharacter = beforeCursor.charAt(hashIndex - 1);
    if (previousCharacter && !/[\s,(]/.test(previousCharacter)) {
        return null;
    }

    const referenceText = beforeCursor.slice(hashIndex + 1);
    if (!referenceTextPattern.test(referenceText) || /["'`]/.test(referenceText)) {
        return null;
    }

    const parts = referenceText.split('.');
    const prefix = parts.pop() ?? '';
    const path = parts;

    if (!referenceSegmentPattern.test(prefix) && prefix !== '') {
        return null;
    }

    if (path.some((segment) => !referenceSegmentPattern.test(segment))) {
        return null;
    }

    return {
        from: position - prefix.length,
        to: position,
        path,
        prefix
    };
};

const isObjectLike = (value: unknown): value is Record<string, unknown> | unknown[] => {
    return value !== null && typeof value === 'object';
};

const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);

export const resolveModelPath = (model: unknown, path: readonly string[]): unknown => {
    if (!isObjectLike(model)) {
        return undefined;
    }

    if (path.some((segment) => unsafeReferenceSegments.has(segment))) {
        return undefined;
    }

    if (path.length === 0) {
        return model;
    }

    const directPath = path.join('.');
    if (hasOwn(model, directPath)) {
        return model[directPath as keyof typeof model];
    }

    let value: unknown = model;
    for (const segment of path) {
        if (!isObjectLike(value) || !hasOwn(value, segment)) {
            return undefined;
        }
        value = value[segment as keyof typeof value];
    }

    return value;
};

export const getModelPropertyNames = (
    model: unknown,
    path: readonly string[] = [],
    prefix: string = ''
): string[] => {
    const value = resolveModelPath(model, path);
    if (!isObjectLike(value)) {
        return [];
    }

    const normalizedPrefix = prefix.toLowerCase();
    return Object.getOwnPropertyNames(value)
        .filter((key) => referenceSegmentPattern.test(key))
        .filter((key) => !unsafeReferenceSegments.has(key))
        .filter((key) => key.toLowerCase().startsWith(normalizedPrefix))
        .sort((left, right) => left.localeCompare(right));
};

export const getModelPropertyCompletions = (
    modelText: string,
    path: readonly string[] = [],
    prefix: string = ''
): string[] => {
    try {
        return getModelPropertyNames(parseModel(modelText), path, prefix);
    } catch {
        return [];
    }
};
