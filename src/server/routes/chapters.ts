/**
 * Chapter Generation Routes
 * 章节生成相关的路由定义
 */

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.js';
import * as chapterController from '../controllers/chapterController.js';

const router = Router({ mergeParams: true });

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * POST /api/projects/:name/chapters 请求验证
 */
const generateChaptersSchema = z.object({
  volume: z.number()
    .int('卷数必须是整数')
    .min(1, '卷数至少为1')
    .max(10, '卷数最多为10')
    .optional(),
  startChapter: z.number()
    .int('起始章节必须是整数')
    .min(1, '起始章节至少为1')
    .max(50, '起始章节最多为50')
    .optional(),
  endChapter: z.number()
    .int('结束章节必须是整数')
    .min(1, '结束章节至少为1')
    .max(50, '结束章节最多为50')
    .optional(),
  specificChapter: z.number()
    .int('指定章节必须是整数')
    .min(1, '指定章节至少为1')
    .max(50, '指定章节最多为50')
    .optional(),
  force: z.boolean()
    .optional(),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/projects/:name/chapters
 * 生成章节（Phase 4）
 */
router.post(
  '/',
  validate(generateChaptersSchema, 'body'),
  chapterController.generateChapters
);

/**
 * POST /api/projects/:name/chapters/pause
 * 暂停章节生成任务
 */
router.post(
  '/pause',
  chapterController.pauseChapters
);

/**
 * POST /api/projects/:name/chapters/resume
 * 恢复章节生成任务
 */
router.post(
  '/resume',
  chapterController.resumeChapters
);

export default router;
