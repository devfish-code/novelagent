/**
 * Project Types
 * 前端项目相关的类型定义
 */

export type ProjectStatus = 'idle' | 'generating' | 'paused' | 'completed' | 'failed';

export type ChapterStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface Project {
  name: string;
  status: ProjectStatus;
  progress: ProjectProgress;
  metadata: ProjectMetadata;
  requirements?: string;
  chapters?: Chapter[];
}

export interface ProjectProgress {
  phase: number;
  percentage: number;
  currentTask: string;
}

export interface ProjectMetadata {
  createdAt: string;
  updatedAt: string;
  volumes: number;
  chaptersPerVolume: number;
  totalChapters: number;
  completedChapters: number;
}

export interface Chapter {
  volume: number;
  chapter: number;
  title: string;
  status: ChapterStatus;
  wordCount?: number;
  content?: string;
  validationResult?: ValidationResult;
}

export interface WorldState {
  characters: Character[];
  locations: Location[];
  rules: WorldRule[];
  timeline: TimelineEvent[];
  hooks: Hook[];
}

export interface Character {
  id: string;
  name: string;
  role: string;
  personality: string;
  background: string;
  abilities: string[];
  relationships: Record<string, string>;
  currentStatus: string;
  inventory: string[];
}

export interface Location {
  id: string;
  name: string;
  type: string;
  description: string;
  features: string[];
  connectedTo: string[];
}

export interface WorldRule {
  id: string;
  category: string;
  title: string;
  description: string;
  constraints: string[];
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  chapter: string;
  event: string;
  characters: string[];
  location: string;
  significance: 'major' | 'minor';
}

export interface Hook {
  id: string;
  type: 'foreshadowing' | 'callback';
  chapter: string;
  description: string;
  status: 'planted' | 'resolved' | 'pending';
  relatedChapters: string[];
}

export interface ValidationResult {
  passed: boolean;
  violations: Violation[];
  fixRounds: number;
  timestamp: string;
}

export interface Violation {
  type: ValidationType;
  severity: 'critical' | 'warning';
  description: string;
  location?: string;
  suggestion?: string;
}

export type ValidationType =
  | 'world_rule'
  | 'spacetime'
  | 'information_logic'
  | 'character_behavior'
  | 'ability'
  | 'inventory'
  | 'hook'
  | 'background'
  | 'narrative_logic';

export const ValidationTypeLabels: Record<ValidationType, string> = {
  world_rule: '世界规则校验',
  spacetime: '时空校验',
  information_logic: '信息逻辑校验',
  character_behavior: '角色行为校验',
  ability: '能力校验',
  inventory: '物品状态校验',
  hook: '伏笔校验',
  background: '常识背景校验',
  narrative_logic: '叙事逻辑校验',
};

export interface Task {
  id: string;
  projectName: string;
  type: 'framework' | 'chapters' | 'export';
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: TaskProgress;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: TaskError;
}

export interface TaskProgress {
  phase: number;
  percentage: number;
  current: number;
  total: number;
}

export interface TaskError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
