import assert from 'node:assert';
import {
  createSwarmGitWorkspaceManifest,
  filterSwarmGitChangedPaths,
  normalizeSwarmGitWorkspacePath,
  quarantineSwarmGitPatchCandidatePaths,
  uniqueSwarmGitWorkspacePaths
} from '../dist/index.js';

const casesArg = process.argv[process.argv.indexOf('--cases') + 1];
const cases = Number.isFinite(Number(casesArg)) ? Math.max(1, Math.floor(Number(casesArg))) : 100;

for (let index = 0; index < cases; index += 1) {
  const plan = {
    mode: 'copy',
    root: '/tmp/root',
    path: '/tmp/root/job',
    includes: ['src', 'package.json'],
    excludes: ['dist', 'node_modules'],
    artifactIncludes: ['agent-runs'],
    linkPaths: ['packages/shared'],
    requiredIncludes: [],
    optionalIncludes: [],
    strategy: 'fs-cp',
    allowedWritePolicy: { mode: 'strict' },
    linkNodeModules: true,
    replace: true,
    skipGitRepoCheck: true
  };
  const raw = [
    'src/index.ts',
    'src/index.ts',
    `dist/cache-${index}.js`,
    `node_modules/pkg-${index}/index.js`,
    `agent-runs/run-${index}/evidence.json`,
    '../escape',
    '/absolute/nope'
  ];
  const unique = uniqueSwarmGitWorkspacePaths(raw);
  assert.ok(unique.includes('src/index.ts'));
  assert.ok(!unique.includes('../escape'));
  assert.ok(!unique.includes('/absolute/nope'));
  assert.strictEqual(normalizeSwarmGitWorkspacePath('src/../src/index.ts'), 'src/index.ts');
  const collection = filterSwarmGitChangedPaths(raw, plan);
  assert.deepStrictEqual(collection.changedPaths, ['src/index.ts']);
  assert.ok(collection.ignoredChangedPaths.some((file) => file.startsWith('dist/')));
  assert.ok(collection.ignoredChangedPaths.some((file) => file.startsWith('node_modules/')));
  assert.ok(collection.ignoredChangedPaths.some((file) => file.startsWith('agent-runs/')));
  const quarantine = quarantineSwarmGitPatchCandidatePaths(collection.changedPaths.concat('src/extra.ts'), ['src/extra.ts']);
  assert.deepStrictEqual(quarantine.quarantinedChangedPaths, ['src/extra.ts']);
  const manifest = createSwarmGitWorkspaceManifest(plan);
  assert.strictEqual(manifest.kind, 'frontier.swarm-git.workspace-manifest');
}

console.log(`frontier swarm git fuzz passed (${cases} cases)`);
