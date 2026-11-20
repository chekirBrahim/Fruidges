import {escapeHtml as esc} from './catalog-format.js';
const words={
 en:{title:'User directory',search:'Email or company',filter:'Status',all:'All',active:'Active',pending:'Pending',suspended:'Suspended',refresh:'Search / refresh',loading:'Loading users…',empty:'No matching users.',error:'Unable to load users. Check that SQL 08 has been applied.',saveError:'Unable to change access. Check SQL 09 and your administrator rights.',activate:'Activate',suspend:'Suspend',confirm:'Suspend access for this user?',cancel:'Cancel',back:'Previous',next:'Next',total:'Users',protected:'Administrator account protected',supplier:'Supplier',buyer:'Buyer / wholesaler',restaurant:'Restaurant',admin:'Administrator',saved:'Access updated.',email:'Email',company:'Company',role:'Role',actions:'Actions'},
 ar:{title:'قائمة المستخدمين',search:'البريد الإلكتروني أو الشركة',filter:'الحالة',all:'الكل',active:'نشط',pending:'قيد الانتظار',suspended:'موقوف',refresh:'بحث / تحديث',loading:'جارٍ تحميل المستخدمين…',empty:'لا يوجد مستخدمون مطابقون.',error:'تعذر تحميل المستخدمين. تحقق من تنفيذ SQL 08.',saveError:'تعذر تغيير الصلاحيات. تحقق من SQL 09 وصلاحيات المدير.',activate:'تفعيل',suspend:'إيقاف',confirm:'هل تريد إيقاف وصول هذا المستخدم؟',cancel:'إلغاء',back:'السابق',next:'التالي',total:'المستخدمون',protected:'حساب المدير محمي',supplier:'مورد',buyer:'مشتري / تاجر جملة',restaurant:'مطعم',admin:'مدير',saved:'تم تحديث الصلاحيات.',email:'البريد الإلكتروني',company:'الشركة',role:'الدور',actions:'الإجراءات'}
};
export function mountAdminUsers(host,client,language,isCurrent,pendingOnly=false){
 const t=key=>words[language][key]||key;
 let page=0,search='',status=pendingOnly?'pending':'',rows=[],total=0,loading=false,version=0;
 host.innerHTML=`<section class="card"><h2>${t('title')}</h2><form data-filter class="admin-user-filters"><label>${t('search')}<input name="search" maxlength="200"></label><label>${t('filter')}<select name="status">${['','active','pending','suspended'].map(s=>`<option value="${s}" ${s===status?'selected':''}>${t(s||'all')}</option>`).join('')}</select></label><button>${t('refresh')}</button></form><p data-notice role="status"></p><div data-results></div><div class="actions"><button data-back class="secondary">${t('back')}</button><span data-total></span><button data-next class="secondary">${t('next')}</button></div></section>`;
 const q=s=>host.querySelector(s),alive=()=>host.isConnected&&isCurrent();
 function controls(){q('[data-back]').disabled=loading||page===0;q('[data-next]').disabled=loading||(page+1)*50>=total;q('[data-filter] button').disabled=loading;}
 async function load(){
  const ticket=++version;loading=true;controls();q('[data-notice]').textContent=t('loading');
  q('[data-results]').innerHTML='';
  try {
   const {data,error}=await client.rpc('fruidges_admin_list_users',{p_search:search,p_status:status,p_page:page});
   if(!alive()||ticket!==version)return;
   if(error||!Array.isArray(data?.users)||!Number.isInteger(data.total))throw Error();
   rows=data.users;total=data.total;
   q('[data-notice]').textContent=rows.length?'':t('empty');
   q('[data-total]').textContent=`${t('total')}: ${total} · ${page+1}`;
   q('[data-results]').innerHTML=`<div class="admin-user-table"><table><thead><tr>${['email','company','role','filter','actions'].map(k=>`<th>${t(k)}</th>`).join('')}</tr></thead><tbody>${rows.map(u=>`<tr><td dir="ltr">${esc(u.email||'—')}</td><td>${esc(u.organization_name)}</td><td>${esc(t(u.role))}</td><td>${esc(t(u.status))}</td><td>${u.role==='admin'?t('protected'):`<button data-user="${esc(u.user_id)}" data-status="${u.status==='active'?'suspended':'active'}">${t(u.status==='active'?'suspend':'activate')}</button>`}</td></tr>`).join('')}</tbody></table></div>`;
  }catch{if(alive()&&ticket===version){q('[data-notice]').textContent=t('error');total=0;}}
  finally{if(alive()&&ticket===version){loading=false;controls();}}
 }
 q('[data-filter]').addEventListener('submit',e=>{e.preventDefault();if(loading)return;const f=new FormData(e.currentTarget);search=String(f.get('search')).trim();status=String(f.get('status'));page=0;load();});
 q('[data-back]').onclick=()=>{if(!loading&&page>0){page--;load();}};
 q('[data-next]').onclick=()=>{if(!loading&&(page+1)*50<total){page++;load();}};
 q('[data-results]').addEventListener('click',async e=>{
  const b=e.target.closest('[data-user]');if(!b||loading)return;
  if(!rows.some(u=>u.user_id===b.dataset.user&&u.role!=='admin'))return;
  if(b.dataset.status==='suspended'&&!b.dataset.confirm){b.dataset.confirm='yes';b.textContent=t('confirm');return;}
  loading=true;controls();b.disabled=true;
  try{const {error}=await client.rpc('fruidges_admin_set_user_status',{p_user:b.dataset.user,p_status:b.dataset.status});if(!alive())return;if(error)throw Error();await load();}
  catch{if(alive()){q('[data-notice]').textContent=t('saveError');b.disabled=false;}}
  finally{if(alive()){loading=false;controls();}}
 });
 load();
}
