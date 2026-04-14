/**
 * ValidationResults Component
 * 校验结果展示组件 - 显示章节的九项校验结果和修复历史
 */

import { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Typography,
  Select,
  Alert,
  Collapse,
  Statistic,
  Row,
  Col,
  Empty,
  Badge,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { ValidationResult, Violation, ValidationType } from '../../types';

const { Text, Paragraph } = Typography;
const { Option } = Select;

interface ValidationResultsProps {
  validationResult?: ValidationResult;
  chapterTitle?: string;
}

export const ValidationResults: React.FC<ValidationResultsProps> = ({
  validationResult,
  chapterTitle,
}) => {
  const [selectedType, setSelectedType] = useState<ValidationType | 'all'>('all');

  // 如果没有校验结果，显示空状态
  if (!validationResult) {
    return (
      <Card title="校验结果">
        <Empty description="暂无校验结果" />
      </Card>
    );
  }

  // 按类型分组违规项
  const violationsByType = useMemo(() => {
    const grouped = new Map<ValidationType, Violation[]>();
    validationResult.violations.forEach((violation) => {
      const existing = grouped.get(violation.type) || [];
      grouped.set(violation.type, [...existing, violation]);
    });
    return grouped;
  }, [validationResult.violations]);

  // 统计信息
  const stats = useMemo(() => {
    const total = validationResult.violations.length;
    const critical = validationResult.violations.filter((v) => v.severity === 'critical').length;
    const warning = validationResult.violations.filter((v) => v.severity === 'warning').length;
    const typeCount = violationsByType.size;

    return { total, critical, warning, typeCount };
  }, [validationResult.violations, violationsByType]);

  // 过滤后的违规项
  const filteredViolations = useMemo(() => {
    if (selectedType === 'all') {
      return validationResult.violations;
    }
    return validationResult.violations.filter((v) => v.type === selectedType);
  }, [validationResult.violations, selectedType]);

  // 获取严重程度标签
  const getSeverityTag = (severity: Violation['severity']) => {
    if (severity === 'critical') {
      return (
        <Tag color="error" icon={<CloseCircleOutlined />}>
          严重
        </Tag>
      );
    }
    return (
      <Tag color="warning" icon={<WarningOutlined />}>
        警告
      </Tag>
    );
  };

  // 获取校验类型标签
  const getTypeLabel = (type: ValidationType): string => {
    const labels: Record<ValidationType, string> = {
      world_rule: '世界规则校验',
      spacetime: '时空校验',
      information_logic: '信息逻辑校验',
      character_behavior: '角色行为校验',
      ability: '能力校验',
      inventory: '物品状态校验',
      hook: '伏笔校验',
      background: '常识背景校验',
      narrative_logic: '叙事逻辑校验',
    };
    return labels[type] || type;
  };

  // 表格列定义
  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 150,
      render: (type: ValidationType) => (
        <Tag color="blue">{getTypeLabel(type)}</Tag>
      ),
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: Violation['severity']) => getSeverityTag(severity),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
      width: 150,
      render: (location?: string) => location || '-',
    },
  ];

  return (
    <Card
      title={
        <Space>
          <span>校验结果</span>
          {chapterTitle && <Text type="secondary">- {chapterTitle}</Text>}
        </Space>
      }
    >
      {/* 校验状态摘要 */}
      <Alert
        message={
          validationResult.passed ? (
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <Text strong>校验通过</Text>
            </Space>
          ) : (
            <Space>
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
              <Text strong>校验失败</Text>
              <Text type="secondary">
                发现 {stats.total} 个问题（{stats.critical} 个严重，{stats.warning} 个警告）
              </Text>
            </Space>
          )
        }
        type={validationResult.passed ? 'success' : 'error'}
        style={{ marginBottom: 16 }}
        showIcon
      />

      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Statistic
            title="总违规项"
            value={stats.total}
            prefix={<InfoCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="严重问题"
            value={stats.critical}
            valueStyle={{ color: '#cf1322' }}
            prefix={<CloseCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="警告"
            value={stats.warning}
            valueStyle={{ color: '#faad14' }}
            prefix={<WarningOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="修复轮次"
            value={validationResult.fixRounds}
            prefix={<InfoCircleOutlined />}
          />
        </Col>
      </Row>

      {/* 如果有违规项，显示详细信息 */}
      {stats.total > 0 && (
        <>
          {/* 类型筛选 */}
          <Space style={{ marginBottom: 16 }}>
            <Text>按类型筛选：</Text>
            <Select
              value={selectedType}
              onChange={setSelectedType}
              style={{ width: 200 }}
            >
              <Option value="all">全部类型 ({stats.total})</Option>
              {Array.from(violationsByType.entries()).map(([type, violations]) => (
                <Option key={type} value={type}>
                  {getTypeLabel(type)} ({violations.length})
                </Option>
              ))}
            </Select>
          </Space>

          {/* 违规项列表 */}
          <Table
            columns={columns}
            dataSource={filteredViolations}
            rowKey={(record, index) => `${record.type}-${index}`}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 项`,
            }}
            expandable={{
              expandedRowRender: (record) => (
                <div style={{ padding: '8px 0' }}>
                  {record.suggestion && (
                    <div style={{ marginBottom: 8 }}>
                      <Text strong>修复建议：</Text>
                      <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>
                        {record.suggestion}
                      </Paragraph>
                    </div>
                  )}
                  <div>
                    <Text type="secondary">
                      校验类型：{getTypeLabel(record.type)}
                    </Text>
                  </div>
                </div>
              ),
            }}
            size="small"
          />

          {/* 按类型分组展示 */}
          <Collapse
            style={{ marginTop: 16 }}
            items={Array.from(violationsByType.entries()).map(([type, violations]) => ({
              key: type,
              label: (
                <Space>
                  <Badge count={violations.length} showZero>
                    <Tag color="blue">{getTypeLabel(type)}</Tag>
                  </Badge>
                  <Text type="secondary">
                    {violations.filter((v) => v.severity === 'critical').length} 个严重，
                    {violations.filter((v) => v.severity === 'warning').length} 个警告
                  </Text>
                </Space>
              ),
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {violations.map((violation, index) => (
                    <Card
                      key={index}
                      size="small"
                      title={
                        <Space>
                          {getSeverityTag(violation.severity)}
                          {violation.location && (
                            <Text type="secondary">{violation.location}</Text>
                          )}
                        </Space>
                      }
                    >
                      <Paragraph>{violation.description}</Paragraph>
                      {violation.suggestion && (
                        <Alert
                          message="修复建议"
                          description={violation.suggestion}
                          type="info"
                          showIcon
                          icon={<InfoCircleOutlined />}
                        />
                      )}
                    </Card>
                  ))}
                </Space>
              ),
            }))}
          />
        </>
      )}

      {/* 校验时间 */}
      <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
        校验时间：{new Date(validationResult.timestamp).toLocaleString('zh-CN')}
      </Text>
    </Card>
  );
};
