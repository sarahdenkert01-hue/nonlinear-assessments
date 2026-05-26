export const INTAKE_CONSENT_TITLE = "Before you begin";

export const INTAKE_CONSENT_SECTIONS = [
  {
    heading: "What this is",
    body: "This questionnaire helps your clinician prepare for your assessment. It is not a diagnosis, emergency service, or substitute for medical or mental health care.",
  },
  {
    heading: "Your data",
    body: "Your responses are saved automatically and shared only with the clinician who sent you this link. Do not share this link with others.",
  },
  {
    heading: "If you are in crisis",
    body: "If you are in immediate danger or thinking about harming yourself or others, contact local emergency services or a crisis line in your area. Do not use this form for urgent help.",
  },
] as const;

export const INTAKE_CONSENT_CHECKBOX_LABEL =
  "I understand and agree to continue with this questionnaire.";
