import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageDir = path.dirname(fileURLToPath(import.meta.url));

fs.rmSync(path.join(packageDir, 'dist'), { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
execFileSync(resolveTsc(), ['-b', path.join(packageDir, 'tsconfig.json'), '--force'], { stdio: 'inherit' });

function resolveTsc() {
  const command = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
  const local = path.join(packageDir, 'node_modules', '.bin', command);
  if (fs.existsSync(local)) return local;
  return command;
}
