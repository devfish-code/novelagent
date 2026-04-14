import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { MainLayout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

// 懒加载页面组件
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const NewProject = lazy(() => import('./pages/NewProject').then(module => ({ default: module.NewProject })));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail').then(module => ({ default: module.ProjectDetail })));
const ConfigEditor = lazy(() => import('./pages/ConfigEditor').then(module => ({ default: module.ConfigEditor })));

// 加载中组件
const LoadingFallback = () => (
  <div style={{ textAlign: 'center', padding: '60px 0' }}>
    <Spin size="large" tip="加载中..." />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 6,
          },
        }}
      >
        <Router>
          <MainLayout>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/projects/new" element={<NewProject />} />
                <Route path="/projects/:name" element={<ProjectDetail />} />
                <Route path="/config" element={<ConfigEditor />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </MainLayout>
        </Router>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
