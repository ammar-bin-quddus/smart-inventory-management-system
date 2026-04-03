import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function logActivity(message: string, userId?: string) {
  const resolvedUserId = userId ?? (await getSession())?.userId;

  if (!resolvedUserId) {
    return;
  }

  await prisma.activityLog.create({
    data: {
      message,
      userId: resolvedUserId,
    },
  });
}
