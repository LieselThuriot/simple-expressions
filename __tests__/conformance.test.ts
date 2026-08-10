import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
import * as se from '..';

type Case = {
    id: string;
    expression: string;
    model?: unknown;
    value?: unknown;
    truthy?: boolean;
    error?: string;
};

const corpus = JSON.parse(readFileSync(join(__dirname, 'conformance', 'spec', 'v1', 'cases.json'), 'utf8')) as { cases: Case[] };
const cases = corpus.cases;

beforeEach(() => {
    se.SimpleExpressions.enableCaches();
    se.SimpleExpressions.setCacheLimit(1000);
    se.SimpleExpressions.clear();
});

describe('conformance specification v1', () => {
    test.each(cases.map((item) => [item.id, item] as const))('%s', (_id, item) => {
        const model = (item.model ?? {}) as Record<string, any>;
        if (item.error !== undefined) {
            expect(() => se.parseExpression(item.expression)(model)).toThrow(item.error);
        } else if (item.truthy !== undefined) {
            expect(se.executeExpression(model, item.expression)).toBe(item.truthy);
        } else {
            expect(se.parseExpression(item.expression)(model)).toEqual(item.value);
        }
    });
});
