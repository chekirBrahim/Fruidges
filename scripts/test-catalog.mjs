import assert from 'node:assert/strict';
import { escapeHtml, formatMoney, formatPricePerKg } from '../src/catalog-format.js';

assert.equal(formatMoney('12.5', 'USD'), 'USD 12.50');
assert.equal(formatMoney('3.750', 'KWD'), 'KWD 3.750');
assert.equal(formatPricePerKg('12.500', '5.000', 'USD'), 'USD 2.50 / kg');
assert.equal(formatPricePerKg('3.750', '10.000', 'KWD'), 'KWD 0.375 / kg');
assert.equal(formatPricePerKg('1', '6', 'USD'), 'USD 0.17 / kg');
assert.equal(formatPricePerKg('1', '0', 'USD'), '—');
assert.equal(escapeHtml(`<img src="x" onerror='x'>&`), '&lt;img src=&quot;x&quot; onerror=&#39;x&#39;&gt;&amp;');

console.log('PASS: exact currency display, per-kg rounding, invalid weights and HTML escaping.');
