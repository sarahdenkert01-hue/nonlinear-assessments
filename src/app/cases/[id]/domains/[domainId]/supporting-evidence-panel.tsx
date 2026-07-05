import type { EvidenceBucketView, EvidenceSourceType } from "@/lib/domains/types";

export function SupportingEvidencePanel({
  confirmedFindingCount,
  evidenceCount,
  evidenceBuckets,
}: {
  domainId?: string;
  confirmedFindingCount: number;
  evidenceCount: number;
  sourceTypes?: EvidenceSourceType[];
  evidenceBuckets: EvidenceBucketView[];
}) {
  return (
    <section id="section-know" className="dm-workspace-section">
      <h2 className="dm-section-heading">Supporting evidence</h2>
      <p className="dm-section-lead">
        What do I know? Review linked findings and source material before interpreting.
      </p>

      <div className="dm-know-stats">
        <div className="dm-know-stat">
          <span className="dm-know-stat-value">{confirmedFindingCount}</span>
          <span className="dm-know-stat-label">Confirmed findings</span>
        </div>
        <div className="dm-know-stat">
          <span className="dm-know-stat-value">{evidenceCount}</span>
          <span className="dm-know-stat-label">Evidence items</span>
        </div>
      </div>

      {evidenceBuckets.length === 0 ? (
        <p className="dm-section-lead">No evidence linked yet.</p>
      ) : (
        <div className="dm-source-groups">
          {evidenceBuckets.map((bucket) => (
            <details key={bucket.id} className="dm-source-group" open={bucket.id === "screener"}>
              <summary className="dm-source-group-summary">
                <span className="dm-source-group-label">{bucket.label}</span>
                <span className="dm-source-group-meta">
                  {bucket.itemCount} item{bucket.itemCount === 1 ? "" : "s"}
                </span>
              </summary>
              <p className="dm-source-group-desc">{bucket.description}</p>

              {bucket.findings.length > 0 && (
                <div className="dm-finding-list">
                  {bucket.findings.map((f) => (
                    <details key={f.id} className="dm-finding-expand">
                      <summary className="dm-finding-expand-summary">
                        <span className="dm-finding-label">{f.label}</span>
                        <span className="dm-finding-meta">
                          {f.hits}/{f.total} · {f.evidenceCount} item
                          {f.evidenceCount === 1 ? "" : "s"}
                        </span>
                      </summary>
                      {f.evidence.length === 0 ? (
                        <p className="dm-section-lead dm-section-lead--inset">No item-level evidence.</p>
                      ) : (
                        <ul className="dm-evidence-items">
                          {f.evidence.map((e) => (
                            <li key={e.id} className="dm-evidence-item">
                              <div className="dm-evidence-q">{e.text}</div>
                              <div className="dm-evidence-a">{e.answer || "—"}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </details>
                  ))}
                </div>
              )}

              {bucket.items.length > 0 && (
                <ul className="dm-evidence-items">
                  {bucket.items.map((e) => (
                    <li key={e.id} className="dm-evidence-item">
                      {e.findingLabel && (
                        <div className="dm-finding-meta">{e.findingLabel}</div>
                      )}
                      <div className="dm-evidence-a">{e.excerpt || e.itemId || "Evidence item"}</div>
                    </li>
                  ))}
                </ul>
              )}

              {bucket.findings.length === 0 && bucket.items.length === 0 && (
                <p className="dm-section-lead dm-section-lead--inset">No items in this source yet.</p>
              )}
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
