import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { buyerOrderPrintHtml, buyerWhatsAppText, createBuyerOrderDocx } from '../src/buyer-order.js';
import { formatMoney, formatPricePerKg } from '../src/catalog-format.js';

const source = (await readFile(new URL('../src/auth-live.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '');
const account = {user:{id:'user-a'},membership:{role:'admin',organization_id:'org-a',status:'active'}};
let finishLink;
const directoryRoleCounts = (role,assignedRole) => {
  const total = role === assignedRole ? 1 : 0;
  return {total,active:total,pending:0,suspended:0};
};
const directoryOrganization = (id,name,role) => ({
  id,name,country_code:null,created_at:'2026-01-01',member_count:1,
  membership_counts:Object.fromEntries(['supplier','buyer','restaurant','admin']
    .map(memberRole=>[memberRole,directoryRoleCounts(memberRole,role)]))
});
let directoryOrganizations = [
  directoryOrganization('org-supplier','Supplier Co','supplier'),
  directoryOrganization('org-buyer','Buyer Co','buyer')
];
const directoryCalls=[];
const nodes = new Map();
let mountedOriginMap;
const node = id => {
  if (!nodes.has(id)) nodes.set(id, {innerHTML:'',textContent:'',value:'',hidden:false,
    classList:{toggle(){}},addEventListener(name,fn){this[name]=fn;},setAttribute(name,value){this[name]=value;},reset(){}});
  return nodes.get(id);
};
let onAuth;
let nextProductUpdate={data:{id:'draft-a',status:'published'},error:null};
const productUpdates=[];
const client = {
  auth:{onAuthStateChange(fn){onAuth=fn;},signOut:async()=>({error:null})},
  functions:{async invoke(name,options){
    directoryCalls.push({name,body:options.body});
    if(name!=='admin-organizations') return {data:null,error:{message:'unexpected function'}};
    if(options.body.action==='list') return {data:{organizations:directoryOrganizations},error:null};
    return {data:{ok:true,organizationId:options.body.organizationId,countryCode:options.body.countryCode},error:null};
  }},
  from(table){
    if(table==='fruidges_products') {
      let update;
      return {
        update(values){update={values,filters:[]};productUpdates.push(update);return this;},
        eq(column,value){update.filters.push([column,value]);return this;},
        select(){return this;},
        async single(){return nextProductUpdate;}
      };
    }
    return {select(){return this;},order:async()=>({data:[],error:null})};
  }
};
const context = vm.createContext({
  createClient:()=>client,resolveMembership:async()=>account,
  createUserWithSetupLink:()=>new Promise(resolve=>{finishLink=resolve;}),
  escapeHtml:String,formatMoney,formatPricePerKg,formatConverted:String,fxForm:()=>'',
  location:{hash:'',search:''},URLSearchParams,Intl,setInterval(){},
  document:{documentElement:{},hidden:false,getElementById:node,addEventListener(){}},
  FormData:class {
    constructor(target){this.target=target;}
    get(name){return this.target?.values?.[name] ?? (name==='email'?'new@example.test':name==='role'?'supplier':null);}
  },
  buyerOrderPrintHtml,buyerWhatsAppText,createBuyerOrderDocx,
  hasBuyerOriginMapCoordinates:()=>true,
  mountBuyerOriginMap(element,origins,handlers){
    mountedOriginMap={element,origins,handlers};
    return {remove(){}};
  },
  navigator:{}, account, console
});
vm.runInContext(source,context);
const run = code => vm.runInContext(code,context);

run("current=account; products=[{id:'private-product'}]; productsLoading=true; productsError='catalogError'; setupLink='private-link'; show();");
await node('logout').click();
assert.equal(run('products.length'),0);
assert.equal(run('productsLoading'),false);
assert.equal(run('setupLink'),'');

run('current=account;');
const pending = run("createUserAccount({preventDefault(){},currentTarget:{reset(){}}})");
run('revision++; current=null; clearWorkspace();');
finishLink('private-late-link');
await pending;
assert.equal(run('setupLink'),'','Late response must not restore a private setup link');

run("current=account; busy=false; productsLoading=false;");
node('root').innerHTML='unsaved form sentinel';
await run('recheck()');
assert.equal(node('root').innerHTML,'unsaved form sentinel','Routine membership refresh preserves form input');

run("products=[{id:'private-product'}];productsLoading=true;setupLink='private-link';");
onAuth('SIGNED_OUT');
assert.equal(run('products.length'),0);
assert.equal(run('productsLoading'),false);
assert.equal(run('setupLink'),'');

const draft={id:'draft-a',organization_id:'org-a',sales_channel:'source',status:'draft',
  sku:'A-1',name_en:'Apples',name_ar:'تفاح',origin_country:'TN',packaging:'Carton',
  net_weight_kg:10,stock_cartons:3,price_per_carton:20,currency:'USD',
  price_term:'FOB',photo_status:'missing'};
context.draft=draft;
const publishButton={dataset:{publish:'draft-a'},disabled:false,textContent:'Publish',
  parentElement:{querySelector(){return node('publish-message');}},
  closest(selector){return selector==='[data-publish]'?this:null;}};
const accountsButton={dataset:{adminView:'accounts'},closest(selector){return selector==='[data-admin-view]'?this:null;}};
run('current={user:{id:"supplier-a"},membership:{role:"supplier",organization_id:"org-a",status:"active"}}; products=[draft]; productsLoaded=true; busy=false; show();');
assert.match(node('root').innerHTML,/data-publish="draft-a"/);
await node('catalog').click({target:publishButton});
assert.equal(JSON.stringify(productUpdates[0]),JSON.stringify({
  values:{status:'published'},
  filters:[['id','draft-a'],['status','draft']]
}));
assert.equal(run('products[0].status'),'published');

const buyer={user:{id:'buyer-a'},membership:{role:'buyer',organization_id:'org-a',status:'active'}};
context.buyer=buyer;
run("current=buyer; buyerView='resale'; products=[draft]; productsLoaded=true; show();");
assert.doesNotMatch(node('root').innerHTML,/data-publish="draft-a"/);
await node('catalog').click({target:publishButton});
assert.equal(productUpdates.length,1,'buyers cannot publish supplier source offers');
run("activeAdminView='overview';");
node('root').click({target:accountsButton});
assert.equal(run('activeAdminView'),'overview','non-admin roles cannot enter admin views');

const resaleDraft={...draft,id:'resale-draft-a',sales_channel:'resale'};
context.resaleDraft=resaleDraft;
const resalePublishButton={...publishButton,dataset:{publish:'resale-draft-a'}};
run("buyerView='resale'; products=[resaleDraft]; productsLoaded=true; show();");
assert.match(node('root').innerHTML,/data-publish="resale-draft-a"/);
nextProductUpdate={data:{id:'resale-draft-a',status:'published'},error:null};
await node('catalog').click({target:resalePublishButton});
assert.equal(productUpdates.length,2,'buyers can publish their own resale offers');
assert.equal(run('products[0].status'),'published');

const liveOffer={...draft,id:'live-source',status:'published',sales_channel:'source',
  organization_id:'supplier-org',name_en:'Live apples',origin_country:'TN',
  stock_cartons:4,price_per_carton:'12.500',currency:'USD'};
const otherOriginOffer={...liveOffer,id:'live-other',name_en:'Live pears',origin_country:'FR'};
context.liveOffer=liveOffer;
context.otherOriginOffer=otherOriginOffer;
run("current=buyer;buyerView='explore';buyerOrigin='';buyerQuantity={};products=[liveOffer,otherOriginOffer,resaleDraft];productsLoaded=true;productsError='';show();");
assert.match(node('root').innerHTML,/class="buyer-layout"/);
assert.match(node('root').innerHTML,/data-buyer-view="explore"/);
assert.match(node('root').innerHTML,/Explore product origins/);
assert.match(node('root').innerHTML,/data-buyer-origin="TN"/);
assert.match(node('root').innerHTML,/id="buyer-map"/);
assert.doesNotMatch(node('root').innerHTML,/<svg/,'live buyer map uses real map tiles rather than an illustration');
assert.match(node('root').innerHTML,/Live apples/);
assert.match(node('root').innerHTML,/2 products/);
assert.doesNotMatch(node('root').innerHTML,/Unclassified audience/);
assert.doesNotMatch(node('root').innerHTML,/resale-draft-a/,'the sourcing catalogue excludes resale offers');
assert.equal(mountedOriginMap.element,node('buyer-map'));
assert.equal(JSON.stringify(mountedOriginMap.origins),JSON.stringify([['FR',1],['TN',1]]));
mountedOriginMap.handlers.onSelect('TN');
assert.equal(run('buyerView'),'catalog','choosing a real map marker filters the catalogue');
assert.equal(run('buyerOrigin'),'TN');
run("buyerView='catalog';buyerOrigin='TN';buyerQuantity={'live-source':2};");
assert.match(run('buyerCatalogMarkup()'),/Live apples/);
assert.doesNotMatch(run('buyerCatalogMarkup()'),/Live pears/,'origin selection filters the live catalogue');
assert.match(run('buyerCartMarkup()'),/USD 25\.00/,'cart totals multiply exact source prices by carton count');
assert.match(run('buyerCartMarkup()'),/order has been created/,'cart clearly discloses unavailable order submission');
run("buyerView='catalog';buyerQuantity={};show();");
const addCartButton={dataset:{buyerQuantity:'live-source',buyerDelta:'1'},
  closest(selector){return selector==='[data-buyer-quantity]'?this:null;}};
node('root').click({target:{closest(selector){
  return selector==='[data-buyer-quantity]'?addCartButton:null;
}}});
assert.equal(run("buyerQuantity['live-source']"),1,'adding a carton updates the selected quantity');
assert.equal(node('buyer-nav-cart-count').textContent,'1','adding a carton immediately updates the navigation count');
assert.equal(node('buyer-top-cart-count').textContent,'1','adding a carton immediately updates the cart shortcut');
assert.equal(node('message').textContent,'Added to your cart. The cart count has been updated.');
const prepareButton={closest(selector){return selector==='[data-buyer-prepare-order]'?this:null;}};
node('root').click({target:{closest(selector){
  return selector==='[data-buyer-prepare-order]'?prepareButton:null;
}}});
assert.match(node('buyer-content').innerHTML,/data-buyer-download-order/);
assert.match(node('buyer-content').innerHTML,/data-buyer-print-order/);
assert.match(node('buyer-content').innerHTML,/https:\/\/wa\.me\/\?text=/);
assert.match(node('buyer-content').innerHTML,/DRAFT-123|DRAFT-/);
assert.equal(node('message').textContent,'Draft prepared locally. No order has been submitted.');
assert.equal(run('buyerDraftOrder.lines.length'),1);
assert.equal(run('buyerDraftOrder.totals[0].amount'),'USD 12.50');
run("buyerQuantity['live-source']=5;buyerDraftOrder=null;buyerView='cart';renderBuyerContent();");
assert.match(node('buyer-content').innerHTML,/exceeds current stock/i);
assert.match(node('buyer-content').innerHTML,/data-buyer-prepare-order disabled/);

nextProductUpdate={data:null,error:{code:'42501'}};
run('current={user:{id:"supplier-a"},membership:{role:"supplier",organization_id:"org-a",status:"active"}}; products=[draft]; productsLoaded=true; show();');
await node('catalog').click({target:publishButton});
assert.equal(node('publish-message').textContent,'Publication failed. Refresh the catalogue and try again.');
assert.equal(publishButton.disabled,false);

const adminProducts=[
  {id:'source-live',sales_channel:'source',status:'published'},
  {id:'resale-live',sales_channel:'resale',status:'published'},
  {id:'draft-live',sales_channel:'source',status:'draft'}
];
context.adminProducts=adminProducts;
run("current=account; busy=false; products=adminProducts; productsLoading=false; productsLoaded=true; productsError=''; activeAdminView='overview'; language='en'; show();");
assert.match(node('root').innerHTML,/data-admin-view="overview"/);
assert.match(node('root').innerHTML,/id="admin-total-products" aria-live="polite">3/);
assert.doesNotMatch(node('root').innerHTML,/id="create-user"/);
run("productsError='catalogError'; show();");
assert.match(node('root').innerHTML,/id="admin-products-error" class="error" role="alert">The catalogue could not be loaded/);
assert.match(node('root').innerHTML,/id="admin-total-products" aria-live="polite">—/);
run("productsError=''; show();");
node('root').click({target:accountsButton});
assert.equal(run('activeAdminView'),'accounts');
assert.match(node('root').innerHTML,/id="create-user"/);
assert.match(node('root').innerHTML,/id="admin-user-directory"/);
assert.match(node('root').innerHTML,/id="create-user"/,'Account creation remains available alongside the directory');
const requestsButton={dataset:{adminView:'requests'},closest(selector){return selector==='[data-admin-view]'?this:null;}};
node('root').click({target:requestsButton});
assert.match(node('root').innerHTML,/id="admin-user-directory"/);
assert.doesNotMatch(node('root').innerHTML,/create-user/);
run("language='ar'; show();");
assert.equal(context.document.documentElement.lang,'ar');
assert.equal(context.document.documentElement.dir,'rtl');
assert.match(node('root').innerHTML,/طلبات الوصول/);
const directoryProduct={...draft,id:'supplier-product',organization_id:'org-supplier',sales_channel:'source',
  status:'published',sku:'S-1',origin_country:'TN',packaging:'Carton',net_weight_kg:10,
  stock_cartons:4,price_per_carton:12,currency:'USD',price_term:'CIF',
  price_destination:'Kuwait',photo_status:'missing'};
context.directoryProduct=directoryProduct;
context.directoryOrganizations=directoryOrganizations;
run("language='en'; current=account; products=[directoryProduct]; productsLoaded=true; productsLoading=false; productsError=''; activeAdminView='overview'; show();");
const suppliersButton={dataset:{adminView:'suppliers'},closest(selector){return selector==='[data-admin-view]'?this:null;}};
await node('root').click({target:suppliersButton});
assert.equal(directoryCalls.at(-1).name,'admin-organizations');
assert.equal(directoryCalls.at(-1).body.action,'list');
const supplierDirectoryMarkup=run("adminDirectoryContent('supplier')");
assert.match(supplierDirectoryMarkup,/Supplier Co/);
assert.match(supplierDirectoryMarkup,/Country not provided/);
assert.match(supplierDirectoryMarkup,/S-1/);
assert.match(supplierDirectoryMarkup,/12/);
assert.doesNotMatch(supplierDirectoryMarkup,/person@example.com/);
context.buyerDirectoryProducts=[
  {...directoryProduct,id:'buyer-resale',organization_id:'org-buyer',sales_channel:'resale',sku:'B-1'},
  {...directoryProduct,id:'mislinked-source',organization_id:'org-buyer',sales_channel:'source',sku:'S-MISLINKED'}
];
run("products=buyerDirectoryProducts; productsLoaded=true; productsLoading=false; productsError='';");
const buyerDirectoryMarkup=run("adminDirectoryContent('buyer')");
assert.match(buyerDirectoryMarkup,/Buyer Co/);
assert.match(buyerDirectoryMarkup,/B-1/);
assert.doesNotMatch(buyerDirectoryMarkup,/S-MISLINKED/);
assert.match(buyerDirectoryMarkup,/offer audience that does not match this company role/);
assert.match(buyerDirectoryMarkup,/Products from this company \(1\)/);
run("language='ar';");
assert.match(run("adminDirectoryContent('buyer')"),/بعض منتجات الكتالوج/);
run("language='en'; products=[directoryProduct];");
const countryForm={dataset:{organizationId:'org-supplier'},values:{countryCode:'tn'},
  querySelector(){return {disabled:false,textContent:'Save country'};}};
context.countryForm=countryForm;
await run("saveCompanyCountry({preventDefault(){}},countryForm)");
assert.equal(JSON.stringify(directoryCalls.at(-1)),JSON.stringify({
  name:'admin-organizations',
  body:{action:'set_country',organizationId:'org-supplier',countryCode:'TN'}
}));
assert.equal(run("organizations[0].country_code"),'TN');
assert.match(node('admin-directory').innerHTML,/🇹🇳 Tunisia/);
run('clearWorkspace()');
assert.equal(run('organizations.length'),0);
assert.equal(run('directoryLoaded'),false);
console.log('PASS: admin company lists, live product details, country editing, locale behavior, and session cleanup.');
