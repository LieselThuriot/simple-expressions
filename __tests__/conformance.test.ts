import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
import * as se from '..';
import { validateCorpus } from './conformance-validator';

const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);

const parsedCorpus: unknown = JSON.parse(readFileSync(join(__dirname, 'conformance', 'spec', 'v1', 'cases.json'), 'utf8'));
const cases = validateCorpus(parsedCorpus);
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
            expect(se.parseExpression(item.expression)(model)).toStrictEqual(item.value);
        }
    });
});
