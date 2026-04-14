import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Alert,
  Descriptions,
  Tag,
  Radio,
  Spin,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { projectService } from '../../services';
import type { TestConnectionRequest } from '../../types';

const { Title, Text } = Typography;

interface TestResult {
  success: boolean;
  latency?: number;
  error?: string;
}

interface AIConnectionTestProps {
  onTestComplete?: (success: boolean) => void;
}

export const AIConnectionTest: React.FC<AIConnectionTestProps> = ({
  onTestComplete,
}) => {
  const [testing, setTesting] = useState(false);
  const [modelType, setModelType] = useState<TestConnectionRequest['model']>('all');
  const [results, setResults] = useState<{
    main?: TestResult;
    json?: TestResult;
  } | null>(null);

  // 执行连接测试
  const handleTest = async () => {
    try {
      setTesting(true);
      setResults(null);

      const response = await projectService.testConnection({ model: modelType });
      
      setResults(response.results);
      
      // 检查是否所有测试都成功
      const allSuccess = Object.values(response.results).every(
        (result) => result?.success
      );
      
      onTestComplete?.(allSuccess);
    } catch (error: any) {
      setResults({
        main: { success: false, error: error.message || '连接失败' },
        json: { success: false, error: error.message || '连接失败' },
      });
      onTestComplete?.(false);
    } finally {
      setTesting(false);
    }
  };

  // 渲染测试结果
  const renderResult = (label: string, result?: TestResult) => {
    if (!result) return null;

    return (
      <Descriptions.Item label={label}>
        <Space>
          {result.success ? (
            <>
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
              <Text type="success">连接成功</Text>
              {result.latency && (
                <Tag color="blue">{result.latency}ms</Tag>
              )}
            </>
          ) : (
            <>
              <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
              <Text type="danger">连接失败</Text>
              {result.error && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ({result.error})
                </Text>
              )}
            </>
          )}
        </Space>
      </Descriptions.Item>
    );
  };

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Title level={4}>
            <ThunderboltOutlined /> AI 连接测试
          </Title>
          <Text type="secondary">
            测试与 AI 模型的连接状态，确保配置正确后再开始生成小说。
          </Text>
        </div>

        <div>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>选择测试模型：</Text>
            <Radio.Group
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              disabled={testing}
            >
              <Radio.Button value="all">全部模型</Radio.Button>
              <Radio.Button value="main">主模型</Radio.Button>
              <Radio.Button value="json">JSON 模型</Radio.Button>
            </Radio.Group>
          </Space>
        </div>

        <Button
          type="primary"
          icon={testing ? <SyncOutlined spin /> : <ThunderboltOutlined />}
          onClick={handleTest}
          loading={testing}
          size="large"
        >
          {testing ? '测试中...' : '开始测试'}
        </Button>

        {testing && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin size="large" tip="正在测试 AI 连接..." />
          </div>
        )}

        {results && !testing && (
          <div>
            <Descriptions bordered column={1}>
              {results.main && renderResult('主模型（Main Model）', results.main)}
              {results.json && renderResult('JSON 模型（JSON Model）', results.json)}
            </Descriptions>

            {Object.values(results).every((r) => r?.success) ? (
              <Alert
                message="连接测试成功"
                description="所有 AI 模型连接正常，您可以开始生成小说了。"
                type="success"
                showIcon
                style={{ marginTop: 16 }}
              />
            ) : (
              <Alert
                message="连接测试失败"
                description="部分或全部 AI 模型连接失败，请检查配置后重试。常见问题：API Key 错误、网络连接问题、模型地址配置错误。"
                type="error"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </div>
        )}

        <Card type="inner" title="💡 配置说明">
          <Space direction="vertical">
            <Text>
              <Text strong>主模型（Main Model）：</Text>
              用于生成小说内容、对话、描写等文本。
            </Text>
            <Text>
              <Text strong>JSON 模型（JSON Model）：</Text>
              用于生成结构化数据，如角色信息、大纲等。
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              注意：两个模型可以使用相同的 API 配置，但建议使用不同的温度参数以获得更好的效果。
            </Text>
          </Space>
        </Card>
      </Space>
    </Card>
  );
};
