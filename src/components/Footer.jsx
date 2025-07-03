import React from 'react';
import { Layout, Row, Col, Typography } from 'antd';
import '../assets/css/components/Footer.css';

const { Footer } = Layout;
const { Text } = Typography;

const AppFooter = () => {
  return (
    <Footer className="footer">
      <div className="footer-container">
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Text className="footer-text">
              © {new Date().getFullYear()} Denara. Your trading made easier.
            </Text>
          </Col>
        </Row>
      </div>
    </Footer>
  );
};

export default AppFooter;