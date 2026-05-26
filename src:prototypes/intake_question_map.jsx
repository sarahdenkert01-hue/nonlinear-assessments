import { useState } from "react";

// ─── Theme & Question Data ──────────────────────────────────────────────────────

export const THEMES = [
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

// Format types: "frequency" = Never/Rarely/Sometimes/Often/Very Often
//               "agreement" = Strongly disagree → Strongly agree
//               "open" = free text
// Trigger weight: "primary" = this question alone can flag (high-sensitivity themes)
//                 "contributing" = counts toward convergence threshold

export const QUESTIONS = [
  // ── SECTION 1: How You Move Through the World ──────────────────────────────

  { section: "How you move through the world", sectionDesc: "These questions are about how you present yourself in different situations." },

  { id: "q01", text: "I adjust how I speak, move, or act depending on who I am with, sometimes in ways that feel exhausting to maintain.",
    format: "frequency", themes: ["masking", "masking-fatigue"], weight: "primary",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q02", text: "After social interactions, I need significant time alone to recover, even when the interaction went well.",
    format: "frequency", themes: ["masking-fatigue", "social-processing-exhaustion"], weight: "primary",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q03", text: "I have learned to imitate or study how other people behave so I can fit in more naturally.",
    format: "agreement", themes: ["masking", "chronic-overcompensation"], weight: "primary",
    flag: { agreement: ["Agree", "Strongly agree"] } },

  { id: "q04", text: "People who know me in one context (e.g. work) would be surprised by how I am in another context (e.g. home).",
    format: "agreement", themes: ["masking", "identity-fragmentation"], weight: "contributing",
    flag: { agreement: ["Agree", "Strongly agree"] } },

  { id: "q05", text: "I often feel like I am performing a version of myself rather than simply being myself.",
    format: "frequency", themes: ["masking", "identity-suppression", "identity-fragmentation"], weight: "primary",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q06", text: "I push through situations that feel overwhelming rather than removing myself, because leaving feels worse than staying.",
    format: "frequency", themes: ["chronic-overcompensation", "masking", "nervous-system-dysregulation"], weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] } },

  // ── SECTION 2: Thinking & Getting Things Done ─────────────────────────────

  { section: "Thinking and getting things done", sectionDesc: "These questions are about how you manage tasks, focus, and mental energy." },

  { id: "q07", text: "I struggle to start tasks even when I genuinely want to do them and know how.",
    format: "frequency", themes: ["task-paralysis", "executive-dysfunction"], weight: "primary",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q08", text: "I have difficulty holding multiple pieces of information in mind at once while working.",
    format: "frequency", themes: ["executive-dysfunction", "cognitive-overload"], weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q09", text: "My ability to function varies drastically from day to day in ways I can't always predict or control.",
    format: "frequency", themes: ["functional-inconsistency", "neurodivergent-burnout", "nervous-system-dysregulation"], weight: "primary",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q10", text: "I frequently know what I need to do but feel completely unable to make myself do it.",
    format: "frequency", themes: ["task-paralysis", "executive-dysfunction"], weight: "primary",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q11", text: "By the end of the day my brain feels full, like I have run out of capacity to process any more.",
    format: "frequency", themes: ["cognitive-overload", "neurodivergent-burnout", "masking-fatigue"], weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q12", text: "I have periods where I seem highly productive, followed by crashes where I can barely function.",
    format: "frequency", themes: ["functional-inconsistency", "burnout-recovery", "neurodivergent-burnout"], weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q13", text: "I hold myself to standards I would never apply to other people, and feel deeply ashamed when I fall short.",
    format: "agreement", themes: ["perfectionistic-compensation", "chronic-shame"], weight: "primary",
    flag: { agreement: ["Agree", "Strongly agree"] } },

  { id: "q14", text: "I over-prepare, over-research, or work much harder than necessary to produce results others achieve with less effort.",
    format: "frequency", themes: ["perfectionistic-compensation", "chronic-overcompensation"], weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] } },

  // ── SECTION 3: Your Body & Nervous System ─────────────────────────────────

  { section: "Your body and nervous system", sectionDesc: "These questions are about physical sensations, environment, and how your body responds to the world." },

  { id: "q15", text: "Certain sounds, textures, lights, or smells that others seem to ignore feel unbearable or intensely distracting to me.",
    format: "frequency", themes: ["sensory-dysregulation", "nervous-system-dysregulation"], weight: "primary",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q16", text: "I notice sensory details in my environment that others don't seem to register at all.",
    format: "agreement", themes: ["sensory-dysregulation"], weight: "contributing",
    flag: { agreement: ["Agree", "Strongly agree"] } },

  { id: "q17", text: "When I am overwhelmed, I sometimes shut down completely, losing the ability to speak, make decisions, or move.",
    format: "frequency", themes: ["shutdown-collapse", "nervous-system-dysregulation", "neurodivergent-burnout"], weight: "primary",
    flag: { frequency: ["Sometimes", "Often", "Very Often"] } },

  { id: "q18", text: "My body often feels tense, braced, or on alert, even in environments that are technically safe.",
    format: "frequency", themes: ["chronic-hypervigilance", "nervous-system-dysregulation", "trauma-overlap"], weight: "primary",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q19", text: "I am easily startled, or find loud or unexpected sounds feel physically jarring.",
    format: "frequency", themes: ["sensory-dysregulation", "chronic-hypervigilance", "nervous-system-dysregulation"], weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q20", text: "My sensory needs affect my ability to work, socialize, or function in public spaces.",
    format: "frequency", themes: ["sensory-dysregulation", "functional-inconsistency"], weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] } },

  // ── SECTION 4: Emotions & How You Handle Them ─────────────────────────────

  { section: "Emotions and how you handle them", sectionDesc: "These questions are about your emotional experiences and how you process and express feelings." },

  { id: "q21", text: "My emotions can shift very quickly and with an intensity that feels hard to control.",
    format: "frequency", themes: ["emotional-dysregulation", "emotional-flooding"], weight: "primary",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q22", text: "Once I am upset, it takes a long time, sometimes hours or days, to return to feeling okay.",
    format: "frequency", themes: ["emotional-flooding", "emotional-dysregulation", "nervous-system-dysregulation"], weight: "primary",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q23", text: "I keep most of my emotional experience private, even from people close to me.",
    format: "agreement", themes: ["emotional-suppression", "masking", "relational-safety"], weight: "contributing",
    flag: { agreement: ["Agree", "Strongly agree"] } },

  { id: "q24", text: "I often don't know what I'm feeling until long after the moment has passed.",
    format: "frequency", themes: ["emotional-suppression", "emotional-dysregulation"], weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q25", text: "Perceived criticism or rejection, even when minor or imagined, can feel completely destabilizing.",
    format: "frequency", themes: ["rejection-sensitivity", "emotional-flooding", "chronic-hypervigilance"], weight: "primary",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q26", text: "I replay social interactions afterward, analyzing what I said or did wrong.",
    format: "frequency", themes: ["social-hyperanalysis", "rejection-sensitivity", "chronic-hypervigilance"], weight: "primary",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q27", text: "I compartmentalize difficult emotions, putting them aside to deal with later, sometimes forgetting them entirely.",
    format: "frequency", themes: ["emotional-suppression"], weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] } },

  // ── SECTION 5: Social Experiences ─────────────────────────────────────────

  { section: "Social experiences", sectionDesc: "These questions are about how you experience relationships and social situations." },

  { id: "q28", text: "Social situations take significant mental effort. I am often tracking multiple things at once such as tone, expression, and what to say next.",
    format: "frequency", themes: ["social-hyperanalysis", "social-processing-exhaustion", "masking"], weight: "primary",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q29", text: "After group social events I feel depleted in a way that takes days to recover from.",
    format: "frequency", themes: ["social-processing-exhaustion", "masking-fatigue", "neurodivergent-burnout"], weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q30", text: "I find it difficult to trust that relationships are safe or stable, even with people who haven't hurt me.",
    format: "agreement", themes: ["relational-safety", "chronic-hypervigilance", "trauma-overlap"], weight: "primary",
    flag: { agreement: ["Agree", "Strongly agree"] } },

  { id: "q31", text: "I often feel like I have to earn my place in relationships through effort, helpfulness, or achievement.",
    format: "agreement", themes: ["relational-safety", "chronic-overcompensation", "rejection-sensitivity"], weight: "contributing",
    flag: { agreement: ["Agree", "Strongly agree"] } },

  { id: "q32", text: "I can appear confident or socially capable in public while feeling completely disconnected inside.",
    format: "frequency", themes: ["masking", "identity-suppression", "social-processing-exhaustion"], weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] } },

  // ── SECTION 6: Burnout & Energy ────────────────────────────────────────────

  { section: "Burnout and energy", sectionDesc: "These questions are about your overall energy, resilience, and recovery." },

  { id: "q33", text: "There have been periods in my life where I have lost the ability to do things I previously managed and have not fully recovered.",
    format: "agreement", themes: ["burnout-recovery", "neurodivergent-burnout", "shutdown-collapse"], weight: "primary",
    flag: { agreement: ["Agree", "Strongly agree"] } },

  { id: "q34", text: "I have experienced extended periods, weeks or months, where my functioning collapsed significantly.",
    format: "frequency", themes: ["neurodivergent-burnout", "burnout-recovery", "shutdown-collapse"], weight: "primary",
    flag: { frequency: ["Sometimes", "Often", "Very Often"] } },

  { id: "q35", text: "Even after rest, I often do not feel restored, like my baseline level of tired keeps rising.",
    format: "frequency", themes: ["burnout-recovery", "neurodivergent-burnout", "cognitive-overload"], weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q36", text: "I've had to significantly reduce what I do or who I am to avoid complete collapse.",
    format: "agreement", themes: ["neurodivergent-burnout", "burnout-recovery", "identity-suppression"], weight: "contributing",
    flag: { agreement: ["Agree", "Strongly agree"] } },

  // ── SECTION 7: Identity & Sense of Self ───────────────────────────────────

  { section: "Identity and sense of self", sectionDesc: "These questions are about how you understand yourself and your place in the world. There are no right or wrong answers." },

  { id: "q37", text: "I often feel unsure of who I actually am beneath the roles and expectations I carry.",
    format: "agreement", themes: ["identity-confusion", "identity-suppression", "identity-fragmentation"], weight: "primary",
    flag: { agreement: ["Agree", "Strongly agree"] } },

  { id: "q38", text: "I have suppressed parts of myself, including interests, ways of thinking, or ways of being, because they did not fit in.",
    format: "agreement", themes: ["identity-suppression", "masking", "chronic-overcompensation"], weight: "primary",
    flag: { agreement: ["Agree", "Strongly agree"] } },

  { id: "q39", text: "I feel like a different person depending on who I am with, not just in style, but in values or personality.",
    format: "frequency", themes: ["identity-fragmentation", "masking", "identity-confusion"], weight: "primary",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q40", text: "I have spent a lot of my life feeling like something is fundamentally wrong with me, without being able to name what.",
    format: "agreement", themes: ["chronic-shame", "identity-confusion", "neurodivergent-burnout"], weight: "primary",
    flag: { agreement: ["Agree", "Strongly agree"] } },

  { id: "q41", text: "I struggle to know what I actually want, feel, or prefer — separate from what others expect of me.",
    format: "frequency", themes: ["identity-suppression", "identity-confusion", "emotional-suppression"], weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q42", text: "I carry a deep sense of shame about my struggles that goes beyond normal self-criticism.",
    format: "agreement", themes: ["chronic-shame", "identity-suppression", "chronic-overcompensation"], weight: "primary",
    flag: { agreement: ["Agree", "Strongly agree"] } },

  // ── SECTION 8: History & Background ───────────────────────────────────────

  { section: "History and background", sectionDesc: "A few broader questions about your life experiences." },

  { id: "q43", text: "I have experienced significant stress, loss, or frightening events that still affect how I feel or function today.",
    format: "agreement", themes: ["trauma-overlap"], weight: "primary",
    flag: { agreement: ["Agree", "Strongly agree"] } },

  { id: "q44", text: "My nervous system often reacts to situations in ways that seem out of proportion, like my body is responding to a threat that is not there.",
    format: "frequency", themes: ["trauma-overlap", "chronic-hypervigilance", "nervous-system-dysregulation"], weight: "contributing",
    flag: { frequency: ["Often", "Very Often"] } },

  { id: "q45", text: "I've been told I'm 'too sensitive', 'too much', or 'too intense' throughout my life.",
    format: "agreement", themes: ["chronic-shame", "emotional-dysregulation", "rejection-sensitivity", "identity-suppression"], weight: "contributing",
    flag: { agreement: ["Agree", "Strongly agree"] } },

  { id: "q46", text: "Looking back, I believe I spent many years compensating for difficulties others did not seem to have, without understanding why.",
    format: "agreement", themes: ["chronic-overcompensation", "masking", "neurodivergent-burnout", "identity-confusion"], weight: "contributing",
    flag: { agreement: ["Agree", "Strongly agree"] } },

  // ── Open-ended ────────────────────────────────────────────────────────────

  { section: "In your own words", sectionDesc: "These open questions give you space to share what the questionnaire may not have captured." },

  { id: "q47", text: "What are the main day-to-day difficulties that brought you to seek an assessment?",
    format: "open", themes: [], weight: "context" },

  { id: "q48", text: "Is there anything about yourself that you've never been able to fully explain to others?",
    format: "open", themes: ["identity-confusion", "masking", "identity-fragmentation"], weight: "context" },

  { id: "q49", text: "What does a difficult day look like for you?",
    format: "open", themes: ["neurodivergent-burnout", "shutdown-collapse", "functional-inconsistency"], weight: "context" },
];

// ─── Scoring Logic ─────────────────────────────────────────────────────────────

const FREQ_OPTIONS = ["Never", "Rarely", "Sometimes", "Often", "Very Often"];
const AGREE_OPTIONS = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];

function isTriggered(question, answer) {
  if (!answer || question.format === "open") return false;
  if (question.format === "frequency") return question.flag.frequency.includes(answer);
  if (question.format === "agreement") return question.flag.agreement.includes(answer);
  return false;
}

function computeTriggeredThemes(answers) {
  const themeHits = {};
  const themeWeights = {};

  QUESTIONS.forEach(q => {
    if (!q.themes || q.format === "open") return;
    const triggered = isTriggered(q, answers[q.id]);
    q.themes.forEach(themeId => {
      if (!themeHits[themeId]) { themeHits[themeId] = 0; themeWeights[themeId] = { primary: 0, contributing: 0, total: 0 }; }
      themeWeights[themeId].total++;
      if (q.weight === "primary") themeWeights[themeId].primary++;
      else if (q.weight === "contributing") themeWeights[themeId].contributing++;
      if (triggered) themeHits[themeId]++;
    });
  });

  return THEMES.map(theme => {
    const hits = themeHits[theme.id] || 0;
    const weights = themeWeights[theme.id] || { primary: 0, contributing: 0, total: 0 };
    let flagged = false;
    if (theme.triggerMode === "single") flagged = hits >= 1;
    else if (theme.triggerMode === "2of3") flagged = hits >= 2;
    return { ...theme, hits, total: weights.total, flagged };
  });
}

// ─── Components ────────────────────────────────────────────────────────────────

const FreqScale = ({ value, onChange }) => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
    {FREQ_OPTIONS.map(opt => (
      <button key={opt} onClick={() => onChange(opt)}
        style={{ padding: "8px 16px", borderRadius: 10, border: value === opt ? "2px solid #4F46E5" : "1.5px solid #E2E8F0", background: value === opt ? "#EEF2FF" : "white", color: value === opt ? "#4F46E5" : "#64748B", fontSize: 13, cursor: "pointer", fontFamily: "system-ui", fontWeight: value === opt ? 600 : 400, transition: "all 0.15s" }}>
        {opt}
      </button>
    ))}
  </div>
);

const AgreeScale = ({ value, onChange }) => (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
    {AGREE_OPTIONS.map(opt => (
      <button key={opt} onClick={() => onChange(opt)}
        style={{ padding: "8px 14px", borderRadius: 10, border: value === opt ? "2px solid #7C3AED" : "1.5px solid #E2E8F0", background: value === opt ? "#F5F3FF" : "white", color: value === opt ? "#7C3AED" : "#64748B", fontSize: 12, cursor: "pointer", fontFamily: "system-ui", fontWeight: value === opt ? 600 : 400, transition: "all 0.15s" }}>
        {opt}
      </button>
    ))}
  </div>
);

// ─── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState("map"); // map | preview | results
  const [answers, setAnswers] = useState({});
  const [currentSection, setCurrentSection] = useState(0);

  const sections = QUESTIONS.reduce((acc, q) => {
    if (q.section) acc.push({ title: q.section, desc: q.sectionDesc, questions: [] });
    else acc[acc.length - 1].questions.push(q);
    return acc;
  }, []);

  const triggeredThemes = computeTriggeredThemes(answers);
  const flaggedCount = triggeredThemes.filter(t => t.flagged).length;
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = QUESTIONS.filter(q => !q.section).length;

  const setAnswer = (id, val) => setAnswers(p => ({ ...p, [id]: val }));

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1E1B4B" }}>Intake Question Map</div>
          <div style={{ display: "flex", gap: 2, background: "#F1F5F9", borderRadius: 8, padding: 3 }}>
            {[["map", "Theme Map"], ["preview", "Client Preview"], ["results", "Score Results"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: tab === key ? "white" : "transparent", color: tab === key ? "#1E293B" : "#94A3B8", fontSize: 12, cursor: "pointer", fontWeight: tab === key ? 600 : 400, boxShadow: tab === key ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#94A3B8" }}>{totalQuestions} questions · {THEMES.length} themes · {answeredCount} answered</div>
      </div>

      {/* ── TAB: Theme Map ── */}
      {tab === "map" && (
        <div style={{ padding: "28px 32px" }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", marginBottom: 4 }}>Question → Theme Mapping</h2>
            <p style={{ fontSize: 13, color: "#64748B" }}>Each question maps to one or more clinical themes. Primary questions can flag a theme alone; contributing questions require 2+ to trigger convergence themes.</p>
          </div>

          {sections.map((sec, si) => (
            <div key={si} style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#4F46E5", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14, paddingBottom: 8, borderBottom: "2px solid #EEF2FF" }}>
                {sec.title}
              </div>
              {sec.questions.map(q => (
                <div key={q.id} style={{ display: "grid", gridTemplateColumns: "48px 1fr auto auto", gap: 12, alignItems: "start", padding: "12px 0", borderBottom: "1px solid #F1F5F9" }}>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, paddingTop: 2 }}>{q.id}</div>
                  <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.5 }}>{q.text}</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 320 }}>
                    {q.themes.map(tid => {
                      const theme = THEMES.find(t => t.id === tid);
                      return theme ? (
                        <span key={tid} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: theme.category === "ADHD" ? "#EFF6FF" : theme.category === "Autism" ? "#F5F3FF" : "#F0FDF4", color: theme.category === "ADHD" ? "#1D4ED8" : theme.category === "Autism" ? "#6D28D9" : "#166534", border: `1px solid ${theme.category === "ADHD" ? "#BFDBFE" : theme.category === "Autism" ? "#DDD6FE" : "#BBF7D0"}` }}>
                          {theme.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", minWidth: 100 }}>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: q.format === "frequency" ? "#FFFBEB" : q.format === "agreement" ? "#FDF4FF" : "#F0FDF4", color: q.format === "frequency" ? "#92400E" : q.format === "agreement" ? "#6B21A8" : "#166534", border: `1px solid ${q.format === "frequency" ? "#FDE68A" : q.format === "agreement" ? "#E9D5FF" : "#BBF7D0"}` }}>
                      {q.format}
                    </span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: q.weight === "primary" ? "#FEF2F2" : "#F8FAFC", color: q.weight === "primary" ? "#991B1B" : "#64748B", border: `1px solid ${q.weight === "primary" ? "#FECACA" : "#E2E8F0"}` }}>
                      {q.weight}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: Client Preview ── */}
      {tab === "preview" && (
        <div style={{ padding: "28px 32px", maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
            {sections.map((sec, i) => (
              <button key={i} onClick={() => setCurrentSection(i)}
                style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 8, border: currentSection === i ? "2px solid #4F46E5" : "1.5px solid #E2E8F0", background: currentSection === i ? "#EEF2FF" : "white", color: currentSection === i ? "#4F46E5" : "#64748B", fontSize: 12, cursor: "pointer", fontWeight: currentSection === i ? 600 : 400, whiteSpace: "nowrap" }}>
                {sec.title}
              </button>
            ))}
          </div>

          <div style={{ background: "white", borderRadius: 16, padding: "32px 36px", border: "1px solid #E2E8F0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 18, color: "#1E1B4B", fontWeight: 500, fontFamily: "Georgia, serif", marginBottom: 6 }}>{sections[currentSection]?.title}</h2>
              <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>{sections[currentSection]?.desc}</p>
            </div>

            {sections[currentSection]?.questions.map((q, qi) => (
              <div key={q.id} style={{ marginBottom: 28, paddingBottom: 28, borderBottom: qi < sections[currentSection].questions.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                <p style={{ fontSize: 14, color: "#1E293B", lineHeight: 1.7, marginBottom: 4, fontFamily: "Georgia, serif" }}>
                  <span style={{ color: "#CBD5E1", marginRight: 8, fontSize: 12, fontFamily: "system-ui" }}>{qi + 1}</span>
                  {q.text}
                </p>
                {q.format === "frequency" && <FreqScale value={answers[q.id]} onChange={v => setAnswer(q.id, v)} />}
                {q.format === "agreement" && <AgreeScale value={answers[q.id]} onChange={v => setAnswer(q.id, v)} />}
                {q.format === "open" && (
                  <textarea value={answers[q.id] || ""} onChange={e => setAnswer(q.id, e.target.value)}
                    placeholder="Share as much or as little as you'd like..."
                    rows={4} style={{ width: "100%", marginTop: 10, border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "12px 14px", fontSize: 13, fontFamily: "Georgia, serif", color: "#1E293B", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }} />
                )}
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              {currentSection > 0 ? <button onClick={() => setCurrentSection(p => p - 1)} style={{ border: "1.5px solid #E2E8F0", background: "white", color: "#64748B", borderRadius: 10, padding: "10px 22px", fontSize: 13, cursor: "pointer" }}>← Previous</button> : <div />}
              {currentSection < sections.length - 1
                ? <button onClick={() => setCurrentSection(p => p + 1)} style={{ background: "#4F46E5", color: "white", border: "none", borderRadius: 10, padding: "10px 28px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Next →</button>
                : <button onClick={() => setTab("results")} style={{ background: "#16A34A", color: "white", border: "none", borderRadius: 10, padding: "10px 28px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>See Results →</button>
              }
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Score Results ── */}
      {tab === "results" && (
        <div style={{ padding: "28px 32px" }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", marginBottom: 4 }}>Theme Trigger Results</h2>
            <p style={{ fontSize: 13, color: "#64748B" }}>{answeredCount} of {totalQuestions} questions answered · {flaggedCount} themes flagged · Based on current answers in Client Preview tab.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {triggeredThemes.map(theme => (
              <div key={theme.id} style={{ background: "white", borderRadius: 12, padding: "16px 18px", border: `1.5px solid ${theme.flagged ? (theme.category === "ADHD" ? "#BFDBFE" : theme.category === "Autism" ? "#DDD6FE" : "#BBF7D0") : "#E2E8F0"}`, boxShadow: theme.flagged ? "0 2px 12px rgba(79,70,229,0.08)" : "none", transition: "all 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: theme.category === "ADHD" ? "#EFF6FF" : theme.category === "Autism" ? "#F5F3FF" : "#F0FDF4", color: theme.category === "ADHD" ? "#1D4ED8" : theme.category === "Autism" ? "#6D28D9" : "#166534", border: `1px solid ${theme.category === "ADHD" ? "#BFDBFE" : theme.category === "Autism" ? "#DDD6FE" : "#BBF7D0"}` }}>
                    {theme.category}
                  </span>
                  {theme.flagged && (
                    <span style={{ fontSize: 10, color: "#DC2626", fontWeight: 700, background: "#FEF2F2", padding: "2px 8px", borderRadius: 20, border: "1px solid #FECACA" }}>FLAGGED</span>
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginBottom: 8, lineHeight: 1.4 }}>{theme.label}</div>
                <div style={{ height: 4, background: "#F1F5F9", borderRadius: 99, marginBottom: 6 }}>
                  <div style={{ height: "100%", width: theme.total > 0 ? `${(theme.hits / theme.total) * 100}%` : "0%", background: theme.flagged ? (theme.category === "ADHD" ? "#3B82F6" : theme.category === "Autism" ? "#7C3AED" : "#22C55E") : "#E2E8F0", borderRadius: 99, transition: "width 0.4s ease" }} />
                </div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{theme.hits} of {theme.total} indicators endorsed · {theme.triggerMode === "single" ? "1 needed" : "2+ needed"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
