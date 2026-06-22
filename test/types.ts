import {
  applySwarmGitMergeCollection,
  applySwarmGitPatchToWorkspace,
  createSwarmGitWorkspaceManifest,
  createSwarmGitWorkspacePlan,
  emptySwarmGitChangedPathCollection,
  filterSwarmGitChangedPaths,
  prepareSwarmGitWorkspace,
  repairSwarmGitWorkspacePackageLinks,
  runSwarmGitVerification,
  type FrontierSwarmGitApplyResult,
  type FrontierSwarmGitChangedPathCollection,
  type FrontierSwarmGitCommandResult,
  type FrontierSwarmGitJob,
  type FrontierSwarmGitPatchApplyResult,
  type FrontierSwarmGitWorkspacePackageLinkRepairResult,
  type FrontierSwarmGitWorkspaceManifest,
  type FrontierSwarmGitWorkspacePlan,
  type FrontierSwarmGitWorkspaceProof
} from '../dist/index.js';

declare const job: FrontierSwarmGitJob;

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
const patchApplyPromise: Promise<FrontierSwarmGitPatchApplyResult> = applySwarmGitPatchToWorkspace({ workspace: '.', patchPath: 'changes.patch' });
const linkRepairPromise: Promise<FrontierSwarmGitWorkspacePackageLinkRepairResult> = repairSwarmGitWorkspacePackageLinks({ root: '.', packages: ['@shapeshift-labs/frontier'] });

manifest.kind satisfies 'frontier.swarm-git.workspace-manifest';
plan.mode satisfies string;
collection.changedPaths satisfies string[];
empty.ignoredChangedPathReasons satisfies readonly { path: string; reasonCode: string }[];
workspacePromise satisfies Promise<string>;
verificationPromise satisfies Promise<FrontierSwarmGitCommandResult[]>;
applyPromise satisfies Promise<FrontierSwarmGitApplyResult>;
patchApplyPromise satisfies Promise<FrontierSwarmGitPatchApplyResult>;
linkRepairPromise satisfies Promise<FrontierSwarmGitWorkspacePackageLinkRepairResult>;
({} as FrontierSwarmGitWorkspaceProof).summary.observedChangedPathCount satisfies number;
