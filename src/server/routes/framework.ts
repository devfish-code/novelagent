/**
 * Framework Generation Routes
 * 框架生成相关的路由定义
 */

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.js';
import * as frameworkController from '../controllers/frameworkController.js';

const router = Router({ mergeParams: true });

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * POST /api/projects/:name/framework 请求验证
 */
const generateFrameworkSchema = z.object({
  creativeDescription: z.string()
    .min(10, '创意描述至少需要10个字符')
    .max(5000, '创意描述不能超过5000个字符'),
  volumes: z.number()
    .int('卷数必须是整数')
    .min(1, '卷数至少为1')
    .max(10, '卷数最多为10')
    .optional(),
  chaptersPerVolume: z.number()
    .int('每卷章节数必须是整数')
    .min(1, '每卷章节数至少为1')
    .max(50, '每卷章节数最多为50')
    .optional(),
  wordsPerChapter: z.number()
    .int('每章字数必须是整数')
    .min(500, '每章字数至少为500')
    .max(10000, '每章字数最多为10000')
    .optional(),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/projects/:name/framework
 * 生成小说框架（Phase 1-3）
 */
router.post(
  '/',
  validate(generateFrameworkSchema, 'body'),
  frameworkController.generateFramework
);

export default router;
