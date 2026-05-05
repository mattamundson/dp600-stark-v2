import type { StudyDay } from '../../lib/schema';

// 14-day DP-600 study plan.
//
// Allocation honors the official Microsoft blueprint weights:
//   Prepare data       ~47.5%   →  Days 1–6  (six days)
//   Maintain solution  ~27.5%   →  Days 7–9  (three days)
//   Semantic models    ~27.5%   →  Days 10–12 (three days)
// Day 13 is mixed remediation across all three domains.
// Day 14 is the full simulation + last-hour checklist.
//
// Block targets use canonical identifiers:
//   - deck:<slug>      → one of the 9 FlashcardDeck slugs in lib/schema.ts
//   - section:<slug>   → reference section slugs in features/reference/content.ts
//   - domain:<slug>    → 'prepare' | 'maintain' | 'semantic'
//   - scenario:scn-NN  → scenario IDs (scn-01..scn-15)
//   - auto             → engine-selected weak-spot remediation
//   - full             → full 100-minute simulation
//
// Per-day total minutes are noted in the trailing comment for each day so
// the plan stays in the 90–180 minute band (Day 14 is 165, intentional).

export const plan14: StudyDay[] = [
  {
    day: 1,
    title: 'Foundations: OneLake & Lakehouse vs Warehouse',
    focus:
      'Establish the Fabric storage substrate: when OneLake is the source of truth, where Lakehouse beats Warehouse, and how workloads share data without copies.',
    domains: ['prepare'],
    blocks: [
      {
        kind: 'reference',
        minutes: 25,
        target: 'section:fabric-architecture',
        notes:
          'Map the workload surface (Lakehouse, Warehouse, KQL DB, Eventhouse, Real-Time, Data Factory). Internalize which artifact owns which compute.'
      },
      {
        kind: 'reference',
        minutes: 20,
        target: 'section:storage-modes',
        notes:
          'Lakehouse SQL endpoint vs Warehouse engine vs Direct Lake fabric semantic model — read-only vs read/write boundaries.'
      },
      {
        kind: 'flashcards',
        minutes: 25,
        target: 'deck:fabric-architecture',
        notes: 'First pass; grade honestly. Anything <2.5 ease gets re-queued tomorrow.'
      },
      {
        kind: 'flashcards',
        minutes: 20,
        target: 'deck:storage-modes',
        notes: 'Confirm you can verbalize Import vs DirectQuery vs Direct Lake trade-offs without hedging.'
      },
      {
        kind: 'quiz',
        minutes: 25,
        target: 'domain:prepare',
        notes: '25-question adaptive quiz. Tag any miss as a Day-2 review candidate.'
      }
    ]
  }, // total 115 min
  {
    day: 2,
    title: 'Direct Lake Mechanics & V-Order',
    focus:
      'Move from "Direct Lake is fast" to the actual mechanics: column transcoding, V-Order Parquet layout, framing, and the DirectQuery fallback path.',
    domains: ['prepare', 'semantic'],
    blocks: [
      {
        kind: 'reference',
        minutes: 30,
        target: 'section:direct-lake-mechanics',
        notes:
          'Read carefully. You must be able to explain framing, the fallback to DirectQuery, and what triggers transcoding cache eviction.'
      },
      {
        kind: 'flashcards',
        minutes: 30,
        target: 'deck:direct-lake',
        notes: 'Drill until ease >= 2.5 on most cards. Re-queue any "guess" answers.'
      },
      {
        kind: 'scenario',
        minutes: 25,
        target: 'scenario:scn-01',
        notes: 'Workload sizing decision: Direct Lake vs Import for a high-cardinality fact at 2B rows.'
      },
      {
        kind: 'quiz',
        minutes: 20,
        target: 'domain:prepare',
        notes: 'Focused quiz weighted to direct-lake and storage-modes subtopics.'
      },
      {
        kind: 'remediation',
        minutes: 15,
        target: 'auto',
        notes: 'Sweep weak spots from Day-1 quiz before they harden.'
      }
    ]
  }, // total 120 min
  {
    day: 3,
    title: 'Transformation Choices: Dataflow Gen2 vs Notebook vs T-SQL',
    focus:
      'Pick the right transform engine per workload — staging volume, latency budget, governance posture, and downstream consumption all matter.',
    domains: ['prepare'],
    blocks: [
      {
        kind: 'reference',
        minutes: 20,
        target: 'section:fabric-architecture',
        notes:
          'Re-read the Data Factory + Lakehouse + Warehouse interplay. Focus on where each transform engine writes and what it costs.'
      },
      {
        kind: 'flashcards',
        minutes: 25,
        target: 'deck:fabric-architecture',
        notes: 'Second pass. Cards that survived Day 1 should now feel automatic.'
      },
      {
        kind: 'scenario',
        minutes: 25,
        target: 'scenario:scn-02',
        notes:
          'Choose between Dataflow Gen2, Spark notebook, and T-SQL stored procedure for a daily 80M-row staging job.'
      },
      {
        kind: 'scenario',
        minutes: 25,
        target: 'scenario:scn-03',
        notes: 'Latency-bound transform: streaming ingest into Eventhouse with Lakehouse mirroring downstream.'
      },
      {
        kind: 'quiz',
        minutes: 25,
        target: 'domain:prepare',
        notes: 'Adaptive 25-min, weighted toward weak transformation-choice subtopics.'
      }
    ]
  }, // total 120 min
  {
    day: 4,
    title: 'KQL Operators & Eventhouse',
    focus:
      'KQL is the lowest-trained area for most Power BI veterans — invest deliberately. Master summarize, project, extend, join kinds, and time-window operators.',
    domains: ['prepare'],
    blocks: [
      {
        kind: 'reference',
        minutes: 30,
        target: 'section:kql-cheatsheet',
        notes:
          'Walk every operator with a sample. Pay attention to join kinds (innerunique vs inner vs leftouter) — this is exam bait.'
      },
      {
        kind: 'flashcards',
        minutes: 35,
        target: 'deck:kql',
        notes: 'First full pass. Aim for >70% "sure" recall before moving on.'
      },
      {
        kind: 'scenario',
        minutes: 25,
        target: 'scenario:scn-04',
        notes:
          'Eventhouse + KQL DB design: streaming telemetry with 30-day hot retention and Lakehouse cold tier.'
      },
      {
        kind: 'quiz',
        minutes: 25,
        target: 'domain:prepare',
        notes: 'KQL-weighted quiz. Expect questions framed as scenarios — read the prompt twice.'
      },
      {
        kind: 'remediation',
        minutes: 15,
        target: 'auto',
        notes: 'Catch KQL misses immediately — operator semantics decay fast without re-exposure.'
      }
    ]
  }, // total 130 min
  {
    day: 5,
    title: 'OneLake Shortcuts vs Mirroring vs Ingestion',
    focus:
      'The exam will press you on when to use a OneLake shortcut, when to mirror, and when to ingest. Cost, refresh semantics, and governance differ on every dimension.',
    domains: ['prepare'],
    blocks: [
      {
        kind: 'reference',
        minutes: 25,
        target: 'section:onelake-shortcuts',
        notes:
          'Internalize the matrix: source system × write semantics × cost model × refresh latency. Note which shortcuts support virtualization.'
      },
      {
        kind: 'flashcards',
        minutes: 25,
        target: 'deck:storage-modes',
        notes: 'Third pass. Anything still ambiguous gets a hand-written one-liner in your notes.'
      },
      {
        kind: 'scenario',
        minutes: 25,
        target: 'scenario:scn-05',
        notes: 'Snowflake source: shortcut, mirror, or ingest? Justify against latency, governance, and consumption pattern.'
      },
      {
        kind: 'scenario',
        minutes: 25,
        target: 'scenario:scn-06',
        notes: 'ADLS Gen2 source serving multiple workspaces — shortcut topology and permission propagation.'
      },
      {
        kind: 'quiz',
        minutes: 25,
        target: 'domain:prepare',
        notes: 'Mixed prepare-domain quiz. Should be feeling fluent in storage choices by end of session.'
      }
    ]
  }, // total 125 min
  {
    day: 6,
    title: 'Pipelines & Orchestration',
    focus:
      'Data Factory pipelines, dependencies, parameterization, and schedule vs trigger semantics. Round out the prepare-data domain.',
    domains: ['prepare'],
    blocks: [
      {
        kind: 'reference',
        minutes: 20,
        target: 'section:fabric-architecture',
        notes: 'Pipeline activities, dependency operators, and the difference between pipeline schedules and event triggers.'
      },
      {
        kind: 'flashcards',
        minutes: 20,
        target: 'deck:fabric-architecture',
        notes: 'Final pass on architecture deck. Anything still flagged moves to the exam-traps deck on Day 13.'
      },
      {
        kind: 'scenario',
        minutes: 25,
        target: 'scenario:scn-07',
        notes:
          'Multi-stage pipeline: parameterized dataflow → notebook transform → semantic model refresh, with failure-branch handling.'
      },
      {
        kind: 'quiz',
        minutes: 35,
        target: 'domain:prepare',
        notes:
          'Capstone 35-question prepare-domain quiz. Target: >75% accuracy. Below 70% → extend Day 13 remediation budget.'
      },
      {
        kind: 'remediation',
        minutes: 20,
        target: 'auto',
        notes: 'Sweep all prepare-domain weak spots before pivoting to maintain on Day 7.'
      }
    ]
  }, // total 120 min
  {
    day: 7,
    title: 'Workspace Roles, RLS & OLS',
    focus:
      'The maintain domain opens with access control: workspace roles, item-level permissions, row-level and object-level security in semantic models.',
    domains: ['maintain', 'semantic'],
    blocks: [
      {
        kind: 'reference',
        minutes: 25,
        target: 'section:workspace-roles',
        notes:
          'Admin / Member / Contributor / Viewer capability matrix. Know which role can publish vs deploy vs schedule refresh.'
      },
      {
        kind: 'flashcards',
        minutes: 30,
        target: 'deck:security-governance',
        notes: 'First full pass. RLS dynamic vs static patterns are a frequent miss — drill those first.'
      },
      {
        kind: 'scenario',
        minutes: 25,
        target: 'scenario:scn-08',
        notes: 'Region-scoped sales team needs RLS by territory; CEO sees all. Choose between dynamic RLS, OLS, or composite.'
      },
      {
        kind: 'scenario',
        minutes: 20,
        target: 'scenario:scn-09',
        notes: 'OLS hides salary column from analysts; finance sees full table. Validate refresh-time impact.'
      },
      {
        kind: 'quiz',
        minutes: 25,
        target: 'domain:maintain',
        notes: 'Adaptive 25-min, weighted toward access-control subtopics.'
      }
    ]
  }, // total 125 min
  {
    day: 8,
    title: 'Deployment Pipelines, Rules & Permissions',
    focus:
      'Three-stage deployment, deployment rules, dataset rules, and the compare/diff workflow. Common exam traps live in rule scope and rebinding.',
    domains: ['maintain'],
    blocks: [
      {
        kind: 'reference',
        minutes: 30,
        target: 'section:deployment-pipelines',
        notes:
          'Pipeline stages, selective deployment, dataset rules vs report rules, and what survives a parameter rebind.'
      },
      {
        kind: 'flashcards',
        minutes: 30,
        target: 'deck:deployment-pipelines',
        notes: 'First pass. The "what gets overridden when you redeploy" cards are the high-yield subset.'
      },
      {
        kind: 'scenario',
        minutes: 25,
        target: 'scenario:scn-10',
        notes:
          'Dev → Test → Prod with a parameterized lakehouse connection per stage; reconcile rule order with workspace permissions.'
      },
      {
        kind: 'quiz',
        minutes: 25,
        target: 'domain:maintain',
        notes: 'Deployment-weighted quiz. Read every prompt for the word "rule" — scope flips the answer.'
      },
      {
        kind: 'remediation',
        minutes: 15,
        target: 'auto',
        notes: 'Targeted Day-7 weak-spot sweep before piling on more maintain content.'
      }
    ]
  }, // total 125 min
  {
    day: 9,
    title: 'Sensitivity Labels, XMLA & Governance',
    focus:
      'Wrap the maintain domain: sensitivity label propagation, XMLA endpoint read/write, tenant settings, capacity admin surface.',
    domains: ['maintain'],
    blocks: [
      {
        kind: 'reference',
        minutes: 20,
        target: 'section:workspace-roles',
        notes:
          'Re-read the capability matrix with governance lens — who can change tenant settings, who can manage capacity, who can publish certified items.'
      },
      {
        kind: 'flashcards',
        minutes: 30,
        target: 'deck:security-governance',
        notes: 'Second pass. XMLA endpoint read/write boundaries are a common stumbling block.'
      },
      {
        kind: 'scenario',
        minutes: 25,
        target: 'scenario:scn-11',
        notes:
          'Sensitivity label inheritance from source to semantic model to export — confirm propagation rules and downstream enforcement.'
      },
      {
        kind: 'quiz',
        minutes: 30,
        target: 'domain:maintain',
        notes:
          'Capstone 30-question maintain-domain quiz. Target: >75% accuracy. Below 70% → flag for Day 13 remediation.'
      },
      {
        kind: 'remediation',
        minutes: 15,
        target: 'auto',
        notes: 'Sweep all maintain-domain weak spots before pivoting to semantic on Day 10.'
      }
    ]
  }, // total 120 min
  {
    day: 10,
    title: 'Star Schema & Relationships',
    focus:
      'Open the semantic-models domain with model design: star vs snowflake trade-offs, role-playing dimensions, bi-directional relationships, and ambiguity resolution.',
    domains: ['semantic'],
    blocks: [
      {
        kind: 'reference',
        minutes: 20,
        target: 'section:dax-traps',
        notes:
          'Model-design traps section: relationship cardinality, cross-filter direction, and inactive relationships activated via USERELATIONSHIP.'
      },
      {
        kind: 'flashcards',
        minutes: 30,
        target: 'deck:semantic-modeling',
        notes: 'First pass. Pay attention to bi-di relationship hazards — they are exam favorites.'
      },
      {
        kind: 'scenario',
        minutes: 25,
        target: 'scenario:scn-12',
        notes:
          'Role-playing date dimension (OrderDate / ShipDate / DueDate) — model with one date table or three? Defend with measure semantics.'
      },
      {
        kind: 'quiz',
        minutes: 25,
        target: 'domain:semantic',
        notes: 'Modeling-weighted quiz. Watch for "ambiguous path" prompts — the answer is rarely "enable bi-di."'
      },
      {
        kind: 'remediation',
        minutes: 15,
        target: 'auto',
        notes: 'Sweep modeling weak spots while context is fresh.'
      }
    ]
  }, // total 115 min
  {
    day: 11,
    title: 'DAX Context, CALCULATE & ALL Family',
    focus:
      'The CALCULATE engine: filter context vs row context, context transition, and the ALL / ALLEXCEPT / ALLSELECTED / REMOVEFILTERS family. Highest leverage day for DAX scoring.',
    domains: ['semantic'],
    blocks: [
      {
        kind: 'reference',
        minutes: 30,
        target: 'section:dax-traps',
        notes:
          'CALCULATE filter modifier semantics, KEEPFILTERS, and how SELECTEDVALUE differs from VALUES in a single-value context.'
      },
      {
        kind: 'flashcards',
        minutes: 35,
        target: 'deck:dax-advanced',
        notes:
          'First full pass. The ALL-family cards (ALL vs ALLSELECTED vs ALLEXCEPT vs REMOVEFILTERS) need to be reflexive — drill twice if needed.'
      },
      {
        kind: 'scenario',
        minutes: 25,
        target: 'scenario:scn-13',
        notes:
          '% of parent measure that must respect slicer selections at the visual level — write the measure end-to-end with ALLSELECTED.'
      },
      {
        kind: 'quiz',
        minutes: 30,
        target: 'domain:semantic',
        notes: 'DAX-heavy quiz. Time-pressure yourself; target ~70 sec/question to mirror exam pacing.'
      },
      {
        kind: 'remediation',
        minutes: 15,
        target: 'auto',
        notes: 'Catch DAX misses immediately — context-transition mistakes compound on Day 12.'
      }
    ]
  }, // total 135 min
  {
    day: 12,
    title: 'Calc Groups, Field Parameters & Optimization',
    focus:
      'Close the semantic domain with the modern toolkit: calculation groups, field parameters, format strings, and DAX/storage-engine optimization patterns.',
    domains: ['semantic'],
    blocks: [
      {
        kind: 'reference',
        minutes: 20,
        target: 'section:dax-traps',
        notes:
          'Calc-group precedence, format-string-by-calc-item, and the storage-engine vs formula-engine split visible in DAX Studio.'
      },
      {
        kind: 'flashcards',
        minutes: 30,
        target: 'deck:dax-advanced',
        notes: 'Second pass on DAX-advanced. Anything still flagged goes into the Day-13 mixed remediation queue.'
      },
      {
        kind: 'flashcards',
        minutes: 20,
        target: 'deck:semantic-modeling',
        notes: 'Second pass on modeling deck. Should now feel automatic.'
      },
      {
        kind: 'scenario',
        minutes: 25,
        target: 'scenario:scn-14',
        notes:
          'Field parameters driving a swap between three measure variants and three dimension variants — design for analyst ergonomics, not novelty.'
      },
      {
        kind: 'quiz',
        minutes: 30,
        target: 'domain:semantic',
        notes:
          'Capstone 30-question semantic-domain quiz. Target: >75% accuracy. Below 70% → extend Day 13 remediation.'
      }
    ]
  }, // total 125 min
  {
    day: 13,
    title: 'Mixed Remediation & Exam Traps',
    focus:
      'Burn down the weak-spot queue across all three domains, then drill the exam-traps deck specifically — the highest-yield deck in the final 48 hours.',
    domains: ['prepare', 'maintain', 'semantic'],
    blocks: [
      {
        kind: 'remediation',
        minutes: 30,
        target: 'auto',
        notes: 'Engine-selected weak spots from /analytics. Trust the dangerScore ranking — confident-but-wrong items first.'
      },
      {
        kind: 'flashcards',
        minutes: 35,
        target: 'deck:exam-traps',
        notes:
          'First full pass. These are curated from real misconceptions — slow down on any card you grade "guess" and write the correction in your notes.'
      },
      {
        kind: 'reference',
        minutes: 20,
        target: 'section:top-15-traps',
        notes: 'Read end-to-end. Anything that surprises you here is a Day-14 morning re-read candidate.'
      },
      {
        kind: 'scenario',
        minutes: 25,
        target: 'scenario:scn-15',
        notes:
          'Cross-domain capstone scenario: pipeline + RLS + Direct Lake interaction. Reason out loud before checking the model answer.'
      },
      {
        kind: 'quiz',
        minutes: 25,
        target: 'domain:prepare',
        notes:
          'Final mixed-domain pass via the prepare quiz (largest blueprint slice). Use this to gauge readiness, not to learn new material.'
      },
      {
        kind: 'remediation',
        minutes: 15,
        target: 'auto',
        notes: 'Final weak-spot sweep. After this block, stop introducing new content.'
      }
    ]
  }, // total 150 min
  {
    day: 14,
    title: 'Full Simulation & Last-Hour Checklist',
    focus:
      'One full timed simulation under exam conditions, then a structured cool-down: trap review, last-hour checklist, sleep. No new material today.',
    domains: ['prepare', 'maintain', 'semantic'],
    blocks: [
      {
        kind: 'reference',
        minutes: 15,
        target: 'section:last-hour-checklist',
        notes:
          'Read first thing. This sets the framing for the simulation — pacing, flag discipline, and when to commit vs revisit.'
      },
      {
        kind: 'simulation',
        minutes: 100,
        target: 'full',
        notes:
          'No phone, no docs, eat first. Treat this as the real exam — same chair, same time of day if possible. Flag, do not dwell.'
      },
      {
        kind: 'remediation',
        minutes: 20,
        target: 'auto',
        notes:
          'Review only the simulation misses. Do not re-study the whole deck — confirm you understand WHY each miss was wrong.'
      },
      {
        kind: 'flashcards',
        minutes: 15,
        target: 'deck:exam-traps',
        notes: 'Lightning pass. Recognition only — if a card takes >10 sec, mark it and move on.'
      },
      {
        kind: 'reference',
        minutes: 15,
        target: 'section:top-15-traps',
        notes: 'Final read. Close the laptop after this block. Sleep beats any extra cramming at this point.'
      }
    ]
  } // total 165 min
];
