export const INTAKE_WELCOME_EYEBROW = "Welcome";

export const INTAKE_WELCOME_TITLE = "A quiet space to reflect";

export function intakeWelcomeLead(clientName?: string | null): string {
  if (clientName?.trim()) {
    return `Hi ${clientName.trim()} — before you meet with your clinician, this is a place to pause and notice your own experience.`;
  }
  return "Before you meet with your clinician, this is a place to pause and notice your own experience.";
}

export const INTAKE_WELCOME_INTRO =
  "You'll move through nine short chapters — each one a different lens on how you think, feel, and move through the world. What you share here helps your clinician understand you more fully. It is one part of that picture, not a diagnosis on its own.";

export const INTAKE_EXPECTATIONS = [
  {
    title: "About 25 minutes",
    body: "Nine short chapters you can move through at your own pace.",
  },
  {
    title: "Pause anytime",
    body: "Your progress saves automatically. Return using this same link whenever you're ready.",
  },
  {
    title: "No right or wrong answers",
    body: "Answer honestly, skip what doesn't fit, and leave things blank if you're unsure.",
  },
  {
    title: "Just for your clinician",
    body: "Your responses are shared only with the clinician who sent you this link.",
  },
] as const;

export const INTAKE_LEGAL_DETAILS_SUMMARY = "Important to know";

export const INTAKE_LEGAL_SECTIONS = [
  {
    heading: "Privacy",
    body: "Your responses are saved automatically and shared only with your clinician. Please keep this link private.",
  },
  {
    heading: "Not for emergencies",
    body: "If you are in immediate danger or thinking about harming yourself or others, contact local emergency services or a crisis line. Do not use this form for urgent help.",
  },
  {
    heading: "What this is not",
    body: "This exploration is not a diagnosis, emergency service, or substitute for medical or mental health care.",
  },
] as const;

export const INTAKE_CONSENT_CHECKBOX_LABEL =
  "I understand how my responses will be used and I'm ready to begin.";

export const INTAKE_BEGIN_CTA = "Begin exploring";

export const INTAKE_BEGIN_CTA_LOADING = "Starting…";

/** @deprecated Use INTAKE_WELCOME_TITLE — kept for any external imports */
export const INTAKE_CONSENT_TITLE = INTAKE_WELCOME_TITLE;

/** @deprecated Use INTAKE_LEGAL_SECTIONS */
export const INTAKE_CONSENT_SECTIONS = INTAKE_LEGAL_SECTIONS;
