import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DraftRoom } from "./components/DraftRoom";

export const metadata = {
  title: "Draft Room",
};

interface DraftPageParams {
  leagueId: string;
}

export default async function DraftPage({
  params,
}: {
  params: Promise<DraftPageParams>;
}) {
  const session = await getServerSession();

  if (!session || !session.user?.email) {
    redirect("/auth/signin");
  }

  const { leagueId } = await params;

  // Verify user is a member of this league
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  const membership = await prisma.leagueMembership.findUnique({
    where: {
      userId_leagueId: {
        userId: user.id,
        leagueId,
      },
    },
  });

  if (!membership) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <DraftRoom leagueId={leagueId} userId={user.id} />
    </div>
  );
}
