import {
  q62StrengthVerb,
  type Q62AcquiredEfContext,
} from "@/features/assessments/lib/q62-context";
import "./acquired-ef-context-banner.css";

/**
 * Non-scored clinician notice for q62 endorsement.
 * Must not be used to create findings, domain evidence, or theme hits.
 */
export function AcquiredEfContextBanner({
  context,
}: {
  context: Q62AcquiredEfContext;
}) {
  const verb = q62StrengthVerb(context.strength);

  return (
    <aside
      className="acquired-ef-banner"
      role="note"
      aria-label="Context affecting interpretation"
    >
      <div className="acquired-ef-banner-header">
        <h2 className="acquired-ef-banner-title">Context affecting interpretation</h2>
        <span className="acquired-ef-banner-badge">
          Client self-report — not a Clinical Theme
        </span>
      </div>
      <p className="acquired-ef-banner-body">
        The client {verb} that their difficulties with starting, organizing, remembering, or
        completing tasks became significantly worse following a major change such as illness,
        pain, trauma, burnout, sleep disruption, or increased stress.
      </p>
      <p className="acquired-ef-banner-note">
        Consider this when evaluating developmental course and alternative explanations. This
        response should not be treated as ADHD or Autism evidence.
      </p>
    </aside>
  );
}
