import React, { memo } from 'react';
import { Card, Progress, Tag, Button, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  EyeOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ProjectSummary } from '../../types';

const { Text, Title } = Typography;

interface ProjectCardProps {
  project: ProjectSummary;
  onDelete?: (name: string) => void;
  onStart?: (name: string) => void;
  onPause?: (name: string) => void;
}

const statusConfig = {
  idle: { color: 'default', text: '空闲' },
  generating: { color: 'processing', text: '生成中' },
  paused: { color: 'warning', text: '已暂停' },
  completed: { color: 'success', text: '已完成' },
  failed: { color: 'error', text: '失败' },
};

const ProjectCardComponent: React.FC<ProjectCardProps> = ({
  project,
  onDelete,
  onStart,
  onPause,
}) => {
  const navigate = useNavigate();
  const statusInfo = statusConfig[project.status];

  const handleView = () => {
    navigate(`/projects/${project.name}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(project.name);
  };

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStart?.(project.name);
  };

  const handlePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPause?.(project.name);
  };

  return (
    <Card
      hoverable
      onClick={handleView}
      style={{ height: '100%' }}
      actions={[
        <Button
          key="view"
          type="text"
          icon={<EyeOutlined />}
          onClick={handleView}
        >
          查看
        </Button>,
        project.status === 'generating' || project.status === 'paused' ? (
          <Button
            key="pause"
            type="text"
            icon={<PauseCircleOutlined />}
            onClick={handlePause}
            disabled={project.status === 'paused'}
          >
            暂停
          </Button>
        ) : (
          <Button
            key="start"
            type="text"
            icon={<PlayCircleOutlined />}
            onClick={handleStart}
            disabled={project.status === 'completed'}
          >
            开始
          </Button>
        ),
        <Button
          key="delete"
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={handleDelete}
        >
          删除
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Title level={4} style={{ marginBottom: 8 }}>
            {project.name}
          </Title>
          <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
        </div>

        <div>
          <Text type="secondary">进度</Text>
          <Progress
            percent={project.progress.percentage}
            status={
              project.status === 'failed'
                ? 'exception'
                : project.status === 'completed'
                ? 'success'
                : 'active'
            }
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {project.progress.currentTask}
          </Text>
        </div>

        <div>
          <Space split="|">
            <Text type="secondary">
              卷数: {project.metadata.volumes}
            </Text>
            <Text type="secondary">
              章节: {project.metadata.completedChapters}/{project.metadata.totalChapters}
            </Text>
          </Space>
        </div>

        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            创建于: {new Date(project.metadata.createdAt).toLocaleString('zh-CN')}
          </Text>
        </div>
      </Space>
    </Card>
  );
};

// 使用 memo 优化渲染性能
export const ProjectCard = memo(ProjectCardComponent, (prevProps, nextProps) => {
  // 只有当项目数据真正改变时才重新渲染
  return (
    prevProps.project.name === nextProps.project.name &&
    prevProps.project.status === nextProps.project.status &&
    prevProps.project.progress.percentage === nextProps.project.progress.percentage &&
    prevProps.project.progress.currentTask === nextProps.project.progress.currentTask &&
    prevProps.project.metadata.completedChapters === nextProps.project.metadata.completedChapters
  );
});
