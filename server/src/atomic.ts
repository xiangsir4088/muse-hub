import { copyFile, mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function writeJsonAtomic(file: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Math.random().toString(36).slice(2)}`;
  await writeFile(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  try {
    await rename(tmp, file);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EPERM') {
      await copyFile(tmp, file);
      await unlink(tmp).catch(() => undefined);
    } else {
      await unlink(tmp).catch(() => undefined);
      throw err;
    }
  }
}
