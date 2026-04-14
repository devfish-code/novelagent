import React from 'react';
import { Steps, Card, Alert, Button, Space, Typography } from 'antd';
import { CheckCircleOutlined, SyncOutlined, CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface WorkflowVisualizerProps {
  currentPhase: number;
  status: 'idle' | 'generating' | 'paused' | 'completed' | 'failed';
  error?: {
    code: string;
    message: string;
  };
  onRetry?: () => void;
}

const phases = [
  {
    title: 'Phase 1',
    description: '理解需求',
    details: '分析用户需求，提取关键信息',
  },
  {
    title: 'Phase 2',
    description: '世界构建',
    details: '创建角色、地点、世界规则',
  },
  {
    title: 'Phase 3',
    description: '大纲规划',
    details: '生成章节大纲和情节结构',
  },
  {
    title: 'Phase 4',
    description: '章节生成',
    details: '逐章生成小说内容',
  },
  {
    title: 'Phase 5',
    description: '最终校验',
    details: '检查一致性和质量',
  },
];

export const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({
  currentPhase,
  status,
  error,
  onRetry,
}) => {
  // 确定当前步骤
  const current = Math.max(0, Math.min(currentPhase - 1, phases.length - 1));

  // 确定步骤状态
  const getStepStatus = (index: number) => {
    if (status === 'failed' && index === current) {
      return 'error';
    }
    if (status === 'generating' && index === current) {
      return 'process';
    }
    if (index < current) {
      return 'finish';
    }
    if (index === current && status === 'completed') {
      return 'finish';
    }
    return 'wait';
  };

  // 获取步骤图标
  const getStepIcon = (index: number) => {
    const stepStatus = getStepStatus(index);
    if (stepStatus === 'error') {
      return <CloseCircleOutlined />;
    }
    if (stepStatus === 'process') {
      return <SyncOutlined spin />;
    }
    if (stepStatus === 'finish') {
      return <CheckCircleOutlined />;
    }
    return undefined;
  };

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Steps
          current={current}
          status={status === 'failed' ? 'error' : status === 'generating' ? 'process' : 'finish'}
          items={phases.map((phase, index) => ({
            title: phase.title,
            description: phase.description,
            icon: getStepIcon(index),
          }))}
        />

        {/* 当前阶段详情 */}
        {status !== 'idle' && (
          <Card type="inner" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>{phases[current].title}: {phases[current].description}</Text>
              <Text type="secondary">{phases[current].details}</Text>
            </Space>
          </Card>
        )}

        {/* 错误信息 */}
        {status === 'failed' && error && (
          <Alert
            message="生成失败"
            description={
              <Space direction="vertical">
                <Text>{error.message}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  错误代码: {error.code}
                </Text>
              </Space>
            }
            type="error"
            showIcon
            action={
              onRetry && (
                <Button size="small" danger icon={<ReloadOutlined />} onClick={onRetry}>
                  重试
                </Button>
              )
            }
          />
        )}

        {/* 暂停状态 */}
        {status === 'paused' && (
          <Alert
            message="生成已暂停"
            description="您可以随时恢复生成过程"
            type="warning"
            showIcon
          />
        )}

        {/* 完成状态 */}
        {status === 'completed' && (
          <Alert
            message="生成完成"
            description="所有阶段已成功完成"
            type="success"
            showIcon
          />
        )}
      </Space>
    </Card>
  );
};
