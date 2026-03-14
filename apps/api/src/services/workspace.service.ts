import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';

type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';

export async function createWorkspace(input: { userId: string; name: string; slug: string }) {
  const workspace = await prisma.workspace.create({
    data: {
      name: input.name,
      slug: input.slug,
      memberships: {
        create: {
          userId: input.userId,
          role: 'ADMIN'
        }
      }
    }
  });

  return workspace;
}

export async function listUserWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMembership.findMany({
    where: { userId },
    include: {
      workspace: {
        select: { id: true, name: true, slug: true, onboardingComplete: true, createdAt: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return memberships.map((m) => ({
    ...m.workspace,
    role: m.role
  }));
}

export async function getWorkspace(workspaceId: string) {
  return prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    include: {
      brands: { select: { id: true, name: true, description: true, category: true } },
      _count: { select: { memberships: true, apiKeys: true } }
    }
  });
}

export async function updateWorkspace(workspaceId: string, input: { name?: string; slug?: string }) {
  return prisma.workspace.update({
    where: { id: workspaceId },
    data: input
  });
}

export async function deleteWorkspace(workspaceId: string) {
  await prisma.workspace.delete({ where: { id: workspaceId } });
  return { ok: true };
}

export async function listWorkspaceMembers(workspaceId: string) {
  return prisma.workspaceMembership.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, email: true, name: true } } }
  });
}

export async function updateMemberRole(input: { workspaceId: string; userId: string; role: Role }) {
  return prisma.workspaceMembership.update({
    where: { userId_workspaceId: { userId: input.userId, workspaceId: input.workspaceId } },
    data: { role: input.role },
    include: { user: { select: { id: true, email: true, name: true } } }
  });
}

export async function removeMember(input: { workspaceId: string; userId: string }) {
  await prisma.workspaceMembership.delete({
    where: { userId_workspaceId: { userId: input.userId, workspaceId: input.workspaceId } }
  });
  return { ok: true };
}

export async function inviteWorkspaceMember(input: { workspaceId: string; email: string; role: Role }) {
  let user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.email.split('@')[0]
      }
    });
  }

  return prisma.workspaceMembership.upsert({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: input.workspaceId
      }
    },
    update: { role: input.role },
    create: {
      userId: user.id,
      workspaceId: input.workspaceId,
      role: input.role
    },
    include: { user: { select: { id: true, email: true, name: true } } }
  });
}

export async function createApiKey(input: { workspaceId: string; label: string }) {
  const key = `cs_${crypto.randomBytes(24).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');

  const record = await prisma.apiKey.create({
    data: {
      workspaceId: input.workspaceId,
      label: input.label,
      keyHash,
      keyPreview: `${key.slice(0, 10)}...`
    }
  });

  return { ...record, key };
}

export async function listApiKeys(workspaceId: string) {
  return prisma.apiKey.findMany({
    where: { workspaceId },
    select: { id: true, label: true, keyPreview: true, lastUsed: true, createdAt: true }
  });
}

export async function revokeApiKey(workspaceId: string, keyId: string) {
  await prisma.apiKey.delete({ where: { id: keyId, workspaceId } });
  return { ok: true };
}
