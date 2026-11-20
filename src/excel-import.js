import {unzipSync,strFromU8} from 'fflate';
import {escapeHtml as esc, fxForm, fxFields} from './catalog-format.js';
export function readOrderWorkbook(bytes){
 const zip=unzipSync(bytes,{filter:entry=>{
  if(entry.originalSize>12*1024*1024)throw Error('Workbook too large');
  return /^xl\/(sharedStrings.xml|worksheets\/sheet\d+.xml)$/.test(entry.name);
 }});
 const xml=path=>new DOMParser().parseFromString(strFromU8(zip[path]),'application/xml');
 const texts=node=>Array.from(node.getElementsByTagName('t')).map(n=>n.textContent).join('');
 const strings=zip['xl/sharedStrings.xml']?Array.from(xml('xl/sharedStrings.xml').getElementsByTagName('si')).map(texts):[];
 const matches=[];
 for(const path of Object.keys(zip).filter(p=>p.startsWith('xl/worksheets/'))){
  const rows=Array.from(xml(path).getElementsByTagName('row')).map(r=>({number:Number(r.getAttribute('r')),cells:Object.fromEntries(Array.from(r.getElementsByTagName('c')).map(c=>{
   const col=c.getAttribute('r').replace(/\d/g,'');const raw=c.getElementsByTagName('v')[0]?.textContent||'';
   const value=c.getAttribute('t')==='s'?strings[Number(raw)]||'':c.getAttribute('t')==='inlineStr'?texts(c):raw;
   return [col,{value,formula:c.getElementsByTagName('f').length>0}];
  }))}));
  const header=rows.findIndex(r=>r.cells.E?.value.trim()==='Product'&&r.cells.H?.value.trim()==='Net box Weight (Kg)');
  if(header<0)continue;
  const h=rows[header].cells;
  const expected={C:'Category',D:'Photos',E:'Product',F:'Arabic desgnation',G:'Size/pack',H:'Net box Weight (Kg)',L:'Order Box',M:'Order weight',N:'Amount ($)'};
  const clean=s=>String(s||'').trim().replace(/\s+/g,' ');
  if(Object.entries(expected).some(([k,v])=>clean(h[k]?.value)!==v)||Object.keys(h).some(k=>(k.length>1||k>'N')&&clean(h[k]?.value)))throw Error('format');
  const price=clean(h.I?.value);const currency=price.match(/\(([A-Z]{3})\s*\/\s*BOX\)/i)?.[1].toUpperCase();
  if(!currency)throw Error('currency');
  const products=[];
  // L, M and N are excluded before mapping. Order quantities are never stock.
  for(const row of rows.slice(header+1)){
   const kept=Object.fromEntries(['C','D','E','F','G','H','I','J','K'].map(k=>[k,row.cells[k]]));
   if(!kept.E?.value.trim())continue;
   const get=k=>String(kept[k]?.value||'').trim();
   products.push({row:row.number,name_en:get('E'),name_ar:get('F'),category_en:get('C')||null,packaging:get('G'),net_weight_kg:get('H'),price_per_carton:get('I'),currency,calculated:['C','E','F','G','H','I'].some(k=>kept[k]?.formula)});
  }
  matches.push(products);
 }
 if(matches.length!==1||!matches[0].length||matches[0].length>500)throw Error('format');
 return matches[0];
}
export async function prepareProducts(rows,owner,origin){
 if(!owner||!['source','resale'].includes(owner.channel)||!/^[A-Z]{2}$/.test(origin))throw Error('settings');
 const result=[],seen=new Set();
 for(const r of rows){
  if(!['USD','KWD'].includes(r.currency))throw Error(`currency:${r.currency}`);
  const stockText=String(r.stock_cartons??'').trim();
  if(!/^\d+$/.test(stockText)||Number(stockText)>2147483647||!r.name_en||!r.name_ar||!r.packaging||!/^\d+(\.\d{1,3})?$/.test(r.net_weight_kg)||Number(r.net_weight_kg)<=0||Number(r.net_weight_kg)>=1e9||!/^\d+(\.\d{1,4})?$/.test(r.price_per_carton)||Number(r.price_per_carton)>=1e11)throw Error('row:'+r.row);
  const stock=Number(stockText);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([r.name_en,r.packaging,String(Number(r.net_weight_kg)),origin])));
  const sku='XL-'+Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
  if(seen.has(sku))throw Error('duplicate:'+r.row);seen.add(sku);
  result.push({organization_id:owner.id,sales_channel:owner.channel,sku,name_en:r.name_en,name_ar:r.name_ar,category_en:r.category_en,origin_country:origin,packaging:r.packaging,net_weight_kg:r.net_weight_kg,stock_cartons:stock,price_per_carton:r.price_per_carton,currency:r.currency,price_term:'CIF',price_destination:'KWI',photo_path:null,photo_status:'missing',status:'draft'});
 }
 return result;
}
const labels={en:{open:'Import Excel',owner:'Supplier / Buyer',file:'Excel file (.xlsx, max 5 MB)',origin:'Origin country (2 letters, applies to all rows)',preview:'Preview',confirm:'Import as drafts',previewRow:'Row',previewProduct:'Product',previewArabic:'Arabic name',previewPack:'Packaging',previewWeight:'Net weight / carton',previewCIF:'CIF price / carton',previewStock:'Available stock (cartons)',previewCalculated:'Formula value',note:'Last 3 columns are excluded. Landed-cost columns are not imported as CIF prices. Enter available stock separately for each product below; order quantities are not stock. Photos are not imported. Cached formula values require review. Existing SKUs are skipped, never overwritten.',review:'Review calculated values (*). Uncheck rows to exclude them; correct Size/pack or price here. Enter stock for each selected row. Duplicate products must be resolved before importing.',currencyUnsupported:'CIF prices must be provided in USD or KWD. No currency conversion or landed-cost substitution is performed.',error:'Import blocked: check the format, required values, duplicates and currency or exchange-rate fields. Row: ',success:'New products imported: ',ready:'Rows ready: ',cancel:'Close'},ar:{open:'استيراد Excel',owner:'المورد / المشتري',file:'ملف Excel (.xlsx، حتى 5 ميغابايت)',origin:'بلد المنشأ (حرفان، لجميع الصفوف)',preview:'معاينة',confirm:'استيراد كمسودات',previewRow:'الصف',previewProduct:'المنتج',previewArabic:'الاسم بالعربية',previewPack:'التعبئة',previewWeight:'الوزن الصافي / كرتون',previewCIF:'سعر CIF / كرتون',previewStock:'المخزون المتاح (كراتين)',previewCalculated:'قيمة محسوبة',note:'تُستبعد آخر 3 أعمدة. لا تُستورد أعمدة التكلفة النهائية كسعر CIF. أدخل مخزون كل منتج على حدة أدناه؛ كميات الطلب ليست مخزوناً. لا تُستورد الصور. راجع القيم المحسوبة. يتم تخطي الرموز الموجودة دون تعديلها.',review:'راجع القيم المحسوبة (*). ألغ تحديد الصفوف لاستبعادها أو صحح الحجم والسعر. أدخل مخزون كل صف محدد. يجب معالجة التكرارات قبل الاستيراد.',currencyUnsupported:'يجب إدخال أسعار CIF بالدولار الأمريكي USD أو الدينار الكويتي KWD. لا يتم تحويل العملات أو استبدالها بتكلفة نهائية.',error:'تعذر الاستيراد: تحقق من التنسيق والقيم والتكرار والعملة وأسعار الصرف. الصف: ',success:'المنتجات الجديدة المستوردة: ',ready:'الصفوف الجاهزة: ',cancel:'إغلاق'}};
export function mountExcelImport(host,client,language,owners,isCurrent,onSaved){
 const t=labels[language];let prepared=null,loading=false;
 host.innerHTML=`<details class="excel-import"><summary>${t.open}</summary><form><label>${t.owner}<select name="owner" required><option value="">—</option>${owners.map((o,i)=>`<option value="${i}">${esc(o.name)} — ${o.channel==='source'?(language==='ar'?'مورد':'Supplier'):(language==='ar'?'مشتري / تاجر جملة':'Buyer / wholesaler')}</option>`).join('')}</select></label><label>${t.file}<input name="file" type="file" accept=".xlsx" required></label><label>${t.origin}<input name="origin" maxlength="2" pattern="[A-Za-z]{2}" required></label>${fxForm(language)}<p>${t.note}</p><button>${t.preview}</button></form><p data-status role="status"></p><div data-preview></div><button type="button" data-confirm hidden>${t.confirm}</button></details>`;
 const q=s=>host.querySelector(s),alive=()=>host.isConnected&&isCurrent();
 q('form').addEventListener('input',()=>{prepared=null;q('[data-confirm]').hidden=true;q('[data-preview]').innerHTML='';});
 q('form').addEventListener('submit',async e=>{
  e.preventDefault();if(loading)return;loading=true;prepared=null;q('[data-confirm]').hidden=true;q('form button').disabled=true;
  const form=new FormData(e.currentTarget);
  try{const file=form.get('file');if(!file||file.size>5*1024*1024||!file.name.toLowerCase().endsWith('.xlsx'))throw Error('file');
   const rows=readOrderWorkbook(new Uint8Array(await file.arrayBuffer()));
   const unsupportedCurrency=rows.find(r=>!['USD','KWD'].includes(r.currency));
   if(unsupportedCurrency)throw Error(`currency:${unsupportedCurrency.currency}`);
   const owner=owners[Number(form.get('owner'))];if(!owner)throw Error('owner');
   if(!alive())return;prepared={rows,form,owner};
   q('[data-preview]').innerHTML=`<p>${t.review}</p><div class="admin-user-table"><table><thead><tr><th>${t.previewRow}</th><th>${t.previewProduct}</th><th>${t.previewArabic}</th><th>${t.previewPack}</th><th>${t.previewWeight}</th><th>${t.previewCIF}</th><th>${t.previewStock}</th><th>${t.previewCalculated}</th></tr></thead><tbody>${rows.map(r=>`<tr><td><input type="checkbox" data-include="${r.row}" aria-label="${t.previewRow} ${r.row}" checked>${r.row}</td><td>${esc(r.name_en)}</td><td dir="rtl">${esc(r.name_ar)}</td><td><input data-pack="${r.row}" aria-label="${t.previewPack} ${r.row}" value="${esc(r.packaging)}"></td><td>${esc(r.net_weight_kg)} kg</td><td><input data-price="${r.row}" aria-label="${t.previewCIF} ${r.row}" value="${esc(r.price_per_carton)}">${esc(r.currency)}</td><td><input data-stock="${r.row}" type="number" min="0" step="1" inputmode="numeric" aria-label="${t.previewStock} ${r.row}" value=""></td><td>${r.calculated?'*':''}</td></tr>`).join('')}</tbody></table></div>`;
   q('[data-status]').textContent=t.ready+rows.length;q('[data-confirm]').hidden=false;
  }catch(error){if(alive()){
   const currencyError=/^currency:([A-Z]{3})$/.exec(String(error.message));
   q('[data-status]').textContent=currencyError?`${t.currencyUnsupported} (${currencyError[1]}).`:t.error+String(error.message).slice(0,80);
  }}
  finally{loading=false;if(alive())q('form button').disabled=false;}
 });
 q('[data-confirm]').onclick=async()=>{
  if(loading||!prepared||!alive())return;loading=true;q('[data-confirm]').disabled=true;
  try{
   const selected=prepared.rows.filter(r=>q(`[data-include="${r.row}"]`).checked).map(r=>({...r,packaging:q(`[data-pack="${r.row}"]`).value.trim(),price_per_carton:q(`[data-price="${r.row}"]`).value.trim(),stock_cartons:q(`[data-stock="${r.row}"]`).value.trim()}));
   if(!selected.length)throw Error('empty');
   const payload=await prepareProducts(selected,prepared.owner,String(prepared.form.get('origin')).toUpperCase());
   for(const p of payload)Object.assign(p,fxFields(prepared.form,p.currency));
   if(!alive())return;
   const {data,error}=await client.from('fruidges_products').upsert(payload,{onConflict:'organization_id,sku',ignoreDuplicates:true}).select('id');
   if(!alive())return;if(error)throw Error();q('[data-status]').textContent=t.success+data.length;prepared=null;q('[data-confirm]').hidden=true;onSaved();
  }catch(error){if(alive())q('[data-status]').textContent=t.error+String(error.message).slice(0,80);}
  finally{loading=false;if(alive())q('[data-confirm]').disabled=false;}
 };
}
