// RTL tests for DayStudyView (/study/day/:n).
//
// DayStudyView reads useParams<{ n: string }>() to pick a study day from the
// 14-day plan, looks up matching DAY_DOCS for MS Learn external links, and
// renders nested reference / flashcards / quiz / scenario / simulation /
// remediation blocks. All data is consumed live from src/data — no mocks
// needed beyond the MemoryRouter for routing context.
//
// Day-shape gotcha: DAY_DOCS are sparse (not every day has docs, and only
// 'reference' blocks render the MS Learn link panel). We assert against day 1
// because plan14.ts seeds it with two reference blocks (fabric-architecture
// and storage-modes) and dayDocs.ts ships two link sections for day 1.

import { describe, expect, test } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DayStudyView } from '../src/features/study-docs/DayStudyView';
import { studyPlan } from '../src/data/studyPlan';
import { DAY_DOCS } from '../src/data/study-docs/dayDocs';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/study/day/:n" element={<DayStudyView />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DayStudyView', () => {
  test('1. renders day 1 metadata when route param is :n=1', () => {
    const day1 = studyPlan.find((d) => d.day === 1);
    expect(day1).toBeTruthy();

    renderAt('/study/day/1');

    // Header has "Day 1 of 14" and the day's title.
    expect(screen.getByText(/Day 1 of 14/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: new RegExp(day1!.title, 'i') })
    ).toBeInTheDocument();
    // Focus paragraph is rendered.
    expect(screen.getByText(new RegExp(day1!.focus.slice(0, 40), 'i'))).toBeInTheDocument();
  });

  test('2. renders block badges (Reference, Flashcards, Quiz) for day 1', () => {
    renderAt('/study/day/1');
    // Day 1 has reference, flashcards, and quiz blocks per plan14.ts.
    // Badges include the kind plus the minute count, e.g. "Reference · 25m".
    expect(screen.getAllByText(/Reference · \d+m/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Flashcards · \d+m/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Quiz · \d+m/i).length).toBeGreaterThanOrEqual(1);
  });

  test('3. out-of-range day param (n=99) shows graceful not-found state', () => {
    renderAt('/study/day/99');
    expect(screen.getByText(/Day 99 not found/i)).toBeInTheDocument();
    // The fallback offers a Back to study plan link.
    const back = screen.getByRole('link', { name: /back to study plan/i });
    expect(back).toHaveAttribute('href', '/study-plan');
    // The day-1 header (Day N of 14) should NOT be in the document.
    expect(screen.queryByText(/Day \d+ of 14/i)).not.toBeInTheDocument();
  });

  test('4. MS Learn links open in a new tab with noreferrer for security', () => {
    // Day 1 has fabric-architecture + storage-modes sections, both with
    // ship-with links in dayDocs.ts. Each external <a> must declare
    // target="_blank" + rel containing "noreferrer" (which implies noopener
    // in modern browsers when paired with target=_blank).
    const day1Doc = DAY_DOCS.find((d) => d.day === 1);
    expect(day1Doc).toBeTruthy();
    const allUrls = day1Doc!.sections.flatMap((s) => s.links.map((l) => l.url));
    expect(allUrls.length).toBeGreaterThan(0);

    renderAt('/study/day/1');

    // Pick the first known MS Learn URL and assert link attributes.
    const sample = allUrls[0];
    const link = screen.getByRole('link', { name: new RegExp(day1Doc!.sections[0].links[0].label, 'i') });
    expect(link).toHaveAttribute('href', sample);
    expect(link).toHaveAttribute('target', '_blank');
    const rel = link.getAttribute('rel') ?? '';
    expect(rel).toMatch(/noreferrer/);
  });

  test('5. quiz block links to /quiz?domain=...&len=25 for the day domain', () => {
    // Day 1's only domain is 'prepare', so any "quiz" block resolves to
    // /quiz?domain=prepare&len=25 (target prefix is "domain", value is
    // "prepare").
    renderAt('/study/day/1');
    const startQuiz = screen.getAllByRole('link', { name: /start quiz/i });
    expect(startQuiz.length).toBeGreaterThan(0);
    expect(startQuiz[0]).toHaveAttribute('href', '/quiz?domain=prepare&len=25');
  });

  test('6. prev/next day navigation respects day-1 and day-14 boundaries', () => {
    // Day 1 — no "Day 0" prev link, but a "Day 2 →" next link must exist.
    const { unmount } = renderAt('/study/day/1');
    expect(screen.queryByRole('link', { name: /← Day 0/i })).not.toBeInTheDocument();
    const next = screen.getByRole('link', { name: /Day 2 →/i });
    expect(next).toHaveAttribute('href', '/study/day/2');
    unmount();

    // Day 14 — has "← Day 13" but no "Day 15 →".
    renderAt('/study/day/14');
    const prev = screen.getByRole('link', { name: /← Day 13/i });
    expect(prev).toHaveAttribute('href', '/study/day/13');
    expect(screen.queryByRole('link', { name: /Day 15 →/i })).not.toBeInTheDocument();
  });

  test('7. domain badges render for every domain on the day', () => {
    // Day 7 is multi-domain: ['maintain', 'semantic']. Confirm both labels
    // surface in the header badge row.
    renderAt('/study/day/7');
    const header = screen.getByRole('heading', { level: 1 }).closest('header');
    expect(header).toBeTruthy();
    const headerScope = within(header as HTMLElement);
    // DOMAIN_LABEL maps 'maintain' → 'Maintain solution' and 'semantic' → 'Semantic models'.
    expect(headerScope.getByText(/Maintain solution/)).toBeInTheDocument();
    expect(headerScope.getByText(/Semantic models/)).toBeInTheDocument();
  });
});
