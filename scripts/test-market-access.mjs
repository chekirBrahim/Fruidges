import assert from 'node:assert/strict';
import {marketRoles,defaultAudience,canReadOffer,canManageOffer,resolveOfferAudience} from '../src/market-access.js';
const member=role=>({role,status:'active',organization_id:'viewer'});
for(const seller of ['supplier','importer','distributor']){
 const product={organization_id:'seller',status:'published',audience_roles:defaultAudience(seller)};
 for(const role of marketRoles){
  assert.equal(canReadOffer(member(role),product),role==='admin'||defaultAudience(seller).includes(role),`${seller} -> ${role}`);
  assert.equal(canReadOffer(member(role),{...product,status:'draft'}),role==='admin');
  assert.equal(canReadOffer({...member(role),status:'suspended'},product),false);
  assert.equal(canManageOffer(member(role),product),role==='admin');
 }
 assert.equal(canReadOffer({...member(seller),organization_id:'seller'},{...product,status:'draft'}),true);
 assert.equal(canReadOffer(null,product),false);
 assert.throws(()=>resolveOfferAudience({actor:member(seller),sellerRole:seller,requestedAudience:['horeca']}),/admin_required/);
}
const override=resolveOfferAudience({actor:member('admin'),sellerRole:'supplier',requestedAudience:['horeca','importer','horeca']});
assert.deepEqual(override,{audience_roles:['importer','horeca'],audience_override:true});
assert.equal(canReadOffer(member('horeca'),{organization_id:'seller',status:'published',...override}),true);
assert.equal(canReadOffer(member('distributor'),{organization_id:'seller',status:'published',...override}),false);
assert.deepEqual(resolveOfferAudience({actor:member('supplier'),sellerRole:'supplier',existing:override}),override);
for(const roles of [[],['admin'],['unknown']])assert.throws(()=>resolveOfferAudience({actor:member('admin'),sellerRole:'supplier',requestedAudience:roles}));
console.log('PASS: five-role access matrix, admin multi-audience override, ownership, drafts and suspension (domain tests, not hosted RLS).');
