"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Unknown error";

  return (
    <div
      style={{
        textAlign: "center",
        maxWidth: "600px",
      }}
    >
      <h1
        style={{
          color: "#CC3433",
          fontSize: "48px",
          fontWeight: 800,
          marginBottom: "16px",
        }}
      >
        Auth Error
      </h1>
      <p
        style={{
          color: "#FFFFFF",
          fontSize: "18px",
          marginBottom: "24px",
        }}
      >
        {error === "Configuration"
          ? "There's a configuration issue with authentication. Please contact support."
          : `Authentication failed: ${error}`}
      </p>
      <Link
        href="/auth/signin"
        style={{
          display: "inline-block",
          backgroundColor: "#CC3433",
          color: "white",
          padding: "12px 24px",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        Back to Sign In
      </Link>
    </div>
  );
}

export default function AuthError() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0f1923",
        padding: "20px",
      }}
    >
      <Suspense fallback={<div style={{ color: "white" }}>Loading...</div>}>
        <ErrorContent />
      </Suspense>
    </div>
  );
}
