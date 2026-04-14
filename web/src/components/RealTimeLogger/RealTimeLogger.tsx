import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Card, Select, Input, Button, Space, Typography, Tag, Empty } from 'antd';
import {
  DownloadOutlined,
  ClearOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useLogStore } from '../../store';

const { Text } = Typography;
const { Option } = Select;

interface RealTimeLoggerProps {
  projectName: string;
  height?: number;
}

const levelColors = {
  debug: 'default',
  info: 'blue',
  warn: 'orange',
  error: 'red',
} as const;

const levelLabels = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
} as const;

export const RealTimeLogger: React.FC<RealTimeLoggerProps> = ({
  projectName,
  height = 400,
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const { getFilteredLogs, setFilter, clearLogs, filters } = useLogStore();
  
  // 使用 useMemo 缓存过滤后的日志
  const logs = useMemo(() => getFilteredLogs(projectName), [projectName, getFilteredLogs]);

  // 样式对象（使用 useMemo 避免重复创建）
  const styles = useMemo(() => ({
    logContainer: {
      backgroundColor: '#f5f5f5',
      borderRadius: '4px',
      padding: '12px',
      fontFamily: "'Courier New', Courier, monospace",
    },
    logEntry: {
      padding: '8px',
      backgroundColor: 'white',
      borderRadius: '4px',
      borderLeft: '3px solid #d9d9d9',
      transition: 'all 0.2s',
      marginBottom: '8px',
    },
  }), []);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // 检测用户滚动
  const handleScroll = () => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  // 导出日志
  const handleExport = () => {
    const logText = logs
      .map((log) => {
        const timestamp = new Date(log.timestamp).toLocaleString('zh-CN');
        const context = log.context ? ` ${JSON.stringify(log.context)}` : '';
        return `[${timestamp}] [${log.level.toUpperCase()}] ${log.message}${context}`;
      })
      .join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 清空日志
  const handleClear = () => {
    clearLogs(projectName);
  };

  return (
    <Card
      title="实时日志"
      extra={
        <Space>
          <Select
            value={filters.level}
            onChange={(value) => setFilter({ level: value })}
            style={{ width: 100 }}
            allowClear
            placeholder="级别"
          >
            <Option value="debug">DEBUG</Option>
            <Option value="info">INFO</Option>
            <Option value="warn">WARN</Option>
            <Option value="error">ERROR</Option>
          </Select>
          <Input
            placeholder="搜索日志"
            prefix={<SearchOutlined />}
            value={filters.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            style={{ width: 200 }}
            allowClear
          />
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={logs.length === 0}
          >
            导出
          </Button>
          <Button
            icon={<ClearOutlined />}
            onClick={handleClear}
            disabled={logs.length === 0}
          >
            清空
          </Button>
        </Space>
      }
    >
      <div
        ref={logContainerRef}
        style={{ ...styles.logContainer, height, overflowY: 'auto' }}
        onScroll={handleScroll}
      >
        {logs.length === 0 ? (
          <Empty description="暂无日志" />
        ) : (
          <div>
            {logs.map((log) => (
              <div key={log.id} style={styles.logEntry}>
                <Space size="small">
                  <Text type="secondary" style={{ fontSize: 12, minWidth: 160 }}>
                    {new Date(log.timestamp).toLocaleString('zh-CN')}
                  </Text>
                  <Tag color={levelColors[log.level]} style={{ minWidth: 60, textAlign: 'center' }}>
                    {levelLabels[log.level]}
                  </Tag>
                  <Text style={{ flex: 1 }}>{log.message}</Text>
                </Space>
                {log.context && Object.keys(log.context).length > 0 && (
                  <div style={{ marginLeft: 180, marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {JSON.stringify(log.context)}
                    </Text>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {!autoScroll && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Button
            size="small"
            type="link"
            onClick={() => {
              setAutoScroll(true);
              if (logContainerRef.current) {
                logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
              }
            }}
          >
            滚动到底部
          </Button>
        </div>
      )}
    </Card>
  );
};
