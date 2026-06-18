'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useShellStore } from '@/stores/shellStore';
import { Panel } from './Panel';
import { RequestProgress } from './RequestProgress';

export interface CodingProject {
  id: string;
  title: string;
  goal: string;
  html: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskStepResult {
  id: string;
  label: string;
  status: 'done' | 'failed';
  detail?: string;
}

interface TaskExecuteResult {
  project: CodingProject;
  steps: TaskStepResult[];
  playable: boolean;
}

export function CodingPanel({ initialProjectId }: { initialProjectId?: string | null }) {
  const qc = useQueryClient();
  const setActiveCodingProjectId = useShellStore((s) => s.setActiveCodingProjectId);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const [goal, setGoal] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(initialProjectId ?? null);
  const [html, setHtml] = useState('');
  const [steps, setSteps] = useState<TaskStepResult[]>([]);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewFocused, setPreviewFocused] = useState(false);

  const { data: projects } = useQuery({
    queryKey: queryKeys.codingProjects,
    queryFn: () => api.invoke<CodingProject[]>('bellasos.coding', 'project.list', {}),
  });

  const { data: loaded } = useQuery({
    queryKey: ['coding-project', selectedId],
    queryFn: () =>
      api.invoke<CodingProject>('bellasos.coding', 'project.get', { id: selectedId! }),
    enabled: Boolean(selectedId),
  });

  useEffect(() => {
    if (initialProjectId) setSelectedId(initialProjectId);
  }, [initialProjectId]);

  useEffect(() => {
    setActiveCodingProjectId(selectedId);
  }, [selectedId, setActiveCodingProjectId]);

  useEffect(() => {
    if (loaded) {
      setHtml(loaded.html);
      setGoal(loaded.goal.split('\n\nRefinement:')[0] ?? loaded.goal);
      setPreviewKey((k) => k + 1);
    }
  }, [loaded]);

  const selected = useMemo(
    () => projects?.find((p) => p.id === selectedId) ?? loaded ?? null,
    [projects, selectedId, loaded],
  );

  const onTaskSuccess = (result: TaskExecuteResult) => {
    setSteps(result.steps);
    setSelectedId(result.project.id);
    setHtml(result.project.html);
    setGoal(result.project.goal.split('\n\nRefinement:')[0] ?? result.project.goal);
    setEditPrompt('');
    setPreviewKey((k) => k + 1);
    setPreviewFocused(false);
    qc.invalidateQueries({ queryKey: queryKeys.codingProjects });
    qc.invalidateQueries({ queryKey: ['coding-project', result.project.id] });
  };

  const runTask = useMutation({
    mutationFn: () =>
      api.invoke<TaskExecuteResult>('bellasos.coding', 'task.execute', { goal: goal.trim() }),
    onSuccess: onTaskSuccess,
  });

  const refineTask = useMutation({
    mutationFn: () =>
      api.invoke<TaskExecuteResult>('bellasos.coding', 'task.refine', {
        projectId: selectedId!,
        prompt: editPrompt.trim(),
      }),
    onSuccess: onTaskSuccess,
  });

  const saveProject = useMutation({
    mutationFn: () =>
      api.invoke<CodingProject>('bellasos.coding', 'project.save', {
        id: selectedId ?? undefined,
        title: selected?.title ?? 'Untitled project',
        goal: goal.trim() || selected?.goal,
        html,
      }),
    onSuccess: (project) => {
      setSelectedId(project.id);
      setPreviewKey((k) => k + 1);
      qc.invalidateQueries({ queryKey: queryKeys.codingProjects });
    },
  });

  const taskPending = runTask.isPending || refineTask.isPending;

  function focusPreview() {
    previewRef.current?.focus();
    setPreviewFocused(true);
  }

  return (
    <div className="space-y-4">
      <Panel title="Coding Studio" subtitle="Build and refine with prompts">
        <p className="text-xs text-muted mb-3">
          Create a new project with a goal, or select an existing project and describe what to
          change — e.g. &quot;Fix arrow key controls&quot;.
        </p>
        <div className="flex flex-col md:flex-row gap-2 mb-3">
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder='New project: "Build a snake game with arrow keys"'
            className="flex-1 bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={() => runTask.mutate()}
            disabled={!goal.trim() || taskPending}
            className="bg-accent text-bg font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50 shrink-0"
          >
            {runTask.isPending ? 'Running…' : 'New project'}
          </button>
        </div>

        {selectedId && (
          <div className="flex flex-col md:flex-row gap-2 mb-3 pt-2 border-t border-edge/60">
            <p className="text-xs text-accent w-full md:w-auto shrink-0 pt-2">
              Editing: {selected?.title ?? 'project'}
            </p>
            <input
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder='Edit selected: "Fix arrow keys so snake moves on keydown"'
              className="flex-1 bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={() => refineTask.mutate()}
              disabled={!editPrompt.trim() || !selectedId || taskPending}
              className="font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50 shrink-0 border border-accent text-accent hover:bg-accent/10"
            >
              {refineTask.isPending ? 'Applying…' : 'Apply edit'}
            </button>
          </div>
        )}

        <RequestProgress active={taskPending} />
        {(runTask.error || refineTask.error) && (
          <p className="text-xs text-red-400 mt-2">
            {((runTask.error ?? refineTask.error) as Error).message}
          </p>
        )}
        {steps.length > 0 && (
          <ol className="mt-3 space-y-1 text-xs">
            {steps.map((s) => (
              <li
                key={s.id}
                className={`flex gap-2 ${s.status === 'failed' ? 'text-red-400' : 'text-muted'}`}
              >
                <span>{s.status === 'done' ? '✓' : '✗'}</span>
                <span>
                  {s.label}
                  {s.detail ? ` — ${s.detail}` : ''}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Projects" subtitle="saved artifacts">
          <select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value || null)}
            className="w-full bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm mb-3"
          >
            <option value="">Select a project…</option>
            {(projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            spellCheck={false}
            className="w-full h-64 bg-panel2 border border-edge rounded-lg px-3 py-2 text-xs font-mono resize-y"
            placeholder="HTML source appears here after a task runs…"
          />
          <button
            onClick={() => saveProject.mutate()}
            disabled={!html.trim() || saveProject.isPending}
            className="mt-2 text-xs px-3 py-2 border border-edge rounded-lg text-accent disabled:opacity-50"
          >
            {saveProject.isPending ? 'Saving…' : 'Save & refresh preview'}
          </button>
        </Panel>

        <Panel title="Preview" subtitle="click to focus keyboard">
          {html.trim() ? (
            <div
              className="relative cursor-pointer"
              onClick={focusPreview}
              role="presentation"
            >
              {!previewFocused && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/50 text-xs text-white pointer-events-none">
                  Click preview to enable keyboard
                </div>
              )}
              <iframe
                ref={previewRef}
                key={previewKey}
                title="Coding preview"
                tabIndex={0}
                sandbox="allow-scripts allow-same-origin"
                srcDoc={html}
                onFocus={() => setPreviewFocused(true)}
                onBlur={() => setPreviewFocused(false)}
                className="w-full aspect-video bg-black rounded-lg border border-edge outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
          ) : (
            <p className="text-xs text-muted">Run a task or select a project to preview.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
