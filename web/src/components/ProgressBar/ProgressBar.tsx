import React from 'react';
import { Card, Progress, Space, Typography, Statistic, Row, Col } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ProgressBarProps {
  projectName: string;
  phase: number;
  percentage: number;
  current: number;
  total: number;
  message?: string;
  status: 'idle' | 'generating' | 'paused' | 'completed' | 'failed';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  phase,
  percentage,
  current,
  total,
  message,
  status,
}) => {
  // 确定进度条状态
  const getProgressStatus = () => {
    if (status === 'failed') return 'exception';
    if (status === 'completed') return 'success';
    if (status === 'paused') return 'normal';
    return 'active';
  };

  // 格式化阶段名称
  const getPhaseName = (phase: number) => {
    const phaseNames = [
      '准备中',
      'Phase 1: 理解需求',
      'Phase 2: 世界构建',
      'Phase 3: 大纲规划',
      'Phase 4: 章节生成',
      'Phase 5: 最终校验',
    ];
    return phaseNames[phase] || `Phase ${phase}`;
  };

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 当前阶段 */}
        <div>
          <Text strong style={{ fontSize: 16 }}>
            {getPhaseName(phase)}
          </Text>
        </div>

        {/* 进度条 */}
        <Progress
          percent={percentage}
          status={getProgressStatus()}
          strokeWidth={12}
          format={(percent) => `${percent}%`}
        />

        {/* 统计信息 */}
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="当前进度"
              value={current}
              suffix={`/ ${total}`}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="完成百分比"
              value={percentage}
              suffix="%"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="当前阶段"
              value={phase}
              suffix="/ 5"
            />
          </Col>
        </Row>

        {/* 当前任务信息 */}
        {message && (
          <div style={{ 
            padding: '12px', 
            background: '#f5f5f5', 
            borderRadius: 4,
            borderLeft: '3px solid #1890ff',
          }}>
            <Space>
              <ClockCircleOutlined style={{ color: '#1890ff' }} />
              <Text>{message}</Text>
            </Space>
          </div>
        )}
      </Space>
    </Card>
  );
};
