/** Brand accent from Nonlinear palette */
const accent = "#cfcedd";

export function clerkAppearance(dark = false) {
  return {
    variables: {
      colorPrimary: accent,
      colorPrimaryForeground: dark ? "#170f2a" : "#251e3b",
      colorText: dark ? "#f6f1f9" : "#170f2a",
      colorTextSecondary: dark ? "#a194b8" : "#74648b",
      colorBackground: dark ? "#180f2a" : "#ffffff",
      colorInputBackground: dark ? "#271e3b" : "#ffffff",
      colorInputText: dark ? "#f6f1f9" : "#170f2a",
      colorNeutral: dark ? "#403355" : "#e6e2f0",
      borderRadius: "0.625rem",
      fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
    },
    layout: {
      logoImageUrl: "/logo.png",
      logoLinkUrl: "/",
    },
    elements: {
      card: {
        boxShadow: dark
          ? "0 4px 24px rgba(0,0,0,0.4)"
          : "0 4px 12px rgba(23, 15, 42, 0.06)",
        border: dark ? "1px solid #403355" : "1px solid #e6e2f0",
      },
      headerTitle: {
        fontSize: "1.125rem",
        fontWeight: 600,
      },
      logoImage: {
        height: "3.25rem",
      },
    },
  };
}

