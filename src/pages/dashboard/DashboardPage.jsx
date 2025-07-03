import React, { useState } from 'react';
import { Layout, Drawer } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import DashboardHeader from './DashboardHeader';
import DashboardSidebar from './DashboardSidebar';
import { Outlet } from 'react-router-dom';
import '../../assets/css/pages/dashboard/DashboardPage.css';

const { Sider, Content } = Layout;

const DashboardPage = () => {
  const [collapsed, setCollapsed] = useState(false); // Desktop sidebar collapse state
  const [drawerVisible, setDrawerVisible] = useState(false); // Mobile drawer state

  const toggleDrawer = () => {
    setDrawerVisible(!drawerVisible);
  };

  return (
    <Layout className="dashboard-page-layout">
      <DashboardHeader
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        toggleDrawer={toggleDrawer}
        drawerVisible={drawerVisible}
      />
      <Layout className="dashboard-page-layout">
        {/* Desktop Sidebar */}
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={() => setCollapsed(!collapsed)}
          width={150}
          breakpoint="sm" // Triggers at ≤576px
          collapsedWidth={0}
          onBreakpoint={(broken) => {
            setCollapsed(broken); // Auto-collapse on mobile
          }}
          className={`dashboard-page-sider ${collapsed ? 'dashboard-page-sider-collapsed' : ''}`}
        >
          <DashboardSidebar />
        </Sider>

        {/* Mobile Drawer */}
        <Drawer
          placement="left"
          closable={true}
          onClose={toggleDrawer}
          visible={drawerVisible}
          width={150}
          zIndex={1000} // Ensure drawer is above content
          title="Menu"
        >
          <DashboardSidebar />
        </Drawer>

        <Content
          className={`dashboard-page-content ${collapsed ? 'dashboard-page-content-collapsed' : ''}`}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardPage;