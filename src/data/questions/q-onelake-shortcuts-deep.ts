// OneLake Shortcuts deep-dive — closes a Prepare-domain gap (47.5% blueprint).
// Covers all shortcut target types, the delegated-trust security model, OPDR,
// shortcut vs ingest vs mirroring trade-offs, Tables/ vs Files/ semantics, and
// live-pointer (no-refresh) behavior.

import type { Question, SourceAnchor } from '../../lib/schema';
import { single, multi, order } from './_helpers';

const SRC: SourceAnchor = {
  category: 'onelake-shortcuts-deep',
  note: 'OneLake shortcuts: targets, auth, delegated trust, OPDR, Tables/ vs Files/, vs ingest/mirroring'
};

export const onelakeShortcutsDeep: Question[] = [
  // ── ADLS Gen2 / Azure Storage (4) ────────────────────────────
  single({
    id: 'olsh-001', domain: 'prepare', subtopic: 'onelake-azure-shortcut', difficulty: 3,
    prompt: 'You are creating a OneLake shortcut to data sitting in `https://contoso.dfs.core.windows.net/raw/sales/`. Which storage namespace MUST be enabled on the source account for this shortcut target type to work as documented?',
    options: [
      'Hierarchical namespace (HNS) enabled — i.e., ADLS Gen2 (the `dfs.` endpoint), not flat Blob',
      'Classic Blob storage with HNS disabled — Gen2 is not supported',
      'Premium Block Blob with object replication enabled',
      'Azure Files (SMB) with NFS 4.1 enabled'
    ],
    correct: 0,
    explanation: 'OneLake ADLS shortcuts target ADLS Gen2 — accounts with hierarchical namespace enabled (the `dfs.core.windows.net` endpoint). Flat Blob without HNS is not the documented shortcut target shape because Fabric expects Gen2 directory semantics.',
    whyWrong: {
      1: 'Flat Blob (HNS disabled) is not the documented ADLS shortcut target — Gen2/HNS is required.',
      2: 'Premium Block Blob and object replication are unrelated capabilities.',
      3: 'Azure Files / NFS is a separate service entirely; not a shortcut target.'
    },
    source: SRC,
    tags: ['shortcut', 'adls-gen2', 'hns']
  }),

  multi({
    id: 'olsh-002', domain: 'prepare', subtopic: 'onelake-azure-shortcut', difficulty: 4,
    prompt: 'Which authentication options are SUPPORTED when creating a OneLake shortcut to ADLS Gen2?',
    options: [
      'Account key',
      'Shared Access Signature (SAS) token',
      'Organizational account (OAuth / Microsoft Entra ID)',
      'Anonymous public access without any credential'
    ],
    correct: [0, 1, 2],
    explanation: 'ADLS Gen2 shortcuts accept account key, SAS, and Entra ID (OAuth) auth at create time. Each is stored as a connection on the shortcut. Anonymous public-access "shortcuts" are not supported — Fabric always materializes a credential binding.',
    whyWrong: {
      3: 'Even if the source bucket allows anonymous reads, the shortcut requires an explicit auth method when created.'
    },
    source: SRC,
    tags: ['shortcut', 'adls-gen2', 'auth']
  }),

  single({
    id: 'olsh-003', domain: 'prepare', subtopic: 'onelake-security', difficulty: 4,
    prompt: 'A user creates an ADLS Gen2 shortcut authenticated with an account key. A second workspace user (Member role) queries the table via the SQL endpoint. Whose credentials are presented to ADLS at read time?',
    options: [
      'The shortcut creator\'s — shortcuts use delegated trust by default; the stored connection credential is used for downstream reads',
      'The querying user\'s personal Entra ID token — every read passes through the user\'s identity',
      'A managed identity assigned to the workspace, regardless of shortcut configuration',
      'No credential — once created, shortcuts read from cached metadata only'
    ],
    correct: 0,
    explanation: 'By default OneLake shortcuts use delegated trust: the connection credentials supplied at create time (account key, SAS, or the creator\'s OAuth refresh token) are reused for all downstream reads. This is the most-missed detail of shortcut security and the foundation for OPDR being an opt-in alternative.',
    whyWrong: {
      1: 'User-identity passthrough requires OPDR (OneLake Data Pass-through Role) and AAD-based shortcuts — not the default.',
      2: 'There is no automatic workspace-managed identity that overrides shortcut credentials.',
      3: 'Shortcuts are live pointers; reads always hit the source with the stored credential.'
    },
    source: SRC,
    tags: ['shortcut', 'security', 'delegated-trust']
  }),

  single({
    id: 'olsh-004', domain: 'prepare', subtopic: 'onelake-security', difficulty: 5,
    prompt: 'A bank requires that ADLS reads triggered through a OneLake shortcut be auditable to the END USER (not the shortcut creator) so source-side ACLs and conditional-access policies apply per-query. Which Fabric feature enables this?',
    options: [
      'Configure the shortcut with OneLake Data Pass-through Role (OPDR) using an Entra ID-based connection so the querying user\'s token is presented to ADLS',
      'Recreate the shortcut with an account key — keys auto-resolve to the user',
      'Switch the workspace to a Premium-per-User capacity',
      'Enable V-Order on the destination Lakehouse'
    ],
    correct: 0,
    explanation: 'OneLake Data Pass-through (OPDR / user-identity passthrough) lets ADLS reads be performed under the querying user\'s Entra ID token instead of the shortcut creator\'s stored credential. This makes source-side ACLs, conditional access, and audit logs work per-user — the regulated-bank requirement.',
    whyWrong: {
      1: 'Account keys are NOT user-scoped; they are a single shared secret. This breaks the audit requirement.',
      2: 'PPU is a license SKU and does not change shortcut auth semantics.',
      3: 'V-Order is a Parquet-encoding optimization unrelated to authentication.'
    },
    source: SRC,
    tags: ['shortcut', 'opdr', 'security', 'audit']
  }),

  // ── Amazon S3 (3) ───────────────────────────────────────────
  single({
    id: 'olsh-005', domain: 'prepare', subtopic: 'onelake-s3-shortcut', difficulty: 3,
    prompt: 'Which credential pair does Fabric require when creating a OneLake shortcut to an Amazon S3 bucket?',
    options: [
      'AWS access key ID + secret access key for an IAM principal with `s3:GetObject` and `s3:ListBucket` on the target prefix',
      'An AWS account number alone — no key required for read-only',
      'A Microsoft Entra ID service principal — Fabric brokers the AWS call',
      'An S3 presigned URL paste in the source field'
    ],
    correct: 0,
    explanation: 'S3 shortcuts use an AWS IAM access-key-ID / secret-access-key pair tied to a principal granted at minimum `s3:GetObject` and `s3:ListBucket` on the bucket and prefix. Entra IDs do not federate into AWS automatically; presigned URLs are not the supported shortcut auth.',
    whyWrong: {
      1: 'AWS account numbers are identifiers, not credentials.',
      2: 'Entra ID does not directly authenticate to AWS S3 without a configured federation that Fabric does not perform for shortcuts.',
      3: 'Presigned URLs expire and are not the documented shortcut auth pattern.'
    },
    source: SRC,
    tags: ['shortcut', 's3', 'iam']
  }),

  multi({
    id: 'olsh-006', domain: 'prepare', subtopic: 'onelake-s3-shortcut', difficulty: 4,
    prompt: 'Which statements about S3 shortcut PERMISSION scoping are TRUE?',
    options: [
      'The IAM permissions are bucket / prefix-scoped; you cannot grant per-object access via the shortcut layer',
      'The shortcut grants access at create time but Fabric does NOT propagate AWS-side ACL changes — revoking access in IAM revokes shortcut reads on the next request',
      'Region matters — the shortcut configuration includes the bucket region for endpoint routing',
      'S3 shortcuts honor the querying user\'s personal AWS identity for each query'
    ],
    correct: [0, 1, 2],
    explanation: 'IAM policies on S3 are bucket / prefix scoped. The shortcut stores an access-key pair at create time but reads always hit AWS live, so revocation in IAM takes effect immediately. The bucket region is part of the shortcut config to route to the correct S3 endpoint. There is no per-user AWS identity passthrough — S3 shortcuts always present the stored access key.',
    whyWrong: {
      3: 'There is no per-query user-identity passthrough to AWS; the stored IAM key is used for every read.'
    },
    source: SRC,
    tags: ['shortcut', 's3', 'permissions', 'region']
  }),

  single({
    id: 'olsh-007', domain: 'prepare', subtopic: 'onelake-s3-shortcut', difficulty: 4,
    prompt: 'A team\'s S3-shortcut Lakehouse query is suddenly returning 403 errors. The IAM policy was unchanged. Which is the MOST likely root cause?',
    options: [
      'The IAM access key stored on the shortcut connection was rotated / disabled in AWS, invalidating the credential the shortcut presents',
      'V-Order needs to be re-enabled on the source bucket',
      'OneLake automatically copies S3 data, and the local cache is corrupt',
      'A new region must be configured in the workspace settings'
    ],
    correct: 0,
    explanation: 'Shortcuts are LIVE pointers — each read presents the stored credential to the source. If that AWS access key is rotated or disabled, every subsequent read 403s until the connection is updated with a fresh key. Credential-rotation drift is the most common silent break for cross-cloud shortcuts.',
    whyWrong: {
      1: 'V-Order is a Parquet encoding setting on Fabric-written data; it has no role on a source S3 bucket.',
      2: 'OneLake shortcuts do NOT copy data into Fabric; there is no local cache to corrupt.',
      3: 'Region is per-shortcut, not workspace-wide; this would not produce a sudden 403.'
    },
    source: SRC,
    tags: ['shortcut', 's3', 'troubleshooting', 'rotation']
  }),

  // ── Google Cloud Storage (2) ────────────────────────────────
  single({
    id: 'olsh-008', domain: 'prepare', subtopic: 'onelake-gcs-shortcut', difficulty: 3,
    prompt: 'Which credential type does Fabric require to create a OneLake shortcut to a Google Cloud Storage (GCS) bucket?',
    options: [
      'GCS HMAC keys (access ID + secret) generated for a Google service account',
      'A Google OAuth user account interactively signed in',
      'A GCP service-account JSON key file uploaded directly',
      'A Workload Identity Federation token'
    ],
    correct: 0,
    explanation: 'GCS shortcuts authenticate using HMAC keys — an access-ID + secret pair generated for a service account in Google Cloud. This mirrors the S3-style access-key model and is what the shortcut UI accepts.',
    whyWrong: {
      1: 'Interactive OAuth sign-in is not the supported GCS shortcut auth path.',
      2: 'JSON service-account keys are not the documented credential format for GCS shortcuts; HMAC is.',
      3: 'Workload Identity Federation requires Google-side trust setup that Fabric does not natively perform here.'
    },
    source: SRC,
    tags: ['shortcut', 'gcs', 'hmac']
  }),

  single({
    id: 'olsh-009', domain: 'prepare', subtopic: 'onelake-gcs-shortcut', difficulty: 4,
    prompt: 'A multi-cloud team shortcuts the SAME logical "events" dataset from S3, GCS, and ADLS Gen2 into one Lakehouse. Which statement about the resulting data movement and cost is MOST accurate?',
    options: [
      'No bytes are copied into OneLake — each read fans out to the respective cloud and may incur EGRESS charges from S3 / GCS / ADLS on every query',
      'Fabric automatically caches the first read locally so subsequent queries do not incur egress',
      'Egress is free for all three providers when consumed by Microsoft Fabric',
      'Data is copied once at shortcut-create time and reads are local'
    ],
    correct: 0,
    explanation: 'Shortcuts are virtual references with no copy; every read goes to the source. Cross-cloud reads from S3 / GCS / ADLS will incur whatever egress charges the source provider levies — a critical cost-model gotcha when picking shortcuts for hot-path query workloads.',
    whyWrong: {
      1: 'Shortcuts do not provide a guaranteed Fabric-side cache that eliminates source reads; downstream caches are best-effort and not cost-mitigation primitives.',
      2: 'Egress is billed by the source cloud provider; Microsoft does not waive AWS / GCP egress.',
      3: 'No shortcut copies data at create time; the whole point is zero-copy live pointers.'
    },
    source: SRC,
    tags: ['shortcut', 'multi-cloud', 'egress', 'cost']
  }),

  // ── Dataverse (2) ────────────────────────────────────────────
  multi({
    id: 'olsh-010', domain: 'prepare', subtopic: 'onelake-dataverse-shortcut', difficulty: 4,
    prompt: 'Which statements about the Dataverse → OneLake shortcut path (via "Link to Microsoft Fabric") are TRUE?',
    options: [
      'Configuration is initiated from the Power Apps / Dataverse maker portal, not from inside Fabric',
      'You select which Dataverse tables to expose; only chosen tables become shortcuts in the destination workspace',
      'Data lands in OneLake as Delta tables and stays in sync with Dataverse near-real-time without explicit refresh schedules',
      'Each query against the shortcut runs an interactive Dataverse API call, billed against the user\'s Dataverse capacity'
    ],
    correct: [0, 1, 2],
    explanation: 'Link to Microsoft Fabric is initiated from Dataverse, exposes selected tables as Delta in OneLake via shortcut, and keeps them in sync continuously. Reads against the OneLake shortcut hit Delta — they do NOT round-trip to the Dataverse Web API per query.',
    whyWrong: {
      3: 'Shortcut reads hit the Delta files in OneLake, not the Dataverse Web API; no per-query Dataverse capacity charge.'
    },
    source: SRC,
    tags: ['shortcut', 'dataverse', 'link-to-fabric']
  }),

  single({
    id: 'olsh-011', domain: 'prepare', subtopic: 'onelake-dataverse-shortcut', difficulty: 4,
    prompt: 'You configured Link to Microsoft Fabric for Dataverse and now want to ADD two more tables to the shortcut. What is the correct path?',
    options: [
      'Open Link to Microsoft Fabric in the Power Apps maker portal, edit the table selection, and save — Fabric automatically extends the shortcut',
      'Drop the workspace and recreate the link from scratch',
      'Use Dataflow Gen2 to import the new tables alongside the existing shortcut',
      'Manually create file-level OneLake shortcuts to the Dataverse blob store'
    ],
    correct: 0,
    explanation: 'Adding tables is done by editing the Link to Microsoft Fabric configuration in the Power Apps maker portal. The new tables are projected into the same workspace shortcut automatically — no destructive reset, no workaround dataflow.',
    whyWrong: {
      1: 'Destroying and recreating is wasteful and unnecessary; the link is editable.',
      2: 'Mixing in Dataflow Gen2 reintroduces copies and refresh schedules — defeats the shortcut benefit.',
      3: 'There is no documented "raw blob store" path; you go through the Dataverse-managed shortcut surface.'
    },
    source: SRC,
    tags: ['shortcut', 'dataverse', 'configuration']
  }),

  // ── Internal / cross-workspace (3) ──────────────────────────
  single({
    id: 'olsh-012', domain: 'prepare', subtopic: 'onelake-internal-shortcut', difficulty: 3,
    prompt: 'Workspace A owns a curated `dim_customer` Delta table in `LakehouseGold`. Workspace B (a downstream BI team) needs to query it without copying. What is the recommended Fabric pattern?',
    options: [
      'Create a OneLake internal shortcut in a Workspace B Lakehouse pointing to `LakehouseGold.dim_customer` in Workspace A',
      'Export `dim_customer` to Parquet and ingest with Copy Activity into Workspace B',
      'Mirror Workspace A into Workspace B',
      'Publish a Dataflow Gen2 in Workspace B that queries Workspace A via a gateway'
    ],
    correct: 0,
    explanation: 'Internal OneLake shortcuts are designed exactly for cross-workspace consumption of a Lakehouse / Warehouse table without duplication. The downstream workspace gets a live pointer; storage and lineage stay attached to the source.',
    whyWrong: {
      1: 'Copy Activity duplicates data and adds refresh lag — the opposite of the shortcut benefit.',
      2: 'Mirroring is for external operational databases (Azure SQL, Snowflake), not Fabric-to-Fabric.',
      3: 'Dataflows copy data into a destination and add refresh management; gateways are unrelated for Fabric-to-Fabric.'
    },
    source: SRC,
    tags: ['shortcut', 'internal', 'cross-workspace']
  }),

  multi({
    id: 'olsh-013', domain: 'prepare', subtopic: 'onelake-internal-shortcut', difficulty: 4,
    prompt: 'Which statements about INTERNAL Fabric (Lakehouse → Lakehouse / Warehouse) shortcuts are TRUE?',
    options: [
      'Permissions on the shortcut respect the SOURCE item\'s workspace roles — a user without read on the source workspace cannot read through the shortcut',
      'Internal shortcuts work across workspaces in the same Fabric tenant, including across capacities',
      'Internal shortcuts can target both Lakehouse Tables/ folders and Warehouse table OneLake paths because both store as Delta',
      'Internal shortcuts copy a Delta snapshot into the destination workspace at create time'
    ],
    correct: [0, 1, 2],
    explanation: 'Internal shortcuts are zero-copy live pointers that respect source-workspace permissions, span workspaces / capacities within the tenant, and work against both Lakehouse and Warehouse OneLake paths because both materialize Delta. They never copy on create — that would defeat the purpose.',
    whyWrong: {
      3: 'No copy occurs; the shortcut is a virtual reference. The source files are read live every query.'
    },
    source: SRC,
    tags: ['shortcut', 'internal', 'permissions', 'warehouse']
  }),

  single({
    id: 'olsh-014', domain: 'prepare', subtopic: 'onelake-internal-shortcut', difficulty: 5,
    prompt: 'A user can SEE an internal shortcut named `dim_customer` in their Lakehouse but every SELECT against it returns "access denied". They have full Member role on the consuming workspace. What is the MOST likely cause?',
    options: [
      'The user lacks read permissions on the SOURCE Lakehouse / workspace where `dim_customer` actually lives — internal shortcuts do not bypass source-side ACLs',
      'The shortcut needs to be refreshed; internal shortcuts have a 24h cache TTL',
      'The destination workspace must be on the same capacity SKU as the source',
      'V-Order must be enabled on the source for cross-workspace reads to succeed'
    ],
    correct: 0,
    explanation: 'Internal shortcuts inherit source-side authorization. Visibility of the shortcut object in the consuming Lakehouse is independent of read permission on the underlying data — the user must also have access to the source item. This is the "I can see it but not read it" trap.',
    whyWrong: {
      1: 'Shortcuts have no documented "24h refresh" — they are live pointers, not cached snapshots.',
      2: 'Capacity SKUs do not need to match across source / destination workspaces.',
      3: 'V-Order is encoding-time; it does not control authorization.'
    },
    source: SRC,
    tags: ['shortcut', 'internal', 'permissions', 'troubleshooting']
  }),

  // ── Tables/ vs Files/ (2) ───────────────────────────────────
  single({
    id: 'olsh-015', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 3,
    prompt: 'A Lakehouse has two top-level folders, `Tables/` and `Files/`. A shortcut placed under `Tables/` points to a folder of Parquet files that is NOT a Delta table. What is the result?',
    options: [
      'The shortcut will not register as a queryable table — `Tables/` only auto-registers Delta-formatted folders; raw Parquet must live under `Files/`',
      'The shortcut auto-converts the Parquet files to Delta on registration',
      'The shortcut is silently moved to `Files/` by Fabric',
      'It registers as a table but every SELECT errors with "schema unknown"'
    ],
    correct: 0,
    explanation: '`Tables/` in a Lakehouse is the Delta-aware namespace — only Delta-formatted folders auto-register as tables in the SQL endpoint and Spark catalog. Raw Parquet (or CSV / JSON) belongs under `Files/` for unstructured / passthrough access.',
    whyWrong: {
      1: 'Lakehouse does not auto-convert Parquet to Delta on shortcut creation.',
      2: 'Fabric does not silently relocate user-created shortcuts.',
      3: 'It does not register at all; the table simply does not appear.'
    },
    source: SRC,
    tags: ['shortcut', 'tables-vs-files', 'delta']
  }),

  single({
    id: 'olsh-016', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 4,
    prompt: 'Spark code reads a shortcut via `abfss://<workspace>@onelake.dfs.fabric.microsoft.com/<lakehouse>.Lakehouse/Files/raw/events/`. Which statement about the URI shape is TRUE?',
    options: [
      'OneLake exposes a `dfs.fabric.microsoft.com` endpoint that mirrors ADLS Gen2 semantics; existing Spark Hadoop tooling can read shortcuts using standard `abfss://` URIs',
      'Spark must use a custom `onelake://` scheme; `abfss://` is not supported',
      'Shortcuts cannot be read by their absolute path — only via Spark catalog short names',
      'The path requires a SAS token appended for authorization'
    ],
    correct: 0,
    explanation: 'OneLake intentionally exposes an ADLS-Gen2-compatible `dfs.fabric.microsoft.com` endpoint so existing Spark / Hadoop ecosystem tools (`abfss://`) work without modification. Shortcuts appear as folders under this path; auth flows through the Spark session\'s identity, not query-string SAS.',
    whyWrong: {
      1: 'There is no `onelake://` scheme; OneLake speaks ADLS Gen2.',
      2: 'Shortcuts are absolutely path-addressable; that\'s the whole point of being a filesystem-shaped namespace.',
      3: 'Authorization is handled by the workspace identity / Spark session, not URL-appended SAS.'
    },
    source: SRC,
    tags: ['shortcut', 'spark', 'abfss', 'onelake-uri']
  }),

  // ── Live-pointer / refresh / cache (2) ──────────────────────
  single({
    id: 'olsh-017', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 3,
    prompt: 'A team adds a daily "refresh shortcut" pipeline activity to keep their S3 shortcut current. A reviewer says this is unnecessary. Why?',
    options: [
      'Shortcuts are LIVE pointers — every query reads the current source state. There is no refresh job because there is no copy to refresh',
      'Refresh is required only on internal shortcuts, not S3',
      'The pipeline activity actually breaks the shortcut',
      'Refresh is only required for Delta shortcuts, not Parquet'
    ],
    correct: 0,
    explanation: 'OneLake shortcuts are live virtual references. Each query goes to the source and sees current data. Refresh jobs make sense for COPIES (Dataflow Gen2, Copy Activity). Adding a refresh step on a shortcut is a no-op pattern that wastes capacity.',
    whyWrong: {
      1: 'Internal shortcuts are also live pointers; no refresh required.',
      2: 'There is no "shortcut refresh" activity; the no-op is wasted effort, not breakage.',
      3: 'The Delta / Parquet distinction does not introduce a refresh requirement on shortcuts.'
    },
    source: SRC,
    tags: ['shortcut', 'live-pointer', 'no-refresh']
  }),

  single({
    id: 'olsh-018', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 4,
    prompt: 'A query hitting an ADLS Gen2 shortcut shows occasional latency spikes that don\'t correlate with source load. The SQL endpoint maintains a query-result cache and OneLake itself can cache file metadata. What is the SAFE action when consumers report seeing stale data after a known source overwrite?',
    options: [
      'Invalidate the relevant query / SQL endpoint caches and let the next read re-fetch — shortcut metadata coherence is best handled by clearing the consumption-side cache, not by mutating the shortcut',
      'Delete and recreate the shortcut for every source change',
      'Disable all caching globally on the workspace',
      'Switch to a Mirroring source instead — caches do not apply to mirrored data'
    ],
    correct: 0,
    explanation: 'Shortcut staleness is almost always a consumption-side cache (SQL endpoint result cache, semantic-model framing, or OneLake metadata cache) — not the shortcut itself. Invalidate caches first; reserve recreate-shortcut for actual schema or path changes. Mirroring also caches.',
    whyWrong: {
      1: 'Recreating the shortcut is heavy-handed and breaks dependent objects unnecessarily.',
      2: 'Disabling all caching tanks performance and is not the documented mitigation.',
      3: 'Mirroring also has its own consumption caches — switching engines does not eliminate the issue.'
    },
    source: SRC,
    tags: ['shortcut', 'cache', 'staleness', 'troubleshooting']
  }),

  // ── Limits / shortcut-of-shortcut (1) ───────────────────────
  single({
    id: 'olsh-019', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 4,
    prompt: 'Workspace C creates an internal shortcut to a Workspace B shortcut, which in turn points to an ADLS Gen2 source. Which statement BEST describes Fabric\'s handling of nested / chained shortcuts?',
    options: [
      'Fabric documents a maximum shortcut chain depth — chains beyond the documented depth are blocked or fail to resolve, so design for short chains and prefer pointing each consumer directly at the canonical source',
      'Chained shortcuts are unlimited and recommended for hub-and-spoke topology',
      'Fabric automatically flattens chains so depth never matters',
      'Chained shortcuts always fail at create time'
    ],
    correct: 0,
    explanation: 'There is a documented maximum chain depth for shortcuts; very deep chains either fail to resolve or are blocked at create time. The right pattern is to keep chains shallow — point each consumer at the canonical source (or one hop) rather than building deep referral graphs that are brittle and hard to debug.',
    whyWrong: {
      1: 'Unlimited chaining is not supported and not recommended due to depth limits and resolution complexity.',
      2: 'There is no automatic flattening; resolution traverses the chain.',
      3: 'A single chain hop is supported; only excessive depth is blocked.'
    },
    source: SRC,
    tags: ['shortcut', 'chain-depth', 'limits']
  }),

  // ── Trade-off: shortcut vs ingest vs mirroring (3 scenarios) ──
  single({
    id: 'olsh-020', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 4,
    prompt: 'SCENARIO: A data team must expose 12 TB of historical Parquet files in ADLS Gen2 to Fabric Power BI consumers. The data is read-mostly, refresh window is "daily is fine", and the team wants to MINIMIZE Fabric storage cost. Which approach FITS BEST?',
    options: [
      'OneLake ADLS shortcut — zero-copy means no Fabric storage charge for the 12 TB; reads stream from ADLS',
      'Pipeline Copy Activity to bulk-load into a Lakehouse daily — incurs 12 TB of Fabric storage',
      'Dataflow Gen2 to copy with transformations — incurs storage + dataflow compute',
      'Mirroring — but ADLS Gen2 is not a mirroring source'
    ],
    correct: 0,
    explanation: 'Read-mostly historical data with daily refresh tolerance is the ideal shortcut workload — zero-copy avoids 12 TB of Fabric storage cost, and the daily-refresh tolerance means latency is not the constraint. Copy / Dataflow duplicate storage; mirroring does not target ADLS.',
    whyWrong: {
      1: 'Copy duplicates storage — exactly what the cost requirement rules out.',
      2: 'Dataflow Gen2 also copies storage and adds compute cost on top.',
      3: 'ADLS Gen2 is not a Mirroring source — Mirroring targets operational databases (Azure SQL DB, Cosmos, Snowflake).'
    },
    source: SRC,
    tags: ['shortcut', 'scenario', 'cost', 'tradeoff']
  }),

  single({
    id: 'olsh-021', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 4,
    prompt: 'SCENARIO: An e-commerce app on Azure SQL DB has high transactional write rates and the analytics team needs near-real-time read access in Fabric (lag tolerance: under 1 minute) without affecting OLTP performance. Which approach FITS BEST?',
    options: [
      'Mirroring — Fabric Mirroring replicates Azure SQL DB to OneLake near-real-time with no impact on the OLTP workload, and the result is queryable like any Delta in Fabric',
      'A OneLake shortcut to Azure SQL DB — same-day refresh, zero copy',
      'A Dataflow Gen2 polling every minute',
      'A pipeline running Copy Activity every minute'
    ],
    correct: 0,
    explanation: 'Mirroring is the right pattern for near-real-time replication of operational SQL databases into Fabric — sub-minute lag, no OLTP impact, queryable as Delta. OneLake shortcuts do NOT target Azure SQL DB (they target object storage / Fabric items / Dataverse), so option B is a category error.',
    whyWrong: {
      1: 'Azure SQL DB is NOT a OneLake shortcut target; shortcuts cover ADLS, S3, GCS, Dataverse, and internal Fabric items.',
      2: '1-minute Dataflow refresh creates load and is brittle versus near-real-time mirroring.',
      3: 'Per-minute Copy Activity is even more expensive and has worse latency floor than mirroring.'
    },
    source: SRC,
    tags: ['shortcut', 'scenario', 'mirroring', 'tradeoff']
  }),

  single({
    id: 'olsh-022', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 5,
    prompt: 'SCENARIO: An ML team needs to do heavy iterative Spark joins on a 4 TB historical dataset currently living in S3. Each training run scans the full dataset 6 times. Per-query egress from S3 is becoming the dominant cost. Which approach FITS BEST?',
    options: [
      'Replace the S3 shortcut with a one-time INGEST (Copy Activity) into a Lakehouse — eliminates repeated S3 egress and lets V-Order / Delta optimizations apply',
      'Keep the S3 shortcut and increase Fabric capacity to amortize egress',
      'Add a second S3 shortcut and load-balance reads',
      'Switch to Mirroring from S3'
    ],
    correct: 0,
    explanation: 'Heavy repeated reads against a cross-cloud shortcut blow up egress costs (each scan hits S3). When the workload is read-heavy and stable, ingesting once into Fabric eliminates egress, enables V-Order / Delta optimizations, and improves Spark scan performance. Shortcuts are best for cold / occasional access; ingest wins for hot iterative workloads.',
    whyWrong: {
      1: 'More Fabric capacity does not reduce AWS egress charges.',
      2: 'Multiple shortcuts to the same data multiply, not divide, egress.',
      3: 'Mirroring does not target S3 object storage — it is for operational DBs.'
    },
    source: SRC,
    tags: ['shortcut', 'scenario', 'egress', 'ingest', 'tradeoff']
  }),

  // ── Ordering questions (2) ──────────────────────────────────
  order({
    id: 'olsh-023', domain: 'prepare', subtopic: 'onelake-shortcuts', difficulty: 4,
    prompt: 'Order the steps to create a OneLake shortcut from a Fabric Lakehouse to a folder in Amazon S3:',
    options: [
      'Provision an AWS IAM principal with s3:GetObject and s3:ListBucket on the target bucket / prefix and generate an access-key + secret pair',
      'In the Lakehouse, choose New shortcut → Amazon S3, then enter the bucket URL and region',
      'Paste the AWS access-key ID and secret-access-key into the connection dialog, save the connection',
      'Validate that the new shortcut resolves: query a sample file via the SQL endpoint or Spark and confirm row counts match the source'
    ],
    explanation: 'IAM permissions and key generation are PREREQUISITES — without them the shortcut create flow has no credential to validate. Then create the shortcut, attach the connection, and FINALLY validate with a real read so you catch credential / region / prefix mistakes immediately.',
    source: SRC,
    tags: ['shortcut', 's3', 'workflow', 'ordering']
  }),

  order({
    id: 'olsh-024', domain: 'prepare', subtopic: 'onelake-security', difficulty: 5,
    prompt: 'Order the steps to convert an existing ADLS Gen2 shortcut from delegated-trust (account-key) to OPDR user-identity passthrough:',
    options: [
      'Confirm source-side ADLS ACLs grant the relevant Entra ID users / groups direct read access at the path the shortcut targets',
      'Create a new ADLS connection in Fabric using Organizational account (Entra ID / OAuth) authentication',
      'Edit the shortcut to use the new Entra-ID-based connection with OPDR / user-identity passthrough enabled',
      'Validate that an end-user query through the SQL endpoint shows their identity in ADLS audit logs (not the original creator\'s)'
    ],
    explanation: 'Source-side ACLs MUST be in place first or every passthrough query will 403. Then build the Entra-ID connection, switch the shortcut to use it with OPDR, and verify by reading the ADLS audit log to confirm the right principal is being presented per query.',
    source: SRC,
    tags: ['shortcut', 'opdr', 'workflow', 'ordering']
  }),

  // ── Capstone multi-select on full security model ────────────
  multi({
    id: 'olsh-025', domain: 'prepare', subtopic: 'onelake-security', difficulty: 5,
    prompt: 'Which statements describe the OneLake shortcut security model CORRECTLY?',
    options: [
      'By default, shortcuts use delegated trust — the credential supplied at create time is presented to the source for every downstream read',
      'OPDR (user-identity passthrough) is opt-in and requires Entra ID-based connections; it changes the auth principal per-query to the end user',
      'Internal Fabric shortcuts respect the SOURCE workspace\'s permissions, even when the shortcut is consumed in a different workspace',
      'Creating a shortcut grants the workspace blanket read access on the underlying source storage, regardless of source-side ACLs'
    ],
    correct: [0, 1, 2],
    explanation: 'The three pillars of shortcut security: (1) default delegated trust uses the stored connection credential, (2) OPDR is the opt-in alternative that flows the user\'s Entra ID token to the source, and (3) internal shortcuts always honor source-workspace permissions. Shortcuts NEVER auto-grant ACLs — that would be a security hole.',
    whyWrong: {
      3: 'Shortcuts are not a privilege-elevation mechanism. Source-side ACLs always govern actual data access; the shortcut only stores or proxies a credential.'
    },
    source: SRC,
    tags: ['shortcut', 'security', 'capstone', 'opdr']
  })
];
