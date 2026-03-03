"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Profile {
  email: string | null | undefined;
  name: string | null | undefined;
  displayName: string;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setProfile({
        email: session.user.email || null,
        name: session.user.name || null,
        displayName: session.user.name || session.user.email || "User",
      });
      setDisplayName(session.user.name || session.user.email || "");
    }
  }, [session]);

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) {
      alert("Display name cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/user/update-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: displayName }),
      });

      if (response.ok) {
        setProfile((prev) =>
          prev ? { ...prev, displayName } : null
        );
        setIsEditing(false);
      } else {
        const error = await response.json();
        alert(error.message || "Failed to update name");
      }
    } catch (error) {
      alert("An error occurred");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!session) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundImage: 'url(/design-inspiration/CubsFireworkField.jpg)',
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
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

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f1923",
        color: "white",
        paddingTop: "20px",
      }}
    >
      {/* Header */}
      <div
        className="dashboard-content"
        style={{
          paddingLeft: "18px",
          paddingRight: "18px",
          marginBottom: "32px",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255, 255, 255, 0.7)",
            cursor: "pointer",
            fontSize: "14px",
            marginBottom: "16px",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          ← Back
        </button>

        <h1
          style={{
            fontFamily: "'Exo 2', sans-serif",
            fontSize: "32px",
            fontWeight: 800,
            margin: 0,
            marginBottom: "8px",
          }}
        >
          Profile
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            color: "rgba(255, 255, 255, 0.6)",
            margin: 0,
          }}
        >
          Manage your account information
        </p>
      </div>

      {/* Profile Card */}
      {profile && (
        <div className="dashboard-content" style={{ paddingLeft: "18px", paddingRight: "18px" }}>
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(204, 52, 51, 0.2)",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "24px",
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "12px",
                background: "linear-gradient(145deg, #1244a8, #0E3386)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 800,
                fontFamily: "'Exo 2', sans-serif",
                fontSize: "32px",
                marginBottom: "20px",
              }}
            >
              {(profile.displayName || "U")[0].toUpperCase()}
            </div>

            {/* Email */}
            <div style={{ marginBottom: "24px" }}>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "rgba(255, 255, 255, 0.5)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  margin: "0 0 8px 0",
                  fontWeight: 600,
                }}
              >
                Email Address
              </p>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "14px",
                  color: "white",
                  margin: 0,
                  wordBreak: "break-all",
                }}
              >
                {profile.email}
              </p>
            </div>

            {/* Display Name */}
            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "12px",
                    color: "rgba(255, 255, 255, 0.5)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  Name in Leagues
                </p>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#CC3433",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>

              {isEditing ? (
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    style={{
                      flex: 1,
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(204, 52, 51, 0.3)",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      color: "white",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "14px",
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveDisplayName}
                    disabled={isSaving}
                    style={{
                      backgroundColor: "#CC3433",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px 20px",
                      color: "white",
                      cursor: isSaving ? "not-allowed" : "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: "12px",
                      opacity: isSaving ? 0.5 : 1,
                    }}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setDisplayName(profile.displayName);
                    }}
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px 20px",
                      color: "white",
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: "12px",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "14px",
                    color: "white",
                    margin: 0,
                  }}
                >
                  {profile.displayName}
                </p>
              )}
            </div>

            {/* Info */}
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                color: "rgba(255, 255, 255, 0.5)",
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              This name is displayed to other league members when you join or
              create a league.
            </p>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={() => signOut({ redirectTo: "/auth/signin" })}
            style={{
              width: "100%",
              backgroundColor: "rgba(204, 52, 51, 0.3)",
              border: "1px solid rgba(204, 52, 51, 0.5)",
              borderRadius: "12px",
              padding: "12px",
              color: "#FF6B6B",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              fontWeight: 600,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(204, 52, 51, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(204, 52, 51, 0.3)";
            }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
