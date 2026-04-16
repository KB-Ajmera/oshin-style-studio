import { useState, useEffect, useRef } from "react";

// ─── Design Tokens ───────────────────────────────────────────
const T = {
  bg: "#f4efe8",
  bgWarm: "#ebe4d8",
  ink: "#1a1815",
  inkSoft: "#5b5651",
  inkMuted: "#9a948c",
  border: "#d8cfbf",
  accent: "#8b3a1f",
  accentSoft: "#b8624a",
  cream: "#faf7f1",
  success: "#3d5934",
  font: {
    display: "'Fraunces', serif",
    body: "'Inter Tight', sans-serif",
  },
  radius: { sm: "6px", md: "12px", lg: "18px", pill: "100px" },
};

// ─── Questionnaire Schema ────────────────────────────────────
const SECTIONS = [
  // ═══ SECTION 1: ABOUT YOU ════════════════════════════════
  {
    id: "about",
    label: "About You",
    intro: "Help us understand your shape and proportions",
    questions: [
      {
        id: "height",
        type: "single",
        label: "How tall are you?",
        sub: "We'll factor proportions into our suggestions",
        options: [
          { value: "petite", label: "Under 5'3\"", detail: "petite" },
          { value: "average", label: "5'3\" – 5'7\"", detail: "average" },
          { value: "tall", label: "5'7\" – 5'10\"", detail: "tall" },
          { value: "very-tall", label: "Over 5'10\"", detail: "very tall" },
        ],
      },
      {
        id: "body_shape",
        type: "single",
        label: "Which describes your body shape?",
        sub: "It's okay if none feel exact — pick the closest",
        options: [
          { value: "pear", label: "Pear", detail: "Hips wider than shoulders" },
          { value: "hourglass", label: "Hourglass", detail: "Defined waist, balanced shoulders/hips" },
          { value: "rectangle", label: "Rectangle", detail: "Shoulders, waist, hips fairly aligned" },
          { value: "apple", label: "Apple", detail: "Fuller through midsection" },
          { value: "inverted-triangle", label: "Inverted Triangle", detail: "Shoulders wider than hips" },
          { value: "unsure", label: "Not sure", detail: "Let our AI suggest broadly" },
        ],
      },
      {
        id: "size_range",
        type: "single",
        label: "What size do you usually wear?",
        sub: "Oshin uses degendered sizing (XS – XXL)",
        options: [
          { value: "XS", label: "XS" },
          { value: "S", label: "S" },
          { value: "M", label: "M" },
          { value: "L", label: "L" },
          { value: "XL", label: "XL" },
          { value: "XXL", label: "XXL" },
        ],
      },
    ],
  },

  // ═══ SECTION 2: THE OCCASION ═════════════════════════════
  {
    id: "occasion",
    label: "The Occasion",
    intro: "Tell us where you're headed",
    questions: [
      {
        id: "primary_occasion",
        type: "single",
        label: "What are you shopping for today?",
        sub: "Pick the most important one",
        options: [
          { value: "everyday", label: "Everyday wear" },
          { value: "work", label: "Work / Office" },
          { value: "evening", label: "Evening out" },
          { value: "wedding", label: "Wedding / Festive event" },
          { value: "vacation", label: "Vacation / Holiday" },
          { value: "exploring", label: "Just exploring" },
        ],
      },
      {
        id: "weather",
        type: "single",
        label: "What's the weather where you'll wear it?",
        options: [
          { value: "summer", label: "Hot summer" },
          { value: "monsoon", label: "Humid / Monsoon" },
          { value: "transition", label: "Mild / Transitional" },
          { value: "cool", label: "Cool / Indoor AC" },
        ],
      },
    ],
  },

  // ═══ SECTION 3: YOUR STYLE ═══════════════════════════════
  {
    id: "style",
    label: "Your Style",
    intro: "Get specific about what you love",
    questions: [
      {
        id: "vibes",
        type: "multi",
        label: "Which vibes describe how you like to dress?",
        sub: "Pick up to 3",
        max: 3,
        options: [
          { value: "minimal", label: "Minimal & Clean", detail: "Simple lines, neutral palette" },
          { value: "bold", label: "Bold & Expressive", detail: "Statement pieces, conversation-starters" },
          { value: "classic", label: "Classic Elegance", detail: "Timeless, polished, refined" },
          { value: "bohemian", label: "Bohemian", detail: "Flowy, layered, free-spirited" },
          { value: "street-luxe", label: "Street-luxe", detail: "Modern, edgy, urban" },
          { value: "romantic", label: "Romantic", detail: "Soft, feminine, dreamy" },
        ],
      },
      {
        id: "silhouette",
        type: "single",
        label: "Which silhouette do you feel most yourself in?",
        options: [
          { value: "relaxed", label: "Relaxed & Oversized", detail: "Roomy, comfortable, drapey" },
          { value: "tailored", label: "Tailored & Structured", detail: "Sharp lines, defined cuts" },
          { value: "flowy", label: "Flowy & Draped", detail: "Movement, soft volume" },
          { value: "fitted", label: "Body-conscious", detail: "Close to the body, defined" },
          { value: "mixed", label: "I mix it up", detail: "Depends on the day" },
        ],
      },
    ],
  },

  // ═══ SECTION 4: COLOR & FABRIC ═══════════════════════════
  {
    id: "palette",
    label: "Palette",
    intro: "Colors and fabrics that work for you",
    questions: [
      {
        id: "color_love",
        type: "multi",
        label: "Which palettes do you gravitate to?",
        sub: "Pick all that apply",
        options: [
          { value: "neutrals", label: "Neutrals & Earth", detail: "Beige, cream, charcoal, sage" },
          { value: "jewel", label: "Jewel Tones", detail: "Emerald, sapphire, ruby, teal" },
          { value: "pastels", label: "Pastels", detail: "Blush, butter, mint, lavender" },
          { value: "monochrome", label: "Monochrome", detail: "Black, white, grey" },
          { value: "bright", label: "Bright & Vivid", detail: "Marigold, coral, electric blue" },
        ],
      },
      {
        id: "color_avoid",
        type: "multi",
        label: "Any colors you actively avoid?",
        sub: "Optional — helps us filter out misses",
        optional: true,
        options: [
          { value: "yellow", label: "Yellows" },
          { value: "pink", label: "Pinks" },
          { value: "red", label: "Reds" },
          { value: "green", label: "Greens" },
          { value: "white", label: "Whites" },
          { value: "black", label: "Blacks" },
          { value: "none", label: "None — open to all" },
        ],
      },
      {
        id: "fabric_pref",
        type: "multi",
        label: "Fabrics you enjoy wearing",
        sub: "Oshin works mainly in denim, cotton, and linen",
        options: [
          { value: "denim", label: "Denim" },
          { value: "cotton", label: "Cotton & Linen" },
          { value: "silk", label: "Silk & Satin" },
          { value: "knit", label: "Knits" },
          { value: "structured", label: "Structured / Crisp" },
          { value: "soft", label: "Soft & Drapey" },
        ],
      },
    ],
  },

  // ═══ SECTION 5: SHOPPING SIGNALS ═════════════════════════
  {
    id: "signals",
    label: "Shopping Signals",
    intro: "What you usually love or struggle with",
    questions: [
      {
        id: "struggle",
        type: "single",
        label: "What do you find hardest when shopping?",
        sub: "We'll be extra mindful of this",
        options: [
          { value: "fit", label: "Finding the right fit" },
          { value: "occasion", label: "Knowing what works for the occasion" },
          { value: "style-jump", label: "Trying styles outside my comfort zone" },
          { value: "color", label: "Picking colors that suit me" },
          { value: "investment", label: "Justifying spending on statement pieces" },
          { value: "nothing", label: "Honestly, nothing — I love shopping" },
        ],
      },
      {
        id: "budget",
        type: "single",
        label: "What's your budget per piece?",
        options: [
          { value: "under-5k", label: "Under ₹5,000" },
          { value: "5k-10k", label: "₹5,000 – ₹10,000" },
          { value: "10k-15k", label: "₹10,000 – ₹15,000" },
          { value: "15k-plus", label: "₹15,000+" },
          { value: "no-limit", label: "Show me everything" },
        ],
      },
    ],
  },

  // ═══ SECTION 6: OPTIONAL CONTEXT ═════════════════════════
  {
    id: "optional",
    label: "One Last Thing",
    intro: "Optional — but helpful for nuance",
    questions: [
      {
        id: "inspiration",
        type: "text",
        label: "Anyone whose style you love?",
        sub: "A celebrity, friend, or icon — totally optional",
        placeholder: "e.g. Alia Bhatt's off-duty looks, Phoebe Philo era Céline...",
        optional: true,
      },
      {
        id: "additional",
        type: "text",
        label: "Anything else we should know?",
        sub: "A specific event, a body feature you'd like to highlight or downplay, anything",
        placeholder: "Optional — write freely",
        optional: true,
      },
    ],
  },
];

// ─── Components ──────────────────────────────────────────────

function ProgressDots({ total, current, completed }) {
  return (
    <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "32px" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? "24px" : "6px",
          height: "6px",
          borderRadius: "100px",
          background: i < current || completed.has(i) ? T.ink : i === current ? T.accent : T.border,
          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      ))}
    </div>
  );
}

function OptionCard({ option, selected, onClick, multi }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: "16px 18px",
        borderRadius: T.radius.md,
        border: selected ? `2px solid ${T.ink}` : `1.5px solid ${T.border}`,
        background: selected ? T.cream : "transparent",
        cursor: "pointer",
        transition: "all 0.2s ease",
        position: "relative",
        width: "100%",
        fontFamily: T.font.body,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: "14px",
            fontWeight: selected ? 600 : 500,
            color: T.ink,
            marginBottom: option.detail ? "3px" : 0,
            letterSpacing: "-0.01em",
          }}>
            {option.label}
          </div>
          {option.detail && (
            <div style={{ fontSize: "12px", color: T.inkMuted, lineHeight: 1.4 }}>
              {option.detail}
            </div>
          )}
        </div>
        <div style={{
          width: "20px", height: "20px", flexShrink: 0,
          borderRadius: multi ? "4px" : "50%",
          border: selected ? `2px solid ${T.ink}` : `1.5px solid ${T.border}`,
          background: selected ? T.ink : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s ease",
        }}>
          {selected && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      style={{
        width: "100%",
        padding: "16px 18px",
        borderRadius: T.radius.md,
        border: `1.5px solid ${T.border}`,
        background: "transparent",
        fontFamily: T.font.body,
        fontSize: "14px",
        color: T.ink,
        resize: "vertical",
        outline: "none",
        transition: "border-color 0.2s ease",
      }}
      onFocus={(e) => e.target.style.borderColor = T.ink}
      onBlur={(e) => e.target.style.borderColor = T.border}
    />
  );
}

function Question({ question, value, onChange }) {
  if (question.type === "text") {
    return (
      <div style={{ animation: "fadeUp 0.4s ease both" }}>
        <h3 style={{ fontFamily: T.font.display, fontSize: "22px", fontWeight: 400, color: T.ink, marginBottom: "6px", letterSpacing: "-0.02em", lineHeight: 1.25 }}>
          {question.label}
          {question.optional && <span style={{ fontSize: "12px", color: T.inkMuted, fontFamily: T.font.body, fontWeight: 400, marginLeft: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Optional</span>}
        </h3>
        {question.sub && (
          <p style={{ fontFamily: T.font.body, fontSize: "13px", color: T.inkMuted, marginBottom: "20px", lineHeight: 1.5 }}>
            {question.sub}
          </p>
        )}
        <TextInput value={value} onChange={onChange} placeholder={question.placeholder} />
      </div>
    );
  }

  const isMulti = question.type === "multi";
  const selected = isMulti ? (value || []) : value;
  const isSelected = (v) => isMulti ? selected.includes(v) : selected === v;
  const handleClick = (v) => {
    if (isMulti) {
      const cur = selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v];
      if (question.max && cur.length > question.max) return;
      onChange(cur);
    } else {
      onChange(v);
    }
  };

  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }}>
      <h3 style={{ fontFamily: T.font.display, fontSize: "22px", fontWeight: 400, color: T.ink, marginBottom: "6px", letterSpacing: "-0.02em", lineHeight: 1.25 }}>
        {question.label}
        {question.optional && <span style={{ fontSize: "12px", color: T.inkMuted, fontFamily: T.font.body, fontWeight: 400, marginLeft: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Optional</span>}
      </h3>
      {question.sub && (
        <p style={{ fontFamily: T.font.body, fontSize: "13px", color: T.inkMuted, marginBottom: "20px", lineHeight: 1.5 }}>
          {question.sub}
          {isMulti && question.max && (
            <span style={{ marginLeft: "8px", color: T.accent }}>
              ({selected.length}/{question.max})
            </span>
          )}
        </p>
      )}
      <div style={{
        display: "grid",
        gridTemplateColumns: question.options.length <= 4 ? "1fr 1fr" : "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "8px",
      }}>
        {question.options.map((opt) => (
          <OptionCard
            key={opt.value}
            option={opt}
            selected={isSelected(opt.value)}
            onClick={() => handleClick(opt.value)}
            multi={isMulti}
          />
        ))}
      </div>
    </div>
  );
}

function SectionScreen({ section, sectionIndex, answers, updateAnswer, onNext, onPrev, isLast, isFirst }) {
  const isQuestionAnswered = (q) => {
    if (q.optional) return true;
    const a = answers[q.id];
    if (q.type === "multi") return Array.isArray(a) && a.length > 0;
    if (q.type === "text") return true;
    return !!a;
  };

  const allAnswered = section.questions.every(isQuestionAnswered);

  return (
    <div style={{ animation: "fadeUp 0.5s ease both" }}>
      {/* Section header */}
      <div style={{ marginBottom: "36px", textAlign: "center" }}>
        <div style={{ fontFamily: T.font.body, fontSize: "11px", color: T.accent, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "10px", fontWeight: 500 }}>
          Section {sectionIndex + 1} of {SECTIONS.length}
        </div>
        <h2 style={{ fontFamily: T.font.display, fontSize: "clamp(30px, 5vw, 40px)", fontWeight: 400, color: T.ink, letterSpacing: "-0.025em", marginBottom: "8px", lineHeight: 1.1 }}>
          {section.label}
        </h2>
        <p style={{ fontFamily: T.font.body, fontSize: "14px", color: T.inkMuted, fontStyle: "italic" }}>
          {section.intro}
        </p>
      </div>

      {/* Questions stacked */}
      <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
        {section.questions.map((q) => (
          <Question
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(v) => updateAnswer(q.id, v)}
          />
        ))}
      </div>

      {/* Nav */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "48px", gap: "12px" }}>
        <button
          onClick={onPrev}
          disabled={isFirst}
          style={{
            padding: "14px 28px",
            background: "transparent",
            border: "none",
            color: isFirst ? T.inkMuted : T.inkSoft,
            fontFamily: T.font.body, fontSize: "13px", fontWeight: 500,
            letterSpacing: "0.06em", textTransform: "uppercase",
            cursor: isFirst ? "not-allowed" : "pointer",
            opacity: isFirst ? 0.4 : 1,
            display: "flex", alignItems: "center", gap: "6px",
          }}
        >
          ← Back
        </button>

        <button
          onClick={onNext}
          disabled={!allAnswered}
          style={{
            padding: "16px 42px",
            background: allAnswered ? T.ink : T.border,
            color: T.cream,
            border: "none",
            borderRadius: T.radius.pill,
            fontFamily: T.font.body, fontSize: "13px", fontWeight: 500,
            letterSpacing: "0.08em", textTransform: "uppercase",
            cursor: allAnswered ? "pointer" : "not-allowed",
            transition: "all 0.25s ease",
          }}
        >
          {isLast ? "See My Lookbook" : "Continue"} →
        </button>
      </div>
    </div>
  );
}

function CompletionScreen({ answers, onReset }) {
  const summarize = () => {
    const occ = SECTIONS[1].questions[0].options.find(o => o.value === answers.primary_occasion);
    const sil = SECTIONS[2].questions[1].options.find(o => o.value === answers.silhouette);
    const vibes = (answers.vibes || []).map(v =>
      SECTIONS[2].questions[0].options.find(o => o.value === v)?.label
    ).filter(Boolean);

    return {
      occasion: occ?.label || "your needs",
      silhouette: sil?.label?.toLowerCase() || "your style",
      vibes: vibes.join(" + ") || "your aesthetic",
    };
  };

  const s = summarize();

  return (
    <div style={{ textAlign: "center", animation: "fadeUp 0.6s ease both", maxWidth: "500px", margin: "0 auto" }}>
      <div style={{ fontFamily: T.font.body, fontSize: "11px", color: T.accent, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "16px", fontWeight: 500 }}>
        Profile Complete
      </div>
      <h2 style={{ fontFamily: T.font.display, fontSize: "clamp(32px, 6vw, 44px)", fontWeight: 400, color: T.ink, letterSpacing: "-0.025em", marginBottom: "20px", lineHeight: 1.1 }}>
        Beautifully done.
      </h2>
      <p style={{ fontFamily: T.font.display, fontSize: "18px", color: T.inkSoft, fontStyle: "italic", lineHeight: 1.5, marginBottom: "32px" }}>
        We're styling you for <span style={{ color: T.accent }}>{s.occasion.toLowerCase()}</span>, leaning into <span style={{ color: T.accent }}>{s.silhouette}</span> silhouettes with a <span style={{ color: T.accent }}>{s.vibes}</span> sensibility.
      </p>
      <div style={{
        padding: "24px",
        background: T.cream,
        borderRadius: T.radius.md,
        border: `1px solid ${T.border}`,
        marginBottom: "32px",
      }}>
        <p style={{ fontFamily: T.font.body, fontSize: "13px", color: T.inkSoft, lineHeight: 1.6 }}>
          Oshin's AI is now matching pieces from the SS-25 collection to your profile. Your personalized lookbook will appear in just a moment.
        </p>
      </div>
      <button
        onClick={onReset}
        style={{
          padding: "14px 32px", background: "transparent",
          border: `1.5px solid ${T.border}`, borderRadius: T.radius.pill,
          color: T.inkSoft, fontFamily: T.font.body, fontSize: "12px",
          fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        Start Over
      </button>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────

export default function StyleQuestionnaire() {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [completed, setCompleted] = useState(new Set());
  const [done, setDone] = useState(false);

  const updateAnswer = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const goNext = () => {
    setCompleted((prev) => new Set([...prev, sectionIndex]));
    if (sectionIndex < SECTIONS.length - 1) {
      setSectionIndex(sectionIndex + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goPrev = () => {
    if (sectionIndex > 0) {
      setSectionIndex(sectionIndex - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const reset = () => {
    setAnswers({});
    setSectionIndex(0);
    setCompleted(new Set());
    setDone(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,400&family=Inter+Tight:wght@400;500;600;700&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; margin: 0; }
        body { background: ${T.bg}; }
      `}</style>

      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font.body }}>
        {/* Header */}
        <header style={{
          padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: `1px solid ${T.border}`, background: "rgba(244, 239, 232, 0.9)",
          backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <span style={{ fontFamily: T.font.display, fontSize: "24px", fontWeight: 500, color: T.ink, letterSpacing: "-0.02em" }}>
              Oshin
            </span>
            <span style={{ fontFamily: T.font.body, fontSize: "10px", color: T.inkMuted, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 500 }}>
              Style Studio
            </span>
          </div>
          {!done && (
            <span style={{ fontFamily: T.font.body, fontSize: "11px", color: T.inkMuted, letterSpacing: "0.05em" }}>
              ~3 minutes
            </span>
          )}
        </header>

        {/* Content */}
        <main style={{ padding: "44px 24px 80px", maxWidth: "640px", margin: "0 auto" }}>
          {!done && <ProgressDots total={SECTIONS.length} current={sectionIndex} completed={completed} />}

          {done ? (
            <CompletionScreen answers={answers} onReset={reset} />
          ) : (
            <SectionScreen
              section={SECTIONS[sectionIndex]}
              sectionIndex={sectionIndex}
              answers={answers}
              updateAnswer={updateAnswer}
              onNext={goNext}
              onPrev={goPrev}
              isFirst={sectionIndex === 0}
              isLast={sectionIndex === SECTIONS.length - 1}
            />
          )}
        </main>
      </div>
    </>
  );
}
