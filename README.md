# @shapeshift-labs/frontier-swarm-git

Node Git, workspace, patch, and apply adapter for Frontier swarm runners.

`frontier-swarm-git` owns the repo-facing mechanics that are not specific to any model runner: preparing copy/snapshot/worktree workspaces, collecting changed paths, filtering generated workspace noise, producing no-index patches, running verification commands, applying merge bundles under semantic leases, and writing apply ledgers.

It does not render Codex prompts, choose model arguments, spawn Codex, parse Codex logs, or normalize Codex result metadata. Runner adapters such as `@shapeshift-labs/frontier-swarm-codex` compose this package with their own process execution.

## Install

```sh
npm install @shapeshift-labs/frontier-swarm-git
```

## Usage

```ts
import {
  createSwarmGitWorkspacePlan,
  prepareSwarmGitWorkspace,
  writeSwarmGitPatchFile,
  applySwarmGitMergeCollection
} from '@shapeshift-labs/frontier-swarm-git';

const workspace = await prepareSwarmGitWorkspace(job, {
  cwd: process.cwd(),
  outDir: 'agent-runs/run-1',
  workspace: { mode: 'copy', root: 'agent-worktrees/run-1' }
});

const plan = createSwarmGitWorkspacePlan(job, {
  cwd: process.cwd(),
  outDir: 'agent-runs/run-1',
  workspace: { mode: 'copy', root: 'agent-worktrees/run-1' }
});

await writeSwarmGitPatchFile({
  sourceRoot: process.cwd(),
  workspace,
  workspacePlan: plan,
  patchPath: 'agent-runs/run-1/job/changes.patch',
  changedPaths: ['src/index.ts']
});

await applySwarmGitMergeCollection({
  cwd: process.cwd(),
  collection: 'agent-runs/run-1/collected',
  dryRun: true
});
```

## API

- `createSwarmGitWorkspacePlan(job, options)`
- `prepareSwarmGitWorkspace(job, options)`
- `createSwarmGitWorkspaceManifest(plan)`
- `createSwarmGitWorkspaceProof(plan, input?)`
- `snapshotSwarmGitWorkspaceFiles(root)`
- `collectSwarmGitChangedPaths(workspace, baseline, plan)`
- `filterSwarmGitChangedPaths(paths, plan)`
- `restoreSwarmGitChangedPaths(input)`
- `applySwarmGitPreExecWriteFence(input)`
- `restoreSwarmGitPreExecWriteFence(state)`
- `writeSwarmGitPatchFile(input)`
- `noIndexSwarmGitWorkspacePatch(sourceRoot, workspace, changedPaths)`
- `runSwarmGitVerification(commands, cwd)`
- `applySwarmGitMergeCollection(input)`
- `gitSwarmGitDirty(cwd)`
- `runSwarmGitProcess(command, args, options)`

## Layering

- `frontier-swarm` owns runtime-neutral planning, coordinator policy, merge queues, leases, and run event projections.
- `frontier-swarm-git` owns Node/Git workspace and patch mechanics.
- `frontier-swarm-codex` owns Codex prompt rendering, Codex CLI arguments, Codex process execution, Codex logs, and Codex result normalization.

## Verification

```sh
npm test
npm run bench
npm run pack:dry
```
