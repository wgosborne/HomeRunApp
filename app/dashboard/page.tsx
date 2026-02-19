"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface League {
  id: string;
  name: string;
  commissionerId: string;
  userRole: string;
  teamName?: string;
  memberships: any[];
}

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchLeagues();
    }
  }, [status]);

  const fetchLeagues = async () => {
    try {
      const res = await fetch("/api/leagues");
      if (res.ok) {
        const data = await res.json();
        setLeagues(data);
      }
    } catch (error) {
      console.error("Failed to fetch leagues:", error);
    } finally {
      setLoading(false);
    }
  };

  const createLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeagueName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLeagueName }),
      });

      if (res.ok) {
        const newLeague = await res.json();
        setLeagues([...leagues, newLeague]);
        setNewLeagueName("");
      }
    } catch (error) {
      console.error("Failed to create league:", error);
    } finally {
      setCreating(false);
    }
  };


  if (status === "loading" || loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">My Leagues</h1>
          <button
            onClick={() => {
              fetch("/api/auth/signout", { method: "POST" });
              router.push("/");
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>

        {/* Create League Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New League</h2>
          <form onSubmit={createLeague} className="flex gap-2">
            <input
              type="text"
              placeholder="League name"
              value={newLeagueName}
              onChange={(e) => setNewLeagueName(e.target.value)}
              className="flex-1 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={creating || !newLeagueName.trim()}
              className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </form>
        </div>

        {/* Leagues List */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league) => (
            <div
              key={league.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 cursor-pointer"
              onClick={() => router.push(`/league/${league.id}`)}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {league.name}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                Members: {league.memberships?.length || 0}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Your team: {league.teamName || "Team Name"}
              </p>
              <p className="text-xs text-indigo-600">
                {league.userRole === "commissioner" ? "Commissioner" : "Member"}
              </p>
            </div>
          ))}
        </div>

        {leagues.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No leagues yet. Create one above!</p>
          </div>
        )}
      </div>
    </main>
  );
}
