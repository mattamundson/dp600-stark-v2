// Dashboard entry card for the "Drill 25 unseen" quiz mode.
//
// Surfaces the count of never-attempted questions and a CTA into
// `/quiz/unseen?len=25`. Hides itself when the user has attempted every
// question in the bank — at that point the friendly fallback inside
// UnseenOnlyQuizView would show anyway, no need to clutter the dashboard.
//
// Intentionally NOT marked `exam-day-hide`: drilling unseen Qs is the
// highest-ROI study mode in the final stretch, and exam-day mode shouldn't
// suppress its entry point.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { questionBank } from '../../data/questions';
import { listAttempts } from '../../lib/storage/db';
import type { Attempt } from '../../lib/schema';
import { getUnseenQuestionIds } from './unseen-only';

export function UnseenOnlyEntryCard() {
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);

  useEffect(() => {
    let alive = true;
    void listAttempts().then((all) => {
      if (alive) setAttempts(all);
    });
    return () => {
      alive = false;
    };
  }, []);

  const unseenCount = useMemo(() => {
    if (attempts === null) return null;
    return getUnseenQuestionIds(questionBank, attempts).length;
  }, [attempts]);

  // While loading, render nothing — avoids a layout flicker if the user has
  // zero unseen and the card would be hidden once data lands.
  if (unseenCount === null) return null;
  if (unseenCount === 0) return null;

  const drillSize = Math.min(25, unseenCount);

  return (
    <section className="panel border-primary/40 bg-primary/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-faint">Unseen questions</div>
          <h2 className="text-lg font-bold">{unseenCount} questions you've never seen</h2>
          <p className="text-sm text-muted">
            Highest-ROI study mode with T-10 days to exam — drill novel content rather than reshuffle drill.
          </p>
        </div>
        <Link
          to={`/quiz/unseen?len=${drillSize}`}
          className="btn btn-primary"
          aria-label={`Drill ${drillSize} unseen questions`}
        >
          Drill {drillSize} unseen →
        </Link>
      </div>
    </section>
  );
}
