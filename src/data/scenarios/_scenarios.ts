import type { Scenario } from '../../lib/schema';
import { scenarioBatch } from './scn-list';
import { scenarioBatch2 } from './scn-list-batch2';
import { scenarioBatch3 } from './scn-list-batch3';

export const scenarioList: Scenario[] = [...scenarioBatch, ...scenarioBatch2, ...scenarioBatch3];
