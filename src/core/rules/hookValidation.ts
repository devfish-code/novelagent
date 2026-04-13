/**
 * 伏笔校验
 * 
 * 检测伏笔埋设和回收
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
 * 校验伏笔
 * 
 * 检测计划埋设或回收的伏笔是否完成
 * 基于章大纲的hooksToPlant和hooksToResolve
 * 
 * @param chapter - 待校验的章节
 * @param context - 校验上下文
 * @returns 校验结果
 * 
 * **Validates: Requirements 9.13, 9.14**
 */
export function validateHooks(
  chapter: Chapter,
  context: ValidationContext
): ValidationResult {
  const violations = [];
  const { worldState, chapterOutline } = context;
  const { content } = chapter;
  const { hooks } = worldState;

  // 检查需要埋设的伏笔
  for (const hookId of chapterOutline.hooksToPlant) {
    const hook = hooks[hookId];
    if (!hook) {
      violations.push(
        createViolation(
          'HOOK',
          'warning',
          `计划埋设的伏笔 ${hookId} 未在世界状态中定义`,
          `章节: ${chapterOutline.title}`,
          `请在世界状态中添加该伏笔的定义`
        )
      );
      continue;
    }

    // 检查伏笔是否在内容中埋设
    if (!isHookPlantedInContent(content, hook.description)) {
      violations.push(
        createViolation(
          'HOOK',
          'critical',
          `计划埋设的伏笔 "${hook.description}" 未在章节中体现`,
          `章节: ${chapterOutline.title}`,
          `请在章节中添加与伏笔相关的描述或暗示`
        )
      );
    }
  }

  // 检查需要回收的伏笔
  for (const hookId of chapterOutline.hooksToResolve) {
    const hook = hooks[hookId];
    if (!hook) {
      violations.push(
        createViolation(
          'HOOK',
          'warning',
          `计划回收的伏笔 ${hookId} 未在世界状态中定义`,
          `章节: ${chapterOutline.title}`,
          `请在世界状态中添加该伏笔的定义`
        )
      );
      continue;
    }

    // 检查伏笔是否在内容中回收
    if (!isHookResolvedInContent(content, hook.description)) {
      violations.push(
        createViolation(
          'HOOK',
          'critical',
          `计划回收的伏笔 "${hook.description}" 未在章节中揭示或解决`,
          `章节: ${chapterOutline.title}`,
          `请在章节中明确揭示或解决该伏笔`
        )
      );
    }
  }

  return violations.length > 0
    ? createFailedResult(violations)
    : createPassedResult();
}

/**
 * 检查伏笔是否在内容中埋设
 * 
 * @param content - 章节内容
 * @param hookDescription - 伏笔描述
 * @returns 是否埋设
 */
function isHookPlantedInContent(
  content: string,
  hookDescription: string
): boolean {
  // 简化实现:检查内容中是否包含伏笔的关键词
  // 实际应该使用更智能的语义分析
  
  const keywords = extractHookKeywords(hookDescription);
  
  // 至少包含一半的关键词才认为埋设了伏笔
  const matchedKeywords = keywords.filter(keyword =>
    content.includes(keyword)
  );
  
  return matchedKeywords.length >= Math.ceil(keywords.length / 2);
}

/**
 * 检查伏笔是否在内容中回收
 * 
 * @param content - 章节内容
 * @param hookDescription - 伏笔描述
 * @returns 是否回收
 */
function isHookResolvedInContent(
  content: string,
  hookDescription: string
): boolean {
  // 简化实现:检查内容中是否包含伏笔的关键词和解决性词汇
  
  const keywords = extractHookKeywords(hookDescription);
  const resolutionWords = [
    '原来',
    '真相',
    '揭示',
    '发现',
    '明白',
    '理解',
    '解决',
    '答案',
  ];
  
  // 需要同时包含伏笔关键词和解决性词汇
  const hasKeywords = keywords.some(keyword => content.includes(keyword));
  const hasResolution = resolutionWords.some(word => content.includes(word));
  
  return hasKeywords && hasResolution;
}

/**
 * 从伏笔描述中提取关键词
 * 
 * @param hookDescription - 伏笔描述
 * @returns 关键词列表
 */
function extractHookKeywords(hookDescription: string): string[] {
  // 简化实现:分词并过滤停用词
  const stopWords = ['的', '了', '是', '在', '有', '和', '与', '及', '将', '会'];
  
  const words = hookDescription
    .split(/[\s,。、]+/)
    .filter(word => word.length > 1 && !stopWords.includes(word));
  
  return words;
}
