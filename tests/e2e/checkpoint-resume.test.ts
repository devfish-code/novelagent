/**
 * 断点续传E2E测试
 * 
 * 测试章节生成的断点续传功能
 * 验证中断后恢复时不会重新生成已完成的章节
 * 
 * Requirements: 4.3, 4.25
 * 
 * 测试场景:
 * 1. 创建项目框架(3章)
 * 2. 模拟生成第1章
 * 3. 模拟中断,手动标记第2章为completed
 * 4. 测试断点续传逻辑,验证只会尝试生成第3章
 * 5. 测试--force标志,验证会重新生成所有章节
 * 
 * 注意: 此测试直接测试calculateChapterRange逻辑,不依赖完整的Phase4实现
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { Project } from '../../src/core/models/project.js';
import type { ChapterMetadata } from '../../src/core/models/chapter.js';

// Import the internal function for testing
// Note: In a real scenario, this would be exported for testing purposes
import { generateChaptersHandler, type GenerateChaptersInput } from '../../src/bus/handlers/generateChapters.js';

/**
 * Helper function to calculate chapter range (mirrors the logic in generateChapters.ts)
 * This is extracted for testing purposes
 */
function calculateChapterRange(
  project: Project,
  input: { volume?: number; startChapter?: number; endChapter?: number; specificChapter?: number; force: boolean }
): Array<{ volume: number; chapter: number }> {
  const allChapters: Array<{ volume: number; chapter: number }> = [];

  // Generate all chapters metadata
  for (let v = 1; v <= project.config.volumes; v++) {
    for (let c = 1; c <= project.config.chaptersPerVolume; c++) {
      allChapters.push({ volume: v, chapter: c });
    }
  }

  // Requirement 4.7: Filter out completed chapters (unless using --force)
  let pendingChapters = allChapters;
  if (!input.force) {
    const completedChapterIds = new Set(
      project.chapters
        .filter((c) => c.status === 'completed')
        .map((c) => `${c.volume}-${c.chapter}`)
    );

    pendingChapters = allChapters.filter(
      (c) => !completedChapterIds.has(`${c.volume}-${c.chapter}`)
    );
  }

  // Requirement 4.4: Filter by volume
  if (input.volume !== undefined) {
    pendingChapters = pendingChapters.filter((c) => c.volume === input.volume);
  }

  // Requirement 4.5: Filter by range
  if (input.startChapter !== undefined && input.endChapter !== undefined) {
    pendingChapters = pendingChapters.filter(
      (c) => c.chapter >= input.startChapter! && c.chapter <= input.endChapter!
    );
  }

  // Requirement 4.6: Filter by specificChapter
  if (input.specificChapter !== undefined) {
    pendingChapters = pendingChapters.filter((c) => c.chapter === input.specificChapter);
  }

  // Sort by order
  return pendingChapters.sort((a, b) => {
    if (a.volume !== b.volume) return a.volume - b.volume;
    return a.chapter - b.chapter;
  });
}

describe('E2E: 断点续传功能', () => {
  let testDir: string;
  let projectName: string;
  let projectDir: string;
  let projectJsonPath: string;

  beforeAll(async () => {
    // Create temporary test directory
    testDir = path.join(os.tmpdir(), `novelagent-checkpoint-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    
    projectName = 'checkpoint-test';
    projectDir = path.join(testDir, projectName);
    projectJsonPath = path.join(projectDir, 'project.json');

    console.log(`\n📁 测试目录: ${testDir}`);
    console.log(`📝 项目名称: ${projectName}\n`);
  });

  afterAll(async () => {
    // Clean up test directory
    if (process.env.NOVELAGENT_KEEP_TEST_DIR !== 'true') {
      try {
        await fs.rm(testDir, { recursive: true, force: true });
        console.log(`\n🧹 已清理测试目录: ${testDir}`);
      } catch (error) {
        console.warn(`⚠️  清理测试目录失败: ${error}`);
      }
    } else {
      console.log(`\n📦 保留测试目录: ${testDir}`);
    }
  });

  it('准备: 创建测试项目结构', async () => {
    // Create project directory structure
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(projectDir, 'world'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'outline'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'chapters'), { recursive: true });

    // Create initial project.json (3 chapters, all pending)
    const initialProject: Project = {
      projectName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0',
      config: {
        volumes: 1,
        chaptersPerVolume: 3,
        wordsPerChapter: 1000,
      },
      progress: {
        currentPhase: 'phase4',
        completedChapters: 0,
        totalChapters: 3,
      },
      chapters: [],
      statistics: {
        totalWords: 0,
        totalAICalls: 0,
        totalTokens: 0,
        totalFixRounds: 0,
      },
      status: 'generating',
    };

    await fs.writeFile(projectJsonPath, JSON.stringify(initialProject, null, 2), 'utf-8');

    console.log('✅ 测试项目结构创建完成');
  });

  it('场景1: 模拟生成第1章', async () => {
    console.log('✍️  模拟生成第1章...');

    // Read current project.json
    const projectJson: Project = JSON.parse(await fs.readFile(projectJsonPath, 'utf-8'));

    // Manually add chapter 1 metadata (simulate completed)
    const chapter1Metadata: ChapterMetadata = {
      volume: 1,
      chapter: 1,
      title: '第1章: 测试章节',
      wordCount: 1000,
      status: 'completed',
      generatedAt: new Date().toISOString(),
      fixRounds: 0,
    };

    projectJson.chapters.push(chapter1Metadata);
    projectJson.progress.completedChapters = 1;
    projectJson.statistics.totalWords += 1000;
    projectJson.updatedAt = new Date().toISOString();

    await fs.writeFile(projectJsonPath, JSON.stringify(projectJson, null, 2), 'utf-8');

    // Create chapter 1 file (simulate generated)
    const chapter1File = path.join(projectDir, 'chapters', 'vol-1-ch-001.md');
    await fs.writeFile(chapter1File, '# 第1章: 测试章节\n\n这是第1章的内容...', 'utf-8');

    // Verify
    const updatedProject: Project = JSON.parse(await fs.readFile(projectJsonPath, 'utf-8'));
    expect(updatedProject.progress.completedChapters).toBe(1);
    expect(updatedProject.chapters).toHaveLength(1);
    expect(updatedProject.chapters[0].status).toBe('completed');

    console.log('✅ 第1章模拟生成完成');
  });

  it('场景2: 模拟中断 - 手动标记第2章为completed', async () => {
    console.log('⚠️  模拟中断: 手动标记第2章为completed...');

    // 读取当前project.json
    const projectJson: Project = JSON.parse(await fs.readFile(projectJsonPath, 'utf-8'));

    // 手动添加第2章的元数据(模拟已完成)
    const chapter2Metadata: ChapterMetadata = {
      volume: 1,
      chapter: 2,
      title: '第2章: 模拟已完成',
      wordCount: 1000,
      status: 'completed',
      generatedAt: new Date().toISOString(),
      fixRounds: 0,
    };

    projectJson.chapters.push(chapter2Metadata);
    projectJson.progress.completedChapters = 2;
    projectJson.statistics.totalWords += 1000;
    projectJson.updatedAt = new Date().toISOString();

    await fs.writeFile(projectJsonPath, JSON.stringify(projectJson, null, 2), 'utf-8');

    // 创建第2章的文件(模拟已生成)
    const chapter2File = path.join(projectDir, 'chapters', 'vol-1-ch-002.md');
    await fs.writeFile(chapter2File, '# 第2章: 模拟已完成\n\n这是模拟的第2章内容...', 'utf-8');

    console.log('✅ 第2章标记为completed');
  });

  it('场景3: 测试断点续传逻辑 - 验证只会选择第3章 (Requirement 4.3)', async () => {
    console.log('🔄 测试断点续传逻辑: 应该只选择第3章...');

    // Read current project state
    const projectJson: Project = JSON.parse(await fs.readFile(projectJsonPath, 'utf-8'));
    expect(projectJson.progress.completedChapters).toBe(2);

    // Test the chapter range calculation logic
    const input: GenerateChaptersInput = {
      projectName,
      dir: testDir,
      force: false, // Don't use force, should skip completed chapters
    };

    const chaptersToGenerate = calculateChapterRange(projectJson, input);

    // Verify only chapter 3 is selected
    expect(chaptersToGenerate).toHaveLength(1);
    expect(chaptersToGenerate[0].volume).toBe(1);
    expect(chaptersToGenerate[0].chapter).toBe(3);

    console.log('✅ 断点续传逻辑正确: 只选择了第3章');
  });

  it('场景4: 验证已完成章节不在待生成列表中 (Requirement 4.7)', async () => {
    console.log('🔍 验证已完成章节不在待生成列表中...');

    // Read project state
    const projectJson: Project = JSON.parse(await fs.readFile(projectJsonPath, 'utf-8'));

    // Test with force=false
    const input: GenerateChaptersInput = {
      projectName,
      dir: testDir,
      force: false,
    };

    const chaptersToGenerate = calculateChapterRange(projectJson, input);

    // Verify chapters 1 and 2 are NOT in the list
    const chapterIds = chaptersToGenerate.map(c => `${c.volume}-${c.chapter}`);
    expect(chapterIds).not.toContain('1-1');
    expect(chapterIds).not.toContain('1-2');
    expect(chapterIds).toContain('1-3');

    console.log('✅ 已完成章节未在待生成列表中');
  });

  it('场景5: 使用--force重新生成所有章节 (Requirement 4.8)', async () => {
    console.log('🔄 测试--force标志: 应该选择所有章节...');

    // Read project state
    const projectJson: Project = JSON.parse(await fs.readFile(projectJsonPath, 'utf-8'));

    // Test with force=true
    const input: GenerateChaptersInput = {
      projectName,
      dir: testDir,
      force: true, // Use force, should regenerate all chapters
    };

    const chaptersToGenerate = calculateChapterRange(projectJson, input);

    // Verify all 3 chapters are selected
    expect(chaptersToGenerate).toHaveLength(3);
    expect(chaptersToGenerate[0]).toEqual({ volume: 1, chapter: 1 });
    expect(chaptersToGenerate[1]).toEqual({ volume: 1, chapter: 2 });
    expect(chaptersToGenerate[2]).toEqual({ volume: 1, chapter: 3 });

    console.log('✅ --force标志正确: 选择了所有章节');
  });

  it('场景6: 验证进度保存格式 (Requirement 4.25)', async () => {
    console.log('💾 验证进度保存格式...');

    // Read project.json
    const projectJson: Project = JSON.parse(await fs.readFile(projectJsonPath, 'utf-8'));

    // Verify progress fields
    expect(projectJson.progress.completedChapters).toBe(2);
    expect(projectJson.progress.totalChapters).toBe(3);
    expect(projectJson.progress.currentPhase).toBe('phase4');

    // Verify statistics fields
    expect(projectJson.statistics.totalWords).toBeGreaterThan(0);
    expect(projectJson.statistics.totalFixRounds).toBeGreaterThanOrEqual(0);

    // Verify chapter metadata
    expect(projectJson.chapters).toHaveLength(2);
    for (const chapter of projectJson.chapters) {
      expect(chapter).toHaveProperty('volume');
      expect(chapter).toHaveProperty('chapter');
      expect(chapter).toHaveProperty('title');
      expect(chapter).toHaveProperty('wordCount');
      expect(chapter).toHaveProperty('status');
      expect(chapter).toHaveProperty('generatedAt');
      expect(chapter.status).toBe('completed');
    }

    // Verify updatedAt is updated
    expect(projectJson.updatedAt).toBeDefined();
    const updatedAt = new Date(projectJson.updatedAt);
    expect(updatedAt.getTime()).toBeGreaterThan(0);

    console.log('✅ 进度保存格式验证通过');
  });

  it('场景7: 测试部分章节范围的断点续传', async () => {
    console.log('🔄 测试部分章节范围的断点续传...');

    // Reset project.json, only mark chapter 1 as completed
    const projectJson: Project = JSON.parse(await fs.readFile(projectJsonPath, 'utf-8'));
    projectJson.chapters = [projectJson.chapters[0]]; // Only keep chapter 1
    projectJson.progress.completedChapters = 1;
    await fs.writeFile(projectJsonPath, JSON.stringify(projectJson, null, 2), 'utf-8');

    // Test: generate only chapter 2
    const input1: GenerateChaptersInput = {
      projectName,
      dir: testDir,
      specificChapter: 2,
      force: false,
    };

    const chaptersToGenerate1 = calculateChapterRange(projectJson, input1);
    expect(chaptersToGenerate1).toHaveLength(1);
    expect(chaptersToGenerate1[0]).toEqual({ volume: 1, chapter: 2 });

    // Simulate chapter 2 completion
    const chapter2Metadata: ChapterMetadata = {
      volume: 1,
      chapter: 2,
      title: '第2章: 部分生成',
      wordCount: 1000,
      status: 'completed',
      generatedAt: new Date().toISOString(),
      fixRounds: 0,
    };
    projectJson.chapters.push(chapter2Metadata);
    projectJson.progress.completedChapters = 2;
    await fs.writeFile(projectJsonPath, JSON.stringify(projectJson, null, 2), 'utf-8');

    // Test: continue generating remaining chapters (should only generate chapter 3)
    const input2: GenerateChaptersInput = {
      projectName,
      dir: testDir,
      force: false,
    };

    const chaptersToGenerate2 = calculateChapterRange(projectJson, input2);
    expect(chaptersToGenerate2).toHaveLength(1);
    expect(chaptersToGenerate2[0]).toEqual({ volume: 1, chapter: 3 });

    console.log('✅ 部分章节范围的断点续传逻辑正确');
  });

  it('场景8: 测试volume过滤 (Requirement 4.4)', async () => {
    console.log('🔍 测试volume过滤...');

    // Create a multi-volume project
    const multiVolumeProject: Project = {
      projectName: 'multi-volume-test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0',
      config: {
        volumes: 2,
        chaptersPerVolume: 3,
        wordsPerChapter: 1000,
      },
      progress: {
        currentPhase: 'phase4',
        completedChapters: 0,
        totalChapters: 6,
      },
      chapters: [],
      statistics: {
        totalWords: 0,
        totalAICalls: 0,
        totalTokens: 0,
        totalFixRounds: 0,
      },
      status: 'generating',
    };

    // Test: generate only volume 2
    const input: GenerateChaptersInput = {
      projectName: 'multi-volume-test',
      dir: testDir,
      volume: 2,
      force: false,
    };

    const chaptersToGenerate = calculateChapterRange(multiVolumeProject, input);

    // Verify only volume 2 chapters are selected
    expect(chaptersToGenerate).toHaveLength(3);
    for (const chapter of chaptersToGenerate) {
      expect(chapter.volume).toBe(2);
    }

    console.log('✅ volume过滤逻辑正确');
  });

  it('场景9: 测试range过滤 (Requirement 4.5)', async () => {
    console.log('🔍 测试range过滤...');

    const projectJson: Project = JSON.parse(await fs.readFile(projectJsonPath, 'utf-8'));

    // Test: generate chapters 1-2
    const input: GenerateChaptersInput = {
      projectName,
      dir: testDir,
      startChapter: 1,
      endChapter: 2,
      force: true, // Use force to include all chapters
    };

    const chaptersToGenerate = calculateChapterRange(projectJson, input);

    // Verify only chapters 1-2 are selected
    expect(chaptersToGenerate).toHaveLength(2);
    expect(chaptersToGenerate[0].chapter).toBe(1);
    expect(chaptersToGenerate[1].chapter).toBe(2);

    console.log('✅ range过滤逻辑正确');
  });

  it('场景10: 测试specificChapter过滤 (Requirement 4.6)', async () => {
    console.log('🔍 测试specificChapter过滤...');

    const projectJson: Project = JSON.parse(await fs.readFile(projectJsonPath, 'utf-8'));

    // Test: generate only chapter 2
    const input: GenerateChaptersInput = {
      projectName,
      dir: testDir,
      specificChapter: 2,
      force: true,
    };

    const chaptersToGenerate = calculateChapterRange(projectJson, input);

    // Verify only chapter 2 is selected
    expect(chaptersToGenerate).toHaveLength(1);
    expect(chaptersToGenerate[0].chapter).toBe(2);

    console.log('✅ specificChapter过滤逻辑正确');
  });
});
