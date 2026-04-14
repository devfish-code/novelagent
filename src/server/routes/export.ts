/**
 * Export Routes
 * 导出相关的路由定义
 */

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.js';
import * as exportController from '../controllers/exportController.js';

const router = Router({ mergeParams: true });

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * POST /api/projects/:name/export 请求验证
 */
const exportProjectSchema = z.object({
  format: z.enum(['markdown', 'json'], {
    errorMap: () => ({ message: '格式必须是 markdown 或 json' }),
  }),
  files: z.array(
    z.enum(['novel', 'world', 'characters', 'outline', 'timeline', 'report'], {
      errorMap: () => ({ message: '文件类型无效' }),
    })
  ).min(1, '至少需要选择一个文件类型'),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/projects/:name/export
 * 导出项目文件
 */
router.post(
  '/',
  validate(exportProjectSchema, 'body'),
  exportController.exportProject
);

/**
 * GET /api/projects/:name/exports/:filename
 * 下载导出的文件
 */
router.get(
  '/:filename',
  exportController.downloadExport
);

export default router;
