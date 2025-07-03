import React, { useEffect } from 'react';
import { Layout, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/Header';
import MainSection from './MainSection';
import AppFooter from '../../components/Footer';
import { parseDerivAuthTokens } from '../../services/parseDerivAuth';
import '../../assets/css/pages/landing/LandingPage.css';

const { Content } = Layout;

const LandingPage = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    const accounts = parseDerivAuthTokens();

    if (accounts.length > 0) {
      // Store the accounts in localStorage for later use
      localStorage.setItem('accounts', JSON.stringify(accounts));

      // Display success message
      messageApi.open({
        type: 'success',
        content: 'Login successful!',
      });

      navigate('/dashboard');
    }
  }, [navigate, messageApi]);

  return (
    <Layout className="landing-page-layout">
      {contextHolder} {/* Add contextHolder to render the message */}
      <AppHeader />
      <Content className="landing-page-content">
        <MainSection />
      </Content>
      <AppFooter />
    </Layout>
  );
};

export default LandingPage;