export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type Case = {
    id: string;
    expression: string;
    model?: JsonValue;
    value?: JsonValue;
    truthy?: boolean;
    error?: string;
    $comment?: string;
};

export const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);
const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const expectationKeys = ['value', 'truthy', 'error'] as const;
const allowedCaseKeys = new Set(['$comment', 'id', 'expression', 'model', 'value', 'truthy', 'error']);

export const isJsonValue = (value: unknown): value is JsonValue => {
    if (value === null || typeof value === 'boolean' || typeof value === 'string') {
        return true;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value);
    }
    if (Array.isArray(value)) {
        return value.every(isJsonValue);
    }
    return isObject(value) && Object.values(value).every(isJsonValue);
};

export const validateCorpus = (parsedCorpus: unknown): Case[] => {
    const isValidCorpus = isObject(parsedCorpus) &&
        Object.keys(parsedCorpus).every((key) => key === '$comment' || key === 'cases') &&
        (!hasOwn(parsedCorpus, '$comment') || (Array.isArray(parsedCorpus.$comment) && parsedCorpus.$comment.every((line) => typeof line === 'string'))) &&
        Array.isArray(parsedCorpus.cases);
    if (!isValidCorpus) {
        throw new Error('Invalid conformance corpus: cases must be an array');
    }

    const ids = new Set<string>();
    return (parsedCorpus.cases as unknown[]).map((item, index): Case => {
        if (!isObject(item)) {
            throw new Error(`Invalid conformance case at index ${index}`);
        }

        const hasValidFields = Object.keys(item).every((key) => allowedCaseKeys.has(key)) &&
            (!hasOwn(item, '$comment') || typeof item.$comment === 'string') &&
            typeof item.id === 'string' && /\S/.test(item.id) && typeof item.expression === 'string';
        if (!hasValidFields) {
            throw new Error(`Invalid conformance case at index ${index}: id and expression must be strings`);
        }
        const id = item.id as string;
        if (ids.has(id)) {
            throw new Error(`Invalid conformance corpus: duplicate case id ${id}`);
        }
        ids.add(id);

        if (hasOwn(item, 'model') && !isJsonValue(item.model)) {
            throw new Error(`Invalid conformance case ${id}: model must be a JSON value`);
        }
        const expectations = expectationKeys.filter((key) => hasOwn(item, key));
        const hasValidExpectation = expectations.length === 1 &&
            !(hasOwn(item, 'value') && !isJsonValue(item.value)) &&
            !(hasOwn(item, 'truthy') && typeof item.truthy !== 'boolean') &&
            !(hasOwn(item, 'error') && (typeof item.error !== 'string' || !/\S/.test(item.error)));
        if (!hasValidExpectation) {
            throw new Error(`Invalid conformance case ${id}: expected exactly one valid expectation`);
        }
        return item as unknown as Case;
    });
};
