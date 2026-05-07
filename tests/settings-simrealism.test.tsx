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
