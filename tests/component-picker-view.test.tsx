// RTL tests for ComponentPickerView (/lab/component-picker).
//
// Same pattern as star-schema-lab-view.test.tsx but for the component-picker lab.
// fake-indexeddb is loaded by tests/setup.ts.

import { describe, expect, test } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ComponentPickerView } from '../src/features/lab/ComponentPickerView';
import { pickerPrompts } from '../src/data/lab/picker-prompts';
import { listAttempts } from '../src/lib/storage/db';

function renderLab() {
  return render(
    <MemoryRouter>
      <ComponentPickerView />
    </MemoryRouter>
  );
}

/**
 * Finds the radio whose visible text ends with `label` exactly.
 * Needed because option labels can share prefixes (e.g. "Warehouse" vs "Mirrored Database"),
 * so a substring regex on accessible name could match multiple buttons.
 */
function findRadioByLabel(label: string): HTMLElement {
  const radios = screen.getAllByRole('radio');
  const match = radios.find((r) => (r.textContent ?? '').trim().endsWith(label));
  if (!match) throw new Error(`No radio with label ending "${label}" found`);
  return match;
}

describe('ComponentPickerView', () => {
  test('1. renders the first prompt with business text and scenario heading', () => {
    renderLab();
    expect(screen.getByText(`Prompt 1 / ${pickerPrompts.length}`)).toBeInTheDocument();
    expect(screen.getByText(pickerPrompts[0].business)).toBeInTheDocument();
    expect(screen.getByText(pickerPrompts[0].scenario)).toBeInTheDocument();
  });

  test('2. renders one radio button per option in the first prompt', () => {
    renderLab();
    const expected = pickerPrompts[0].options.length;
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(expected);
  });

  test('3. clicking the correct option reveals Correct badge and Why explanation', async () => {
    renderLab();
    const correctOpt = pickerPrompts[0].options.find((o) => o.id === pickerPrompts[0].correctId)!;
    const button = findRadioByLabel(correctOpt.label);
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('Correct')).toBeInTheDocument();
    });
    expect(screen.getByText(/Why:/)).toBeInTheDocument();
  });

  test('4. clicking a wrong option reveals Incorrect badge', async () => {
    renderLab();
    const wrongOpt = pickerPrompts[0].options.find((o) => o.id !== pickerPrompts[0].correctId)!;
    const button = findRadioByLabel(wrongOpt.label);
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('Incorrect')).toBeInTheDocument();
    });
  });

  test('5. clicking Next advances from Prompt 1 to Prompt 2', async () => {
    renderLab();
    fireEvent.click(screen.getAllByRole('radio')[0]);
    await waitFor(() => {
      expect(screen.getByText(/Next →|Finish/)).not.toBeDisabled();
    });
    fireEvent.click(screen.getByText(/Next →|Finish/));
    await waitFor(() => {
      expect(screen.getByText(`Prompt 2 / ${pickerPrompts.length}`)).toBeInTheDocument();
    });
  });

  test('6. picking an option persists an Attempt with subtopic component-picker and domain prepare', async () => {
    renderLab();
    fireEvent.click(screen.getAllByRole('radio')[0]);
    await waitFor(async () => {
      const attempts = await listAttempts();
      expect(attempts.length).toBeGreaterThan(0);
      const last = attempts[0];
      expect(last.subtopic).toBe('component-picker');
      expect(last.domain).toBe('prepare');
    });
  });
});
