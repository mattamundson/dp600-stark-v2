// Deep-link view for a single question by id — used by `?subtopic=` remediation
// jump-targets and the cross-question "Related traps" links inside explanations.
//
// Read-only review mode: the question is shown pre-revealed with correct
// answers selected so the explanation, why-wrong notes, and related-trap
// links all render in their post-submit form. No attempt is logged.

import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { QuestionPlayer } from '../../components/QuestionPlayer';
import { questionById } from '../../data/questions';

export function SingleQuestionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const q = useMemo(() => (id ? questionById(id) : undefined), [id]);

  if (!id || !q) {
    return (
      <div className="panel">
        <h1 className="text-2xl font-bold">Question not found</h1>
        <p className="mt-2 text-muted">No question matches id <code>{id}</code>.</p>
        <div className="mt-4 flex gap-2">
          <Link to="/quiz" className="btn">Start a quiz</Link>
          <Link to="/remediation" className="btn">Go to remediation</Link>
        </div>
      </div>
    );
  }

  // Pre-fill with the correct answer so QuestionPlayer renders the verdict +
  // explanation panel immediately (review-mode, no attempt logged).
  const value = q.type === 'ordering'
    ? { selectedOrder: q.correctOrder, confidence: 'sure' as const }
    : { selectedOptionIds: q.correctOptionIds, confidence: 'sure' as const };

  return (
    <div className="flex flex-col gap-4">
      <header className="panel">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-faint">Question review · read-only</div>
            <h1 className="text-2xl font-bold">{id}</h1>
          </div>
          <button type="button" className="btn" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </header>
      <QuestionPlayer
        question={q}
        value={value}
        reveal
        result={{ correct: true, partial: 1 }}
      />
    </div>
  );
}
