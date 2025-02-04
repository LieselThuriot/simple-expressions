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
    expect(() => se.executeExpression({}, 'eq("test", "test\\")')).toThrow();
    expect(() => se.executeExpression({}, 'eq("test\\", "test")')).toThrow();
    expect(() => se.executeExpression({}, 'eq(123, "test\\" " " )')).toThrow();
    expect(() => se.executeExpression({}, 'eq("test\\" " ", 123 )')).toThrow();
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
    expect(se.executeExpression({}, 'eq(123, "test\\"" )')).toBe(false);
});

test('Can match a regex', () => {
    expect(se.executeExpression({ 'test': 'why hello there' }, 'match(#test, "hello")')).toBe(true);
    expect(se.executeExpression({ 'test': 'why hello there' }, 'match(#test, "^hello")')).toBe(false);
    expect(se.executeExpression({ 'test': 'why hello there' }, 'match(#test, "hello$")')).toBe(false);
    expect(se.executeExpression({ 'test': 'hello' }, 'match(#test, "^hello$")')).toBe(true);
    expect(se.executeExpression({ 'test': 'hello' }, 'match(#test, "[a-z]+")')).toBe(true);
    expect(se.executeExpression({ 'test': '12345' }, 'match(#test, "[a-z]+")')).toBe(false);
    expect(se.executeExpression({ 'test': '' }, 'match(#test, "[a-z]+")')).toBe(false);
    expect(se.executeExpression({ 'test': '' }, 'match(#test, ".{0}")')).toBe(true);
    expect(se.executeExpression({}, 'match(#test, ".+")')).toBe(false);
    expect(se.executeExpression({ 'test': '123' }, 'match(#test, "")')).toBe(false);
    expect(se.executeExpression({ 'mail': 'test@test.com' }, 'match(#mail, "^[^@]+@[^@]+\.[^@]+$")')).toBe(true);
});

test('Can match two regexes', () => {
    expect(se.executeExpression({ 'test': 'why hello there' }, 'and(match(#test, "hello"), match(#test, "there"))')).toBe(true);
});

test('Can do complex things', () => {
    expect(se.executeExpression({ 'test': 'why hello there' }, 'and(not(empty(#test)), and(match(#test, "hello"), match(#test, "there")))')).toBe(true);
});

test('Concatination', () => {
    // These should probably throw since they're not boolean operators.
    // For now we are ok with them returning a boolean in the end result.
    expect(se.executeExpression({}, 'concat("test", "123")')).toBe(true);
    expect(se.executeExpression({}, 'concat(#1, #2)')).toBe(false);
    expect(se.executeExpression({ '1': '123' }, 'concat(#1, #2)')).toBe(true);
});

test('Concatination allows fancy regexes', () => {
    expect(se.executeExpression({ 'pattern': 'hello there', 'test': 'hello there' }, 'match(#test, concat(concat("^", #pattern), "$"))')).toBe(true);
    expect(se.executeExpression({ 'pattern1': 'hello', 'pattern2': 'there', 'test': 'hello there' }, 'and( match(#test, concat("^", #pattern1)), match(#test, concat(#pattern2, "$")) )')).toBe(true);
    expect(se.executeExpression({ 'pattern1': 'hello', 'pattern2': 'there', 'test': 'hello there' }, 'match(#test, concat(concat(concat(concat("(", #pattern1), ")(?! "), #pattern2), ")"))')).toBe(false);
    expect(se.executeExpression({ 'pattern1': 'hello', 'pattern2': 'there', 'test': 'hello over there' }, 'match(#test, concat(concat(concat(concat("(", #pattern1), ")(?! "), #pattern2), ")"))')).toBe(true);
});