// Settings simRealismMode select — unit tests.
//
// SettingsView calls useSettings and useToast; both are context-provided.
// SettingsProvider reads/writes IndexedDB (fake-indexeddb via setup.ts).
// ToastProvider is required because SettingsView calls useToast() directly.

import { describe, expect, test } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsView } from '../src/features/settings/SettingsView';
import { SettingsProvider } from '../src/app/providers/SettingsProvider';
import { ToastProvider } from '../src/app/providers/ToastProvider';

// ─── Wrapper ──────────────────────────────────────────────────────────────────

function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsProvider>
        <ToastProvider>
          <SettingsView />
        </ToastProvider>
      </SettingsProvider>
    </MemoryRouter>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SettingsView — simRealismMode select', () => {
  test('1. simRealismMode select renders with exactly 3 options', async () => {
    renderSettings();

    // Wait for SettingsProvider to load settings from IndexedDB.
    const select = await waitFor(() =>
      screen.getByRole('combobox', { name: /Simulation realism mode/i })
    );

    const options = Array.from((select as HTMLSelectElement).options);
    expect(options).toHaveLength(3);

    const values = options.map((o) => o.value);
    expect(values).toContain('dp600');
    expect(values).toContain('dp600-quick');
    expect(values).toContain('legacy');
  });

  test('2. default value is "dp600" when settings.simRealismMode is undefined', async () => {
    // IndexedDB is wiped by setup.ts beforeEach. The default Settings object
    // does NOT set simRealismMode, so the component falls back to 'dp600' via
    // `settings.simRealismMode ?? 'dp600'` in the select's value prop.
    renderSettings();

    const select = await waitFor(() =>
      screen.getByRole('combobox', { name: /Simulation realism mode/i })
    ) as HTMLSelectElement;

    expect(select.value).toBe('dp600');
  });

  test('3. selecting a value patches settings with the correct simRealismMode', async () => {
    renderSettings();

    const select = await waitFor(() =>
      screen.getByRole('combobox', { name: /Simulation realism mode/i })
    ) as HTMLSelectElement;

    fireEvent.change(select, { target: { value: 'dp600-quick' } });

    // The select's displayed value should update after the SettingsProvider
    // patch round-trip through IndexedDB completes.
    await waitFor(() => {
      expect(select.value).toBe('dp600-quick');
    });
  });
});

describe('SettingsView — daily-streak threshold input', () => {
  test('renders with default value 10 when streakMinAttempts is unset', async () => {
    renderSettings();
    const input = await waitFor(() =>
      screen.getByRole('spinbutton', { name: /Daily-streak threshold/i })
    ) as HTMLInputElement;
    expect(input.value).toBe('10');
    expect(input.type).toBe('number');
    expect(input.min).toBe('1');
  });

  test('accepts numeric input and patches settings on blur', async () => {
    renderSettings();
    const input = await waitFor(() =>
      screen.getByRole('spinbutton', { name: /Daily-streak threshold/i })
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: '20' } });
    expect(input.value).toBe('20');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(input.value).toBe('20');
    });
  });

  test('clamps sub-1 values to 1 on blur', async () => {
    renderSettings();
    const input = await waitFor(() =>
      screen.getByRole('spinbutton', { name: /Daily-streak threshold/i })
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(input.value).toBe('1');
    });
  });

  test('clamps empty / non-numeric values to 1 on blur', async () => {
    renderSettings();
    const input = await waitFor(() =>
      screen.getByRole('spinbutton', { name: /Daily-streak threshold/i })
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(input.value).toBe('1');
    });
  });
});

// ─── Explicit-label a11y (MEDIUM #5) ──────────────────────────────────────────
//
// Every form control in SettingsView must be reachable by an explicit
// htmlFor-paired <label>, discoverable via getByLabelText. This guards the
// 2026-05-07 a11y audit fix that converted implicit-label patterns into
// explicit ones with stable, namespaced ids (setting-*).

describe('SettingsView — explicit label associations', () => {
  test('Theme select is reachable by explicit label', async () => {
    renderSettings();
    const el = await waitFor(() => screen.getByLabelText('Theme')) as HTMLSelectElement;
    expect(el.tagName).toBe('SELECT');
    expect(el.id).toBe('setting-theme');
  });

  test('Exam date input is reachable by explicit label', async () => {
    renderSettings();
    const el = await waitFor(() => screen.getByLabelText('Exam date')) as HTMLInputElement;
    expect(el.tagName).toBe('INPUT');
    expect(el.type).toBe('date');
    expect(el.id).toBe('setting-exam-date');
  });

  test('Reduce motion checkbox is reachable by explicit label', async () => {
    renderSettings();
    const el = await waitFor(() => screen.getByLabelText('Reduce motion')) as HTMLInputElement;
    expect(el.type).toBe('checkbox');
    expect(el.id).toBe('setting-reduce-motion');
  });

  test('Beep at final minute checkbox is reachable by explicit label', async () => {
    renderSettings();
    const el = await waitFor(() =>
      screen.getByLabelText(/Beep at final minute/i)
    ) as HTMLInputElement;
    expect(el.type).toBe('checkbox');
    expect(el.id).toBe('setting-beep-final-minute');
  });

  test('Exam-day focus mode checkbox is reachable by explicit label', async () => {
    renderSettings();
    const el = await waitFor(() =>
      screen.getByLabelText('Exam-day focus mode')
    ) as HTMLInputElement;
    expect(el.type).toBe('checkbox');
    expect(el.id).toBe('setting-exam-day-mode');
  });

  test('Daily-streak threshold input is reachable by explicit label', async () => {
    renderSettings();
    const el = await waitFor(() =>
      screen.getByLabelText(/Daily-streak threshold/i)
    ) as HTMLInputElement;
    expect(el.type).toBe('number');
    expect(el.id).toBe('setting-streak-min');
    expect(el.min).toBe('1');
  });

  test('Simulation realism mode select is reachable by explicit label', async () => {
    renderSettings();
    const el = await waitFor(() =>
      screen.getByLabelText('Simulation realism mode')
    ) as HTMLSelectElement;
    expect(el.tagName).toBe('SELECT');
    expect(el.id).toBe('setting-sim-realism-mode');
  });

  test('every form control has an explicit label association (no implicit wrappers)', async () => {
    const { container } = renderSettings();
    await waitFor(() => screen.getByLabelText('Theme'));

    const inputs = container.querySelectorAll('input, select');
    // All form controls in the Settings panel must carry an id so labels
    // can pair with htmlFor; the only exception is the hidden file input
    // for JSON import (in the Data section, programmatically clicked).
    inputs.forEach((el) => {
      const node = el as HTMLInputElement | HTMLSelectElement;
      if (node instanceof HTMLInputElement && node.type === 'file') return;
      expect(node.id).toMatch(/^setting-/);
    });
  });
});
