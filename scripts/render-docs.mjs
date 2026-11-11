import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderDocs } from '../src/docs.mjs';

const docsDir = fileURLToPath(new URL('../docs/', import.meta.url));
for (const [name, content] of Object.entries(renderDocs())) {
  writeFileSync(`${docsDir}${name}`, content, 'utf8');
  console.log(`wrote docs/${name} (${Buffer.byteLength(content)} bytes)`);
}
