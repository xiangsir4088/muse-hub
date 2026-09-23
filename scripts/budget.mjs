import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const dir = 'web/dist/assets';
if (!existsSync(dir)) {
  console.error('先执行 npm run build');
  process.exit(1);
}
let total = 0;
for (const f of readdirSync(dir)) {
  if (!/\.(js|css)$/.test(f)) continue;
  const gz = gzipSync(readFileSync(`${dir}/${f}`)).length;
  total += gz;
  console.log(`${f}: ${(gz / 1024).toFixed(1)} KB gzipped`);
}
const kb = total / 1024;
console.log(`Total: ${kb.toFixed(1)} KB (budget 400 KB)`);
if (kb > 400) {
  console.error('OVER BUDGET');
  process.exit(1);
}
