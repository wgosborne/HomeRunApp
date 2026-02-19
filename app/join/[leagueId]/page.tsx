"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface League {
  id: string;
  name: string;
  commissionerId: string;
  memberships: Array<{
    id: string;
    userId: string;
    user?: {
      name: string;
    };
  }>;
}

export default function JoinLeaguePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const leagueId = params.leagueId as string;

  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [isAlreadyMember, setIsAlreadyMember] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      // Set invite cookie and redirect to sign-in with callback
      setInviteCookieAndSignIn();
    }
  }, [status, leagueId]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchLeagueAndCheckMembership();
    }
  }, [status, leagueId]);

  const setInviteCookieAndSignIn = async () => {
    try {
      // Set the invite cookie
      await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId }),
      });

      // Redirect to sign-in with callback URL
      const callbackUrl = `/join/${leagueId}`;
      await signIn("google", { callbackUrl });
    } catch (error) {
      console.error("Failed to set invite cookie:", error);
      router.push("/");
    }
  };

  const fetchLeagueAndCheckMembership = async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}`);
      if (!res.ok) {
        setError("League not found");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setLeague(data);

      // Check if current user is already a member
      const isMember = data.memberships.some(
        (m: any) => m.userId === session?.user?.id
      );

      if (isMember) {
        setIsAlreadyMember(true);
        // Auto-redirect if already a member
        setTimeout(() => {
          router.push(`/league/${leagueId}`);
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to fetch league:", error);
      setError("Failed to load league");
    } finally {
      setLoading(false);
    }
  };

  const joinLeague = async () => {
    setJoining(true);
    setError("");
    try {
      const res = await fetch(`/api/leagues/${leagueId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        // Clear the invite cookie
        await fetch("/api/invite", { method: "GET" });

        // Successfully joined, redirect to league home
        router.push(`/league/${leagueId}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to join league");
      }
    } catch (error) {
      console.error("Failed to join league:", error);
      setError("Failed to join league");
    } finally {
      setJoining(false);
    }
  };

  if (status === "loading" || loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (isAlreadyMember) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Already a Member</h1>
          <p className="text-gray-600 mb-4">You are already part of this league.</p>
          <p className="text-sm text-gray-500">Redirecting...</p>
        </div>
      </main>
    );
  }

  if (!league) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">League Not Found</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Join League</h1>

        <div className="mb-6 p-4 bg-indigo-50 rounded">
          <p className="text-gray-600 mb-2">You've been invited to join:</p>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{league.name}</h2>
          <p className="text-sm text-gray-600">Members: {league.memberships.length}</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={joinLeague}
            disabled={joining}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {joining ? "Joining..." : "Join League"}
          </button>
        </div>
      </div>
    </main>
  );
}
