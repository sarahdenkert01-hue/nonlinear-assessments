/** Brand accent from Nonlinear palette */
const accent = "#ced9dd";

export function clerkAppearance(dark = false) {
  return {
    variables: {
      colorPrimary: accent,
      colorPrimaryForeground: dark ? "#0f172a" : "#1e293b",
      colorText: dark ? "#f1f5f9" : "#1e293b",
      colorTextSecondary: dark ? "#94a3b8" : "#64748b",
      colorBackground: dark ? "#0f172a" : "#ffffff",
      colorInputBackground: dark ? "#1e293b" : "#ffffff",
      colorInputText: dark ? "#f1f5f9" : "#1e293b",
      colorNeutral: dark ? "#334155" : "#e2e8f0",
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
          : "0 4px 12px rgba(15, 23, 42, 0.06)",
        border: dark ? "1px solid #334155" : "1px solid #e2e8f0",
      },
      headerTitle: {
        fontSize: "1.125rem",
        fontWeight: 600,
      },
      logoImage: {
        height: "2.5rem",
      },
    },
  };
}

