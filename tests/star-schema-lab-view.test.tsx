// RTL tests for StarSchemaLabView (/lab/star-schema).
//
// Same pattern as calc-groups-lab-view.test.tsx but for the star-schema lab.

import { describe, expect, test } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StarSchemaLabView } from '../src/features/lab/StarSchemaLabView';
import { starSchemaPrompts } from '../src/data/lab/star-schema-prompts';
import { listAttempts } from '../src/lib/storage/db';

function renderLab() {
  return render(
    <MemoryRouter>
      <StarSchemaLabView />
    </MemoryRouter>
  );
}

function findRadioByLabel(label: string): HTMLElement {
  const radios = screen.getAllByRole('radio');
  const match = radios.find((r) => (r.textContent ?? '').trim().endsWith(label));
  if (!match) throw new Error(`No radio with label ending "${label}" found`);
  return match;
}

describe('StarSchemaLabView', () => {
  test('1. renders the first prompt with Q count, business, and source columns', () => {
    renderLab();
    expect(screen.getByText(`Prompt 1 / ${starSchemaPrompts.length}`)).toBeInTheDocument();
    expect(screen.getByText(starSchemaPrompts[0].business)).toBeInTheDocument();
    expect(screen.getByText(starSchemaPrompts[0].sourceColumns[0])).toBeInTheDocument();
  });

  test('2. renders one option button per pattern choice', () => {
    renderLab();
    const expected = starSchemaPrompts[0].options.length;
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(expected);
  });

  test('3. clicking the correct option reveals Correct + explanation', async () => {
    renderLab();
    const correctOpt = starSchemaPrompts[0].options.find((o) => o.id === starSchemaPrompts[0].correctId)!;
    const button = findRadioByLabel(correctOpt.label);
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('Correct')).toBeInTheDocument();
    });
    expect(screen.getByText(/Why:/)).toBeInTheDocument();
  });

  test('4. clicking a wrong option reveals Incorrect', async () => {
    renderLab();
    const wrongOpt = starSchemaPrompts[0].options.find((o) => o.id !== starSchemaPrompts[0].correctId)!;
    const button = findRadioByLabel(wrongOpt.label);
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('Incorrect')).toBeInTheDocument();
    });
  });

  test('5. clicking Next advances to prompt 2', async () => {
    renderLab();
    fireEvent.click(screen.getAllByRole('radio')[0]);
    await waitFor(() => {
      expect(screen.getByText(/Next →|Finish/)).not.toBeDisabled();
    });
    fireEvent.click(screen.getByText(/Next →|Finish/));
    await waitFor(() => {
      expect(screen.getByText(`Prompt 2 / ${starSchemaPrompts.length}`)).toBeInTheDocument();
    });
  });

  test('6. picking an option persists an Attempt under the star-schema subtopic', async () => {
    renderLab();
    fireEvent.click(screen.getAllByRole('radio')[0]);
    await waitFor(async () => {
      const attempts = await listAttempts();
      expect(attempts.length).toBeGreaterThan(0);
      const last = attempts[0];
      expect(last.subtopic).toBe('star-schema');
      expect(last.domain).toBe('semantic');
    });
  });
});

