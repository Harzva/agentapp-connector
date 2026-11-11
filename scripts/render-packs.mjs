import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPacks } from '../src/packs.mjs';

const packsDir = fileURLToPath(new URL('../marketplace/', import.meta.url));
for (const [name, content] of Object.entries(renderPacks())) {
  const path = `${packsDir}${name}`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
  console.log(`wrote marketplace/${name} (${Buffer.byteLength(content)} bytes)`);
}
