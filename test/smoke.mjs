import assert from 'node:assert';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createSwarmManifest,
  createSwarmMergeBundle,
  createSwarmPlan,
  defineSwarmTasks
} from '@shapeshift-labs/frontier-swarm';

const root = path.resolve('.');
const api = await import(pathToFileURL(path.join(root, 'dist/index.js')).href);
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'frontier-swarm-git-smoke-'));

await fs.mkdir(path.join(tmp, 'src'), { recursive: true });
await fs.writeFile(path.join(tmp, 'package.json'), '{"type":"module"}\n');
await fs.writeFile(path.join(tmp, 'src/index.ts'), 'export const value = 1;\n');
await run('git', ['init'], tmp);
await run('git', ['config', 'user.email', 'frontier@example.com'], tmp);
await run('git', ['config', 'user.name', 'Frontier Test'], tmp);
await run('git', ['add', '.'], tmp);
await run('git', ['commit', '-m', 'initial'], tmp);

const manifest = createSwarmManifest({
  id: 'swarm-git-smoke',
  compute: [{ id: 'codex.test', kind: 'codex', model: 'test', reasoningEffort: 'medium' }],
  lanes: [{ id: 'src', allowedWrites: ['src/**'] }],
  policy: { defaultCompute: 'codex.test' }
});
const tasks = defineSwarmTasks([{
  id: 'update-index',
  lane: 'src',
  title: 'Update index',
  objective: 'Change src/index.ts',
  targetRefs: ['src/index.ts'],
  verification: [{ name: 'node', command: 'node', args: ['-e', 'console.log("ok")'], required: true }]
}]);
const plan = createSwarmPlan(manifest, tasks);
const job = plan.jobs[0];

const workspaceOptions = {
  cwd: tmp,
  outDir: path.join(tmp, 'agent-runs/run'),
  workspace: { mode: 'copy', root: path.join(tmp, 'agent-worktrees'), includes: ['src'], replace: true },
  allowedWritePolicy: { mode: 'strict' }
};
const workspace = await api.prepareSwarmGitWorkspace(job, workspaceOptions);
const workspacePlan = api.createSwarmGitWorkspacePlan(job, workspaceOptions);
assert.strictEqual(workspace, workspacePlan.path);
assert.strictEqual(workspacePlan.mode, 'copy');
assert.ok(workspacePlan.includes.includes('src/index.ts') || workspacePlan.includes.includes('src'));

const baseline = await api.snapshotSwarmGitWorkspaceFiles(workspace);
await fs.writeFile(path.join(workspace, 'src/index.ts'), 'export const value = 2;\n');
await fs.mkdir(path.join(workspace, 'dist'), { recursive: true });
await fs.writeFile(path.join(workspace, 'dist/cache.js'), 'ignored\n');

const changed = await api.collectSwarmGitChangedPaths(workspace, baseline, workspacePlan);
assert.deepStrictEqual(changed.changedPaths, ['src/index.ts']);
assert.ok(changed.ignoredChangedPaths.includes('dist'));
assert.strictEqual(changed.ignoredChangedPathReasons.find((entry) => entry.path === 'dist')?.reasonCode, 'build_output');

const proof = await api.createSwarmGitWorkspaceProof(workspacePlan, {
  observedChangedPaths: changed.observedChangedPaths,
  ignoredChangedPaths: changed.ignoredChangedPaths,
  ignoredChangedPathReasons: changed.ignoredChangedPathReasons,
  reportedChangedPaths: ['src/index.ts'],
  generatedAt: 1
});
assert.strictEqual(proof.kind, api.FRONTIER_SWARM_GIT_WORKSPACE_PROOF_KIND);
assert.strictEqual(proof.summary.ignoredChangedPathCount, 1);

const patchPath = path.join(tmp, 'agent-runs/run/update-index/evidence/changes.patch');
const writtenPatch = await api.writeSwarmGitPatchFile({
  workspace,
  sourceRoot: tmp,
  patchPath,
  workspacePlan,
  changedPaths: changed.changedPaths
});
assert.strictEqual(writtenPatch, patchPath);
const patch = await fs.readFile(patchPath, 'utf8');
assert.match(patch, /diff --git a\/src\/index\.ts b\/src\/index\.ts/);
assert.match(patch, /export const value = 2/);

const verification = await api.runSwarmGitVerification(job.verification, workspace);
assert.strictEqual(verification[0].status, 0);
assert.strictEqual(verification[0].required, true);

const collectionDir = path.join(tmp, 'collection');
const bundleDir = path.join(collectionDir, 'ready-to-apply', job.id, 'evidence');
await fs.mkdir(bundleDir, { recursive: true });
await fs.copyFile(patchPath, path.join(bundleDir, 'changes.patch'));
const bundle = createSwarmMergeBundle({
  planId: plan.id,
  job,
  patchPath: 'changes.patch',
  disposition: 'auto-mergeable',
  result: {
    jobId: job.id,
    status: 'verified',
    changedPaths: ['src/index.ts'],
    verification: [{ name: 'node', command: ['node', '-e', 'console.log("ok")'], status: 0, required: true }]
  },
  generatedAt: 2
});
await fs.writeFile(path.join(bundleDir, 'merge.json'), JSON.stringify(bundle, null, 2) + '\n');

const apply = await api.applySwarmGitMergeCollection({
  cwd: tmp,
  collection: collectionDir,
  dryRun: true
});
assert.strictEqual(apply.kind, api.FRONTIER_SWARM_GIT_APPLY_LEDGER_KIND);
assert.strictEqual(apply.ok, true);
assert.strictEqual(apply.summary.checked, 1);
assert.strictEqual(apply.entries[0].semanticLease.granted, true);
assert.strictEqual(apply.entries[0].semanticLease.fence.ok, true);
assert.deepStrictEqual(await fs.readFile(path.join(tmp, 'src/index.ts'), 'utf8'), 'export const value = 1;\n');

const localPackageRoot = path.join(tmp, 'local-packages', 'frontier-test');
await fs.mkdir(localPackageRoot, { recursive: true });
await fs.writeFile(path.join(localPackageRoot, 'package.json'), JSON.stringify({
  name: '@shapeshift-labs/frontier-test',
  version: '0.0.0'
}, null, 2) + '\n');
await fs.writeFile(path.join(tmp, 'package.json'), JSON.stringify({
  type: 'module',
  dependencies: {
    '@shapeshift-labs/frontier-test': '0.0.0'
  }
}, null, 2) + '\n');
const linkPlan = await api.repairSwarmGitWorkspacePackageLinks({
  root: tmp,
  packageRoots: [path.join(tmp, 'local-packages')]
});
assert.strictEqual(linkPlan.kind, api.FRONTIER_SWARM_GIT_LINK_REPAIR_KIND);
assert.strictEqual(linkPlan.summary.planned, 1);
const linkRepair = await api.repairSwarmGitWorkspacePackageLinks({
  root: tmp,
  packageRoots: [path.join(tmp, 'local-packages')],
  write: true
});
assert.strictEqual(linkRepair.summary.linked, 1);
const linkedTarget = await fs.readlink(path.join(tmp, 'node_modules', '@shapeshift-labs', 'frontier-test'));
assert.ok(path.resolve(path.join(tmp, 'node_modules', '@shapeshift-labs'), linkedTarget).endsWith('local-packages/frontier-test'));

console.log('frontier swarm git smoke passed');

async function run(command, args, cwd) {
  const { spawn } = await import('node:child_process');
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'ignore' });
    child.on('close', (status) => status === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} failed: ${status}`)));
    child.on('error', reject);
  });
}
