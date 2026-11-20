import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
const code = await readFile(new URL('../src/auth-demo.js', import.meta.url), 'utf8');
for (const [email, expected] of [['supplier@demo.test','fournisseur'],['buyer@demo.test','acheteur'],['restaurant@demo.test','restaurant'],['admin@demo.test','admin']]) {
  const nodes = new Map(); let submit; const visits = [];
  const node = id => { if (!nodes.has(id)) nodes.set(id, {innerHTML:'',textContent:'',addEventListener:(_, fn)=>{submit=fn;}}); return nodes.get(id); };
  const context = { role:'', page:'', map:null, basket:[], uiLang:'en', names:{}, menus:{}, closeModal(){},
    FormData: class { constructor(data){this.data=data;} get(key){return this.data[key];} },
    document:{documentElement:{},getElementById:node,querySelector:selector=>selector==='.toplinks'?node(selector):null},
    enter(role,page){ visits.push({role,page});context.role=role;}, go(){},render(){}
  };
  context.window=context;
  runInNewContext(code, context);
  assert.match(node('root').innerHTML,/loginForm/);
  submit({preventDefault(){},target:{email,code:'wrong'}});
  assert.equal(visits.length,0);
  assert.match(node('loginError').textContent,/incorrect/);
  submit({preventDefault(){},target:{email:'unknown@demo.test',code:'fruidges-demo'}});
  assert.equal(visits.length,0);
  submit({preventDefault(){},target:{email,code:'fruidges-demo'}});
  assert.equal(visits.at(-1).role,expected);
  context.enter(expected==='admin'?'fournisseur':'admin');
  assert.equal(visits.length,1,'No cross-role navigation in the UI');
  context.fruidgesSignOut();
  context.enter(expected);
  assert.equal(visits.length,1,'Signed-out session cannot open a workspace');
  assert.match(node('root').innerHTML,/loginForm/);
}
console.log('PASS: four demo account routes, invalid code, unknown account, cross-role navigation, sign-out. These are UI tests, not server security tests.');
