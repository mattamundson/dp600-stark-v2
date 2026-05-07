// SettingsView — composite-behavior RTL tests.
//
// `tests/settings-simrealism.test.tsx` already covers field-level basics for
// the simRealism select and streak threshold. This file focuses on:
//   • cross-section render coverage (does the view show every major section?)
//   • cross-cutting effects (exam-day-mode toggle → html.exam-day class)
//   • round-trip persistence of multiple knobs through IndexedDB
//   • integration with `getStreakMinAttempts` from features/dashboard/streak.ts
//   • destructive actions (Wipe data) confirm before clearing
//   • numeric clamp behavior on streakMinAttempts (negative / NaN / empty)
//
// Providers required: MemoryRouter + SettingsProvider + ToastProvider.

import { describe, expect, test, vi, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsView } from '../src/features/settings/SettingsView';
import { SettingsProvider } from '../src/app/providers/SettingsProvider';
import { ToastProvider } from '../src/app/providers/ToastProvider';
import { getSettings, updateSettings } from '../src/lib/storage/db';
import { getStreakMinAttempts } from '../src/features/dashboard/streak';

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

afterEach(() => {
  // Strip exam-day class so leakage doesn't poison the next test in the file.
  document.documentElement.classList.remove('exam-day');
  vi.restoreAllMocks();
});

describe('SettingsView — composite behavior', () => {
  test('1. renders all major sections (theme, exam-date, exam-day toggle, streak, sim-realism, data section)', async () => {
    renderSettings();

    // Theme select.
    const theme = await waitFor(() =>
      screen.getByRole('combobox', { name: /theme/i })
    );
    expect(theme).toBeInTheDocument();

    // Exam date input — labeled by "Exam date" span.
    const examDate = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(examDate).toBeInTheDocument();

    // Exam-day focus mode checkbox.
    expect(screen.getByLabelText(/Exam-day focus mode/i)).toBeInTheDocument();

    // Beep at final minute checkbox.
    expect(screen.getByLabelText(/Beep at final minute/i)).toBeInTheDocument();

    // Reduce-motion checkbox.
    expect(screen.getByLabelText(/Reduce motion/i)).toBeInTheDocument();

    // Daily-streak threshold spinbutton.
    expect(screen.getByRole('spinbutton', { name: /Daily-streak threshold/i })).toBeInTheDocument();

    // Simulation realism mode select.
    expect(screen.getByRole('combobox', { name: /Simulation realism mode/i })).toBeInTheDocument();

    // Data section + headline buttons.
    expect(screen.getByRole('heading', { name: /^data$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export JSON/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import JSON/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Wipe all data/i })).toBeInTheDocument();
  });

  test('2. setting exam-date persists into Settings.examDateIso', async () => {
    renderSettings();

    const examDate = (await waitFor(() => {
      const el = document.querySelector('input[type="date"]') as HTMLInputElement;
      expect(el).toBeInTheDocument();
      return el;
    })) as HTMLInputElement;

    fireEvent.change(examDate, { target: { value: '2026-09-01' } });

    await waitFor(async () => {
      const persisted = await getSettings();
      expect(persisted.examDateIso).toBeDefined();
      expect(persisted.examDateIso!.slice(0, 10)).toBe('2026-09-01');
    });

    // The visible input value reflects the chosen date.
    expect(examDate.value).toBe('2026-09-01');
  });

  test('3. toggling exam-day mode adds the `exam-day` class to <html>', async () => {
    renderSettings();
    const toggle = (await waitFor(() =>
      screen.getByLabelText(/Exam-day focus mode/i)
    )) as HTMLInputElement;

    expect(document.documentElement.classList.contains('exam-day')).toBe(false);

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('exam-day')).toBe(true);
    });

    // Persistence round-trip — settings.examDayMode is true.
    const persisted = await getSettings();
    expect(persisted.examDayMode).toBe(true);
  });

  test('4. setting streak threshold to 5 persists; getStreakMinAttempts(settings) returns 5', async () => {
    renderSettings();
    const input = (await waitFor(() =>
      screen.getByRole('spinbutton', { name: /Daily-streak threshold/i })
    )) as HTMLInputElement;

    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.blur(input);

    await waitFor(async () => {
      const persisted = await getSettings();
      expect(persisted.streakMinAttempts).toBe(5);
      expect(getStreakMinAttempts(persisted)).toBe(5);
    });
  });

  test('5. Wipe-all-data button calls window.confirm before clearing', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false);
    renderSettings();
    const wipe = (await waitFor(() =>
      screen.getByRole('button', { name: /Wipe all data/i })
    )) as HTMLButtonElement;

    // Seed a marker setting so we can verify the wipe was NOT executed.
    await updateSettings({ streakMinAttempts: 7 });

    fireEvent.click(wipe);

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy.mock.calls[0][0]).toMatch(/wipe all study data/i);

    // confirm()=false → marker survives.
    const persisted = await getSettings();
    expect(persisted.streakMinAttempts).toBe(7);
  });

  test('6. theme select round-trips through IndexedDB', async () => {
    renderSettings();
    const theme = (await waitFor(() =>
      screen.getByRole('combobox', { name: /theme/i })
    )) as HTMLSelectElement;

    fireEvent.change(theme, { target: { value: 'light' } });

    await waitFor(async () => {
      const persisted = await getSettings();
      expect(persisted.theme).toBe('light');
    });

    // SettingsProvider applies the class to <html> when theme=light.
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  test('7. streak threshold clamps invalid values: negative → 1, empty → 1, non-numeric → 1', async () => {
    renderSettings();
    const input = (await waitFor(() =>
      screen.getByRole('spinbutton', { name: /Daily-streak threshold/i })
    )) as HTMLInputElement;

    // Negative.
    fireEvent.change(input, { target: { value: '-3' } });
    fireEvent.blur(input);
    await waitFor(() => {
      expect(input.value).toBe('1');
    });

    // Empty.
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    await waitFor(() => {
      expect(input.value).toBe('1');
    });

    // Non-numeric (a number-typed input drops most non-digits, but the
    // component branch treats any non-finite parse as the clamp-to-1 path).
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);
    await waitFor(() => {
      expect(input.value).toBe('1');
    });
  });

  test('8. settings round-trip — change theme/exam-date/streak/simRealism, then read back via getSettings()', async () => {
    renderSettings();

    const theme = (await waitFor(() =>
      screen.getByRole('combobox', { name: /theme/i })
    )) as HTMLSelectElement;
    // Each onChange handler in SettingsView calls `void patch({...})` which is
    // an async read-modify-write through IndexedDB. Firing all four fields
    // back-to-back causes patches to race on the read step — earlier patches
    // get clobbered by later writes that read the pre-change blob. So we
    // change one field, wait for it to land in IndexedDB, then move on.
    //
    // 'light' rather than 'system' because jsdom lacks window.matchMedia,
    // which the SettingsProvider's theme=system effect calls. Asserting the
    // round-trip on 'light' still proves persistence + UI reflection.
    fireEvent.change(theme, { target: { value: 'light' } });
    await waitFor(async () => {
      expect((await getSettings()).theme).toBe('light');
    });

    const examDate = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(examDate, { target: { value: '2027-02-10' } });
    await waitFor(async () => {
      expect((await getSettings()).examDateIso?.slice(0, 10)).toBe('2027-02-10');
    });

    const streak = screen.getByRole('spinbutton', { name: /Daily-streak threshold/i }) as HTMLInputElement;
    fireEvent.change(streak, { target: { value: '15' } });
    fireEvent.blur(streak);
    await waitFor(async () => {
      expect((await getSettings()).streakMinAttempts).toBe(15);
    });

    const sim = screen.getByRole('combobox', { name: /Simulation realism mode/i }) as HTMLSelectElement;
    fireEvent.change(sim, { target: { value: 'dp600-quick' } });
    await waitFor(async () => {
      expect((await getSettings()).simRealismMode).toBe('dp600-quick');
    });

    // Final read — every value survived the chain.
    const persisted = await getSettings();
    expect(persisted.theme).toBe('light');
    expect(persisted.examDateIso?.slice(0, 10)).toBe('2027-02-10');
    expect(persisted.streakMinAttempts).toBe(15);
    expect(persisted.simRealismMode).toBe('dp600-quick');

    // The UI also reflects all four values.
    expect(theme.value).toBe('light');
    expect(examDate.value).toBe('2027-02-10');
    expect(streak.value).toBe('15');
    expect(sim.value).toBe('dp600-quick');
  });
});
