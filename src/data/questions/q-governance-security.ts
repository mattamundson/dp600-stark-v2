// Sprint 2 — Governance and Security mode (30 questions).
//
// Tagged heavily domain:'maintain' to close the remaining 1.5pp Maintain
// blueprint gap. Splits:
//   workspace roles + permissions   8 Q  (maintain)
//   RLS in semantic models          8 Q  (semantic)
//   OLS                             4 Q  (semantic)
//   sensitivity labels + Purview    5 Q  (maintain)
//   least-privilege + governance    5 Q  (maintain)
//
// IDs gs-001..gs-030.
// Source: learn.microsoft.com/en-us/fabric/security/* (last refreshed
// 2026-04 by user). RLS code patterns reviewed against current
// Microsoft samples for USERPRINCIPALNAME, PATHCONTAINS, role design.

import type { Question } from '../../lib/schema';
import { single, multi, SRC } from './_helpers';

export const governanceSecurity: Question[] = [
  // ── Workspace roles + permissions (8 Q) ──────────────────────
  single({
    id: 'gs-001', domain: 'maintain', subtopic: 'workspace-roles', difficulty: 2,
    prompt: 'Which workspace role is the MINIMUM that can promote items between deployment-pipeline stages?',
    options: ['Viewer', 'Contributor', 'Member', 'Admin'],
    correct: 2,
    explanation: 'Member is the minimum workspace role that can deploy. Contributor can edit content but cannot promote across stages. Viewer is read-only. Admin has the same deploy capability as Member plus role management.',
    whyWrong: {
      0: 'Viewer is read-only; cannot edit or deploy.',
      1: 'Contributor edits within a workspace but cannot deploy across stages.',
      3: 'Admin works but is more privilege than required — the question asks for the minimum.'
    },
    source: SRC.workspace,
    tags: ['workspace-roles', 'deployment', 'least-privilege'],
    relatedIds: ['gs-002', 'dpd-004']
  }),

  multi({
    id: 'gs-002', domain: 'maintain', subtopic: 'workspace-roles', difficulty: 3,
    prompt: 'Which statements about Fabric workspace roles are TRUE? Select all that apply.',
    options: [
      'A user with Member role on Source AND Contributor on Target can deploy from Source to Target',
      'Viewer can use the Warehouse SQL endpoint read-only',
      'Contributor can add or remove other Contributors and Viewers',
      'Workspace roles cascade to OneLake folder permissions automatically',
      'Admin can change the workspace identity (the workspace identity is workspace-bound, not role-bound)'
    ],
    correct: [0, 1],
    explanation: 'A is the documented minimum permission combination for deployment-pipeline promotion. B is correct — Viewers can run T-SQL SELECTs via the SQL endpoint. C is wrong (Member-or-Admin is required to manage roles). D is wrong (OneLake permissions are explicit, not cascaded). E is wrong (workspace identity is admin-managed).',
    whyWrong: {
      2: 'Adding/removing roles requires Member or Admin, not Contributor.',
      3: 'OneLake folder permissions are managed independently from workspace roles. Granting Member does NOT auto-grant OneLake folder access.',
      4: 'Workspace identity is configured by Admins and is workspace-scoped — the role does not "own" the identity.'
    },
    source: SRC.workspace,
    tags: ['workspace-roles', 'deployment', 'onelake', 'permissions'],
    relatedIds: ['gs-001']
  }),

  single({
    id: 'gs-003', domain: 'maintain', subtopic: 'permissions', difficulty: 3,
    prompt: 'A user has Contributor on a Lakehouse workspace but cannot read a Delta table via the Spark notebook. The Lakehouse Files folder shows their access denied. What is the MOST likely cause?',
    options: [
      'Contributor role does not include OneLake file access',
      'The Lakehouse table needs to be promoted before it is readable',
      'The user must accept the workspace invite first',
      'Contributor includes OneLake access — there must be a folder-level OneLake ACL denying them'
    ],
    correct: 3,
    explanation: 'Contributor DOES grant baseline OneLake read access to the workspace. If a specific folder shows access denied, an explicit OneLake ACL has been applied that denies the user. OneLake permissions are independent of workspace roles and can be set per-folder.',
    whyWrong: {
      0: 'Contributor includes OneLake read access by default.',
      1: 'There is no "promote table" step that gates readability.',
      2: 'Workspace invite acceptance is implicit when the role is assigned in modern Fabric tenants.'
    },
    source: SRC.workspace,
    tags: ['workspace-roles', 'onelake', 'acl', 'permissions', 'troubleshooting'],
    relatedIds: ['gs-002']
  }),

  multi({
    id: 'gs-004', domain: 'maintain', subtopic: 'permissions', difficulty: 4,
    prompt: 'A semantic model in Workspace A is consumed by a Power BI report in Workspace B. The report owner is a Member of B but has NO role on A. What permissions are required for the report to render correctly? Select all that apply.',
    options: [
      'Build permission on the semantic model in Workspace A',
      'Read permission on the semantic model in Workspace A',
      'Member of Workspace A',
      'The semantic-model owner shares the model with the report owner',
      'No additional permission — Workspace B membership is sufficient'
    ],
    correct: [0, 3],
    explanation: 'Cross-workspace consumption requires Build permission on the semantic model (A). Sharing from the model owner is the canonical mechanism (D). Read alone is not enough — Build is required to bind a new report to the model. Workspace A membership is more than required and is the wrong granularity for this use case.',
    whyWrong: {
      1: 'Read alone does not allow binding new reports. Build is the relevant permission.',
      2: 'Granting workspace membership is over-privileged — the user only needs the model.',
      4: 'Workspace B membership grants no rights on Workspace A items.'
    },
    source: SRC.workspace,
    tags: ['permissions', 'semantic-model', 'cross-workspace', 'build-permission', 'least-privilege'],
    relatedIds: ['gs-003']
  }),

  single({
    id: 'gs-005', domain: 'maintain', subtopic: 'workspace-roles', difficulty: 3,
    prompt: 'A Power BI app published from Workspace A is consumed by a user. The user has NO role on Workspace A. Why does the app still work?',
    options: [
      'App publishing implicitly grants Viewer role on the source workspace',
      'Apps have their own audience-based permission model — the app audience grants access to the published items, not the workspace',
      'The user must have Viewer — the question premise is wrong',
      'Apps cannot be published from a workspace that has no Viewers'
    ],
    correct: 1,
    explanation: 'Apps use an audience-based permission model. When a user is in an audience, they get access to the published items in that app — without needing any workspace role. This separation is intentional: app consumers should not see the underlying workspace.',
    whyWrong: {
      0: 'There is no implicit workspace role grant. Apps gate access at the app layer.',
      2: 'The premise IS correct — app consumers can lack workspace roles entirely.',
      3: 'Apps publish with audiences regardless of who has Viewer; nothing in publish requires a Viewer.'
    },
    source: SRC.workspace,
    tags: ['workspace-roles', 'apps', 'audience', 'permissions'],
    relatedIds: ['gs-004']
  }),

  multi({
    id: 'gs-006', domain: 'maintain', subtopic: 'permissions', difficulty: 3,
    prompt: 'Which actions require Admin (not Member) on a Fabric workspace? Select all that apply.',
    options: [
      'Add or remove Admins',
      'Change the workspace name',
      'Configure workspace settings (Git integration, identity, deployment pipelines)',
      'Publish or delete content',
      'Configure workspace storage limits + capacity assignment'
    ],
    correct: [0, 4],
    explanation: 'Admin-only: managing other Admins (1) and capacity assignment (5). Members can change workspace name (2), configure most settings (3 — Git integration is Member+, deployment pipeline assignment is Admin+), and publish/delete content (4).',
    whyWrong: {
      1: 'Workspace rename is Member-or-Admin.',
      2: 'Most workspace settings are Member-or-Admin. Deployment-pipeline assignment is the exception (Admin).',
      3: 'Members can publish and delete content within the workspace.'
    },
    source: SRC.workspace,
    tags: ['workspace-roles', 'admin', 'permissions', 'capacity'],
    relatedIds: ['gs-001']
  }),

  single({
    id: 'gs-007', domain: 'maintain', subtopic: 'permissions', difficulty: 4,
    prompt: 'A Lakehouse SQL endpoint is read-only. A team wants the warehouse-style write surface (CREATE TABLE, MERGE INTO). What is the correct response?',
    options: [
      'Grant the team the Admin role — it unlocks write to SQL endpoints',
      'Lakehouse SQL endpoints are inherently read-only by design — for write T-SQL, use a Warehouse item instead',
      'Re-create the Lakehouse with "writeable" enabled in advanced settings',
      'Submit a Microsoft support ticket to enable write'
    ],
    correct: 1,
    explanation: 'Lakehouse SQL endpoint is read-only by design — writes must go through Spark notebooks, Dataflow Gen2, or pipelines. For T-SQL write semantics (CREATE TABLE, MERGE INTO), use a Warehouse item, which IS read-write via T-SQL.',
    whyWrong: {
      0: 'No role unlocks write to a Lakehouse SQL endpoint — it is product behavior, not permission.',
      2: 'There is no "writeable" toggle.',
      3: 'Support cannot enable a feature that does not exist.'
    },
    source: SRC.fabricArch,
    tags: ['permissions', 'lakehouse', 'warehouse', 'sql-endpoint', 'product-design'],
    relatedIds: ['gs-003']
  }),

  multi({
    id: 'gs-008', domain: 'maintain', subtopic: 'permissions', difficulty: 4,
    prompt: 'When granting access to a Direct Lake semantic model + the underlying Lakehouse, which permission combinations are LEAST-PRIVILEGE for a report consumer? Select all that apply.',
    options: [
      'Build on the semantic model + nothing on the Lakehouse',
      'Build on the semantic model + Read on the Lakehouse',
      'Member on the workspace containing both items',
      'OneLake folder Read on the Lakehouse Files + Build on the semantic model',
      'Admin on the workspace'
    ],
    correct: [0, 1],
    explanation: 'Direct Lake on OneLake DOES require the user to have OneLake file access in some configurations (B); Direct Lake on SQL only needs the model access (A). Both are least-privilege depending on storage variant. Workspace Member/Admin is over-privileged for a consumer.',
    whyWrong: {
      2: 'Workspace Member grants edit rights on every item — far more than a consumer needs.',
      3: 'Direct Lake on OneLake bypasses SQL RLS but still uses OneLake permissions; if the storage variant is Direct Lake on SQL, file-level Read on Lakehouse Files is irrelevant.',
      4: 'Admin is the most over-privileged option for a consumer.'
    },
    source: SRC.workspace,
    tags: ['permissions', 'direct-lake', 'least-privilege', 'lakehouse', 'onelake'],
    relatedIds: ['gs-004', 'dlm2-005']
  }),

  // ── Row-Level Security (8 Q) ─────────────────────────────────
  single({
    id: 'gs-009', domain: 'semantic', subtopic: 'security-rls', difficulty: 2,
    prompt: 'In a semantic model RLS role, which DAX expression filters rows where the [SalesRegion] column equals "Midwest"?',
    options: [
      '[SalesRegion] = "Midwest"',
      'FILTER(Sales, [SalesRegion] = "Midwest")',
      'CALCULATE([SalesRegion], "Midwest")',
      'USERPRINCIPALNAME() = "Midwest"'
    ],
    correct: 0,
    explanation: 'Role filter expressions are written as boolean predicates: `[Column] = value`. The model engine wraps the predicate in CALCULATETABLE under the hood. FILTER/CALCULATE are wrong shapes for role definitions; USERPRINCIPALNAME() compares to a user identity, not a static literal.',
    whyWrong: {
      1: 'FILTER returns a table — role expressions return boolean rows.',
      2: 'CALCULATE returns scalars; not the right shape for a row predicate.',
      3: 'USERPRINCIPALNAME() returns the calling user — comparing it to "Midwest" is a string-comparison error.'
    },
    source: SRC.rls,
    tags: ['rls', 'static-filter', 'dax-syntax']
  }),

  single({
    id: 'gs-010', domain: 'semantic', subtopic: 'security-rls', difficulty: 3,
    prompt: 'Which DAX expression dynamically filters rows so a user only sees rows where their email matches the [UserEmail] column?',
    options: [
      '[UserEmail] = USERPRINCIPALNAME()',
      'CONTAINS(Users, [UserEmail], USERPRINCIPALNAME())',
      'PATHCONTAINS([UserEmail], USERPRINCIPALNAME())',
      'LOOKUPVALUE(Users[UserEmail], Users[UPN], USERPRINCIPALNAME())'
    ],
    correct: 0,
    explanation: 'Direct equality: `[UserEmail] = USERPRINCIPALNAME()`. USERPRINCIPALNAME() returns the calling user\'s UPN string. Equality is the simplest and most common dynamic RLS pattern.',
    whyWrong: {
      1: 'CONTAINS works but is more complex than needed for a single-column equality test.',
      2: 'PATHCONTAINS is for hierarchy-path filters — a different pattern.',
      3: 'LOOKUPVALUE returns a scalar; the role expression needs a row predicate.'
    },
    source: SRC.rls,
    tags: ['rls', 'dynamic', 'userprincipalname', 'dax-pattern'],
    relatedIds: ['gs-011', 'gs-012']
  }),

  single({
    id: 'gs-011', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'A Sales Manager should see all rows where they are listed ANYWHERE in the manager hierarchy of the row\'s salesperson. The Salesperson dimension has a column [ManagerEmailPath] containing a delimited path like `vp@x.com|director@x.com|manager@x.com`. Which RLS expression is correct?',
    options: [
      '[ManagerEmailPath] = USERPRINCIPALNAME()',
      'PATHCONTAINS([ManagerEmailPath], USERPRINCIPALNAME())',
      'CONTAINS([ManagerEmailPath], USERPRINCIPALNAME())',
      'SEARCH(USERPRINCIPALNAME(), [ManagerEmailPath]) > 0'
    ],
    correct: 1,
    explanation: 'PATHCONTAINS is purpose-built for parent-child path tests. It returns TRUE when the second argument exists anywhere in the delimited path. PATHCONTAINS handles the path semantics (delimiter-aware, exact-match) correctly, where SEARCH/CONTAINS would do substring matching and trip on `manager@x.com` vs `senior-manager@x.com`.',
    whyWrong: {
      0: 'Equality only matches when the user is the IMMEDIATE manager — fails the "anywhere in hierarchy" requirement.',
      2: 'CONTAINS is for table membership testing, not path delimiter parsing.',
      3: 'SEARCH does substring matching and would false-match `manager@x.com` against `senior-manager@x.com`.'
    },
    source: SRC.rls,
    tags: ['rls', 'dynamic', 'hierarchy', 'pathcontains', 'exam-trap'],
    relatedIds: ['gs-010']
  }),

  multi({
    id: 'gs-012', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'A semantic model uses Direct Lake over a Warehouse. Warehouse-level RLS predicates are also defined. Which behaviors are TRUE? Select all that apply.',
    options: [
      'Direct Lake on Warehouse falls back to DirectQuery to honor Warehouse RLS predicates',
      'Semantic-model RLS roles AND Warehouse RLS predicates BOTH apply when a user with both is connected (filters AND together — most restrictive wins)',
      'Defining RLS in the warehouse means semantic-model RLS roles are unnecessary',
      'Warehouse RLS predicates are evaluated at row materialization time on the SQL side'
    ],
    correct: [0, 1, 3],
    explanation: 'Direct Lake on Warehouse defers to DirectQuery to enforce Warehouse RLS — this is documented Fabric behavior (it cannot apply SQL predicates while in column-segment mode). When BOTH layers define RLS, both apply — filters AND, most restrictive wins. Defining only Warehouse RLS does NOT eliminate the need for semantic-model RLS — the semantic-model layer still benefits from purpose-built model-level rules.',
    whyWrong: {
      2: 'Warehouse RLS does not eliminate model RLS. They serve different layers and can be combined for defense-in-depth.'
    },
    source: SRC.rls,
    tags: ['rls', 'direct-lake', 'warehouse-rls', 'fallback', 'defense-in-depth', 'exam-trap'],
    relatedIds: ['gs-011', 'dlm2-003']
  }),

  single({
    id: 'gs-013', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'A test user is in roles "ManagerView" AND "RegionView". ManagerView restricts to rows where the user manages the salesperson; RegionView restricts to [Region] = "West". The user manages people in EAST and WEST. What does the user see?',
    options: [
      'Only their managed people in WEST (intersection of both filters)',
      'All managed people across all regions (ManagerView wins because it is listed first)',
      'All managed people across ALL regions (UNION of role filters)',
      'No rows (intersection of incompatible filters)'
    ],
    correct: 2,
    explanation: 'When a user is in MULTIPLE RLS roles, filters are UNIONed (OR), not intersected. Each role contributes rows; the user sees the union. So they see all rows from ManagerView (their managed people in any region) PLUS all rows from RegionView (anyone in WEST). This is the classic exam trap.',
    whyWrong: {
      0: 'Intersection is the wrong combination operator for multi-role users.',
      1: 'Role order does not matter — all role filters apply via UNION.',
      3: 'UNION cannot produce zero rows when each role independently produces rows.'
    },
    source: SRC.rls,
    tags: ['rls', 'multi-role', 'union', 'exam-trap', 'dynamic-roles'],
    relatedIds: ['gs-014']
  }),

  multi({
    id: 'gs-014', domain: 'semantic', subtopic: 'security-rls', difficulty: 5,
    prompt: 'When testing an RLS role with the model owner as the test identity, the role appears to filter correctly. After deployment, end users complain that the filter is not applied. What are the LIKELY explanations? Select all that apply.',
    options: [
      'The model owner has implicit "no RLS applied" access (Admin/Owner identities bypass RLS by default in test mode)',
      'The "View as Role" feature does not preview cross-workspace shared model behavior accurately',
      'End users were not added to the role — group membership did not propagate',
      'RLS roles only apply to dataset queries from Power BI Service, not to direct XMLA connections — power users may be using a tool that bypasses',
      'The role expression has a syntax error that silently passes "View as Role" but fails at runtime'
    ],
    correct: [0, 2, 3],
    explanation: 'Three real causes: (A) owner-identity bypass is intentional for testing convenience, (C) group propagation lag or wrong group is the most common operational cause, (D) XMLA endpoint connections from Excel/Tabular Editor often bypass RLS unless explicitly configured. (B) is wrong — View as Role does preview cross-workspace correctly. (E) is wrong — syntax errors fail loudly in test mode AND production.',
    whyWrong: {
      1: 'View as Role preview does cover cross-workspace shared models.',
      4: 'RLS syntax errors fail at parse time in both modes — they do not pass test silently.'
    },
    source: SRC.rls,
    tags: ['rls', 'testing', 'troubleshooting', 'xmla-bypass', 'group-propagation'],
    relatedIds: ['gs-013']
  }),

  single({
    id: 'gs-015', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'A Direct Lake on OneLake semantic model has no RLS roles defined. The underlying Delta tables have file-level OneLake ACLs restricting some users from reading certain folders. What happens when a restricted user queries the model?',
    options: [
      'The query fails with "access denied"',
      'The query succeeds but returns only the rows from folders the user can read',
      'The query succeeds and returns ALL rows — Direct Lake on OneLake bypasses OneLake ACLs at query time',
      'The query falls back to DirectQuery and applies the ACLs there'
    ],
    correct: 0,
    explanation: 'Direct Lake on OneLake reads Delta files directly. If the user lacks OneLake file access, the read fails — there is no "partial result" path. To enforce row-level filtering on Direct Lake on OneLake, define semantic-model RLS roles. File-level ACLs are coarse-grained and produce errors, not filtered results.',
    whyWrong: {
      1: 'Direct Lake does not have a partial-folder-read mode.',
      2: 'Direct Lake on OneLake does NOT bypass OneLake ACLs — it requires file access to read at all.',
      3: 'Direct Lake on OneLake does not fall back. (Direct Lake on SQL would, but the question is about OneLake.)'
    },
    source: SRC.rls,
    tags: ['rls', 'direct-lake', 'onelake', 'acl', 'exam-trap'],
    relatedIds: ['gs-012', 'dlm2-005']
  }),

  multi({
    id: 'gs-016', domain: 'semantic', subtopic: 'security-rls', difficulty: 4,
    prompt: 'For a static-filter RLS role like `[Region] = "West"`, which performance considerations are accurate? Select all that apply.',
    options: [
      'Static filters compile to a single CALCULATETABLE — minimal per-query cost',
      'Static filters are cached per role, so first-query-after-role-change is slower',
      'Dynamic filters using USERPRINCIPALNAME() can NOT be cached as aggressively because the predicate value varies per user',
      'Static filters cause Direct Lake to fall back to DirectQuery',
      'Static filters can be moved into the underlying Delta table as a partition — sometimes faster than RLS'
    ],
    correct: [0, 2, 4],
    explanation: 'Static filters compile cheaply (1) and dynamic filters with per-user values cannot be cross-user cached (3). Moving the filter into Delta partitioning (5) can outperform RLS for very heavy partition predicates. (2) is incorrect — there is no role-level cache invalidation behavior. (4) is incorrect — static filters do NOT trigger Direct Lake fallback (warehouse RLS does, not model RLS).',
    whyWrong: {
      1: 'There is no documented role-level cache that invalidates on role change. The query plan is per-query.',
      3: 'Model RLS does not cause Direct Lake fallback. Warehouse RLS does (option E in gs-012).'
    },
    source: SRC.rls,
    tags: ['rls', 'performance', 'caching', 'partitioning', 'direct-lake'],
    relatedIds: ['gs-012']
  }),

  // ── Object-Level Security (4 Q) ──────────────────────────────
  single({
    id: 'gs-017', domain: 'semantic', subtopic: 'security-ols', difficulty: 3,
    prompt: 'What is the difference between RLS and OLS in a semantic model?',
    options: [
      'RLS hides rows; OLS hides tables/columns from members of a role',
      'RLS hides columns; OLS hides rows',
      'They are aliases for the same feature',
      'RLS is for the SQL layer; OLS is for the DAX layer'
    ],
    correct: 0,
    explanation: 'RLS = row-level security — filters rows from a table. OLS = object-level security — hides entire tables or columns from a role member, as if they did not exist. OLS members cannot see the column in field lists, formula bars, or report visuals.',
    whyWrong: {
      1: 'Reversed — RLS is row-filter, OLS is object-hide.',
      2: 'They are distinct features, not aliases.',
      3: 'Both apply at the model layer, not split by SQL/DAX.'
    },
    source: SRC.ols,
    tags: ['ols', 'rls', 'foundation'],
    relatedIds: ['gs-018']
  }),

  multi({
    id: 'gs-018', domain: 'semantic', subtopic: 'security-ols', difficulty: 4,
    prompt: 'OLS is configured to hide the [Salary] column from members of a role. Which downstream behaviors result? Select all that apply.',
    options: [
      'Reports referencing [Salary] error out for restricted users',
      'Visuals using [Salary] are hidden from the field list for restricted users',
      'DAX measures referencing [Salary] error for restricted users — those measures must be authored to gracefully handle absence',
      'Restricted users can still write a calculated column referencing [Salary] in Desktop "for personal use"',
      'OLS automatically hides every measure that references [Salary]'
    ],
    correct: [0, 1, 2],
    explanation: 'Reports break (1), the field is hidden from field lists (2), and DAX measures referencing [Salary] error for OLS-restricted users (3). Restricted users CANNOT write new expressions referencing the hidden column (4 wrong). Measures referencing [Salary] are NOT auto-hidden (5 wrong) — the measure name is visible but evaluating it errors.',
    whyWrong: {
      3: 'OLS hides the column; the user cannot create new references to it in any tool.',
      4: 'Measures referencing the hidden column remain visible by name — only their evaluation fails.'
    },
    source: SRC.ols,
    tags: ['ols', 'measures', 'reports', 'error-behavior'],
    relatedIds: ['gs-017']
  }),

  single({
    id: 'gs-019', domain: 'semantic', subtopic: 'security-ols', difficulty: 4,
    prompt: 'A regulated workload requires that users in role "ContractorView" do not see the [PII_FullName] column AND do not see any rows for confidential customers. Which combination achieves this?',
    options: [
      'OLS hide [PII_FullName] from ContractorView + RLS row filter `[Confidential] = FALSE` on the customer table',
      'RLS row filter `[Confidential] = FALSE AND [PII_FullName] = ""` (one filter, two predicates)',
      'OLS alone — restrict the column AND the row from the same role',
      'RLS alone — hide the column by setting it to NULL in the role expression'
    ],
    correct: 0,
    explanation: 'Combine OLS (column-level hiding) with RLS (row-level filtering) — the right tool for each layer. Trying to combine row+column predicates in one RLS expression (B) does not actually hide the column from field lists. OLS cannot filter rows (C). RLS cannot hide columns from field lists (D).',
    whyWrong: {
      1: 'Column-level visibility cannot be controlled via RLS predicates.',
      2: 'OLS alone hides columns but does not filter rows.',
      3: 'RLS alone filters rows but does not hide columns from field lists.'
    },
    source: SRC.ols,
    tags: ['ols', 'rls', 'defense-in-depth', 'pii', 'regulated-workload'],
    relatedIds: ['gs-018']
  }),

  multi({
    id: 'gs-020', domain: 'semantic', subtopic: 'security-ols', difficulty: 4,
    prompt: 'Which limitations of OLS in Power BI / Fabric semantic models are TRUE today? Select all that apply.',
    options: [
      'OLS cannot hide a measure (measure-level OLS does not exist)',
      'OLS cannot be applied to calculated columns separately — they inherit base-table OLS',
      'OLS in Power BI Desktop authoring requires Tabular Editor or scripting to define',
      'OLS hides hidden columns from XMLA-endpoint queries the same way it does from Power BI visuals',
      'OLS roles automatically grant DENY at the SQL endpoint'
    ],
    correct: [0, 2, 3],
    explanation: 'Today OLS cannot hide measures (1), authoring OLS requires external tools like Tabular Editor (3 — Power BI Desktop has no native OLS UI), and OLS rules apply to XMLA queries too (4). (B) is wrong — calc-column OLS is not auto-inherited; it must be configured. (E) is wrong — OLS does not propagate to the SQL endpoint, which is its own permission surface.',
    whyWrong: {
      1: 'Calculated columns must be explicitly OLS-configured, not inherited.',
      4: 'OLS at the model layer does NOT auto-deny at the SQL endpoint. The SQL endpoint applies its own permissions.'
    },
    source: SRC.ols,
    tags: ['ols', 'limitations', 'tabular-editor', 'xmla', 'sql-endpoint'],
    relatedIds: ['gs-018']
  }),

  // ── Sensitivity labels + Purview (5 Q) ────────────────────────
  single({
    id: 'gs-021', domain: 'maintain', subtopic: 'sensitivity-labels', difficulty: 3,
    prompt: 'A Power BI report is labeled "Confidential" via Microsoft Purview. A user exports the underlying data to Excel. What happens to the label?',
    options: [
      'The Excel file inherits the "Confidential" sensitivity label automatically',
      'The label is dropped on export — files outside Power BI are not labeled',
      'Export is blocked by default for any labeled content',
      'The Excel file is encrypted and cannot be opened outside the tenant'
    ],
    correct: 0,
    explanation: 'Sensitivity labels propagate downstream. Exports to Excel/PowerPoint/PDF inherit the label (and its protections, like encryption) — this is the headline value of Purview labels in Fabric. The label travels with the data, not just the report.',
    whyWrong: {
      1: 'Labels DO propagate. This is the key feature.',
      2: 'Export is not blocked by default — protection settings of the label may add restrictions, but the default behavior is propagate, not block.',
      3: 'Encryption depends on the LABEL configuration, not on labeling per se.'
    },
    source: SRC.sensitivity,
    tags: ['sensitivity-labels', 'purview', 'export', 'inheritance'],
    relatedIds: ['gs-022']
  }),

  multi({
    id: 'gs-022', domain: 'maintain', subtopic: 'sensitivity-labels', difficulty: 4,
    prompt: 'Which Fabric items can be labeled with Microsoft Purview sensitivity labels? Select all that apply.',
    options: [
      'Lakehouses',
      'Semantic models',
      'Power BI reports + dashboards',
      'Pipelines',
      'Workspaces (label inherited by items)'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Labels apply to Lakehouses, semantic models, reports/dashboards, and workspaces. Pipelines (4) are NOT directly labelable today — they are operational items, not data items. Workspace-level labels propagate to items as a default.',
    whyWrong: {
      3: 'Pipelines are not first-class label targets in current Fabric.'
    },
    source: SRC.sensitivity,
    tags: ['sensitivity-labels', 'purview', 'fabric-items', 'inheritance']
  }),

  single({
    id: 'gs-023', domain: 'maintain', subtopic: 'sensitivity-labels', difficulty: 4,
    prompt: 'A label "Highly Confidential — Finance" is applied to a semantic model in Workspace A. A report in Workspace B consumes the model. What label does the report carry?',
    options: [
      'No label — labels do not cross workspace boundaries',
      'The same label, automatically — labels propagate from upstream content',
      'A weaker derived label, automatically',
      'Whatever label the report owner chooses to apply'
    ],
    correct: 1,
    explanation: 'Labels propagate from upstream content to downstream items. A report consuming a Confidential model inherits the Confidential label automatically. This is the propagation chain that makes Purview labels useful in Fabric.',
    whyWrong: {
      0: 'Labels propagate across workspaces.',
      2: 'No "weaker derived" rule — same label propagates.',
      3: 'Owner choice does not override upstream propagation.'
    },
    source: SRC.sensitivity,
    tags: ['sensitivity-labels', 'propagation', 'cross-workspace'],
    relatedIds: ['gs-021']
  }),

  multi({
    id: 'gs-024', domain: 'maintain', subtopic: 'sensitivity-labels', difficulty: 4,
    prompt: 'Which Purview label protections automatically apply across Fabric items when a "Confidential" label has encryption + watermark configured? Select all that apply.',
    options: [
      'Exports inherit encryption (Excel/PDF cannot be opened outside the tenant)',
      'Visuals show a watermark with the user identity',
      'Sharing is restricted to the configured allow-list of recipients',
      'The underlying OneLake files are encrypted at rest beyond default OneLake encryption',
      'XMLA endpoint queries are blocked'
    ],
    correct: [0, 1, 2],
    explanation: 'Encryption (1), watermark (2), and sharing restrictions (3) are the canonical label-driven protections that propagate through Fabric. (4) is wrong — OneLake files are always encrypted at rest with default tenant keys; labels do not change that. (5) is wrong — XMLA queries respect the model permissions, not the sensitivity label.',
    whyWrong: {
      3: 'OneLake at-rest encryption is independent of sensitivity labels — it always applies with tenant-managed keys.',
      4: 'XMLA respects model permissions; sensitivity labels do not block XMLA per se.'
    },
    source: SRC.sensitivity,
    tags: ['sensitivity-labels', 'protections', 'encryption', 'watermark', 'sharing']
  }),

  single({
    id: 'gs-025', domain: 'maintain', subtopic: 'sensitivity-labels', difficulty: 3,
    prompt: 'Who can change a sensitivity label on a labeled Fabric item?',
    options: [
      'Any user with Member role on the workspace',
      'Only users granted the "label change" capability via Purview policy + with appropriate workspace role',
      'Only the original label applier',
      'Only tenant admins'
    ],
    correct: 1,
    explanation: 'Label change is governed by Purview policy. Users need the "change label" capability AND a workspace role that allows item edits. Pure workspace Member is not enough alone, and one-level-down restrictions ("can downgrade only") can be configured in Purview.',
    whyWrong: {
      0: 'Member alone is insufficient — Purview policy gates the action.',
      2: 'There is no "original applier" lock.',
      3: 'Tenant admins can manage policies but the label-change capability is delegable.'
    },
    source: SRC.sensitivity,
    tags: ['sensitivity-labels', 'governance', 'policy', 'permissions'],
    relatedIds: ['gs-023']
  }),

  // ── Least-privilege design + governance traps (5 Q) ──────────
  single({
    id: 'gs-026', domain: 'maintain', subtopic: 'security-governance', difficulty: 3,
    prompt: 'When designing access for a 100-person analytics team across 8 workspaces, which approach SCALES BEST?',
    options: [
      'Add each user individually to each workspace with the appropriate role',
      'Use Entra ID security groups (one per role × workspace) and add users to the groups; assign groups to workspace roles',
      'Make everyone a workspace Admin and rely on tribal knowledge to prevent abuse',
      'Use a custom Azure RBAC role hierarchy outside Fabric'
    ],
    correct: 1,
    explanation: 'Group-based access is the documented best practice — joiners/leavers/role-changes are managed by group membership, not by touching every workspace. Group-to-role assignments are the unit that scales.',
    whyWrong: {
      0: 'Direct user assignment is the operational nightmare best practice was invented to avoid.',
      2: 'Admin-everyone violates least-privilege catastrophically.',
      3: 'Azure RBAC outside Fabric does not control workspace roles.'
    },
    source: SRC.governance,
    tags: ['governance', 'entra-id', 'groups', 'least-privilege', 'scale']
  }),

  multi({
    id: 'gs-027', domain: 'maintain', subtopic: 'security-governance', difficulty: 4,
    prompt: 'Which actions are documented Fabric tenant-admin governance levers? Select all that apply.',
    options: [
      'Restrict who can create workspaces',
      'Restrict which workspaces can be assigned to a specific capacity',
      'Restrict the export-to-Excel feature for all reports tenant-wide',
      'Force every Direct Lake table to disable fallback',
      'Restrict who can publish apps tenant-wide'
    ],
    correct: [0, 1, 2, 4],
    explanation: 'Workspace creation (1), capacity assignment (2), export controls (3), and app publishing (5) are all tenant-level admin levers. (4) is wrong — Direct Lake fallback is configured per-table, not as a tenant-level setting.',
    whyWrong: {
      3: 'Direct Lake fallback (DirectLakeOnly etc.) is per-table model configuration, not a tenant lever.'
    },
    source: SRC.governance,
    tags: ['governance', 'tenant-admin', 'levers', 'export', 'capacity']
  }),

  single({
    id: 'gs-028', domain: 'maintain', subtopic: 'security-governance', difficulty: 4,
    prompt: 'A workspace contains a Lakehouse with ~3 GB of personal data and a semantic model serving a regulated workload. The team wants tenant-wide auditability of every read of the personal data. Which combination is MOST aligned with the "audit everything" goal?',
    options: [
      'Enable Purview audit + use Microsoft Purview Activity Explorer + workspace-level "log all reads" setting',
      'Rely on workspace activity log only',
      'Enable IP audit logging on the Azure subscription',
      'Train users to self-report when they query the personal data'
    ],
    correct: 0,
    explanation: 'Purview Activity Explorer is the cross-tenant audit surface for read events. Workspace activity log alone (B) misses cross-workspace flows. IP audit (C) sees network metadata, not data-level reads. Self-reporting (D) is not auditing — it is a compliance fig leaf.',
    whyWrong: {
      1: 'Workspace activity log misses cross-workspace data flows.',
      2: 'IP audit does not see SQL/DAX-level reads.',
      3: 'Self-reporting is not an audit mechanism.'
    },
    source: SRC.governance,
    tags: ['governance', 'audit', 'purview', 'activity-explorer', 'compliance']
  }),

  single({
    id: 'gs-029', domain: 'maintain', subtopic: 'security-governance', difficulty: 4,
    prompt: 'A company has 5 BUs each with their own Fabric workspaces and capacities. Cross-BU sharing of select reports is common. Which design BEST balances least-privilege with sharing flexibility?',
    options: [
      'Single shared workspace + everyone has Viewer; report owners share individually',
      'Each BU has its own workspace; cross-BU sharing via Apps and per-model Build permission',
      'One workspace per BU; everyone is Member of every workspace; rely on RLS to prevent abuse',
      'Single workspace + dynamic RLS keyed on department'
    ],
    correct: 1,
    explanation: 'BU isolation + targeted Apps + per-model Build permission is the canonical pattern. It keeps day-to-day work scoped to the BU, exposes shared content via curated Apps, and gives consumers least-privilege Build access to specific models. The other options either violate least-privilege (3) or break the BU autonomy (1, 4).',
    whyWrong: {
      0: 'Single workspace breaks BU autonomy and makes audit ambiguous.',
      2: 'Member-everywhere violates least-privilege.',
      3: 'Single workspace + RLS misses the workspace-isolation benefit.'
    },
    source: SRC.governance,
    tags: ['governance', 'bu-design', 'apps', 'least-privilege', 'sharing']
  }),

  multi({
    id: 'gs-030', domain: 'maintain', subtopic: 'security-governance', difficulty: 5,
    prompt: 'Which combinations are CORRECT mappings of "what the user wants" to "what protects them"? Select all that apply.',
    options: [
      '"Hide certain rows from a user" → semantic-model RLS',
      '"Hide certain columns from a user" → OLS',
      '"Hide certain columns AND certain rows from the same user" → OLS + RLS combined',
      '"Encrypt exports to Excel" → Purview sensitivity label with encryption',
      '"Block all exports from labeled content" → Direct Lake on OneLake'
    ],
    correct: [0, 1, 2, 3],
    explanation: 'A-D are canonical mappings: RLS for rows, OLS for columns, OLS+RLS for both, sensitivity labels for export protection. (E) is wrong — Direct Lake on OneLake has nothing to do with export blocking; that is a Purview label protection setting.',
    whyWrong: {
      4: 'Direct Lake mode is a query-engine concern, not an export-control mechanism. Use sensitivity labels with the right protection settings to control exports.'
    },
    source: SRC.governance,
    tags: ['governance', 'mapping', 'rls', 'ols', 'sensitivity-labels', 'reference-card'],
    relatedIds: ['gs-019']
  })
];
