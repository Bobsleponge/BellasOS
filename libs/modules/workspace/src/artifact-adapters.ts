import type { Artifact, ArtifactKind } from '@bellasos/contracts';

export function bridgeResearchReport(
  reportId: string,
  report: { subject?: string; title?: string; kind?: string; createdAt?: string },
  workspaceId: string,
  ownerId: string,
): Artifact {
  const now = new Date().toISOString();
  return {
    id: `artifact:research:${reportId}`,
    kind: 'research_report',
    title: String(report.subject ?? report.title ?? 'Research report'),
    summary: report.kind ? `Research report (${report.kind})` : 'Research report',
    contentRef: {
      applicationId: 'bellasos.research',
      resourceType: 'report',
      externalId: reportId,
      uri: `module:bellasos.research/report:${reportId}`,
    },
    workspaceIds: [workspaceId],
    goalIds: [],
    initiativeIds: [],
    decisionIds: [],
    applicationIds: ['research'],
    ownerId,
    createdAt: report.createdAt ?? now,
    updatedAt: now,
  };
}

export function bridgeCodingProject(
  project: { id?: string; name?: string; title?: string; goal?: string; createdAt?: string },
  workspaceId: string,
  ownerId: string,
): Artifact {
  const projectId = String(project.id ?? crypto.randomUUID());
  const now = new Date().toISOString();
  return {
    id: `artifact:coding:${projectId}`,
    kind: 'coding_project',
    title: String(project.name ?? project.title ?? 'Coding project'),
    summary: project.goal ? String(project.goal).slice(0, 120) : 'Coding project artifact',
    contentRef: {
      applicationId: 'bellasos.coding',
      resourceType: 'project',
      externalId: projectId,
      uri: `module:bellasos.coding/project:${projectId}`,
    },
    workspaceIds: [workspaceId],
    goalIds: [],
    initiativeIds: [],
    decisionIds: [],
    applicationIds: ['coding-studio'],
    ownerId,
    createdAt: project.createdAt ?? now,
    updatedAt: now,
  };
}

export function nativeArtifact(input: {
  kind: ArtifactKind;
  title: string;
  summary?: string;
  workspaceId?: string;
  goalIds?: string[];
  ownerId: string;
}): Artifact {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  return {
    id,
    kind: input.kind,
    title: input.title,
    summary: input.summary,
    contentRef: {
      applicationId: 'bellasos.workspace',
      resourceType: 'artifact',
      externalId: id,
    },
    workspaceIds: input.workspaceId ? [input.workspaceId] : [],
    goalIds: input.goalIds ?? [],
    initiativeIds: [],
    decisionIds: [],
    applicationIds: [],
    ownerId: input.ownerId,
    createdAt: now,
    updatedAt: now,
  };
}
