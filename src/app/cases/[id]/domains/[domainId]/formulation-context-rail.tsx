import type { DomainDetail } from "@/lib/domains/types";

export function FormulationContextRail({
  domain,
  onGoToUnderstand,
}: {
  domain: DomainDetail;
  onGoToUnderstand: () => void;
}) {
  const askedWithNotes = domain.clinicalQuestionPrompts.filter(
    (q) => q.askedAt || q.note?.trim(),
  );
  const synthesisPreview = domain.evidenceSummaryDraft?.trim();
  const synthesisExcerpt =
    synthesisPreview && synthesisPreview.length > 280
      ? `${synthesisPreview.slice(0, 280).trim()}…`
      : synthesisPreview;

  return (
    <aside className="dm-context-rail">
      <h3 className="dm-context-rail-title">Integrated context</h3>
      <p className="dm-panel-hint">Read-only — supports formulation without auto-filling fields.</p>

      <div className="dm-context-block">
        <h4 className="dm-context-label">Confirmed findings</h4>
        {domain.findings.length === 0 ? (
          <p className="dm-context-text">None linked.</p>
        ) : (
          <ul className="dm-context-list">
            {domain.findings.map((f) => (
              <li key={f.id}>
                {f.label} ({f.hits}/{f.total})
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="dm-context-block">
        <div className="dm-sidebar-block-head">
          <h4 className="dm-context-label">Clinical synthesis</h4>
          <button type="button" className="dm-link-btn" onClick={onGoToUnderstand}>
            Edit ↗
          </button>
        </div>
        {synthesisExcerpt ? (
          <p className="dm-context-text">{synthesisExcerpt}</p>
        ) : (
          <p className="dm-context-text">Not drafted yet.</p>
        )}
      </div>

      {domain.assessmentOpportunityGroups.length > 0 && (
        <div className="dm-context-block">
          <h4 className="dm-context-label">Assessment opportunities</h4>
          {domain.assessmentOpportunityGroups.map((g) => (
            <div key={g.category}>
              <p className="dm-context-sub">{g.label}</p>
              <ul className="dm-context-list">
                {g.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {askedWithNotes.length > 0 && (
        <div className="dm-context-block">
          <h4 className="dm-context-label">Interview prompts</h4>
          <ul className="dm-context-list">
            {askedWithNotes.map((q) => (
              <li key={q.id}>
                <strong>{q.text}</strong>
                {q.note?.trim() ? <div className="dm-context-note">{q.note}</div> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {domain.alternativeExplanations.length > 0 && (
        <div className="dm-context-block">
          <h4 className="dm-context-label">Other explanatory factors</h4>
          <ul className="dm-context-list">
            {domain.alternativeExplanations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
