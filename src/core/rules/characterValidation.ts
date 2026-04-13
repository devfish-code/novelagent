/**
 * 角色行为校验
 * 
 * 检测行为是否符合性格档案和动机
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
 * 校验角色行为
 * 
 * 检测行为是否符合角色性格档案和当前动机
 * 基于角色的personality和motivation字段
 * 
 * @param chapter - 待校验的章节
 * @param context - 校验上下文
 * @returns 校验结果
 * 
 * **Validates: Requirements 9.7, 9.8**
 */
export function validateCharacterBehavior(
  chapter: Chapter,
  context: ValidationContext
): ValidationResult {
  const violations = [];
  const { characters, chapterOutline } = context;
  const { content } = chapter;

  // 获取当前章节涉及的角色
  const involvedCharacters = chapterOutline.scenes.flatMap(
    scene => scene.characters
  );

  // 检查每个角色的行为一致性
  for (const characterId of involvedCharacters) {
    const character = characters[characterId];
    if (!character) continue;

    // 检查行为是否符合性格特质
    const personalityViolations = checkPersonalityConsistency(
      content,
      character,
      chapterOutline.title
    );
    violations.push(...personalityViolations);

    // 检查行为是否符合当前动机
    const motivationViolations = checkMotivationConsistency(
      content,
      character,
      chapterOutline.title
    );
    violations.push(...motivationViolations);
  }

  return violations.length > 0
    ? createFailedResult(violations)
    : createPassedResult();
}

/**
 * 检查行为是否符合性格特质
 * 
 * @param content - 章节内容
 * @param character - 角色信息
 * @param chapterTitle - 章节标题
 * @returns 违规列表
 */
function checkPersonalityConsistency(
  content: string,
  character: { id: string; name: string; personality: { coreTraits: string[]; weaknesses: string[] } },
  chapterTitle: string
): ReturnType<typeof createViolation>[] {
  const violations = [];

  // 检查是否有与核心性格特质相反的行为
  // 这是一个简化的实现,实际应该使用AI辅助分析
  
  // 示例:如果角色性格是"谨慎",但内容中出现"冲动"、"鲁莽"等词
  const contradictoryBehaviors = findContradictoryBehaviors(
    content,
    character.personality.coreTraits
  );

  for (const behavior of contradictoryBehaviors) {
    violations.push(
      createViolation(
        'CHARACTER_BEHAVIOR',
        'warning',
        `角色 ${character.name} 的行为 "${behavior}" 可能与其性格特质不符`,
        `章节: ${chapterTitle}`,
        `请确保行为符合角色的核心性格特质: ${character.personality.coreTraits.join(', ')}`
      )
    );
  }

  return violations;
}

/**
 * 检查行为是否符合当前动机
 * 
 * @param content - 章节内容
 * @param character - 角色信息
 * @param chapterTitle - 章节标题
 * @returns 违规列表
 */
function checkMotivationConsistency(
  content: string,
  character: { id: string; name: string; motivation: string },
  chapterTitle: string
): ReturnType<typeof createViolation>[] {
  const violations = [];

  // 检查角色的行为是否与动机一致
  // 简化实现:检查内容中是否提到了与动机相关的行为
  
  const motivationKeywords = extractMotivationKeywords(character.motivation);
  const hasMotivationRelatedBehavior = motivationKeywords.some(keyword =>
    content.includes(keyword)
  );

  // 如果角色在章节中有重要行为,但与动机无关,可能有问题
  if (isCharacterActive(content, character.name) && !hasMotivationRelatedBehavior) {
    violations.push(
      createViolation(
        'CHARACTER_BEHAVIOR',
        'warning',
        `角色 ${character.name} 的行为可能与其当前动机不符`,
        `章节: ${chapterTitle}`,
        `请确保行为与角色动机一致: ${character.motivation}`
      )
    );
  }

  return violations;
}

/**
 * 查找与性格特质相反的行为
 * 
 * @param content - 章节内容
 * @param coreTraits - 核心性格特质
 * @returns 相反行为列表
 */
function findContradictoryBehaviors(
  content: string,
  coreTraits: string[]
): string[] {
  const contradictions: Record<string, string[]> = {
    '谨慎': ['冲动', '鲁莽', '草率'],
    '勇敢': ['胆怯', '退缩', '害怕'],
    '善良': ['残忍', '冷酷', '无情'],
    '冷静': ['慌乱', '失控', '激动'],
    '诚实': ['撒谎', '欺骗', '隐瞒'],
  };

  const contradictoryBehaviors: string[] = [];

  for (const trait of coreTraits) {
    const opposites = contradictions[trait] || [];
    for (const opposite of opposites) {
      if (content.includes(opposite)) {
        contradictoryBehaviors.push(opposite);
      }
    }
  }

  return contradictoryBehaviors;
}

/**
 * 从动机描述中提取关键词
 * 
 * @param motivation - 动机描述
 * @returns 关键词列表
 */
function extractMotivationKeywords(motivation: string): string[] {
  // 简化实现:提取动词和名词
  const keywords = motivation
    .split(/[\s,。、]+/)
    .filter(word => word.length > 1);
  
  return keywords;
}

/**
 * 检查角色在内容中是否活跃
 * 
 * @param content - 章节内容
 * @param characterName - 角色名称
 * @returns 是否活跃
 */
function isCharacterActive(content: string, characterName: string): boolean {
  // 简化实现:检查角色名称出现次数
  const mentions = (content.match(new RegExp(characterName, 'g')) || []).length;
  return mentions >= 3; // 出现3次以上认为是活跃角色
}
