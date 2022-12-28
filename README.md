# npm

> npm i simple-expressions

# Supported script operators

- not
- eq
- or
- and
- contains
- gt
- lt
- empty

## Constants
- true
- false
- any numbers
- anything else that isn't recognized will be a string constant

## Model references

You can reference model fields by using `#`.

Nested properties work too but beware that the model will be flattened before executing.

# Samples

```javascript
import { executeExpression } from 'simple-expressions';

console.log('TRUE results in ' + executeExpression({}, 'true'));
console.log('FALSE results in ' + executeExpression({}, 'False'));

const model = {
    '2': 2
};

const expr = '  and( not(eq(#2, 5)), lt(#2, 10) )  ';
const result = executeExpression(model, expr);

console.log(`'${expr}' for ${JSON.stringify(model)} results in ${result}`);

const model2 = {
    '2': 12
};

const expr2 = '  and( not(eq(#2, 5)), lt(#2, 10) )  ';
const result2 = executeExpression(model2, expr2);
console.log(`'${expr2}' for ${JSON.stringify(model2)} results in ${result2}`);


const expr3 = '  true  ';
const result3 = executeExpression({}, expr3);
console.log(`'${expr3}' for ${JSON.stringify({})} results in ${result3}`);


const expr4 = '  false  ';
const result4 = executeExpression({}, expr4);
console.log(`'${expr4}' for ${JSON.stringify({})} results in ${result4}`);


const expr5 = ' or (true,   false )  ';
const result5 = executeExpression({}, expr5);
console.log(`'${expr5}' for ${JSON.stringify({})} results in ${result5}`);


const expr6 = ' AND (TRUE,   FALSE )  ';
const result6 = executeExpression({}, expr6);
console.log(`'${expr6}' for ${JSON.stringify({})} results in ${result6}`);


const expr7 = ' AND (TRUE,   0 )  ';
const result7 = executeExpression({}, expr7);
console.log(`'${expr7}' for ${JSON.stringify({})} results in ${result7}`);


const expr8 = ' AND (TRUE,   "blub" )  ';
const result8 = executeExpression({}, expr8);
console.log(`'${expr8}' for ${JSON.stringify({})} results in ${result8}`);


const model9 = {
    text: 'test'
};
const expr9 = ' AND (TRUE,   not( empty( #text )) )  ';
const result9 = executeExpression(model9, expr9);
console.log(`'${expr9}' for ${JSON.stringify(model9)} results in ${result9}`);


const model10 = {
    text: ''
};
const expr10 = ' AND (TRUE,   not( empty( #text )) )  ';
const result10 = executeExpression(model10, expr10);
console.log(`'${expr10}' for ${JSON.stringify(model10)} results in ${result10}`);


const model11 = {};
const expr11 = ' AND (TRUE,   not( empty( #text )) )  ';
const result11 = executeExpression(model11, expr11);
console.log(`'${expr11}' for ${JSON.stringify(model11)} results in ${result11}`);

const model12 = {
    text: {
        'innerText': 'test'
    }
};
const expr12 = ' AND (TRUE,   not( empty( #text.innerText )) )  ';
const result12 = executeExpression(model12, expr12);
console.log(`'${expr12}' for ${JSON.stringify(model12)} results in ${result12}`);

const expr13 = ' AND (TRUE, empty( #text.innerText ) )  ';
const result13 = executeExpression(model12, expr13);
console.log(`'${expr13}' for ${JSON.stringify(model12)} results in ${result13}`);
```

Results:

```bash
TRUE results in true
FALSE results in false
'  and( not(eq(#2, 5)), lt(#2, 10) )  ' for {"2":2} results in true
'  and( not(eq(#2, 5)), lt(#2, 10) )  ' for {"2":12} results in false
'  true  ' for {} results in true
'  false  ' for {} results in false
' or (true,   false )  ' for {} results in true
' AND (TRUE,   FALSE )  ' for {} results in false
' AND (TRUE,   0 )  ' for {} results in false
' AND (TRUE,   "blub" )  ' for {} results in true
' AND (TRUE,   not( empty( #text )) )  ' for {"text":"test"} results in true
' AND (TRUE,   not( empty( #text )) )  ' for {"text":""} results in false
' AND (TRUE,   not( empty( #text )) )  ' for {} results in false
' AND (TRUE,   not( empty( #text.innerText )) )  ' for {"text":{"innerText":"test"}} results in true
' AND (TRUE, empty( #text.innerText ) )  ' for {"text":{"innerText":"test"}} results in false
```