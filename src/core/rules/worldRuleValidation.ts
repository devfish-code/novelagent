/**
 * 世界规则校验
 * 
 * 检测章节内容是否违反世界规则
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
 * 校验世界规则
 * 
 * 检测章节内容是否违反World_State中定义的世界规则
 * 
 * @param chapter - 待校验的章节
 * @param context - 校验上下文
 * @returns 校验结果
 * 
 * **Validates: Requirements 9.1, 9.2**
 */
export function validateWorldRules(
  chapter: Chapter,
  context: ValidationContext
): ValidationResult {
  const violations = [];
  const { worldState } = context;
  const { content } = chapter;

  // 遍历所有世界规则
  for (const rule of worldState.worldRules) {
    // 检查章节内容是否可能违反该规则
    const violation = checkRuleViolation(content, rule);
    if (violation) {
      violations.push(
        createViolation(
          'WORLD_RULE',
          'critical',
          `违反世界规则 [${rule.category}]: ${violation}`,
          undefined,
          `请确保内容符合规则: ${rule.description}`
        )
      );
    }
  }

  return violations.length > 0
    ? createFailedResult(violations)
    : createPassedResult();
}

/**
 * 检查内容是否违反特定规则
 * 
 * 这是一个简化的实现,实际应用中可能需要更复杂的NLP分析
 * 
 * @param content - 章节内容
 * @param rule - 世界规则
 * @returns 违规描述,如果没有违规则返回null
 */
function checkRuleViolation(
  content: string,
  rule: { id: string; category: string; description: string; constraints: string[] }
): string | null {
  // 检查每个约束条件
  for (const constraint of rule.constraints) {
    // 简单的关键词匹配检测
    // 实际应用中应该使用更智能的方法(如AI辅助检测)
    const keywords = extractKeywords(constraint);
    
    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        // 发现可能的违规
        return `内容中出现了与规则约束相关的描述: "${keyword}"`;
      }
    }
  }

  return null;
}

/**
 * 从约束描述中提取关键词
 * 
 * @param constraint - 约束描述
 * @returns 关键词列表
 */
function extractKeywords(constraint: string): string[] {
  // 简化实现:提取否定性描述中的关键词
  // 例如: "不能使用火系魔法" -> ["火系魔法"]
  const negativePatterns = [
    /不能(.+)/,
    /禁止(.+)/,
    /无法(.+)/,
    /不允许(.+)/,
  ];

  for (const pattern of negativePatterns) {
    const match = constraint.match(pattern);
    if (match && match[1]) {
      return [match[1].trim()];
    }
  }

  return [];
}
