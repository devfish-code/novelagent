/**
 * Phase1: 需求理解
 * 
 * 职责:
 * - 解析用户创意描述
 * - 调用Main Model生成结构化需求
 * - 生成requirements.md文件
 * 
 * Requirements: 3.1, 18.1-18.12
 */

import type { Effect } from '../effects.js';
import type { Requirements } from '../models/requirements.js';
import type { GenerationConfig } from '../models/config.js';

/**
 * Phase1输入
 */
export interface Phase1Input {
  creativeDescription: string;
  projectName: string;
  config: GenerationConfig;
}

/**
 * Phase1输出
 */
export interface Phase1Output {
  requirements: Requirements;
  effects: Effect[];
}

/**
 * Phase1: 需求理解
 * 
 * 从创意描述生成结构化需求文档
 * 
 * Requirements: 3.1, 18.1-18.12
 * 
 * @param input Phase1输入
 * @returns Phase1输出(需求对象和Effects)
 */
export function phase1UnderstandRequirements(input: Phase1Input): Phase1Output {
  const { creativeDescription, projectName, config } = input;
  const effects: Effect[] = [];

  // Requirement 18.1-18.9: 构建AI提示词,生成所有必需字段
  const prompt = buildRequirementsPrompt(creativeDescription, config);

  // Requirement 3.1: 调用Main Model生成结构化需求
  effects.push({
    type: 'AI_CHAT',
    payload: {
      model: 'main',
      messages: [
        {
          role: 'system',
          content: '你是一个资深小说策划,负责将创意描述转化为结构化需求。请严格按照YAML格式输出。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    },
  });

  // 构建需求对象(实际数据由Bus层从AI响应中解析)
  const requirements: Requirements = {
    novelType: '', // 将由AI填充
    targetAudience: {
      ageRange: '',
      readingPreferences: [],
    },
    coreConflict: {
      mainContradiction: '',
      opposingSides: [],
    },
    theme: '',
    emotionalTone: '',
    storyBackground: {
      era: '',
      region: '',
      socialEnvironment: '',
    },
    narrativePerspective: '',
    expectedLength: {
      totalWords: config.volumes * config.chaptersPerVolume * config.wordsPerChapter,
      chapters: config.volumes * config.chaptersPerVolume,
    },
    uniqueSellingPoints: [],
    metadata: {
      generatedAt: new Date().toISOString(),
      novelAgentVersion: '1.0.0',
    },
  };

  // Requirement 18.12: 保存到Novel_Project根目录的requirements.md
  const requirementsYaml = formatRequirementsAsYaml(requirements);
  effects.push({
    type: 'SAVE_FILE',
    payload: {
      path: `${projectName}/requirements.md`,
      content: requirementsYaml,
    },
  });

  // 记录日志
  effects.push({
    type: 'LOG_INFO',
    payload: {
      message: 'Phase1需求理解完成',
      context: {
        projectName,
        expectedLength: requirements.expectedLength,
      },
    },
  });

  return { requirements, effects };
}

/**
 * 构建需求生成提示词
 * 
 * Requirements: 18.1-18.9
 */
function buildRequirementsPrompt(
  creativeDescription: string,
  config: GenerationConfig
): string {
  const totalWords = config.volumes * config.chaptersPerVolume * config.wordsPerChapter;
  const totalChapters = config.volumes * config.chaptersPerVolume;

  return `
你是一个资深小说策划,负责将创意描述转化为结构化需求。

用户创意:
${creativeDescription}

请分析并生成以下结构化需求:

1. 小说类型: (玄幻/科幻/都市/历史/武侠/奇幻/悬疑/言情等)
2. 目标读者:
   - 年龄段: (例如: 18-35岁)
   - 阅读偏好: (列出3-5个关键词,例如: 热血、成长、权谋、浪漫等)
3. 核心冲突:
   - 主要矛盾: (描述故事的核心矛盾)
   - 对立双方: (列出冲突的主要参与方)
4. 主题: (核心思想、价值观,例如: 成长与自我认同、正义与复仇等)
5. 情感基调: (整体氛围、情绪走向,例如: 轻松幽默、紧张刺激、温馨治愈等)
6. 故事背景:
   - 时代: (例如: 现代都市、架空古代、未来科幻等)
   - 地域: (例如: 中国、异世界、星际等)
   - 社会环境: (描述社会结构、文化特点等)
7. 叙事视角: (第一人称/第三人称、全知/限知)
8. 预期篇幅:
   - 总字数: ${totalWords}
   - 章节数: ${totalChapters}
9. 核心卖点: (吸引读者的独特元素,列出3-5个)

输出YAML格式,严格按照以下结构:

\`\`\`yaml
novelType: "小说类型"
targetAudience:
  ageRange: "年龄段"
  readingPreferences:
    - "偏好1"
    - "偏好2"
    - "偏好3"
coreConflict:
  mainContradiction: "主要矛盾描述"
  opposingSides:
    - "对立方1"
    - "对立方2"
theme: "主题描述"
emotionalTone: "情感基调描述"
storyBackground:
  era: "时代"
  region: "地域"
  socialEnvironment: "社会环境描述"
narrativePerspective: "叙事视角"
expectedLength:
  totalWords: ${totalWords}
  chapters: ${totalChapters}
uniqueSellingPoints:
  - "卖点1"
  - "卖点2"
  - "卖点3"
\`\`\`

注意:
- 请深入分析用户创意,提取核心要素
- 确保各字段内容具体、可操作
- 核心冲突要明确、有张力
- 卖点要突出、有吸引力
`;
}

/**
 * 将需求对象格式化为YAML
 * 
 * Requirement 18.10, 18.11
 */
function formatRequirementsAsYaml(requirements: Requirements): string {
  const lines: string[] = [];

  lines.push('# 需求文档');
  lines.push('');
  lines.push(`novelType: "${requirements.novelType}"`);
  lines.push('');
  
  lines.push('targetAudience:');
  lines.push(`  ageRange: "${requirements.targetAudience.ageRange}"`);
  lines.push('  readingPreferences:');
  requirements.targetAudience.readingPreferences.forEach((pref) => {
    lines.push(`    - "${pref}"`);
  });
  lines.push('');

  lines.push('coreConflict:');
  lines.push(`  mainContradiction: "${requirements.coreConflict.mainContradiction}"`);
  lines.push('  opposingSides:');
  requirements.coreConflict.opposingSides.forEach((side) => {
    lines.push(`    - "${side}"`);
  });
  lines.push('');

  lines.push(`theme: "${requirements.theme}"`);
  lines.push('');
  lines.push(`emotionalTone: "${requirements.emotionalTone}"`);
  lines.push('');

  lines.push('storyBackground:');
  lines.push(`  era: "${requirements.storyBackground.era}"`);
  lines.push(`  region: "${requirements.storyBackground.region}"`);
  lines.push(`  socialEnvironment: "${requirements.storyBackground.socialEnvironment}"`);
  lines.push('');

  lines.push(`narrativePerspective: "${requirements.narrativePerspective}"`);
  lines.push('');

  lines.push('expectedLength:');
  lines.push(`  totalWords: ${requirements.expectedLength.totalWords}`);
  lines.push(`  chapters: ${requirements.expectedLength.chapters}`);
  lines.push('');

  lines.push('uniqueSellingPoints:');
  requirements.uniqueSellingPoints.forEach((point) => {
    lines.push(`  - "${point}"`);
  });
  lines.push('');

  lines.push('metadata:');
  lines.push(`  generatedAt: "${requirements.metadata.generatedAt}"`);
  lines.push(`  novelAgentVersion: "${requirements.metadata.novelAgentVersion}"`);
  lines.push('');

  return lines.join('\n');
}
