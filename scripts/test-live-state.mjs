import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { buyerOrderPrintHtml, buyerWhatsAppText, createBuyerOrderDocx } from '../src/buyer-order.js';
import { formatMoney, formatPricePerKg } from '../src/catalog-format.js';

const source = (await readFile(new URL('../src/auth-live.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '');
const account = {user:{id:'user-a',user_metadata:{full_name:'Admin Operator'}},membership:{role:'admin',organization_id:'org-a',status:'active'}};
let finishLink;
const directoryRoleCounts = (role,assignedRole) => {
  const total = role === assignedRole ? 1 : 0;
  return {total,active:total,pending:0,suspended:0};
};
const directoryOrganization = (id,name,role) => ({
  id,name,country_code:null,created_at:'2026-01-01',member_count:1,
  membership_counts:Object.fromEntries(['supplier','importer','distributor','horeca','admin']
    .map(memberRole=>[memberRole,directoryRoleCounts(memberRole,role)]))
});
let directoryOrganizations = [
  directoryOrganization('org-supplier','Supplier Co','supplier'),
  directoryOrganization('org-buyer','Buyer Co','importer')
];
const directoryCalls=[];
let orderRows=[];
let orderItemRows=[];
let nextOrderRpc={data:null,error:null};
const orderRpcCalls=[];
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
let nextProductInsert={data:{id:'admin-created-product',organization_id:'org-supplier',sales_channel:'source',
  status:'published',audience_roles:['importer','horeca'],audience_override:true},error:null};
const productInserts=[];
const client = {
  auth:{onAuthStateChange(fn){onAuth=fn;},signOut:async()=>({error:null})},
  functions:{async invoke(name,options){
    directoryCalls.push({name,body:options.body});
    if(name!=='admin-organizations') return {data:null,error:{message:'unexpected function'}};
    if(options.body.action==='list') return {data:{organizations:directoryOrganizations},error:null};
    return {data:{ok:true,organizationId:options.body.organizationId,countryCode:options.body.countryCode},error:null};
  }},
  async rpc(name,args){
    orderRpcCalls.push({name,args});
    return nextOrderRpc;
  },
  from(table){
    if(table==='fruidges_orders') return {select(){return this;},order:async()=>({data:orderRows,error:null})};
    if(table==='fruidges_order_items') {
      let ids=[];
      return {select(){return this;},in(_column,values){ids=values;return this;},
        order:async()=>({data:orderItemRows.filter(item=>ids.includes(item.order_id)),error:null})};
    }
    if(table==='fruidges_products') {
      let update;
      return {
        update(values){update={values,filters:[]};productUpdates.push(update);return this;},
        insert(values){productInserts.push(values);return this;},
        eq(column,value){update.filters.push([column,value]);return this;},
        select(){return this;},
        async single(){return update ? nextProductUpdate : {data:{...productInserts.at(-1),id:nextProductInsert.data.id},error:nextProductInsert.error};}
      };
    }
    return {select(){return this;},order:async()=>({data:[],error:null})};
  }
};
const context = vm.createContext({
  marketRoleLabels:{en:{supplier:'Supplier',importer:'Importer',distributor:'Distributor',horeca:'HORECA',admin:'Administrator'},ar:{supplier:'مورد',importer:'مستورد',distributor:'موزع',horeca:'هوريكا',admin:'مدير'}},marketRoles:['supplier','importer','distributor','horeca','admin'],sellerRoles:['supplier','importer','distributor'],audienceRoles:['supplier','importer','distributor','horeca'],createClient:()=>client,resolveMembership:async()=>account,
  createUserWithSetupLink:()=>new Promise(resolve=>{finishLink=resolve;}),
  escapeHtml:String,formatMoney,formatPricePerKg,formatConverted:String,fxForm:()=>'',fxFields:()=>({}),
  validateImage:()=>false,uploadImage:async()=>null,withImageUrls:async(_client,rows)=>rows,
  location:{hash:'',search:''},URLSearchParams,Intl,setTimeout, setInterval(){},
  document:{documentElement:{},hidden:false,getElementById:node,addEventListener(){}},
  FormData:class {
    constructor(target){this.target=target;}
    get(name){return this.target?.values?.[name] ?? (name==='email'?'new@example.test':name==='role'?'supplier':null);}
    getAll(name){const value=this.target?.values?.[name];return value==null?[]:Array.isArray(value)?value:[value];}
  },
  buyerOrderPrintHtml,buyerWhatsAppText,createBuyerOrderDocx,
  hasBuyerOriginMapCoordinates:()=>true,
  mountBuyerOriginMap(element,origins,handlers){
    mountedOriginMap={element,origins,handlers};
    return {remove(){}};
  },
  navigator:{}, crypto:globalThis.crypto, account, console
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

const adminProductOrganization=directoryOrganization('org-supplier','Supplier Co','supplier');
context.adminProductOrganization=adminProductOrganization;
const adminProductValues={
  product_owner:'org-supplier:supplier',image:null,sku:'ADMIN-1',name_en:'Apples',name_ar:'تفاح',
  category_en:'Fruit',category_ar:'فاكهة',origin_country:'TN',packaging:'Carton',
  net_weight_kg:'10',stock_cartons:'4',price_per_carton:'12.5',currency:'USD',
  price_term:'CIF',price_destination:'Kuwait',status:'published'
};
context.adminProductValues=adminProductValues;
run("current=account;language='en';activeAdminView='products';organizations=[adminProductOrganization];products=[];productsLoaded=true;productsLoading=false;productsError='';show();");
assert.match(node('root').innerHTML,/Visible to \(choose one or more roles\)/);
assert.match(node('root').innerHTML,/name="audience" value="horeca"/);
run("language='ar';show();");
assert.match(node('root').innerHTML,/مرئي لـ \(اختر دوراً أو أكثر\)/);
run("language='en';show();");
await node('product-form').submit({preventDefault(){},currentTarget:{values:{...adminProductValues,audience:[]}}});
assert.equal(productInserts.length,0,'an administrator cannot create a product without selecting an audience');
assert.equal(node('product-message').textContent,'Select at least one audience role.');
await node('product-form').submit({preventDefault(){},currentTarget:{values:{...adminProductValues,audience:['horeca','importer','horeca']}}});
assert.equal(productInserts.length,1);
assert.deepEqual(JSON.parse(JSON.stringify(productInserts[0].audience_roles)),['importer','horeca'],
  'administrator audience roles are validated, de-duplicated and kept in canonical order');
assert.equal(productInserts[0].audience_override,true,'administrator choices are sent as an explicit override');

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
assert.doesNotMatch(run('productForm()'),/product-audience|name="audience"/,'seller forms cannot set recipient roles');
assert.match(node('root').innerHTML,/data-publish="draft-a"/);
await node('catalog').click({target:publishButton});
assert.equal(JSON.stringify(productUpdates[0]),JSON.stringify({
  values:{status:'published'},
  filters:[['id','draft-a'],['status','draft']]
}));
assert.equal(run('products[0].status'),'published');

const buyer={user:{id:'buyer-a',user_metadata:{full_name:'Buyer Agent',role:'admin'}},membership:{role:'importer',organization_id:'org-a',status:'active'}};
context.buyer=buyer;
const horeca={user:{id:'horeca-a',user_metadata:{name:'HORECA Manager'}},membership:{role:'horeca',organization_id:'horeca-org',status:'active'}};
context.horeca=horeca;
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

const liveOffer={...draft,id:'live-source',status:'published',sales_channel:'source',audience_roles:['importer'],
  organization_id:'supplier-org',name_en:'Live apples',origin_country:'TN',
  stock_cartons:4,price_per_carton:'12.500',currency:'USD'};
const zeroWeightOffer={...liveOffer,id:'zero-weight',net_weight_kg:'0.000'};
const otherOriginOffer={...liveOffer,id:'live-other',name_en:'Live pears',origin_country:'FR'};
const horecaOffer={...liveOffer,id:'live-horeca',sales_channel:'distribution',audience_roles:['horeca'],
  organization_id:'distributor-org',name_en:'HORECA live produce'};
context.liveOffer=liveOffer;
context.otherOriginOffer=otherOriginOffer;
context.horecaOffer=horecaOffer;
run("current=buyer;buyerView='explore';buyerOrigin='';buyerQuantity={};products=[liveOffer,otherOriginOffer,resaleDraft];productsLoaded=true;productsError='';show();");
assert.match(node('root').innerHTML,/class="buyer-layout"/);
assert.match(node('root').innerHTML,/Buyer Agent/,'buyer workspace displays the Auth profile name');
assert.match(node('root').innerHTML,/Importer \/ Wholesaler/,'buyer workspace displays its server-verified role');
assert.doesNotMatch(node('root').innerHTML,/Administrator<\/strong>/,'user metadata cannot override the membership role');
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
assert.match(run('buyerCartMarkup()'),/Cart selections stay local until you confirm an order/);
assert.match(run('buyerCartMarkup()'),/data-buyer-submit-order/,'cart offers the connected order submission action');
context.zeroWeightOffer=zeroWeightOffer;
run("products=[zeroWeightOffer];buyerQuantity={'zero-weight':1};buyerView='cart';");
assert.match(run('buyerCartMarkup()'),/data-buyer-submit-order disabled/,
  'checkout remains unavailable when a required carton weight is invalid');
assert.match(run('buyerCartMarkup()'),/positive net weight per carton/,
  'the cart explains why confirmation is unavailable');
run("products=[liveOffer,otherOriginOffer,resaleDraft];buyerQuantity={'live-source':5};");
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

const persistedOrder={
  id:'order-a',reference:'ORD-ABC123',buyer_organization_id:'org-a',buyer_role:'importer',
  seller_organization_id:'supplier-org',seller_channel:'source',buyer_company_name:'Buyer Co',
  seller_company_name:'Supplier Co',status:'in_progress',created_at:'2026-11-22T10:00:00Z'
};
const persistedItem={
  order_id:'order-a',sku:'A-1',name_en:'Live apples',name_ar:'تفاح',origin_country:'TN',
  packaging:'Carton',net_weight_kg:'10.000',cartons:1,unit_price:'12.500',currency:'USD',
  price_term:'CIF',price_destination:'Kuwait',line_total:'12.500',created_at:'2026-11-22T10:00:00Z'
};
context.persistedOrder=persistedOrder;
context.persistedItem=persistedItem;
orderRows=[persistedOrder];
orderItemRows=[persistedItem];
run("current=buyer;language='en';buyerView='cart';buyerQuantity={'live-source':1};buyerCheckoutKey='';ordersLoaded=false;ordersLoading=false;ordersError='';show();");
const submitOrderButton={closest(selector){return selector==='[data-buyer-submit-order]'?this:null;}};
nextOrderRpc={data:null,error:{code:'P0001',message:'stock_changed'}};
await node('root').click({target:{closest(selector){
  return selector==='[data-buyer-submit-order]'?submitOrderButton:null;
}}});
assert.equal(run("buyerQuantity['live-source']"),1,'a rejected checkout preserves the local cart');
assert.equal(node('message').textContent,'The selected quantity exceeds current stock. Reduce it to continue.');
const retryKey=run('buyerCheckoutKey');
assert.ok(retryKey,'a retryable request retains its idempotency key');
nextOrderRpc={data:[{id:'order-a',reference:'ORD-ABC123',seller_organization_id:'supplier-org',status:'in_progress'}],error:null};
await node('root').click({target:{closest(selector){
  return selector==='[data-buyer-submit-order]'?submitOrderButton:null;
}}});
assert.equal(orderRpcCalls.length,2,'confirming the cart calls the persisted-order RPC');
assert.equal(orderRpcCalls[0].name,'fruidges_create_orders');
assert.equal(orderRpcCalls[0].args.p_items[0].cartons,1);
assert.equal(orderRpcCalls[0].args.p_idempotency_key,retryKey);
assert.equal(orderRpcCalls[1].args.p_idempotency_key,retryKey,'a retry uses the same idempotency key');
assert.equal(run('buyerCartCount()'),0,'a successful submission clears the cart');
assert.match(node('buyer-content').innerHTML,/ORD-ABC123/,'the buyer sees the persisted order after checkout');
assert.match(node('buyer-content').innerHTML,/In progress — awaiting seller confirmation/);
assert.match(node('buyer-content').innerHTML,/data-order-action="cancel"/);
assert.match(node('message').textContent,/Order created/);
run("language='ar';show();");
assert.equal(run("t('buyerOrderStatusInProgress')"),'قيد التنفيذ — بانتظار تأكيد البائع');
assert.equal(context.document.documentElement.dir,'rtl');
assert.match(node('root').innerHTML,/قيد التنفيذ — بانتظار تأكيد البائع/);

run("current={user:{id:'seller-a',email:'seller@example.test'},membership:{role:'supplier',organization_id:'supplier-org',status:'active'}};language='en';purchaseOrders=[persistedOrder];ordersLoaded=true;ordersLoading=false;ordersError='';show();");
assert.match(node('root').innerHTML,/data-order-action="accept"/,'the seller can accept its incoming order');
assert.match(node('root').innerHTML,/data-order-action="reject"/,'the seller can decline its incoming order');
assert.match(node('root').innerHTML,/Supplier/,'supplier workspace displays its membership role');
assert.match(node('root').innerHTML,/seller@example\.test/,'email is used only when the Auth profile has no display name');
run("current=account;activeAdminView='orders';purchaseOrders=[persistedOrder];ordersLoaded=true;ordersLoading=false;ordersError='';show();");
assert.match(node('root').innerHTML,/ORD-ABC123/,'the administrator sees the order');
assert.doesNotMatch(node('root').innerHTML,/data-order-action=/,'the administrator cannot change order status in this workflow');

run("current=horeca;language='en';buyerView='explore';buyerOrigin='';buyerQuantity={};products=[horecaOffer,liveOffer];productsLoaded=true;productsError='';show();");
assert.match(node('root').innerHTML,/class="buyer-layout"/);
assert.match(node('root').innerHTML,/HORECA/);
assert.match(node('root').innerHTML,/HORECA live produce/);
assert.match(node('root').innerHTML,/HORECA Manager/);
assert.doesNotMatch(node('root').innerHTML,/id="buyer-map"|buyer-map-status|data-buyer-geo-mode=/,
  'HORECA has no map or map-mode controls');
assert.match(node('root').innerHTML,/data-buyer-origin="TN"/,'HORECA retains country flags and country navigation');
assert.deepEqual(JSON.parse(JSON.stringify(run("buyerOffers().map(product=>product.id)"))),['live-horeca'],
  'HORECA sees only published offers addressed to its role');
assert.doesNotMatch(node('root').innerHTML,/data-buyer-view="resale"|My sales offers|data-product-form-toggle|id="product-form"|data-publish=/,
  'HORECA has no resale navigation, product form or publish action');
assert.equal(run('productForm()'),'');
assert.equal(run('canPublish(resaleDraft)'),false,'HORECA cannot publish even an owned resale draft');
const forbiddenResaleNav={dataset:{buyerView:'resale'},closest(selector){return selector==='[data-buyer-view]'?this:null;}};
node('root').click({target:forbiddenResaleNav});
assert.equal(run('buyerView'),'explore','HORECA cannot navigate to the resale workspace');
run("buyerView='resale';renderBuyerContent();");
assert.doesNotMatch(node('buyer-content').innerHTML,/data-product-form-toggle|id="product-form"|data-publish=/,
  'a forced resale view falls back to the read-only exploration page');
run("language='ar';buyerView='explore';show();");
assert.equal(context.document.documentElement.lang,'ar');
assert.equal(context.document.documentElement.dir,'rtl');
assert.match(node('root').innerHTML,/الفنادق والمطاعم والمقاهي/);
assert.doesNotMatch(node('root').innerHTML,/id="buyer-map"|data-buyer-geo-mode=/);
assert.doesNotMatch(node('root').innerHTML,/data-buyer-view="resale"|إضافة منتج|data-publish=/);

nextProductUpdate={data:null,error:{code:'42501'}};
run("language='en';current={user:{id:'supplier-a'},membership:{role:'supplier',organization_id:'org-a',status:'active'}}; products=[draft]; productsLoaded=true; show();");
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
assert.match(node('root').innerHTML,/Admin Operator/,'administrator workspace displays the Auth profile name');
assert.match(node('root').innerHTML,/Administrator/,'administrator workspace displays its membership role');
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
const buyerDirectoryMarkup=run("adminDirectoryContent('importer')");
assert.match(buyerDirectoryMarkup,/Buyer Co/);
assert.match(buyerDirectoryMarkup,/B-1/);
assert.doesNotMatch(buyerDirectoryMarkup,/S-MISLINKED/);
assert.match(buyerDirectoryMarkup,/offer audience that does not match this company role/);
assert.match(buyerDirectoryMarkup,/Products from this company \(1\)/);
run("language='ar';");
assert.match(run("adminDirectoryContent('importer')"),/بعض منتجات الكتالوج/);
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

run('current=null;busy=true;');
await run('restoreStoredSession(revision)');
assert.equal(run('current.user.id'),account.user.id,'Reload restores server-verified membership');
run('current=null;');
await run('restoreStoredSession(revision-1)');
assert.equal(run('current'),null,'Cancelled restoration cannot resurrect a session');
onAuth('SIGNED_OUT');
assert.equal(run('busy'),false);
assert.match(source,/persistSession: true/);
console.log('PASS: persisted session configuration, authorized restoration and cancelled restoration.');
