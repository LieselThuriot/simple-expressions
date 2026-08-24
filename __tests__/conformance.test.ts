import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
import * as se from '..';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type Case = {
    id: string;
    expression: string;
    model?: JsonValue;
    value?: JsonValue;
    truthy?: boolean;
    error?: string;
    $comment?: string;
};

const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);
const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const expectationKeys = ['value', 'truthy', 'error'] as const;
const isJsonValue = (value: unknown): value is JsonValue => {
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

const parsedCorpus: unknown = JSON.parse(readFileSync(join(__dirname, 'conformance', 'spec', 'v1', 'cases.json'), 'utf8'));
const isValidCorpus = isObject(parsedCorpus) &&
    Object.keys(parsedCorpus).every((key) => key === '$comment' || key === 'cases') &&
    (!hasOwn(parsedCorpus, '$comment') || (Array.isArray(parsedCorpus.$comment) && parsedCorpus.$comment.every((line) => typeof line === 'string'))) &&
    Array.isArray(parsedCorpus.cases);
if (!isValidCorpus) {
    throw new Error('Invalid conformance corpus: cases must be an array');
}

const ids = new Set<string>();
const allowedCaseKeys = new Set(['$comment', 'id', 'expression', 'model', 'value', 'truthy', 'error']);
const cases = parsedCorpus.cases.map((item, index): Case => {
    if (!isObject(item)) {
        throw new Error(`Invalid conformance case at index ${index}`);
    }

    const hasValidFields = Object.keys(item).every((key) => allowedCaseKeys.has(key)) &&
        (!hasOwn(item, '$comment') || typeof item.$comment === 'string') &&
        typeof item.id === 'string' && /\S/.test(item.id) && typeof item.expression === 'string';
    if (!hasValidFields) {
        throw new Error(`Invalid conformance case at index ${index}: id and expression must be strings`);
    }
    if (ids.has(item.id)) {
        throw new Error(`Invalid conformance corpus: duplicate case id ${item.id}`);
    }
    ids.add(item.id);

    if (hasOwn(item, 'model') && !isJsonValue(item.model)) {
        throw new Error(`Invalid conformance case ${item.id}: model must be a JSON value`);
    }
    const expectations = expectationKeys.filter((key) => hasOwn(item, key));
    const hasValidExpectation = expectations.length === 1 &&
        !(hasOwn(item, 'value') && !isJsonValue(item.value)) &&
        !(hasOwn(item, 'truthy') && typeof item.truthy !== 'boolean') &&
        !(hasOwn(item, 'error') && (typeof item.error !== 'string' || !/\S/.test(item.error)));
    if (!hasValidExpectation) {
        throw new Error(`Invalid conformance case ${item.id}: expected exactly one valid expectation`);
    }
    return item as Case;
});

beforeEach(() => {
    se.SimpleExpressions.enableCaches();
    se.SimpleExpressions.setCacheLimit(1000);
    se.SimpleExpressions.clear();
});

describe('conformance specification v1', () => {
    test.each(cases.map((item) => [item.id, item] as const))('%s', (_id, item) => {
        const model = (hasOwn(item, 'model') ? item.model : {}) as Record<string, any>;
        if (hasOwn(item, 'error')) {
            expect(() => se.parseExpression(item.expression)(model)).toThrow(item.error);
        } else if (hasOwn(item, 'truthy')) {
            expect(se.executeExpression(model, item.expression)).toBe(item.truthy);
        } else {
            expect(se.parseExpression(item.expression)(model)).toEqual(item.value);
        }
    });
});
