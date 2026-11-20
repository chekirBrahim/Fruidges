import { strToU8, zipSync } from 'fflate';

const translations = {
  en: {
    title: 'Purchase order draft',
    ref: 'Draft reference',
    date: 'Prepared',
    buyer: 'Buyer',
    buyerMissing: 'Buyer organization name unavailable',
    supplierMissing: 'Supplier details unavailable in buyer access',
    status: 'DRAFT — NOT SUBMITTED — NON-CONTRACTUAL',
    product: 'Product',
    origin: 'Origin',
    packaging: 'Packaging',
    quantity: 'Quantity',
    weight: 'Net weight',
    term: 'Price term / destination',
    unitPrice: 'Price / carton',
    lineTotal: 'Line total',
    totals: 'Totals by currency',
    conditions: 'CIF is not a final landed cost. Taxes and local delivery are not included unless separately agreed.',
    draftNote: 'This document is a local draft only. It has not been submitted to Fruidges or any supplier. Prices and stock may change.',
    moreLines: 'More details are in the document you can download separately.',
    shareTitle: 'Fruidges purchase draft',
    cartons: 'cartons',
    kgPerCarton: 'kg / carton',
    kgTotal: 'kg total',
    noConversion: 'Not available'
  },
  ar: {
    title: 'مسودة طلب شراء',
    ref: 'مرجع المسودة',
    date: 'تاريخ الإعداد',
    buyer: 'المشتري',
    buyerMissing: 'اسم شركة المشتري غير متاح',
    supplierMissing: 'بيانات المورد غير متاحة ضمن صلاحيات المشتري',
    status: 'مسودة — غير مرسلة — غير ملزمة',
    product: 'المنتج',
    origin: 'المنشأ',
    packaging: 'التعبئة',
    quantity: 'الكمية',
    weight: 'الوزن الصافي',
    term: 'شرط السعر / الوجهة',
    unitPrice: 'السعر / كرتون',
    lineTotal: 'إجمالي السطر',
    totals: 'الإجماليات حسب العملة',
    conditions: 'سعر CIF لا يمثل التكلفة النهائية الواصلة. الضرائب والتوصيل المحلي غير مشمولين ما لم يتم الاتفاق عليهما منفصلين.',
    draftNote: 'هذه مسودة محلية فقط. لم تُرسل إلى Fruidges أو أي مورد. قد تتغير الأسعار والمخزونات.',
    moreLines: 'تظهر بقية التفاصيل في المستند الذي يمكنك تنزيله بشكل منفصل.',
    shareTitle: 'مسودة شراء من Fruidges',
    cartons: 'كراتين',
    kgPerCarton: 'كغ / كرتون',
    kgTotal: 'كغ إجمالي',
    noConversion: 'غير متاح'
  }
};

function labels(order) {
  return translations[order.language === 'ar' ? 'ar' : 'en'];
}

function htmlEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function xmlEscape(value) {
  return htmlEscape(value);
}

function orderRows(order, t) {
  return order.lines.map(line => ({
    product: `${line.nameEn} / ${line.nameAr}`,
    origin: line.origin,
    packaging: line.packaging,
    quantity: `${line.cartons} ${t.cartons}`,
    weight: `${line.netWeightKg} ${t.kgPerCarton} · ${line.totalWeightKg} ${t.kgTotal}`,
    term: line.priceDestination ? `${line.priceTerm} · ${line.priceDestination}` : line.priceTerm,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal
  }));
}

function requireOrder(order) {
  if (!order || !Array.isArray(order.lines) || !order.lines.length ||
      !Array.isArray(order.totals) || !order.reference || !order.date) {
    throw new TypeError('A complete buyer order draft is required.');
  }
}

export function buyerOrderPrintHtml(order) {
  requireOrder(order);
  const t = labels(order);
  const headers = [t.product, t.origin, t.packaging, t.quantity, t.weight, t.term, t.unitPrice, t.lineTotal];
  const rows = orderRows(order, t);
  const table = `<table><thead><tr>${headers.map(value => `<th>${htmlEscape(value)}</th>`).join('')}</tr></thead><tbody>${rows.map((row, index) => {
    const line = order.lines[index];
    return `<tr><td><strong>${htmlEscape(line.nameEn)}</strong><br><span lang="ar" dir="rtl">${htmlEscape(line.nameAr)}</span><br><small dir="ltr">${htmlEscape(line.sku)}</small></td>${[row.origin,row.packaging,row.quantity,row.weight,row.term,row.unitPrice,row.lineTotal].map(value => `<td>${htmlEscape(value)}</td>`).join('')}</tr>`;
  }).join('')}</tbody></table>`;
  const totals = order.totals.map(item => `<li dir="ltr">${htmlEscape(item.amount)}</li>`).join('');
  const dir = order.language === 'ar' ? 'rtl' : 'ltr';
  return `<!doctype html><html lang="${order.language === 'ar' ? 'ar' : 'en'}" dir="${dir}"><head><meta charset="utf-8"><title>${htmlEscape(t.title)} ${htmlEscape(order.reference)}</title><style>
    body{font:14px Arial,sans-serif;color:#173b2d;margin:32px}h1{color:#087b50}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #9db4a4;padding:8px;vertical-align:top;text-align:start}th{background:#e8f5ec}small{color:#58685d}.status{padding:10px;background:#fff3cf;font-weight:700}.notice{margin-top:24px;color:#58685d}@media print{body{margin:12mm}button{display:none}}
    </style></head><body><h1>Fruidges</h1><h2>${htmlEscape(t.title)}</h2><p><b>${htmlEscape(t.ref)}:</b> ${htmlEscape(order.reference)}<br><b>${htmlEscape(t.date)}:</b> ${htmlEscape(order.date)}<br><b>${htmlEscape(t.buyer)}:</b> ${htmlEscape(t.buyerMissing)}</p><p class="status">${htmlEscape(t.status)}</p><p>${htmlEscape(t.supplierMissing)}</p>${table}<h3>${htmlEscape(t.totals)}</h3><ul>${totals}</ul><p>${htmlEscape(t.conditions)}</p><p class="notice">${htmlEscape(t.draftNote)}</p></body></html>`;
}

function wordParagraph(value, { bold = false, rtl = false, size = 22 } = {}) {
  const runProperties = `<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>${bold ? '<w:b/>' : ''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>`;
  const text = String(value ?? '').split('\n').map((part, index) =>
    `${index ? '<w:br/>' : ''}<w:t xml:space="preserve">${xmlEscape(part)}</w:t>`).join('');
  return `<w:p><w:pPr>${rtl ? '<w:bidi/>' : ''}</w:pPr><w:r>${runProperties}${text}</w:r></w:p>`;
}

function wordCell(value, { header = false, rtl = false } = {}) {
  return `<w:tc><w:tcPr><w:tcW w:w="1350" w:type="dxa"/></w:tcPr>${wordParagraph(value,{bold:header,rtl,size:header?18:16})}</w:tc>`;
}

function wordTable(headers, rows, { rtl = false } = {}) {
  const borders = '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="9DB4A4"/><w:left w:val="single" w:sz="4" w:color="9DB4A4"/><w:bottom w:val="single" w:sz="4" w:color="9DB4A4"/><w:right w:val="single" w:sz="4" w:color="9DB4A4"/><w:insideH w:val="single" w:sz="4" w:color="9DB4A4"/><w:insideV w:val="single" w:sz="4" w:color="9DB4A4"/></w:tblBorders>';
  const row = (values, header = false) => `<w:tr>${values.map(value => wordCell(value,{header,rtl})).join('')}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${rtl?'<w:bidiVisual/>':''}${borders}</w:tblPr><w:tblGrid>${headers.map(() => '<w:gridCol w:w="1350"/>').join('')}</w:tblGrid>${row(headers,true)}${rows.map(values => row(values)).join('')}</w:tbl>`;
}

export function createBuyerOrderDocx(order) {
  requireOrder(order);
  const t = labels(order);
  const rtl = order.language === 'ar';
  const headers = [t.product,t.origin,t.packaging,t.quantity,t.weight,t.term,t.unitPrice,t.lineTotal];
  const rows = orderRows(order,t).map((row,index) => {
    const line = order.lines[index];
    return [`${line.nameEn} / ${line.nameAr}\n${line.sku}`,row.origin,row.packaging,row.quantity,row.weight,row.term,row.unitPrice,row.lineTotal];
  });
  const totals = order.totals.map(item => `${item.amount}`);
  const body = [
    wordParagraph('Fruidges',{bold:true,size:32}),
    wordParagraph(t.title,{bold:true,size:28,rtl}),
    wordParagraph(`${t.ref}: ${order.reference}`),
    wordParagraph(`${t.date}: ${order.date}`),
    wordParagraph(`${t.buyer}: ${t.buyerMissing}`),
    wordParagraph(t.status,{bold:true,rtl}),
    wordParagraph(t.supplierMissing,{rtl}),
    wordTable(headers,rows,{rtl}),
    wordParagraph(t.totals,{bold:true,rtl}),
    ...totals.map(total => wordParagraph(total)),
    wordParagraph(t.conditions,{rtl}),
    wordParagraph(t.draftNote,{rtl}),
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>'
  ].join('');
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`;
  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
  const relationships = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  return zipSync({
    '[Content_Types].xml': strToU8(contentTypes),
    '_rels/.rels': strToU8(relationships),
    'word/document.xml': strToU8(documentXml)
  },{level:6});
}

export function buyerWhatsAppText(order) {
  requireOrder(order);
  const t = labels(order);
  const shownLines = order.lines.slice(0,20).map(line =>
    `${line.nameEn} / ${line.nameAr} — ${line.cartons} ${t.cartons} — ${line.lineTotal}`);
  const remaining = order.lines.length - shownLines.length;
  return [
    `${t.shareTitle} — ${order.reference}`,
    order.date,
    ...shownLines,
    ...(remaining > 0 ? [`${remaining} additional line(s). ${t.moreLines}`] : []),
    `${t.totals}: ${order.totals.map(item => item.amount).join(' · ')}`,
    t.status,
    t.draftNote
  ].join('\n');
}
