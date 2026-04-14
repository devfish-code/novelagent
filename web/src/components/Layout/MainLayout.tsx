import React, { useState } from 'react';
import { Layout, Menu, Typography, Drawer, Button, Grid } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  PlusOutlined,
  SettingOutlined,
  MenuOutlined,
} from '@ant-design/icons';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;
const { useBreakpoint } = Grid;

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const [drawerVisible, setDrawerVisible] = useState(false);

  // 判断是否为移动端（< 768px）
  const isMobile = !screens.md;

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '项目仪表板',
    },
    {
      key: '/projects/new',
      icon: <PlusOutlined />,
      label: '新建项目',
    },
    {
      key: '/config',
      icon: <SettingOutlined />,
      label: '配置编辑器',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    // 移动端点击菜单后关闭抽屉
    if (isMobile) {
      setDrawerVisible(false);
    }
  };

  const toggleDrawer = () => {
    setDrawerVisible(!drawerVisible);
  };

  // 移动端使用 Drawer，桌面端使用 Sider
  const renderMenu = () => (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={handleMenuClick}
      style={{ height: '100%', borderRight: 0 }}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#001529',
          padding: isMobile ? '0 16px' : '0 24px',
        }}
      >
        <Title level={isMobile ? 4 : 3} style={{ color: 'white', margin: 0 }}>
          NovelAgent
        </Title>
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined style={{ color: 'white', fontSize: '20px' }} />}
            onClick={toggleDrawer}
          />
        )}
      </Header>
      <Layout>
        {/* 桌面端侧边栏 */}
        {!isMobile && (
          <Sider
            width={200}
            style={{ background: '#fff' }}
            breakpoint="md"
            collapsedWidth="0"
          >
            {renderMenu()}
          </Sider>
        )}

        {/* 移动端抽屉菜单 */}
        {isMobile && (
          <Drawer
            title="菜单"
            placement="left"
            onClose={toggleDrawer}
            open={drawerVisible}
            bodyStyle={{ padding: 0 }}
          >
            {renderMenu()}
          </Drawer>
        )}

        <Layout style={{ padding: isMobile ? '12px' : '24px' }}>
          <Content
            style={{
              background: '#fff',
              padding: isMobile ? 16 : 24,
              margin: 0,
              minHeight: 280,
              borderRadius: 8,
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};
