import { OpportunityScore } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

function computeOpportunityScore(impressions: number, avgPosition: number): OpportunityScore {
  if (impressions > 1000 && avgPosition >= 8 && avgPosition <= 20) return OpportunityScore.high;
  if (impressions > 500 && avgPosition >= 5 && avgPosition <= 15) return OpportunityScore.medium;
  return OpportunityScore.low;
}

// Aggregate gsc_pages for a workspace and upsert into the pages table.
export async function buildPages(workspaceId: string): Promise<number> {
  const rows = await prisma.gscPage.groupBy({
    by: ['workspaceId', 'page'],
    where: { workspaceId },
    _sum: { clicks: true, impressions: true },
    _avg: { ctr: true, position: true },
    _max: { syncedAt: true },
  });

  if (rows.length === 0) return 0;

  for (const row of rows) {
    const totalClicks = row._sum.clicks ?? 0;
    const totalImpressions = row._sum.impressions ?? 0;
    const avgCtr = row._avg.ctr ?? 0;
    const avgPosition = row._avg.position ?? 0;
    const opportunityScore = computeOpportunityScore(totalImpressions, avgPosition);
    const lastSeenDate = row._max.syncedAt ?? null;

    await prisma.page.upsert({
      where: { workspaceId_pageUrl: { workspaceId, pageUrl: row.page } },
      update: { totalClicks, totalImpressions, avgCtr, avgPosition, opportunityScore, lastSeenDate },
      create: {
        workspaceId,
        pageUrl: row.page,
        totalClicks,
        totalImpressions,
        avgCtr,
        avgPosition,
        opportunityScore,
        lastSeenDate,
      },
    });
  }

  return rows.length;
}

export type SortField = 'clicks' | 'impressions' | 'position';

interface ListPagesOptions {
  workspaceId: string;
  sortBy?: SortField;
  sortDir?: 'asc' | 'desc';
  opportunityScore?: OpportunityScore;
  minImpressions?: number;
  maxImpressions?: number;
  page?: number;
  pageSize?: number;
}

export async function listPages(opts: ListPagesOptions) {
  const {
    workspaceId,
    sortBy = 'impressions',
    sortDir = 'desc',
    opportunityScore,
    minImpressions,
    maxImpressions,
    page = 1,
    pageSize = 50,
  } = opts;

  const orderBy =
    sortBy === 'clicks' ? { totalClicks: sortDir } :
    sortBy === 'position' ? { avgPosition: sortDir } :
    { totalImpressions: sortDir };

  const where = {
    workspaceId,
    ...(opportunityScore ? { opportunityScore } : {}),
    ...(minImpressions !== undefined || maxImpressions !== undefined
      ? { totalImpressions: { gte: minImpressions, lte: maxImpressions } }
      : {}),
  };

  const [total, pages] = await Promise.all([
    prisma.page.count({ where }),
    prisma.page.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        pageUrl: true,
        totalClicks: true,
        totalImpressions: true,
        avgCtr: true,
        avgPosition: true,
        opportunityScore: true,
        lastSeenDate: true,
      },
    }),
  ]);

  return { pages, total, page, pageSize };
}
