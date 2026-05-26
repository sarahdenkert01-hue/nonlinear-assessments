import type { Theme } from "../types";

export const THEMES: Theme[] = [
  { id: "masking", label: "Masking", category: "Autism", sensitivity: "high", triggerMode: "single" },
  { id: "executive-dysfunction", label: "Executive Dysfunction", category: "ADHD", sensitivity: "convergence", triggerMode: "2of3" },
  { id: "sensory-dysregulation", label: "Sensory Dysregulation", category: "Autism", sensitivity: "convergence", triggerMode: "2of3" },
  { id: "neurodivergent-burnout", label: "Neurodivergent Burnout", category: "Both", sensitivity: "convergence", triggerMode: "2of3" },
  { id: "trauma-overlap", label: "Trauma & Neurodivergence Overlap", category: "Both", sensitivity: "high", triggerMode: "single" },
  { id: "chronic-overcompensation", label: "Chronic Overcompensation", category: "Both", sensitivity: "convergence", triggerMode: "2of3" },
  { id: "identity-confusion", label: "Identity Confusion", category: "Both", sensitivity: "high", triggerMode: "single" },
  { id: "social-hyperanalysis", label: "Social Hyperanalysis", category: "Autism", sensitivity: "convergence", triggerMode: "2of3" },
  { id: "task-paralysis", label: "Task Paralysis", category: "ADHD", sensitivity: "convergence", triggerMode: "2of3" },
  { id: "masking-fatigue", label: "Masking Fatigue", category: "Autism", sensitivity: "high", triggerMode: "single" },
  { id: "social-processing-exhaustion", label: "Social Processing Exhaustion", category: "Autism", sensitivity: "convergence", triggerMode: "2of3" },
  { id: "chronic-hypervigilance", label: "Chronic Hypervigilance", category: "Both", sensitivity: "high", triggerMode: "single" },
  { id: "relational-safety", label: "Relational Safety & Attachment Adaptation", category: "Both", sensitivity: "high", triggerMode: "single" },
  { id: "shutdown-collapse", label: "Shutdown & Functional Collapse", category: "Both", sensitivity: "high", triggerMode: "single" },
  { id: "emotional-dysregulation", label: "Emotional Dysregulation", category: "ADHD", sensitivity: "convergence", triggerMode: "2of3" },
  { id: "perfectionistic-compensation", label: "Perfectionistic Compensation", category: "Both", sensitivity: "convergence", triggerMode: "2of3" },
  { id: "identity-suppression", label: "Identity Suppression & Self-Alienation", category: "Both", sensitivity: "high", triggerMode: "single" },
  { id: "nervous-system-dysregulation", label: "Nervous System Dysregulation", category: "Both", sensitivity: "convergence", triggerMode: "2of3" },
  { id: "rejection-sensitivity", label: "Rejection Sensitivity & Relational Threat Processing", category: "ADHD", sensitivity: "high", triggerMode: "single" },
  { id: "emotional-suppression", label: "Emotional Suppression & Compartmentalization", category: "Both", sensitivity: "convergence", triggerMode: "2of3" },
  { id: "burnout-recovery", label: "Burnout Recovery Impairment", category: "Both", sensitivity: "convergence", triggerMode: "2of3" },
  { id: "cognitive-overload", label: "Cognitive Overload & Mental Fatigue", category: "Both", sensitivity: "convergence", triggerMode: "2of3" },
  { id: "functional-inconsistency", label: "Functional Inconsistency", category: "ADHD", sensitivity: "convergence", triggerMode: "2of3" },
  { id: "chronic-shame", label: "Chronic Shame & Internalized Defectiveness", category: "Both", sensitivity: "high", triggerMode: "single" },
  { id: "emotional-flooding", label: "Emotional Flooding & Recovery Difficulty", category: "Both", sensitivity: "convergence", triggerMode: "2of3" },
  { id: "identity-fragmentation", label: "Identity Fragmentation", category: "Both", sensitivity: "high", triggerMode: "single" },
];

const themeById = new Map(THEMES.map((t) => [t.id, t]));

export function getThemeById(id: string): Theme | undefined {
  return themeById.get(id);
}
