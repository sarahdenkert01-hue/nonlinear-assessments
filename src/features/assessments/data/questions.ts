import type { QuestionItem } from "../types";

export const FREQUENCY_OPTIONS = [
  "Never",
  "Rarely",
  "Sometimes",
  "Often",
  "Very Often",
] as const;

export const AGREEMENT_OPTIONS = [
  "Strongly disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly agree",
] as const;

/** Valid for frequency and agreement scales — never triggers clinical flags. */
export const NOT_SURE_OPTION = "Not sure" as const;

export type FrequencyOption = (typeof FREQUENCY_OPTIONS)[number];
export type AgreementOption = (typeof AGREEMENT_OPTIONS)[number];

export const QUESTIONS: QuestionItem[] = [
  {
    section: "How you move through the world",
    sectionDesc:
      "These questions are about how you present yourself in different situations.",
  },

  {
    id: "q01",
    text: "I adjust how I speak, move, or act depending on who I am with, sometimes in ways that feel exhausting to maintain.",
    format: "frequency",
    themes: ["masking", "masking-fatigue"],
    weight: "primary",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q02",
    text: "After social interactions, I need significant time alone to recover, even when the interaction went well.",
    format: "frequency",
    themes: ["masking-fatigue", "social-processing-exhaustion"],
    weight: "primary",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q03",
    text: "I have learned to imitate or study how other people behave so I can fit in more naturally.",
    format: "agreement",
    themes: ["masking", "chronic-overcompensation"],
    weight: "primary",
    flag: { agreement: ["Agree", "Strongly agree"] },
  },

  {
    id: "q04",
    text: "People who know me in one context (e.g. work) would be surprised by how I am in another context (e.g. home).",
    format: "agreement",
    themes: ["masking", "identity-fragmentation"],
    weight: "contributing",
    flag: { agreement: ["Agree", "Strongly agree"] },
  },

  {
    id: "q05",
    text: "I often feel like I am performing a version of myself rather than simply being myself.",
    format: "frequency",
    themes: ["masking", "identity-suppression", "identity-fragmentation"],
    weight: "primary",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q06",
    text: "I push through situations that feel overwhelming rather than removing myself, because leaving feels worse than staying.",
    format: "frequency",
    themes: ["chronic-overcompensation", "masking", "nervous-system-dysregulation"],
    weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    section: "Thinking and getting things done",
    sectionDesc:
      "These questions are about how you manage tasks, focus, and mental energy.",
  },

  {
    id: "q07",
    text: "I struggle to start tasks even when I genuinely want to do them and know how.",
    format: "frequency",
    themes: ["task-paralysis", "executive-dysfunction"],
    weight: "primary",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q08",
    text: "I have difficulty holding multiple pieces of information in mind at once while working.",
    format: "frequency",
    themes: ["executive-dysfunction", "cognitive-overload"],
    weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q09",
    text: "My ability to function varies drastically from day to day in ways I can't always predict or control.",
    format: "frequency",
    themes: ["functional-inconsistency", "neurodivergent-burnout", "nervous-system-dysregulation"],
    weight: "primary",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q10",
    text: "I frequently know what I need to do but feel completely unable to make myself do it.",
    format: "frequency",
    themes: ["task-paralysis", "executive-dysfunction"],
    weight: "primary",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q11",
    text: "By the end of the day my brain feels full, like I have run out of capacity to process any more.",
    format: "frequency",
    themes: ["cognitive-overload", "neurodivergent-burnout", "masking-fatigue"],
    weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q12",
    text: "I have periods where I seem highly productive, followed by crashes where I can barely function.",
    format: "frequency",
    themes: ["functional-inconsistency", "burnout-recovery", "neurodivergent-burnout"],
    weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q13",
    text: "I hold myself to standards I would never apply to other people, and feel deeply ashamed when I fall short.",
    format: "agreement",
    themes: ["perfectionistic-compensation", "chronic-shame"],
    weight: "primary",
    flag: { agreement: ["Agree", "Strongly agree"] },
  },

  {
    id: "q14",
    text: "I over-prepare, over-research, or work much harder than necessary to produce results others achieve with less effort.",
    format: "frequency",
    themes: ["perfectionistic-compensation", "chronic-overcompensation"],
    weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    section: "Your body and nervous system",
    sectionDesc:
      "These questions are about physical sensations, environment, and how your body responds to the world.",
  },

  {
    id: "q15",
    text: "Certain sounds, textures, lights, or smells that others seem to ignore feel unbearable or intensely distracting to me.",
    format: "frequency",
    themes: ["sensory-dysregulation", "nervous-system-dysregulation"],
    weight: "primary",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q16",
    text: "I notice sensory details in my environment that others don't seem to register at all.",
    format: "agreement",
    themes: ["sensory-dysregulation"],
    weight: "contributing",
    flag: { agreement: ["Agree", "Strongly agree"] },
  },

  {
    id: "q17",
    text: "When I am overwhelmed, I sometimes shut down completely, losing the ability to speak, make decisions, or move.",
    format: "frequency",
    themes: ["shutdown-collapse", "nervous-system-dysregulation", "neurodivergent-burnout"],
    weight: "primary",
    flag: { frequency: ["Sometimes", "Often", "Very Often"] },
  },

  {
    id: "q18",
    text: "My body often feels tense, braced, or on alert, even in environments that are technically safe.",
    format: "frequency",
    themes: ["chronic-hypervigilance", "nervous-system-dysregulation", "trauma-overlap"],
    weight: "primary",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q19",
    text: "I am easily startled, or find loud or unexpected sounds feel physically jarring.",
    format: "frequency",
    themes: ["sensory-dysregulation", "chronic-hypervigilance", "nervous-system-dysregulation"],
    weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q20",
    text: "My sensory needs affect my ability to work, socialize, or function in public spaces.",
    format: "frequency",
    themes: ["sensory-dysregulation", "functional-inconsistency"],
    weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    section: "Emotions and how you handle them",
    sectionDesc:
      "These questions are about your emotional experiences and how you process and express feelings.",
  },

  {
    id: "q21",
    text: "My emotions can shift very quickly and with an intensity that feels hard to control.",
    format: "frequency",
    themes: ["emotional-dysregulation", "emotional-flooding"],
    weight: "primary",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q22",
    text: "Once I am upset, it takes a long time, sometimes hours or days, to return to feeling okay.",
    format: "frequency",
    themes: ["emotional-flooding", "emotional-dysregulation", "nervous-system-dysregulation"],
    weight: "primary",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q23",
    text: "I keep most of my emotional experience private, even from people close to me.",
    format: "agreement",
    themes: ["emotional-suppression", "masking", "relational-safety"],
    weight: "contributing",
    flag: { agreement: ["Agree", "Strongly agree"] },
  },

  {
    id: "q24",
    text: "I often don't know what I'm feeling until long after the moment has passed.",
    format: "frequency",
    themes: ["emotional-suppression", "emotional-dysregulation"],
    weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q25",
    text: "Perceived criticism or rejection, even when minor or imagined, can feel completely destabilizing.",
    format: "frequency",
    themes: ["rejection-sensitivity", "emotional-flooding", "chronic-hypervigilance"],
    weight: "primary",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q26",
    text: "I replay social interactions afterward, analyzing what I said or did wrong.",
    format: "frequency",
    themes: ["social-hyperanalysis", "rejection-sensitivity", "chronic-hypervigilance"],
    weight: "primary",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q27",
    text: "I compartmentalize difficult emotions, putting them aside to deal with later, sometimes forgetting them entirely.",
    format: "frequency",
    themes: ["emotional-suppression"],
    weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    section: "Social experiences",
    sectionDesc:
      "These questions are about how you experience relationships and social situations.",
  },

  {
    id: "q28",
    text: "Social situations take significant mental effort. I am often tracking multiple things at once such as tone, expression, and what to say next.",
    format: "frequency",
    themes: ["social-hyperanalysis", "social-processing-exhaustion", "masking"],
    weight: "primary",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q29",
    text: "After group social events I feel depleted in a way that takes days to recover from.",
    format: "frequency",
    themes: ["social-processing-exhaustion", "masking-fatigue", "neurodivergent-burnout"],
    weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q30",
    text: "I find it difficult to trust that relationships are safe or stable, even with people who haven't hurt me.",
    format: "agreement",
    themes: ["relational-safety", "chronic-hypervigilance", "trauma-overlap"],
    weight: "primary",
    flag: { agreement: ["Agree", "Strongly agree"] },
  },

  {
    id: "q31",
    text: "I often feel like I have to earn my place in relationships through effort, helpfulness, or achievement.",
    format: "agreement",
    themes: ["relational-safety", "chronic-overcompensation", "rejection-sensitivity"],
    weight: "contributing",
    flag: { agreement: ["Agree", "Strongly agree"] },
  },

  {
    id: "q32",
    text: "I can appear confident or socially capable in public while feeling completely disconnected inside.",
    format: "frequency",
    themes: ["masking", "identity-suppression", "social-processing-exhaustion"],
    weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    section: "Burnout and energy",
    sectionDesc:
      "These questions are about your overall energy, resilience, and recovery.",
  },

  {
    id: "q33",
    text: "There have been periods in my life where I have lost the ability to do things I previously managed and have not fully recovered.",
    format: "agreement",
    themes: ["burnout-recovery", "neurodivergent-burnout", "shutdown-collapse"],
    weight: "primary",
    flag: { agreement: ["Agree", "Strongly agree"] },
  },

  {
    id: "q34",
    text: "I have experienced extended periods, weeks or months, where my functioning collapsed significantly.",
    format: "frequency",
    themes: ["neurodivergent-burnout", "burnout-recovery", "shutdown-collapse"],
    weight: "primary",
    flag: { frequency: ["Sometimes", "Often", "Very Often"] },
  },

  {
    id: "q35",
    text: "Even after rest, I often do not feel restored, like my baseline level of tired keeps rising.",
    format: "frequency",
    themes: ["burnout-recovery", "neurodivergent-burnout", "cognitive-overload"],
    weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q36",
    text: "I've had to significantly reduce what I do or who I am to avoid complete collapse.",
    format: "agreement",
    themes: ["neurodivergent-burnout", "burnout-recovery", "identity-suppression"],
    weight: "contributing",
    flag: { agreement: ["Agree", "Strongly agree"] },
  },

  {
    section: "Identity and sense of self",
    sectionDesc:
      "These questions are about how you understand yourself and your place in the world. There are no right or wrong answers.",
  },

  {
    id: "q37",
    text: "I often feel unsure of who I actually am beneath the roles and expectations I carry.",
    format: "agreement",
    themes: ["identity-confusion", "identity-suppression", "identity-fragmentation"],
    weight: "primary",
    flag: { agreement: ["Agree", "Strongly agree"] },
  },

  {
    id: "q38",
    text: "I have suppressed parts of myself, including interests, ways of thinking, or ways of being, because they did not fit in.",
    format: "agreement",
    themes: ["identity-suppression", "masking", "chronic-overcompensation"],
    weight: "primary",
    flag: { agreement: ["Agree", "Strongly agree"] },
  },

  {
    id: "q39",
    text: "I feel like a different person depending on who I am with, not just in style, but in values or personality.",
    format: "frequency",
    themes: ["identity-fragmentation", "masking", "identity-confusion"],
    weight: "primary",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q40",
    text: "I have spent a lot of my life feeling like something is fundamentally wrong with me, without being able to name what.",
    format: "agreement",
    themes: ["chronic-shame", "identity-confusion", "neurodivergent-burnout"],
    weight: "primary",
    flag: { agreement: ["Agree", "Strongly agree"] },
  },

  {
    id: "q41",
    text: "I struggle to know what I actually want, feel, or prefer — separate from what others expect of me.",
    format: "frequency",
    themes: ["identity-suppression", "identity-confusion", "emotional-suppression"],
    weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q42",
    text: "I carry a deep sense of shame about my struggles that goes beyond normal self-criticism.",
    format: "agreement",
    themes: ["chronic-shame", "identity-suppression", "chronic-overcompensation"],
    weight: "primary",
    flag: { agreement: ["Agree", "Strongly agree"] },
  },

  {
    section: "Your story so far",
    sectionDesc: "A few broader questions about your life experiences and the patterns you've noticed along the way.",
  },

  {
    id: "q43",
    text: "I have experienced significant stress, loss, or frightening events that still affect how I feel or function today.",
    format: "agreement",
    themes: ["trauma-overlap"],
    weight: "primary",
    flag: { agreement: ["Agree", "Strongly agree"] },
  },

  {
    id: "q44",
    text: "My nervous system often reacts to situations in ways that seem out of proportion, like my body is responding to a threat that is not there.",
    format: "frequency",
    themes: ["trauma-overlap", "chronic-hypervigilance", "nervous-system-dysregulation"],
    weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] },
  },

  {
    id: "q45",
    text: "I've been told I'm 'too sensitive', 'too much', or 'too intense' throughout my life.",
    format: "agreement",
    themes: ["chronic-shame", "emotional-dysregulation", "rejection-sensitivity", "identity-suppression"],
    weight: "contributing",
    flag: { agreement: ["Agree", "Strongly agree"] },
  },

  {
    id: "q46",
    text: "Looking back, I believe I spent many years compensating for difficulties others did not seem to have, without understanding why.",
    format: "agreement",
    themes: ["chronic-overcompensation", "masking", "neurodivergent-burnout", "identity-confusion"],
    weight: "contributing",
    flag: { agreement: ["Agree", "Strongly agree"] },
  },

  {
    section: "In your own words",
    sectionDesc:
      "These open questions give you space to share what the earlier topics may not have captured.",
  },

  {
    id: "q47",
    text: "What are the main day-to-day difficulties that brought you to seek an assessment?",
    format: "open",
    themes: [],
    weight: "context",
  },

  {
    id: "q48",
    text: "Is there anything about yourself that you've never been able to fully explain to others?",
    format: "open",
    themes: ["identity-confusion", "masking", "identity-fragmentation"],
    weight: "context",
  },

  {
    id: "q49",
    text: "What does a difficult day look like for you?",
    format: "open",
    themes: ["neurodivergent-burnout", "shutdown-collapse", "functional-inconsistency"],
    weight: "context",
  },
];
