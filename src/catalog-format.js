function digitsFor(currency){if(!/^[A-Z]{3}$/.test(currency))return undefined;try{return new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits;}catch{return undefined;}}
const decimalPattern = /^\d+(?:\.\d{1,4})?$/;

function toMillis(value) {
  const text = String(value);
  if (!decimalPattern.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  return BigInt(whole) * 10000n + BigInt((fraction + '0000').slice(0, 4));
}

function formatScaled(value, digits) {
  const scale = 10n ** BigInt(digits);
  const whole = value / scale;
  const fraction = (value % scale).toString().padStart(digits, '0');
  return digits ? `${whole}.${fraction}` : String(whole);
}

export function formatMoney(value, currency) {
  const digits = digitsFor(currency);
  const amount = toMillis(value);
  if (digits === undefined || amount === null) return '—';
  const scale = 10n ** BigInt(digits);
  const rounded = (amount * scale + 5000n) / 10000n;
  return `${currency} ${formatScaled(rounded, digits)}`;
}

export function formatPricePerKg(pricePerCarton, netWeightKg, currency) {
  const digits = digitsFor(currency);
  const price = toMillis(pricePerCarton);
  const weight = toMillis(netWeightKg);
  if (digits === undefined || price === null || weight === null || weight === 0n) return '—';
  const scale = 10n ** BigInt(digits);
  const numerator = price * scale;
  const quotient = numerator / weight;
  const remainder = numerator % weight;
  const rounded = quotient + (remainder * 2n >= weight ? 1n : 0n);
  return `${currency} ${formatScaled(rounded, digits)} / kg`;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

export function formatConverted(price,rate,currency){
 if(!/^\d+(\.\d{1,8})?$/.test(String(rate)))return '—';
 const amount=toMillis(price);if(amount===null)return '—';
 const [w,f='']=String(rate).split('.');const r=BigInt(w)*100000000n+BigInt((f+'00000000').slice(0,8));
 const digits=digitsFor(currency);if(digits===undefined)return '—';
 const denominator=10000n*100000000n;
 return `${currency} ${formatScaled((amount*r*10n**BigInt(digits)+denominator/2n)/denominator,digits)}`;
}
export function fxFields(form,currency){
 const usd=String(form.get('fx_usd')||'').trim(),kwd=String(form.get('fx_kwd')||'').trim(),date=String(form.get('fx_date')||''),source=String(form.get('fx_source')||'').trim();
 if(!usd&&!kwd&&!date&&!source)return {fx_usd:null,fx_kwd:null,fx_date:null,fx_source:null};
 if(![usd,kwd].every(x=>/^\d+(\.\d{1,8})?$/.test(x)&&Number(x)>0&&Number(x)<1e10)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||!source||source.length>200||(currency==='USD'&&Number(usd)!==1)||(currency==='KWD'&&Number(kwd)!==1))throw Error('fx');
 return {fx_usd:usd,fx_kwd:kwd,fx_date:date,fx_source:source};
}
export function fxForm(language){
 const ar=language==='ar';return `<fieldset><legend>${ar?'التحويلات الاختيارية — لكل وحدة من العملة الأصلية':'Optional conversions — per 1 unit of original currency'}</legend><label>USD<input name="fx_usd" type="number" min="0.00000001" step="0.00000001"></label><label>KWD<input name="fx_kwd" type="number" min="0.00000001" step="0.00000001"></label><label>${ar?'تاريخ سعر الصرف':'Rate date'}<input name="fx_date" type="date"></label><label>${ar?'مصدر سعر الصرف':'Rate source'}<input name="fx_source" maxlength="200"></label></fieldset>`;
}
