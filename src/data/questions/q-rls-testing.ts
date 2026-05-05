// Sprint 4 — RLS Testing and Validation in Microsoft Fabric (20 Q).
//
// Concentrated on the TRAPS people fall into when testing and validating RLS,
// not just the mechanics of authoring roles. Every question targets a known
// failure mode seen in regulated workloads.
//
// Subtopic distribution:
//   rls-testing          8 Q  — View as Role, Test as User, owner bypass
//   rls-roles            3 Q  — role assignment in Service, multi-role union
//   security-validation  4 Q  — View Permissions, metadata vs data, empty-result FP
//   rls-debugging        3 Q  — LOOKUPVALUE BLANK, PATHCONTAINS hierarchy, silent misconfiguration
//   rls-vs-warehouse-rls 2 Q  — semantic-model DAX vs T-SQL predicate distinction
//
// Type mix: 9 single | 7 multi | 2 ordering = 18 single/multi / 2 ordering
// IDs: rlst-001..rlst-020
// Sources: learn.microsoft.com/en-us/power-bi/admin/service-admin-rls
//          learn.microsoft.com/en-us/power-bi/create-reports/desktop-report-view-as
//          learn.microsoft.com/en-us/fabric/data-warehouse/row-level-security

import type { Question } from '../../lib/schema';
import { single, multi, order, SRC } from './_helpers';

export const rlsTesting: Question[] = [
  // ── rls-testing: View as Role, owner bypass, Desktop vs Service ──

  single({
    id: 'rlst-001', domain: 'semantic', subtopic: 'rls-testing', difficulty: 3,
    prompt:
      'A developer defines an RLS role "SouthRegion" and tests it using "View as Role" in Power BI Desktop. All visuals show the correctly filtered rows. After publishing to the Service, a colleague reports they see ALL rows. What is the MOST likely explanation?',
    options: [
      'The role expression has a case-sensitivity error that only manifests in the Service',
      'The colleague was never added to the "SouthRegion" role in Power BI Service — role assignment happens in Service, not in Desktop',
      '"View as Role" in Desktop does not preview DAX filter expressions correctly',
      'The colleague must re-open the report in a private-browsing window to trigger RLS'
    ],
    correct: 1,
    explanation:
      'Defining an RLS role in Desktop and verifying it with "View as Role" only tests the DAX predicate locally. Role MEMBERSHIP (assigning users or groups to the role) must be done in Power BI Service under Manage Permissions / Security. A role that has no members never filters anyone. This is the single most common RLS deployment mistake.',
    whyWrong: {
      0: 'RLS DAX expressions in Power BI are case-insensitive for string comparisons by default. A case error would fail in both Desktop and Service consistently.',
      2: '"View as Role" in Desktop correctly evaluates the DAX filter expression. If it filtered correctly in Desktop, the expression is sound.',
      3: 'Private-browsing mode has no effect on RLS membership. Session cookies and app state do not affect security role evaluation.'
    },
    source: SRC.rls,
    tags: ['rls-testing', 'role-assignment', 'service-vs-desktop', 'exam-trap'],
    relatedIds: ['rlst-002', 'rlst-006', 'gs-014']
  }),

  single({
    id: 'rlst-002', domain: 'semantic', subtopic: 'rls-testing', difficulty: 3,
    prompt:
      'You are the semantic model OWNER. You open the Power BI Service report connected to your model and verify that all rows appear — including rows other users should NOT see. What does this confirm?',
    options: [
      'RLS is broken and must be re-published',
      'This is EXPECTED behavior — model owners are never filtered by RLS roles, regardless of membership',
      'You must be accidentally assigned to multiple roles that union to show all rows',
      'The Service has a caching delay; wait 30 minutes and the filter will apply'
    ],
    correct: 1,
    explanation:
      'Semantic model owners (and workspace Admins) bypass RLS by design. The owner identity is treated as an "admin" of the model and is never subject to role filtering. This is intentional — it allows the owner to audit data and diagnose issues. To test RLS as a non-owner, use "Test as Other User" in the Service or assign a dedicated test account to the role.',
    whyWrong: {
      0: 'The behavior is correct and by design. "RLS is broken" is the wrong conclusion when it is the owner seeing all data.',
      2: 'Multi-role UNION semantics do apply to regular users, but the owner bypass is a separate mechanism that applies regardless of role assignments.',
      3: 'There is no caching delay affecting RLS evaluation. The owner bypass is instantaneous and permanent, not temporal.'
    },
    source: SRC.rls,
    tags: ['rls-testing', 'owner-bypass', 'admin-bypass', 'exam-trap'],
    relatedIds: ['rlst-001', 'rlst-003', 'gs-014']
  }),

  single({
    id: 'rlst-003', domain: 'semantic', subtopic: 'rls-testing', difficulty: 3,
    prompt:
      'A workspace Admin opens a report to validate that RLS is restricting data for the "Finance" role. The Admin is not a member of the "Finance" role. What does the Admin see?',
    options: [
      'Only the rows allowed by the "Finance" role, because the Admin is testing that role',
      'ALL rows — workspace Admins bypass RLS regardless of role membership, just like model owners',
      'An error message: "You are not a member of any RLS role"',
      'An empty report, because Admins are treated as having no roles'
    ],
    correct: 1,
    explanation:
      'Workspace Admins bypass RLS — they see all data in every semantic model in the workspace, regardless of role membership. This is the same bypass as model owners. The correct way to test the "Finance" role is to use "Test as Other User" in the Service with an account that IS a Finance role member, or use "View as Role" combined with "View as User" in Desktop.',
    whyWrong: {
      0: 'The Admin has no special ability to view data AS a specific role without using the dedicated "View as Role" test features. Simply opening the report shows unfiltered data.',
      2: 'RLS does not produce an error for non-members — it produces unfiltered results for admins, or a blank/partial result for regular users assigned to no role.',
      3: 'The Admin does not receive an empty result; they receive ALL rows due to the admin bypass.'
    },
    source: SRC.rls,
    tags: ['rls-testing', 'admin-bypass', 'workspace-admin', 'exam-trap'],
    relatedIds: ['rlst-002']
  }),

  multi({
    id: 'rlst-004', domain: 'semantic', subtopic: 'rls-testing', difficulty: 4,
    prompt:
      'A developer wants to test dynamic RLS using USERPRINCIPALNAME() for a user "alice@contoso.com" who is in the "SalesRep" role. Which methods correctly simulate Alice\'s view? Select all that apply.',
    options: [
      'In Power BI Desktop: use "View as Role: SalesRep" combined with "View as User: alice@contoso.com"',
      'In Power BI Service: use "Test as" → enter alice@contoso.com in the "Test as Other User" dialog',
      'In Power BI Desktop: enter alice@contoso.com in the "View as Role" text box alongside the role name',
      'Log into the Service as alice@contoso.com and open the report directly',
      'In Power BI Service: navigate to the model Security panel and click "Test as" next to the role'
    ],
    correct: [0, 1, 3, 4],
    explanation:
      'Four valid methods: (A) Desktop supports a combined role + user simulation; (B) the Service "Test as Other User" feature in Manage Permissions correctly simulates both the role AND the USERPRINCIPALNAME() value for the specified user; (D) logging in as the actual user always gives a true representation; (E) the Security panel in the Service has a "Test as" button per role. (C) is wrong — Desktop does not accept a UPN directly alongside the role name in the "View as Role" dialog; the user identity simulation is a separate control.',
    whyWrong: {
      2: '"View as Role" in Desktop accepts only role names, not user identities, in that single input. The user simulation is in a separate "Test as User" field, not combined in the role text box.'
    },
    source: SRC.rls,
    tags: ['rls-testing', 'dynamic-rls', 'userprincipalname', 'test-as-user', 'view-as-role'],
    relatedIds: ['rlst-001', 'rlst-005', 'gs-010']
  }),

  single({
    id: 'rlst-005', domain: 'semantic', subtopic: 'rls-testing', difficulty: 4,
    prompt:
      'A tester uses "Test as Other User" in Power BI Service to simulate user "bob@contoso.com". The report shows data filtered to Bob\'s rows. The tester reports: "RLS is working." Is this verification sufficient before production sign-off?',
    options: [
      'Yes — "Test as Other User" is the definitive test; no further verification needed',
      'No — "Test as Other User" simulates the DAX context but does NOT test whether Bob is actually a member of the correct role in Service',
      'No — "Test as Other User" only works for static RLS, not for dynamic RLS using USERPRINCIPALNAME()',
      'Yes, but only if the tester is a workspace Admin'
    ],
    correct: 1,
    explanation:
      '"Test as Other User" places the specified UPN into the USERPRINCIPALNAME() context and applies the selected role\'s DAX filter — validating that the expression is correct for that identity. However, it does NOT verify that bob@contoso.com has actually been assigned to the role in the Service\'s Manage Permissions / Security panel. A user whose UPN matches the DAX predicate but who is not assigned to the role will see ALL rows (no role = no filter). Both the DAX expression AND the role membership must be verified.',
    whyWrong: {
      0: '"Test as Other User" is a strong DAX validation tool but it does not confirm actual role membership. The two things must be verified separately.',
      2: '"Test as Other User" works for both static and dynamic RLS — it populates USERPRINCIPALNAME() with the specified UPN, which is exactly what dynamic RLS uses.',
      3: 'The tester\'s own workspace role does not affect the validity of "Test as Other User" output.'
    },
    source: SRC.rls,
    tags: ['rls-testing', 'test-as-user', 'role-membership', 'verification', 'exam-trap'],
    relatedIds: ['rlst-001', 'rlst-004']
  }),

  multi({
    id: 'rlst-006', domain: 'semantic', subtopic: 'rls-testing', difficulty: 4,
    prompt:
      'A team checks RLS before a regulated release. Which steps are REQUIRED to confirm correct enforcement? Select all that apply.',
    options: [
      'Verify the DAX role expression with "View as Role" in Desktop or "Test as" in Service',
      'Verify role MEMBERSHIP in Power BI Service: confirm the expected users/groups are assigned to the role under Manage Permissions → Security',
      'Verify that the model owner sees filtered data when logged into the Service',
      'Verify at least one affected user sees correctly filtered data (not just the admin/owner test)',
      'Verify that the model was published AFTER the role was defined (re-publish is required for role expression changes to take effect)'
    ],
    correct: [0, 1, 3, 4],
    explanation:
      'Correct RLS release checklist: test the DAX expression (A), confirm membership (B), verify with a real affected user (D), and confirm re-publish was done after any role expression change (E). (C) is explicitly wrong — the model owner ALWAYS sees all data; verifying the owner\'s view tells you nothing about RLS enforcement.',
    whyWrong: {
      2: 'Owners bypass RLS. Observing the owner seeing all rows is expected and says nothing about whether RLS is working for regular users. This is the single most dangerous validation shortcut.'
    },
    source: SRC.rls,
    tags: ['rls-testing', 'validation-checklist', 'role-membership', 'owner-bypass', 're-publish'],
    relatedIds: ['rlst-001', 'rlst-002', 'rlst-005']
  }),

  // ── rls-testing: ordering question — reproduce a user's view ──

  order({
    id: 'rlst-007', domain: 'semantic', subtopic: 'rls-testing', difficulty: 3,
    prompt:
      'A developer needs to reproduce exactly what a specific end user sees in a published report to investigate an RLS complaint. Arrange the steps in the CORRECT order.',
    options: [
      'Navigate to the semantic model in Power BI Service and open the Security (Manage Permissions) panel',
      'In the Security panel, locate the role the user is assigned to and click "Test as"',
      'Enter the user\'s UPN in the "Test as User" field and confirm',
      'Review the report view that opens — the data shown reflects the user\'s effective role filter and USERPRINCIPALNAME() context',
      'Compare the reproduced view with the user\'s complaint to isolate whether the issue is a DAX predicate error or a role membership error'
    ],
    shuffled: [
      'Compare the reproduced view with the user\'s complaint to isolate whether the issue is a DAX predicate error or a role membership error',
      'Enter the user\'s UPN in the "Test as User" field and confirm',
      'In the Security panel, locate the role the user is assigned to and click "Test as"',
      'Navigate to the semantic model in Power BI Service and open the Security (Manage Permissions) panel',
      'Review the report view that opens — the data shown reflects the user\'s effective role filter and USERPRINCIPALNAME() context'
    ],
    explanation:
      'Canonical 5-step reproduction: (1) open Service Security panel → (2) find the role and click "Test as" → (3) enter the UPN → (4) review the rendered data → (5) compare to complaint. Skipping step 1-2 and logging in as the user directly also works, but the "Test as" Service flow is the recommended non-destructive path that does not require the user\'s credentials.',
    whyWrong: {
      0: 'Comparing the view must come LAST — you cannot compare until you have reproduced the view.',
      1: 'Entering the UPN comes after opening the Security panel and clicking "Test as", not before.',
      2: 'Clicking "Test as" within the panel comes before entering the UPN in the dialog.',
      3: 'Opening the Security panel is the first step — nothing else is accessible until you are in this panel.',
      4: 'Reviewing the rendered view is step 4 — after the UPN is confirmed and the test session opens.'
    },
    source: SRC.rls,
    tags: ['rls-testing', 'test-as-user', 'service', 'ordering', 'procedure'],
    relatedIds: ['rlst-004', 'rlst-005']
  }),

  single({
    id: 'rlst-008', domain: 'semantic', subtopic: 'rls-testing', difficulty: 4,
    prompt:
      'After using "View as Role" in Power BI Desktop to test an RLS configuration, a developer sees the correct filtered view. What is one important limitation of this test that Desktop CANNOT verify?',
    options: [
      'Whether the DAX filter expression uses the correct column reference',
      'Whether the USERPRINCIPALNAME() function returns the right value in the Service context (e.g., federated identity vs UPN alias)',
      'Whether the model has any relationships that could propagate the filter',
      'Whether the filtered result set is smaller than the unfiltered result'
    ],
    correct: 1,
    explanation:
      'Desktop "View as Role" evaluates USERPRINCIPALNAME() using the developer\'s own logged-in identity. In the Service, USERPRINCIPALNAME() may resolve differently — for example, in tenants with federated identities, aliases, or guest accounts, the UPN format may not match the values stored in the security table. This is a common source of "works in Desktop, broken in Service" bugs where the DAX is correct but the identity string does not match.',
    whyWrong: {
      0: 'Desktop fully validates column references — a bad column reference fails visibly in both Desktop and Service.',
      2: 'Relationship propagation is fully evaluated in Desktop\'s "View as Role" mode.',
      3: 'Result-set size comparison is observable in Desktop.'
    },
    source: SRC.rls,
    tags: ['rls-testing', 'upn-mismatch', 'federated-identity', 'desktop-limitation', 'exam-trap'],
    relatedIds: ['rlst-004', 'rlst-005', 'gs-010']
  }),

  // ── rls-roles: assignment, multi-role union semantics ──

  single({
    id: 'rlst-009', domain: 'semantic', subtopic: 'rls-roles', difficulty: 2,
    prompt:
      'Where must an RLS role be ASSIGNED to users or groups for it to take effect in Power BI Service?',
    options: [
      'In Power BI Desktop → Modeling tab → Manage Roles',
      'In Power BI Service → Semantic Model → Manage Permissions (Security)',
      'In the Fabric Admin Portal → Tenant Settings',
      'In Entra ID → Enterprise Applications for the Power BI app'
    ],
    correct: 1,
    explanation:
      'Role DEFINITION (creating the role and writing the DAX filter) is done in Desktop. Role ASSIGNMENT (mapping users or groups to the role) must be done in Power BI Service on the semantic model under "Manage Permissions" (or "Security"). Roles with no members assigned never filter any user. This is the most common RLS deployment gap.',
    whyWrong: {
      0: 'The Manage Roles dialog in Desktop is for DEFINING roles, not assigning users to them.',
      2: 'The Admin Portal manages tenant-wide settings, not per-model role membership.',
      3: 'Entra ID manages identity and group membership, but Power BI RLS role-to-user binding is done in the Service, not in Entra ID directly.'
    },
    source: SRC.rls,
    tags: ['rls-roles', 'role-assignment', 'service-vs-desktop', 'foundation'],
    relatedIds: ['rlst-001']
  }),

  multi({
    id: 'rlst-010', domain: 'semantic', subtopic: 'rls-roles', difficulty: 4,
    prompt:
      'User Carlos is a member of BOTH the "EastRegion" role (filter: [Region] = "East") and the "ManagerAccess" role (filter: PATHCONTAINS([ReportingPath], USERPRINCIPALNAME())). Carlos manages 3 people in WEST. What rows does Carlos see? Select all that apply.',
    options: [
      'All rows where [Region] = "East"',
      'All rows where Carlos appears in [ReportingPath] (his 3 direct reports, potentially in any region)',
      'Only East-region rows where Carlos also appears in [ReportingPath] (intersection of both filters)',
      'All rows — multi-role membership means RLS is disabled for Carlos',
      'East-region rows for ANY salesperson plus any-region rows for his 3 direct reports'
    ],
    correct: [0, 1, 4],
    explanation:
      'Multi-role membership uses UNION (OR) semantics, not intersection (AND). Carlos sees all rows satisfying EastRegion (A) plus all rows satisfying ManagerAccess (B). Option E correctly restates this union as a combined set. Option C (intersection/AND) is the classic exam trap — multi-role is always the more permissive union, not the more restrictive intersection. Option D is also wrong — RLS is still enforced; the union of role filters applies, not "no filter".',
    whyWrong: {
      2: 'Multi-role semantics are UNION (OR), not AND. Intersection would only apply if Carlos were in ONE role with a compound AND predicate.',
      3: 'RLS is not disabled for multi-role users. The union of all role filter predicates applies. A user with no roles gets a completely unfiltered view, but multi-role membership is not the same as no membership.'
    },
    source: SRC.rls,
    tags: ['rls-roles', 'multi-role', 'union-semantics', 'exam-trap', 'pathcontains'],
    relatedIds: ['gs-013', 'rlst-009']
  }),

  single({
    id: 'rlst-011', domain: 'semantic', subtopic: 'rls-roles', difficulty: 3,
    prompt:
      'A user is assigned to an RLS role "AllData" that has NO DAX filter expression (the table filter is empty). What does this user see?',
    options: [
      'No rows — an empty filter means nothing passes the predicate',
      'ALL rows in the filtered table — an empty filter means "no restriction", equivalent to TRUE',
      'Only rows where all column values are NULL',
      'An error: "Role must have at least one filter expression to be valid"'
    ],
    correct: 1,
    explanation:
      'An empty DAX filter expression in an RLS role is equivalent to a TRUE() predicate — it applies no row filtering to the table. A user assigned only to this role would see all rows. This is intentional for admin-style roles that need to be assigned to a specific group while still allowing full data access (e.g., a manager escalation role). It is also how RLS bypass for elevated users is sometimes implemented.',
    whyWrong: {
      0: 'Empty is NOT the same as FALSE. Empty/TRUE allows all rows; FALSE allows no rows.',
      2: 'There is no NULL-column behavior implied by an empty filter. All rows pass.',
      3: 'Power BI does not require a filter expression. Empty is valid and means "no restriction on this table".'
    },
    source: SRC.rls,
    tags: ['rls-roles', 'empty-filter', 'true-predicate', 'traps'],
    relatedIds: ['rlst-009']
  }),

  // ── security-validation: View Permissions, metadata vs data ──

  multi({
    id: 'rlst-012', domain: 'semantic', subtopic: 'security-validation', difficulty: 4,
    prompt:
      'A compliance officer asks: "Can I verify exactly which users have access to which RLS roles without querying the model directly?" Which features enable this? Select all that apply.',
    options: [
      'Power BI Service → Semantic Model → Manage Permissions: shows every user/group assigned to each role',
      'Power BI Service → Semantic Model → View Permissions: shows effective permissions (including inherited) per user',
      'Fabric Admin Portal → Governance: shows all RLS assignments tenant-wide',
      'Microsoft Purview → Data Catalog: surfaces RLS role membership for labeled models',
      'Power BI Service → Workspace Settings → Access list: shows workspace roles but NOT semantic model RLS membership'
    ],
    correct: [0, 1, 4],
    explanation:
      '"Manage Permissions" (A) is the canonical place to view and edit role-to-user/group assignments on a specific model. "View Permissions" (B) shows a per-user breakdown of effective access including RLS role assignments — useful for compliance spot-checks. The workspace Access list (E) shows workspace roles, NOT model-specific RLS membership, making it an important distinction. The Fabric Admin Portal (C) and Purview Data Catalog (D) do not currently surface per-model RLS role membership lists.',
    whyWrong: {
      2: 'The Fabric Admin Portal provides tenant-wide governance visibility on capacity, workspace, and item metrics, but not a consolidated RLS role membership view across all models.',
      3: 'Purview Data Catalog surfaces metadata and sensitivity labels, not RLS role assignments.'
    },
    source: SRC.rls,
    tags: ['security-validation', 'view-permissions', 'manage-permissions', 'compliance', 'audit'],
    relatedIds: ['rlst-001', 'rlst-009']
  }),

  single({
    id: 'rlst-013', domain: 'semantic', subtopic: 'security-validation', difficulty: 4,
    prompt:
      'A user correctly assigned to an RLS role "RegionWest" complains: "I can see the [Region] column in the field list, but all my visuals are blank." Which is the CORRECT interpretation?',
    options: [
      'RLS is blocking the column itself — the user should not see it in the field list either',
      'RLS filters rows but does NOT affect metadata visibility — the user sees the column in field lists even with zero qualifying rows. The blank visual is expected if zero rows pass the filter.',
      'OLS is the problem — someone applied OLS and it is hiding the data',
      'The DAX filter has a syntax error that returns zero rows; column metadata is cached separately'
    ],
    correct: 1,
    explanation:
      'RLS only filters the data rows — it has NO effect on schema and metadata visibility. Users always see all columns in the field list, regardless of their RLS role. A blank visual with the column visible simply means the DAX predicate returned zero qualifying rows for this user. The developer should verify the predicate with "Test as" to confirm whether the zero-row result is correct or an expression bug.',
    whyWrong: {
      0: 'This describes OLS (object-level security), not RLS. RLS does not affect field list or schema visibility.',
      2: 'OLS would hide the column from the field list entirely. If the column is visible, OLS is not applied here.',
      3: 'A DAX syntax error fails loudly at model deployment, not silently at query time for one user.'
    },
    source: SRC.rls,
    tags: ['security-validation', 'rls-metadata', 'schema-visibility', 'ols-vs-rls', 'exam-trap'],
    relatedIds: ['gs-017', 'rlst-017']
  }),

  multi({
    id: 'rlst-014', domain: 'semantic', subtopic: 'security-validation', difficulty: 4,
    prompt:
      'A tester sees a blank report when testing an RLS role. Before concluding "RLS is misconfigured," which checks distinguish a legitimate zero-row result from a misconfiguration? Select all that apply.',
    options: [
      'Use "Test as Other User" with a known admin UPN (who bypasses RLS) and confirm data exists in the model',
      'Inspect the DAX filter expression for the role and evaluate it manually against sample data',
      'Verify the user is actually a member of the tested role (not just assigned to a role with a similar name)',
      'Check the underlying table without RLS (e.g., via a measure using ALL() or by connecting as the model owner)',
      'Confirm the result is not a report-level filter masking data that the RLS role actually returns'
    ],
    correct: [0, 1, 2, 3, 4],
    explanation:
      'All five checks are valid and collectively provide a complete blank-vs-misconfigured diagnosis: (A) confirms data exists at all, (B) isolates a predicate logic error, (C) rules out membership gap, (D) confirms base table has qualifying rows bypassing RLS, (E) rules out a report-level filter stacking on top of RLS. An empty result can be correct (user truly has no qualifying rows) or wrong (misconfigured predicate, wrong membership, or stacked report filter). All five checks are needed for a complete validation.',
    whyWrong: {},
    source: SRC.rls,
    tags: ['security-validation', 'empty-result', 'false-positive', 'diagnosis', 'checklist'],
    relatedIds: ['rlst-013', 'rlst-005']
  }),

  // ── rls-debugging: LOOKUPVALUE BLANK, PATHCONTAINS, composite models ──

  single({
    id: 'rlst-015', domain: 'semantic', subtopic: 'rls-debugging', difficulty: 4,
    prompt:
      'An RLS role uses the expression `LOOKUPVALUE(Security[Region], Security[UserEmail], USERPRINCIPALNAME())` to derive the user\'s allowed region. User "new@contoso.com" is not in the Security table. What does the user see?',
    options: [
      'An error: "LOOKUPVALUE found no match — function failed"',
      'All rows — LOOKUPVALUE returns NULL which matches everything',
      'Zero rows — LOOKUPVALUE returns BLANK, and no [Region] value equals BLANK, so the predicate filters all rows out',
      'The default region configured in the model settings'
    ],
    correct: 2,
    explanation:
      'LOOKUPVALUE returns BLANK (not an error, not NULL, not a wildcard) when no matching row exists. The role filter then evaluates `[Region] = BLANK()` — which no real region value satisfies — silently returning zero rows. The user gets a blank report with no error message. This silent zero-row result is one of the most common dynamic RLS debugging traps: the expression is syntactically correct but produces zero rows for any user missing from the security table.',
    whyWrong: {
      0: 'LOOKUPVALUE does not error on no match. It returns BLANK and continues evaluation.',
      1: 'BLANK does NOT match everything. [Region] = BLANK() only returns rows where [Region] is BLANK — typically none.',
      3: 'There is no "default region" concept in semantic model RLS. The model has no fallback for missing users.'
    },
    source: SRC.rls,
    tags: ['rls-debugging', 'lookupvalue', 'blank-return', 'silent-zero-rows', 'exam-trap'],
    relatedIds: ['gs-010', 'rlst-014']
  }),

  single({
    id: 'rlst-016', domain: 'semantic', subtopic: 'rls-debugging', difficulty: 4,
    prompt:
      'A PATHCONTAINS-based hierarchy RLS role works correctly for mid-level managers but returns zero rows for the CEO. The CEO\'s UPN is "ceo@contoso.com". The [ReportingPath] for top-level employees looks like `ceo@contoso.com`. What is the LIKELY cause?',
    options: [
      'PATHCONTAINS is case-sensitive and "ceo@contoso.com" does not match "CEO@contoso.com"',
      'PATHCONTAINS requires at least two nodes in the path — a single-node path is not supported',
      'The CEO is in the model owner bypass group and owner bypass overrides PATHCONTAINS',
      'PATHCONTAINS expects the PATH() function to have generated the column, not a manually constructed delimited string — if the path format is non-standard, PATHCONTAINS may not parse it correctly'
    ],
    correct: 3,
    explanation:
      'PATHCONTAINS is designed to work with columns generated by the DAX PATH() function, which produces a pipe-delimited path with a specific format. If [ReportingPath] is a manually constructed string (e.g., using CONCATENATEX with a different delimiter, or a custom format), PATHCONTAINS may fail to identify the node correctly. The fix is to ensure the path column uses PATH() semantics or to rewrite the predicate using SEARCH() with the exact delimiter used.',
    whyWrong: {
      0: 'PATHCONTAINS and DAX string comparisons in RLS are case-insensitive by default in Power BI. Case difference alone would not produce zero rows for the CEO if the string otherwise matches.',
      1: 'PATHCONTAINS works correctly on single-node paths (a single value is a valid PATH output). The CEO at the top of the hierarchy should have a single-node path and PATHCONTAINS should still evaluate TRUE for them.',
      2: 'Owner bypass applies to the model owner identity, not to a role called "CEO" or a specific UPN. The CEO as an end user is not automatically a model owner.'
    },
    source: SRC.rls,
    tags: ['rls-debugging', 'pathcontains', 'hierarchy-rls', 'path-format', 'exam-trap'],
    relatedIds: ['gs-011', 'rlst-015']
  }),

  multi({
    id: 'rlst-017', domain: 'semantic', subtopic: 'rls-debugging', difficulty: 4,
    prompt:
      'An RLS role has been deployed to production and worked correctly for 3 months. After a routine model refresh, some users report seeing zero rows in previously populated reports. No role definition changes were made. Which causes should be investigated FIRST? Select all that apply.',
    options: [
      'The Security table (used in LOOKUPVALUE or bridge-table pattern) was truncated or the user rows were removed during ETL',
      'UPNs in the Security table changed (e.g., domain rename or email alias change) and no longer match USERPRINCIPALNAME()',
      'The role expressions were accidentally overwritten during a Desktop re-publish',
      'The model schema changed and the column referenced in the filter expression was renamed or removed',
      'Entra ID group membership changed — users were removed from the group assigned to the role'
    ],
    correct: [0, 1, 3, 4],
    explanation:
      'After a refresh with no role definition changes, the likeliest culprits are data-layer issues: Security table ETL truncation (A), UPN drift from domain changes (B), column renames that broke the DAX reference (D), or group membership changes removing users from the role (E). (C) requires a Desktop re-publish to be possible — if no Desktop publish happened, role expressions could not have changed.',
    whyWrong: {
      2: 'Role expressions can only change via a Desktop publish. If no Desktop publish was performed, the role expressions are unchanged. A refresh alone does not affect role definitions.'
    },
    source: SRC.rls,
    tags: ['rls-debugging', 'post-refresh-failure', 'upn-drift', 'etl-truncation', 'group-membership'],
    relatedIds: ['rlst-015', 'rlst-008']
  }),

  // ── rls-vs-warehouse-rls: semantic-model DAX vs T-SQL predicate ──

  single({
    id: 'rlst-018', domain: 'semantic', subtopic: 'rls-vs-warehouse-rls', difficulty: 3,
    prompt:
      'What is the FUNDAMENTAL difference between semantic-model RLS and Fabric Warehouse RLS?',
    options: [
      'Semantic-model RLS is enforced at the VertiPaq engine level using DAX boolean predicates; Warehouse RLS is enforced at the SQL engine level using T-SQL CREATE SECURITY POLICY with predicate functions',
      'Semantic-model RLS only applies to Import mode; Warehouse RLS applies to all storage modes',
      'Warehouse RLS is more secure because T-SQL predicates cannot be bypassed by model owners',
      'Semantic-model RLS applies to all queries; Warehouse RLS only applies to ODBC connections'
    ],
    correct: 0,
    explanation:
      'The fundamental difference is WHERE enforcement happens: semantic-model RLS is evaluated by the VertiPaq/Analysis Services engine using DAX expressions attached to roles — every query against the model is filtered. Warehouse RLS is evaluated by the SQL engine using CREATE SECURITY POLICY with an inline table-valued function predicate — only queries through the SQL surface are filtered. Direct Lake semantic models that read from a warehouse via column-segment path bypass the SQL engine, which is why warehouse RLS forces Direct Lake to fall back to DirectQuery.',
    whyWrong: {
      1: 'Semantic-model RLS applies to Import, DirectQuery, AND Direct Lake mode — it is evaluated at the model engine layer regardless of storage mode.',
      2: 'Model owners bypass semantic-model RLS in test mode; warehouse RLS via EXECUTE AS USER can also be bypassed by db_owner/sysadmin identities. Neither is uniquely secure.',
      3: 'Warehouse RLS applies to any query reaching the SQL endpoint — not just ODBC. Direct connections via Fabric portal, Power BI, XMLA, and JDBC all hit the SQL endpoint and thus warehouse RLS.'
    },
    source: SRC.rls,
    tags: ['rls-vs-warehouse-rls', 'semantic-model-rls', 'warehouse-rls', 'foundation', 'exam-trap'],
    relatedIds: ['dls-001', 'gs-012', 'rlst-019']
  }),

  order({
    id: 'rlst-019', domain: 'semantic', subtopic: 'rls-vs-warehouse-rls', difficulty: 4,
    prompt:
      'A team is migrating row-level access control from Fabric Warehouse RLS (T-SQL predicates) to semantic-model RLS (DAX roles) to avoid Direct Lake fallback. Arrange the migration steps in the CORRECT order.',
    options: [
      'Document all existing warehouse CREATE SECURITY POLICY predicates and their intended audience (which users/groups each predicate covers)',
      'Translate each predicate into an equivalent DAX filter expression and create the corresponding roles in Desktop',
      'Publish the updated semantic model with the new DAX roles to Power BI Service',
      'Assign the same users/groups to the new DAX roles in Service (Manage Permissions) and verify with "Test as" for at least one user per role',
      'Disable the warehouse CREATE SECURITY POLICY predicates ONLY after confirming the DAX roles produce equivalent filtering in production'
    ],
    shuffled: [
      'Disable the warehouse CREATE SECURITY POLICY predicates ONLY after confirming the DAX roles produce equivalent filtering in production',
      'Assign the same users/groups to the new DAX roles in Service (Manage Permissions) and verify with "Test as" for at least one user per role',
      'Document all existing warehouse CREATE SECURITY POLICY predicates and their intended audience (which users/groups each predicate covers)',
      'Translate each predicate into an equivalent DAX filter expression and create the corresponding roles in Desktop',
      'Publish the updated semantic model with the new DAX roles to Power BI Service'
    ],
    explanation:
      'Safe migration order: (1) document warehouse predicates → (2) translate to DAX roles in Desktop → (3) publish model → (4) assign members and validate with "Test as" → (5) disable warehouse RLS only after DAX parity confirmed. Disabling warehouse RLS before DAX validation is validated (step 5 first) is the compliance violation pattern. Publishing without assigning members (step 3 before step 4) would leave the model with defined-but-unassigned roles that filter no one.',
    whyWrong: {
      0: 'Disabling warehouse predicates is the LAST step — only safe after DAX parity is confirmed in production.',
      1: 'Member assignment and validation comes after publishing, not before.',
      2: 'Documentation is the first step — you cannot translate what you have not documented.',
      3: 'Translation and Desktop authoring precedes publishing.',
      4: 'Publishing to Service precedes assigning members in Service.'
    },
    source: SRC.rls,
    tags: ['rls-vs-warehouse-rls', 'migration', 'ordering', 'procedure', 'compliance'],
    relatedIds: ['rlst-018', 'dls-012']
  }),

  // ── security-validation: composite models, schema vs data ──

  multi({
    id: 'rlst-020', domain: 'semantic', subtopic: 'security-validation', difficulty: 5,
    prompt:
      'A composite model combines an Import table "Products" and a DirectQuery table "LiveSales" from a different workspace\'s semantic model. RLS roles are defined on both the outer composite model AND on the inner "LiveSales" model. Which behaviors are TRUE? Select all that apply.',
    options: [
      'The outer composite model\'s RLS roles apply to the Import "Products" table as expected',
      'The outer composite model\'s RLS roles on "LiveSales" combine with the inner model\'s RLS — the most restrictive (intersection) wins for DirectQuery-sourced tables',
      'If a user is not in any role on the INNER model, they see all inner-model rows when querying through the outer composite model',
      'Testing RLS on the outer model with "View as Role" does NOT test the inner model\'s RLS enforcement — inner model RLS must be tested independently',
      'The inner model\'s RLS is completely bypassed when a row passes the outer composite model\'s RLS filter'
    ],
    correct: [0, 2, 3],
    explanation:
      'In composite models: outer Import-table RLS works normally (A). For DirectQuery-sourced tables from an inner model, the INNER model\'s RLS is evaluated independently based on the user\'s identity on that model (not stacked with the outer model\'s rules). If the user has no role on the inner model, they see all inner rows through the outer model (C) — a common security gap. "View as Role" on the outer model does not simulate the inner model\'s RLS context (D). (B) is wrong — the two layers do not intersect; they evaluate independently, which is the trap. (E) is wrong — the inner model\'s RLS is NOT bypassed; it evaluates using the user\'s actual identity on the inner model service principal.',
    whyWrong: {
      1: 'Outer and inner model RLS do NOT combine as intersection. Each model evaluates its own RLS independently based on the user\'s identity in that model\'s context. They do not stack in an AND relationship.',
      4: 'Inner model RLS is never bypassed by the outer composite model\'s filter. The inner model applies its own RLS using the calling user\'s effective identity.'
    },
    source: SRC.rls,
    tags: ['security-validation', 'composite-models', 'inner-outer-rls', 'exam-trap', 'directquery'],
    relatedIds: ['rlst-013', 'gs-012', 'dls-001']
  })
];
