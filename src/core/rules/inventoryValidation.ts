/**
 * 物品状态校验
 * 
 * 检测物品持有状态
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
 * 校验物品状态
 * 
 * 检测角色使用的物品是否确实持有
 * 基于角色的inventory字段
 * 
 * @param chapter - 待校验的章节
 * @param context - 校验上下文
 * @returns 校验结果
 * 
 * **Validates: Requirements 9.11, 9.12**
 */
export function validateInventory(
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

  // 检查每个角色的物品使用
  for (const characterId of involvedCharacters) {
    const characterState = worldState.characters[characterId];
    if (!characterState) continue;

    // 检查物品使用是否合理
    const inventoryViolations = checkInventoryUsage(
      content,
      characterId,
      characterState.inventory,
      chapterOutline.title
    );
    violations.push(...inventoryViolations);
  }

  return violations.length > 0
    ? createFailedResult(violations)
    : createPassedResult();
}

/**
 * 检查物品使用是否合理
 * 
 * @param content - 章节内容
 * @param characterId - 角色ID
 * @param inventory - 角色持有的物品列表
 * @param chapterTitle - 章节标题
 * @returns 违规列表
 */
function checkInventoryUsage(
  content: string,
  characterId: string,
  inventory: string[],
  chapterTitle: string
): ReturnType<typeof createViolation>[] {
  const violations = [];

  // 提取内容中角色使用的物品
  const usedItems = extractItemsFromContent(content, characterId);

  // 检查每个使用的物品
  for (const item of usedItems) {
    // 检查是否在物品清单中
    const hasItem = inventory.some(invItem =>
      item.includes(invItem) || invItem.includes(item)
    );

    if (!hasItem) {
      violations.push(
        createViolation(
          'INVENTORY',
          'critical',
          `角色 ${characterId} 使用了未持有的物品: "${item}"`,
          `章节: ${chapterTitle}`,
          `请确保角色先获得该物品,或从物品清单中移除该物品的使用`
        )
      );
    }
  }

  return violations;
}

/**
 * 从内容中提取角色使用的物品
 * 
 * @param content - 章节内容
 * @param characterId - 角色ID
 * @returns 物品列表
 */
function extractItemsFromContent(
  content: string,
  characterId: string
): string[] {
  const items: string[] = [];

  // 物品使用相关的动词模式
  const itemPatterns = [
    new RegExp(`${characterId}(拿出|取出|使用|掏出)了?(.{2,10})`, 'g'),
    new RegExp(`${characterId}(手持|握着|拿着)(.{2,10})`, 'g'),
    new RegExp(`${characterId}的(.{2,10})(在手中|在身上)`, 'g'),
  ];

  for (const pattern of itemPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      // 提取物品名称(第2个捕获组)
      if (match[2]) {
        const item = match[2].trim();
        // 过滤掉一些非物品的词
        if (!isNonItem(item)) {
          items.push(item);
        }
      }
    }
  }

  return items;
}

/**
 * 判断是否为非物品词汇
 * 
 * @param word - 词汇
 * @returns 是否为非物品
 */
function isNonItem(word: string): boolean {
  // 过滤掉一些常见的非物品词汇
  const nonItems = [
    '决心',
    '勇气',
    '信心',
    '希望',
    '力量',
    '速度',
    '技巧',
    '经验',
  ];

  return nonItems.some(nonItem => word.includes(nonItem));
}
