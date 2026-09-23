import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(join(root, 'content', 'models-manifest.json'), 'utf8'));
await mkdir(join(root, 'content', 'models'), { recursive: true });

let manual = 0;
for (const item of manifest.items) {
  const dest = join(root, 'content', item.file);
  try {
    await stat(dest);
    console.log(`[skip] ${item.file} 已存在`);
    continue;
  } catch { /* 未下载 */ }
  if (!item.url) {
    manual++;
    console.log(`[手动] ${item.file} 无直链 — 请打开 ${item.sourceHint}，下载 glb 后重命名为该文件放入 content/models/`);
    continue;
  }
  process.stdout.write(`[下载] ${item.exhibitId} ← ${item.url}\n`);
  const res = await fetch(item.url);
  if (!res.ok) { console.error(`[失败] ${item.exhibitId}: HTTP ${res.status}`); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.subarray(0, 4).toString('latin1') !== 'glTF') {
    console.error(`[失败] ${item.exhibitId}: 返回内容不是 glb（前4字节非 "glTF"），已丢弃`);
    continue;
  }
  await writeFile(dest, buf);
  console.log(`[完成] ${item.file} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
}
console.log(manual
  ? `\n${manual} 件需手动获取。模型就位后刷新浏览器即自动替换程序化占位（无需改代码）。`
  : '\n全部模型就位。刷新浏览器即自动替换程序化占位。');
