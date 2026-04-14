import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Space,
  Typography,
  Button,
  Tabs,
  message,
  Spin,
  Card,
  Descriptions,
  Grid,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import { WorkflowVisualizer } from '../components/WorkflowVisualizer';
import { RealTimeLogger } from '../components/RealTimeLogger';
import { ProgressBar } from '../components/ProgressBar';
import { AIConnectionTest } from '../components/AIConnectionTest';
import { ChapterManager } from '../components/ChapterManager';
import { ExportManager } from '../components/ExportManager';
import { WorldStateViewer } from '../components/WorldStateViewer';
import { useProjectStore, useProgressStore, useLogStore } from '../store';
import { useWebSocket } from '../hooks';
import { projectService } from '../services';
import type { ServerMessage } from '../types';

const { Title } = Typography;
const { useBreakpoint } = Grid;

export const ProjectDetail: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { currentProject, setCurrentProject, setLoading, loading } = useProjectStore();
  const { updateProgress, updateStatus, getProgress } = useProgressStore();
  const { addLog } = useLogStore();
  const [activeTab, setActiveTab] = useState('overview');

  // 判断是否为移动端
  const isMobile = !screens.md;

  // WebSocket 连接
  const { subscribe, unsubscribe, isConnected } = useWebSocket({
    onMessage: (message: ServerMessage) => {
      if (!name) return;

      // 处理不同类型的消息
      switch (message.type) {
        case 'progress':
          if (message.projectName === name) {
            updateProgress(message);
          }
          break;
        case 'status':
          if (message.projectName === name) {
            updateStatus(message);
          }
          break;
        case 'log':
          if (message.projectName === name) {
            addLog(message);
          }
          break;
        case 'error':
          if (message.projectName === name) {
            // 使用 Ant Design 的 message 组件显示错误
            import('antd').then(({ message: antdMessage }) => {
              antdMessage.error(`错误: ${message.error.message}`);
            });
          }
          break;
        case 'complete':
          if (message.projectName === name) {
            // 使用 Ant Design 的 message 组件显示成功
            import('antd').then(({ message: antdMessage }) => {
              antdMessage.success('生成完成！');
            });
          }
          break;
      }
    },
  });

  // 加载项目详情
  const loadProject = async () => {
    if (!name) return;

    try {
      setLoading(true);
      const response = await projectService.getProject(name);
      setCurrentProject(response.project);
    } catch (error: any) {
      message.error(error.message || '加载项目失败');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // 订阅项目更新
  useEffect(() => {
    if (name && isConnected) {
      subscribe(name);
      return () => unsubscribe(name);
    }
  }, [name, isConnected, subscribe, unsubscribe]);

  // 初始加载
  useEffect(() => {
    loadProject();
  }, [name]);

  if (loading || !currentProject) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  const progress = getProgress(name || '');

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 标题栏 */}
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? '12px' : '0',
          }}
        >
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/dashboard')}
            >
              {isMobile ? '' : '返回'}
            </Button>
            <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>
              {currentProject.name}
            </Title>
          </Space>
          <Space>
            {currentProject.status === 'generating' ? (
              <Button
                icon={<PauseCircleOutlined />}
                onClick={() => message.info('暂停功能开发中')}
              >
                {isMobile ? '' : '暂停'}
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => message.info('开始生成功能开发中')}
                disabled={currentProject.status === 'completed'}
              >
                {isMobile ? '开始' : '开始生成'}
              </Button>
            )}
          </Space>
        </div>

        {/* 标签页 */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabPosition={isMobile ? 'top' : 'top'}
          items={[
            {
              key: 'overview',
              label: '概览',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  {/* 项目信息 */}
                  <Card title="项目信息">
                    <Descriptions column={isMobile ? 1 : 2}>
                      <Descriptions.Item label="项目名称">
                        {currentProject.name}
                      </Descriptions.Item>
                      <Descriptions.Item label="状态">
                        {currentProject.status}
                      </Descriptions.Item>
                      <Descriptions.Item label="卷数">
                        {currentProject.metadata.volumes}
                      </Descriptions.Item>
                      <Descriptions.Item label="每卷章节数">
                        {currentProject.metadata.chaptersPerVolume}
                      </Descriptions.Item>
                      <Descriptions.Item label="总章节数">
                        {currentProject.metadata.totalChapters}
                      </Descriptions.Item>
                      <Descriptions.Item label="已完成章节">
                        {currentProject.metadata.completedChapters}
                      </Descriptions.Item>
                      <Descriptions.Item label="创建时间">
                        {new Date(currentProject.metadata.createdAt).toLocaleString('zh-CN')}
                      </Descriptions.Item>
                      <Descriptions.Item label="更新时间">
                        {new Date(currentProject.metadata.updatedAt).toLocaleString('zh-CN')}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  {/* 工作流可视化 */}
                  <WorkflowVisualizer
                    currentPhase={progress?.phase || currentProject.progress.phase}
                    status={progress?.status || currentProject.status}
                  />

                  {/* 进度条 */}
                  {progress && (
                    <ProgressBar
                      projectName={currentProject.name}
                      phase={progress.phase}
                      percentage={progress.percentage}
                      current={progress.current}
                      total={progress.total}
                      message={progress.message}
                      status={progress.status}
                    />
                  )}
                </Space>
              ),
            },
            {
              key: 'chapters',
              label: '章节管理',
              children: <ChapterManager project={currentProject} onRefresh={loadProject} />,
            },
            {
              key: 'world',
              label: '世界状态',
              children: <WorldStateViewer worldState={currentProject.world} />,
            },
            {
              key: 'export',
              label: '导出',
              children: <ExportManager projectName={currentProject.name} />,
            },
            {
              key: 'logs',
              label: '实时日志',
              children: <RealTimeLogger projectName={currentProject.name} height={isMobile ? 400 : 600} />,
            },
            {
              key: 'test',
              label: 'AI 连接测试',
              children: <AIConnectionTest />,
            },
          ]}
        />
      </Space>
    </div>
  );
};
