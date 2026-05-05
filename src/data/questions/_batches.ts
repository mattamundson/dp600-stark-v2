import type { Question } from '../../lib/schema';
import { directLake } from './q-direct-lake';
import { directLakeMastery } from './q-direct-lake-mastery';
import { directLakeModern } from './q-direct-lake-modern';
import { directLakeSecurity } from './q-direct-lake-security';
import { storageModes } from './q-storage-modes';
import { semantic } from './q-semantic';
import { semanticMore } from './q-semantic-more';
import { semanticEngineering } from './q-semantic-engineering';
import { maintain } from './q-maintain';
import { maintainMore } from './q-maintain-more';
import { maintainOperations } from './q-maintain-operations';
import { governanceSecurity } from './q-governance-security';
import { deploymentDeep } from './q-deployment-deep';
import { prepareArchitecture } from './q-prepare-arch';
import { prepareMore } from './q-prepare-more';
import { prepareLab } from './q-prepare-lab';
import { qPrepareBlueprintFill } from './q-prepare-blueprint-fill';
import { kqlDeep } from './q-kql-deep';
import { daxIterators } from './q-dax-iterators';
import { daxTraps } from './q-dax-traps';
import { rlsDaxSamples } from './q-rls-dax-samples';
import { calcGroups } from './q-calc-groups';
import { reinforcement } from './q-reinforcement';
import { scenarioQuestions } from './q-scenarios';
import { typeSupplement } from './q-type-supplement';
import { rlsTesting } from './q-rls-testing';
import { medallion } from './q-medallion';
import { governanceLifecycle } from './q-governance-lifecycle';
import { semanticPerf } from './q-semantic-perf';
import { starSchema } from './q-star-schema';
import { fabricNotebooks } from './q-fabric-notebooks';
import { maintainDeep } from './q-maintain-deep';
import { fabricCli } from './q-fabric-cli';
import { workspaceGovernance } from './q-workspace-governance';
import { scenarioQuestionsBatch2 } from './q-scenarios-batch2';
import { kqlAdvanced } from './q-kql-advanced';
import { toolingPbi } from './q-tooling-pbi';
import { compositeAggs } from './q-composite-aggs';
import { scenarioQuestionsBatch3 } from './q-scenarios-batch3';

export const qBatches: Question[][] = [
  directLake,
  directLakeMastery,
  directLakeModern,
  directLakeSecurity,
  storageModes,
  semantic,
  semanticMore,
  semanticEngineering,
  maintain,
  maintainMore,
  maintainOperations,
  governanceSecurity,
  deploymentDeep,
  prepareArchitecture,
  prepareMore,
  prepareLab,
  qPrepareBlueprintFill,
  kqlDeep,
  daxIterators,
  daxTraps,
  rlsDaxSamples,
  calcGroups,
  reinforcement,
  scenarioQuestions,
  typeSupplement,
  rlsTesting,
  medallion,
  governanceLifecycle,
  semanticPerf,
  starSchema,
  fabricNotebooks,
  maintainDeep,
  fabricCli,
  workspaceGovernance,
  scenarioQuestionsBatch2,
  kqlAdvanced,
  toolingPbi,
  compositeAggs,
  scenarioQuestionsBatch3
];
