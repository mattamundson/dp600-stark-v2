// Workspace Governance & Tenant Admin — DP-600 exam bank.
//
// 20 questions, IDs wsg-001..wsg-020, domain:'maintain' (all 20).
// Subtopics: workspace-admin, workspace-roles, tenant-admin,
//   workspace-governance, audit-logs, license-management,
//   sensitivity-labels, workspace-identity
//
// Type mix: 6 multi-select, 1 ordering, 13 single.
// Trap-focus: workspace type distinctions, service-principal identity,
//   role capability matrix, tenant settings + workspace overrides,
//   capacity assignment scope, Fabric Domains, sensitivity label
//   propagation, audit log retention tiers, activity vs audit log,
//   license feature gating, workspace soft-delete recovery, item vs
//   workspace permissions, PPU access toggle, tenant feature switches,
//   PowerShell/REST governance, guest access constraints,
//   Purview integration, usage metrics, information protection scanning.

import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

const SRC_TENANT = { category: 'tenant-admin-portal', note: 'Fabric tenant settings, workspace overrides, capacity assignment' };
const SRC_WSGOV  = { category: 'workspace-governance', note: 'Workspace types, identity, retention, item permissions' };
const SRC_AUDIT  = { category: 'audit-logs', note: 'Activity log vs audit log, M365 UAL, retention tiers' };
const SRC_LIC    = { category: 'license-management', note: 'Free / Pro / PPU / Fabric capacity feature gating' };
const SRC_DOMAIN = { category: 'fabric-domains', note: 'Cross-workspace governance via Fabric Domains' };
const SRC_PURVIEW = { category: 'microsoft-purview', note: 'Purview integration, information protection scanning' };

export const workspaceGovernance: Question[] = [

  // ── Workspace types (Q1) ─────────────────────────────────────────────────

  single({
    id: 'wsg-001',
    domain: 'maintain',
    subtopic: 'workspace-admin',
    difficulty: 2,
    prompt: 'Which statement BEST differentiates "My Workspace" from a standard collaborative Workspace in Microsoft Fabric?',
    options: [
      'My Workspace supports all four roles (Admin / Member / Contributor / Viewer) like any other workspace',
      'My Workspace is a personal sandbox scoped to one user that cannot be shared with others or assigned to a capacity by another admin',
      'My Workspace is the only workspace type that can host a Lakehouse',
      'My Workspace and a standard Workspace are identical except that My Workspace cannot publish Power BI apps'
    ],
    correct: 1,
    explanation: 'My Workspace is a personal sandbox. It is owned by a single user, cannot be assigned roles for other users, and — critically — cannot be assigned to a Premium or Fabric capacity by a tenant admin. It exists outside the normal collaborative governance model.',
    whyWrong: {
      0: 'My Workspace is single-user; the four-role system does not apply because other users cannot be granted roles there.',
      2: 'Any workspace type can host a Lakehouse provided it is associated with an appropriate capacity or a Fabric license.',
      3: 'App publishing is only one restriction; the more fundamental difference is single-user scope and the inability to assign it to a shared capacity via tenant admin.'
    },
    source: SRC_WSGOV,
    tags: ['workspace-types', 'my-workspace', 'personal-sandbox', 'exam-trap']
  }),

  // ── Workspace identity / service principal (Q2) ──────────────────────────

  single({
    id: 'wsg-002',
    domain: 'maintain',
    subtopic: 'workspace-identity',
    difficulty: 3,
    prompt: 'A team wants an Azure Data Factory pipeline to write directly to a Fabric Lakehouse using a service principal without granting the service principal a workspace role. What Fabric feature enables this?',
    options: [
      'Workspace identity — the workspace is assigned a system-managed identity, and the pipeline authenticates as that identity',
      'OneLake ACLs — a folder-level ACL is granted to the service principal for the Lakehouse path',
      'Microsoft Purview — a data policy is created granting the service principal read/write on the Lakehouse',
      'Row-level security — the service principal is added to an RLS role with unrestricted filter'
    ],
    correct: 0,
    explanation: 'Fabric Workspace Identity provisions a system-managed identity for a workspace. External services (Azure Data Factory, Azure Synapse, custom apps) can authenticate as the workspace identity. The workspace identity can then be granted item-level permissions on specific Lakehouse objects without needing a workspace role.',
    whyWrong: {
      1: 'OneLake ACLs control access to files/folders within an existing authorized identity — they do not create an identity for ADF to authenticate as.',
      2: 'Purview data policies can control access to some data sources but are not the Fabric-native mechanism for giving ADF a Lakehouse write identity.',
      3: 'RLS restricts rows for model consumers; it has no relevance to Lakehouse write access or service principal authentication.'
    },
    source: SRC_WSGOV,
    tags: ['workspace-identity', 'service-principal', 'managed-identity', 'lakehouse']
  }),

  // ── Workspace roles capability matrix (Q3 — multi) ───────────────────────

  multi({
    id: 'wsg-003',
    domain: 'maintain',
    subtopic: 'workspace-roles',
    difficulty: 3,
    prompt: 'Which of the following actions can a workspace CONTRIBUTOR perform? Select all that apply.',
    options: [
      'Create, edit, and delete items in the workspace',
      'Publish a Power BI app to an audience',
      'Add or remove workspace members',
      'Schedule data refreshes on a semantic model',
      'Share items with links (item-level sharing)',
      'Assign the workspace to a different Fabric capacity'
    ],
    correct: [0, 3],
    explanation: 'Contributor is a maker role: create/edit/delete items (A) and schedule refreshes (D) are within scope. App publishing requires Member or higher. Adding/removing members requires Admin. Item-level sharing via links requires Member or higher. Capacity assignment is a tenant admin or workspace Admin action.',
    whyWrong: {
      1: 'App publishing is restricted to Member and above.',
      2: 'Managing workspace membership is an Admin-only action.',
      4: 'Sharing items with links requires Member or higher — Contributor cannot share externally.',
      5: 'Capacity assignment is performed by tenant admins or workspace Admins, not Contributors.'
    },
    source: SRC.workspace,
    tags: ['workspace-roles', 'contributor', 'capability-matrix', 'exam-trap'],
    relatedIds: ['wsg-004']
  }),

  // ── Workspace roles: Admin vs Member (Q4 — single) ───────────────────────

  single({
    id: 'wsg-004',
    domain: 'maintain',
    subtopic: 'workspace-roles',
    difficulty: 2,
    prompt: 'A workspace MEMBER wants to remove another Member from the workspace. Is this allowed?',
    options: [
      'Yes — Members can manage Members and Contributors but not Admins',
      'Yes — Members have full membership management rights equivalent to Admin',
      'No — only workspace Admins can add or remove any workspace member',
      'No — membership changes require a tenant admin to intervene via the Admin portal'
    ],
    correct: 2,
    explanation: 'Only workspace Admins can add, modify, or remove workspace members at any role level. Members can publish apps and share items, but they have no membership management capability. This is a common exam trap.',
    whyWrong: {
      0: 'Members cannot manage other Members — only Admins manage membership.',
      1: 'Members do not have Admin-equivalent rights; publishing apps and sharing are Member actions, but membership management is not.',
      3: 'Tenant admins govern tenant-wide settings; individual workspace membership is managed by the workspace Admin, not the tenant admin.'
    },
    source: SRC.workspace,
    tags: ['workspace-roles', 'admin', 'member', 'membership-management', 'exam-trap'],
    relatedIds: ['wsg-003']
  }),

  // ── Tenant admin: workspace overrides (Q5 — single) ──────────────────────

  single({
    id: 'wsg-005',
    domain: 'maintain',
    subtopic: 'tenant-admin',
    difficulty: 3,
    prompt: 'A tenant admin has disabled the "Users can create workspaces" tenant setting. A workspace Admin in an existing workspace tries to create a new workspace. What happens?',
    options: [
      'The workspace Admin can still create workspaces because workspace-level role overrides tenant settings',
      'The workspace Admin is blocked — tenant settings are enforced globally above all workspace roles',
      'The tenant setting only applies to users with Free licenses; Pro and PPU users are unaffected',
      'The workspace Admin receives a warning but can proceed after confirming the action'
    ],
    correct: 1,
    explanation: 'Tenant settings are enforced at the Fabric platform level and cannot be overridden by workspace roles. A workspace Admin has elevated permissions inside their workspace but cannot circumvent tenant-wide switches. The "Users can create workspaces" setting controls who may create new workspaces regardless of their role in existing ones.',
    whyWrong: {
      0: 'Workspace role grants authority WITHIN a workspace; it does not override tenant-level feature controls.',
      2: 'Tenant settings apply to all licensed users; there is no automatic license-tier bypass for tenant switches unless the admin explicitly creates a per-group exception.',
      3: 'There is no warning-and-proceed flow — blocked means blocked.'
    },
    source: SRC_TENANT,
    tags: ['tenant-admin', 'tenant-settings', 'workspace-creation', 'enforcement']
  }),

  // ── Capacity assignment (Q6 — single) ────────────────────────────────────

  single({
    id: 'wsg-006',
    domain: 'maintain',
    subtopic: 'tenant-admin',
    difficulty: 3,
    prompt: 'Who can assign an existing workspace to a Fabric F-SKU capacity?',
    options: [
      'Any workspace Member or higher, because assignment is a workspace-scoped action',
      'Only tenant admins via the Admin portal',
      'Either a tenant admin OR a workspace Admin, provided the workspace Admin has also been granted the Capacity Admin role for that capacity',
      'Only capacity admins — workspace Admins and tenant admins have no assignment capability'
    ],
    correct: 2,
    explanation: 'Workspace assignment to a capacity can be performed by a tenant admin (globally) or by the workspace Admin when that user is also a Capacity Admin on the target capacity. Neither alone suffices for the workspace-Admin path — they need both roles.',
    whyWrong: {
      0: 'Workspace Members cannot assign workspaces to capacities — this is an elevated administrative action.',
      1: 'Tenant admins can assign, but so can workspace Admins with the Capacity Admin role — option B is incomplete.',
      3: 'Capacity Admins who are also workspace Admins can assign; workspace Admins without capacity-admin rights cannot — but this option wrongly excludes tenant admins.'
    },
    source: SRC_TENANT,
    tags: ['capacity-assignment', 'workspace-admin', 'capacity-admin', 'tenant-admin']
  }),

  // ── Fabric Domains (Q7 — multi) ──────────────────────────────────────────

  multi({
    id: 'wsg-007',
    domain: 'maintain',
    subtopic: 'workspace-governance',
    difficulty: 4,
    prompt: 'A Fabric Domain is used for cross-workspace governance. Which statements about Fabric Domains are correct? Select all that apply.',
    options: [
      'A workspace can belong to at most one Fabric Domain at a time',
      'Fabric Domains are created and managed in the Fabric Admin portal',
      'Domain admins can override tenant-level settings for workspaces in their domain',
      'Assigning a workspace to a domain automatically applies the domain\'s default sensitivity label to all existing items',
      'Multiple workspaces from different Fabric capacities can coexist in the same domain'
    ],
    correct: [0, 1, 4],
    explanation: 'Domains provide a logical grouping layer above capacities. Each workspace belongs to at most one domain (A), domains are managed in the Admin portal (B), and a domain can span multiple capacities (E). Domain admins cannot override tenant settings (C) — they can only configure domain-level governance within what the tenant allows. Assigning a workspace to a domain does NOT auto-apply sensitivity labels to existing items (D).',
    whyWrong: {
      2: 'Domain admins are constrained by tenant settings. They can configure endorsed items, data governance contacts, and domain-scoped sharing, but cannot override tenant-level controls.',
      3: 'Domain assignment does not retroactively apply sensitivity labels to existing items. Label application is a separate manual or policy-driven action.'
    },
    source: SRC_DOMAIN,
    tags: ['fabric-domains', 'cross-workspace', 'domain-admin', 'governance']
  }),

  // ── Sensitivity label propagation (Q8 — single) ──────────────────────────

  single({
    id: 'wsg-008',
    domain: 'maintain',
    subtopic: 'sensitivity-labels',
    difficulty: 3,
    prompt: 'A semantic model in Workspace A carries a "Highly Confidential" sensitivity label. A report in Workspace B is built on that model. What label will the report in Workspace B inherit?',
    options: [
      'No label — sensitivity labels do not propagate across workspace boundaries',
      '"Highly Confidential" — Fabric propagates the most restrictive upstream label automatically',
      'The label of Workspace B\'s default sensitivity policy, overriding the model label',
      '"Highly Confidential" — but only after a manual Purview scan is triggered'
    ],
    correct: 1,
    explanation: 'Microsoft Fabric propagates sensitivity labels downstream from a semantic model to all reports built on it, including across workspace boundaries. The most restrictive upstream label wins automatically — no manual scan or admin action is required.',
    whyWrong: {
      0: 'Cross-workspace label propagation is a Fabric feature explicitly documented in the Microsoft Purview + Fabric integration.',
      2: 'There is no workspace-default sensitivity policy that overrides an upstream label; labels flow from data sources upward, not the other way.',
      3: 'Propagation is automatic. A Purview scan discovers labels on files outside Fabric; it does not govern in-Fabric downstream propagation.'
    },
    source: SRC.sensitivity,
    tags: ['sensitivity-labels', 'propagation', 'cross-workspace', 'exam-trap'],
    relatedIds: ['wsg-009']
  }),

  // ── Audit log retention tiers (Q9 — single) ──────────────────────────────

  single({
    id: 'wsg-009',
    domain: 'maintain',
    subtopic: 'audit-logs',
    difficulty: 3,
    prompt: 'A compliance officer asks how long the Microsoft 365 Unified Audit Log retains Fabric events by default for a tenant with E3 licensing. What is the correct answer?',
    options: [
      '30 days',
      '90 days',
      '180 days',
      '1 year'
    ],
    correct: 1,
    explanation: 'The default audit log retention in M365 is 30 days for E1/F1 plans. Organizations with Microsoft 365 E3 get 90 days of retention. E5 (or the Audit (Premium) add-on) extends retention to 1 year. The Fabric Admin portal "Activity log" is a separate surface with its own 30-day rolling window.',
    whyWrong: {
      0: '30 days applies to the Fabric Admin portal activity log and to E1/F1 M365 plans — not E3.',
      2: '180 days is not a standard M365 UAL retention tier.',
      3: '1 year requires E5 or the Audit (Premium) add-on — not included in E3.'
    },
    source: SRC_AUDIT,
    tags: ['audit-logs', 'retention', 'e3', 'e5', 'exam-trap'],
    relatedIds: ['wsg-010']
  }),

  // ── Activity log vs audit log (Q10 — multi) ──────────────────────────────

  multi({
    id: 'wsg-010',
    domain: 'maintain',
    subtopic: 'audit-logs',
    difficulty: 4,
    prompt: 'Which statements correctly distinguish the Fabric Activity Log from the Microsoft 365 Unified Audit Log (UAL)? Select all that apply.',
    options: [
      'The Activity Log is accessible from the Fabric Admin portal and covers Fabric-specific events only',
      'The UAL is searched via the Microsoft Purview compliance portal and covers events across all M365 services',
      'The Activity Log retains events for up to 90 days regardless of license',
      'Both logs can be accessed programmatically via the Fabric REST API',
      'The UAL supports cross-service alert policies on Fabric events; the Activity Log does not'
    ],
    correct: [0, 1, 4],
    explanation: 'The Fabric Activity Log (A) is scoped to Fabric events and is available in the Admin portal with a 30-day retention window. The UAL (B) aggregates events across M365 workloads and is queried via Purview compliance portal. The UAL also supports alert policies that the standalone Activity Log cannot trigger (E). The Activity Log retains only 30 days (C is false). While Activity events can be pulled via REST API, the UAL is not exposed through the Fabric REST API — it uses its own query API (D is misleading).',
    whyWrong: {
      2: 'Activity Log retention is 30 days, not 90. UAL retention varies by license (30/90/365 days).',
      3: 'The Fabric REST API exposes Activity Log data (GetActivityEvents). The UAL has its own separate Office 365 Management API — it is not surfaced through the Fabric REST API.'
    },
    source: SRC_AUDIT,
    tags: ['activity-log', 'audit-log', 'unified-audit-log', 'purview', 'exam-trap'],
    relatedIds: ['wsg-009']
  }),

  // ── License feature gating (Q11 — single) ────────────────────────────────

  single({
    id: 'wsg-011',
    domain: 'maintain',
    subtopic: 'license-management',
    difficulty: 3,
    prompt: 'A user with a Power BI Free license attempts to open a report in a workspace assigned to a Fabric F4 capacity. What happens?',
    options: [
      'Access is denied — Free users cannot access any workspace content regardless of capacity',
      'Access is granted — a Fabric capacity license covers all users who access that capacity\'s workspaces, no per-user license required for consumption',
      'The user must upgrade to Pro before they can view the report',
      'The report opens in read-only DirectQuery mode because Free users cannot use Import mode'
    ],
    correct: 1,
    explanation: 'Fabric capacity (F-SKU) is a per-capacity license that covers consumption access for all users in that capacity\'s workspaces. Free users can view and interact with reports in Fabric-capacity-backed workspaces. Per-user Pro or PPU licenses are only required when the workspace uses Power BI Premium Per User or standard shared capacity.',
    whyWrong: {
      0: 'Free users CAN access content in Fabric-capacity workspaces — the capacity license covers consumption.',
      2: 'Pro is required for non-capacity workspaces and sharing outside the org. When Fabric capacity is in play, Pro is not required for viewers.',
      3: 'Storage mode (Import vs DirectQuery) is a semantic-model authoring choice unrelated to user license tier.'
    },
    source: SRC_LIC,
    tags: ['license-management', 'free-license', 'fabric-capacity', 'consumption', 'exam-trap'],
    relatedIds: ['wsg-012']
  }),

  // ── PPU workspace access (Q12 — single) ──────────────────────────────────

  single({
    id: 'wsg-012',
    domain: 'maintain',
    subtopic: 'license-management',
    difficulty: 3,
    prompt: 'A workspace is configured with Premium Per User (PPU) as its capacity type. A colleague with a standard Pro license tries to access a report in that workspace. What is the result?',
    options: [
      'Access is granted — Pro and PPU are interchangeable for workspace consumption',
      'Access is denied — all users must hold a PPU license to access any item in a PPU workspace',
      'Access is granted but only if the workspace Admin has enabled "Allow Pro users to access PPU content" in workspace settings',
      'Access is denied but a 30-day free PPU trial is automatically provisioned for the Pro user'
    ],
    correct: 1,
    explanation: 'PPU workspaces require every user who accesses content to hold a PPU license. A Pro license is insufficient — PPU features (Dataflows Gen2, large semantic models, XMLA endpoint) are gated per user, not per capacity. There is no workspace toggle to downgrade this requirement.',
    whyWrong: {
      0: 'Pro and PPU are not interchangeable — PPU is a superset that includes features not available to Pro users, and those features require the PPU entitlement at the per-user level.',
      2: 'There is no workspace setting to allow Pro users into PPU workspaces. The PPU requirement is enforced by the license plane.',
      3: 'Automatic PPU trial provisioning is not part of the access denial flow for PPU workspaces.'
    },
    source: SRC_LIC,
    tags: ['license-management', 'ppu', 'pro', 'workspace-settings', 'exam-trap'],
    relatedIds: ['wsg-011']
  }),

  // ── Workspace soft-delete recovery (Q13 — ordering) ──────────────────────

  order({
    id: 'wsg-013',
    domain: 'maintain',
    subtopic: 'workspace-admin',
    difficulty: 3,
    prompt: 'Put the steps to recover a deleted Fabric workspace in the correct order.',
    options: [
      'Navigate to the Fabric Admin portal → Workspaces → Deleted workspaces',
      'Delete action is performed on the workspace',
      'Workspace enters a 90-day soft-delete period (restorable)',
      'Click Restore on the deleted workspace entry'
    ],
    shuffled: [
      'Click Restore on the deleted workspace entry',
      'Delete action is performed on the workspace',
      'Navigate to the Fabric Admin portal → Workspaces → Deleted workspaces',
      'Workspace enters a 90-day soft-delete period (restorable)'
    ],
    explanation: 'Deleting a workspace begins the 90-day soft-delete window. A tenant admin finds it in the Admin portal Deleted workspaces list and clicks Restore. After 90 days the workspace is permanently purged and cannot be restored.',
    source: SRC_WSGOV,
    tags: ['workspace-admin', 'soft-delete', 'recovery', '90-day']
  }),

  // ── Item vs workspace permissions (Q14 — multi) ──────────────────────────

  multi({
    id: 'wsg-014',
    domain: 'maintain',
    subtopic: 'workspace-roles',
    difficulty: 4,
    prompt: 'Which of the following can be granted to a user WITHOUT giving them any workspace role? Select all that apply.',
    options: [
      'Read access to a specific report via item sharing',
      'Build permission on a semantic model to create new reports',
      'Ability to edit a Dataflow Gen2 item',
      'Access to a specific Lakehouse SQL endpoint table via T-SQL',
      'View-only access to a Notebook'
    ],
    correct: [0, 1, 3],
    explanation: 'Item-level sharing grants Read (A) without workspace role. Build permission can be granted directly on a semantic model (B). Lakehouse SQL endpoint access can be scoped via T-SQL object-level grants without a workspace role (D). Edit access to a Dataflow requires at least Contributor in the workspace (C cannot be granted item-only). Notebooks do not support item-level sharing of view-only access outside workspace roles (E).',
    whyWrong: {
      2: 'Editing items (Dataflow, Notebook, etc.) requires at least Contributor in the workspace — there is no item-level edit grant.',
      4: 'Notebooks do not support granular item-level sharing independent of workspace role for view access.'
    },
    source: SRC_WSGOV,
    tags: ['item-permissions', 'workspace-roles', 'item-sharing', 'build-permission', 'least-privilege']
  }),

  // ── Tenant feature switches (Q15 — single) ───────────────────────────────

  single({
    id: 'wsg-015',
    domain: 'maintain',
    subtopic: 'tenant-admin',
    difficulty: 3,
    prompt: 'A tenant admin wants to prevent all users from exporting Power BI report data to CSV files. Where is this configured?',
    options: [
      'Workspace settings on each workspace → Export controls → Disable CSV export',
      'Fabric Admin portal → Tenant settings → Export and sharing settings → Export to CSV',
      'Power BI Desktop → Options → CSV export restrictions (pushed via Intune)',
      'Microsoft Entra ID → Enterprise Applications → Power BI → App settings'
    ],
    correct: 1,
    explanation: 'Export controls are tenant-level settings managed in the Fabric Admin portal under Tenant settings → Export and sharing settings. The "Export to CSV" toggle applies globally. Workspace settings do not expose export controls, and the restriction cannot be enforced via Desktop options or Entra app settings.',
    whyWrong: {
      0: 'Individual workspace settings do not include export controls — these are tenant-level only.',
      2: 'Power BI Desktop options affect local behavior only and cannot be pushed as a policy that restricts cloud service exports.',
      3: 'Entra ID app permissions govern application-level consent and OAuth scopes, not Fabric feature toggles.'
    },
    source: SRC_TENANT,
    tags: ['tenant-admin', 'export-controls', 'tenant-settings', 'csv-export']
  }),

  // ── PowerShell / REST API governance (Q16 — multi) ───────────────────────

  multi({
    id: 'wsg-016',
    domain: 'maintain',
    subtopic: 'workspace-governance',
    difficulty: 4,
    prompt: 'A Fabric administrator needs to audit all workspaces, their capacity assignments, and their member lists programmatically. Which tools can accomplish this? Select all that apply.',
    options: [
      'Fabric REST API (GetWorkspacesAsAdmin, GetGroupUsersAsAdmin)',
      'Power BI PowerShell module (Get-PowerBIWorkspace -Scope Organization)',
      'Azure Resource Graph query against the Microsoft.Fabric provider',
      'Microsoft Graph API — /groups endpoint with Fabric filter',
      'Fabric Admin portal Export workspaces list (CSV download)'
    ],
    correct: [0, 1, 4],
    explanation: 'The Fabric REST Admin API (A) and the Power BI PowerShell module\'s Organization-scope cmdlets (B) are the primary programmatic governance surfaces. The Admin portal also offers a CSV export of workspaces (E) for one-off audits. Azure Resource Graph does not index Fabric workspace metadata (C). The Microsoft Graph /groups endpoint returns Entra groups, not Fabric workspace metadata (D).',
    whyWrong: {
      2: 'Fabric workspace resources are not indexed by Azure Resource Graph. Resource Graph covers Azure ARM resources.',
      3: 'Graph /groups reflects Entra ID security groups — it does not expose Fabric workspace capacity assignments or Fabric-specific membership roles.'
    },
    source: SRC_WSGOV,
    tags: ['workspace-governance', 'rest-api', 'powershell', 'admin-api', 'programmatic'],
    relatedIds: ['wsg-005']
  }),

  // ── Cross-tenant guest access (Q17 — single) ─────────────────────────────

  single({
    id: 'wsg-017',
    domain: 'maintain',
    subtopic: 'tenant-admin',
    difficulty: 4,
    prompt: 'An external partner from another tenant is invited as a B2B guest to a Fabric workspace. Which statement about their access is correct?',
    options: [
      'Guests can be assigned any workspace role (Admin, Member, Contributor, Viewer) identical to internal users',
      'Guests can be granted Viewer role only; all authoring roles are reserved for internal users',
      'Guest access to Fabric workspaces must be explicitly enabled in the Fabric tenant settings and is limited by the guest\'s home-tenant license',
      'Guests from other tenants cannot access Fabric content under any configuration'
    ],
    correct: 2,
    explanation: 'External guest (B2B) access to Fabric workspaces requires the tenant admin to enable the "Guest users can access Fabric" switch in tenant settings. A guest\'s entitlement is also constrained by their home-tenant license — a guest with only a Free license in their home tenant cannot use Premium-only features even if the host workspace is on Fabric capacity.',
    whyWrong: {
      0: 'While guests can be assigned Contributor or Member roles in some configurations, tenant settings control whether guest access is permitted at all — the statement overstates the default state.',
      1: 'Guests can be granted higher-than-Viewer roles when the tenant allows it — the Viewer-only restriction is not universal.',
      3: 'Guest access is possible — it is governed by tenant settings and license constraints, not a hard system block.'
    },
    source: SRC_TENANT,
    tags: ['guest-access', 'cross-tenant', 'b2b', 'tenant-settings', 'license']
  }),

  // ── Microsoft Purview integration (Q18 — single) ─────────────────────────

  single({
    id: 'wsg-018',
    domain: 'maintain',
    subtopic: 'workspace-governance',
    difficulty: 4,
    prompt: 'A data governance team wants to automatically discover and classify sensitive data across all Fabric Lakehouses using Microsoft Purview. Which Purview capability performs this?',
    options: [
      'Purview Activity Explorer — continuously scans Lakehouse Delta tables for PII',
      'Purview Data Map — registers Fabric as a data source and runs scanning rules to classify sensitive data',
      'Purview Compliance Manager — scores each Lakehouse against data regulations and applies labels',
      'Purview eDiscovery — crawls Lakehouse content for legal hold classification'
    ],
    correct: 1,
    explanation: 'Microsoft Purview Data Map scans registered data sources including Microsoft Fabric. Fabric Lakehouses can be registered as a data source in the Purview Data Map, and Purview\'s scanning rules detect sensitive data (PII, financial data) and apply classification labels automatically. Activity Explorer and eDiscovery serve compliance / investigation purposes, not bulk automated classification.',
    whyWrong: {
      0: 'Activity Explorer shows label-change activity and user events; it does not scan or classify data.',
      2: 'Compliance Manager assesses regulatory posture (scores, recommendations); it does not scan data assets.',
      3: 'eDiscovery is for legal holds and content searches in response to litigation — not automated data classification at scale.'
    },
    source: SRC_PURVIEW,
    tags: ['purview', 'data-map', 'scanning', 'classification', 'lakehouse']
  }),

  // ── Workspace usage metrics (Q19 — single) ───────────────────────────────

  single({
    id: 'wsg-019',
    domain: 'maintain',
    subtopic: 'workspace-admin',
    difficulty: 2,
    prompt: 'Where does a workspace Admin find the built-in usage metrics report for Power BI reports and dashboards in that workspace?',
    options: [
      'Fabric Admin portal → Capacity Metrics app → Workspace detail view',
      'The workspace itself — open any report and select the "View usage metrics report" option from the "..." menu',
      'Microsoft 365 Admin Center → Reports → Power BI',
      'The Fabric Monitoring Hub under the workspace node'
    ],
    correct: 1,
    explanation: 'Usage metrics reports are per-report and per-dashboard artifacts. A workspace Admin or Member opens the item\'s context menu ("...") and selects "View usage metrics report." The report is automatically created and scoped to that item. It retains 90 days of usage data.',
    whyWrong: {
      0: 'The Capacity Metrics app tracks CU utilization across the capacity; it does not surface per-report view/user counts.',
      2: 'Microsoft 365 Admin Center reports are at the tenant level (daily active users overall); they do not provide per-workspace item-level usage.',
      3: 'The Monitoring Hub tracks item refresh and pipeline run history, not user engagement or view metrics.'
    },
    source: SRC_WSGOV,
    tags: ['usage-metrics', 'workspace-admin', 'reports', 'monitoring']
  }),

  // ── Information protection scanning and discovery (Q20 — multi) ──────────

  multi({
    id: 'wsg-020',
    domain: 'maintain',
    subtopic: 'sensitivity-labels',
    difficulty: 4,
    prompt: 'A compliance officer wants to understand how sensitivity labels flow through Fabric. Which behaviors are accurate for Microsoft Information Protection (MIP) in Fabric? Select all that apply.',
    options: [
      'Labels assigned to a Lakehouse propagate to all shortcuts pointing to that Lakehouse',
      'Labels propagate downstream from a semantic model to reports that consume it, across workspaces',
      'When a labeled dataset is exported to Excel, the Excel file inherits the label and its protections',
      'Sensitivity labels are enforced on OneLake Direct access in the same way as workspace item access',
      'Users can manually downgrade a label only if the tenant policy allows label downgrading and they provide a justification'
    ],
    correct: [1, 2, 4],
    explanation: 'Downstream propagation from semantic models to reports (B) and Excel export inheritance (C) are documented Fabric MIP behaviors. Label downgrade justification policy (E) is enforced when tenant policy requires it. Shortcuts are virtualized paths — labels on the source Lakehouse do NOT automatically propagate through shortcut to the consuming workspace (A is a common misconception). OneLake Direct access (ADLS APIs) does not enforce MIP labels the same way as workspace item access; those are separate security layers (D is false).',
    whyWrong: {
      0: 'Shortcuts virtualize data access but do not propagate sensitivity labels. The label lives on the source item and must be explicitly assigned in the consuming context.',
      3: 'OneLake Direct (ADLS-compatible) access bypasses MIP enforcement at the item layer. Label-based encryption is enforced on Office file exports and workspace item access, not on raw OneLake API reads.'
    },
    source: SRC.sensitivity,
    tags: ['sensitivity-labels', 'mip', 'propagation', 'onelake', 'shortcuts', 'exam-trap'],
    relatedIds: ['wsg-008']
  })

];
