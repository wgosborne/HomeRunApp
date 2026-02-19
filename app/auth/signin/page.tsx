import { signIn } from "@/lib/auth";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full text-center bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Fantasy Homerun Tracker
        </h1>
        <p className="text-gray-600 mb-8">Sign in to your account</p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
          >
            Sign in with Google
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-6">
          By signing in, you agree to create an account with your Google email.
        </p>
      </div>
    </main>
  );
}
