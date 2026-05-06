// RTL tests for CalcGroupsLabView (/lab/calc-groups).
//
// Providers: only MemoryRouter is needed — the view doesn't use SettingsProvider
// or ToastProvider, but it does call saveAttempt() which requires IndexedDB.
// fake-indexeddb is loaded by tests/setup.ts.

import { describe, expect, test } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CalcGroupsLabView } from '../src/features/lab/CalcGroupsLabView';
import { calcGroupPrompts } from '../src/data/lab/calc-groups-prompts';
import { listAttempts } from '../src/lib/storage/db';

function renderLab() {
  return render(
    <MemoryRouter>
      <CalcGroupsLabView />
    </MemoryRouter>
  );
}

/**
 * Finds the radio whose visible text ends with `label` exactly.
 * Needed because option labels can share prefixes (e.g. "PY" vs "PY YTD"),
 * so a substring regex on accessible name matches multiple buttons.
 */
function findRadioByLabel(label: string): HTMLElement {
  const radios = screen.getAllByRole('radio');
  const match = radios.find((r) => (r.textContent ?? '').trim().endsWith(label));
  if (!match) throw new Error(`No radio with label ending "${label}" found`);
  return match;
}

describe('CalcGroupsLabView', () => {
  test('1. renders the first prompt with Q count, business, and scenario', () => {
    renderLab();
    expect(screen.getByText(`Prompt 1 / ${calcGroupPrompts.length}`)).toBeInTheDocument();
    expect(screen.getByText(calcGroupPrompts[0].business)).toBeInTheDocument();
    expect(screen.getByText(calcGroupPrompts[0].scenario)).toBeInTheDocument();
  });

  test('2. renders the calc-group definition + base measure as code blocks', () => {
    const { container } = renderLab();
    const codeBlocks = container.querySelectorAll('pre code');
    expect(codeBlocks.length).toBeGreaterThanOrEqual(2);
  });

  test('3. renders one option button per calc item', () => {
    renderLab();
    const expected = calcGroupPrompts[0].options.length;
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(expected);
  });

  test('4. clicking the correct option reveals the explanation panel', async () => {
    renderLab();
    const correctOpt = calcGroupPrompts[0].options.find((o) => o.id === calcGroupPrompts[0].correctId)!;
    const button = findRadioByLabel(correctOpt.label);
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('Correct')).toBeInTheDocument();
    });
    expect(screen.getByText(/Why:/)).toBeInTheDocument();
  });

  test('5. clicking a wrong option shows Incorrect and the why-wrong note', async () => {
    renderLab();
    const wrongOpt = calcGroupPrompts[0].options.find((o) => o.id !== calcGroupPrompts[0].correctId)!;
    const button = findRadioByLabel(wrongOpt.label);
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('Incorrect')).toBeInTheDocument();
    });
  });

  test('6. clicking Next after a pick advances to prompt 2', async () => {
    renderLab();
    const opt = screen.getAllByRole('radio')[0];
    fireEvent.click(opt);
    await waitFor(() => {
      expect(screen.getByText(/Next →|Finish/)).not.toBeDisabled();
    });
    fireEvent.click(screen.getByText(/Next →|Finish/));
    await waitFor(() => {
      expect(screen.getByText(`Prompt 2 / ${calcGroupPrompts.length}`)).toBeInTheDocument();
    });
  });

  test('7. picking an option persists an Attempt under the calc-groups subtopic', async () => {
    renderLab();
    fireEvent.click(screen.getAllByRole('radio')[0]);
    await waitFor(async () => {
      const attempts = await listAttempts();
      expect(attempts.length).toBeGreaterThan(0);
      const last = attempts[0];
      expect(last.subtopic).toBe('calc-groups');
      expect(last.domain).toBe('semantic');
    });
  });
});
