import React, { useState } from 'react';
import { Card, Button, Checkbox, Typography, Space, Modal } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import '../assets/css/components/RiskDisclosure.css';

const { Title, Paragraph } = Typography;

const RiskDisclosure = () => {
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const navigate = useNavigate();

  const handleContinue = () => {
    setIsModalVisible(true); 
    localStorage.setItem('riskDisclosureAcknowledged', 'true'); 
  };

  const handleModalConfirm = () => {
    setIsModalVisible(false);
    navigate('/dashboard/home'); // Navigate to dashboard home
  };

  return (
    <div className="risk-disclosure-container">
      <Card
        title={
          <Space>
            <WarningOutlined style={{ color: '#1890ff', fontSize: '20px'}} />
            <span>Risk Disclosure</span>
          </Space>
        }
        className="risk-disclosure-card"
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4} style={{ color: 'var(--text-color)' }}>Important Notice</Title>
            <Paragraph>
              Deriv offers complex derivatives, such as options and contracts for difference ("CFDs"). These products may not be suitable for all clients, and trading them puts you at risk. Please make sure that you understand the risks before trading Deriv products.
            </Paragraph>
          </div>

          <div>
            <Title level={4} style={{ color: 'var(--text-color)' }}>Risks Involved in Trading Deriv Products</Title>
            <Paragraph>
              <ul>
                <li>You may lose some or all of the money you invest in the trade.</li>
                <li>If your trade involves currency conversion, exchange rates will affect your profit and loss.</li>
                <li>Market volatility can lead to rapid price changes, increasing the risk of losses.</li>
                <li>Leverage, commonly used in CFDs, can amplify both profits and losses, potentially exceeding your initial investment.</li>
              </ul>
            </Paragraph>
          </div>

          <div>
            <Title level={4} style={{ color: 'var(--text-color)' }}>Source of Trading Funds</Title>
            <Paragraph>
              You should never trade with borrowed money or with money that you cannot afford to lose.
            </Paragraph>
          </div>

          <div>
            <Title level={4} style={{ color: 'var(--text-color)' }}>Additional Considerations</Title>
            <Paragraph>
              <ul>
                <li>Deriv products are complex and require a thorough understanding of their mechanics.</li>
                <li>Trading derivatives may not be regulated in all jurisdictions, and you should verify the regulatory status in your region.</li>
                <li>Seek independent financial advice before trading if you are unsure about the risks.</li>
              </ul>
            </Paragraph>
          </div>

          <div>
            <Checkbox
              onChange={(e) => setIsAcknowledged(e.target.checked)}
              className="acknowledgment-checkbox"
              style={{ color: 'var(--text-color)' }}
            >
              I understand the risks involved in trading Deriv products and acknowledge that I may lose some or all of my invested capital.
            </Checkbox>
          </div>

          <Button
            type="primary"
            icon={<WarningOutlined />}
            onClick={handleContinue}
            disabled={!isAcknowledged}
            className="continue-button"
          >
            Continue
          </Button>

          <Paragraph type="secondary" className="disclaimer" style={{ color: 'var(--neutral-color)' }}>
            This information is provided for educational purposes only and should not be considered as financial advice.
          </Paragraph>
        </Space>
      </Card>

      <Modal
        title="Confirmation"
        open={isModalVisible}
        onCancel={handleModalConfirm} 
        footer={[
          <Button
            key="confirm"
            type="primary"
            onClick={handleModalConfirm}
            className="happy-trading-button"
          >
            Happy Trading
          </Button>
        ]}
        centered
        className="risk-disclosure-modal"
      >
        <Space direction="vertical" size="middle">
          <Paragraph>
            Thank you for acknowledging the risks involved in trading Deriv products. You may now proceed to your account.
          </Paragraph>
          <Paragraph>
            Remember to always trade responsibly and never risk more than you can afford to lose.
          </Paragraph>
        </Space>
      </Modal>
    </div>
  );
};

export default RiskDisclosure;