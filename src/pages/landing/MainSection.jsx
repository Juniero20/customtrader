import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Divider,
  Tag,
  Avatar,
  Button,
  ConfigProvider,
  Carousel,
} from 'antd';
import {
  LineChartOutlined,
  RiseOutlined,
  NumberOutlined,
  ArrowUpOutlined,
  PhoneOutlined,
  MailOutlined,
  TwitterOutlined,
  InstagramOutlined,
  FacebookOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  BarChartOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import '../../assets/css/pages/landing/MainSection.css';

const { Title, Text, Paragraph } = Typography;

const features = [
  {
    icon: <RiseOutlined />,
    title: 'Rise/Fall',
    description: 'Predict market direction',
    path: '/trade/rise-fall',
  },
  {
    icon: <NumberOutlined />,
    title: 'Even/Odd',
    description: 'Bet on digit outcomes',
    path: '/even-odd',
  },
  {
    icon: <ArrowUpOutlined />,
    title: 'Over/Under',
    description: 'Set your price barriers',
    path: '/over-under',
  },
  {
    icon: <BarChartOutlined />,
    title: 'Matches/Differs',
    description: 'Predict the digit outcomes',
    path: '/analysis',
  },
];

const volatilityIndices = [
  'Volatility 10 Index',
  'Volatility 25 Index',
  'Volatility 50 Index',
  'Volatility 75 Index',
  'Volatility 100 Index',
  'Volatility 10 (1s) Index',
  'Volatility 25 (1s) Index',
  'Volatility 50 (1s) Index',
  'Volatility 75 (1s) Index',
  'Volatility 100 (1s) Index',
];

const educationalResources = [
  'Beginner\'s Guide to Volatility Trading',
  'Risk Management Strategies',
  'Market Analysis Techniques',
  'Trading Psychology Fundamentals',
];

const testimonials = [
  {
    name: 'James M.',
    content: 'Mulla makes forex trading simple and accessible even for beginners like me',
    role: 'Beginner Trader',
  },
  {
    name: 'Amina S.',
    content: 'The analysis tools help me make better decisions in volatile markets',
    role: 'Day Trader',
  },
  {
    name: 'David K QQ',
    content: 'Best platform for volatility index trading with tight spreads',
    role: 'Professional Trader',
  },
];

const MainSection = () => {
  const [, setIsHovering] = useState(null);

  const handleDerivAuth = async () => {
    const appId = import.meta.env.VITE_DERIV_APP_ID;
    const redirectUri = `${window.location.origin}/`;
    window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${appId}&response_type=token&scope=read&redirect_uri=${encodeURIComponent(redirectUri)}`;
    console.log('Redirecting to Deriv authentication...');
  };

  const handleDbot = async () => {
    window.location.href = `https://denarapro.com/`;
  };

  const handleSignup = async () => {
    window.location.href = 'https://hub.deriv.com/tradershub/signup?sidc=7E33F70B-5C69-47FB-85A3-B48BBFD63AA5&utm_campaign=dynamicworks&utm_medium=affiliate&utm_source=CU13613';
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#6C5CE7',
          borderRadius: 8,
          colorBgContainer: '#FFFFFF',
        },
        components: {
          Button: {
            colorPrimary: '#6C5CE7',
            colorPrimaryHover: '#8577EF',
            colorPrimaryActive: '#5649CB',
          },
          Card: {
            borderRadiusLG: 16,
          },
        },
      }}
    >
      <div className="main-section">
        {/* Hero Section */}
        <Row align="middle" justify="center" className="hero-section">
          <Col span={24}>
            <div className="hero-content">
              <Title level={1} className="hero-title">
                Trade Volatility Indices with Confidence
              </Title>
              <Paragraph className="hero-paragraph">
                Simple yet powerful platform for trading volatility indices with educational resources to help you grow
              </Paragraph>
              <Space size="large" className="hero-buttons">
                <Button
                  type="primary"
                  size="large"
                  className="hero-button-start"
                  icon={<RocketOutlined />}
                  onClick={handleDerivAuth}
                >
                  Start Trading
                </Button>
                <Link>
                  <Button size="large" className="hero-button-dbot" onClick={handleDbot}>
                    DBot
                  </Button>
                </Link>
              </Space>
            </div>
          </Col>
        </Row>

        {/* Trading Features */}
        <Divider orientation="center" className="features-divider">
          <Title level={2} className="features-title">
            Trading Made Simple
          </Title>
        </Divider>
        <Row gutter={[24, 24]} style={{ marginBottom: 80 }}>
          {features.map((feature, index) => (
            <Col xs={24} sm={12} md={6} key={index}>
              <Link to={feature.path}>
                <Card
                  hoverable
                  className={`feature-card feature-card-${index + 1}`}
                  onMouseEnter={() => setIsHovering(index)}
                  onMouseLeave={() => setIsHovering(null)}
                >
                  <div className={`feature-icon feature-icon-${index + 1}`}>
                    {React.cloneElement(feature.icon, {
                      className: `feature-icon-${index + 1}`,
                    })}
                  </div>
                  <Title level={4} className="feature-title">
                    {feature.title}
                  </Title>
                  <Text className="feature-description">{feature.description}</Text>
                  <div className="feature-learn-more">Learn more →</div>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>

        {/* Volatility Indices & Education */}
        <Row gutter={[48, 48]} align="middle" className="volatility-education-section">
          <Col xs={24} md={12}>
            <div className='volatility-container'>
              <Title level={3} className="volatility-title">
                Popular Volatility Indices
              </Title>
              <Paragraph className="volatility-paragraph">
                Trade with tight spreads on these popular volatility indices:
              </Paragraph>
              <Row gutter={[8, 12]} style={{ marginTop: 24 }}>
                {volatilityIndices.map((symbol, i) => (
                  <Col xs={24} sm={12} key={i}>
                    <div className="volatility-item">
                      <div className={`volatility-dot volatility-dot-${(i % 5) + 1}`} />
                      <Text className="volatility-text">{symbol}</Text>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>

          </Col>
          <Col xs={24} md={12}>
            <div className="education-container">
              <Title level={3} className="education-title">
                <SafetyOutlined style={{ marginRight: 12 }} />
                Educational Resources
              </Title>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {educationalResources.map((item, i) => (
                  <div key={i} className="education-item">
                    <PlayCircleOutlined className="education-icon" />
                    <Text className="education-text">{item}</Text>
                  </div>
                ))}
              </Space>
            </div>
          </Col>
        </Row>

        {/* Testimonials Carousel */}
        <Divider orientation="center" className="testimonials-divider">
          <Title level={2} className="testimonials-title">
            Success Stories
          </Title>
        </Divider>
        <div style={{ marginBottom: 80 }}>
          <Carousel autoplay dotPosition="top" effect="fade" className="testimonials-carousel">
            {testimonials.map((testimonial, index) => (
              <div key={index}>
                <Card bordered={false} className={`testimonial-card testimonial-card-${index + 1}`}>
                  <Row align="middle" gutter={[48, 24]}>
                    <Col xs={24} md={8} style={{ textAlign: 'center' }}>
                      <Avatar size={120} className={`testimonial-avatar testimonial-avatar-${index + 1}`}>
                        {testimonial.name.charAt(0)}
                      </Avatar>
                      <Title level={4} className="testimonial-name">
                        {testimonial.name}
                      </Title>
                      <Text className="testimonial-role">{testimonial.role}</Text>
                    </Col>
                    <Col xs={24} md={16}>
                      <Paragraph className="testimonial-content">
                        <blockquote className={`testimonial-quote testimonial-quote-${index + 1}`}>
                          "{testimonial.content}"
                        </blockquote>
                      </Paragraph>
                    </Col>
                  </Row>
                </Card>
              </div>
            ))}
          </Carousel>
        </div>

        {/* Final CTA */}
        <Row justify="center" className="cta-section">
          <Col span={24} className="cta-content">
            <Title level={2} className="cta-title">
              Ready to Start Trading?
            </Title>
            <Paragraph className="cta-paragraph">
              Join thousands of traders who trust our platform for volatility index trading
            </Paragraph>
            <Button type="primary" size="large" className="cta-button" onClick={handleSignup}>
              Create Free Account
            </Button>
          </Col>
        </Row>

        {/* Contact Section */}
        <Divider orientation="center" className="contact-divider">
          <Title level={2} className="contact-title">
            Need Help?
          </Title>
        </Divider>
        <Row gutter={[24, 24]} style={{ marginBottom: 60 }}>
          <Col xs={24} md={8}>
            <Card hoverable className="contact-card">
              <PhoneOutlined className="contact-icon-phone" />
              <Title level={4} className="contact-title-card">
                Phone Support
              </Title>
              <Text className="contact-text">+254 719 343 802</Text>
              <Paragraph className="contact-paragraph">24/7 dedicated support</Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card hoverable className="contact-card">
              <MailOutlined className="contact-icon-email" />
              <Title level={4} className="contact-title-card">
                Email Us
              </Title>
              <Text className="contact-text">support@denaradigitpro.com</Text>
              <Paragraph className="contact-paragraph">Typically responds within 1 hour</Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card hoverable className="contact-card">
              <div style={{ marginBottom: 16 }}>
                <Space size="large">
                  <TwitterOutlined className="contact-icon-social contact-icon-twitter" />
                  <FacebookOutlined className="contact-icon-social contact-icon-facebook" />
                  <InstagramOutlined className="contact-icon-social contact-icon-instagram" />
                </Space>
              </div>
              <Title level={4} className="contact-title-card">
                Social Media
              </Title>
              <Text className="contact-text">@denaradigitpro</Text>
              <Paragraph className="contact-paragraph">Follow us for updates</Paragraph>
            </Card>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default MainSection;