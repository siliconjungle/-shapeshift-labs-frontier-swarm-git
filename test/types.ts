import {
  applySwarmGitMergeCollection,
  applySwarmGitPatchToWorkspace,
  checkSwarmGitPatch,
  createSwarmGitWorkspaceManifest,
  createSwarmGitWorkspacePlan,
  emptySwarmGitChangedPathCollection,
  filterSwarmGitChangedPaths,
  hashSwarmGitWorkspaceFile,
  prepareSwarmGitWorkspace,
  readSwarmGitHeadBlobHash,
  readSwarmGitHeadFile,
  repairSwarmGitWorkspacePackageLinks,
  runSwarmGitVerification,
  type FrontierSwarmGitApplyResult,
  type FrontierSwarmGitChangedPathCollection,
  type FrontierSwarmGitCommandResult,
  type FrontierSwarmGitHeadFileResult,
  type FrontierSwarmGitJob,
  type FrontierSwarmGitPatchCheckResult,
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
const patchCheckPromise: Promise<FrontierSwarmGitPatchCheckResult> = checkSwarmGitPatch({ cwd: '.', patchPath: 'changes.patch' });
const headSourcePromise: Promise<FrontierSwarmGitHeadFileResult | undefined> = readSwarmGitHeadFile({ cwd: '.', file: 'src/index.ts' });
const headHashPromise = readSwarmGitHeadBlobHash({ cwd: '.', file: 'src/index.ts' });
const workspaceHashPromise = hashSwarmGitWorkspaceFile({ cwd: '.', file: 'src/index.ts' });
const linkRepairPromise: Promise<FrontierSwarmGitWorkspacePackageLinkRepairResult> = repairSwarmGitWorkspacePackageLinks({ root: '.', packages: ['@shapeshift-labs/frontier'] });

manifest.kind satisfies 'frontier.swarm-git.workspace-manifest';
plan.mode satisfies string;
collection.changedPaths satisfies string[];
empty.ignoredChangedPathReasons satisfies readonly { path: string; reasonCode: string }[];
workspacePromise satisfies Promise<string>;
verificationPromise satisfies Promise<FrontierSwarmGitCommandResult[]>;
applyPromise satisfies Promise<FrontierSwarmGitApplyResult>;
patchApplyPromise satisfies Promise<FrontierSwarmGitPatchApplyResult>;
patchCheckPromise satisfies Promise<FrontierSwarmGitPatchCheckResult>;
headSourcePromise satisfies Promise<FrontierSwarmGitHeadFileResult | undefined>;
headHashPromise satisfies Promise<{ ok: boolean; hash?: string }>;
workspaceHashPromise satisfies Promise<{ ok: boolean; hash?: string }>;
linkRepairPromise satisfies Promise<FrontierSwarmGitWorkspacePackageLinkRepairResult>;
({} as FrontierSwarmGitWorkspaceProof).summary.observedChangedPathCount satisfies number;
