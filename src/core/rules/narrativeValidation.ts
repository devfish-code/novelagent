/**
 * 叙事逻辑校验
 * 
 * 检测大纲功能完成度和因果链清晰度
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
 * 校验叙事逻辑
 * 
 * 检测大纲功能是否完成且因果链是否清晰
 * 
 * @param chapter - 待校验的章节
 * @param context - 校验上下文
 * @returns 校验结果
 * 
 * **Validates: Requirements 9.17, 9.18**
 */
export function validateNarrativeLogic(
  chapter: Chapter,
  context: ValidationContext
): ValidationResult {
  const violations = [];
  const { chapterOutline } = context;
  const { content } = chapter;

  // 检查大纲功能是否完成
  const functionViolations = checkOutlineFunctionCompletion(
    content,
    chapterOutline
  );
  violations.push(...functionViolations);

  // 检查场景是否都有体现
  const sceneViolations = checkSceneCompletion(content, chapterOutline);
  violations.push(...sceneViolations);

  // 检查因果链是否清晰
  const causalViolations = checkCausalChain(content, chapterOutline);
  violations.push(...causalViolations);

  return violations.length > 0
    ? createFailedResult(violations)
    : createPassedResult();
}

/**
 * 检查大纲功能是否完成
 * 
 * @param content - 章节内容
 * @param chapterOutline - 章节大纲
 * @returns 违规列表
 */
function checkOutlineFunctionCompletion(
  content: string,
  chapterOutline: { title: string; function: string }
): ReturnType<typeof createViolation>[] {
  const violations = [];

  // 提取功能关键词
  const functionKeywords = extractFunctionKeywords(chapterOutline.function);

  // 检查内容是否体现了这些功能
  const matchedKeywords = functionKeywords.filter(keyword =>
    content.includes(keyword)
  );

  // 如果匹配的关键词少于一半,可能功能未完成
  if (matchedKeywords.length < Math.ceil(functionKeywords.length / 2)) {
    violations.push(
      createViolation(
        'NARRATIVE_LOGIC',
        'critical',
        `章节未完成大纲规定的功能: "${chapterOutline.function}"`,
        `章节: ${chapterOutline.title}`,
        `请确保章节内容体现了大纲规定的功能`
      )
    );
  }

  return violations;
}

/**
 * 检查场景是否都有体现
 * 
 * @param content - 章节内容
 * @param chapterOutline - 章节大纲
 * @returns 违规列表
 */
function checkSceneCompletion(
  content: string,
  chapterOutline: {
    title: string;
    scenes: Array<{
      location: string;
      characters: string[];
      events: string;
    }>;
  }
): ReturnType<typeof createViolation>[] {
  const violations = [];

  // 检查每个场景
  for (let i = 0; i < chapterOutline.scenes.length; i++) {
    const scene = chapterOutline.scenes[i];

    // 检查场景地点是否提及
    if (!content.includes(scene.location)) {
      violations.push(
        createViolation(
          'NARRATIVE_LOGIC',
          'warning',
          `场景 ${i + 1} 的地点 "${scene.location}" 未在章节中体现`,
          `章节: ${chapterOutline.title}`,
          `请在章节中添加该场景的描述`
        )
      );
    }

    // 检查场景事件是否体现
    const eventKeywords = extractEventKeywords(scene.events);
    const hasEvent = eventKeywords.some(keyword => content.includes(keyword));

    if (!hasEvent) {
      violations.push(
        createViolation(
          'NARRATIVE_LOGIC',
          'critical',
          `场景 ${i + 1} 的事件 "${scene.events}" 未在章节中体现`,
          `章节: ${chapterOutline.title}`,
          `请在章节中添加该场景的事件描述`
        )
      );
    }
  }

  return violations;
}

/**
 * 检查因果链是否清晰
 * 
 * @param content - 章节内容
 * @param chapterOutline - 章节大纲
 * @returns 违规列表
 */
function checkCausalChain(
  content: string,
  chapterOutline: { title: string }
): ReturnType<typeof createViolation>[] {
  const violations = [];

  // 检查是否有因果关系词
  const causalWords = [
    '因为',
    '所以',
    '因此',
    '于是',
    '导致',
    '引起',
    '造成',
    '结果',
  ];

  const hasCausalWords = causalWords.some(word => content.includes(word));

  // 如果章节较长但缺少因果词,可能逻辑不清晰
  if (content.length > 1000 && !hasCausalWords) {
    violations.push(
      createViolation(
        'NARRATIVE_LOGIC',
        'warning',
        `章节缺少明确的因果关系词,逻辑链可能不够清晰`,
        `章节: ${chapterOutline.title}`,
        `建议添加因果关系词(因为、所以、因此等)使逻辑更清晰`
      )
    );
  }

  return violations;
}

/**
 * 从功能描述中提取关键词
 * 
 * @param functionDescription - 功能描述
 * @returns 关键词列表
 */
function extractFunctionKeywords(functionDescription: string): string[] {
  // 简化实现:分词并过滤停用词
  const stopWords = ['的', '了', '是', '在', '有', '和', '与', '及'];

  const words = functionDescription
    .split(/[\s,。、]+/)
    .filter(word => word.length > 1 && !stopWords.includes(word));

  return words;
}

/**
 * 从事件描述中提取关键词
 * 
 * @param events - 事件描述
 * @returns 关键词列表
 */
function extractEventKeywords(events: string): string[] {
  // 简化实现:分词并过滤停用词
  const stopWords = ['的', '了', '是', '在', '有', '和', '与', '及'];

  const words = events
    .split(/[\s,。、]+/)
    .filter(word => word.length > 1 && !stopWords.includes(word));

  return words;
}
