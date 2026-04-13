/**
 * 能力校验
 * 
 * 检测能力是否在范围内
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
 * 校验能力使用
 * 
 * 检测角色展示的能力是否在能力范围内
 * 基于角色的abilities字段
 * 
 * @param chapter - 待校验的章节
 * @param context - 校验上下文
 * @returns 校验结果
 * 
 * **Validates: Requirements 9.9, 9.10**
 */
export function validateAbility(
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

  // 检查每个角色的能力使用
  for (const characterId of involvedCharacters) {
    const character = characters[characterId];
    if (!character) continue;

    // 检查是否使用了超出范围的能力
    const abilityViolations = checkAbilityUsage(
      content,
      character,
      chapterOutline.title
    );
    violations.push(...abilityViolations);
  }

  return violations.length > 0
    ? createFailedResult(violations)
    : createPassedResult();
}

/**
 * 检查能力使用是否在范围内
 * 
 * @param content - 章节内容
 * @param character - 角色信息
 * @param chapterTitle - 章节标题
 * @returns 违规列表
 */
function checkAbilityUsage(
  content: string,
  character: {
    id: string;
    name: string;
    abilities: {
      current: string[];
      potential: string[];
      limits: string;
    };
  },
  chapterTitle: string
): ReturnType<typeof createViolation>[] {
  const violations = [];

  // 提取内容中提到的能力
  const usedAbilities = extractAbilitiesFromContent(content, character.name);

  // 检查每个使用的能力
  for (const ability of usedAbilities) {
    // 检查是否在当前能力列表中
    const isCurrentAbility = character.abilities.current.some(current =>
      ability.includes(current) || current.includes(ability)
    );

    // 检查是否在潜在能力列表中(可能是新觉醒的)
    const isPotentialAbility = character.abilities.potential.some(potential =>
      ability.includes(potential) || potential.includes(ability)
    );

    // 如果既不是当前能力也不是潜在能力,可能有问题
    if (!isCurrentAbility && !isPotentialAbility) {
      violations.push(
        createViolation(
          'ABILITY',
          'critical',
          `角色 ${character.name} 使用了未定义的能力: "${ability}"`,
          `章节: ${chapterTitle}`,
          `请确保能力在角色的能力范围内,或先在设定中添加该能力`
        )
      );
    }

    // 检查是否违反能力限制
    if (isCurrentAbility && violatesAbilityLimits(ability, character.abilities.limits)) {
      violations.push(
        createViolation(
          'ABILITY',
          'critical',
          `角色 ${character.name} 的能力使用超出了限制: "${ability}"`,
          `章节: ${chapterTitle}`,
          `能力限制: ${character.abilities.limits}`
        )
      );
    }
  }

  return violations;
}

/**
 * 从内容中提取角色使用的能力
 * 
 * @param content - 章节内容
 * @param characterName - 角色名称
 * @returns 能力列表
 */
function extractAbilitiesFromContent(
  content: string,
  characterName: string
): string[] {
  const abilities: string[] = [];

  // 能力相关的动词模式
  const abilityPatterns = [
    new RegExp(`${characterName}(使用|施展|释放|发动)了?(.{2,10})`, 'g'),
    new RegExp(`${characterName}的(.{2,10})(能力|技能|魔法|招式)`, 'g'),
  ];

  for (const pattern of abilityPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      // 提取能力名称(第2个捕获组)
      if (match[2]) {
        abilities.push(match[2].trim());
      }
    }
  }

  return abilities;
}

/**
 * 检查能力使用是否违反限制
 * 
 * @param ability - 使用的能力
 * @param limits - 能力限制描述
 * @returns 是否违反限制
 */
function violatesAbilityLimits(ability: string, limits: string): boolean {
  // 简化实现:检查限制描述中是否提到该能力的限制
  // 实际应该使用更智能的分析
  
  // 提取限制关键词
  const limitKeywords = extractLimitKeywords(limits);
  
  // 检查能力是否涉及这些限制
  for (const keyword of limitKeywords) {
    if (ability.includes(keyword)) {
      return true;
    }
  }

  return false;
}

/**
 * 从限制描述中提取关键词
 * 
 * @param limits - 限制描述
 * @returns 关键词列表
 */
function extractLimitKeywords(limits: string): string[] {
  // 提取限制性描述中的关键词
  const patterns = [
    /不能(.{2,10})/g,
    /无法(.{2,10})/g,
    /最多(.{2,10})/g,
    /仅限(.{2,10})/g,
  ];

  const keywords: string[] = [];

  for (const pattern of patterns) {
    const matches = limits.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        keywords.push(match[1].trim());
      }
    }
  }

  return keywords;
}
