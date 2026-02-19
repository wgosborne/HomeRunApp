import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Fantasy Homerun Tracker
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Track homeruns. Manage your league. Win the season.
        </p>
        <a
          href="/api/auth/signin"
          className="inline-block px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
        >
          Sign In with Google
        </a>
      </div>
    </main>
  );
}
