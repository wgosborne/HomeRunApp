"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const shadowStack = `
  0 2px 0 rgba(255,255,255,0.05) inset,
  0 -1px 0 rgba(0,0,0,0.3) inset,
  0 4px 8px rgba(0,0,0,0.3),
  0 10px 28px rgba(0,0,0,0.25),
  0 20px 48px rgba(0,0,0,0.15)
`;

export default function CreateLeaguePage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leagueName, setLeagueName] = useState("");
  const [draftDate, setDraftDate] = useState("");

  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  if (status !== "authenticated") {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundImage: 'url(/design-inspiration/CubsFireworkField.jpg)',
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Semi-opaque overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 25, 35, 0.75)",
            backdropFilter: "blur(2px)",
            pointerEvents: "none",
          }}
        />
        <div style={{ color: "rgba(255,255,255,0.8)", position: "relative", zIndex: 1 }}>Loading...</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!leagueName.trim()) {
        throw new Error("League name is required");
      }

      const payload: any = {
        name: leagueName.trim(),
      };

      if (draftDate) {
        payload.draftDate = new Date(draftDate).toISOString();
      }

      const response = await fetch("/api/leagues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create league");
      }

      const league = await response.json();
      router.push(`/league/${league.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create league");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: "#0f1923", minHeight: "100vh", paddingBottom: "40px" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.7)",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
          }}
        >
          ←
        </button>
        <h1
          style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: "18px",
            fontWeight: 700,
            color: "white",
            margin: 0,
          }}
        >
          Create League
        </h1>
      </div>

      {/* Form Container */}
      <div style={{ padding: "24px 16px" }}>
        <form onSubmit={handleSubmit}>
          {/* Card */}
          <div
            style={{
              borderRadius: "20px",
              padding: "32px 24px",
              background: "linear-gradient(145deg, #0e2a6e 0%, #1a3f9c 55%, #0f2660 100%)",
              boxShadow: shadowStack,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Decorative glow orbs */}
            <div
              style={{
                position: "absolute",
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                top: "-50px",
                right: "-50px",
                background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                width: "180px",
                height: "180px",
                borderRadius: "50%",
                bottom: "-30px",
                left: "-40px",
                background: "radial-gradient(circle, rgba(204,52,51,0.07) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />

            {/* Top accent stripe */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "3px",
                background: "linear-gradient(90deg, #CC3433 0%, rgba(204,52,51,0.3) 60%, transparent 100%)",
              }}
            />

            {/* Content */}
            <div style={{ position: "relative", zIndex: 1 }}>
              <h2
                style={{
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "white",
                  margin: "0 0 24px 0",
                }}
              >
                Start Your League
              </h2>

              {/* League Name Field */}
              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.6)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  League Name
                </label>
                <input
                  type="text"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  placeholder="e.g., Summer Sluggers"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "white",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.backgroundColor = "rgba(255,255,255,0.12)";
                    e.target.style.borderColor = "rgba(255,255,255,0.25)";
                  }}
                  onBlur={(e) => {
                    e.target.style.backgroundColor = "rgba(255,255,255,0.08)";
                    e.target.style.borderColor = "rgba(255,255,255,0.15)";
                  }}
                />
              </div>

              {/* Draft Date Field */}
              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.6)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Draft Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={draftDate}
                  onChange={(e) => setDraftDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "white",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.12)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  }}
                />
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.4)",
                    marginTop: "6px",
                    margin: "6px 0 0 0",
                  }}
                >
                  Leave blank to set draft date later
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div
                  style={{
                    marginBottom: "24px",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(204,52,51,0.2)",
                    border: "1px solid rgba(204,52,51,0.5)",
                    color: "#FF6B6B",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "13px",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.2)",
                    backgroundColor: "transparent",
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "13px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !leagueName.trim()}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#CC3433",
                    color: "white",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "13px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    cursor: loading || !leagueName.trim() ? "not-allowed" : "pointer",
                    opacity: loading || !leagueName.trim() ? 0.6 : 1,
                  }}
                >
                  {loading ? "Creating..." : "Create League"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
