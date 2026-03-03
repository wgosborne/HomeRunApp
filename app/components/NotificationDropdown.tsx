"use client";

import { useEffect, useState, useRef } from "react";

interface NotificationDropdownProps {
  onBellClick: () => void;
}

export function NotificationDropdown({ onBellClick }: NotificationDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if notifications are supported
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      checkSubscriptionStatus();
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function checkSubscriptionStatus() {
    try {
      if (!("serviceWorker" in navigator)) return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  }

  async function handleToggleNotifications() {
    setIsLoading(true);
    try {
      if (isSubscribed) {
        // Unsubscribe
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await fetch("/api/notifications/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          await subscription.unsubscribe();
          setIsSubscribed(false);
        }
      } else {
        // Subscribe
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          alert("Please enable notifications in your browser");
          setIsLoading(false);
          return;
        }

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          throw new Error("VAPID key not configured");
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        });

        await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: arrayBufferToBase64(subscription.getKey("p256dh")),
                auth: arrayBufferToBase64(subscription.getKey("auth")),
              },
            },
          }),
        });

        setIsSubscribed(true);
      }
    } catch (error) {
      console.error("Toggle notifications error:", error);
      alert(
        error instanceof Error ? error.message : "Failed to update notifications"
      );
    } finally {
      setIsLoading(false);
    }
  }

  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
    if (!buffer) return "";
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  if (!isSupported) return null;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => {
          setShowDropdown(!showDropdown);
          onBellClick();
        }}
        className="w-9 h-9 rounded-lg flex items-center justify-center relative"
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: isSubscribed ? "#FFFFFF" : "rgba(255,255,255,0.7)",
          boxShadow:
            "0 4px 12px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.07) inset, 0 -1px 0 rgba(0,0,0,0.3) inset",
          transition: "all 0.2s",
        }}
        title="Notifications"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {isSubscribed && (
          <span
            className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: "#CC3433" }}
          />
        )}
      </button>

      {showDropdown && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-lg z-50"
          style={{
            backgroundColor: "#1a2a3a",
            border: "1px solid rgba(204, 52, 51, 0.3)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div style={{ padding: "16px" }}>
            {/* Header */}
            <div style={{ marginBottom: "16px" }}>
              <h3
                style={{
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "white",
                  margin: 0,
                }}
              >
                Notifications
              </h3>
            </div>

            {/* Toggle */}
            <div
              style={{
                padding: "12px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                borderRadius: "8px",
                marginBottom: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "13px",
                    color: "white",
                    fontWeight: 600,
                    marginBottom: "4px",
                  }}
                >
                  Push Notifications
                </p>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "11px",
                    color: "rgba(255, 255, 255, 0.5)",
                  }}
                >
                  {isSubscribed ? "Enabled" : "Disabled"}
                </p>
              </div>
              <button
                onClick={handleToggleNotifications}
                disabled={isLoading}
                style={{
                  width: "48px",
                  height: "28px",
                  borderRadius: "14px",
                  border: "none",
                  backgroundColor: isSubscribed ? "#CC3433" : "rgba(255,255,255,0.1)",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "background-color 0.2s",
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "12px",
                    backgroundColor: "white",
                    transition: "transform 0.2s",
                    transform: isSubscribed ? "translateX(20px)" : "translateX(2px)",
                  }}
                />
              </button>
            </div>

            {/* Info */}
            <p
              style={{
                margin: 0,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "12px",
                color: "rgba(255, 255, 255, 0.6)",
                lineHeight: "1.5",
              }}
            >
              {isSubscribed
                ? "You'll receive notifications for homeruns, draft updates, and trade activity."
                : "Enable notifications to stay updated on game events."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
