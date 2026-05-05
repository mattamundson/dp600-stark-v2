import type { Scenario } from '../../lib/schema';
import { scenarioBatch } from './scn-list';
import { scenarioBatch2 } from './scn-list-batch2';

export const scenarioList: Scenario[] = [...scenarioBatch, ...scenarioBatch2];
