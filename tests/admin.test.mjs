import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRecord, validateContext, InputError } from '../lib/admin-validation.ts';
const form = (values) => { const f = new FormData(); for (const [k,v] of Object.entries(values)) f.set(k,String(v)); return f; };
test('subject grade accepts the three options and rejects invalid input', () => {
  for (const grade of ['2k9', '2k8', 'student']) {
    assert.equal(parseRecord('subjects', form({name:'Toán', grade})).values.grade, grade);
  }
  for (const grade of ['', '2k7', 'Sinh viên', 'ADMIN']) {
    assert.throws(() => parseRecord('subjects', form({name:'Toán', grade})), InputError);
  }
  // Older forms must preserve an existing grade; SQL supplies the insert default.
  assert.equal(Object.hasOwn(parseRecord('subjects', form({name:'Toán'})).values, 'grade'), false);
});
test('CRUD whitelist trims names and ignores role, IDs and parent reassignment', () => {
  for (const entity of ['subjects','teachers','menus']) {
    const parsed = parseRecord(entity,form({name:'  Test  ',price:0,role:'ADMIN',id:'spoof',subject_id:'spoof'}));
    assert.equal(parsed.values.name,'Test');
    for (const key of ['role','id','subject_id']) assert.equal(Object.hasOwn(parsed.values,key),false);
    assert.throws(() => parseRecord(entity,form({name:'  ',price:0})),InputError);
  }
  for (const entity of ['courses','chapters','lessons']) {
    assert.equal(parseRecord(entity,form({title:' Title ',order_index:0})).values.title,'Title');
    assert.throws(() => parseRecord(entity,form({title:' ',order_index:0})),InputError);
  }
});
test('numeric validation rejects empty, negative, fractional order and overflow', () => {
  for (const order_index of ['',-1,1.5,'NaN','Infinity','1e2',2147483648]) assert.throws(() => parseRecord('lessons',form({title:'L',order_index})),InputError);
  for (const price of ['',-1,'NaN','Infinity','1e2','0.001','10000000000']) assert.throws(() => parseRecord('menus',form({name:'M',price})),InputError);
  assert.equal(parseRecord('menus',form({name:'M',price:'12.50'})).values.price,12.5);
});
test('materials validate provider combinations and reject deceptive URLs', () => {
  const base = {title:'M',order_index:0,type:'pdf',provider:'drive',url:'https://drive.google.com/file/d/example/view'};
  assert.equal(parseRecord('materials',form(base)).values.type,'pdf');
  for (const update of [{provider:'youtube'}, {type:'text'}, {url:'javascript:alert(1)'}, {url:'https://drive.google.com.evil.test/a'}, {url:'https://evil@drive.google.com/a'}, {url:'https://drive.google.com:8443/a'}, {url:''}]) assert.throws(() => parseRecord('materials',form({...base,...update})),InputError);
  assert.equal(parseRecord('materials',form({...base,type:'video',provider:'youtube',url:'https://youtu.be/example'})).values.provider,'youtube');
});
test('mutation context rejects unknown entities and malformed IDs', () => {
  for (const context of [null,{}, {entity:'profiles'}, {entity:'__proto__'}, {entity:'subjects',id:'bad'}, {entity:'courses'}]) assert.throws(() => validateContext(context),InputError);
  validateContext({entity:'subjects'});
  validateContext({entity:'courses',parentId:'00000000-0000-4000-8000-000000000001'});
});
