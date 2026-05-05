import type { Scenario } from '../../lib/schema';
import { scenarioList } from './_scenarios';

export const scenarios: Scenario[] = scenarioList;

export function scenarioById(id: string): Scenario | undefined {
  return scenarios.find((s) => s.id === id);
}
