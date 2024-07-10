const se = require('../lib/index');

test('simple true results in true', () => {
    expect(se.executeExpression({}, true)).toBe(true);
});

test('simple false results in false', () => {
    expect(se.executeExpression({}, false)).toBe(false);
});

test('true results in true', () => {
    expect(se.executeExpression({}, 'true')).toBe(true);
});

test('false results in false', () => {
    expect(se.executeExpression({}, 'false')).toBe(false);
});

test('and( not(eq(#2, 5)), lt(#2, 10) ) for {"2":2} results in true', () => {
    expect(se.executeExpression({ "2": 2 }, 'and( not(eq(#2, 5)), lt(#2, 10) )')).toBe(true);
});

test('and( not(eq(#2, 5)), lt(#2, 10) ) for {"2":12} results in false', () => {
    expect(se.executeExpression({ "2": 12 }, 'and( not(eq(#2, 5)), lt(#2, 10) )')).toBe(false);
});

test('true for {} results in true', () => {
    expect(se.executeExpression({}, true)).toBe(true);
});

test('false for {} results in false', () => {
    expect(se.executeExpression({}, false)).toBe(false);
});

test('or (true, false ) for {} results in true', () => {
    expect(se.executeExpression({}, 'or (true, false )')).toBe(true);
});

test('AND (true, false ) for {} results in false', () => {
    expect(se.executeExpression({}, 'AND (true, false )')).toBe(false);
});

test('AND (true, 0 ) for {} results in false', () => {
    expect(se.executeExpression({}, 'AND (true, 0 )')).toBe(false);
});

test('AND (true, "blub" ) for {} results in true', () => {
    expect(se.executeExpression({}, 'AND (true, "blub" )')).toBe(true);
});

test('AND (true, not( empty( #text )) ) for {"text":"test"} results in true', () => {
    expect(se.executeExpression({ "text": "test" }, 'AND (true, not( empty( #text )) )')).toBe(true);
});

test('AND (true, not( empty( #text )) ) for {"text":""} results in false', () => {
    expect(se.executeExpression({ "text": "" }, 'AND (true, not( empty( #text )) )')).toBe(false);
});

test('AND (true, not( empty( #text )) ) for {} results in false', () => {
    expect(se.executeExpression({}, 'AND (true, not( empty( #text )) )')).toBe(false);
});

test('AND (true, not( empty( #text.innerText )) ) for {"text":{"innerText":"test"}} results in true', () => {
    expect(se.executeExpression({ "text": { "innerText": "test" } }, 'AND (true, not( empty( #text.innerText )) )')).toBe(true);
});

test('AND (true, empty( #text.innerText ) ) for {"text":{"innerText":"test"}} results in false', () => {
    expect(se.executeExpression({ "text": { "innerText": "test" } }, 'AND (true, empty( #text.innerText ) )')).toBe(false);
});

test('Too many quotes throws', () => {
    expect(() => se.executeExpression({}, 'eq("te\\""st", "te\\""st")')).toThrow();
});

test('Invalid constant location throws', () => {
    expect(() => se.executeExpression({}, 'eq("test", "test"")')).toThrow();
    expect(() => se.executeExpression({}, 'eq("test", "tes"t")')).toThrow();
    expect(() => se.executeExpression({}, 'eq("te"st", "test")')).toThrow();
    expect(() => se.executeExpression({}, 'eq("test"", "test")')).toThrow();
    expect(() => se.executeExpression({}, 'eq("te""st", "test")')).toThrow();
    expect(() => se.executeExpression({}, 'eq("te""st", "test"""""d")')).toThrow();
    expect(() => se.executeExpression({}, 'eq(",""," ",")')).toThrow();
});

test('Invalid parameters throws', () => {
    expect(() => se.executeExpression({}, 'eq("test", "test", "test")')).toThrow();
    expect(() => se.executeExpression({}, 'not("test", "test")')).toThrow();
});

test('Constant boundaries are respected', () => {
    expect(se.executeExpression({}, 'AND(eq("te\\"st", "te\\"st"), not(eq("te,st", "tes,t")))')).toBe(true);
    expect(se.executeExpression({}, 'eq("test", "test\\", \\"test")')).toBe(false);
    expect(se.executeExpression({}, 'eq("test\\", \\"test", "test\\", \\"test")')).toBe(true);
    expect(se.executeExpression({}, 'eq("test", "test\', \'test")')).toBe(false);
    expect(se.executeExpression({}, 'eq("test\', \'test", "test\', \'test")')).toBe(true);
    expect(se.executeExpression({}, 'not(eq("tru\\"e", "tru\\"e"))')).toBe(false);
    expect(se.executeExpression({}, 'eq(",", ",")')).toBe(true);
    expect(se.executeExpression({}, 'eq("\\",\\"", "\\",\\"")')).toBe(true);
    expect(se.executeExpression({}, 'eq("\',\'", "\',\'")')).toBe(true);
});