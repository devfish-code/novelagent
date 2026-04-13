/**
 * 常识背景校验
 * 
 * 检测与世界背景不符的事物
 */

import { Chapter } from '../models/chapter.js';
import {
  ValidationContext,
  ValidationResult,
  createPassedResult,
  createFailedResult,
  createViolation,
} from './index.js';

/**
 * 校验常识背景
 * 
 * 检测是否出现与世界背景不符的事物
 * 基于世界观设定和时代背景
 * 
 * @param chapter - 待校验的章节
 * @param context - 校验上下文
 * @returns 校验结果
 * 
 * **Validates: Requirements 9.15, 9.16**
 */
export function validateBackground(
  chapter: Chapter,
  context: ValidationContext
): ValidationResult {
  const violations = [];
  const { worldState, chapterOutline } = context;
  const { content } = chapter;

  // 检查是否出现时代错误的事物
  const anachronisms = detectAnachronisms(content, worldState);
  for (const anachronism of anachronisms) {
    violations.push(
      createViolation(
        'BACKGROUND',
        'critical',
        `出现了与世界背景不符的事物: "${anachronism}"`,
        `章节: ${chapterOutline.title}`,
        `请确保所有事物符合世界观设定`
      )
    );
  }

  // 检查是否违反世界观设定
  const worldviewViolations = detectWorldviewViolations(content, worldState);
  for (const violation of worldviewViolations) {
    violations.push(
      createViolation(
        'BACKGROUND',
        'critical',
        `内容与世界观设定冲突: ${violation}`,
        `章节: ${chapterOutline.title}`,
        `请检查世界观设定并修正内容`
      )
    );
  }

  return violations.length > 0
    ? createFailedResult(violations)
    : createPassedResult();
}

/**
 * 检测时代错误的事物
 * 
 * @param content - 章节内容
 * @param worldState - 世界状态
 * @returns 时代错误的事物列表
 */
function detectAnachronisms(
  content: string,
  worldState: { worldRules: Array<{ category: string; description: string }> }
): string[] {
  const anachronisms: string[] = [];

  // 获取世界的时代背景
  const eraRule = worldState.worldRules.find(rule =>
    rule.category.includes('时代') || rule.category.includes('背景')
  );

  if (!eraRule) {
    return anachronisms;
  }

  // 根据时代背景检测不符合的事物
  const era = extractEra(eraRule.description);
  const inappropriateItems = getInappropriateItemsForEra(era);

  for (const item of inappropriateItems) {
    if (content.includes(item)) {
      anachronisms.push(item);
    }
  }

  return anachronisms;
}

/**
 * 检测世界观违规
 * 
 * @param content - 章节内容
 * @param worldState - 世界状态
 * @returns 违规描述列表
 */
function detectWorldviewViolations(
  content: string,
  worldState: { worldRules: Array<{ category: string; description: string; constraints: string[] }> }
): string[] {
  const violations: string[] = [];

  // 检查是否违反世界观规则
  for (const rule of worldState.worldRules) {
    if (rule.category === '世界观' || rule.category === '设定') {
      // 检查约束条件
      for (const constraint of rule.constraints) {
        if (isConstraintViolated(content, constraint)) {
          violations.push(`违反规则: ${rule.description} - ${constraint}`);
        }
      }
    }
  }

  return violations;
}

/**
 * 从规则描述中提取时代信息
 * 
 * @param description - 规则描述
 * @returns 时代标识
 */
function extractEra(description: string): string {
  // 简化实现:提取时代关键词
  const eraKeywords = [
    '古代',
    '中世纪',
    '近代',
    '现代',
    '未来',
    '科幻',
    '魔法',
    '修仙',
  ];

  for (const keyword of eraKeywords) {
    if (description.includes(keyword)) {
      return keyword;
    }
  }

  return '未知';
}

/**
 * 获取特定时代不应出现的事物
 * 
 * @param era - 时代标识
 * @returns 不应出现的事物列表
 */
function getInappropriateItemsForEra(era: string): string[] {
  const inappropriateItems: Record<string, string[]> = {
    '古代': ['手机', '电脑', '汽车', '飞机', '互联网'],
    '中世纪': ['手机', '电脑', '汽车', '飞机', '互联网', '枪'],
    '修仙': ['手机', '电脑', '汽车', '飞机'],
    '魔法': ['手机', '电脑', '互联网'],
  };

  return inappropriateItems[era] || [];
}

/**
 * 检查约束条件是否被违反
 * 
 * @param content - 章节内容
 * @param constraint - 约束条件
 * @returns 是否违反
 */
function isConstraintViolated(content: string, constraint: string): boolean {
  // 简化实现:检查否定性约束
  // 例如: "不存在科技产品" -> 检查是否出现科技产品
  
  const negativePatterns = [
    /不存在(.+)/,
    /没有(.+)/,
    /禁止(.+)/,
  ];

  for (const pattern of negativePatterns) {
    const match = constraint.match(pattern);
    if (match && match[1]) {
      const forbiddenThing = match[1].trim();
      // 提取关键词
      const keywords = forbiddenThing.split(/[\s,、]+/);
      for (const keyword of keywords) {
        if (keyword.length > 1 && content.includes(keyword)) {
          return true;
        }
      }
    }
  }

  return false;
}
