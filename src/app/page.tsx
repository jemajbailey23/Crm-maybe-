import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await getSession();
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { defaultLandingPage: true },
    });
    redirect(user?.defaultLandingPage || "/dashboard");
  }

  const userCount = await prisma.user.count();
  redirect(userCount === 0 ? "/signup" : "/login");
}
