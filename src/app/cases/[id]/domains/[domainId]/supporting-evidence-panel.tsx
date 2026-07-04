import type { EvidenceSourceType, EvidenceBucketView } from "@/lib/domains/types";
import { computeEvidenceCoverage } from "@/lib/domains";

export function SupportingEvidencePanel({
  domainId,
  confirmedFindingCount,
  evidenceCount,
  sourceTypes,
  evidenceBuckets,
}: {
  domainId: string;
  confirmedFindingCount: number;
  evidenceCount: number;
  sourceTypes: EvidenceSourceType[];
  evidenceBuckets: EvidenceBucketView[];
}) {
  const coverage = computeEvidenceCoverage(domainId, sourceTypes as never);

  return (
    <section id="section-know" className="dm-panel dm-section">
      <p className="dm-question-label">1. What do we know?</p>
      <h2 className="dm-panel-title">Supporting evidence</h2>
      <p className="dm-panel-hint">Descriptive inventory by source — no interpretation yet.</p>

      <div className="dm-know-stats">
        <div className="dm-know-stat">
          <span className="dm-know-stat-value">{confirmedFindingCount}</span>
          <span className="dm-know-stat-label">Confirmed findings</span>
        </div>
        <div className="dm-know-stat">
          <span className="dm-know-stat-value">{evidenceCount}</span>
          <span className="dm-know-stat-label">Evidence items</span>
        </div>
        {coverage.expected > 0 && (
          <div className="dm-know-stat">
            <span className="dm-know-stat-value">{coverage.percent}%</span>
            <span className="dm-know-stat-label">Source coverage</span>
          </div>
        )}
      </div>

      {evidenceBuckets.length === 0 ? (
        <p className="dm-panel-hint">No evidence linked yet.</p>
      ) : (
        <div className="dm-source-groups">
          {evidenceBuckets.map((bucket) => (
            <details key={bucket.id} className="dm-source-group" open={bucket.id === "screener"}>
              <summary className="dm-source-group-summary">
                <span className="dm-source-group-label">{bucket.label}</span>
                <span className="dm-finding-meta">
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
                        <p className="dm-panel-hint" style={{ margin: "0.5rem 0.85rem 0.75rem" }}>
                          No item-level evidence.
                        </p>
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
                <p className="dm-panel-hint" style={{ margin: "0 0 0.75rem" }}>
                  No items in this source yet.
                </p>
              )}
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
