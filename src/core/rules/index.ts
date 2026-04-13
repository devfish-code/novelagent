/**
 * 校验规则基础设施
 * 
 * 定义校验规则接口、校验结果类型和并行执行函数
 */

import { Chapter } from '../models/chapter.js';
import { WorldState } from '../models/worldState.js';
import { ChapterOutline } from '../models/outline.js';
import { Character } from '../models/character.js';

/**
 * 校验类型枚举
 */
export type ValidationType =
  | 'WORLD_RULE'
  | 'SPACETIME'
  | 'INFORMATION_LOGIC'
  | 'CHARACTER_BEHAVIOR'
  | 'ABILITY'
  | 'INVENTORY'
  | 'HOOK'
  | 'BACKGROUND'
  | 'NARRATIVE_LOGIC';

/**
 * 违规项
 */
export interface Violation {
  type: ValidationType;
  severity: 'critical' | 'warning';
  message: string;
  location?: string;
  suggestedFix?: string;
}

/**
 * 校验结果
 */
export interface ValidationResult {
  passed: boolean;
  violations: Violation[];
}

/**
 * 校验上下文
 * 包含校验所需的所有数据
 */
export interface ValidationContext {
  worldState: WorldState;
  chapterOutline: ChapterOutline;
  characters: Record<string, Character>;
}

/**
 * 校验规则接口
 */
export interface ValidationRule {
  validate(chapter: Chapter, context: ValidationContext): ValidationResult;
}

/**
 * 校验函数类型
 */
export type ValidationFunction = (
  chapter: Chapter,
  context: ValidationContext
) => ValidationResult;

/**
 * 并行执行所有校验规则
 * 
 * @param chapter - 待校验的章节
 * @param context - 校验上下文
 * @param validationFunctions - 校验函数列表
 * @returns 所有校验结果
 * 
 * **Validates: Requirements 9.19**
 */
export async function runValidationsInParallel(
  chapter: Chapter,
  context: ValidationContext,
  validationFunctions: ValidationFunction[]
): Promise<ValidationResult[]> {
  // 并行执行所有校验函数
  const results = await Promise.all(
    validationFunctions.map(fn => Promise.resolve(fn(chapter, context)))
  );

  return results;
}

/**
 * 创建成功的校验结果
 */
export function createPassedResult(): ValidationResult {
  return {
    passed: true,
    violations: [],
  };
}

/**
 * 创建失败的校验结果
 */
export function createFailedResult(violations: Violation[]): ValidationResult {
  return {
    passed: false,
    violations,
  };
}

/**
 * 创建违规项
 */
export function createViolation(
  type: ValidationType,
  severity: 'critical' | 'warning',
  message: string,
  location?: string,
  suggestedFix?: string
): Violation {
  return {
    type,
    severity,
    message,
    location,
    suggestedFix,
  };
}

// 导出所有校验函数
export { validateWorldRules } from './worldRuleValidation.js';
export { validateSpacetime } from './spacetimeValidation.js';
export { validateInformationLogic } from './informationValidation.js';
export { validateCharacterBehavior } from './characterValidation.js';
export { validateAbility } from './abilityValidation.js';
export { validateInventory } from './inventoryValidation.js';
export { validateHooks } from './hookValidation.js';
export { validateBackground } from './backgroundValidation.js';
export { validateNarrativeLogic } from './narrativeValidation.js';
