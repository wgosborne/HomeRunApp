'use client';

/**
 * Offline Fallback Page
 * Shown when user tries to access a route that isn't cached
 * Service worker will serve this page when offline
 * Styled to match dashboard theme
 */

export default function OfflinePage() {
  return (
    <div
      className="noise-texture"
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "linear-gradient(170deg, #0f1923 0%, #141d2e 35%, #181428 70%, #1a1226 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Icon Circle */}
        <div
          style={{
            marginBottom: "32px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              background: "linear-gradient(145deg, #0e2a6e 0%, #1a3f9c 55%, #0f2660 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `
                0 2px 0 rgba(255,255,255,0.06) inset,
                0 -2px 0 rgba(0,0,0,0.4) inset,
                0 8px 16px rgba(0,0,0,0.4),
                0 16px 40px rgba(14,51,134,0.45),
                0 32px 64px rgba(14,51,134,0.2)
              `,
            }}
          >
            <svg
              className="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: "white" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8.111 16.332a8 8 0 017.778 0M12 20v.01M12 12a4 4 0 100-8 4 4 0 000 8z"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1
          style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: "36px",
            fontWeight: 800,
            color: "white",
            marginBottom: "8px",
            textShadow: "0 2px 12px rgba(14,51,134,0.4)",
          }}
        >
          You're Offline
        </h1>

        {/* Description */}
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "16px",
            color: "rgba(255,255,255,0.6)",
            marginBottom: "32px",
            lineHeight: "1.6",
          }}
        >
          This page isn't available offline. Check your internet connection and try again.
        </p>

        {/* Helpful content card */}
        <div
          style={{
            borderRadius: "20px",
            padding: "20px",
            backgroundColor: "rgba(204,52,51,0.1)",
            border: "1px solid rgba(204,52,51,0.3)",
            marginBottom: "32px",
            textAlign: "left",
          }}
        >
          <h2
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontWeight: 700,
              marginBottom: "12px",
              color: "rgba(255,255,255,0.8)",
              fontSize: "14px",
            }}
          >
            What you can do:
          </h2>
          <ul
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              color: "rgba(255,255,255,0.6)",
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <li>✓ View cached leagues and standings</li>
            <li>✓ Check your roster</li>
            <li style={{ color: "rgba(255,255,255,0.4)" }}>
              ✗ Draft players (requires connection)
            </li>
            <li style={{ color: "rgba(255,255,255,0.4)" }}>
              ✗ Create new leagues (requires connection)
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginBottom: "32px",
          }}
        >
          <button
            onClick={() => window.history.back()}
            style={{
              width: "100%",
              backgroundColor: "rgba(255,255,255,0.1)",
              color: "white",
              fontFamily: "'Exo 2', sans-serif",
              fontWeight: 700,
              fontSize: "14px",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.2)",
              cursor: "pointer",
              transition: "all 0.2s",
              minHeight: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(255,255,255,0.15)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(255,255,255,0.4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(255,255,255,0.1)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(255,255,255,0.2)";
            }}
          >
            ← Go Back
          </button>
          <a
            href="/"
            style={{
              width: "100%",
              backgroundColor: "#CC3433",
              color: "white",
              fontFamily: "'Exo 2', sans-serif",
              fontWeight: 700,
              fontSize: "14px",
              padding: "16px",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
              minHeight: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              textTransform: "uppercase",
              letterSpacing: "1px",
              boxShadow: "0 3px 10px rgba(204,52,51,0.5), 0 1px 0 rgba(255,255,255,0.15) inset",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                "#E82A2A";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                "#CC3433";
            }}
          >
            Home
          </a>
        </div>

        {/* Connection status message */}
        <div
          style={{
            paddingTop: "24px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              color: "rgba(255,255,255,0.3)",
              fontStyle: "italic",
            }}
          >
            ✨ The app will automatically resume when your connection is restored.
          </p>
        </div>
      </div>
    </div>
  );
}
