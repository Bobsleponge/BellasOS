import type { AIGateway } from '@bellasos/contracts';
export interface TaskStepResult {
    id: string;
    label: string;
    status: 'done' | 'failed';
    detail?: string;
}
export interface CodingProject {
    id: string;
    title: string;
    goal: string;
    html: string;
    createdAt: string;
    updatedAt: string;
}
export interface TaskExecuteResult {
    project: CodingProject;
    steps: TaskStepResult[];
    playable: boolean;
}
/**
 * Standard end-to-end coding task flow:
 * analyze goal → plan steps → generate artifact → validate → persist → ready to preview.
 */
export declare function executeCodingTask(goal: string, ai: AIGateway, save: (project: CodingProject) => Promise<void>): Promise<TaskExecuteResult>;
/**
 * Refine an existing project with a natural-language prompt.
 * analyze change → apply edit → validate → save same project id.
 */
export declare function refineCodingProject(prompt: string, existing: CodingProject, ai: AIGateway, save: (project: CodingProject) => Promise<void>): Promise<TaskExecuteResult>;
//# sourceMappingURL=task-pipeline.d.ts.map