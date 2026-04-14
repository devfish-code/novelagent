/**
 * WorldStateViewer Component
 * 世界状态查看器 - 显示角色、地点、规则、时间线和伏笔
 */

import { useState, useMemo } from 'react';
import {
  Card,
  Tabs,
  Table,
  Tag,
  Space,
  Input,
  Select,
  Typography,
  Descriptions,
  Timeline,
  Badge,
  Empty,
  Collapse,
} from 'antd';
import {
  UserOutlined,
  EnvironmentOutlined,
  BookOutlined,
  ClockCircleOutlined,
  BulbOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { WorldState } from '../../types';

const { Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

interface WorldStateViewerProps {
  worldState?: WorldState;
}

export const WorldStateViewer: React.FC<WorldStateViewerProps> = ({ worldState }) => {
  const [searchText, setSearchText] = useState('');
  const [characterFilter, setCharacterFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [hookStatusFilter, setHookStatusFilter] = useState<string>('all');

  // 如果没有世界状态数据，显示空状态
  if (!worldState) {
    return (
      <Card title="世界状态">
        <Empty description="暂无世界状态数据" />
      </Card>
    );
  }

  // 角色筛选
  const filteredCharacters = useMemo(() => {
    return worldState.characters.filter((char) => {
      const matchSearch = searchText
        ? char.name.toLowerCase().includes(searchText.toLowerCase()) ||
          char.role.toLowerCase().includes(searchText.toLowerCase())
        : true;
      const matchFilter = characterFilter === 'all' || char.role === characterFilter;
      return matchSearch && matchFilter;
    });
  }, [worldState.characters, searchText, characterFilter]);

  // 地点筛选
  const filteredLocations = useMemo(() => {
    return worldState.locations.filter((loc) => {
      const matchSearch = searchText
        ? loc.name.toLowerCase().includes(searchText.toLowerCase()) ||
          loc.type.toLowerCase().includes(searchText.toLowerCase())
        : true;
      const matchFilter = locationFilter === 'all' || loc.type === locationFilter;
      return matchSearch && matchFilter;
    });
  }, [worldState.locations, searchText, locationFilter]);

  // 伏笔筛选
  const filteredHooks = useMemo(() => {
    return worldState.hooks.filter((hook) => {
      const matchSearch = searchText
        ? hook.description.toLowerCase().includes(searchText.toLowerCase())
        : true;
      const matchFilter = hookStatusFilter === 'all' || hook.status === hookStatusFilter;
      return matchSearch && matchFilter;
    });
  }, [worldState.hooks, searchText, hookStatusFilter]);

  // 角色表格列
  const characterColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (name: string) => (
        <Space>
          <UserOutlined />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => <Tag color="blue">{role}</Tag>,
    },
    {
      title: '性格',
      dataIndex: 'personality',
      key: 'personality',
      ellipsis: true,
    },
    {
      title: '能力',
      dataIndex: 'abilities',
      key: 'abilities',
      width: 200,
      render: (abilities: string[]) => (
        <Space wrap>
          {abilities.slice(0, 3).map((ability, index) => (
            <Tag key={index} color="green">
              {ability}
            </Tag>
          ))}
          {abilities.length > 3 && <Tag>+{abilities.length - 3}</Tag>}
        </Space>
      ),
    },
    {
      title: '当前状态',
      dataIndex: 'currentStatus',
      key: 'currentStatus',
      width: 150,
      ellipsis: true,
    },
  ];

  // 地点表格列
  const locationColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string) => (
        <Space>
          <EnvironmentOutlined />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => <Tag color="purple">{type}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '特征',
      dataIndex: 'features',
      key: 'features',
      width: 200,
      render: (features: string[]) => (
        <Space wrap>
          {features.slice(0, 2).map((feature, index) => (
            <Tag key={index}>{feature}</Tag>
          ))}
          {features.length > 2 && <Tag>+{features.length - 2}</Tag>}
        </Space>
      ),
    },
  ];

  // 伏笔状态图标
  const getHookStatusIcon = (status: string) => {
    switch (status) {
      case 'planted':
        return <SyncOutlined style={{ color: '#1890ff' }} />;
      case 'resolved':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'pending':
        return <CloseCircleOutlined style={{ color: '#faad14' }} />;
      default:
        return null;
    }
  };

  // 伏笔状态标签
  const getHookStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      planted: { color: 'processing', text: '已埋设' },
      resolved: { color: 'success', text: '已回收' },
      pending: { color: 'warning', text: '待处理' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  return (
    <Card title="世界状态">
      {/* 搜索栏 */}
      <Space style={{ marginBottom: 16, width: '100%' }}>
        <Input
          placeholder="搜索..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
      </Space>

      {/* 标签页 */}
      <Tabs
        items={[
          {
            key: 'characters',
            label: (
              <Space>
                <UserOutlined />
                角色档案
                <Badge count={worldState.characters.length} showZero />
              </Space>
            ),
            children: (
              <div>
                <Space style={{ marginBottom: 16 }}>
                  <Text>角色类型：</Text>
                  <Select
                    value={characterFilter}
                    onChange={setCharacterFilter}
                    style={{ width: 150 }}
                  >
                    <Option value="all">全部</Option>
                    <Option value="主角">主角</Option>
                    <Option value="配角">配角</Option>
                    <Option value="反派">反派</Option>
                  </Select>
                </Space>
                <Table
                  columns={characterColumns}
                  dataSource={filteredCharacters}
                  rowKey="id"
                  expandable={{
                    expandedRowRender: (record) => (
                      <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="背景">
                          {record.background}
                        </Descriptions.Item>
                        <Descriptions.Item label="能力">
                          <Space wrap>
                            {record.abilities.map((ability, index) => (
                              <Tag key={index} color="green">
                                {ability}
                              </Tag>
                            ))}
                          </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="关系">
                          {Object.entries(record.relationships).map(([name, relation]) => (
                            <div key={name}>
                              <Text strong>{name}</Text>: {relation}
                            </div>
                          ))}
                        </Descriptions.Item>
                        <Descriptions.Item label="持有物品">
                          <Space wrap>
                            {record.inventory.map((item, index) => (
                              <Tag key={index}>{item}</Tag>
                            ))}
                          </Space>
                        </Descriptions.Item>
                      </Descriptions>
                    ),
                  }}
                  pagination={{ pageSize: 10 }}
                />
              </div>
            ),
          },
          {
            key: 'locations',
            label: (
              <Space>
                <EnvironmentOutlined />
                地点信息
                <Badge count={worldState.locations.length} showZero />
              </Space>
            ),
            children: (
              <div>
                <Space style={{ marginBottom: 16 }}>
                  <Text>地点类型：</Text>
                  <Select
                    value={locationFilter}
                    onChange={setLocationFilter}
                    style={{ width: 150 }}
                  >
                    <Option value="all">全部</Option>
                    <Option value="城市">城市</Option>
                    <Option value="建筑">建筑</Option>
                    <Option value="自然">自然</Option>
                  </Select>
                </Space>
                <Table
                  columns={locationColumns}
                  dataSource={filteredLocations}
                  rowKey="id"
                  expandable={{
                    expandedRowRender: (record) => (
                      <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="完整描述">
                          {record.description}
                        </Descriptions.Item>
                        <Descriptions.Item label="特征">
                          <Space wrap>
                            {record.features.map((feature, index) => (
                              <Tag key={index}>{feature}</Tag>
                            ))}
                          </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="连接地点">
                          <Space wrap>
                            {record.connectedTo.map((loc, index) => (
                              <Tag key={index} color="blue">
                                {loc}
                              </Tag>
                            ))}
                          </Space>
                        </Descriptions.Item>
                      </Descriptions>
                    ),
                  }}
                  pagination={{ pageSize: 10 }}
                />
              </div>
            ),
          },
          {
            key: 'rules',
            label: (
              <Space>
                <BookOutlined />
                世界规则
                <Badge count={worldState.rules.length} showZero />
              </Space>
            ),
            children: (
              <Collapse>
                {worldState.rules.map((rule) => (
                  <Panel
                    key={rule.id}
                    header={
                      <Space>
                        <Tag color="orange">{rule.category}</Tag>
                        <Text strong>{rule.title}</Text>
                      </Space>
                    }
                  >
                    <Paragraph>{rule.description}</Paragraph>
                    {rule.constraints.length > 0 && (
                      <div>
                        <Text strong>约束条件：</Text>
                        <ul>
                          {rule.constraints.map((constraint, index) => (
                            <li key={index}>{constraint}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Panel>
                ))}
              </Collapse>
            ),
          },
          {
            key: 'timeline',
            label: (
              <Space>
                <ClockCircleOutlined />
                时间线
                <Badge count={worldState.timeline.length} showZero />
              </Space>
            ),
            children: (
              <Timeline
                mode="left"
                items={worldState.timeline.map((event) => ({
                  label: event.timestamp,
                  children: (
                    <Card size="small">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                          <Tag color={event.significance === 'major' ? 'red' : 'blue'}>
                            {event.significance === 'major' ? '重要' : '次要'}
                          </Tag>
                          <Tag>{event.chapter}</Tag>
                        </div>
                        <Text strong>{event.event}</Text>
                        <div>
                          <Text type="secondary">涉及角色：</Text>
                          <Space wrap>
                            {event.characters.map((char, index) => (
                              <Tag key={index} icon={<UserOutlined />}>
                                {char}
                              </Tag>
                            ))}
                          </Space>
                        </div>
                        <div>
                          <Text type="secondary">地点：</Text>
                          <Tag icon={<EnvironmentOutlined />}>{event.location}</Tag>
                        </div>
                      </Space>
                    </Card>
                  ),
                  color: event.significance === 'major' ? 'red' : 'blue',
                }))}
              />
            ),
          },
          {
            key: 'hooks',
            label: (
              <Space>
                <BulbOutlined />
                伏笔追踪
                <Badge count={worldState.hooks.length} showZero />
              </Space>
            ),
            children: (
              <div>
                <Space style={{ marginBottom: 16 }}>
                  <Text>状态：</Text>
                  <Select
                    value={hookStatusFilter}
                    onChange={setHookStatusFilter}
                    style={{ width: 150 }}
                  >
                    <Option value="all">全部</Option>
                    <Option value="planted">已埋设</Option>
                    <Option value="resolved">已回收</Option>
                    <Option value="pending">待处理</Option>
                  </Select>
                </Space>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {filteredHooks.map((hook) => (
                    <Card key={hook.id} size="small">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                          {getHookStatusIcon(hook.status)}
                          {getHookStatusTag(hook.status)}
                          <Tag color="cyan">{hook.type === 'foreshadowing' ? '伏笔' : '回调'}</Tag>
                          <Tag>{hook.chapter}</Tag>
                        </div>
                        <Paragraph>{hook.description}</Paragraph>
                        {hook.relatedChapters.length > 0 && (
                          <div>
                            <Text type="secondary">相关章节：</Text>
                            <Space wrap>
                              {hook.relatedChapters.map((chapter, index) => (
                                <Tag key={index}>{chapter}</Tag>
                              ))}
                            </Space>
                          </div>
                        )}
                      </Space>
                    </Card>
                  ))}
                </Space>
              </div>
            ),
          },
        ]}
      />
    </Card>
  );
};
