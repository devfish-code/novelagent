/**
 * Project Routes
 * 项目管理相关的路由定义
 */

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validation.js';
import * as projectController from '../controllers/projectController.js';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * POST /api/projects/init 请求验证
 */
const initProjectSchema = z.object({
  name: z.string()
    .min(1, '项目名称不能为空')
    .max(100, '项目名称不能超过100个字符')
    .regex(/^[a-zA-Z0-9_-]+$/, '项目名称只能包含字母、数字、下划线和连字符'),
  force: z.boolean().optional().default(false),
});

/**
 * GET /api/projects/:name 参数验证
 */
const projectNameParamSchema = z.object({
  name: z.string()
    .min(1, '项目名称不能为空')
    .regex(/^[a-zA-Z0-9_-]+$/, '项目名称格式无效'),
});

/**
 * POST /api/projects/test-connection 请求验证
 */
const testConnectionSchema = z.object({
  model: z.enum(['main', 'json', 'all'], {
    errorMap: () => ({ message: 'model 必须是 main、json 或 all' }),
  }),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/projects/init
 * 初始化新项目
 */
router.post(
  '/init',
  validate(initProjectSchema, 'body'),
  projectController.initProject
);

/**
 * GET /api/projects
 * 列出所有项目
 */
router.get(
  '/',
  projectController.listProjects
);

/**
 * GET /api/projects/:name
 * 获取单个项目详情
 */
router.get(
  '/:name',
  validate(projectNameParamSchema, 'params'),
  projectController.getProject
);

/**
 * DELETE /api/projects/:name
 * 删除项目
 */
router.delete(
  '/:name',
  validate(projectNameParamSchema, 'params'),
  projectController.deleteProject
);

/**
 * POST /api/projects/test-connection
 * 测试 AI 连接
 */
router.post(
  '/test-connection',
  validate(testConnectionSchema, 'body'),
  projectController.testConnection
);

export default router;
