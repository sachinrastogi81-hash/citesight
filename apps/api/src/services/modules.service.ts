import { prisma } from '../lib/prisma.js';

// Modules 5-12 service functions (stubs for Phase 2+)
// Modules 1-4 have been moved to dedicated services:
//   - auth.service.ts (Module 1)
//   - workspace.service.ts (Module 1)
//   - onboarding.service.ts (Module 2)
//   - prompts.service.ts (Module 3)
//   - tracking.service.ts (Module 4)

export async function computeVisibility(workspaceId: string) {
  const citations = await prisma.citationEntry.count({ where: { workspaceId } });
  const brandMentions = await prisma.citationEntry.count({ where: { workspaceId, citedBrand: { not: null } } });
  const score = citations ? Math.round((brandMentions / citations) * 100) : 0;

  return prisma.visibilityScore.create({
    data: {
      workspaceId,
      score,
      shareOfVoice: citations ? brandMentions / citations : 0,
      citationRate: citations,
      periodStart: new Date(Date.now() - 7 * 24 * 3600 * 1000),
      periodEnd: new Date()
    }
  });
}

export async function detectOpportunities(workspaceId: string) {
  const queries = await prisma.aeoQuery.findMany({ where: { workspaceId }, take: 10 });
  for (const query of queries) {
    await prisma.opportunity.create({
      data: {
        workspaceId,
        queryId: query.id,
        competitor: 'competitor.com',
        gapType: 'COMPETITOR_ONLY_CITED',
        priorityScore: 0.7,
        recommendation: 'Create a concise comparison page targeting this query.'
      }
    });
  }
  return prisma.opportunity.findMany({ where: { workspaceId }, orderBy: { priorityScore: 'desc' } });
}

export async function generateContent(input: { workspaceId: string; queryId: string }) {
  return prisma.generatedContent.create({
    data: {
      workspaceId: input.workspaceId,
      queryId: input.queryId,
      content: '## Best option\n\nShort, citation-friendly answer with clear evidence.',
      status: 'DRAFT'
    }
  });
}

export async function createWorkflow(input: { workspaceId: string; name: string }) {
  return prisma.workflowTemplate.create({
    data: {
      workspaceId: input.workspaceId,
      name: input.name,
      definition: {
        steps: ['collect', 'extract', 'score', 'opportunity', 'generate']
      }
    }
  });
}

export async function runWorkflow(input: { workspaceId: string; workflowId: string }) {
  return prisma.workflowRun.create({
    data: {
      workspaceId: input.workspaceId,
      workflowTemplateId: input.workflowId,
      status: 'PENDING'
    }
  });
}

export async function listJobs(workspaceId: string) {
  return prisma.workflowRun.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' }, take: 100 });
}

export async function retryJob(workspaceId: string, id: string) {
  return prisma.workflowRun.update({
    where: { id },
    data: {
      workspaceId,
      status: 'PENDING',
      retryCount: { increment: 1 }
    }
  });
}
