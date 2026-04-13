/**
 * 信息逻辑校验
 * 
 * 检测角色是否使用了不该知道的信息
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
 * 校验信息逻辑
 * 
 * 检测角色是否使用了不该知道的信息
 * 基于角色的knownInfo和unknownInfo字段
 * 
 * @param chapter - 待校验的章节
 * @param context - 校验上下文
 * @returns 校验结果
 * 
 * **Validates: Requirements 9.5, 9.6**
 */
export function validateInformationLogic(
  chapter: Chapter,
  context: ValidationContext
): ValidationResult {
  const violations = [];
  const { worldState, chapterOutline } = context;
  const { content } = chapter;

  // 获取当前章节涉及的角色
  const involvedCharacters = chapterOutline.scenes.flatMap(
    scene => scene.characters
  );

  // 检查每个角色的信息使用
  for (const characterId of involvedCharacters) {
    const characterState = worldState.characters[characterId];
    if (!characterState) continue;

    // 检查角色是否使用了未知信息
    for (const unknownInfo of characterState.unknownInfo) {
      if (isInformationUsedInContent(content, characterId, unknownInfo)) {
        violations.push(
          createViolation(
            'INFORMATION_LOGIC',
            'critical',
            `角色 ${characterId} 使用了不该知道的信息: "${unknownInfo}"`,
            `章节: ${chapterOutline.title}`,
            `请确保角色只使用已知信息,或先让角色通过合理方式获得该信息`
          )
        );
      }
    }
  }

  return violations.length > 0
    ? createFailedResult(violations)
    : createPassedResult();
}

/**
 * 检查信息是否在内容中被角色使用
 * 
 * @param content - 章节内容
 * @param characterId - 角色ID
 * @param information - 信息描述
 * @returns 是否使用了该信息
 */
function isInformationUsedInContent(
  content: string,
  characterId: string,
  information: string
): boolean {
  // 简化实现:检查内容中是否同时出现角色和信息的关键词
  // 实际应用中应该使用更智能的NLP分析
  
  // 提取信息的关键词
  const infoKeywords = extractInformationKeywords(information);
  
  // 检查是否有角色相关的描述
  const characterMentions = findCharacterMentions(content, characterId);
  
  // 如果找到角色提及,检查附近是否有信息关键词
  for (const mention of characterMentions) {
    const contextWindow = getContextWindow(content, mention.index, 100);
    
    for (const keyword of infoKeywords) {
      if (contextWindow.includes(keyword)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 从信息描述中提取关键词
 * 
 * @param information - 信息描述
 * @returns 关键词列表
 */
function extractInformationKeywords(information: string): string[] {
  // 简化实现:分词并过滤停用词
  const stopWords = ['的', '了', '是', '在', '有', '和', '与', '及'];
  
  const words = information
    .split(/[\s,。、]+/)
    .filter(word => word.length > 1 && !stopWords.includes(word));
  
  return words;
}

/**
 * 查找角色在内容中的提及位置
 * 
 * @param content - 章节内容
 * @param characterId - 角色ID
 * @returns 提及位置列表
 */
function findCharacterMentions(
  content: string,
  characterId: string
): Array<{ index: number; text: string }> {
  const mentions: Array<{ index: number; text: string }> = [];
  
  // 简化实现:直接搜索角色ID
  // 实际应用中应该搜索角色名称、别名等
  let index = content.indexOf(characterId);
  while (index !== -1) {
    mentions.push({ index, text: characterId });
    index = content.indexOf(characterId, index + 1);
  }
  
  return mentions;
}

/**
 * 获取指定位置周围的上下文窗口
 * 
 * @param content - 完整内容
 * @param position - 中心位置
 * @param windowSize - 窗口大小(字符数)
 * @returns 上下文窗口内容
 */
function getContextWindow(
  content: string,
  position: number,
  windowSize: number
): string {
  const start = Math.max(0, position - windowSize);
  const end = Math.min(content.length, position + windowSize);
  return content.substring(start, end);
}
