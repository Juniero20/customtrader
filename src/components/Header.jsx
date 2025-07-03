import { Layout, Button } from 'antd';
import { Link } from 'react-router-dom';
import '../assets/css/components/Header.css';
import logo from '../assets/images/logo.png';

const { Header } = Layout;

const AppHeader = () => {
  const handleDerivAuth = async () => {
    const appId = import.meta.env.VITE_DERIV_APP_ID;
    const redirectUri = `${window.location.origin}/`;
    window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${appId}&response_type=token&scope=read&redirect_uri=${encodeURIComponent(redirectUri)}`;
  };

  const handleSignup = async () => {
    window.location.href = 'https://hub.deriv.com/tradershub/signup?sidc=7E33F70B-5C69-47FB-85A3-B48BBFD63AA5&utm_campaign=dynamicworks&utm_medium=affiliate&utm_source=CU13613';
  };

  return (
    <Header className="header">
      <div className="header-container">
        <div className="logo">
          <img src={logo} className="logo-img" alt="Logo" />
        </div>
        <div className="header-buttons">
          <Link to="#">
            <Button className="header-button login-button" onClick={handleDerivAuth}>
              Login
            </Button>
          </Link>
          <Link to="#">
            <Button className="header-button signup-button" onClick={handleSignup}>
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </Header>
  );
};

export default AppHeader;