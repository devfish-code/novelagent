/**
 * ChapterManager Component
 * 章节管理组件 - 显示章节列表、生成状态和内容预览
 */

import { useState, useMemo } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Modal,
  InputNumber,
  Select,
  Tooltip,
  Progress,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Drawer,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import type { Chapter, ProjectDetail } from '../../types';
import { chapterService } from '../../services';
import { ValidationResults } from '../ValidationResults';

const { Text, Paragraph } = Typography;
const { Option } = Select;

interface ChapterManagerProps {
  project: ProjectDetail;
  onRefresh?: () => void;
}

export const ChapterManager: React.FC<ChapterManagerProps> = ({
  project,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);
  const [rangeModalVisible, setRangeModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [validationDrawerVisible, setValidationDrawerVisible] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [rangeType, setRangeType] = useState<'all' | 'volume' | 'range'>('all');
  const [selectedVolume, setSelectedVolume] = useState<number>(1);
  const [startChapter, setStartChapter] = useState<number>(1);
  const [endChapter, setEndChapter] = useState<number>(1);

  // 计算统计信息
  const stats = useMemo(() => {
    const chapters = project.chapters || [];
    const total = chapters.length;
    const completed = chapters.filter((c) => c.status === 'completed').length;
    const generating = chapters.filter((c) => c.status === 'generating').length;
    const failed = chapters.filter((c) => c.status === 'failed').length;
    const pending = chapters.filter((c) => c.status === 'pending').length;

    return { total, completed, generating, failed, pending };
  }, [project.chapters]);

  // 获取章节状态标签
  const getStatusTag = (status: Chapter['status']) => {
    const statusConfig = {
      pending: { color: 'default', icon: <ClockCircleOutlined />, text: '未生成' },
      generating: { color: 'processing', icon: <SyncOutlined spin />, text: '生成中' },
      completed: { color: 'success', icon: <CheckCircleOutlined />, text: '已完成' },
      failed: { color: 'error', icon: <CloseCircleOutlined />, text: '失败' },
    };

    const config = statusConfig[status];
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 生成所有章节
  const handleGenerateAll = async () => {
    try {
      setLoading(true);
      await chapterService.generateChapters(project.name);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to generate chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  // 生成指定范围
  const handleGenerateRange = async () => {
    try {
      setLoading(true);
      const params: any = {};

      if (rangeType === 'volume') {
        params.volume = selectedVolume;
      } else if (rangeType === 'range') {
        params.startChapter = startChapter;
        params.endChapter = endChapter;
      }

      await chapterService.generateChapters(project.name, params);
      setRangeModalVisible(false);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to generate chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  // 重新生成单章
  const handleRegenerateChapter = async (chapter: Chapter) => {
    try {
      setLoading(true);
      await chapterService.generateChapters(project.name, {
        volume: chapter.volume,
        specificChapter: chapter.chapter,
        force: true,
      });
      onRefresh?.();
    } catch (error) {
      console.error('Failed to regenerate chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  // 暂停生成
  const handlePause = async () => {
    try {
      setLoading(true);
      await chapterService.pauseChapters(project.name);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to pause chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  // 恢复生成
  const handleResume = async () => {
    try {
      setLoading(true);
      await chapterService.resumeChapters(project.name);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to resume chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  // 查看章节内容
  const handlePreview = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setPreviewModalVisible(true);
  };

  // 查看校验结果
  const handleViewValidation = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setValidationDrawerVisible(true);
  };

  // 表格列定义
  const columns = [
    {
      title: '卷',
      dataIndex: 'volume',
      key: 'volume',
      width: 80,
      sorter: (a: Chapter, b: Chapter) => a.volume - b.volume,
    },
    {
      title: '章节',
      dataIndex: 'chapter',
      key: 'chapter',
      width: 80,
      sorter: (a: Chapter, b: Chapter) => a.chapter - b.chapter,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: Chapter['status']) => getStatusTag(status),
      filters: [
        { text: '未生成', value: 'pending' },
        { text: '生成中', value: 'generating' },
        { text: '已完成', value: 'completed' },
        { text: '失败', value: 'failed' },
      ],
      onFilter: (value: any, record: Chapter) => record.status === value,
    },
    {
      title: '字数',
      dataIndex: 'wordCount',
      key: 'wordCount',
      width: 100,
      render: (wordCount?: number) => wordCount ? wordCount.toLocaleString() : '-',
    },
    {
      title: '校验',
      key: 'validation',
      width: 100,
      render: (_: any, record: Chapter) => {
        if (!record.validationResult) return '-';
        return record.validationResult.passed ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            通过
          </Tag>
        ) : (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            失败 ({record.validationResult.violations.length})
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: any, record: Chapter) => (
        <Space size="small">
          {record.status === 'completed' && (
            <>
              <Tooltip title="预览内容">
                <Button
                  type="link"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => handlePreview(record)}
                />
              </Tooltip>
              {record.validationResult && (
                <Tooltip title="查看校验结果">
                  <Button
                    type="link"
                    size="small"
                    icon={<SafetyOutlined />}
                    onClick={() => handleViewValidation(record)}
                  />
                </Tooltip>
              )}
            </>
          )}
          {(record.status === 'failed' || record.status === 'completed') && (
            <Tooltip title="重新生成">
              <Button
                type="link"
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => handleRegenerateChapter(record)}
                loading={loading}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const isGenerating = project.status === 'generating';
  const isPaused = project.status === 'paused';

  return (
    <Card title="章节管理" style={{ marginTop: 16 }}>
      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Statistic title="总章节数" value={stats.total} />
        </Col>
        <Col span={6}>
          <Statistic
            title="已完成"
            value={stats.completed}
            valueStyle={{ color: '#3f8600' }}
            suffix={`/ ${stats.total}`}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="生成中"
            value={stats.generating}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="失败"
            value={stats.failed}
            valueStyle={{ color: '#cf1322' }}
          />
        </Col>
      </Row>

      {/* 进度条 */}
      {stats.total > 0 && (
        <Progress
          percent={Math.round((stats.completed / stats.total) * 100)}
          status={stats.failed > 0 ? 'exception' : isGenerating ? 'active' : 'success'}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 操作按钮 */}
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handleGenerateAll}
          loading={loading}
          disabled={isGenerating || stats.completed === stats.total}
        >
          生成所有章节
        </Button>
        <Button
          icon={<PlayCircleOutlined />}
          onClick={() => setRangeModalVisible(true)}
          loading={loading}
          disabled={isGenerating}
        >
          生成指定范围
        </Button>
        {isGenerating && (
          <Button
            icon={<PauseCircleOutlined />}
            onClick={handlePause}
            loading={loading}
          >
            暂停生成
          </Button>
        )}
        {isPaused && (
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleResume}
            loading={loading}
          >
            恢复生成
          </Button>
        )}
      </Space>

      {/* 章节列表 */}
      <Table
        columns={columns}
        dataSource={project.chapters || []}
        rowKey={(record) => `${record.volume}-${record.chapter}`}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 章`,
        }}
        size="small"
      />

      {/* 生成范围对话框 */}
      <Modal
        title="生成指定范围"
        open={rangeModalVisible}
        onOk={handleGenerateRange}
        onCancel={() => setRangeModalVisible(false)}
        confirmLoading={loading}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text>选择生成范围：</Text>
            <Select
              value={rangeType}
              onChange={setRangeType}
              style={{ width: '100%', marginTop: 8 }}
            >
              <Option value="all">所有章节</Option>
              <Option value="volume">指定卷</Option>
              <Option value="range">指定章节范围</Option>
            </Select>
          </div>

          {rangeType === 'volume' && (
            <div>
              <Text>选择卷：</Text>
              <InputNumber
                min={1}
                max={project.metadata.volumes}
                value={selectedVolume}
                onChange={(value) => setSelectedVolume(value || 1)}
                style={{ width: '100%', marginTop: 8 }}
              />
            </div>
          )}

          {rangeType === 'range' && (
            <>
              <div>
                <Text>起始章节：</Text>
                <InputNumber
                  min={1}
                  max={project.metadata.totalChapters}
                  value={startChapter}
                  onChange={(value) => setStartChapter(value || 1)}
                  style={{ width: '100%', marginTop: 8 }}
                />
              </div>
              <div>
                <Text>结束章节：</Text>
                <InputNumber
                  min={startChapter}
                  max={project.metadata.totalChapters}
                  value={endChapter}
                  onChange={(value) => setEndChapter(value || 1)}
                  style={{ width: '100%', marginTop: 8 }}
                />
              </div>
            </>
          )}
        </Space>
      </Modal>

      {/* 内容预览对话框 */}
      <Modal
        title={`第 ${selectedChapter?.volume} 卷 第 ${selectedChapter?.chapter} 章 - ${selectedChapter?.title}`}
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedChapter?.content ? (
          <Paragraph style={{ whiteSpace: 'pre-wrap', maxHeight: 500, overflow: 'auto' }}>
            {selectedChapter.content}
          </Paragraph>
        ) : (
          <Text type="secondary">暂无内容</Text>
        )}
        {selectedChapter?.wordCount && (
          <Text type="secondary" style={{ marginTop: 16, display: 'block' }}>
            字数：{selectedChapter.wordCount.toLocaleString()}
          </Text>
        )}
      </Modal>

      {/* 校验结果抽屉 */}
      <Drawer
        title="校验结果详情"
        placement="right"
        width={720}
        open={validationDrawerVisible}
        onClose={() => setValidationDrawerVisible(false)}
      >
        {selectedChapter && (
          <ValidationResults
            validationResult={selectedChapter.validationResult}
            chapterTitle={`第 ${selectedChapter.volume} 卷 第 ${selectedChapter.chapter} 章 - ${selectedChapter.title}`}
          />
        )}
      </Drawer>
    </Card>
  );
};
