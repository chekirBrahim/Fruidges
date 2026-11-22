// Canonical five-role model. SQL remains the authority for access control.
export const marketRoles = Object.freeze(['supplier','importer','distributor','horeca','admin']);
export const sellerRoles = Object.freeze(['supplier','importer','distributor']);
export const audienceRoles = Object.freeze(['supplier','importer','distributor','horeca']);
export const marketRoleLabels = Object.freeze({
 en:{supplier:'Supplier',importer:'Importer / Wholesaler',distributor:'Buyer / Distributor',horeca:'HORECA',admin:'Administrator'},
 ar:{supplier:'مورد',importer:'مستورد / تاجر جملة',distributor:'مشتري / موزع',horeca:'الفنادق والمطاعم والمقاهي',admin:'مدير'}
});
const nextRole=Object.freeze({supplier:'importer',importer:'distributor',distributor:'horeca'});
export function defaultAudience(sellerRole){
 if(!sellerRoles.includes(sellerRole))throw Error('invalid_seller_role');
 return [nextRole[sellerRole]];
}
export function normalizeAudience(roles){
 if(!Array.isArray(roles)||!roles.length||roles.some(r=>!audienceRoles.includes(r)))throw Error('invalid_audience');
 return audienceRoles.filter(r=>roles.includes(r));
}
export function canReadOffer(membership,product){
 if(!membership||membership.status!=='active'||!marketRoles.includes(membership.role)||!membership.organization_id)return false;
 if(membership.role==='admin')return true;
 if(sellerRoles.includes(membership.role)&&membership.organization_id===product.organization_id)return true;
 return product.status==='published'&&Array.isArray(product.audience_roles)&&product.audience_roles.includes(membership.role);
}
export function canManageOffer(membership,product){
 return Boolean(membership?.status==='active'&&membership.organization_id&&
 (membership.role==='admin'||(sellerRoles.includes(membership.role)&&membership.organization_id===product.organization_id)));
}
export function resolveOfferAudience({actor,sellerRole,requestedAudience,existing}){
 if(actor?.status!=='active'||!marketRoles.includes(actor.role))throw Error('access_denied');
 if(requestedAudience!==undefined){
  if(actor.role!=='admin')throw Error('admin_required');
  return {audience_roles:normalizeAudience(requestedAudience),audience_override:true};
 }
 if(existing)return {audience_roles:[...existing.audience_roles],audience_override:existing.audience_override};
 return {audience_roles:defaultAudience(sellerRole),audience_override:false};
}
