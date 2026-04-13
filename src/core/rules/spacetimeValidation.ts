/**
 * 时空校验
 * 
 * 基于时间线和移动速度检测角色位置合理性
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
 * 校验时空一致性
 * 
 * 检测角色是否能在该时间出现在该地点
 * 基于时间线和角色移动速度计算
 * 
 * @param chapter - 待校验的章节
 * @param context - 校验上下文
 * @returns 校验结果
 * 
 * **Validates: Requirements 9.3, 9.4**
 */
export function validateSpacetime(
  _chapter: Chapter,
  context: ValidationContext
): ValidationResult {
  const violations = [];
  const { worldState, chapterOutline } = context;
  const { timeline, characters: characterStates } = worldState;

  // 获取当前章节涉及的角色
  const involvedCharacters = chapterOutline.scenes.flatMap(
    scene => scene.characters
  );

  // 检查每个角色的位置合理性
  for (const characterId of involvedCharacters) {
    const characterState = characterStates[characterId];
    if (!characterState) continue;

    // 查找该角色在时间线上的最近位置
    const recentEvents = timeline
      .filter(event => event.involvedCharacters.includes(characterId))
      .sort((a, b) => compareTimestamp(a.timestamp, b.timestamp));

    if (recentEvents.length === 0) continue;

    const lastEvent = recentEvents[recentEvents.length - 1];
    const currentLocation = characterState.location;

    // 检查位置变化是否合理
    if (lastEvent.location !== currentLocation) {
      const violation = checkLocationTransition(
        characterId,
        lastEvent.location,
        currentLocation,
        lastEvent.timestamp,
        chapterOutline.title
      );

      if (violation) {
        violations.push(
          createViolation(
            'SPACETIME',
            'critical',
            violation,
            `章节: ${chapterOutline.title}`,
            `请检查角色 ${characterId} 的移动路径和时间是否合理`
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
 * 比较两个时间戳
 * 
 * @param a - 时间戳A
 * @param b - 时间戳B
 * @returns 比较结果 (-1: a < b, 0: a = b, 1: a > b)
 */
function compareTimestamp(a: string, b: string): number {
  // 简化实现:假设时间戳格式为 "第X天上午/下午/晚上"
  const extractDay = (ts: string): number => {
    const match = ts.match(/第(\d+)天/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const extractPeriod = (ts: string): number => {
    if (ts.includes('上午')) return 1;
    if (ts.includes('下午')) return 2;
    if (ts.includes('晚上')) return 3;
    return 0;
  };

  const dayA = extractDay(a);
  const dayB = extractDay(b);

  if (dayA !== dayB) {
    return dayA - dayB;
  }

  return extractPeriod(a) - extractPeriod(b);
}

/**
 * 检查位置转换是否合理
 * 
 * @param characterId - 角色ID
 * @param fromLocation - 起始位置
 * @param toLocation - 目标位置
 * @param fromTime - 起始时间
 * @param currentChapter - 当前章节标题
 * @returns 违规描述,如果合理则返回null
 */
function checkLocationTransition(
  characterId: string,
  fromLocation: string,
  toLocation: string,
  fromTime: string,
  currentChapter: string
): string | null {
  // 简化实现:检查是否是瞬间移动(同一天内跨越远距离)
  // 实际应用中应该查询地点之间的travelTime
  
  // 如果位置相同,没有问题
  if (fromLocation === toLocation) {
    return null;
  }

  // 检查是否有足够的时间移动
  // 这里简化为:如果在同一时间段内移动,可能有问题
  const currentTime = extractTimeFromChapter(currentChapter);
  if (currentTime && currentTime === fromTime) {
    return `角色 ${characterId} 在 ${fromTime} 从 ${fromLocation} 移动到 ${toLocation},时间可能不足`;
  }

  return null;
}

/**
 * 从章节标题中提取时间信息
 * 
 * @param chapterTitle - 章节标题
 * @returns 时间字符串,如果无法提取则返回null
 */
function extractTimeFromChapter(chapterTitle: string): string | null {
  const match = chapterTitle.match(/第(\d+)天(上午|下午|晚上)?/);
  return match ? match[0] : null;
}
