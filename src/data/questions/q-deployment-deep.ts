import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

// Deep-dive deployment-pipelines bank. 20 questions, all `dpd-001..dpd-020`.
// IDs are unique against existing dp-, mx-, and scn- ranges. Domain is
// 'maintain' / subtopic 'deployment-pipelines'. Trap-focused authoring:
// stage-count immutability, Member+Contributor combo, target-stage rules,
// promotion conflicts, selective deploy traps, backwards deploy semantics,
// Git-integration interaction, Gen2-only dataflow support, cross-workspace
// shared semantic models, and RLS membership not promoting forward.

export const deploymentDeep: Question[] = [
  // ── Pipeline creation / stage count ──────────────────────────
  single({
    id: 'dpd-001', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    prompt: 'A team creates a new Fabric deployment pipeline with the standard 3 stages and assigns workspaces. Six months later they want to insert a fourth "UAT" stage between Test and Production. What is the supported path?',
    options: [
      'Click "Add stage" on the pipeline and pick a position between Test and Prod',
      'Stage count is FIXED at pipeline creation — create a new pipeline with the desired stage count and re-assign workspaces',
      'Open the pipeline settings and change the StageCount property',
      'File a Microsoft support ticket — only support engineering can mutate stage count'
    ],
    correct: 1,
    explanation: 'The number of stages in a deployment pipeline is set at creation and cannot be changed afterward. To add a UAT stage you must create a new pipeline with the desired stage count, re-assign workspaces, and migrate any deployment rules. This is one of the most-missed exam traps.',
    whyWrong: {
      0: '"Add stage" is not exposed on existing pipelines — the option does not exist after creation.',
      2: 'There is no StageCount property to edit; the structure is locked.',
      3: 'Microsoft support cannot mutate stage count either — it is a hard product constraint, not a permission gate.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'stage-count', 'exam-trap', 'creation-time']
  }),
  single({
    id: 'dpd-002', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 3,
    prompt: 'When you create a deployment pipeline in Fabric, which option determines the stage count?',
    options: [
      'A workspace setting on the Production workspace',
      'A radio choice during pipeline creation: 2-stage, 3-stage, or up to 10-stage custom layout',
      'The capacity SKU — F64+ allows extra stages',
      'It auto-detects from the workspace naming convention'
    ],
    correct: 1,
    explanation: 'Pipeline creation lets you pick a stage count up to 10 (or the standard 3-stage Dev/Test/Prod template). The choice is permanent for the lifetime of the pipeline — you cannot add or remove stages later, so plan UAT/staging tiers up front.',
    whyWrong: {
      0: 'No workspace setting controls pipeline stage count.',
      2: 'Stage count is independent of capacity SKU.',
      3: 'There is no naming-convention auto-detect; it is an explicit creation-time choice.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'creation', 'stage-count']
  }),
  single({
    id: 'dpd-003', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 3,
    prompt: 'You attempt to assign a workspace that is already assigned to another deployment pipeline\'s Test stage to a new pipeline\'s Dev stage. What happens?',
    options: [
      'The assignment succeeds — workspaces can participate in multiple pipelines simultaneously',
      'The assignment is rejected — a workspace can be assigned to AT MOST one stage of one pipeline at a time',
      'The workspace is force-detached from the original pipeline silently',
      'The assignment succeeds but the original pipeline becomes read-only'
    ],
    correct: 1,
    explanation: 'A workspace can be assigned to at most one stage of one pipeline. Reassigning requires explicitly unassigning from the original pipeline first. This prevents promotion conflicts where two pipelines both think they own the same workspace.',
    whyWrong: {
      0: 'Multi-pipeline membership is not allowed — promotion semantics would become ambiguous.',
      2: 'No silent detach; the assignment is blocked with an error.',
      3: 'Original pipelines do not become read-only — they retain ownership.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'workspace-assignment']
  }),

  // ── Permissions matrix (Member + Contributor) ────────────────
  multi({
    id: 'dpd-004', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    prompt: 'A user must be able to deploy items from Test to Production. Which permission combinations satisfy the MINIMUM requirement? Select all that apply.',
    options: [
      'Member on Test (source) + Contributor on Production (target)',
      'Member on Test (source) + Member on Production (target)',
      'Admin on Test (source) + Admin on Production (target)',
      'Pipeline Admin only, no workspace role on either stage',
      'Contributor on Test (source) + Contributor on Production (target)'
    ],
    correct: [0, 1, 2],
    explanation: 'Source needs at least Member (to read+initiate); target needs at least Contributor (to write the artifact in). Anything that meets BOTH minimums qualifies — Member+Contributor, Member+Member, Admin+Admin all pass. Pipeline Admin alone bypasses none of this; Contributor on source is below the source minimum.',
    whyWrong: {
      3: 'Pipeline Admin manages pipeline structure but does NOT bypass workspace permissions. Without Member-or-above on source, the user cannot initiate.',
      4: 'Contributor on source is below the threshold — Contributor cannot initiate deployments outward.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'permissions', 'permissions-matrix']
  }),
  single({
    id: 'dpd-005', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    prompt: 'A user is Pipeline Admin and Member on Production but only Viewer on Development. They attempt a Dev → Test promotion. What happens?',
    options: [
      'Deployment succeeds — Pipeline Admin overrides the source-stage requirement',
      'Deployment fails — Viewer on the SOURCE stage is below the Member-required threshold',
      'Deployment succeeds in read-only "preview" mode',
      'Deployment is queued pending workspace-admin approval'
    ],
    correct: 1,
    explanation: 'Source-stage requires Member or above. Viewer on Dev fails the source check, regardless of Pipeline Admin status. Pipeline Admin governs pipeline structure (rules, stage configuration), not deployment authority — the workspace role on source is the gating control.',
    whyWrong: {
      0: 'Pipeline Admin never overrides source workspace permissions.',
      2: 'There is no preview-mode for failed permission checks.',
      3: 'There is no approval-queue mechanism in deployment pipelines (pipelines don\'t have approval gates natively — that\'s a Git/CD layer concern).'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'permissions', 'pipeline-admin']
  }),

  // ── Deployment rules vs parameter rules — TARGET stage ────────
  single({
    id: 'dpd-006', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    prompt: 'You configure a Data Source Rule swapping the Dev SQL connection for the Prod connection. Which stage does the rule belong to?',
    options: [
      'The SOURCE stage (Test) — rules describe what is being sent',
      'The TARGET stage (Production) — rules apply to content arriving on that stage',
      'Both stages must hold a matching rule for the override to work',
      'Tenant-level rule store; stages reference it by name'
    ],
    correct: 1,
    explanation: 'Rules ALWAYS live on the target stage. They describe how arriving content should be re-bound for that environment. A rule on Production says "any incoming connection that matches dev-sql.contoso.com gets rewritten to prod-sql.contoso.com on arrival." Rules on the source would defeat the purpose.',
    whyWrong: {
      0: 'Source-stage rules would mean Dev rewrites its own connection — meaningless.',
      2: 'Rules are not paired; only the target needs the rule.',
      3: 'There is no tenant-level rule store. Rules are pipeline-stage scoped.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'rules', 'target-stage', 'data-source-rule']
  }),
  single({
    id: 'dpd-007', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 5,
    prompt: 'A semantic model uses a Power Query parameter named `pSqlServer` (capital S). The Production stage has a Parameter Rule keyed on `psqlserver` (all lowercase). After promotion, queries still resolve to the Dev server. Why?',
    options: [
      'The rule is on the wrong stage',
      'Parameter rule binding is CASE-SENSITIVE on parameter NAME — the rule fails to match and is silently no-op',
      'Power Query parameters cannot be overridden by deployment rules',
      'The rule needs a "force apply" flag set on the target'
    ],
    correct: 1,
    explanation: 'Parameter rules bind by exact parameter NAME, case-sensitive. `pSqlServer` does not match `psqlserver`, so the rule no-ops silently — no warning, no error, just unchanged behavior. Always copy the parameter name verbatim from the model into the rule.',
    whyWrong: {
      0: 'The rule is on the correct stage (target = Production). Stage placement is right; the binding key is wrong.',
      2: 'Parameter rules absolutely override Power Query parameters when the names match.',
      3: 'There is no "force apply" flag — rule application is automatic when the binding matches.'
    },
    source: SRC.deployment,
    relatedIds: ['dlm2-004', 'dpd-008'],
    tags: ['deployment-pipelines', 'parameter-rule', 'case-sensitive', 'silent-failure', 'exam-trap']
  }),
  multi({
    id: 'dpd-008', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 5,
    prompt: 'Which statements about Data Source Rules vs Parameter Rules are TRUE? Select all that apply.',
    options: [
      'Both live on the TARGET stage',
      'Data Source Rules rebind connection strings; Parameter Rules rebind named M parameter values',
      'Parameter Rules require the parameter to exist in the target item with the EXACT same name (case-sensitive) and a compatible type',
      'Data Source Rules can rebind a Lakehouse SQL endpoint to point at a different Lakehouse',
      'Rules apply at deploy time only — no live rebinding of an item already in the target stage'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Both rule types live on the target. Data Source Rules rewrite connections; Parameter Rules rewrite named M parameter values. Parameter binding is case-sensitive and type-compatible. Rules fire at deploy time — they do not retroactively rebind already-deployed content.',
    whyWrong: {
      3: 'Lakehouse SQL endpoints are NOT rebindable via Data Source Rules — Lakehouse and Warehouse references are workspace-scoped object IDs, not user-defined connection strings, and they re-resolve based on the target stage\'s paired workspace.'
    },
    source: SRC.deployment,
    relatedIds: ['dlm2-004', 'dpd-007'],
    tags: ['deployment-pipelines', 'rules-deep', 'parameter-rule', 'data-source-rule']
  }),

  // ── Selective deploy traps ────────────────────────────────────
  single({
    id: 'dpd-009', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    prompt: 'A Test workspace has both a semantic model and the report that consumes it, both with pending changes. The on-call engineer selectively deploys only the report to Production. What is the LIKELY result?',
    options: [
      'The report deploys cleanly — Fabric resolves report-only deploys without semantic model changes',
      'The deploy succeeds but the report in Prod may fail or show errors because it expects measure / column changes that exist only in Test',
      'The deploy is rejected — selective deploys must include all dependencies',
      'The semantic model is auto-promoted alongside the report'
    ],
    correct: 1,
    explanation: 'Selective deployment lets you skip dependencies, which is exactly the point — but it is also the trap. If the new report references a measure that lives only in the Test version of the semantic model, the Production report will reference a missing measure and fail visuals. Always pair report changes with the model changes they depend on, or split the work properly.',
    whyWrong: {
      0: 'Fabric does not auto-resolve missing dependencies; references are by id and may dangle.',
      2: 'Selective deploys are NOT rejected on dependency grounds. They proceed even when dependencies are missing — silent breakage is the failure mode.',
      3: 'Selective deploy means selective — the model is NOT auto-promoted just because the report needs it.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'selective-deploy', 'dependency-trap']
  }),
  multi({
    id: 'dpd-010', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 5,
    prompt: 'Which scenarios are LEGITIMATE risks of using selective deployment for a hotfix? Select all that apply.',
    options: [
      'Skipped dependencies cause runtime errors in the target stage (e.g., report references a measure that does not exist there)',
      'The pipeline\'s comparison view drifts from reality because deployed and undeployed items intermix',
      'Deployment rules on the target stage no longer apply',
      'Subsequent FULL deploys may try to "fix" intentional state divergence by overwriting changes',
      'Selective deploys disable backward-deployment for the rest of the day'
    ],
    correct: [0, 1, 3],
    explanation: 'Selective deploy creates intentional drift between stages. Skipped dependencies break references; the pipeline UI compares item-by-item but cumulative drift is hard to read; future "deploy all" runs overwrite manual selective state. Rules continue to apply normally; backward-deploy is unaffected.',
    whyWrong: {
      2: 'Deployment rules on the target stage continue to apply for any selective deploys — rule application is per-deploy operation.',
      4: 'There is no rate-limit or lockout on backward-deploys after selective deploys; they remain available.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'selective-deploy', 'risks']
  }),

  // ── Backwards deploy semantics ───────────────────────────────
  single({
    id: 'dpd-011', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    prompt: 'After a backward deploy from Production to Test, a developer notices the report in Test is now using the TEST data source connection, not Production\'s. Is this a bug?',
    options: [
      'Yes — backward deploys should preserve the source environment\'s connections',
      'No — deployment rules on Test STILL fire for backward deploys; arriving content is rebound to test sources just like a forward deploy',
      'No — backward deploys always strip connection info and prompt the user',
      'Yes — file a Microsoft support ticket to enable connection preservation'
    ],
    correct: 1,
    explanation: 'Deployment rules apply to ANY content arriving at a stage, regardless of direction. The Test stage\'s rules fire on the prod-originated content and rebind connections to Test\'s data sources — which is usually exactly what you want for reproducing prod issues against test data.',
    whyWrong: {
      0: 'Connections are environment-bound; rebinding on arrival is the design intent, not a bug.',
      2: 'Connection info is rebound, not stripped. There is no user prompt mid-deploy.',
      3: 'There is no setting to disable rules on backward deploy. The behavior is by design.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'backward-deploy', 'rules-fire-bidirectionally']
  }),
  multi({
    id: 'dpd-012', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    prompt: 'When is backward deployment (Prod → Test, Test → Dev) appropriate? Select all that apply.',
    options: [
      'Reproducing a Production-only bug in Test using the Production version of the artifact',
      'Re-syncing Dev with Prod after a long divergence so a feature can be branched cleanly',
      'Demoting a Dev experiment when a developer accidentally pushed to Prod',
      'Performing a daily backward sync as a "fresh data" mechanism'
    ],
    correct: [0, 1, 2],
    explanation: 'Backward deploy is for reproduction, re-alignment, and undo of accidental forward-deploys. It is NOT a data-freshness tool — pipelines move metadata, not data, so backward deploy will not "refresh" Test\'s data from Prod.',
    whyWrong: {
      3: 'Backward deploy moves artifact definitions, not data. Using it for "fresh data" misunderstands the mechanism — Test data is whatever Test\'s sources hold, regardless of the artifact direction.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'backward-deploy']
  }),

  // ── Git integration with Fabric ───────────────────────────────
  single({
    id: 'dpd-013', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    prompt: 'A team uses Fabric Git integration on the Development workspace AND a deployment pipeline (Dev → Test → Prod). Which statement is TRUE?',
    options: [
      'Git integration replaces the pipeline — pick one or the other',
      'Git integration is for source control on the Dev workspace; the pipeline still handles promotion to Test and Prod',
      'Git integration syncs all three stages from the same branch automatically',
      'You must connect the pipeline to Git before connecting workspaces individually'
    ],
    correct: 1,
    explanation: 'Git integration and deployment pipelines are complementary: Git binds a single workspace (typically Dev) to a Git repo for source control + branching; the pipeline still moves content to Test and Prod. Test/Prod workspaces are typically NOT Git-connected.',
    whyWrong: {
      0: 'They are explicitly designed to coexist — pipeline for promotion, Git for source control.',
      2: 'Git integration binds ONE workspace per branch; multi-stage syncing is not the model.',
      3: 'No required ordering — pipeline and Git connections are independent.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'git-integration', 'coexistence']
  }),
  single({
    id: 'dpd-014', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 5,
    prompt: 'The Dev workspace is Git-connected and a developer pushes a measure change to the linked branch. The team then promotes Dev → Test via the pipeline. What does Test see?',
    options: [
      'Whatever was last clicked "Update workspace" in Dev — the Git push alone does NOT propagate to the workspace until applied',
      'The Git branch HEAD — pushes auto-flow through the pipeline to Test',
      'Both versions side-by-side until reconciled',
      'An error — pushed-but-unapplied changes block promotion'
    ],
    correct: 0,
    explanation: 'Git pushes show up as PENDING UPDATES in Dev. Until someone clicks "Update workspace" (or runs a script), the workspace state — and therefore the artifact promoted to Test — does not include the push. This is the most common silent footgun when teams adopt Git+pipelines.',
    whyWrong: {
      1: 'Git integration is pull-on-demand, not push-triggered.',
      2: 'No side-by-side state; the workspace holds exactly one current version.',
      3: 'Promotion does not error on pending Git updates — it just promotes the current workspace state.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'git-integration', 'pending-updates', 'silent-trap']
  }),

  // ── Gen2 dataflow gotchas (Gen1 not supported) ────────────────
  single({
    id: 'dpd-015', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 3,
    prompt: 'A workspace contains a legacy Power BI Dataflow Gen1 and a new Dataflow Gen2. Which is supported by Fabric deployment pipelines?',
    options: [
      'Only Gen1 — pipelines pre-date Gen2',
      'Only Gen2 — Gen1 is the legacy Power BI dataflow, NOT supported',
      'Both Gen1 and Gen2',
      'Neither — dataflows of any kind are excluded'
    ],
    correct: 1,
    explanation: 'Dataflow Gen2 is supported in Fabric deployment pipelines. Gen1 (legacy Power BI dataflow) is NOT supported and must be migrated to Gen2 before it can participate in pipeline promotion. This is a classic exam trap.',
    whyWrong: {
      0: 'Gen1 is explicitly excluded from Fabric deployment pipelines.',
      2: 'Gen1 is not supported; only Gen2.',
      3: 'Gen2 dataflows ARE supported — they are first-class pipeline items.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'dataflow-gen1', 'dataflow-gen2', 'exam-trap']
  }),
  multi({
    id: 'dpd-016', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 5,
    prompt: 'You promote a Dataflow Gen2 with default destination "Bronze Lakehouse" from Test to Prod. Which behaviors should you EXPECT? Select all that apply.',
    options: [
      'The default destination rebinds to the Production-stage Lakehouse if the workspaces are paired and the destination Lakehouse exists with the same name',
      'Power Query parameters can be overridden by Parameter Rules on Prod',
      'Gen2 dataflow item ID is preserved across stages, so external API references remain stable',
      'Connection credentials promote with the dataflow',
      'The Gen2 dataflow is rebuilt as a Gen1 dataflow on Prod for compatibility'
    ],
    correct: [0, 1, 2],
    explanation: 'Default destinations rebind across paired workspaces. Parameter Rules apply. Item IDs are preserved (the property that makes scripted automation possible). Connection credentials are NEVER promoted — every stage owns its own bound credentials. Gen2 stays Gen2; there is no downgrade.',
    whyWrong: {
      3: 'Connections and credentials are environment-scoped and never promoted. The target stage uses its own configured credentials.',
      4: 'There is no Gen2 → Gen1 downgrade. Gen2 stays Gen2.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'dataflow-gen2', 'destinations', 'credentials']
  }),

  // ── Cross-workspace shared semantic models ────────────────────
  single({
    id: 'dpd-017', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 5,
    prompt: 'A report in Workspace A connects to a shared semantic model in Workspace B. Both workspaces are paired into the same deployment pipeline at the Dev stage. The report is promoted to Test. What happens to the cross-workspace reference?',
    options: [
      'The report still points at Workspace B (Dev) — the cross-workspace reference is NOT rebound automatically and a deployment rule (or stage-pairing) is required',
      'Fabric auto-rebinds the report to the Test-paired Workspace B equivalent — no rule needed',
      'The promotion fails because cross-workspace references are unsupported in pipelines',
      'The report becomes an orphaned binding that prompts the user on first open'
    ],
    correct: 1,
    explanation: 'When two workspaces are PAIRED into the same deployment pipeline (each has its own stage-mapped counterparts), Fabric DOES auto-rebind cross-workspace semantic-model references between the paired workspaces on promotion — the report now points at Workspace B-Test\'s shared model. If the workspaces are NOT both paired, the report dangles at Dev. The exam trap is knowing the pairing is what enables the rebind.',
    whyWrong: {
      0: 'Pairing is the mechanism that DOES rebind these references — it does happen automatically when both workspaces are configured into the pipeline\'s stages.',
      2: 'Cross-workspace references are supported with proper pairing.',
      3: 'No prompt UI exists; the binding is resolved at promotion time, not on first open.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'cross-workspace', 'shared-semantic-model', 'pairing']
  }),

  // ── RLS membership not promoting forward ──────────────────────
  single({
    id: 'dpd-018', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    prompt: 'A semantic model defines RLS roles "EU", "US", "APAC" with member assignments configured in Dev. After promoting Dev → Test → Prod, users in Prod report they cannot see ANY data. Why?',
    options: [
      'RLS is disabled in Prod by default for safety',
      'Role DEFINITIONS promote with the model, but role MEMBER ASSIGNMENTS do NOT — Prod has empty roles until members are added on the Prod stage',
      'USERPRINCIPALNAME() returns blank in Prod',
      'Deployment rules wiped out the role definitions on arrival'
    ],
    correct: 1,
    explanation: 'Role definitions (the DAX filter expressions) DO promote. Role MEMBERSHIPS (which user / group is in which role) DO NOT — those are workspace-stage-specific and must be configured on each stage individually. Empty roles + RLS enforcement = no data visible to anyone. This is a frequent post-deploy "outage."',
    whyWrong: {
      0: 'RLS is not auto-disabled on promotion.',
      2: 'USERPRINCIPALNAME() works the same in all environments.',
      3: 'Rules do not affect role definitions.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'rls', 'membership-not-promoted', 'exam-trap']
  }),

  // ── Promotion conflicts ───────────────────────────────────────
  single({
    id: 'dpd-019', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    prompt: 'Two engineers concurrently click "Deploy Dev → Test" on the same pipeline. What does Fabric do?',
    options: [
      'Both deployments run in parallel — last-write-wins on each item',
      'A deployment lock is acquired; the second engineer\'s click queues or errors until the first deploy completes',
      'The pipeline is permanently corrupted and must be recreated',
      'Both deploys are rejected with a "concurrent operation" error and the pipeline locks for 5 minutes'
    ],
    correct: 1,
    explanation: 'Pipelines serialize deployments via a lock on the stage transition. Concurrent clicks either queue or error out cleanly — the pipeline does not allow both to mutate state at once. Coordinate deployments via your release process to avoid surprise queueing.',
    whyWrong: {
      0: 'No parallel last-write-wins; that would be a chaos engine.',
      2: 'No corruption — locks prevent it.',
      3: 'No 5-minute lockout; the lock releases as soon as the active deploy finishes.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'concurrency', 'locks']
  }),

  // ── Ordering: full hotfix workflow ───────────────────────────
  order({
    id: 'dpd-020', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    prompt: 'A Production-only bug needs a hotfix. Place these steps in the correct order for the SAFEST hotfix workflow using Git + deployment pipelines.',
    options: [
      'Branch from the prod-aligned commit in Git to create a hotfix branch',
      'Make the fix locally and push to the hotfix branch',
      'Apply the Git update to the Dev workspace ("Update workspace") so the workspace state matches the hotfix branch',
      'Promote Dev → Test through the deployment pipeline; verify in Test',
      'Promote Test → Prod through the deployment pipeline',
      'Back-merge the hotfix branch into the main feature branch in Git'
    ],
    explanation: 'Hotfix-from-prod-tag, fix on isolated branch, sync to Dev workspace, promote forward through Test and Prod (deployment rules and gates fire normally), then back-merge to keep the feature branch in sync. The order matters: pushing without "Update workspace" leaves the workspace stale; promoting before verifying in Test risks releasing a broken fix; forgetting the back-merge causes the bug to reappear when the feature branch lands.',
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'hotfix', 'ordering', 'git-integration']
  })
];
