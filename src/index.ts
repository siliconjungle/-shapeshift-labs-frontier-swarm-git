import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { JsonObject, JsonValue } from '@shapeshift-labs/frontier';

export const FRONTIER_SWARM_GIT_WORKSPACE_MANIFEST_KIND = 'frontier.swarm-git.workspace-manifest';
export const FRONTIER_SWARM_GIT_WORKSPACE_MANIFEST_VERSION = 1;
export const FRONTIER_SWARM_GIT_WORKSPACE_PROOF_KIND = 'frontier.swarm-git.workspace-proof';
export const FRONTIER_SWARM_GIT_WORKSPACE_PROOF_VERSION = 1;
export const FRONTIER_SWARM_GIT_LINK_REPAIR_KIND = 'frontier.swarm-git.link-repair';
export const FRONTIER_SWARM_GIT_LINK_REPAIR_VERSION = 1;
export const FRONTIER_SWARM_GIT_APPLY_LEDGER_KIND = 'frontier.swarm-git.apply-ledger';
export const FRONTIER_SWARM_GIT_APPLY_LEDGER_VERSION = 1;

const DEFAULT_WORKSPACE_INCLUDES = ['AGENTS.md', 'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'config'];
const DEFAULT_WORKSPACE_EXCLUDES = [
  '.git',
  '.cache',
  '.turbo',
  '.next',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.frontier-framework',
  'agent-runs',
  'target'
];

export type FrontierSwarmGitWorkspaceMode = 'current' | 'git-worktree' | 'snapshot' | 'copy';
export type FrontierSwarmGitAllowedWriteEnforcement = 'audit' | 'strict' | 'off';

export interface FrontierSwarmGitCommand {
  name: string;
  command: string;
  args: readonly string[];
  required: boolean;
}

export interface FrontierSwarmGitJobTask {
  sourceRefs?: readonly string[];
  targetRefs?: readonly string[];
  metadata?: Record<string, unknown>;
}

export interface FrontierSwarmGitJob {
  id: string;
  worktreePath?: string;
  task: FrontierSwarmGitJobTask;
  verification?: readonly FrontierSwarmGitCommand[];
}

export interface FrontierSwarmGitMergeBundle {
  jobId: string;
  changedPaths: readonly string[];
  changedRegions?: readonly unknown[];
  patchPath?: string;
  branchName?: string;
  disposition?: string;
}

export interface FrontierSwarmGitAllowedWritePolicyOptions {
  mode?: FrontierSwarmGitAllowedWriteEnforcement;
}

export interface FrontierSwarmGitAllowedWritePolicyContract {
  mode: FrontierSwarmGitAllowedWriteEnforcement;
  observesHostWorkspaceChanges: boolean;
  filtersWorkspaceNoiseBeforeOwnership: boolean;
  quarantinesDisallowedChanges: boolean;
  restoresDisallowedSourcePaths: boolean;
  appliesPreExecFence: boolean;
}

export interface FrontierSwarmGitWorkspaceInput {
  mode?: FrontierSwarmGitWorkspaceMode;
  root?: string;
  create?: boolean;
  replace?: boolean;
  includes?: readonly string[];
  excludes?: readonly string[];
  artifactIncludes?: readonly string[];
  linkPaths?: readonly string[];
  requiredIncludes?: readonly string[];
  optionalIncludes?: readonly string[];
  strategy?: 'fs-cp' | 'rsync' | 'git-archive' | string;
  guardRoot?: string;
  linkNodeModules?: boolean;
  skipGitRepoCheck?: boolean;
  allowedWritePolicy?: FrontierSwarmGitAllowedWritePolicyOptions;
}

export interface FrontierSwarmGitWorkspaceRunOptions {
  cwd?: string;
  outDir?: string;
  workspace?: FrontierSwarmGitWorkspaceInput;
  allowedWritePolicy?: FrontierSwarmGitAllowedWritePolicyOptions;
  collectGitStatus?: boolean;
}

export interface FrontierSwarmGitWorkspacePlan {
  mode: FrontierSwarmGitWorkspaceMode;
  root: string;
  path: string;
  includes: string[];
  excludes: string[];
  artifactIncludes: string[];
  linkPaths: string[];
  requiredIncludes: string[];
  optionalIncludes: string[];
  strategy: string;
  guardRoot?: string;
  allowedWritePolicy: Required<FrontierSwarmGitAllowedWritePolicyOptions>;
  linkNodeModules: boolean;
  replace: boolean;
  skipGitRepoCheck: boolean;
}

export interface FrontierSwarmGitWorkspaceManifest {
  kind: typeof FRONTIER_SWARM_GIT_WORKSPACE_MANIFEST_KIND;
  version: typeof FRONTIER_SWARM_GIT_WORKSPACE_MANIFEST_VERSION;
  id: string;
  mode: FrontierSwarmGitWorkspaceMode;
  root: string;
  path: string;
  includes: string[];
  excludes: string[];
  artifactIncludes: string[];
  linkPaths: string[];
  requiredIncludes: string[];
  optionalIncludes: string[];
  strategy: string;
  guardRoot?: string;
  allowedWritePolicy: Required<FrontierSwarmGitAllowedWritePolicyOptions>;
  linkNodeModules: boolean;
  skipGitRepoCheck: boolean;
}

export type FrontierSwarmGitWorkspaceIgnoredChangedPathReasonCode =
  | 'git_metadata'
  | 'cache'
  | 'node_modules'
  | 'build_output'
  | 'coverage'
  | 'frontier_framework'
  | 'agent_runs'
  | 'tsbuildinfo'
  | 'generated_setup'
  | 'workspace_exclude'
  | 'artifact_include'
  | 'linked_path'
  | 'empty_directory_marker';

export interface FrontierSwarmGitWorkspaceIgnoredChangedPathReason {
  path: string;
  reasonCode: FrontierSwarmGitWorkspaceIgnoredChangedPathReasonCode;
}

export interface FrontierSwarmGitWorkspaceWriteFenceSummary {
  mode: 'none' | 'chmod-readonly';
  applied: boolean;
  skippedReason?: string;
  lockedPathCount: number;
  restoredPathCount: number;
  failedRestoreCount: number;
  sampleLockedPaths: string[];
  writableRoots: string[];
  limitations: string[];
}

export interface FrontierSwarmGitWorkspaceProof {
  kind: typeof FRONTIER_SWARM_GIT_WORKSPACE_PROOF_KIND;
  version: typeof FRONTIER_SWARM_GIT_WORKSPACE_PROOF_VERSION;
  id: string;
  generatedAt: number;
  manifest: FrontierSwarmGitWorkspaceManifest;
  writePolicy?: FrontierSwarmGitAllowedWritePolicyContract;
  copiedPaths: string[];
  linkedPaths: string[];
  missingRequired: string[];
  missingOptional: string[];
  ignoredChangedPaths: string[];
  ignoredChangedPathReasons: FrontierSwarmGitWorkspaceIgnoredChangedPathReason[];
  observedChangedPaths: string[];
  reportedChangedPaths: string[];
  quarantinedChangedPaths?: string[];
  restoredSourcePaths?: string[];
  preExecWriteFence?: FrontierSwarmGitWorkspaceWriteFenceSummary;
  summary: {
    copiedCount: number;
    linkedCount: number;
    missingRequiredCount: number;
    missingOptionalCount: number;
    ignoredChangedPathCount: number;
    ignoredChangedPathReasonCounts: Record<string, number>;
    observedChangedPathCount: number;
    reportedChangedPathCount: number;
    quarantinedChangedPathCount?: number;
    restoredSourcePathCount?: number;
  };
}

export type FrontierSwarmGitWorkspaceFileSnapshot = Map<string, string>;

export interface FrontierSwarmGitChangedPathCollection {
  observedChangedPaths: string[];
  changedPaths: string[];
  ignoredChangedPaths: string[];
  ignoredChangedPathReasons: FrontierSwarmGitWorkspaceIgnoredChangedPathReason[];
}

export interface FrontierSwarmGitWorkspaceRestoreRecord {
  path: string;
  action: 'restored' | 'deleted' | 'missing' | 'skipped';
  reason: string;
}

export interface FrontierSwarmGitWorkspaceWriteFenceRecord {
  path: string;
  absolutePath: string;
  kind: 'file' | 'directory';
  originalMode: number;
  fencedMode: number;
}

export interface FrontierSwarmGitWorkspaceWriteFenceState {
  summary: FrontierSwarmGitWorkspaceWriteFenceSummary;
  records: FrontierSwarmGitWorkspaceWriteFenceRecord[];
}

export type FrontierSwarmGitWorkspacePackageLinkStatus =
  | 'already-linked'
  | 'planned'
  | 'linked'
  | 'replaced'
  | 'excluded'
  | 'missing-local-package'
  | 'conflict';

export interface FrontierSwarmGitWorkspacePackageLinkRepairInput {
  root?: string;
  packageRoots?: readonly string[];
  scope?: string;
  packages?: readonly string[];
  excludePackages?: readonly string[];
  write?: boolean;
  replace?: boolean;
  outFile?: string;
}

export interface FrontierSwarmGitWorkspacePackageLinkEntry {
  packageName: string;
  dependencyRange?: string;
  linkPath: string;
  targetPath?: string;
  status: FrontierSwarmGitWorkspacePackageLinkStatus;
  reason?: string;
}

export interface FrontierSwarmGitWorkspacePackageLinkRepairResult {
  kind: typeof FRONTIER_SWARM_GIT_LINK_REPAIR_KIND;
  version: typeof FRONTIER_SWARM_GIT_LINK_REPAIR_VERSION;
  generatedAt: number;
  root: string;
  scope: string;
  packageRoots: string[];
  write: boolean;
  replace: boolean;
  entries: FrontierSwarmGitWorkspacePackageLinkEntry[];
  summary: {
    total: number;
    planned: number;
    linked: number;
    replaced: number;
    alreadyLinked: number;
    excluded: number;
    missingLocalPackage: number;
    conflicts: number;
  };
  outFile?: string;
}

export interface FrontierSwarmGitCommandResult {
  name: string;
  command: string[];
  status: number;
  durationMs: number;
  stdoutTail: string[];
  stderrTail: string[];
  required: boolean;
}

export interface FrontierSwarmGitLoggedCommandResult {
  command: string[];
  status: number;
  stdoutTail: string[];
  stderrTail: string[];
}

export interface FrontierSwarmGitPatchApplyInput {
  workspace: string;
  patchPath: string;
  dryRun?: boolean;
}

export interface FrontierSwarmGitPatchApplyResult {
  ok: boolean;
  status: 'checked' | 'applied' | 'failed';
  commands: FrontierSwarmGitLoggedCommandResult[];
  error?: string;
}

export type FrontierSwarmGitApplyStatus = 'checked' | 'applied' | 'committed' | 'skipped' | 'failed';

export interface FrontierSwarmGitApplyInput {
  cwd?: string;
  collection: string;
  outDir?: string;
  bucket?: string;
  dryRun?: boolean;
  allowDirty?: boolean;
  commit?: boolean;
  branchPrefix?: string;
  jobIds?: readonly string[];
  limit?: number;
}

export interface FrontierSwarmGitApplySemanticLeaseEvidence {
  source: 'derived-from-merge-bundle' | string;
  queueId: string;
  assignmentId?: string;
  stateId: string;
  granted: boolean;
  leaseId?: string;
  token?: string;
  fencingToken?: number;
  requiredLeaseScopeIds: string[];
  requiredLeaseKeys: string[];
  scopes: Array<{
    key: string;
    scopeKind: string;
    path?: string;
    regionId?: string;
    lane?: string;
    parentKeys: string[];
  }>;
  fence: {
    ok: boolean;
    reasons: string[];
  };
  evidence?: Record<string, unknown>;
}

export interface FrontierSwarmGitApplyEntry {
  jobId: string;
  bundlePath: string;
  patchPath?: string;
  branchName?: string;
  dryRun: boolean;
  status: FrontierSwarmGitApplyStatus;
  commands: Array<{ command: string[]; status: number; stdoutTail: string[]; stderrTail: string[] }>;
  semanticLease?: FrontierSwarmGitApplySemanticLeaseEvidence;
  error?: string;
  commit?: string;
}

export interface FrontierSwarmGitApplyResult {
  kind: typeof FRONTIER_SWARM_GIT_APPLY_LEDGER_KIND;
  version: typeof FRONTIER_SWARM_GIT_APPLY_LEDGER_VERSION;
  ok: boolean;
  cwd: string;
  collectionDir: string;
  outDir: string;
  generatedAt: number;
  dryRun: boolean;
  entries: FrontierSwarmGitApplyEntry[];
  summary: {
    total: number;
    checked: number;
    applied: number;
    committed: number;
    skipped: number;
    failed: number;
  };
}

const WRITE_FENCE_LIMITATIONS = [
  'chmod-readonly is a best-effort pre-exec fence, not a security sandbox',
  'a worker running as the same OS user can chmod owned paths back to writable',
  'workspace root and allowed-write ancestors may remain writable so allowed new files can be created',
  'symlinks and heavyweight dependency/run artifact trees are not traversed; strict post-exec restore is the durable enforcement'
];

export async function prepareSwarmGitWorkspace(job: FrontierSwarmGitJob, options: FrontierSwarmGitWorkspaceRunOptions): Promise<string> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const plan = createSwarmGitWorkspacePlan(job, options);
  if (plan.mode === 'current') return plan.path;
  if (plan.mode === 'git-worktree') {
    if (await pathExists(plan.path)) return plan.path;
    if (options.workspace?.create === false) throw new Error(`missing worktree for ${job.id}: ${plan.path}`);
    await fs.mkdir(path.dirname(plan.path), { recursive: true });
    await runSwarmGitProcess('git', ['worktree', 'add', '--detach', plan.path, 'HEAD'], { cwd });
    return plan.path;
  }
  if (await pathExists(plan.path)) {
    if (!plan.replace) return plan.path;
    assertGeneratedWorkspacePath(plan);
    await fs.rm(plan.path, { recursive: true, force: true });
  }
  await fs.mkdir(plan.path, { recursive: true });
  for (const include of plan.includes) await copyWorkspacePath(cwd, plan.path, include, plan.excludes);
  for (const include of plan.artifactIncludes) await copyWorkspacePath(cwd, plan.path, include, []);
  for (const linkPath of plan.linkPaths) await linkWorkspacePath(cwd, plan.path, linkPath);
  if (plan.linkNodeModules) await linkWorkspacePath(cwd, plan.path, 'node_modules');
  return plan.path;
}

export function createSwarmGitWorkspacePlan(job: FrontierSwarmGitJob, options: FrontierSwarmGitWorkspaceRunOptions): FrontierSwarmGitWorkspacePlan {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const workspace = options.workspace ?? { mode: 'current' as FrontierSwarmGitWorkspaceMode };
  const mode = workspace.mode ?? 'current';
  const root = path.resolve(cwd, workspace.root ?? path.join('agent-worktrees', 'frontier-swarm-git'));
  const allowedWritePolicy = normalizeAllowedWritePolicy(options.allowedWritePolicy ?? workspace.allowedWritePolicy);
  const rawTask = readRawTask(job);
  if (mode === 'current') {
    const currentPath = path.resolve(cwd, job.worktreePath ?? '.');
    return {
      mode,
      root,
      path: currentPath,
      includes: [],
      excludes: [],
      artifactIncludes: [],
      linkPaths: [],
      requiredIncludes: [],
      optionalIncludes: [],
      strategy: workspace.strategy ?? 'fs-cp',
      ...(workspace.guardRoot ? { guardRoot: path.resolve(cwd, workspace.guardRoot) } : {}),
      allowedWritePolicy,
      linkNodeModules: false,
      replace: false,
      skipGitRepoCheck: workspace.skipGitRepoCheck ?? false
    };
  }
  const includes = uniqueSwarmGitWorkspacePaths([
    ...DEFAULT_WORKSPACE_INCLUDES,
    ...readStringArray(workspace.includes),
    ...readStringArray(rawTask.snapshotIncludes),
    ...readStringArray(rawTask.files),
    ...readStringArray(job.task.sourceRefs),
    ...readStringArray(job.task.targetRefs)
  ]);
  const excludes = uniqueSwarmGitWorkspacePaths([
    ...DEFAULT_WORKSPACE_EXCLUDES,
    ...readStringArray(workspace.excludes),
    ...readStringArray(rawTask.snapshotExcludes)
  ]);
  const artifactIncludes = uniqueSwarmGitWorkspacePaths([
    ...readStringArray(workspace.artifactIncludes),
    ...readStringArray(rawTask.snapshotArtifactIncludes)
  ]);
  const linkPaths = uniqueSwarmGitWorkspacePaths([
    ...readStringArray(workspace.linkPaths),
    ...readStringArray(rawTask.snapshotLinkPaths),
    ...readStringArray(rawTask.linkPaths)
  ]);
  const requiredIncludes = uniqueSwarmGitWorkspacePaths([
    ...readStringArray(workspace.requiredIncludes),
    ...readStringArray(rawTask.requiredIncludes),
    ...readStringArray(rawTask.snapshotRequiredIncludes)
  ]);
  const optionalIncludes = uniqueSwarmGitWorkspacePaths([
    ...readStringArray(workspace.optionalIncludes),
    ...readStringArray(rawTask.optionalIncludes),
    ...readStringArray(rawTask.snapshotOptionalIncludes)
  ]);
  const replaceGeneratedWorkspace = mode === 'copy' || mode === 'snapshot';
  return {
    mode,
    root,
    path: path.resolve(root, job.id),
    includes,
    excludes,
    artifactIncludes,
    linkPaths,
    requiredIncludes,
    optionalIncludes,
    strategy: workspace.strategy ?? 'fs-cp',
    guardRoot: path.resolve(cwd, workspace.guardRoot ?? workspace.root ?? path.join('agent-worktrees', 'frontier-swarm-git')),
    allowedWritePolicy,
    linkNodeModules: workspace.linkNodeModules ?? (mode !== 'git-worktree'),
    replace: workspace.replace ?? replaceGeneratedWorkspace,
    skipGitRepoCheck: workspace.skipGitRepoCheck ?? (mode === 'copy' || mode === 'snapshot')
  };
}

export function createSwarmGitWorkspaceManifest(plan: FrontierSwarmGitWorkspacePlan): FrontierSwarmGitWorkspaceManifest {
  return {
    kind: FRONTIER_SWARM_GIT_WORKSPACE_MANIFEST_KIND,
    version: FRONTIER_SWARM_GIT_WORKSPACE_MANIFEST_VERSION,
    id: 'swarm-git-workspace:' + stableHash([plan.mode, plan.root, plan.path, plan.includes, plan.linkPaths]),
    mode: plan.mode,
    root: plan.root,
    path: plan.path,
    includes: [...plan.includes],
    excludes: [...plan.excludes],
    artifactIncludes: [...plan.artifactIncludes],
    linkPaths: [...plan.linkPaths],
    requiredIncludes: [...plan.requiredIncludes],
    optionalIncludes: [...plan.optionalIncludes],
    strategy: plan.strategy,
    ...(plan.guardRoot ? { guardRoot: plan.guardRoot } : {}),
    allowedWritePolicy: { ...plan.allowedWritePolicy },
    linkNodeModules: plan.linkNodeModules,
    skipGitRepoCheck: plan.skipGitRepoCheck
  };
}

export async function createSwarmGitWorkspaceProof(
  plan: FrontierSwarmGitWorkspacePlan,
  input: {
    ignoredChangedPaths?: readonly string[];
    ignoredChangedPathReasons?: readonly FrontierSwarmGitWorkspaceIgnoredChangedPathReason[];
    observedChangedPaths?: readonly string[];
    reportedChangedPaths?: readonly string[];
    preExecWriteFence?: FrontierSwarmGitWorkspaceWriteFenceSummary;
    generatedAt?: number;
  } = {}
): Promise<FrontierSwarmGitWorkspaceProof> {
  const generatedAt = input.generatedAt ?? Date.now();
  const manifest = createSwarmGitWorkspaceManifest(plan);
  const copiedCandidates = uniqueSwarmGitWorkspacePaths([...plan.includes, ...plan.artifactIncludes, ...plan.requiredIncludes]);
  const optionalCandidates = uniqueSwarmGitWorkspacePaths(plan.optionalIncludes);
  const copiedPaths: string[] = [];
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];
  for (const include of copiedCandidates) {
    if (await pathExists(path.join(plan.path, include))) copiedPaths.push(include);
    else if (plan.requiredIncludes.includes(include)) missingRequired.push(include);
  }
  for (const include of optionalCandidates) {
    if (await pathExists(path.join(plan.path, include))) copiedPaths.push(include);
    else missingOptional.push(include);
  }
  const linkedPaths: string[] = [];
  for (const linkPath of uniqueSwarmGitWorkspacePaths([...plan.linkPaths, ...(plan.linkNodeModules ? ['node_modules'] : [])])) {
    const stat = await fs.lstat(path.join(plan.path, linkPath)).catch(() => undefined);
    if (stat?.isSymbolicLink()) linkedPaths.push(linkPath);
  }
  const ignoredChangedPaths = uniqueSwarmGitWorkspacePaths(input.ignoredChangedPaths ?? []);
  const ignoredChangedPathReasons = uniqueIgnoredChangedPathReasons(
    input.ignoredChangedPathReasons ?? createIgnoredSwarmGitWorkspaceChangedPathReasons(ignoredChangedPaths, plan)
  );
  const observedChangedPaths = uniqueSwarmGitWorkspacePaths(input.observedChangedPaths ?? []);
  const reportedChangedPaths = uniqueSwarmGitWorkspacePaths(input.reportedChangedPaths ?? []);
  const preExecWriteFence = input.preExecWriteFence;
  return {
    kind: FRONTIER_SWARM_GIT_WORKSPACE_PROOF_KIND,
    version: FRONTIER_SWARM_GIT_WORKSPACE_PROOF_VERSION,
    id: 'swarm-git-workspace-proof:' + stableHash([manifest.id, copiedPaths, linkedPaths, missingRequired, missingOptional, ignoredChangedPaths, ignoredChangedPathReasons, observedChangedPaths, reportedChangedPaths, preExecWriteFence, generatedAt]),
    generatedAt,
    manifest,
    copiedPaths: uniqueSwarmGitWorkspacePaths(copiedPaths),
    linkedPaths,
    missingRequired,
    missingOptional,
    ignoredChangedPaths,
    ignoredChangedPathReasons,
    observedChangedPaths,
    reportedChangedPaths,
    ...(preExecWriteFence ? { preExecWriteFence } : {}),
    summary: {
      copiedCount: uniqueSwarmGitWorkspacePaths(copiedPaths).length,
      linkedCount: linkedPaths.length,
      missingRequiredCount: missingRequired.length,
      missingOptionalCount: missingOptional.length,
      ignoredChangedPathCount: ignoredChangedPaths.length,
      ignoredChangedPathReasonCounts: countIgnoredChangedPathReasons(ignoredChangedPathReasons),
      observedChangedPathCount: observedChangedPaths.length,
      reportedChangedPathCount: reportedChangedPaths.length
    }
  };
}

export function emptySwarmGitChangedPathCollection(): FrontierSwarmGitChangedPathCollection {
  return {
    observedChangedPaths: [],
    changedPaths: [],
    ignoredChangedPaths: [],
    ignoredChangedPathReasons: []
  };
}

export function shouldSnapshotSwarmGitWorkspaceChanges(plan: FrontierSwarmGitWorkspacePlan, options: FrontierSwarmGitWorkspaceRunOptions): boolean {
  return options.collectGitStatus !== false && (plan.mode === 'copy' || plan.mode === 'snapshot');
}

export async function snapshotSwarmGitWorkspaceFiles(root: string): Promise<FrontierSwarmGitWorkspaceFileSnapshot> {
  const snapshot: FrontierSwarmGitWorkspaceFileSnapshot = new Map();
  await walkWorkspaceFiles(root, root, snapshot);
  return snapshot;
}

export async function collectSwarmGitChangedPaths(
  cwd: string,
  baseline: FrontierSwarmGitWorkspaceFileSnapshot | undefined,
  plan: FrontierSwarmGitWorkspacePlan
): Promise<FrontierSwarmGitChangedPathCollection> {
  if (!baseline) return filterSwarmGitChangedPaths(await gitChangedPaths(cwd), plan);
  const after = await snapshotSwarmGitWorkspaceFiles(cwd);
  return filterWorkspaceChangedPathsFromSnapshots(diffWorkspaceFiles(baseline, after), plan, baseline, after);
}

export function filterSwarmGitChangedPaths(
  paths: readonly string[],
  plan: FrontierSwarmGitWorkspacePlan
): FrontierSwarmGitChangedPathCollection {
  return filterWorkspaceChangedPathsWithEmptyMarkers(paths, plan, new Set());
}

export function mergeSwarmGitChangedPathCollections(
  collections: readonly FrontierSwarmGitChangedPathCollection[]
): FrontierSwarmGitChangedPathCollection {
  const ignoredReasonByKey = new Map<string, FrontierSwarmGitWorkspaceIgnoredChangedPathReason>();
  for (const collection of collections) {
    for (const reason of collection.ignoredChangedPathReasons) {
      ignoredReasonByKey.set(`${reason.path}:${reason.reasonCode}`, reason);
    }
  }
  return {
    observedChangedPaths: uniqueSwarmGitWorkspacePaths(collections.flatMap((collection) => collection.observedChangedPaths)),
    changedPaths: uniqueSwarmGitWorkspacePaths(collections.flatMap((collection) => collection.changedPaths)),
    ignoredChangedPaths: uniqueSwarmGitWorkspacePaths(collections.flatMap((collection) => collection.ignoredChangedPaths)),
    ignoredChangedPathReasons: Array.from(ignoredReasonByKey.values())
  };
}

export function createIgnoredSwarmGitWorkspaceChangedPathReasons(
  paths: readonly string[],
  plan: FrontierSwarmGitWorkspacePlan
): FrontierSwarmGitWorkspaceIgnoredChangedPathReason[] {
  const reasons: FrontierSwarmGitWorkspaceIgnoredChangedPathReason[] = [];
  for (const file of uniqueSwarmGitChangedPaths(paths, plan)) {
    const reasonCode = getIgnoredSwarmGitWorkspaceChangedPathReason(file, plan);
    if (reasonCode) reasons.push({ path: file, reasonCode });
  }
  return reasons;
}

export function getIgnoredSwarmGitWorkspaceChangedPathReason(
  file: string,
  plan: FrontierSwarmGitWorkspacePlan
): FrontierSwarmGitWorkspaceIgnoredChangedPathReasonCode | undefined {
  if (plan.mode !== 'copy' && plan.mode !== 'snapshot') return undefined;
  const noiseReason = getSwarmGitWorkspaceNoisePathReason(file);
  if (noiseReason) return noiseReason;
  if (isGeneratedWorkspaceSetupFile(file) && !isExplicitWorkspaceInput(file, plan)) return 'generated_setup';
  if (plan.excludes.some((entry) => swarmGitWorkspacePathMatches(file, entry))) return 'workspace_exclude';
  if (plan.artifactIncludes.some((entry) => swarmGitWorkspacePathMatches(file, entry))) return 'artifact_include';
  if (plan.linkPaths.some((entry) => swarmGitWorkspacePathMatches(file, entry))) return 'linked_path';
  return undefined;
}

export function normalizeSwarmGitChangedPath(file: string, plan: FrontierSwarmGitWorkspacePlan): string | undefined {
  const value = String(file ?? '').trim();
  if (!value) return undefined;
  if (path.isAbsolute(value)) return normalizeSwarmGitWorkspacePath(path.relative(plan.path, value).replace(/\\/g, '/'));
  return normalizeSwarmGitWorkspacePath(value);
}

export function uniqueSwarmGitChangedPaths(paths: readonly string[], plan: FrontierSwarmGitWorkspacePlan): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const file of paths) {
    const normalized = normalizeSwarmGitChangedPath(file, plan);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export function snapshotContainsSwarmGitWorkspacePath(snapshot: FrontierSwarmGitWorkspaceFileSnapshot, file: string): boolean {
  if (snapshot.has(file)) return true;
  const prefix = file.replace(/\/$/, '') + '/';
  for (const entry of snapshot.keys()) {
    if (entry.startsWith(prefix)) return true;
  }
  return false;
}

export function quarantineSwarmGitPatchCandidatePaths(
  changedPaths: readonly string[],
  ownershipViolations: readonly string[]
): { patchCandidateChangedPaths: string[]; quarantinedChangedPaths: string[] } {
  const violations = new Set(ownershipViolations);
  const patchCandidateChangedPaths: string[] = [];
  const quarantinedChangedPaths: string[] = [];
  for (const file of uniqueSwarmGitWorkspacePaths(changedPaths)) {
    if (violations.has(file)) quarantinedChangedPaths.push(file);
    else patchCandidateChangedPaths.push(file);
  }
  return { patchCandidateChangedPaths, quarantinedChangedPaths };
}

export async function restoreSwarmGitChangedPaths(input: {
  workspace: string;
  sourceRoot: string;
  workspacePlan: FrontierSwarmGitWorkspacePlan;
  baseline?: FrontierSwarmGitWorkspaceFileSnapshot;
  changedPaths: readonly string[];
}): Promise<FrontierSwarmGitWorkspaceRestoreRecord[]> {
  const paths = uniqueSwarmGitWorkspacePaths(input.changedPaths);
  if (!paths.length) return [];
  if (input.workspacePlan.mode !== 'copy' && input.workspacePlan.mode !== 'snapshot') {
    return paths.map((file) => ({
      path: file,
      action: 'skipped',
      reason: `workspace mode ${input.workspacePlan.mode} is not isolated`
    }));
  }

  const records: FrontierSwarmGitWorkspaceRestoreRecord[] = [];
  for (const file of paths) {
    const source = path.join(input.sourceRoot, file);
    const target = path.join(input.workspace, file);
    const sourceExists = await pathExists(source);
    const targetExists = await pathExists(target);
    const existedAtBaseline = input.baseline ? snapshotContainsSwarmGitWorkspacePath(input.baseline, file) : undefined;
    if (input.baseline && !existedAtBaseline) {
      if (targetExists) {
        await fs.rm(target, { recursive: true, force: true });
        await pruneUnauthorizedEmptyParents(input.workspace, file, input.baseline);
        records.push({ path: file, action: 'deleted', reason: 'removed unauthorized new path' });
      } else {
        records.push({ path: file, action: 'missing', reason: 'path absent in workspace baseline and workspace' });
      }
    } else if (sourceExists) {
      await fs.rm(target, { recursive: true, force: true });
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.cp(source, target, { recursive: true, force: true, verbatimSymlinks: true });
      records.push({ path: file, action: 'restored', reason: 'restored from source root' });
    } else if (targetExists) {
      await fs.rm(target, { recursive: true, force: true });
      if (input.baseline) await pruneUnauthorizedEmptyParents(input.workspace, file, input.baseline);
      records.push({ path: file, action: 'deleted', reason: 'removed unauthorized path missing from source root' });
    } else {
      records.push({ path: file, action: 'missing', reason: 'path absent in source and workspace' });
    }
  }
  return records;
}

export async function applySwarmGitPreExecWriteFence(input: {
  workspace: string;
  workspacePlan: FrontierSwarmGitWorkspacePlan;
  allowedWrites: readonly string[];
  writableRoots?: readonly string[];
  enabled?: boolean;
}): Promise<FrontierSwarmGitWorkspaceWriteFenceState> {
  const writableRoots = uniqueWriteFenceRoots(input.writableRoots ?? input.allowedWrites);
  const skipped = skippedWriteFenceReason(input.enabled !== false, input.workspacePlan);
  if (skipped) return { records: [], summary: createWriteFenceSummary({ mode: 'none', skippedReason: skipped, writableRoots }) };
  const records: FrontierSwarmGitWorkspaceWriteFenceRecord[] = [];
  await walkWorkspaceWriteFence(input.workspace, input.workspace, writableRoots, records);
  return {
    records,
    summary: createWriteFenceSummary({
      mode: 'chmod-readonly',
      applied: records.length > 0,
      lockedPathCount: records.length,
      sampleLockedPaths: records.slice(0, 20).map((entry) => entry.path),
      writableRoots
    })
  };
}

export async function restoreSwarmGitPreExecWriteFence(
  state: FrontierSwarmGitWorkspaceWriteFenceState
): Promise<FrontierSwarmGitWorkspaceWriteFenceSummary> {
  let restoredPathCount = 0;
  let failedRestoreCount = 0;
  for (const record of [...state.records].reverse()) {
    try {
      await fs.chmod(record.absolutePath, record.originalMode);
      restoredPathCount += 1;
    } catch {
      failedRestoreCount += 1;
    }
  }
  return { ...state.summary, restoredPathCount, failedRestoreCount };
}

export async function repairSwarmGitWorkspacePackageLinks(
  input: FrontierSwarmGitWorkspacePackageLinkRepairInput = {}
): Promise<FrontierSwarmGitWorkspacePackageLinkRepairResult> {
  const root = path.resolve(input.root ?? process.cwd());
  const scope = input.scope ?? '@shapeshift-labs';
  const write = input.write ?? false;
  const replace = input.replace ?? false;
  const packageRoots = (input.packageRoots?.length ? input.packageRoots : [path.join(root, 'packages'), path.dirname(root)])
    .map((entry) => path.resolve(root, entry));
  const excludes = new Set(input.excludePackages ?? []);
  const dependencies = input.packages?.length
    ? new Map(input.packages.map((name) => [name, undefined as string | undefined]))
    : await readWorkspaceScopedDependencies(root, scope);
  const localPackages = await discoverLocalWorkspacePackages(packageRoots, scope);
  const entries: FrontierSwarmGitWorkspacePackageLinkEntry[] = [];

  for (const [packageName, dependencyRange] of Array.from(dependencies.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    const linkPath = path.join(root, 'node_modules', ...packageName.split('/'));
    if (excludes.has(packageName)) {
      entries.push({ packageName, dependencyRange, linkPath, status: 'excluded', reason: 'package excluded from local repair' });
      continue;
    }
    const targetPath = localPackages.get(packageName);
    if (!targetPath) {
      entries.push({ packageName, dependencyRange, linkPath, status: 'missing-local-package', reason: 'no matching local package was found' });
      continue;
    }
    entries.push(await planOrRepairWorkspacePackageLink({
      packageName,
      dependencyRange,
      linkPath,
      targetPath,
      write,
      replace
    }));
  }

  const result: FrontierSwarmGitWorkspacePackageLinkRepairResult = {
    kind: FRONTIER_SWARM_GIT_LINK_REPAIR_KIND,
    version: FRONTIER_SWARM_GIT_LINK_REPAIR_VERSION,
    generatedAt: Date.now(),
    root,
    scope,
    packageRoots,
    write,
    replace,
    entries,
    summary: {
      total: entries.length,
      planned: entries.filter((entry) => entry.status === 'planned').length,
      linked: entries.filter((entry) => entry.status === 'linked').length,
      replaced: entries.filter((entry) => entry.status === 'replaced').length,
      alreadyLinked: entries.filter((entry) => entry.status === 'already-linked').length,
      excluded: entries.filter((entry) => entry.status === 'excluded').length,
      missingLocalPackage: entries.filter((entry) => entry.status === 'missing-local-package').length,
      conflicts: entries.filter((entry) => entry.status === 'conflict').length
    },
    ...(input.outFile ? { outFile: path.resolve(root, input.outFile) } : {})
  };
  if (result.outFile) {
    await fs.mkdir(path.dirname(result.outFile), { recursive: true });
    await fs.writeFile(result.outFile, JSON.stringify(result, null, 2) + '\n');
  }
  return result;
}

export async function writeSwarmGitPatchFile(input: {
  workspace: string;
  sourceRoot: string;
  patchPath: string;
  workspacePlan: FrontierSwarmGitWorkspacePlan;
  changedPaths: readonly string[];
}): Promise<string | undefined> {
  await fs.mkdir(path.dirname(input.patchPath), { recursive: true });
  const changedPaths = uniqueSwarmGitWorkspacePaths(input.changedPaths);
  if (changedPaths.length === 0) {
    await fs.writeFile(input.patchPath, '');
    return undefined;
  }
  const diff = input.workspacePlan.mode === 'copy' || input.workspacePlan.mode === 'snapshot'
    ? await noIndexSwarmGitWorkspacePatch(input.sourceRoot, input.workspace, changedPaths)
    : input.workspacePlan.mode === 'git-worktree'
      ? await noIndexSwarmGitWorkspacePatch(input.sourceRoot, input.workspace, changedPaths)
      : await gitDiffPatch(input.workspace, changedPaths);
  await fs.writeFile(input.patchPath, diff);
  return diff.trim().length ? input.patchPath : undefined;
}

export async function runSwarmGitVerification(
  commands: readonly FrontierSwarmGitCommand[],
  cwd: string
): Promise<FrontierSwarmGitCommandResult[]> {
  const results: FrontierSwarmGitCommandResult[] = [];
  for (const command of commands) {
    const startedAt = Date.now();
    const run = await runSwarmGitProcess(command.command, command.args, { cwd, allowFailure: true });
    results.push({
      name: command.name,
      command: [command.command, ...command.args],
      status: run.status,
      durationMs: Date.now() - startedAt,
      stdoutTail: tail(run.stdout),
      stderrTail: tail(run.stderr),
      required: command.required
    });
    if (run.status !== 0 && command.required) break;
  }
  return results;
}

export async function noIndexSwarmGitWorkspacePatch(sourceRoot: string, workspace: string, changedPaths: readonly string[]): Promise<string> {
  const chunks: string[] = [];
  for (const file of changedPaths) {
    const source = path.join(sourceRoot, file);
    const target = path.join(workspace, file);
    const sourceExists = await pathExists(source);
    const targetExists = await pathExists(target);
    if (!sourceExists && !targetExists) continue;
    const left = sourceExists ? source : '/dev/null';
    const right = targetExists ? target : '/dev/null';
    const result = await runSwarmGitProcess('git', ['diff', '--no-index', '--', left, right], { cwd: sourceRoot, allowFailure: true });
    if (result.stdout.trim()) chunks.push(rewriteNoIndexPatchPaths(result.stdout, file, { sourceExists, targetExists }));
  }
  return chunks.join('\n');
}

export async function applySwarmGitMergeCollection(input: FrontierSwarmGitApplyInput): Promise<FrontierSwarmGitApplyResult> {
  const generatedAt = Date.now();
  const cwd = path.resolve(input.cwd ?? process.cwd());
  const dryRun = input.dryRun ?? true;
  const collectionDir = path.resolve(cwd, input.collection);
  const outDir = path.resolve(cwd, input.outDir ?? path.join(collectionDir, 'apply-ledger'));
  if (!dryRun && !input.allowDirty) {
    const dirty = await swarmGitDirty(cwd);
    if (dirty.length) throw new Error(`refusing to apply into dirty worktree; pass allowDirty to override (${dirty.slice(0, 8).join(', ')})`);
  }
  const bucket = input.bucket ?? 'ready-to-apply';
  const roots = bucket === 'all'
    ? ['ready-to-apply', 'research-complete', 'needs-human-port', 'rerun-work', 'failed-evidence', 'stale-against-head'].map((entry) => path.join(collectionDir, entry))
    : [path.join(collectionDir, bucket)];
  const wanted = new Set(input.jobIds ?? []);
  const mergePaths = (await Promise.all(roots.map((root) => findFilesByName(root, 'merge.json')))).flat().sort();
  const entries: FrontierSwarmGitApplyEntry[] = [];
  for (const mergePath of mergePaths.slice(0, input.limit ? Math.max(0, Math.floor(input.limit)) : undefined)) {
    const bundle = JSON.parse(await fs.readFile(mergePath, 'utf8')) as FrontierSwarmGitMergeBundle;
    if (wanted.size && !wanted.has(bundle.jobId)) continue;
    const applied = await applySwarmGitMergeBundle({
      cwd,
      bundle,
      mergePath,
      dryRun,
      commit: input.commit ?? false,
      branchPrefix: input.branchPrefix
    });
    entries.push(applied);
  }
  const summary = {
    total: entries.length,
    checked: entries.filter((entry) => entry.status === 'checked').length,
    applied: entries.filter((entry) => entry.status === 'applied').length,
    committed: entries.filter((entry) => entry.status === 'committed').length,
    skipped: entries.filter((entry) => entry.status === 'skipped').length,
    failed: entries.filter((entry) => entry.status === 'failed').length
  };
  const result: FrontierSwarmGitApplyResult = {
    kind: FRONTIER_SWARM_GIT_APPLY_LEDGER_KIND,
    version: FRONTIER_SWARM_GIT_APPLY_LEDGER_VERSION,
    ok: summary.failed === 0,
    cwd,
    collectionDir,
    outDir,
    generatedAt,
    dryRun,
    entries,
    summary
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'apply-ledger.json'), JSON.stringify(result, null, 2) + '\n');
  return result;
}

export async function applySwarmGitPatchToWorkspace(input: FrontierSwarmGitPatchApplyInput): Promise<FrontierSwarmGitPatchApplyResult> {
  const commands: FrontierSwarmGitLoggedCommandResult[] = [];
  const check = await runLoggedProcess('git', ['apply', '--check', input.patchPath], input.workspace);
  commands.push(check);
  if (check.status !== 0) return { ok: false, status: 'failed', commands, error: 'git apply --check failed' };
  if (input.dryRun !== false) return { ok: true, status: 'checked', commands };
  const apply = await runLoggedProcess('git', ['apply', input.patchPath], input.workspace);
  commands.push(apply);
  if (apply.status !== 0) return { ok: false, status: 'failed', commands, error: 'git apply failed' };
  return { ok: true, status: 'applied', commands };
}

export async function runSwarmGitProcess(
  command: string,
  args: readonly string[],
  options: { cwd: string; allowFailure?: boolean }
): Promise<{ status: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], { cwd: options.cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on('close', (status: number | null) => {
      const result = { status: status ?? 1, stdout, stderr };
      if (!options.allowFailure && result.status !== 0) reject(new Error(stderr || stdout || `${command} failed`));
      else resolve(result);
    });
    child.on('error', (error: Error) => {
      if (options.allowFailure) resolve({ status: 1, stdout, stderr: String(error) });
      else reject(error);
    });
  });
}

export async function swarmGitDirty(cwd: string): Promise<string[]> {
  const result = await runSwarmGitProcess('git', ['status', '--porcelain'], { cwd, allowFailure: true });
  if (result.status !== 0) return [];
  return result.stdout.split(/\r?\n/).filter(Boolean).map((line) => line.slice(3));
}

export async function pathExists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export function normalizeSwarmGitWorkspacePath(value: string): string | undefined {
  const clean = value.replace(/\\/g, '/').replace(/\/+$/, '');
  if (!clean || clean.includes('\0') || clean.includes('*') || path.isAbsolute(clean)) return undefined;
  const normalized = path.normalize(clean).replace(/\\/g, '/');
  if (normalized === '.' || normalized.startsWith('..') || path.isAbsolute(normalized)) return undefined;
  return normalized;
}

export function uniqueSwarmGitWorkspacePaths(values: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = normalizeSwarmGitWorkspacePath(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export function swarmGitWorkspacePathMatches(file: string, entry: string): boolean {
  const prefix = normalizeSwarmGitWorkspacePath(entry);
  if (!prefix) return false;
  if (file === prefix || file.startsWith(prefix + '/')) return true;
  return !prefix.includes('/') && pathHasIgnoredSegment(file, [prefix]);
}

export function getSwarmGitWorkspaceNoisePathReason(file: string): FrontierSwarmGitWorkspaceIgnoredChangedPathReasonCode | undefined {
  const normalized = String(file ?? '').replace(/\\/g, '/').replace(/\/+$/, '');
  if (!normalized) return undefined;
  for (const entry of WORKSPACE_NOISE_SUFFIX_REASONS) {
    if (normalized.endsWith(entry.suffix)) return entry.reasonCode;
  }
  const parts = normalized.split('/').filter(Boolean);
  const name = parts[parts.length - 1];
  const fileReason = WORKSPACE_NOISE_FILE_REASONS.find((entry) => entry.name === name);
  if (fileReason) return fileReason.reasonCode;
  return WORKSPACE_NOISE_SEGMENT_REASONS.find((entry) => pathHasIgnoredSegment(normalized, [entry.segment]))?.reasonCode;
}

export function isSwarmGitWorkspaceNoisePath(file: string): boolean {
  return !!getSwarmGitWorkspaceNoisePathReason(file);
}

export function shouldPruneSwarmGitWorkspaceWriteFenceTraversal(file: string): boolean {
  return pathHasIgnoredSegment(file, ['node_modules', 'agent-runs']);
}

export function tail(text: string, maxLines = 24): string[] {
  return text.trim().split(/\r?\n/).filter(Boolean).slice(-maxLines);
}

export function stableHash(value: unknown): string {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return 'fnv1a32:' + (hash >>> 0).toString(16).padStart(8, '0');
}

export function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

async function applySwarmGitMergeBundle(input: {
  cwd: string;
  bundle: FrontierSwarmGitMergeBundle;
  mergePath: string;
  dryRun: boolean;
  commit: boolean;
  branchPrefix?: string;
}): Promise<FrontierSwarmGitApplyEntry> {
  const commands: FrontierSwarmGitApplyEntry['commands'] = [];
  const patchPath = await resolveApplyPatchPath(input.bundle, input.mergePath);
  const branchName = input.branchPrefix ? `${input.branchPrefix}/${slug(input.bundle.jobId)}` : input.bundle.branchName;
  const base = {
    jobId: input.bundle.jobId,
    bundlePath: input.mergePath,
    ...(patchPath ? { patchPath } : {}),
    ...(branchName ? { branchName } : {}),
    dryRun: input.dryRun,
    commands
  };
  if (!patchPath) {
    return {
      ...base,
      status: input.bundle.disposition === 'discovery-only' ? 'skipped' : 'failed',
      error: 'missing patch'
    };
  }
  const semanticLease = createApplySemanticLeaseEvidence({
    cwd: input.cwd,
    bundle: input.bundle,
    mergePath: input.mergePath
  });
  if (!semanticLease.entry.granted) {
    return {
      ...base,
      semanticLease: semanticLease.entry,
      status: 'failed',
      error: 'semantic lease denied'
    };
  }
  if (!semanticLease.entry.fence.ok) {
    return {
      ...base,
      semanticLease: semanticLease.entry,
      status: 'failed',
      error: 'semantic lease fence validation failed'
    };
  }
  const check = await runLoggedProcess('git', ['apply', '--check', patchPath], input.cwd);
  commands.push(check);
  if (check.status !== 0) return { ...base, semanticLease: semanticLease.entry, status: 'failed', error: 'git apply --check failed' };
  if (input.dryRun) return { ...base, semanticLease: semanticLease.entry, status: 'checked' };
  if (branchName) {
    const branch = await runLoggedProcess('git', ['switch', '-c', branchName], input.cwd);
    commands.push(branch);
    if (branch.status !== 0) return { ...base, semanticLease: semanticLease.entry, status: 'failed', error: 'git switch -c failed' };
  }
  const apply = await runLoggedProcess('git', ['apply', patchPath], input.cwd);
  commands.push(apply);
  if (apply.status !== 0) return { ...base, semanticLease: semanticLease.entry, status: 'failed', error: 'git apply failed' };
  if (!input.commit) return { ...base, semanticLease: semanticLease.entry, status: 'applied' };
  const add = await runLoggedProcess('git', ['add', '--', ...input.bundle.changedPaths], input.cwd);
  commands.push(add);
  if (add.status !== 0) return { ...base, semanticLease: semanticLease.entry, status: 'failed', error: 'git add failed' };
  const commit = await runLoggedProcess('git', ['commit', '-m', `Apply swarm bundle ${input.bundle.jobId}`], input.cwd);
  commands.push(commit);
  if (commit.status !== 0) return { ...base, semanticLease: semanticLease.entry, status: 'failed', error: 'git commit failed' };
  const rev = await runLoggedProcess('git', ['rev-parse', 'HEAD'], input.cwd);
  commands.push(rev);
  return {
    ...base,
    semanticLease: semanticLease.entry,
    status: 'committed',
    commit: rev.stdoutTail[0]
  };
}

function createApplySemanticLeaseEvidence(input: {
  cwd: string;
  bundle: FrontierSwarmGitMergeBundle;
  mergePath: string;
}): { entry: FrontierSwarmGitApplySemanticLeaseEvidence } {
  const repository = path.basename(input.cwd);
  const changedPaths = uniqueSwarmGitWorkspacePaths(input.bundle.changedPaths);
  const scopes = changedPaths.map((file) => ({
    key: `path:${repository}:${file}`,
    scopeKind: 'path',
    path: file,
    parentKeys: [`repository:${repository}`]
  }));
  return {
    entry: {
      source: 'derived-from-merge-bundle',
      queueId: `frontier-swarm-git-apply:${stableHash([repository, input.mergePath])}`,
      assignmentId: input.bundle.jobId,
      stateId: `frontier-swarm-git-apply-state:${stableHash([repository, input.bundle.jobId, changedPaths])}`,
      granted: true,
      requiredLeaseScopeIds: scopes.map((scope) => scope.key),
      requiredLeaseKeys: scopes.map((scope) => scope.key),
      scopes,
      fence: {
        ok: true,
        reasons: []
      },
      evidence: {
        authority: 'external-coordinator',
        bundlePath: input.mergePath,
        note: 'frontier-swarm-git records Git apply evidence only; coordinator packages own lease admission and fencing'
      }
    }
  };
}

async function resolveApplyPatchPath(bundle: FrontierSwarmGitMergeBundle, mergePath: string): Promise<string | undefined> {
  const sibling = path.join(path.dirname(mergePath), 'changes.patch');
  if (await pathExists(sibling)) return sibling;
  const patchPath = resolveBundlePatchPath(bundle, mergePath);
  if (patchPath && await pathExists(patchPath)) return patchPath;
  return undefined;
}

function resolveBundlePatchPath(bundle: FrontierSwarmGitMergeBundle, mergePath: string): string | undefined {
  if (!bundle.patchPath) return undefined;
  return path.isAbsolute(bundle.patchPath) ? bundle.patchPath : path.resolve(path.dirname(mergePath), bundle.patchPath);
}

async function runLoggedProcess(command: string, args: readonly string[], cwd: string): Promise<{ command: string[]; status: number; stdoutTail: string[]; stderrTail: string[] }> {
  const result = await runSwarmGitProcess(command, args, { cwd, allowFailure: true });
  return {
    command: [command, ...args],
    status: result.status,
    stdoutTail: tail(result.stdout),
    stderrTail: tail(result.stderr)
  };
}

async function readWorkspaceScopedDependencies(root: string, scope: string): Promise<Map<string, string | undefined>> {
  const packageJson = await readJsonObject(path.join(root, 'package.json'));
  const dependencies = new Map<string, string | undefined>();
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    const value = packageJson?.[section];
    if (!isObject(value)) continue;
    for (const [name, range] of Object.entries(value)) {
      if (name === scope || name.startsWith(scope + '/')) dependencies.set(name, typeof range === 'string' ? range : undefined);
    }
  }
  return dependencies;
}

async function discoverLocalWorkspacePackages(packageRoots: readonly string[], scope: string): Promise<Map<string, string>> {
  const packages = new Map<string, string>();
  for (const root of uniqueStrings(packageRoots)) {
    await addLocalWorkspacePackage(packages, root, scope);
    const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name === '.git') continue;
      const child = path.join(root, entry.name);
      if (entry.name.startsWith('@')) {
        const scopedEntries = await fs.readdir(child, { withFileTypes: true }).catch(() => []);
        for (const scopedEntry of scopedEntries) {
          if (scopedEntry.isDirectory()) await addLocalWorkspacePackage(packages, path.join(child, scopedEntry.name), scope);
        }
      } else {
        await addLocalWorkspacePackage(packages, child, scope);
      }
    }
  }
  return packages;
}

async function addLocalWorkspacePackage(packages: Map<string, string>, packageDir: string, scope: string): Promise<void> {
  const packageJson = await readJsonObject(path.join(packageDir, 'package.json'));
  const name = typeof packageJson?.name === 'string' ? packageJson.name : undefined;
  if (!name || name !== scope && !name.startsWith(scope + '/')) return;
  if (!packages.has(name)) packages.set(name, path.resolve(packageDir));
}

async function readJsonObject(file: string): Promise<Record<string, unknown> | undefined> {
  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
    return isObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function planOrRepairWorkspacePackageLink(input: {
  packageName: string;
  dependencyRange?: string;
  linkPath: string;
  targetPath: string;
  write: boolean;
  replace: boolean;
}): Promise<FrontierSwarmGitWorkspacePackageLinkEntry> {
  const base = {
    packageName: input.packageName,
    dependencyRange: input.dependencyRange,
    linkPath: input.linkPath,
    targetPath: input.targetPath
  };
  const stat = await fs.lstat(input.linkPath).catch(() => undefined);
  const relativeTarget = path.relative(path.dirname(input.linkPath), input.targetPath) || '.';
  if (stat?.isSymbolicLink()) {
    const currentTarget = path.resolve(path.dirname(input.linkPath), await fs.readlink(input.linkPath));
    if (currentTarget === input.targetPath) return { ...base, status: 'already-linked' };
    if (!input.write) return { ...base, status: 'planned', reason: 'existing symlink points at a different package' };
    await fs.unlink(input.linkPath);
    await fs.symlink(relativeTarget, input.linkPath, 'dir');
    return { ...base, status: 'linked', reason: 'updated existing symlink' };
  }
  if (stat) {
    if (!input.replace) return { ...base, status: 'conflict', reason: 'existing node_modules entry is not a symlink' };
    if (!input.write) return { ...base, status: 'planned', reason: 'would replace existing node_modules entry' };
    await fs.rm(input.linkPath, { recursive: true, force: true });
    await fs.mkdir(path.dirname(input.linkPath), { recursive: true });
    await fs.symlink(relativeTarget, input.linkPath, 'dir');
    return { ...base, status: 'replaced', reason: 'replaced existing node_modules entry with a symlink' };
  }
  if (!input.write) return { ...base, status: 'planned', reason: 'missing symlink' };
  await fs.mkdir(path.dirname(input.linkPath), { recursive: true });
  await fs.symlink(relativeTarget, input.linkPath, 'dir');
  return { ...base, status: 'linked', reason: 'created symlink' };
}

async function gitDiffPatch(workspace: string, changedPaths: readonly string[]): Promise<string> {
  const result = await runSwarmGitProcess('git', ['diff', '--', ...changedPaths], { cwd: workspace, allowFailure: true });
  return result.stdout;
}

function rewriteNoIndexPatchPaths(patch: string, file: string, input: { sourceExists: boolean; targetExists: boolean }): string {
  const oldPath = input.sourceExists ? `a/${file}` : '/dev/null';
  const newPath = input.targetExists ? `b/${file}` : '/dev/null';
  return patch.split(/\r?\n/).map((line) => {
    if (line.startsWith('diff --git ')) return `diff --git a/${file} b/${file}`;
    if (line.startsWith('--- ')) return `--- ${oldPath}`;
    if (line.startsWith('+++ ')) return `+++ ${newPath}`;
    return line;
  }).join('\n');
}

function filterWorkspaceChangedPathsFromSnapshots(
  paths: readonly string[],
  plan: FrontierSwarmGitWorkspacePlan,
  before: FrontierSwarmGitWorkspaceFileSnapshot,
  after: FrontierSwarmGitWorkspaceFileSnapshot
): FrontierSwarmGitChangedPathCollection {
  return filterWorkspaceChangedPathsWithEmptyMarkers(paths, plan, deletedChildEmptyDirectoryMarkers(paths, before, after));
}

function filterWorkspaceChangedPathsWithEmptyMarkers(
  paths: readonly string[],
  plan: FrontierSwarmGitWorkspacePlan,
  emptyDirectoryMarkers: ReadonlySet<string>
): FrontierSwarmGitChangedPathCollection {
  const observedChangedPaths = uniqueSwarmGitChangedPaths(paths, plan);
  const changedPaths: string[] = [];
  const ignoredChangedPaths: string[] = [];
  const ignoredChangedPathReasons: FrontierSwarmGitWorkspaceIgnoredChangedPathReason[] = [];
  for (const file of observedChangedPaths) {
    const reasonCode = emptyDirectoryMarkers.has(file)
      ? 'empty_directory_marker'
      : getIgnoredSwarmGitWorkspaceChangedPathReason(file, plan);
    if (reasonCode) {
      ignoredChangedPaths.push(file);
      ignoredChangedPathReasons.push({ path: file, reasonCode });
    } else {
      changedPaths.push(file);
    }
  }
  return { observedChangedPaths, changedPaths, ignoredChangedPaths, ignoredChangedPathReasons };
}

function deletedChildEmptyDirectoryMarkers(
  paths: readonly string[],
  before: FrontierSwarmGitWorkspaceFileSnapshot,
  after: FrontierSwarmGitWorkspaceFileSnapshot
): Set<string> {
  const out = new Set<string>();
  const changed = uniqueSwarmGitWorkspacePaths(paths);
  const beforePaths = Array.from(before.keys());
  for (const file of changed) {
    const marker = after.get(file);
    if (!marker?.startsWith('empty-dir')) continue;
    if (before.has(file)) continue;
    const prefix = file.replace(/\/+$/, '') + '/';
    if (beforePaths.some((candidate) => candidate.startsWith(prefix))) out.add(file);
  }
  return out;
}

async function gitChangedPaths(cwd: string): Promise<string[]> {
  const result = await runSwarmGitProcess('git', ['status', '--porcelain'], { cwd, allowFailure: true });
  if (result.status !== 0) return [];
  return result.stdout.split(/\r?\n/).filter(Boolean).flatMap((line) => {
    const value = line.slice(3);
    return value.includes(' -> ') ? value.split(' -> ') : [value];
  });
}

async function walkWorkspaceFiles(root: string, current: string, snapshot: FrontierSwarmGitWorkspaceFileSnapshot): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(current);
  } catch {
    return;
  }
  for (const entry of entries) {
    const absolute = path.join(current, entry);
    const relative = path.relative(root, absolute).replace(/\\/g, '/');
    const stat = await fs.lstat(absolute).catch(() => undefined);
    if (!stat) continue;
    if (stat.isSymbolicLink()) {
      const target = await fs.readlink(absolute).catch(() => '');
      snapshot.set(relative, `link:${target}`);
      continue;
    }
    if (stat.isDirectory()) {
      if (isSwarmGitWorkspaceNoisePath(relative)) {
        snapshot.set(relative, snapshotMarker('ignored-dir'));
        continue;
      }
      const beforeSize = snapshot.size;
      await walkWorkspaceFiles(root, absolute, snapshot);
      if (relative && snapshot.size === beforeSize) snapshot.set(relative, snapshotMarker('empty-dir'));
      continue;
    }
    if (stat.isFile()) {
      snapshot.set(relative, isSwarmGitWorkspaceNoisePath(relative)
        ? await snapshotFileMarker('ignored-file', absolute, stat)
        : await snapshotFileMarker('file', absolute, stat));
    }
  }
}

async function snapshotFileMarker(kind: string, absolute: string, stat: { size: number }): Promise<string> {
  try {
    const hash = createHash('sha256').update(await fs.readFile(absolute)).digest('hex');
    return `${kind}:${stat.size}:${hash}`;
  } catch {
    return `${kind}:${stat.size}:unreadable`;
  }
}

function snapshotMarker(kind: string): string {
  return kind;
}

function diffWorkspaceFiles(before: FrontierSwarmGitWorkspaceFileSnapshot, after: FrontierSwarmGitWorkspaceFileSnapshot): string[] {
  const changed = new Set<string>();
  for (const [file, marker] of after) {
    if (before.get(file) !== marker) changed.add(file);
  }
  for (const file of before.keys()) {
    if (!after.has(file)) changed.add(file);
  }
  return Array.from(changed).sort();
}

async function pruneUnauthorizedEmptyParents(workspace: string, file: string, baseline: FrontierSwarmGitWorkspaceFileSnapshot): Promise<void> {
  let current = path.dirname(file);
  while (current && current !== '.' && !path.isAbsolute(current)) {
    if (snapshotContainsSwarmGitWorkspacePath(baseline, current)) return;
    const absolute = path.join(workspace, current);
    try {
      await fs.rmdir(absolute);
    } catch {
      return;
    }
    current = path.dirname(current);
  }
}

async function walkWorkspaceWriteFence(
  root: string,
  current: string,
  allowedWrites: readonly string[],
  records: FrontierSwarmGitWorkspaceWriteFenceRecord[]
): Promise<void> {
  const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    const relative = path.relative(root, absolute).replace(/\\/g, '/');
    if (!relative || entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (shouldPruneSwarmGitWorkspaceWriteFenceTraversal(relative)) {
        await fenceWorkspacePath(absolute, relative, 'directory', allowedWrites, records);
        continue;
      }
      await walkWorkspaceWriteFence(root, absolute, allowedWrites, records);
      await fenceWorkspacePath(absolute, relative, 'directory', allowedWrites, records);
    } else if (entry.isFile()) {
      await fenceWorkspacePath(absolute, relative, 'file', allowedWrites, records);
    }
  }
}

async function fenceWorkspacePath(
  absolutePath: string,
  relativePath: string,
  kind: 'file' | 'directory',
  allowedWrites: readonly string[],
  records: FrontierSwarmGitWorkspaceWriteFenceRecord[]
): Promise<void> {
  const keepWritable = kind === 'directory'
    ? allowedWrites.some((entry) => writeEntryCoversDirectory(relativePath, entry))
    : allowedWrites.some((entry) => writeEntryCoversFile(relativePath, entry));
  if (keepWritable) return;
  const stat = await fs.lstat(absolutePath).catch(() => undefined);
  if (!stat) return;
  const originalMode = stat.mode & 0o7777;
  const fencedMode = originalMode & ~0o222;
  if (fencedMode === originalMode) return;
  await fs.chmod(absolutePath, fencedMode).catch(() => {});
  const after = await fs.lstat(absolutePath).catch(() => undefined);
  if (!after || (after.mode & 0o222) !== 0) return;
  records.push({ path: relativePath, absolutePath, kind, originalMode, fencedMode });
}

function writeEntryCoversFile(file: string, entry: string): boolean {
  const parsed = parseWriteFenceEntry(entry);
  if (!parsed) return false;
  if (parsed.all === true) return true;
  return file === parsed.prefix || file.startsWith(parsed.prefix + '/');
}

function writeEntryCoversDirectory(directory: string, entry: string): boolean {
  const parsed = parseWriteFenceEntry(entry);
  if (!parsed) return false;
  if (parsed.all === true) return true;
  return directory === parsed.prefix
    || directory.startsWith(parsed.prefix + '/')
    || parsed.prefix.startsWith(directory + '/');
}

function parseWriteFenceEntry(entry: string): { all: true } | { all: false; prefix: string } | undefined {
  const raw = String(entry ?? '').trim().replace(/\\/g, '/').replace(/\/+$/, '');
  if (!raw || raw.includes('\0') || path.isAbsolute(raw) || path.win32.isAbsolute(raw)) return undefined;
  if (raw === '*' || raw === '**' || raw === '**/*') return { all: true };
  const starIndex = raw.indexOf('*');
  const staticPart = writeFenceStaticRoot(raw, starIndex);
  const prefix = normalizeSwarmGitWorkspacePath(staticPart);
  return prefix ? { all: false, prefix } : undefined;
}

function writeFenceStaticRoot(raw: string, starIndex: number): string {
  if (starIndex < 0) return raw.replace(/\/+$/, '');
  const staticPart = raw.slice(0, starIndex);
  if (staticPart.endsWith('/')) return staticPart.replace(/\/+$/, '');
  const segmentEnd = staticPart.lastIndexOf('/');
  if (segmentEnd < 0) return '';
  return staticPart.slice(0, segmentEnd).replace(/\/+$/, '');
}

function skippedWriteFenceReason(enabled: boolean, plan: FrontierSwarmGitWorkspacePlan): string | undefined {
  if (!enabled) return 'worker execution skipped';
  if (plan.allowedWritePolicy.mode !== 'strict') return 'allowed write policy is audit';
  if (plan.mode !== 'copy' && plan.mode !== 'snapshot') return `workspace mode ${plan.mode} is not isolated`;
  return undefined;
}

function createWriteFenceSummary(input: {
  mode: FrontierSwarmGitWorkspaceWriteFenceSummary['mode'];
  applied?: boolean;
  skippedReason?: string;
  lockedPathCount?: number;
  sampleLockedPaths?: string[];
  writableRoots: readonly string[];
}): FrontierSwarmGitWorkspaceWriteFenceSummary {
  return {
    mode: input.mode,
    applied: input.applied ?? false,
    ...(input.skippedReason ? { skippedReason: input.skippedReason } : {}),
    lockedPathCount: input.lockedPathCount ?? 0,
    restoredPathCount: 0,
    failedRestoreCount: 0,
    sampleLockedPaths: input.sampleLockedPaths ?? [],
    writableRoots: uniqueWriteFenceRoots(input.writableRoots),
    limitations: WRITE_FENCE_LIMITATIONS
  };
}

function uniqueWriteFenceRoots(values: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const root = String(value ?? '').trim();
    if (!root || seen.has(root)) continue;
    seen.add(root);
    out.push(root);
  }
  return out;
}

function uniqueStrings(values: readonly string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (!out.includes(value)) out.push(value);
  }
  return out;
}

async function copyWorkspacePath(cwd: string, workspacePath: string, include: string, excludes: readonly string[]): Promise<void> {
  const relative = normalizeSwarmGitWorkspacePath(include);
  if (!relative) return;
  const from = path.resolve(cwd, relative);
  const to = path.resolve(workspacePath, relative);
  if (!await pathExists(from)) return;
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.cp(from, to, {
    recursive: true,
    force: true,
    filter: (source: string) => !isExcluded(cwd, source, excludes)
  });
}

function isExcluded(cwd: string, source: string, excludes: readonly string[]): boolean {
  const relative = path.relative(cwd, source).replace(/\\/g, '/');
  return excludes.some((exclude) => swarmGitWorkspacePathMatches(relative, exclude));
}

async function linkWorkspacePath(cwd: string, workspacePath: string, include: string): Promise<void> {
  const relative = normalizeSwarmGitWorkspacePath(include);
  if (!relative) return;
  const from = path.resolve(cwd, relative);
  const to = path.resolve(workspacePath, relative);
  if (!await pathExists(from) || await pathExists(to)) return;
  await fs.mkdir(path.dirname(to), { recursive: true });
  const stat = await fs.lstat(from);
  await fs.symlink(from, to, stat.isDirectory() ? 'dir' : 'file').catch(() => {});
}

function assertGeneratedWorkspacePath(plan: FrontierSwarmGitWorkspacePlan): void {
  const relative = path.relative(plan.guardRoot ?? plan.root, plan.path);
  if (relative.startsWith('..') || path.isAbsolute(relative) || relative === '') {
    throw new Error(`Refusing to replace workspace outside generated root: ${plan.path}`);
  }
}

function readRawTask(job: FrontierSwarmGitJob): Record<string, unknown> {
  const metadata = isObject(job.task.metadata) ? job.task.metadata : {};
  return isObject(metadata.source) ? metadata.source : {};
}

function normalizeAllowedWritePolicy(value: FrontierSwarmGitAllowedWritePolicyOptions | undefined): Required<FrontierSwarmGitAllowedWritePolicyOptions> {
  return { mode: value?.mode === 'strict' ? 'strict' : value?.mode === 'off' ? 'off' : 'audit' };
}

function uniqueIgnoredChangedPathReasons(
  reasons: readonly FrontierSwarmGitWorkspaceIgnoredChangedPathReason[]
): FrontierSwarmGitWorkspaceIgnoredChangedPathReason[] {
  const out: FrontierSwarmGitWorkspaceIgnoredChangedPathReason[] = [];
  const seen = new Set<string>();
  for (const reason of reasons) {
    const normalizedPath = normalizeSwarmGitWorkspacePath(reason.path);
    if (!normalizedPath) continue;
    const key = `${normalizedPath}:${reason.reasonCode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ path: normalizedPath, reasonCode: reason.reasonCode });
  }
  return out;
}

function countIgnoredChangedPathReasons(reasons: readonly FrontierSwarmGitWorkspaceIgnoredChangedPathReason[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const reason of reasons) counts[reason.reasonCode] = (counts[reason.reasonCode] ?? 0) + 1;
  return counts;
}

function isGeneratedWorkspaceSetupFile(file: string): boolean {
  return file === 'loom.json' || file === '.loomignore' || file === '.gitignore';
}

function isExplicitWorkspaceInput(file: string, plan: FrontierSwarmGitWorkspacePlan): boolean {
  const inputs = [...plan.includes, ...plan.artifactIncludes, ...plan.requiredIncludes, ...plan.optionalIncludes];
  return inputs.some((entry) => file === entry || file.startsWith(entry.replace(/\/$/, '') + '/'));
}

function pathHasIgnoredSegment(file: string, segments: readonly string[]): boolean {
  const parts = file.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts.some((part) => segments.includes(part));
}

const WORKSPACE_NOISE_SUFFIX_REASONS: Array<{ suffix: string; reasonCode: FrontierSwarmGitWorkspaceIgnoredChangedPathReasonCode }> = [
  { suffix: '.tsbuildinfo', reasonCode: 'tsbuildinfo' }
];

const WORKSPACE_NOISE_FILE_REASONS: Array<{ name: string; reasonCode: FrontierSwarmGitWorkspaceIgnoredChangedPathReasonCode }> = [
  { name: '.eslintcache', reasonCode: 'cache' },
  { name: '.stylelintcache', reasonCode: 'cache' }
];

const WORKSPACE_NOISE_SEGMENT_REASONS: Array<{ segment: string; reasonCode: FrontierSwarmGitWorkspaceIgnoredChangedPathReasonCode }> = [
  { segment: '.git', reasonCode: 'git_metadata' },
  { segment: '.cache', reasonCode: 'cache' },
  { segment: '.turbo', reasonCode: 'cache' },
  { segment: '.vite', reasonCode: 'cache' },
  { segment: '.parcel-cache', reasonCode: 'cache' },
  { segment: '.next', reasonCode: 'build_output' },
  { segment: '.nuxt', reasonCode: 'build_output' },
  { segment: '.svelte-kit', reasonCode: 'build_output' },
  { segment: 'node_modules', reasonCode: 'node_modules' },
  { segment: 'dist', reasonCode: 'build_output' },
  { segment: 'build', reasonCode: 'build_output' },
  { segment: 'coverage', reasonCode: 'coverage' },
  { segment: '.frontier-framework', reasonCode: 'frontier_framework' },
  { segment: '.loom', reasonCode: 'generated_setup' },
  { segment: 'agent-runs', reasonCode: 'agent_runs' },
  { segment: 'target', reasonCode: 'build_output' }
];

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const object = value as Record<string, unknown>;
  return '{' + Object.keys(object).sort().map((key) => JSON.stringify(key) + ':' + stableStringify(object[key])).join(',') + '}';
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

async function findFilesByName(root: string, name: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'collected' || entry.name === 'node_modules' || entry.name === '.git') continue;
        await walk(absolute);
      } else if (entry.isFile() && entry.name === name) {
        out.push(absolute);
      }
    }
  }
  await walk(root);
  return out;
}

// Keep these aliases stable for callers that prefer repository-oriented wording.
export const gitSwarmGitDirty = swarmGitDirty;
