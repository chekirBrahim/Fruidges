import assert from 'node:assert/strict';
import { DOMParser } from '@xmldom/xmldom';
import { strFromU8, unzipSync } from 'fflate';
import { buyerOrderPrintHtml, buyerWhatsAppText, createBuyerOrderDocx } from '../src/buyer-order.js';

const order = {
  reference:'DRAFT-123',
  date:'20 Nov 2026',
  language:'en',
  lines:[{
    sku:'FR-1',
    nameEn:'Apples & <pears>',
    nameAr:'تفاح',
    origin:'🇹🇳 Tunisia',
    packaging:'Carton',
    cartons:2,
    netWeightKg:'10.000',
    totalWeightKg:'20.000',
    priceTerm:'CIF',
    priceDestination:'Kuwait',
    currency:'USD',
    unitPrice:'USD 12.50',
    pricePerKg:'USD 1.25 / kg',
    lineTotal:'USD 25.00'
  }],
  totals:[{currency:'USD',amount:'USD 25.00'}]
};

const docx = createBuyerOrderDocx(order);
const files = unzipSync(docx);
assert.ok(files['[Content_Types].xml']);
assert.ok(files['_rels/.rels']);
assert.ok(files['word/document.xml']);
const xml = strFromU8(files['word/document.xml']);
const parsed = new DOMParser({onError(level,message){if(level==='error'||level==='fatalError')throw Error(message);}})
  .parseFromString(xml,'application/xml');
assert.equal(parsed.getElementsByTagName('parsererror').length,0,'Word document XML must parse');
assert.match(xml,/Purchase order draft/);
assert.match(xml,/Apples &amp; &lt;pears&gt;/);
assert.match(xml,/USD 25\.00/);
assert.match(xml,/DRAFT — NOT SUBMITTED — NON-CONTRACTUAL/);
assert.match(xml,/Taxes and local delivery are not included/);

const html = buyerOrderPrintHtml(order);
assert.match(html,/lang="en" dir="ltr"/);
assert.match(html,/CIF · Kuwait/);
assert.match(html,/USD 25\.00/);

const shareText = buyerWhatsAppText(order);
assert.match(shareText,/DRAFT-123/);
assert.match(shareText,/USD 25\.00/);
assert.match(shareText,/NOT SUBMITTED/);

const arabic = buyerOrderPrintHtml({...order,language:'ar'});
assert.match(arabic,/lang="ar" dir="rtl"/);
assert.match(arabic,/مسودة/);

assert.throws(()=>createBuyerOrderDocx({...order,lines:[]}),/complete buyer order draft/i);
console.log('PASS: buyer draft Word package, printable output, WhatsApp summary and Arabic RTL.');
