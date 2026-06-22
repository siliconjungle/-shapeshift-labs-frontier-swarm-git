import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const outIndex = process.argv.indexOf('--out');
const outFile = outIndex >= 0 ? process.argv[outIndex + 1] : undefined;
const api = await import(pathToFileURL(path.resolve('dist/index.js')).href);

const startedAt = Date.now();
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'frontier-swarm-git-bench-'));
await fs.mkdir(path.join(tmp, 'src'), { recursive: true });
await fs.writeFile(path.join(tmp, 'src/index.ts'), 'export const value = 1;\n');

for (let index = 0; index < 100; index += 1) {
  api.normalizeSwarmGitWorkspacePath(`src/file-${index}.ts`);
  api.uniqueSwarmGitWorkspacePaths(['src/index.ts', 'src/index.ts', `src/file-${index}.ts`]);
}

const result = {
  package: '@shapeshift-labs/frontier-swarm-git',
  generatedAt: new Date().toISOString(),
  durationMs: Date.now() - startedAt,
  operations: {
    normalizeWorkspacePath: 100,
    uniqueWorkspacePaths: 100
  }
};

if (outFile) {
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(result, null, 2) + '\n');
}

console.log(JSON.stringify(result));
