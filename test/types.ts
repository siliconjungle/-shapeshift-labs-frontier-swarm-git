import {
  applySwarmGitMergeCollection,
  createSwarmGitWorkspaceManifest,
  createSwarmGitWorkspacePlan,
  emptySwarmGitChangedPathCollection,
  filterSwarmGitChangedPaths,
  prepareSwarmGitWorkspace,
  runSwarmGitVerification,
  type FrontierSwarmGitApplyResult,
  type FrontierSwarmGitChangedPathCollection,
  type FrontierSwarmGitCommandResult,
  type FrontierSwarmGitWorkspaceManifest,
  type FrontierSwarmGitWorkspacePlan,
  type FrontierSwarmGitWorkspaceProof
} from '../dist/index.js';
import type { FrontierSwarmJob } from '@shapeshift-labs/frontier-swarm';

declare const job: FrontierSwarmJob;

const plan: FrontierSwarmGitWorkspacePlan = createSwarmGitWorkspacePlan(job, {
  cwd: '.',
  outDir: 'agent-runs/run',
  workspace: { mode: 'copy', includes: ['src'], allowedWritePolicy: { mode: 'strict' } }
});
const manifest: FrontierSwarmGitWorkspaceManifest = createSwarmGitWorkspaceManifest(plan);
const collection: FrontierSwarmGitChangedPathCollection = filterSwarmGitChangedPaths(['src/index.ts'], plan);
const empty: FrontierSwarmGitChangedPathCollection = emptySwarmGitChangedPathCollection();
const workspacePromise: Promise<string> = prepareSwarmGitWorkspace(job, { workspace: { mode: 'current' } });
const verificationPromise: Promise<FrontierSwarmGitCommandResult[]> = runSwarmGitVerification(job.verification, '.');
const applyPromise: Promise<FrontierSwarmGitApplyResult> = applySwarmGitMergeCollection({ collection: '.', dryRun: true });

manifest.kind satisfies 'frontier.swarm-git.workspace-manifest';
plan.mode satisfies string;
collection.changedPaths satisfies string[];
empty.ignoredChangedPathReasons satisfies readonly { path: string; reasonCode: string }[];
workspacePromise satisfies Promise<string>;
verificationPromise satisfies Promise<FrontierSwarmGitCommandResult[]>;
applyPromise satisfies Promise<FrontierSwarmGitApplyResult>;
({} as FrontierSwarmGitWorkspaceProof).summary.observedChangedPathCount satisfies number;
