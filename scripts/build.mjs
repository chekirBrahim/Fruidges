import { mkdir, copyFile } from 'node:fs/promises';
import { build } from 'esbuild';
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
for (const name of ['index.html','demo.html','buyer.html','auth-demo.js','auth.css']) {
 await copyFile(new URL(`../src/${name}`,import.meta.url),new URL(`../dist/${name}`,import.meta.url));
}
await build({entryPoints:[new URL('../src/auth-live.js',import.meta.url).pathname.replace(/^\/(\w:)/,'$1')],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:new URL('../dist/auth-live.bundle.js',import.meta.url).pathname.replace(/^\/(\w:)/,'$1'),loader:{'.png':'dataurl'},minify:true});
console.log('Fruidges built: Supabase sign-in and separate demo.');
