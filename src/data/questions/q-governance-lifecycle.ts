// Governance, Deployment Pipelines, and Lifecycle Management — DP-600 exam bank.
//
// 25 questions, IDs gvlc-001..gvlc-025, domain:'maintain' (all 25).
// Subtopics: deployment-pipelines, variable-libraries, workspace-roles,
//   deployment-rules, parameter-rules, git-integration, fabric-cli,
//   workspace-governance, lifecycle.
//
// Type mix: 15 single, 8 multi, 2 ordering.
// Trap-focus: stage-count immutability, rule binding (case-sensitive parameter
//   names), Variable Libraries (April 2025+), pipeline permission matrix,
//   backwards deploy rule-fire, RLS membership non-promotion, selective deploy
//   silent skip, Git pending-update footgun, Fabric CLI semantic model ops,
//   workspace identity for service principals, sensitivity label propagation,
//   domain grouping, OneLake vs item permissions, audit log retention, lineage.

import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

export const governanceLifecycle: Question[] = [

  // ── Deployment pipeline: stage count + workspace assignment ───────────────

  single({
    id: 'gvlc-001',
    domain: 'maintain',
    subtopic: 'deployment-pipelines',
    difficulty: 3,
    prompt: 'A Fabric deployment pipeline is created with 3 stages (Dev / Test / Prod). Three months later the team wants to add a "UAT" stage. What is the supported action?',
    options: [
      'Edit the pipeline and click "Add Stage" — up to 10 stages may be added post-creation',
      'Open pipeline Settings and increase the StageCount property from 3 to 4',
      'Create a new pipeline from scratch with 4 stages; re-assign workspaces and migrate rules',
      'Rename the Prod stage to UAT and create a secondary pipeline for Prod only'
    ],
    correct: 2,
    explanation: 'Stage count is fixed at pipeline creation. There is no post-creation "Add Stage" button and no StageCount property. The only path is a new 4-stage pipeline. The rename workaround (D) breaks every existing deployment rule that references the "Prod" stage by name.',
    whyWrong: {
      0: '"Add Stage" does not exist on a pipeline after creation. The option is absent in the UI.',
      1: 'There is no StageCount property. Pipeline structure is immutable post-creation.',
      3: 'Renaming Prod to UAT invalidates all Prod-stage deployment rules and creates confusion — it is not a supported migration path.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'stage-count', 'immutable', 'exam-trap'],
    relatedIds: ['dpd-001', 'dpd-002']
  }),

  // ── Deployment pipeline: permissions matrix ───────────────────────────────

  multi({
    id: 'gvlc-002',
    domain: 'maintain',
    subtopic: 'deployment-pipelines',
    difficulty: 4,
    prompt: 'A user needs to promote items from Test to Production. Which permission combinations are the MINIMUM that allow the promotion? Select all that apply.',
    options: [
      'Member on Test + Contributor on Production',
      'Contributor on Test + Member on Production',
      'Admin on Test + Admin on Production',
      'Pipeline Admin role only — no workspace role required',
      'Member on Test + Member on Production'
    ],
    correct: [0, 2, 4],
    explanation: 'Source stage requires at least Member (to initiate the deploy); target stage requires at least Contributor (to write artifacts). Member+Contributor (A), Admin+Admin (C), and Member+Member (E) all meet both thresholds. Contributor on the SOURCE (B) is below the Member minimum, so it fails. Pipeline Admin (D) governs pipeline structure but does NOT bypass workspace role requirements.',
    whyWrong: {
      1: 'Contributor is below the Member threshold required on the SOURCE stage — the deploy is blocked.',
      3: 'Pipeline Admin controls pipeline configuration (rules, stages); it does not substitute for workspace membership on either stage.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'permissions', 'permissions-matrix', 'minimum-role'],
    relatedIds: ['dpd-004', 'dpd-005', 'gs-001']
  }),

  // ── Deployment rules vs Parameter rules ──────────────────────────────────

  single({
    id: 'gvlc-003',
    domain: 'maintain',
    subtopic: 'deployment-rules',
    difficulty: 4,
    prompt: 'A team configures a Data Source Rule on the Production stage to swap a Dev SQL connection for the Prod connection. After promotion, queries still hit the Dev server. Which explanation is MOST likely?',
    options: [
      'The rule was accidentally placed on the SOURCE (Test) stage instead of the TARGET (Production) stage',
      'Data Source Rules only work for Power Query connections, not SQL connections',
      'A rule override requires "Force Apply" to be enabled on the pipeline',
      'Data Source Rules require a matching Parameter Rule to activate'
    ],
    correct: 0,
    explanation: 'Rules ALWAYS live on the target stage and fire when content arrives. A rule placed on the source stage is ignored at deploy time — rules on the source stage have no effect because they describe what TO DO with incoming content. Placing the rule on Production is the only valid configuration. There is no "Force Apply" flag, and Data Source Rules are not limited to Power Query connections.',
    whyWrong: {
      1: 'Data Source Rules work for any supported connection type, including SQL. Connection-string format determines match, not the connector type.',
      2: 'There is no "Force Apply" flag. Rules fire automatically when a name/connection match is found at deploy time.',
      3: 'Data Source Rules and Parameter Rules are independent. A Data Source Rule does not require a companion Parameter Rule.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'deployment-rules', 'target-stage', 'exam-trap'],
    relatedIds: ['dpd-006', 'dpd-008']
  }),

  // ── Parameter rules: case-sensitivity ────────────────────────────────────

  single({
    id: 'gvlc-004',
    domain: 'maintain',
    subtopic: 'parameter-rules',
    difficulty: 5,
    prompt: 'A semantic model has a Power Query parameter named `ServerURL`. The Production stage Parameter Rule is keyed on `serverurl` (all lowercase). Post-promotion, the model still queries the Dev server. Why?',
    options: [
      'Parameter Rules only bind to numeric parameters, not string parameters',
      'Parameter rule binding is CASE-SENSITIVE on the parameter name — `serverurl` does not match `ServerURL` and the rule silently no-ops',
      'The rule must be placed on the source stage for string parameters',
      'Power Query parameters named with mixed case are excluded from rule matching'
    ],
    correct: 1,
    explanation: 'Parameter rules match by exact parameter NAME, and matching is case-sensitive. `serverurl` ≠ `ServerURL`. The rule silently does nothing — no error, no warning, just unchanged behavior. Copy the parameter name verbatim (including case) from the model\'s Power Query editor into the rule key.',
    whyWrong: {
      0: 'Parameter Rules bind to any parameter type including strings. The limitation is name matching, not type.',
      2: 'Rules always live on the target stage, never the source. Source-stage rules are a category error.',
      3: 'There is no mixed-case exclusion. The sole requirement is exact case-sensitive name match.'
    },
    source: SRC.deployment,
    tags: ['parameter-rules', 'case-sensitive', 'silent-failure', 'exam-trap'],
    relatedIds: ['dpd-007', 'dpd-008']
  }),

  // ── Variable Libraries ────────────────────────────────────────────────────

  single({
    id: 'gvlc-005',
    domain: 'maintain',
    subtopic: 'variable-libraries',
    difficulty: 3,
    prompt: 'A team wants to replace hardcoded Lakehouse IDs and connection strings in their Fabric notebooks and dataflows with per-workspace configuration values that change automatically when content is promoted through a deployment pipeline. Which April 2025+ Fabric feature is designed for this?',
    options: [
      'Deployment rules (Data Source Rules on each stage)',
      'Variable Libraries — per-workspace config items that bind to deployment pipelines and expose named values to notebooks, dataflows, and other items',
      'Power Query parameters defined in the semantic model',
      'Environment items attached to each workspace'
    ],
    correct: 1,
    explanation: 'Variable Libraries (GA April 2025) are per-workspace configuration items that store named key-value pairs. When a Variable Library is bound to a deployment pipeline stage, its values are available at runtime to notebooks, Dataflow Gen2, and pipelines without hardcoded IDs. Promoting a workspace carries its Variable Library values, effectively replacing per-stage parameter rules for code-level config.',
    whyWrong: {
      0: 'Deployment rules (Data Source / Parameter Rules) are pipeline-stage configuration items that rebind specific connection strings or PQ parameter names. They do not expose arbitrary named values to notebook code at runtime.',
      2: 'Power Query parameters in a semantic model are model-scoped and cannot be referenced from notebooks or pipeline activities.',
      3: 'Environment items (Spark environments) define Spark libraries and compute settings — they do not store general-purpose configuration key-value pairs.'
    },
    source: SRC.deployment,
    tags: ['variable-libraries', 'per-workspace-config', 'deployment-pipelines', 'april-2025'],
    relatedIds: ['gvlc-006', 'dpd-007']
  }),

  multi({
    id: 'gvlc-006',
    domain: 'maintain',
    subtopic: 'variable-libraries',
    difficulty: 4,
    prompt: 'Which statements about Variable Libraries in Microsoft Fabric are TRUE? Select all that apply.',
    options: [
      'A Variable Library is a Fabric item that lives inside a workspace',
      'Values in a Variable Library can be referenced in Spark notebooks via a Fabric runtime API',
      'A single Variable Library can be shared across multiple workspaces simultaneously',
      'Variable Libraries replace deployment pipeline rules entirely — rules become unnecessary',
      'A Variable Library can be bound to a deployment pipeline stage so that stage-specific values are used on promotion'
    ],
    correct: [0, 1, 4],
    explanation: 'Variable Libraries are workspace-scoped Fabric items (A). Notebooks access them at runtime (B). They are bound per stage in a pipeline (E). A Variable Library is workspace-scoped and cannot be simultaneously shared across multiple workspaces (C is false). Variable Libraries complement deployment rules for code-level config; they do NOT replace rules for rebinding data connections or PQ parameters (D is false).',
    whyWrong: {
      2: 'Variable Libraries are per-workspace items. Each workspace has its own; sharing across workspaces is not supported — you define equivalent libraries in each workspace with the appropriate values.',
      3: 'Variable Libraries solve the code-config problem (notebook/dataflow parameters). Deployment rules solve the pipeline promotion rebinding problem (connections, PQ params). They serve different layers and coexist.'
    },
    source: SRC.deployment,
    tags: ['variable-libraries', 'workspace-scoped', 'deployment-pipelines', 'notebooks'],
    relatedIds: ['gvlc-005']
  }),

  // ── Selective deploy silent skip ──────────────────────────────────────────

  single({
    id: 'gvlc-007',
    domain: 'maintain',
    subtopic: 'deployment-pipelines',
    difficulty: 4,
    prompt: 'A developer selectively deploys only a report to Production, skipping the updated semantic model it depends on. The deploy completes with a "Success" status. Users then open the report and visuals fail. Why did the deploy succeed but the report break?',
    options: [
      'Fabric validated the dependency graph and the deploy should have failed — this is a product bug',
      'Selective deployment does NOT validate dependencies — it promotes only the selected items; broken references are the developer\'s responsibility',
      'The report was corrupted during deploy; redeploying the same report will fix it',
      'Production has stricter validation than Test; re-promote with "full deploy" to trigger validation'
    ],
    correct: 1,
    explanation: 'Selective deployment is intentionally "skip dependencies if you want to." Fabric does not block or warn when a selectively deployed report references a measure or table that exists only in the source stage version of the model. The deploy succeeds; the runtime error surfaces when users query the report against a production model that lacks those columns/measures.',
    whyWrong: {
      0: 'This is intentional product behavior, not a bug. Selective deploy exists precisely to allow partial promotion.',
      2: 'Redeploying the same broken report does nothing — the model in Production is still the old version. The fix is to also promote the updated semantic model.',
      3: 'There is no "stricter validation" in Production. The pipeline has no stage-specific validation pass.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'selective-deploy', 'silent-failure', 'dependency-trap'],
    relatedIds: ['dpd-009', 'dpd-010']
  }),

  // ── Backwards deployment ──────────────────────────────────────────────────

  order({
    id: 'gvlc-008',
    domain: 'maintain',
    subtopic: 'deployment-pipelines',
    difficulty: 4,
    prompt: 'A Production bug needs a hotfix. Using backwards deployment and a 3-stage pipeline (Dev / Test / Prod), place the 5 steps in the correct order.',
    options: [
      'Backwards-deploy Prod → Test to bring the Production artifact into the Test stage',
      'Apply the fix directly in the Test workspace and verify it',
      'Promote Test → Prod via the deployment pipeline (forward deploy)',
      'Backwards-deploy Test → Dev to align Dev with the hotfix state',
      'Update RLS role memberships in Prod after forward promotion (they do not promote automatically)'
    ],
    explanation: 'Backwards deploy first pulls the prod-state into Test for an accurate base (step 1). The fix is applied in Test (step 2) and validated. Forward-deploy to Prod (step 3). Backwards-deploy to Dev aligns the dev workspace (step 4) so future work starts from the correct base. Finally, reconfigure RLS memberships in Prod because member assignments never promote automatically (step 5).',
    whyWrong: {
      0: 'Fixing in Test before pulling the prod artifact means your fix base is wrong — Test may have unrelated in-flight changes.',
      1: 'Promoting to Prod before aligning Dev is valid if the team is disciplined, but neglecting RLS membership restoration will silently lock out users.',
      2: 'Not aligning Dev after the hotfix means the next feature branch diverges from the corrected Prod baseline.',
      3: 'Skipping the RLS membership step is the most common post-hotfix outage cause.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'backward-deploy', 'hotfix', 'rls', 'ordering'],
    relatedIds: ['dpd-011', 'dpd-018', 'dpd-020']
  }),

  // ── Git integration ───────────────────────────────────────────────────────

  single({
    id: 'gvlc-009',
    domain: 'maintain',
    subtopic: 'git-integration',
    difficulty: 4,
    prompt: 'A developer pushes a DAX measure change to the feature branch connected to the Dev workspace. A teammate immediately promotes Dev → Test via the deployment pipeline. What version of the measure appears in Test?',
    options: [
      'The pushed version — Git push automatically updates the Dev workspace item',
      'The pre-push version — the workspace state does not update until someone clicks "Update workspace" (or triggers an API sync)',
      'An error occurs — the pipeline detects an out-of-sync workspace and aborts',
      'Both versions appear side-by-side until reconciled'
    ],
    correct: 1,
    explanation: 'Fabric Git integration is pull-on-demand. A push to the connected branch creates a pending update indicator on the workspace — it does NOT auto-apply to workspace items. The pipeline promotes whatever is in the workspace at the time of promotion, which is the pre-push version until someone applies the update. This is the most common silent trap when teams adopt Git + deployment pipelines.',
    whyWrong: {
      0: 'Git pushes are not auto-applied to workspace items. The workspace retains its current state until "Update workspace" is triggered.',
      2: 'The pipeline does not detect or block on pending Git updates. It promotes current workspace state without warning.',
      3: 'Workspaces hold exactly one version of each item. There is no side-by-side dual-version state.'
    },
    source: SRC.deployment,
    tags: ['git-integration', 'pending-update', 'deployment-pipelines', 'silent-trap'],
    relatedIds: ['dpd-013', 'dpd-014']
  }),

  multi({
    id: 'gvlc-010',
    domain: 'maintain',
    subtopic: 'git-integration',
    difficulty: 3,
    prompt: 'Which repository providers are supported for Fabric workspace Git integration? Select all that apply.',
    options: [
      'Azure DevOps (Azure Repos)',
      'GitHub (GitHub.com and GitHub Enterprise)',
      'GitLab',
      'Bitbucket',
      'AWS CodeCommit'
    ],
    correct: [0, 1],
    explanation: 'Fabric Git integration supports Azure DevOps (Azure Repos) and GitHub. GitLab, Bitbucket, and AWS CodeCommit are NOT supported as of 2025 GA. If a team uses GitLab or Bitbucket they must mirror to Azure Repos or GitHub for Fabric Git integration.',
    whyWrong: {
      2: 'GitLab is not a supported Git provider for Fabric workspace integration.',
      3: 'Bitbucket is not supported — mirror to Azure Repos or GitHub.',
      4: 'AWS CodeCommit is not supported and is outside the Azure/GitHub ecosystem that Fabric integrates with.'
    },
    source: SRC.deployment,
    tags: ['git-integration', 'supported-providers', 'azure-devops', 'github'],
    relatedIds: ['gvlc-009', 'dpd-013']
  }),

  single({
    id: 'gvlc-011',
    domain: 'maintain',
    subtopic: 'git-integration',
    difficulty: 4,
    prompt: 'A team wants to let developers work on isolated feature branches without affecting the shared Dev workspace. Which Fabric Git workflow supports this?',
    options: [
      'Create a new deployment pipeline for each developer',
      'Use the "branch out" workflow — each developer creates a branch from the connected branch and gets an isolated workspace that tracks their branch',
      'Give each developer Admin on the shared Dev workspace; rely on Git conflict resolution',
      'Use OneLake shortcuts to isolate developer data'
    ],
    correct: 1,
    explanation: '"Branch out" is the documented Fabric pattern for isolated development. A developer branches from the main connected branch and associates that personal branch with a personal/isolated workspace. Their changes live in their branch and workspace until they merge back. This prevents feature work from polluting the shared Dev workspace.',
    whyWrong: {
      0: 'Creating a new deployment pipeline per developer is prohibitively expensive (pipeline = workspace set) and does not address the Git branching need.',
      2: 'Shared Admin access with Git conflict resolution still means everyone writes to the same workspace — it does not provide isolation.',
      3: 'OneLake shortcuts manage data references, not code/item isolation.'
    },
    source: SRC.deployment,
    tags: ['git-integration', 'branch-out', 'isolation', 'developer-workflow'],
    relatedIds: ['gvlc-009', 'gvlc-010']
  }),

  // ── RLS membership non-promotion ──────────────────────────────────────────

  single({
    id: 'gvlc-012',
    domain: 'maintain',
    subtopic: 'deployment-pipelines',
    difficulty: 4,
    prompt: 'A semantic model in Dev has RLS roles "EMEA", "AMER", "APAC" with group memberships configured. After a Dev → Test → Prod promotion, users in Prod report seeing no data at all. What is the MOST likely cause?',
    options: [
      'RLS is automatically disabled after pipeline promotion as a safety measure',
      'Role DEFINITIONS promote with the model; role MEMBER ASSIGNMENTS do NOT — Prod roles exist but are empty, so everyone is blocked',
      'The deployment rules wiped the role definitions on arrival at Prod',
      'USERPRINCIPALNAME() returns a different value in Prod because the workspace identity is different'
    ],
    correct: 1,
    explanation: 'Role definitions (the filter DAX expressions: "EMEA", "AMER", "APAC") ARE promoted. Role MEMBERSHIPS (which user or group belongs to which role) ARE NOT — they are environment-specific and must be reconfigured on each target stage. Empty roles + RLS enforcement = no data visible to any user. This is the most common post-deploy "blackout" incident.',
    whyWrong: {
      0: 'RLS is never auto-disabled by the pipeline. The roles arrive active but empty.',
      2: 'Deployment rules do not affect role definitions. Rules rebind data source connections and PQ parameters only.',
      3: 'USERPRINCIPALNAME() returns the calling user\'s UPN — it is not workspace-bound and does not change between stages.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'rls', 'membership-not-promoted', 'exam-trap'],
    relatedIds: ['dpd-018', 'gs-009', 'gvlc-008']
  }),

  // ── Workspace roles ───────────────────────────────────────────────────────

  multi({
    id: 'gvlc-013',
    domain: 'maintain',
    subtopic: 'workspace-roles',
    difficulty: 3,
    prompt: 'Which actions are available to a user with the CONTRIBUTOR workspace role but NOT to a VIEWER? Select all that apply.',
    options: [
      'Create, edit, and delete items in the workspace',
      'Publish a Power BI app from the workspace',
      'Manage workspace role assignments',
      'Schedule a semantic model refresh',
      'View items and reports in the workspace'
    ],
    correct: [0, 3],
    explanation: 'Contributor can create/edit/delete items (A) and schedule refreshes (D) — these are the core "write within workspace" capabilities. Publishing apps requires Member or above. Managing role assignments requires Member or above. Viewing is available to all roles including Viewer.',
    whyWrong: {
      1: 'App publishing requires Member or Admin — Contributor cannot publish.',
      2: 'Role management (add/remove workspace members) requires Member or Admin.',
      4: 'Viewer can also view items and reports — this is not a Contributor-exclusive action.'
    },
    source: SRC.workspace,
    tags: ['workspace-roles', 'contributor', 'viewer', 'permissions'],
    relatedIds: ['gs-001', 'gs-002', 'gs-006']
  }),

  single({
    id: 'gvlc-014',
    domain: 'maintain',
    subtopic: 'workspace-roles',
    difficulty: 3,
    prompt: 'A company uses service principals for automated Fabric operations (pipeline triggers, semantic model refreshes). Which workspace role grants the service principal the ability to trigger item refreshes without being able to manage workspace membership?',
    options: [
      'Viewer',
      'Contributor',
      'Member',
      'Admin'
    ],
    correct: 1,
    explanation: 'Contributor is the correct least-privilege role for automated operations that need to run and trigger items (refreshes, pipeline runs, item updates) without role-management capabilities. Member additionally enables deployment-pipeline promotions; Admin additionally enables role management. Viewer is read-only and cannot trigger operations.',
    whyWrong: {
      0: 'Viewer is read-only. A service principal with Viewer cannot trigger refreshes or pipeline runs.',
      2: 'Member grants the ability to initiate deployment pipeline promotions and to manage non-Admin workspace members. This is more than needed for automation-only accounts.',
      3: 'Admin grants full role management including adding Admins — a significant over-privilege for a service principal.'
    },
    source: SRC.workspace,
    tags: ['workspace-roles', 'service-principal', 'least-privilege', 'automation'],
    relatedIds: ['gvlc-013', 'gs-001']
  }),

  // ── Workspace identity for service principals ─────────────────────────────

  single({
    id: 'gvlc-015',
    domain: 'maintain',
    subtopic: 'workspace-governance',
    difficulty: 4,
    prompt: 'A workspace identity is configured on a Fabric workspace. What does this enable?',
    options: [
      'Assigns a shared user identity to all workspace members for audit logging',
      'Creates a managed service principal (workspace-bound identity) that items in the workspace can use to authenticate to external resources without storing credentials',
      'Maps the workspace to an Entra ID group for automatic membership sync',
      'Provides a workspace-level Azure AD application registration for Power BI Embedded'
    ],
    correct: 1,
    explanation: 'A workspace identity creates a managed service identity tied to the workspace. Items such as pipelines, dataflows, and notebooks can authenticate to Azure resources (Key Vault, Storage, SQL) using this identity — removing the need to store service-principal credentials in config files or environment variables. The identity is workspace-bound and is NOT a shared user identity.',
    whyWrong: {
      0: 'Workspace identity is not a user identity and does not affect audit attribution for human users.',
      2: 'Entra ID group membership sync for workspace roles is a separate Fabric/Entra feature — not what workspace identity does.',
      3: 'Power BI Embedded uses app-level service principals configured in the Azure portal, not workspace identity.'
    },
    source: SRC.workspace,
    tags: ['workspace-governance', 'workspace-identity', 'managed-identity', 'service-principal'],
    relatedIds: ['gvlc-014']
  }),

  // ── Fabric CLI ────────────────────────────────────────────────────────────

  multi({
    id: 'gvlc-016',
    domain: 'maintain',
    subtopic: 'fabric-cli',
    difficulty: 3,
    prompt: 'Using Fabric CLI v1.5+, which operations can be performed against deployment pipelines? Select all that apply.',
    options: [
      'Deploy items from one stage to the next (`fabric pipeline deploy`)',
      'List pipelines and their stage assignments',
      'Create a new deployment pipeline with a specified stage count',
      'Override deployment rules at deploy time via CLI flags',
      'Trigger a semantic model refresh in a specific stage workspace'
    ],
    correct: [0, 1, 4],
    explanation: 'Fabric CLI v1.5+ supports `pipeline deploy` (A), pipeline listing (B), and semantic model refresh triggers (E). Creating a new pipeline via CLI (C) is not a supported pipeline-management command — pipelines are created via the Fabric portal. Override of deployment rules via CLI flags (D) is also not supported — rules are pre-configured on the stage.',
    whyWrong: {
      2: 'Pipeline creation via CLI is not supported. Use the Fabric portal to create pipelines and configure stages.',
      3: 'Rule override at deploy time via CLI flags does not exist. Rules are stage-level configuration items, not deploy-time arguments.'
    },
    source: SRC.deployment,
    tags: ['fabric-cli', 'deployment-pipelines', 'semantic-model-refresh', 'cli-operations'],
    relatedIds: ['gvlc-017']
  }),

  single({
    id: 'gvlc-017',
    domain: 'maintain',
    subtopic: 'fabric-cli',
    difficulty: 4,
    prompt: 'A DevOps engineer wants to trigger a Fabric semantic model refresh as part of a CI/CD pipeline after a deployment. Which Fabric CLI command pattern is correct?',
    options: [
      '`fabric dataset refresh --workspace <wsId> --dataset <modelId>`',
      '`fabric items run-job --workspace-id <wsId> --item-id <modelId> --job-type SemanticModelRefresh`',
      '`fabric pipeline run --stage prod --include-refresh true`',
      '`fabric refresh trigger --model-id <modelId> --env prod`'
    ],
    correct: 1,
    explanation: '`fabric items run-job` is the Fabric CLI v1.5+ command for triggering operations on Fabric items. `--job-type SemanticModelRefresh` specifies a semantic model refresh. The legacy `dataset` namespace (A) reflects the old Power BI REST API nomenclature — the Fabric CLI uses the unified `items` namespace. Options C and D do not exist as valid Fabric CLI commands.',
    whyWrong: {
      0: 'The `fabric dataset` namespace is not part of the Fabric CLI. It mirrors old Power BI REST API naming, not the Fabric CLI command surface.',
      2: '`fabric pipeline run` can trigger a deployment, not a semantic model refresh. The `--include-refresh` flag does not exist.',
      3: '`fabric refresh trigger` is not a valid Fabric CLI command pattern.'
    },
    source: SRC.deployment,
    tags: ['fabric-cli', 'semantic-model-refresh', 'run-job', 'cicd'],
    relatedIds: ['gvlc-016']
  }),

  // ── Domains (Fabric Domains) ──────────────────────────────────────────────

  single({
    id: 'gvlc-018',
    domain: 'maintain',
    subtopic: 'workspace-governance',
    difficulty: 3,
    prompt: 'A company has workspaces for Finance, HR, and Marketing. Each department wants logical isolation, default sensitivity labels, and a governance contact. Which Fabric feature provides this grouping WITHOUT creating separate capacities?',
    options: [
      'Workspace roles — assign all Finance workspaces to a Finance role group',
      'Fabric Domains — a logical grouping of workspaces with per-domain admin, default labels, and policies',
      'Deployment pipelines — one pipeline per department acts as the logical boundary',
      'Entra ID security groups with matching workspace role assignments per department'
    ],
    correct: 1,
    explanation: 'Fabric Domains are a tenant-level logical grouping that ties workspaces together for governance purposes. A Domain has its own admin, supports a default sensitivity label that propagates to items, and provides a namespace for discovery. Domains do NOT require dedicated capacities — workspaces in the same domain can span different F-SKUs.',
    whyWrong: {
      0: 'Workspace roles govern who can do what inside a workspace — they do not provide cross-workspace logical grouping or policy.',
      2: 'Deployment pipelines are for promotion of content through environments (Dev → Prod) — not a governance boundary between business units.',
      3: 'Entra ID groups handle identity and workspace access — they have no domain-level label inheritance or admin delegation concept.'
    },
    source: SRC.governance,
    tags: ['workspace-governance', 'fabric-domains', 'logical-grouping', 'sensitivity-labels'],
    relatedIds: ['gvlc-019', 'gs-021']
  }),

  // ── Sensitivity labels + information protection ───────────────────────────

  multi({
    id: 'gvlc-019',
    domain: 'maintain',
    subtopic: 'workspace-governance',
    difficulty: 4,
    prompt: 'A workspace has a default sensitivity label "Internal Use Only" set at the Fabric Domain level. Which items created in that workspace receive the label? Select all that apply.',
    options: [
      'New Lakehouses created in the workspace',
      'New semantic models created in the workspace',
      'New Power BI reports created in the workspace',
      'Items promoted INTO the workspace via a deployment pipeline from a less-sensitive source',
      'Items the user explicitly labels "Public" — the domain default overrides user choice'
    ],
    correct: [0, 1, 2],
    explanation: 'Domain-level default labels apply to newly CREATED items in the workspace: Lakehouses, semantic models, and reports. Pipeline-promoted items inherit the label of their source item, not the domain default — the deployment carries the existing label (D is false). User-applied labels can override the domain default; "Public" set by the user takes precedence — domain defaults do not force-override user choices (E is false).',
    whyWrong: {
      3: 'Pipeline-promoted items carry their source label, not the target workspace\'s domain default. The domain default only applies to items created fresh in the workspace.',
      4: 'User-applied labels take precedence over domain defaults. Domain defaults are the fallback, not a forced override.'
    },
    source: SRC.sensitivity,
    tags: ['sensitivity-labels', 'fabric-domains', 'default-label', 'propagation', 'exam-trap'],
    relatedIds: ['gvlc-018', 'gs-021', 'gs-023']
  }),

  // ── OneLake permissions vs item permissions ───────────────────────────────

  multi({
    id: 'gvlc-020',
    domain: 'maintain',
    subtopic: 'workspace-governance',
    difficulty: 4,
    prompt: 'Which statements correctly describe the relationship between workspace roles and OneLake folder permissions? Select all that apply.',
    options: [
      'Granting Contributor workspace role automatically grants read access to all OneLake folders in that workspace',
      'OneLake folder-level ACLs can be set independently of workspace roles and can be MORE restrictive than the workspace role implies',
      'A workspace Admin can restrict a specific team member\'s OneLake read access by setting a folder-level OneLake ACL — even though the member has Contributor role',
      'Viewer workspace role grants no OneLake access at all',
      'OneLake permissions are identical to workspace roles — they cannot be configured independently'
    ],
    correct: [0, 1, 2],
    explanation: 'Contributor workspace role grants default OneLake read access (A). OneLake ACLs are an independent permission layer that can restrict access below the workspace role level (B) — this is the basis for per-folder security scenarios. An Admin CAN apply a more-restrictive OneLake ACL to override a Contributor\'s default access (C). Viewer DOES have OneLake access for items they can view (D is false). OneLake permissions ARE configurable independently (E is false).',
    whyWrong: {
      3: 'Viewer workspace role allows reading data accessible to the items they can view. Viewing a report backed by a Lakehouse implies some OneLake read access flows through.',
      4: 'OneLake folder permissions are an entirely independent ACL layer. They can be set per folder and per user/group, separate from workspace role assignments.'
    },
    source: SRC.workspace,
    tags: ['onelake', 'workspace-roles', 'acl', 'permissions', 'independent-layer'],
    relatedIds: ['gs-002', 'gs-003', 'gs-008']
  }),

  // ── Audit logs ────────────────────────────────────────────────────────────

  single({
    id: 'gvlc-021',
    domain: 'maintain',
    subtopic: 'lifecycle',
    difficulty: 3,
    prompt: 'A security team needs to audit all "View report" events across the Fabric tenant for the past 60 days. Which interface provides this?',
    options: [
      'Workspace-level activity log in each workspace',
      'Microsoft Purview Audit (unified audit log) accessible via the Microsoft 365 compliance portal — tenant-wide, 90-day retention for E3, 180+ days for E5',
      'Fabric Monitoring hub — all events surface there by default',
      'Power BI Activity log (REST API: `getActivityEvents`) — 30-day retention'
    ],
    correct: 1,
    explanation: 'The unified audit log in Microsoft Purview Audit covers Fabric events tenant-wide. E3 licenses retain 90 days; E5 retains 180+ days. A 60-day query is well within E3 retention. Workspace-level activity logs are per-workspace and cover admin events, not view events. Monitoring hub covers run/operation events, not user activity events. The Power BI activity log REST API has only 30-day retention — insufficient for 60 days.',
    whyWrong: {
      0: 'Workspace-level activity log covers administrative events (role changes, item creates/deletes) not report view events, and is scoped to a single workspace.',
      2: 'Monitoring hub covers pipeline runs, dataflow runs, refresh operations — not user-level "View report" events.',
      3: 'The Power BI activity log REST API retains only 30 days of events. 60-day lookback requires the Purview unified audit log.'
    },
    source: SRC.governance,
    tags: ['audit-logs', 'purview', 'tenant-admin', 'retention-period', 'compliance'],
    relatedIds: ['gvlc-022', 'gs-028']
  }),

  single({
    id: 'gvlc-022',
    domain: 'maintain',
    subtopic: 'lifecycle',
    difficulty: 4,
    prompt: 'A tenant admin needs to retrieve Fabric audit events programmatically to feed a SIEM. Which method is the current Microsoft-documented approach?',
    options: [
      'Query the Fabric Monitoring hub REST API',
      'Call the Microsoft 365 Management Activity API or use Microsoft Purview Audit Search API',
      'Read audit data from a dedicated `FabricAudit` table in each Lakehouse',
      'Subscribe to the Fabric Eventstream for tenant-wide audit events'
    ],
    correct: 1,
    explanation: 'Fabric audit events flow into the unified audit log. Programmatic retrieval uses the Microsoft 365 Management Activity API (used by most SIEMs) or the Purview Audit Search API. There is no Fabric-specific Monitoring hub REST API for audit events; no auto-populated `FabricAudit` table in Lakehouses; and Eventstream does not expose a tenant audit feed.',
    whyWrong: {
      0: 'The Monitoring hub REST API surfaces operation/run metadata (job status, durations) — not the unified audit log.',
      2: 'There is no auto-populated FabricAudit Lakehouse table. Audit data can be exported into a Lakehouse manually via Purview, but is not auto-provisioned.',
      3: 'Fabric Eventstream consumes external streaming data — it does not produce a tenant-wide audit event feed.'
    },
    source: SRC.governance,
    tags: ['audit-logs', 'management-activity-api', 'purview', 'siem', 'programmatic'],
    relatedIds: ['gvlc-021']
  }),

  // ── Lineage view ──────────────────────────────────────────────────────────

  single({
    id: 'gvlc-023',
    domain: 'maintain',
    subtopic: 'lifecycle',
    difficulty: 3,
    prompt: 'A Lakehouse table schema change breaks several downstream semantic models. Before making the change, how can a developer identify ALL downstream items impacted?',
    options: [
      'Run a full-workspace search for the table name across all item descriptions',
      'Open the Lineage view in the workspace to see the directed graph of item dependencies from the Lakehouse table forward',
      'Query the Fabric REST API for `/admin/items` and filter by source Lakehouse ID',
      'Check each semantic model\'s Power Query dependencies manually'
    ],
    correct: 1,
    explanation: 'Lineage view is the native Fabric tool that renders a directed impact graph for workspace items. Starting from the Lakehouse (or a specific table), it shows all downstream semantic models, reports, dashboards, and derived items that depend on it. This is the designed tool for impact analysis before schema changes.',
    whyWrong: {
      0: 'Item descriptions are free-text and rarely updated — a description search will miss most dependencies.',
      2: 'The `/admin/items` REST API lists items but does not surface item-to-item dependency relationships.',
      3: 'Manual Power Query inspection is time-consuming, error-prone, and misses model-to-report and other non-PQ dependency edges.'
    },
    source: SRC.governance,
    tags: ['lineage', 'impact-analysis', 'workspace-governance', 'schema-change'],
    relatedIds: ['gvlc-024']
  }),

  // ── Lifecycle: cross-workspace shared semantic model + report rebind ───────

  multi({
    id: 'gvlc-024',
    domain: 'maintain',
    subtopic: 'lifecycle',
    difficulty: 4,
    prompt: 'A team is replacing a shared semantic model with a redesigned version. Reports in 12 different workspaces consume the old model. Which approaches preserve existing reports WITHOUT requiring manual rebuild? Select all that apply.',
    options: [
      'Use the XMLA endpoint to rebind each report to the new model (Power BI report rebind)',
      'Publish the new model with the SAME item ID by deploying through a pipeline replacing the old model in-place — existing references follow the item ID',
      'Republish the new model with an identical table and measure surface so existing reports resolve without rebinding',
      'Delete the old model immediately to force users to connect to the new model',
      'Ask every report owner to manually update their report\'s dataset connection'
    ],
    correct: [0, 1, 2],
    explanation: 'XMLA endpoint rebind (A) is the authoritative programmatic approach for large-scale migration. Pipeline-driven in-place replacement (B) preserves the item ID so existing cross-workspace references auto-resolve. Surface-compatible republish (C) allows reports to continue working without explicit rebinding if the model surface is backward-compatible. Deleting the old model (D) immediately breaks all 12 workspaces. Manual owner-by-owner rebind (E) does not scale.',
    whyWrong: {
      3: 'Deleting the source model instantly orphans all 12 consuming workspaces. Reports fail to render until each is rebound. This is migration by destruction.',
      4: 'Manual rebind by each report owner does not scale across 12 workspaces, misses shared bookmarks and subscriptions, and has no reliable completion signal.'
    },
    source: SRC.governance,
    tags: ['lifecycle', 'rebind', 'cross-workspace', 'xmla', 'model-migration'],
    relatedIds: ['gvlc-023', 'mo-017']
  }),

  // ── Ordering: Git branch-out + promote isolated feature ──────────────────

  order({
    id: 'gvlc-025',
    domain: 'maintain',
    subtopic: 'git-integration',
    difficulty: 3,
    prompt: 'Order the steps of the Fabric "branch out" workflow for isolated feature development, from start to finish.',
    options: [
      'Create a feature branch from the main branch in the connected Git repository',
      'Use "Branch out" in the Fabric workspace to create an isolated workspace linked to the feature branch',
      'Develop and test items in the isolated workspace; changes sync to the feature branch',
      'Open a pull request from the feature branch to the main branch in Git',
      'Apply the merged changes to the main (Dev) workspace by clicking "Update workspace"',
      'Promote Dev → Test → Prod via the deployment pipeline'
    ],
    explanation: 'The canonical order: create the feature branch (1), branch out to an isolated workspace (2), develop in isolation (3), PR to main (4), apply changes to the shared Dev workspace (5), then promote through the pipeline (6). Branching out before the feature branch exists has nowhere to link. Promoting before applying the update (step 5) carries the pre-merge state to Test/Prod.',
    whyWrong: {
      0: 'Branching out (step 2) before creating the feature branch (step 1) has no target branch to link the isolated workspace to.',
      1: 'Developing before the isolated workspace is created means changes land in the shared workspace, defeating the isolation goal.',
      2: 'Opening a PR before development is complete is premature.',
      3: 'Updating the Dev workspace before the PR is merged would pull unreviewed code into the shared workspace.',
      4: 'Promoting before the Dev workspace is updated (step 5) deploys the pre-feature-merge state to Test/Prod.'
    },
    source: SRC.deployment,
    tags: ['git-integration', 'branch-out', 'ordering', 'isolated-development', 'deployment-pipelines'],
    relatedIds: ['gvlc-009', 'gvlc-011', 'dpd-020']
  })

];
