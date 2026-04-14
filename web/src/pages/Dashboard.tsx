import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Button,
  Space,
  Typography,
  Select,
  message,
  Modal,
  Spin,
  Grid,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { ProjectCard } from '../components/ProjectCard';
import { useProjectStore } from '../store';
import { projectService } from '../services';

const { Title } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

type StatusFilter = 'all' | 'idle' | 'generating' | 'paused' | 'completed' | 'failed';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { projects, setProjects, removeProject, setLoading, loading } = useProjectStore();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  // 判断是否为移动端
  const isMobile = !screens.md;

  // 加载项目列表
  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectService.listProjects();
      setProjects(response.projects);
    } catch (error: any) {
      message.error(error.message || '加载项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 刷新项目列表
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
    message.success('刷新成功');
  };

  // 删除项目
  const handleDelete = (name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除项目 "${name}" 吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await projectService.deleteProject(name);
          removeProject(name);
          message.success('项目已删除');
        } catch (error: any) {
          message.error(error.message || '删除项目失败');
        }
      },
    });
  };

  // 开始生成（占位符）
  const handleStart = (name: string) => {
    message.info(`开始生成项目: ${name}`);
    // TODO: 实现开始生成逻辑
  };

  // 暂停生成（占位符）
  const handlePause = (name: string) => {
    message.info(`暂停生成项目: ${name}`);
    // TODO: 实现暂停生成逻辑
  };

  // 过滤项目
  const filteredProjects = projects.filter((project) => {
    if (statusFilter === 'all') return true;
    return project.status === statusFilter;
  });

  // 初始加载
  useEffect(() => {
    loadProjects();
  }, []);

  // 自动刷新（每 30 秒）
  useEffect(() => {
    const interval = setInterval(() => {
      loadProjects();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 标题和操作栏 */}
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? '12px' : '0',
          }}
        >
          <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>
            项目仪表板
          </Title>
          <Space wrap>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
            >
              <Option value="all">全部状态</Option>
              <Option value="idle">空闲</Option>
              <Option value="generating">生成中</Option>
              <Option value="paused">已暂停</Option>
              <Option value="completed">已完成</Option>
              <Option value="failed">失败</Option>
            </Select>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={refreshing}
            >
              {isMobile ? '' : '刷新'}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/projects/new')}
            >
              {isMobile ? '新建' : '新建项目'}
            </Button>
          </Space>
        </div>

        {/* 项目列表 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" tip="加载中..." />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Typography.Text type="secondary">
              {statusFilter === 'all' ? '暂无项目，点击"新建项目"开始' : '没有符合条件的项目'}
            </Typography.Text>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {filteredProjects.map((project) => (
              <Col key={project.name} xs={24} sm={12} lg={8} xl={6}>
                <ProjectCard
                  project={project}
                  onDelete={handleDelete}
                  onStart={handleStart}
                  onPause={handlePause}
                />
              </Col>
            ))}
          </Row>
        )}
      </Space>
    </div>
  );
};
