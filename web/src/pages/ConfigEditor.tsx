/**
 * ConfigEditor Page
 * 配置编辑器页面 - 可视化编辑 config.yaml
 */

import { useState } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Typography,
  Divider,
  Alert,
  message,
  Collapse,
  Tooltip,
  Grid,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;
const { useBreakpoint } = Grid;

interface ConfigFormValues {
  // AI 配置
  mainModelProvider: string;
  mainModelBaseURL: string;
  mainModelApiKey: string;
  mainModelName: string;
  mainModelTemperature: number;
  mainModelMaxTokens: number;
  
  jsonModelProvider: string;
  jsonModelBaseURL: string;
  jsonModelApiKey: string;
  jsonModelName: string;
  jsonModelTemperature: number;
  jsonModelMaxTokens: number;
  
  // 生成配置
  volumes: number;
  chaptersPerVolume: number;
  wordsPerChapter: number;
  maxFixRounds: number;
  
  // 日志配置
  logLevel: string;
  logDir: string;
  
  // 摘要配置
  summaryLengthRatio: number;
}

export const ConfigEditor: React.FC = () => {
  const [form] = Form.useForm<ConfigFormValues>();
  const [loading, setLoading] = useState(false);
  const screens = useBreakpoint();

  // 判断是否为移动端
  const isMobile = !screens.md;

  // 默认配置
  const defaultConfig: ConfigFormValues = {
    mainModelProvider: 'openai-compatible',
    mainModelBaseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    mainModelApiKey: '${DASHSCOPE_API_KEY}',
    mainModelName: 'qwen-plus',
    mainModelTemperature: 0.7,
    mainModelMaxTokens: 32768,
    
    jsonModelProvider: 'openai-compatible',
    jsonModelBaseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    jsonModelApiKey: '${DASHSCOPE_API_KEY}',
    jsonModelName: 'qwen-plus',
    jsonModelTemperature: 0.3,
    jsonModelMaxTokens: 8192,
    
    volumes: 3,
    chaptersPerVolume: 10,
    wordsPerChapter: 3000,
    maxFixRounds: 3,
    
    logLevel: 'info',
    logDir: 'logs',
    
    summaryLengthRatio: 0.15,
  };

  // 保存配置
  const handleSave = async (values: ConfigFormValues) => {
    try {
      setLoading(true);
      // TODO: 调用 API 保存配置
      console.log('Saving config:', values);
      message.success('配置保存成功');
    } catch (error: any) {
      message.error(error.message || '保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 恢复默认值
  const handleReset = () => {
    form.setFieldsValue(defaultConfig);
    message.info('已恢复默认配置');
  };

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 标题 */}
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? '12px' : '0',
          }}
        >
          <Title level={isMobile ? 3 : 2}>
            <SettingOutlined /> 配置编辑器
          </Title>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              {isMobile ? '恢复' : '恢复默认值'}
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => form.submit()}
              loading={loading}
            >
              {isMobile ? '保存' : '保存配置'}
            </Button>
          </Space>
        </div>

        {/* 说明 */}
        <Alert
          message="配置说明"
          description="修改配置后需要重启服务才能生效。建议使用环境变量存储 API Key，格式：${VARIABLE_NAME}"
          type="info"
          showIcon
        />

        {/* 配置表单 */}
        <Form
          form={form}
          layout="vertical"
          initialValues={defaultConfig}
          onFinish={handleSave}
        >
          <Collapse defaultActiveKey={['ai', 'generation']}>
            {/* AI 模型配置 */}
            <Panel
              header={
                <Space>
                  <Text strong>AI 模型配置</Text>
                  <Text type="secondary">配置主模型和 JSON 模型</Text>
                </Space>
              }
              key="ai"
            >
              <Card title="主模型（用于创意生成、大纲规划、正文写作）" size="small">
                <Form.Item
                  label="Provider"
                  name="mainModelProvider"
                  rules={[{ required: true, message: '请选择 Provider' }]}
                >
                  <Select>
                    <Option value="openai-compatible">OpenAI Compatible</Option>
                    <Option value="openai">OpenAI</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  label={
                    <Space>
                      <span>Base URL</span>
                      <Tooltip title="API 服务的基础 URL">
                        <InfoCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  name="mainModelBaseURL"
                  rules={[{ required: true, message: '请输入 Base URL' }]}
                >
                  <Input placeholder="https://api.openai.com/v1" />
                </Form.Item>

                <Form.Item
                  label={
                    <Space>
                      <span>API Key</span>
                      <Tooltip title="支持环境变量，格式：${VARIABLE_NAME}">
                        <InfoCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  name="mainModelApiKey"
                  rules={[{ required: true, message: '请输入 API Key' }]}
                >
                  <Input.Password placeholder="${DASHSCOPE_API_KEY} 或 sk-xxxxx" />
                </Form.Item>

                <Form.Item
                  label="模型名称"
                  name="mainModelName"
                  rules={[{ required: true, message: '请输入模型名称' }]}
                >
                  <Input placeholder="qwen-plus, gpt-4, gpt-3.5-turbo" />
                </Form.Item>

                <Form.Item
                  label={
                    <Space>
                      <span>Temperature</span>
                      <Tooltip title="0-2，越高越随机，创意写作建议 0.7-0.9">
                        <InfoCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  name="mainModelTemperature"
                  rules={[{ required: true, message: '请输入 Temperature' }]}
                >
                  <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                  label={
                    <Space>
                      <span>Max Tokens</span>
                      <Tooltip title="最大生成 token 数，影响生成长度和成本">
                        <InfoCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  name="mainModelMaxTokens"
                  rules={[{ required: true, message: '请输入 Max Tokens' }]}
                >
                  <InputNumber min={1024} max={128000} step={1024} style={{ width: '100%' }} />
                </Form.Item>
              </Card>

              <Divider />

              <Card title="JSON 模型（用于结构化数据提取和校验）" size="small">
                <Form.Item
                  label="Provider"
                  name="jsonModelProvider"
                  rules={[{ required: true, message: '请选择 Provider' }]}
                >
                  <Select>
                    <Option value="openai-compatible">OpenAI Compatible</Option>
                    <Option value="openai">OpenAI</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  label="Base URL"
                  name="jsonModelBaseURL"
                  rules={[{ required: true, message: '请输入 Base URL' }]}
                >
                  <Input placeholder="https://api.openai.com/v1" />
                </Form.Item>

                <Form.Item
                  label="API Key"
                  name="jsonModelApiKey"
                  rules={[{ required: true, message: '请输入 API Key' }]}
                >
                  <Input.Password placeholder="${DASHSCOPE_API_KEY} 或 sk-xxxxx" />
                </Form.Item>

                <Form.Item
                  label="模型名称"
                  name="jsonModelName"
                  rules={[{ required: true, message: '请输入模型名称' }]}
                >
                  <Input placeholder="qwen-plus, gpt-4, gpt-3.5-turbo" />
                </Form.Item>

                <Form.Item
                  label={
                    <Space>
                      <span>Temperature</span>
                      <Tooltip title="JSON 模型使用较低温度以确保输出稳定，建议 0.3-0.5">
                        <InfoCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  name="jsonModelTemperature"
                  rules={[{ required: true, message: '请输入 Temperature' }]}
                >
                  <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                  label="Max Tokens"
                  name="jsonModelMaxTokens"
                  rules={[{ required: true, message: '请输入 Max Tokens' }]}
                >
                  <InputNumber min={1024} max={128000} step={1024} style={{ width: '100%' }} />
                </Form.Item>
              </Card>
            </Panel>

            {/* 生成参数配置 */}
            <Panel
              header={
                <Space>
                  <Text strong>生成参数配置</Text>
                  <Text type="secondary">配置小说结构和生成参数</Text>
                </Space>
              }
              key="generation"
            >
              <Form.Item
                label={
                  <Space>
                    <span>卷数</span>
                    <Tooltip title="小说的卷数">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="volumes"
                rules={[{ required: true, message: '请输入卷数' }]}
              >
                <InputNumber min={1} max={10} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    <span>每卷章数</span>
                    <Tooltip title="每卷包含的章节数">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="chaptersPerVolume"
                rules={[{ required: true, message: '请输入每卷章数' }]}
              >
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    <span>每章字数</span>
                    <Tooltip title="每章的目标字数，建议 3000-5000 字">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="wordsPerChapter"
                rules={[{ required: true, message: '请输入每章字数' }]}
              >
                <InputNumber min={1000} max={10000} step={500} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    <span>最大修复轮次</span>
                    <Tooltip title="校验失败时的最大重试次数，建议 2-5 轮">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="maxFixRounds"
                rules={[{ required: true, message: '请输入最大修复轮次' }]}
              >
                <InputNumber min={1} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Panel>

            {/* 日志配置 */}
            <Panel
              header={
                <Space>
                  <Text strong>日志配置</Text>
                  <Text type="secondary">配置日志级别和存储位置</Text>
                </Space>
              }
              key="logging"
            >
              <Form.Item
                label="日志级别"
                name="logLevel"
                rules={[{ required: true, message: '请选择日志级别' }]}
              >
                <Select>
                  <Option value="debug">Debug（调试）</Option>
                  <Option value="info">Info（信息）</Option>
                  <Option value="error">Error（错误）</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="日志目录"
                name="logDir"
                rules={[{ required: true, message: '请输入日志目录' }]}
              >
                <Input placeholder="logs" />
              </Form.Item>
            </Panel>

            {/* 摘要配置 */}
            <Panel
              header={
                <Space>
                  <Text strong>摘要配置</Text>
                  <Text type="secondary">配置章节摘要生成参数</Text>
                </Space>
              }
              key="summary"
            >
              <Form.Item
                label={
                  <Space>
                    <span>摘要长度比例</span>
                    <Tooltip title="摘要长度占原文的比例，0.05-0.5（5%-50%）">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="summaryLengthRatio"
                rules={[{ required: true, message: '请输入摘要长度比例' }]}
              >
                <InputNumber min={0.05} max={0.5} step={0.05} style={{ width: '100%' }} />
              </Form.Item>
            </Panel>
          </Collapse>
        </Form>

        {/* 帮助信息 */}
        <Alert
          message="配置提示"
          description={
            <div>
              <Paragraph style={{ marginBottom: 8 }}>
                <Text strong>1. API 密钥安全：</Text>
                <br />
                推荐使用环境变量：<Text code>${`{VARIABLE_NAME}`}</Text>
                <br />
                或直接填写：<Text code>sk-xxxxx</Text>（注意不要提交到版本控制）
              </Paragraph>
              <Paragraph style={{ marginBottom: 8 }}>
                <Text strong>2. 模型选择：</Text>
                <br />
                OpenAI: gpt-4, gpt-3.5-turbo
                <br />
                通义千问: qwen-plus, qwen-turbo
              </Paragraph>
              <Paragraph style={{ marginBottom: 0 }}>
                <Text strong>3. 性能优化：</Text>
                <br />
                较大的 maxTokens 可以生成更长的内容，但会增加成本
                <br />
                较低的 temperature 可以提高输出稳定性
              </Paragraph>
            </div>
          }
          type="warning"
          showIcon
        />
      </Space>
    </div>
  );
};
