/**
 * ExportManager Component
 * 导出管理组件 - 导出小说产物并下载文件
 */

import { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Select,
  Checkbox,
  Typography,
  Alert,
  List,
  Tag,
  message,
  Divider,
  Row,
  Col,
} from 'antd';
import {
  DownloadOutlined,
  FileTextOutlined,
  FileMarkdownOutlined,
  FileOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ExportFormat, ExportFile } from '../../types';
import { exportService } from '../../services';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface ExportManagerProps {
  projectName: string;
}

interface ExportedFile {
  filename: string;
  downloadUrl: string;
  size: number;
  timestamp: string;
}

export const ExportManager: React.FC<ExportManagerProps> = ({ projectName }) => {
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [selectedFiles, setSelectedFiles] = useState<ExportFile[]>([
    'novel',
    'world',
    'characters',
    'outline',
  ]);
  const [loading, setLoading] = useState(false);
  const [exportedFiles, setExportedFiles] = useState<ExportedFile[]>([]);

  // 可导出的文件选项
  const fileOptions: { value: ExportFile; label: string; description: string }[] = [
    {
      value: 'novel',
      label: '完整小说',
      description: '包含所有章节的完整小说文本',
    },
    {
      value: 'world',
      label: '世界观文档',
      description: '世界设定、规则和背景信息',
    },
    {
      value: 'characters',
      label: '角色档案',
      description: '所有角色的详细档案和关系',
    },
    {
      value: 'outline',
      label: '大纲文档',
      description: '三层大纲结构（全书、卷、章）',
    },
    {
      value: 'timeline',
      label: '时间线',
      description: '故事时间线和关键事件',
    },
    {
      value: 'report',
      label: '质量报告',
      description: '校验结果和质量分析报告',
    },
  ];

  // 处理文件选择
  const handleFileChange = (checkedValues: ExportFile[]) => {
    setSelectedFiles(checkedValues);
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedFiles.length === fileOptions.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(fileOptions.map((opt) => opt.value));
    }
  };

  // 执行导出
  const handleExport = async () => {
    if (selectedFiles.length === 0) {
      message.warning('请至少选择一个文件');
      return;
    }

    try {
      setLoading(true);
      const response = await exportService.exportProject(projectName, {
        format,
        files: selectedFiles,
      });

      // 添加到导出历史
      const newFiles: ExportedFile[] = response.files.map((file) => ({
        ...file,
        timestamp: new Date().toISOString(),
      }));
      setExportedFiles([...newFiles, ...exportedFiles]);

      message.success(`成功导出 ${response.files.length} 个文件`);
    } catch (error: any) {
      message.error(error.message || '导出失败');
    } finally {
      setLoading(false);
    }
  };

  // 下载单个文件
  const handleDownload = (file: ExportedFile) => {
    exportService.downloadFile(projectName, file.filename);
    message.success(`开始下载：${file.filename}`);
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // 获取文件图标
  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.md')) return <FileMarkdownOutlined />;
    if (filename.endsWith('.json')) return <FileOutlined />;
    return <FileTextOutlined />;
  };

  return (
    <Card title="导出管理">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 导出配置 */}
        <div>
          <Title level={5}>导出配置</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* 格式选择 */}
            <div>
              <Text strong>导出格式：</Text>
              <Select
                value={format}
                onChange={setFormat}
                style={{ width: 200, marginLeft: 8 }}
              >
                <Option value="markdown">
                  <Space>
                    <FileMarkdownOutlined />
                    Markdown
                  </Space>
                </Option>
                <Option value="json">
                  <Space>
                    <FileOutlined />
                    JSON
                  </Space>
                </Option>
              </Select>
            </div>

            {/* 文件选择 */}
            <div>
              <div style={{ marginBottom: 8 }}>
                <Text strong>选择文件：</Text>
                <Button
                  type="link"
                  size="small"
                  onClick={handleSelectAll}
                  style={{ marginLeft: 8 }}
                >
                  {selectedFiles.length === fileOptions.length ? '取消全选' : '全选'}
                </Button>
              </div>
              <Checkbox.Group
                value={selectedFiles}
                onChange={handleFileChange as any}
                style={{ width: '100%' }}
              >
                <Row gutter={[16, 16]}>
                  {fileOptions.map((option) => (
                    <Col span={12} key={option.value}>
                      <Card size="small" hoverable>
                        <Checkbox value={option.value}>
                          <Space direction="vertical" size={0}>
                            <Text strong>{option.label}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {option.description}
                            </Text>
                          </Space>
                        </Checkbox>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Checkbox.Group>
            </div>
          </Space>
        </div>

        {/* 导出按钮 */}
        <div>
          <Button
            type="primary"
            size="large"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={loading}
            disabled={selectedFiles.length === 0}
          >
            导出选中文件 ({selectedFiles.length})
          </Button>
          <Alert
            message="提示"
            description="导出的文件将保留 24 小时，请及时下载"
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        </div>

        <Divider />

        {/* 导出历史 */}
        <div>
          <Title level={5}>导出历史</Title>
          {exportedFiles.length === 0 ? (
            <Alert
              message="暂无导出记录"
              description="导出文件后，可以在这里查看和下载"
              type="info"
              showIcon
            />
          ) : (
            <List
              dataSource={exportedFiles}
              renderItem={(file) => (
                <List.Item
                  actions={[
                    <Button
                      type="link"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(file)}
                    >
                      下载
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={getFileIcon(file.filename)}
                    title={
                      <Space>
                        <Text>{file.filename}</Text>
                        <Tag color="blue">{formatFileSize(file.size)}</Tag>
                      </Space>
                    }
                    description={
                      <Space>
                        <Text type="secondary">
                          导出时间：{new Date(file.timestamp).toLocaleString('zh-CN')}
                        </Text>
                        <Tag icon={<CheckCircleOutlined />} color="success">
                          可下载
                        </Tag>
                      </Space>
                    }
                  />
                </List.Item>
              )}
              bordered
            />
          )}
        </div>

        {/* 使用说明 */}
        <Alert
          message="使用说明"
          description={
            <div>
              <Paragraph style={{ marginBottom: 8 }}>
                1. 选择导出格式（Markdown 或 JSON）
              </Paragraph>
              <Paragraph style={{ marginBottom: 8 }}>
                2. 勾选需要导出的文件类型
              </Paragraph>
              <Paragraph style={{ marginBottom: 8 }}>
                3. 点击"导出选中文件"按钮开始导出
              </Paragraph>
              <Paragraph style={{ marginBottom: 0 }}>
                4. 导出完成后，在"导出历史"中点击"下载"按钮下载文件
              </Paragraph>
            </div>
          }
          type="info"
          showIcon
        />
      </Space>
    </Card>
  );
};
