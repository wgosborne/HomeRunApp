"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export function UserMenu() {
  const { data: session } = useSession();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check for updates on mount
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await fetch("/api/version");
        const { version } = await response.json();
        const storedVersion = localStorage.getItem("appVersion");

        if (storedVersion && storedVersion !== version) {
          setUpdateAvailable(true);
        }
        localStorage.setItem("appVersion", version);
      } catch (error) {
        console.error("Failed to check for updates:", error);
      }
    };

    checkForUpdates();
  }, []);

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    try {
      // Clear all caches
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // Check version
      const response = await fetch("/api/version");
      const { version } = await response.json();
      const storedVersion = localStorage.getItem("appVersion");

      if (storedVersion && storedVersion !== version) {
        setUpdateAvailable(true);
      }
      localStorage.setItem("appVersion", version);

      // Hard refresh (clear cache and reload)
      window.location.href = window.location.href;
    } catch (error) {
      console.error("Failed to check for updates:", error);
      alert("Failed to check for updates. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  if (!session?.user) return null;

  const initials = (session.user.name || session.user.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 1);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-9 h-9 rounded-lg flex items-center justify-center"
        style={{
          background: "linear-gradient(145deg, #1244a8, #0E3386)",
          color: "white",
          fontSize: "15px",
          fontWeight: 800,
          fontFamily: "'Exo 2', sans-serif",
          boxShadow:
            "0 4px 14px rgba(14,51,134,0.5), 0 1px 0 rgba(255,255,255,0.1) inset",
          border: "none",
          cursor: "pointer",
        }}
        title="Account"
      >
        {initials}
      </button>

      {showMenu && (
        <div
          className="absolute right-0 mt-2 w-72 rounded-lg z-50"
          style={{
            backgroundColor: "#1a2a3a",
            border: "1px solid rgba(204, 52, 51, 0.3)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div style={{ padding: "16px" }}>
            {/* User Info Section */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "linear-gradient(145deg, #1244a8, #0E3386)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 800,
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: "16px",
                  marginBottom: "10px",
                }}
              >
                {initials}
              </div>
              <h3
                style={{
                  margin: 0,
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "white",
                  marginBottom: "4px",
                }}
              >
                {session.user.name || "Account"}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "rgba(255, 255, 255, 0.5)",
                }}
              >
                {session.user.email}
              </p>
            </div>

            {/* Divider */}
            <div
              style={{
                height: "1px",
                background: "rgba(204, 52, 51, 0.2)",
                marginBottom: "12px",
              }}
            />

            {/* Menu Items */}
            <button
              onClick={() => {
                router.push("/profile");
                setShowMenu(false);
              }}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                padding: "10px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                color: "rgba(255, 255, 255, 0.8)",
                transition: "all 0.2s",
                marginBottom: "6px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(204, 52, 51, 0.2)";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
              }}
            >
              Profile
            </button>

            {/* Check for Updates */}
            <button
              onClick={handleCheckForUpdates}
              disabled={isChecking}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                padding: "10px 12px",
                borderRadius: "6px",
                cursor: isChecking ? "not-allowed" : "pointer",
                textAlign: "left",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                color: updateAvailable
                  ? "rgba(255, 200, 100, 0.9)"
                  : "rgba(255, 255, 255, 0.8)",
                transition: "all 0.2s",
                marginBottom: "6px",
                opacity: isChecking ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isChecking) {
                  e.currentTarget.style.backgroundColor = "rgba(204, 52, 51, 0.2)";
                  e.currentTarget.style.color = updateAvailable
                    ? "rgba(255, 200, 100, 1)"
                    : "white";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = updateAvailable
                  ? "rgba(255, 200, 100, 0.9)"
                  : "rgba(255, 255, 255, 0.8)";
              }}
            >
              {isChecking ? "Checking..." : "Check for Updates"}
              {updateAvailable && " ●"}
            </button>

            {/* Sign Out */}
            <button
              onClick={() => {
                signOut({ redirectTo: "/auth/signin" });
                setShowMenu(false);
              }}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                padding: "10px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                color: "rgba(255, 255, 255, 0.8)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(204, 52, 51, 0.3)";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
