import { ValidationError } from "@/server-lib/errors";
import { eu4DaysToDate, getAchievement } from "@/server-lib/game";
import { withCore } from "@/server-lib/middleware";
import { DbRoute, saveView, table, toApiSave, withDb } from "@/server-lib/db";
import { sql, eq, asc, inArray } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const paramSchema = z.object({ achievementId: z.coerce.number() });
const handler = async (
  _req: NextRequest,
  { params, dbConn }: DbRoute & { params: { achievementId: unknown } },
) => {
  const achieveId = paramSchema.parse(params).achievementId;
  const achievement = getAchievement(achieveId);
  if (achievement === undefined) {
    throw new ValidationError("achievement not found");
  }

  const db = await dbConn;

  // saves with achievement
  const saves = db
    .select({
      id: table.saves.id,
      rn: sql<number>`ROW_NUMBER() OVER (PARTITION BY playthrough_id ORDER BY score_days)`.as(
        "rn",
      ),
    })
    .from(table.saves)
    .where(sql`${table.saves.achieveIds} @> Array[${[achieveId]}]::int[]`)
    .as("ranked");

  // best save in a given playthrough
  const top = db.select({ id: saves.id }).from(saves).where(eq(saves.rn, 1));

  const result = await db
    .select(
      saveView({
        save: {
          scoreDays: table.saves.scoreDays,
          days: table.saves.days,
        },
      }),
    )
    .from(table.saves)
    .innerJoin(table.users, eq(table.users.userId, table.saves.userId))
    .where(inArray(table.saves.id, top))
    .orderBy(asc(table.saves.scoreDays), asc(table.saves.createdOn));

  const s = result.map(({ save: { scoreDays, days, ...save }, user }) => ({
    ...user,
    ...toApiSave(save),
    days,
    weighted_score: scoreDays
      ? {
          days: scoreDays,
          date: eu4DaysToDate(scoreDays),
        }
      : null,
  }));
  return NextResponse.json({
    achievement: {
      ...achievement,
    },
    saves: s,
  });
};

export type AchievementResponse =
  Awaited<ReturnType<typeof handler>> extends NextResponse<infer T> ? T : never;

export const GET = withCore(withDb(handler));
