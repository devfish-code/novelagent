import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './projectStore';
import type { ProjectSummary, ProjectDetail } from '../types';

describe('projectStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useProjectStore.getState().reset();
  });

  it('should initialize with empty state', () => {
    const state = useProjectStore.getState();
    expect(state.projects).toEqual([]);
    expect(state.currentProject).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should set projects', () => {
    const mockProjects: ProjectSummary[] = [
      {
        name: 'project-1',
        status: 'idle',
        progress: {
          phase: 1,
          percentage: 0,
          currentTask: '',
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          volumes: 1,
          chaptersPerVolume: 10,
          totalChapters: 10,
          completedChapters: 0,
        },
      },
    ];

    useProjectStore.getState().setProjects(mockProjects);
    const state = useProjectStore.getState();
    expect(state.projects).toEqual(mockProjects);
  });

  it('should update project', () => {
    const mockProjects: ProjectSummary[] = [
      {
        name: 'project-1',
        status: 'idle',
        progress: {
          phase: 1,
          percentage: 0,
          currentTask: '',
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          volumes: 1,
          chaptersPerVolume: 10,
          totalChapters: 10,
          completedChapters: 0,
        },
      },
    ];

    useProjectStore.getState().setProjects(mockProjects);
    useProjectStore.getState().updateProject('project-1', {
      status: 'generating',
      progress: {
        phase: 2,
        percentage: 50,
        currentTask: 'Generating chapters',
      },
    });

    const state = useProjectStore.getState();
    expect(state.projects[0].status).toBe('generating');
    expect(state.projects[0].progress.phase).toBe(2);
    expect(state.projects[0].progress.percentage).toBe(50);
  });

  it('should remove project', () => {
    const mockProjects: ProjectSummary[] = [
      {
        name: 'project-1',
        status: 'idle',
        progress: {
          phase: 1,
          percentage: 0,
          currentTask: '',
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          volumes: 1,
          chaptersPerVolume: 10,
          totalChapters: 10,
          completedChapters: 0,
        },
      },
      {
        name: 'project-2',
        status: 'idle',
        progress: {
          phase: 1,
          percentage: 0,
          currentTask: '',
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          volumes: 1,
          chaptersPerVolume: 10,
          totalChapters: 10,
          completedChapters: 0,
        },
      },
    ];

    useProjectStore.getState().setProjects(mockProjects);
    useProjectStore.getState().removeProject('project-1');

    const state = useProjectStore.getState();
    expect(state.projects).toHaveLength(1);
    expect(state.projects[0].name).toBe('project-2');
  });

  it('should set loading state', () => {
    useProjectStore.getState().setLoading(true);
    expect(useProjectStore.getState().loading).toBe(true);

    useProjectStore.getState().setLoading(false);
    expect(useProjectStore.getState().loading).toBe(false);
  });

  it('should set and clear error', () => {
    useProjectStore.getState().setError('Test error');
    expect(useProjectStore.getState().error).toBe('Test error');

    useProjectStore.getState().clearError();
    expect(useProjectStore.getState().error).toBeNull();
  });

  it('should reset to initial state', () => {
    const mockProjects: ProjectSummary[] = [
      {
        name: 'project-1',
        status: 'idle',
        progress: {
          phase: 1,
          percentage: 0,
          currentTask: '',
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          volumes: 1,
          chaptersPerVolume: 10,
          totalChapters: 10,
          completedChapters: 0,
        },
      },
    ];

    useProjectStore.getState().setProjects(mockProjects);
    useProjectStore.getState().setLoading(true);
    useProjectStore.getState().setError('Test error');

    useProjectStore.getState().reset();

    const state = useProjectStore.getState();
    expect(state.projects).toEqual([]);
    expect(state.currentProject).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });
});
