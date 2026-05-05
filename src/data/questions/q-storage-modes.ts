import type { Question } from '../../lib/schema';
import { single, multi, SRC } from './_helpers';

export const storageModes: Question[] = [
  single({
    id: 'sm-001', domain: 'semantic', subtopic: 'storage-modes', difficulty: 2,
    prompt: 'Which storage mode physically copies data into the model file and requires a scheduled refresh to update?',
    options: ['DirectQuery', 'Direct Lake', 'Import', 'Live connection'],
    correct: 2,
    explanation: 'Import compresses and stores data inside the model. The data is only as fresh as the last refresh.',
    whyWrong: {
      0: 'DirectQuery stores no data; it pushes every query down to the source.',
      1: 'Direct Lake reads Delta files on demand without scheduled refresh.',
      3: 'Live connection delegates everything to a remote Analysis Services model.'
    },
    source: SRC.storageModes,
    tags: ['storage-modes', 'import']
  }),
  single({
    id: 'sm-002', domain: 'semantic', subtopic: 'storage-modes', difficulty: 3,
    prompt: 'A 4 TB on-prem warehouse cannot be imported, but the BI team needs interactive reports against it. Which storage mode is the right starting point?',
    options: ['Import with incremental refresh', 'DirectQuery', 'Direct Lake', 'Composite (Import + DirectQuery)'],
    correct: 1,
    explanation: 'DirectQuery delegates queries to the source. For a 4 TB on-prem warehouse that cannot be moved or duplicated to Fabric, DirectQuery is the only mode that respects the constraint while exposing reports.',
    whyWrong: {
      0: 'Incremental refresh still requires importing partitions; 4 TB is impractical to host in the model.',
      2: 'Direct Lake requires Delta in OneLake; the source is on-prem.',
      3: 'Composite still requires Import for at least part — but if "no data movement" is the constraint, composite is overkill vs straight DirectQuery.'
    },
    source: SRC.storageModes,
    tags: ['storage-modes', 'directquery']
  }),
  multi({
    id: 'sm-003', domain: 'semantic', subtopic: 'storage-modes', difficulty: 4,
    prompt: 'Which statements are TRUE about composite models?',
    options: [
      'You can mix Import for small dimensions with DirectQuery for a large fact',
      'A single composite model can mix Direct Lake + Import storage modes',
      'Cross-source relationships in composite models always perform identically to single-source models',
      'Composite models can introduce limited relationship behavior (regular vs limited) depending on which side of the relationship is in which mode'
    ],
    correct: [0, 1, 3],
    explanation: 'Composite models support the dim/fact mix (Import + DirectQuery) and Import + Direct Lake hybrids. Cross-source / cross-mode joins frequently become "limited relationships" with different filtering and performance behavior than regular relationships.',
    whyWrong: {
      2: 'Composite cross-source relationships often degrade to limited relationships and are NOT the same as single-source.'
    },
    source: SRC.storageModes,
    tags: ['composite', 'limited-relationship']
  }),
  single({
    id: 'sm-004', domain: 'semantic', subtopic: 'storage-modes', difficulty: 3,
    prompt: 'A relationship between an Import dim and a DirectQuery fact in a composite model is most accurately described as which type?',
    options: ['Regular relationship', 'Limited relationship', 'Bi-directional relationship', 'No relationship — composite forbids cross-mode joins'],
    correct: 1,
    explanation: 'Cross-storage-mode relationships in composite models become "limited" relationships, which have weaker filter propagation and require runtime evaluation that is more expensive.',
    whyWrong: {
      0: 'Regular relationships exist within a single source. Crossing modes makes them limited.',
      2: 'Bi-directional is a separate dimension (cardinality direction), not the type of relationship.',
      3: 'Composite explicitly supports cross-mode joins; they\'re just limited relationships.'
    },
    source: SRC.storageModes,
    tags: ['composite', 'limited-relationship']
  }),
  single({
    id: 'sm-005', domain: 'semantic', subtopic: 'storage-modes', difficulty: 2,
    prompt: 'In which storage mode is data freshness limited only by the data-source\'s commit cadence (no model-side refresh job)?',
    options: ['Import', 'DirectQuery', 'Direct Lake', 'Live connection'],
    correct: 2,
    explanation: 'Direct Lake has no scheduled refresh; freshness is bounded by how quickly Delta commits land in OneLake. DirectQuery is also commit-time fresh but pays per-query latency.',
    whyWrong: {
      0: 'Import is bounded by the refresh schedule.',
      1: 'DirectQuery is technically fresh but the question asks about a mode where the model-side has no refresh job. DirectQuery has no scheduled refresh either, but the "best" answer is Direct Lake because it combines freshness with VertiPaq performance — that\'s the unique characterization.',
      3: 'Live connection inherits freshness from the remote model — also has no local refresh, but is not commit-time-fresh in the sense of the question.'
    },
    source: SRC.storageModes,
    tags: ['storage-modes', 'freshness']
  }),
  single({
    id: 'sm-006', domain: 'semantic', subtopic: 'storage-modes', difficulty: 3,
    prompt: 'Which performance characteristic does Import most directly trade away?',
    options: ['Query latency', 'Data freshness', 'Storage compression', 'Calculation expressiveness'],
    correct: 1,
    explanation: 'Import gives you the fastest query latency at the cost of data freshness — your data is only as new as the last refresh.',
    whyWrong: {
      0: 'Import has the lowest latency, not highest.',
      2: 'Import\'s VertiPaq compression is excellent — it does not give it up.',
      3: 'Calculation expressiveness is the same; this is a freshness trade.'
    },
    source: SRC.storageModes,
    tags: ['storage-modes', 'tradeoffs']
  }),
  single({
    id: 'sm-007', domain: 'semantic', subtopic: 'storage-modes', difficulty: 3,
    prompt: 'For a 50-million-row fact joined to a 200-row time dimension in a Lakehouse, which design is generally optimal?',
    options: [
      'Direct Lake for both',
      'Import for both',
      'DirectQuery for the fact, Import for the dim',
      'Direct Lake for the fact, Import for the time dim'
    ],
    correct: 0,
    explanation: 'Both tables in Direct Lake is the simplest and best choice when the source is Delta in OneLake — the model gets near-Import performance with auto-framing. Mixing modes when not necessary just adds complexity.',
    whyWrong: {
      1: 'Import is fine, but it loses the freshness and zero-refresh benefits of Direct Lake.',
      2: 'DirectQuery for a Lakehouse fact is slower than Direct Lake.',
      3: 'No reason to break the dim out — it\'s already Delta.'
    },
    source: SRC.storageModes,
    tags: ['design', 'direct-lake']
  }),
  single({
    id: 'sm-008', domain: 'semantic', subtopic: 'storage-modes', difficulty: 4,
    prompt: 'Which storage mode gives you the best in-memory compression by storing data column-oriented in VertiPaq?',
    options: ['DirectQuery', 'Direct Lake', 'Import', 'All three give equivalent compression'],
    correct: 2,
    explanation: 'Import physically loads data into VertiPaq with full benefit of column store and dictionary encoding. Direct Lake also uses VertiPaq for resident columns but compression effectiveness depends on which columns are paged and the original Delta layout (V-Order helps).',
    whyWrong: {
      0: 'DirectQuery stores no data — there is no compression at all.',
      1: 'Direct Lake uses VertiPaq for resident columns, but compression depends on V-Order and may not match a fully tuned Import build.',
      3: 'They are not equivalent; this is the trap option.'
    },
    source: SRC.storageModes,
    tags: ['storage-modes', 'vertipaq', 'compression']
  })
];
