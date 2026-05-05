import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

export const maintain: Question[] = [
  // ── Workspace roles ──────────────────────────────────────────
  single({
    id: 'wr-001', domain: 'maintain', subtopic: 'workspace-roles', difficulty: 1,
    prompt: 'Which workspace role is read-only and cannot publish, edit, or share content?',
    options: ['Admin', 'Member', 'Contributor', 'Viewer'],
    correct: 3,
    explanation: 'Viewer can consume content (reports, dashboards) and use the Warehouse SQL endpoint read-only, but cannot edit or share.',
    whyWrong: {
      0: 'Admin has full workspace control.',
      1: 'Member can edit, share, and add Contributors/Viewers.',
      2: 'Contributor can create and edit content within the workspace.'
    },
    source: SRC.workspace,
    tags: ['workspace', 'roles']
  }),
  single({
    id: 'wr-002', domain: 'maintain', subtopic: 'workspace-roles', difficulty: 2,
    prompt: 'Which is the MINIMUM role required to add a new Viewer to a Fabric workspace?',
    options: ['Viewer', 'Contributor', 'Member', 'Admin'],
    correct: 2,
    explanation: 'Member can add Viewers and Contributors. Adding new Members or Admins requires the Admin role.',
    whyWrong: {
      0: 'Viewer cannot add anyone.',
      1: 'Contributor cannot manage membership.',
      3: 'Admin works but Member is sufficient — the question asks the minimum.'
    },
    source: SRC.workspace,
    tags: ['workspace', 'permissions']
  }),
  single({
    id: 'wr-003', domain: 'maintain', subtopic: 'workspace-roles', difficulty: 3,
    prompt: 'A user is workspace Viewer. They want to query the Lakehouse SQL endpoint from SSMS for ad-hoc analysis. What is the result?',
    options: [
      'They can connect read-only via the SQL endpoint',
      'They get an authentication failure — Viewer is reports-only',
      'They can connect with full read/write access',
      'They must be added as Contributor'
    ],
    correct: 0,
    explanation: 'Viewer grants read-only access to the SQL analytics endpoint of a Lakehouse or Warehouse. Tools like SSMS, ADS, or any T-SQL client can connect.',
    whyWrong: {
      1: 'Viewer is not reports-only; SQL read access is included.',
      2: 'Viewer is read-only — never write.',
      3: 'Adding as Contributor is unnecessarily permissive for read-only.'
    },
    source: SRC.workspace,
    tags: ['workspace', 'sql-endpoint', 'viewer']
  }),
  single({
    id: 'wr-004', domain: 'maintain', subtopic: 'workspace-roles', difficulty: 3,
    prompt: 'A Contributor publishes a new report. Who can see it by default?',
    options: [
      'All workspace members at any role',
      'Only the Contributor and workspace Admins',
      'Anyone in the tenant',
      'No one until shared explicitly'
    ],
    correct: 0,
    explanation: 'Once a Contributor publishes content into the workspace, all workspace members (Viewer, Contributor, Member, Admin) inherit access via the workspace role. Sharing externally is a separate step.',
    whyWrong: {
      1: 'Workspace roles propagate; Viewers see new content too.',
      2: 'Tenant-wide visibility requires explicit publication or sharing.',
      3: 'No explicit share is needed inside the workspace.'
    },
    source: SRC.workspace,
    tags: ['workspace', 'sharing']
  }),
  single({
    id: 'wr-005', domain: 'maintain', subtopic: 'workspace-roles', difficulty: 2,
    prompt: 'Which role is required to delete the workspace itself?',
    options: ['Viewer', 'Contributor', 'Member', 'Admin'],
    correct: 3,
    explanation: 'Only Admin can delete the workspace. All other roles can manage their permitted content but not the workspace as an object.',
    whyWrong: {
      0: 'Viewer cannot delete anything.',
      1: 'Contributor can only delete their own content.',
      2: 'Member cannot delete the workspace.'
    },
    source: SRC.workspace,
    tags: ['workspace', 'admin']
  }),
  // ── RLS / OLS ─────────────────────────────────────────────────
  single({
    id: 'rls-001', domain: 'maintain', subtopic: 'security-rls', difficulty: 2,
    prompt: 'Which DAX function is preferred for dynamic RLS in Fabric / Power BI to identify the authenticated user?',
    options: ['USERNAME()', 'USERPRINCIPALNAME()', 'CURRENT_USER()', 'IDENTITY()'],
    correct: 1,
    explanation: 'USERPRINCIPALNAME() returns the Azure AD UPN (typically the email) and is the recommended function for cloud / Fabric RLS scenarios.',
    whyWrong: {
      0: 'USERNAME() returns DOMAIN\\user format, originally for on-prem AS. Less reliable in Fabric.',
      2: 'CURRENT_USER() is not a DAX function in this context.',
      3: 'IDENTITY() is not used for user identification in DAX.'
    },
    source: SRC.rls,
    tags: ['rls', 'dax']
  }),
  single({
    id: 'rls-002', domain: 'maintain', subtopic: 'security-rls', difficulty: 3,
    prompt: 'You define a role with the filter `[Region] = "EU"` and assign user A to it. User A is also assigned to role with `[Region] = "US"`. What does user A see?',
    options: [
      'Only EU rows',
      'Only US rows',
      'EU rows OR US rows (union)',
      'Nothing — conflicting roles deny access'
    ],
    correct: 2,
    explanation: 'When a user belongs to multiple RLS roles, the filters are combined as UNION (OR), not intersection. The user sees rows that match ANY role they are in.',
    whyWrong: {
      0: 'Filters do not isolate; they combine.',
      1: 'Same — filters combine with OR semantics.',
      3: 'Multiple roles never deny access; they expand it.'
    },
    source: SRC.rls,
    tags: ['rls', 'multiple-roles']
  }),
  single({
    id: 'rls-003', domain: 'maintain', subtopic: 'security-rls', difficulty: 4,
    prompt: 'You have a Users dim with UPN and a Sales fact with SalesRep. Dynamic RLS should filter Sales for the logged-in salesperson. Which DAX role expression is correct on Users?',
    options: [
      '[UPN] = USERNAME()',
      '[UPN] = USERPRINCIPALNAME()',
      'Sales[SalesRep] = USERPRINCIPALNAME()',
      'CALCULATE([UPN], USERPRINCIPALNAME())'
    ],
    correct: 1,
    explanation: 'You filter the dim table on UPN equals the current user. The relationship Users → Sales propagates the filter automatically. UPN comparison should use USERPRINCIPALNAME() for cloud reliability.',
    whyWrong: {
      0: 'USERNAME() returns the wrong format (DOMAIN\\user) in cloud scenarios.',
      2: 'You define the role on the DIM (Users), not on the fact, so the relationship can propagate.',
      3: 'CALCULATE is not a role expression; this expression has no meaning in RLS.'
    },
    source: SRC.rls,
    tags: ['rls', 'dynamic-rls']
  }),
  single({
    id: 'rls-004', domain: 'maintain', subtopic: 'security-ols', difficulty: 3,
    prompt: 'A finance team must NOT see the existence of a "Margin %" column in the model. Which capability fits?',
    options: ['RLS to filter rows', 'OLS to hide the column', 'A measure that returns BLANK for finance', 'Sensitivity label "Confidential"'],
    correct: 1,
    explanation: 'OLS hides tables or columns from designated roles entirely — the user cannot even see the object exists in the model schema. RLS only filters rows.',
    whyWrong: {
      0: 'RLS filters rows; the column would still be visible.',
      2: 'A BLANK measure still has a name visible in the field list.',
      3: 'Sensitivity labels classify but do not hide objects.'
    },
    source: SRC.ols,
    tags: ['ols', 'object-hiding']
  }),
  single({
    id: 'rls-005', domain: 'maintain', subtopic: 'security-ols', difficulty: 4,
    prompt: 'A user with OLS hiding "Margin" attempts to write a measure that references [Margin]. What happens?',
    options: [
      'The measure works — OLS only hides from the field list',
      'The measure errors because the user cannot see [Margin] at all',
      'The measure returns 0 silently',
      'Power BI prompts the user to elevate permissions'
    ],
    correct: 1,
    explanation: 'OLS hides the object completely. References to a hidden object error out — the user cannot author DAX that reads from a column they can\'t see.',
    whyWrong: {
      0: 'OLS is enforced everywhere, not just visually.',
      2: 'It does not return 0; it errors.',
      3: 'There is no in-product elevation prompt for OLS.'
    },
    source: SRC.ols,
    tags: ['ols', 'enforcement']
  }),
  multi({
    id: 'rls-006', domain: 'maintain', subtopic: 'security-rls', difficulty: 5,
    prompt: 'Which approaches help debug an RLS configuration?',
    options: [
      '"View as" feature in Power BI Service to impersonate a role',
      'Connecting via XMLA with a role hint and running explicit DAX queries',
      'Adding a measure that returns USERPRINCIPALNAME() to confirm identity',
      'Disabling RLS in production temporarily to verify data is reachable'
    ],
    correct: [0, 1, 2],
    explanation: '"View as", XMLA role-impersonated queries, and a "show me my UPN" measure are all standard RLS debugging tools. Disabling RLS in production is a security incident.',
    whyWrong: {
      3: 'Disabling RLS in production exposes restricted data — never an acceptable debugging step.'
    },
    source: SRC.rls,
    tags: ['rls', 'debugging']
  }),
  // ── Sensitivity labels ───────────────────────────────────────
  single({
    id: 'sl-001', domain: 'maintain', subtopic: 'sensitivity-labels', difficulty: 2,
    prompt: 'Sensitivity labels in Microsoft Fabric are defined and managed in which service?',
    options: ['Microsoft Purview / Information Protection', 'Power BI tenant settings', 'Fabric capacity settings', 'OneLake admin portal'],
    correct: 0,
    explanation: 'Sensitivity labels (MIP labels) are defined in Microsoft Purview Information Protection. Fabric (and Power BI, M365 apps generally) consume the same label taxonomy.',
    whyWrong: {
      1: 'PBI tenant settings can govern label usage but not define them.',
      2: 'Capacity settings are about compute, not classification.',
      3: 'OneLake portal does not own the label taxonomy.'
    },
    source: SRC.sensitivity,
    tags: ['sensitivity', 'purview']
  }),
  single({
    id: 'sl-002', domain: 'maintain', subtopic: 'sensitivity-labels', difficulty: 3,
    prompt: 'A semantic model is labeled "Confidential". A user exports report data to Excel. What happens to the label?',
    options: [
      'The label travels with the export and is enforced downstream by MIP-aware tools',
      'The label is dropped on export — Excel files are unprotected',
      'The export is blocked unless Excel is in cloud-only mode',
      'The label converts to a watermark only'
    ],
    correct: 0,
    explanation: 'Sensitivity labels propagate with exported data. MIP-aware downstream tools (Excel with the unified labeling client, M365 apps, etc.) honor the label and apply the configured protection.',
    whyWrong: {
      1: 'Labels do not drop — that\'s the entire point of label propagation.',
      2: 'Exports aren\'t blocked; they\'re labeled.',
      3: 'Watermarks are one possible protection action but not the entire story.'
    },
    source: SRC.sensitivity,
    tags: ['sensitivity', 'export', 'propagation']
  }),
  // ── Deployment pipelines ─────────────────────────────────────
  single({
    id: 'dp-001', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 2,
    prompt: 'A standard Fabric deployment pipeline contains how many stages?',
    options: ['1', '2', '3', '5'],
    correct: 2,
    explanation: 'Pipelines have three stages: Development, Test, and Production. Content flows forward (and can be deployed backward to reproduce issues).',
    whyWrong: {
      0: '1 stage is no pipeline at all.',
      1: '2-stage is not the supported model.',
      3: '5 stages is not standard; you can have additional environments via separate pipelines.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines']
  }),
  single({
    id: 'dp-002', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 3,
    prompt: 'Which permission combination is required to deploy from Test to Production?',
    options: [
      'Viewer on both stages',
      'Member on Test and at least Contributor on Production',
      'Admin on Production only',
      'Pipeline Admin on the pipeline only'
    ],
    correct: 1,
    explanation: 'Deployment requires sufficient rights on BOTH source (Member or above to read+initiate) and target (Contributor or above to write content into the workspace).',
    whyWrong: {
      0: 'Viewer cannot deploy.',
      2: 'Target permission alone is insufficient — you need source rights too.',
      3: 'Pipeline Admin manages the pipeline structure but does not bypass workspace permissions.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'permissions']
  }),
  single({
    id: 'dp-003', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 3,
    prompt: 'In a deployment pipeline, where do "deployment rules" (e.g., swapping the SQL connection from dev to prod) live?',
    options: [
      'Inside the .pbix file as parameters',
      'On the SOURCE stage of the pipeline',
      'On the TARGET stage of the pipeline',
      'In a tenant-wide configuration store'
    ],
    correct: 2,
    explanation: 'Deployment rules live on the TARGET stage. They override values when content is deployed INTO that stage — so the dev connection becomes the prod connection on arrival in Production.',
    whyWrong: {
      0: 'PBIX parameters can hold values but rules sit in pipeline metadata, not in the artifact.',
      1: 'Rules on the source would defeat their purpose; they must apply on incoming content.',
      3: 'There is no tenant-wide rule store; rules are pipeline-stage scoped.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'rules']
  }),
  single({
    id: 'dp-004', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 3,
    prompt: 'A team needs to push only one urgent semantic model fix from Test to Production without promoting other unrelated work-in-progress. What feature supports this?',
    options: [
      'Selective deployment',
      'Workspace branching',
      'Backward deployment',
      'XMLA hot-patch'
    ],
    correct: 0,
    explanation: 'Selective deployment lets you choose individual items to promote. Useful for hotfixes — but be aware that unselected items remain on the prior version, which can break dependencies.',
    whyWrong: {
      1: 'Workspace branching is not a Fabric feature.',
      2: 'Backward deployment is for reproducing prod issues in test, not selective forward deploys.',
      3: 'XMLA hot-patch is not a deployment feature.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'selective']
  }),
  single({
    id: 'dp-005', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    prompt: 'After a backward deployment from Production to Test, the Test workspace now contains the production version of a report. The team wants to investigate a bug. What is a CRITICAL consideration?',
    options: [
      'Backward deploy is not allowed in Fabric',
      'Any deployment rules on Test still apply — connection strings will swap as Test, not as Prod',
      'Production data is automatically copied with the report',
      'The report becomes read-only in Test'
    ],
    correct: 1,
    explanation: 'Backward deploy is allowed and useful — but the deployment rules on Test still fire. So a "prod" report deployed back to Test will use TEST data sources, which is usually exactly what you want for investigation.',
    whyWrong: {
      0: 'Backward deploy IS allowed.',
      2: 'Data is not copied — only metadata/artifact definitions move.',
      3: 'Reports are not made read-only by direction of deployment.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'backward-deploy']
  }),
  multi({
    id: 'dp-006', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 4,
    prompt: 'Which item types ARE supported in Fabric deployment pipelines? Select all that apply.',
    options: [
      'Power BI semantic models and reports',
      'Dataflow Gen2',
      'Dataflow Gen1',
      'Notebooks',
      'Lakehouses'
    ],
    correct: [0, 1, 3, 4],
    explanation: 'Pipelines support most modern Fabric items: semantic models, reports, Gen2 dataflows, notebooks, lakehouses. Dataflow Gen1 is the legacy item NOT supported.',
    whyWrong: {
      2: 'Dataflow Gen1 is the legacy Power BI dataflow and is NOT supported in Fabric deployment pipelines.'
    },
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'supported-items']
  }),
  // ── XMLA endpoint ────────────────────────────────────────────
  single({
    id: 'xm-001', domain: 'maintain', subtopic: 'xmla-endpoint', difficulty: 2,
    prompt: 'The XMLA endpoint is associated with which Fabric/Power BI artifact type?',
    options: ['Semantic models', 'Lakehouses', 'Pipelines', 'Reports'],
    correct: 0,
    explanation: 'XMLA is the Tabular protocol for Analysis Services. In Power BI / Fabric, the XMLA endpoint exposes semantic models for advanced management with SSMS, Tabular Editor, DAX Studio, ALM Toolkit, etc.',
    whyWrong: {
      1: 'Lakehouses use SQL endpoints, not XMLA.',
      2: 'Pipelines have no XMLA surface.',
      3: 'Reports are not XMLA-exposed.'
    },
    source: SRC.xmla,
    tags: ['xmla', 'semantic-models']
  }),
  single({
    id: 'xm-002', domain: 'maintain', subtopic: 'xmla-endpoint', difficulty: 3,
    prompt: 'Which CAPACITY setting controls XMLA endpoint read/write availability?',
    options: [
      'A tenant admin toggle on each user',
      'A capacity setting (Read / Read-Write / Off)',
      'Per-workspace endpoint flag',
      'The XMLA endpoint is always read-write'
    ],
    correct: 1,
    explanation: 'XMLA endpoint mode is configured at the capacity level: Off, Read (consume only), or Read-Write (deploy/manage). Many Premium-class workloads need Read-Write to enable Tabular Editor / ALM workflows.',
    whyWrong: {
      0: 'It is not per-user; it is capacity-level.',
      2: 'Workspace flag does not exist for XMLA mode.',
      3: 'It depends on capacity setting; not always Read-Write.'
    },
    source: SRC.xmla,
    tags: ['xmla', 'capacity']
  }),
  // ── pbip / version control ────────────────────────────────────
  single({
    id: 'pbip-001', domain: 'maintain', subtopic: 'pbip', difficulty: 2,
    prompt: 'Which file format is recommended for source-control collaboration on Power BI / Fabric semantic models and reports?',
    options: ['.pbix', '.pbit', '.pbip (Power BI Project)', '.bim alone'],
    correct: 2,
    explanation: '.pbip decomposes the report and model into folders of TMDL/JSON files that Git can diff. .pbix is binary and unsuitable for collaborative version control.',
    whyWrong: {
      0: '.pbix is binary, no Git diff.',
      1: '.pbit is a template — no model state, not a collaboration format.',
      3: '.bim alone is just the model definition; pbip wraps both model and report properly.'
    },
    source: SRC.pbip,
    tags: ['pbip', 'version-control']
  }),
  single({
    id: 'pbip-002', domain: 'maintain', subtopic: 'pbip', difficulty: 3,
    prompt: 'You enable .pbip mode and commit a Sales report to Git. Which subdirectory holds the semantic model definition in TMDL format?',
    options: [
      '<Project>.SemanticModel/definition/',
      '<Project>.Report/visuals/',
      '<Project>/.git/',
      '<Project>.Pipeline/stages/'
    ],
    correct: 0,
    explanation: 'A .pbip project produces two folders: <Project>.SemanticModel (TMDL files defining tables, measures, relationships, RLS) and <Project>.Report (the report visuals).',
    whyWrong: {
      1: 'That is the report folder, not the model folder.',
      2: '.git/ is your Git internal state, unrelated to the model.',
      3: 'There is no Pipeline folder in pbip.'
    },
    source: SRC.pbip,
    tags: ['pbip', 'tmdl']
  }),
  // ── Governance / monitoring ──────────────────────────────────
  single({
    id: 'gov-001', domain: 'maintain', subtopic: 'governance', difficulty: 3,
    prompt: 'Which Fabric admin surface tracks who accessed which content, when, with audit-grade detail across the tenant?',
    options: ['Capacity metrics app', 'Microsoft Purview audit log (M365 Unified Audit Log)', 'Workspace usage page', 'Fabric monitoring hub'],
    correct: 1,
    explanation: 'Tenant-level audit trail (who accessed what, when, where) lives in the M365 / Purview Unified Audit Log. Fabric publishes events into it.',
    whyWrong: {
      0: 'Capacity metrics app shows compute usage, not user activity.',
      2: 'Workspace usage shows view counts, not audit-grade events.',
      3: 'Monitoring hub watches your jobs/pipelines, not audit access.'
    },
    source: SRC.governance,
    tags: ['governance', 'audit']
  }),
  single({
    id: 'gov-002', domain: 'maintain', subtopic: 'governance', difficulty: 3,
    prompt: 'A capacity is throttling reports. Which app helps diagnose which items are consuming the capacity?',
    options: ['Fabric Capacity Metrics app', 'Power Automate', 'OneLake explorer', 'Microsoft Purview'],
    correct: 0,
    explanation: 'The Fabric Capacity Metrics app (formerly the Premium Capacity Metrics app) breaks down CU consumption by workspace, item, and timeframe — the standard tool for throttling investigations.',
    whyWrong: {
      1: 'Power Automate is workflow automation, not capacity diagnostics.',
      2: 'OneLake explorer is a data browser.',
      3: 'Purview handles classification/audit, not capacity metrics.'
    },
    source: SRC.governance,
    tags: ['governance', 'capacity', 'throttling']
  }),
  order({
    id: 'dp-007', domain: 'maintain', subtopic: 'deployment-pipelines', difficulty: 3,
    prompt: 'Place these deployment pipeline operations in the order a typical team would perform them when promoting a new feature.',
    options: [
      'Authoring complete in Development',
      'Compare Dev vs Test in the pipeline UI',
      'Configure deployment rules on Test (e.g., test SQL DB)',
      'Deploy Dev → Test',
      'Validate in Test, then Compare Test vs Prod and Deploy Test → Prod'
    ],
    explanation: 'Author → compare → configure rules → deploy to test → validate → deploy to prod. Configuring rules before deploy ensures the artifact arrives correctly bound to its environment.',
    source: SRC.deployment,
    tags: ['deployment-pipelines', 'workflow']
  })
];
