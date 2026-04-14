/**
 * Property Test: Project List Response Completeness
 * **Validates: Requirements 2.6**
 * 
 * 验证项目列表响应包含所有必需字段
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import type { ProjectSummary } from '../../../src/server/types/api.js';

describe('Property Test: Project List Response Completeness', () => {
  it('应该验证所有项目包含必需字段', () => {
    // 定义 ProjectSummary 生成器
    // 使用 fc.tuple 和 chain 确保 completedChapters <= totalChapters
    const projectSummaryArbitrary = fc
      .tuple(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.constantFrom('idle', 'generating', 'completed', 'failed'),
        fc.constantFrom(1, 2, 3, 4, 5),
        fc.integer({ min: 0, max: 100 }),
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.date().map(d => d.toISOString()),
        fc.date().map(d => d.toISOString()),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 500 })
      )
      .chain(([name, status, phase, percentage, currentTask, createdAt, updatedAt, volumes, chaptersPerVolume, totalChapters]) =>
        fc.integer({ min: 0, max: totalChapters }).map(completedChapters => ({
          name,
          status,
          progress: {
            phase,
            percentage,
            currentTask,
          },
          metadata: {
            createdAt,
            updatedAt,
            volumes,
            chaptersPerVolume,
            totalChapters,
            completedChapters,
          },
        }))
      );

    // 生成项目列表
    const projectListArbitrary = fc.array(projectSummaryArbitrary, { minLength: 0, maxLength: 20 });

    // 属性测试：验证所有项目都包含必需字段
    fc.assert(
      fc.property(projectListArbitrary, (projects) => {
        return projects.every(project => {
          // 验证顶层字段存在
          if (typeof project.name !== 'string' || project.name.length === 0) {
            return false;
          }

          // 验证 status 是有效的枚举值
          const validStatuses = ['idle', 'generating', 'completed', 'failed'];
          if (!validStatuses.includes(project.status)) {
            return false;
          }

          // 验证 progress 对象存在
          if (!project.progress || typeof project.progress !== 'object') {
            return false;
          }

          // 验证 progress.phase 是 1-5 之间的整数
          const validPhases = [1, 2, 3, 4, 5];
          if (!validPhases.includes(project.progress.phase)) {
            return false;
          }

          // 验证 progress.percentage 是 0-100 之间的数字
          if (
            typeof project.progress.percentage !== 'number' ||
            project.progress.percentage < 0 ||
            project.progress.percentage > 100
          ) {
            return false;
          }

          // 验证 progress.currentTask 是非空字符串
          if (typeof project.progress.currentTask !== 'string' || project.progress.currentTask.length === 0) {
            return false;
          }

          // 验证 metadata 对象存在
          if (!project.metadata || typeof project.metadata !== 'object') {
            return false;
          }

          // 验证时间戳是有效的 ISO 8601 格式
          const isValidISODate = (dateStr: string): boolean => {
            const date = new Date(dateStr);
            return !isNaN(date.getTime()) && date.toISOString() === dateStr;
          };

          if (!isValidISODate(project.metadata.createdAt)) {
            return false;
          }

          if (!isValidISODate(project.metadata.updatedAt)) {
            return false;
          }

          // 验证数字字段是非负整数
          if (
            typeof project.metadata.volumes !== 'number' ||
            project.metadata.volumes < 0 ||
            !Number.isInteger(project.metadata.volumes)
          ) {
            return false;
          }

          if (
            typeof project.metadata.chaptersPerVolume !== 'number' ||
            project.metadata.chaptersPerVolume < 0 ||
            !Number.isInteger(project.metadata.chaptersPerVolume)
          ) {
            return false;
          }

          if (
            typeof project.metadata.totalChapters !== 'number' ||
            project.metadata.totalChapters < 0 ||
            !Number.isInteger(project.metadata.totalChapters)
          ) {
            return false;
          }

          if (
            typeof project.metadata.completedChapters !== 'number' ||
            project.metadata.completedChapters < 0 ||
            !Number.isInteger(project.metadata.completedChapters)
          ) {
            return false;
          }

          // 验证 completedChapters <= totalChapters
          if (project.metadata.completedChapters > project.metadata.totalChapters) {
            return false;
          }

          // 所有验证通过
          return true;
        });
      })
    );
  });
});
