/**
 * 配置加载器测试
 * 
 * **Validates: Requirements 14.1-14.8**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../src/config/loader';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('loadConfig', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    // 创建临时目录
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'novelagent-test-'));
    configPath = path.join(tempDir, 'config.yaml');
  });

  afterEach(() => {
    // 清理临时目录
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('YAML解析', () => {
    it('应该成功解析有效的YAML配置文件', () => {
      const yamlContent = `
ai:
  mainModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key-123
    model: gpt-4
    temperature: 0.7
    maxTokens: 4000
  jsonModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key-456
    model: gpt-4
    temperature: 0.3
    maxTokens: 2000
generation:
  volumes: 3
  chaptersPerVolume: 10
  wordsPerChapter: 3000
  maxFixRounds: 3
logging:
  logLevel: info
  logDir: logs
summary:
  summaryLengthRatio: 0.15
`;
      fs.writeFileSync(configPath, yamlContent, 'utf-8');

      const config = loadConfig(configPath);

      expect(config.ai.mainModel.apiKey).toBe('test-key-123');
      expect(config.ai.jsonModel.apiKey).toBe('test-key-456');
      expect(config.generation.volumes).toBe(3);
      expect(config.logging.logLevel).toBe('info');
    });

    it('应该在YAML格式无效时抛出错误', () => {
      const invalidYaml = `
ai:
  mainModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key
    model: gpt-4
    temperature: 0.7
    maxTokens: 4000
  jsonModel: [invalid yaml structure
`;
      fs.writeFileSync(configPath, invalidYaml, 'utf-8');

      expect(() => loadConfig(configPath)).toThrow('Failed to parse YAML');
    });

    it('应该处理空配置文件并使用默认值', () => {
      fs.writeFileSync(configPath, '', 'utf-8');

      const config = loadConfig(configPath);

      expect(config.generation.volumes).toBe(3);
      expect(config.generation.chaptersPerVolume).toBe(10);
      expect(config.logging.logLevel).toBe('info');
    });
  });

  describe('环境变量替换', () => {
    it('应该替换${VAR_NAME}格式的环境变量', () => {
      process.env.TEST_API_KEY = 'secret-key-from-env';
      process.env.TEST_BASE_URL = 'https://custom-api.com/v1';

      const yamlContent = `
ai:
  mainModel:
    provider: openai-compatible
    baseURL: \${TEST_BASE_URL}
    apiKey: \${TEST_API_KEY}
    model: gpt-4
    temperature: 0.7
    maxTokens: 4000
  jsonModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key
    model: gpt-4
    temperature: 0.3
    maxTokens: 2000
generation:
  volumes: 3
  chaptersPerVolume: 10
  wordsPerChapter: 3000
  maxFixRounds: 3
logging:
  logLevel: info
  logDir: logs
summary:
  summaryLengthRatio: 0.15
`;
      fs.writeFileSync(configPath, yamlContent, 'utf-8');

      const config = loadConfig(configPath);

      expect(config.ai.mainModel.apiKey).toBe('secret-key-from-env');
      expect(config.ai.mainModel.baseURL).toBe('https://custom-api.com/v1');

      delete process.env.TEST_API_KEY;
      delete process.env.TEST_BASE_URL;
    });

    it('应该在环境变量未定义时保留占位符并显示警告', () => {
      const yamlContent = `
ai:
  mainModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: \${UNDEFINED_VAR}
    model: gpt-4
    temperature: 0.7
    maxTokens: 4000
  jsonModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key
    model: gpt-4
    temperature: 0.3
    maxTokens: 2000
generation:
  volumes: 3
  chaptersPerVolume: 10
  wordsPerChapter: 3000
  maxFixRounds: 3
logging:
  logLevel: info
  logDir: logs
summary:
  summaryLengthRatio: 0.15
`;
      fs.writeFileSync(configPath, yamlContent, 'utf-8');

      const config = loadConfig(configPath);

      // 占位符被保留
      expect(config.ai.mainModel.apiKey).toBe('${UNDEFINED_VAR}');
    });

    it('应该支持多个环境变量替换', () => {
      process.env.MAIN_API_KEY = 'main-key';
      process.env.JSON_API_KEY = 'json-key';
      process.env.LOG_LEVEL = 'debug';

      const yamlContent = `
ai:
  mainModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: \${MAIN_API_KEY}
    model: gpt-4
    temperature: 0.7
    maxTokens: 4000
  jsonModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: \${JSON_API_KEY}
    model: gpt-4
    temperature: 0.3
    maxTokens: 2000
generation:
  volumes: 3
  chaptersPerVolume: 10
  wordsPerChapter: 3000
  maxFixRounds: 3
logging:
  logLevel: \${LOG_LEVEL}
  logDir: logs
summary:
  summaryLengthRatio: 0.15
`;
      fs.writeFileSync(configPath, yamlContent, 'utf-8');

      const config = loadConfig(configPath);

      expect(config.ai.mainModel.apiKey).toBe('main-key');
      expect(config.ai.jsonModel.apiKey).toBe('json-key');
      expect(config.logging.logLevel).toBe('debug');

      delete process.env.MAIN_API_KEY;
      delete process.env.JSON_API_KEY;
      delete process.env.LOG_LEVEL;
    });
  });

  describe('配置验证', () => {
    it('应该在必需字段缺失时使用默认值', () => {
      const partialConfig = `
ai:
  mainModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key
    model: gpt-4
    temperature: 0.7
    maxTokens: 4000
  jsonModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key
    model: gpt-4
    temperature: 0.3
    maxTokens: 2000
`;
      fs.writeFileSync(configPath, partialConfig, 'utf-8');

      const config = loadConfig(configPath);

      // 应该使用默认值
      expect(config.generation.volumes).toBe(3);
      expect(config.logging.logLevel).toBe('info');
      expect(config.summary.summaryLengthRatio).toBe(0.15);
    });

    it('应该在字段类型错误时抛出验证错误', () => {
      const invalidConfig = `
ai:
  mainModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key
    model: gpt-4
    temperature: 0.7
    maxTokens: 4000
  jsonModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key
    model: gpt-4
    temperature: 0.3
    maxTokens: 2000
generation:
  volumes: "not-a-number"
  chaptersPerVolume: 10
  wordsPerChapter: 3000
  maxFixRounds: 3
logging:
  logLevel: info
  logDir: logs
summary:
  summaryLengthRatio: 0.15
`;
      fs.writeFileSync(configPath, invalidConfig, 'utf-8');

      expect(() => loadConfig(configPath)).toThrow('Config validation failed');
    });

    it('应该验证logLevel枚举值', () => {
      const invalidLogLevel = `
ai:
  mainModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key
    model: gpt-4
    temperature: 0.7
    maxTokens: 4000
  jsonModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key
    model: gpt-4
    temperature: 0.3
    maxTokens: 2000
generation:
  volumes: 3
  chaptersPerVolume: 10
  wordsPerChapter: 3000
  maxFixRounds: 3
logging:
  logLevel: invalid-level
  logDir: logs
summary:
  summaryLengthRatio: 0.15
`;
      fs.writeFileSync(configPath, invalidLogLevel, 'utf-8');

      expect(() => loadConfig(configPath)).toThrow('Config validation failed');
    });

    it('应该验证provider字段为openai-compatible', () => {
      const invalidProvider = `
ai:
  mainModel:
    provider: invalid-provider
    baseURL: https://api.openai.com/v1
    apiKey: test-key
    model: gpt-4
    temperature: 0.7
    maxTokens: 4000
  jsonModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key
    model: gpt-4
    temperature: 0.3
    maxTokens: 2000
generation:
  volumes: 3
  chaptersPerVolume: 10
  wordsPerChapter: 3000
  maxFixRounds: 3
logging:
  logLevel: info
  logDir: logs
summary:
  summaryLengthRatio: 0.15
`;
      fs.writeFileSync(configPath, invalidProvider, 'utf-8');

      expect(() => loadConfig(configPath)).toThrow('Config validation failed');
    });
  });

  describe('默认值填充', () => {
    it('应该为部分配置填充默认值', () => {
      const partialConfig = `
ai:
  mainModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: custom-key
    model: gpt-4-turbo
    temperature: 0.8
    maxTokens: 5000
  jsonModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: custom-key
    model: gpt-4
    temperature: 0.3
    maxTokens: 2000
generation:
  volumes: 5
`;
      fs.writeFileSync(configPath, partialConfig, 'utf-8');

      const config = loadConfig(configPath);

      // 用户提供的值
      expect(config.generation.volumes).toBe(5);
      expect(config.ai.mainModel.temperature).toBe(0.8);
      
      // 默认值
      expect(config.generation.chaptersPerVolume).toBe(10);
      expect(config.generation.wordsPerChapter).toBe(3000);
      expect(config.logging.logLevel).toBe('info');
    });

    it('应该允许用户覆盖所有默认值', () => {
      const customConfig = `
ai:
  mainModel:
    provider: openai-compatible
    baseURL: https://custom-api.com/v1
    apiKey: custom-main-key
    model: gpt-4-turbo
    temperature: 0.9
    maxTokens: 8000
  jsonModel:
    provider: openai-compatible
    baseURL: https://custom-api.com/v1
    apiKey: custom-json-key
    model: gpt-3.5-turbo
    temperature: 0.1
    maxTokens: 1000
generation:
  volumes: 5
  chaptersPerVolume: 15
  wordsPerChapter: 5000
  maxFixRounds: 5
logging:
  logLevel: debug
  logDir: custom-logs
summary:
  summaryLengthRatio: 0.2
`;
      fs.writeFileSync(configPath, customConfig, 'utf-8');

      const config = loadConfig(configPath);

      expect(config.ai.mainModel.baseURL).toBe('https://custom-api.com/v1');
      expect(config.ai.mainModel.temperature).toBe(0.9);
      expect(config.generation.volumes).toBe(5);
      expect(config.generation.chaptersPerVolume).toBe(15);
      expect(config.logging.logLevel).toBe('debug');
      expect(config.summary.summaryLengthRatio).toBe(0.2);
    });
  });

  describe('错误处理', () => {
    it('应该在配置文件不存在时抛出错误', () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.yaml');

      expect(() => loadConfig(nonExistentPath)).toThrow('Config file not found');
    });

    it('应该在配置文件路径为目录时抛出错误', () => {
      expect(() => loadConfig(tempDir)).toThrow();
    });
  });

  describe('边界情况', () => {
    it('应该处理包含注释的YAML文件', () => {
      const yamlWithComments = `
# AI模型配置
ai:
  mainModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key
    model: gpt-4
    temperature: 0.7
    maxTokens: 4000
  jsonModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key
    model: gpt-4
    temperature: 0.3
    maxTokens: 2000

# 生成配置
generation:
  volumes: 3
  chaptersPerVolume: 10
  wordsPerChapter: 3000
  maxFixRounds: 3

logging:
  logLevel: info
  logDir: logs

summary:
  summaryLengthRatio: 0.15
`;
      fs.writeFileSync(configPath, yamlWithComments, 'utf-8');

      const config = loadConfig(configPath);

      expect(config.generation.volumes).toBe(3);
    });

    it('应该处理数值类型的边界值', () => {
      const boundaryConfig = `
ai:
  mainModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key
    model: gpt-4
    temperature: 0
    maxTokens: 1
  jsonModel:
    provider: openai-compatible
    baseURL: https://api.openai.com/v1
    apiKey: test-key
    model: gpt-4
    temperature: 2
    maxTokens: 100000
generation:
  volumes: 1
  chaptersPerVolume: 1
  wordsPerChapter: 100
  maxFixRounds: 0
logging:
  logLevel: error
  logDir: logs
summary:
  summaryLengthRatio: 0.05
`;
      fs.writeFileSync(configPath, boundaryConfig, 'utf-8');

      const config = loadConfig(configPath);

      expect(config.ai.mainModel.temperature).toBe(0);
      expect(config.generation.volumes).toBe(1);
      expect(config.generation.wordsPerChapter).toBe(100);
      expect(config.summary.summaryLengthRatio).toBe(0.05);
    });
  });
});
