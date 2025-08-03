import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/landing/LandingPage';
import LoginPage from './pages/login/LoginPage';
import Dashboard from './pages/dashboard/DashboardPage';
import MainSection from './pages/dashboard/DashboardMainContent';
import TraderPage from './pages/trader/TraderPage';
import WalletPage from './components/WalletPage';
import UserProfile from './components/UserProfile';
import SettingsPage from './components/SettingPage';
import NotFoundPage from './pages/NotFoundPage';
import { UserProvider } from './context/AuthContext';
import { ContractsProvider } from './context/ContractsContext';
import OverUnderAnalysis from './pages/analysis/OverUnderAnalysis';
import EvenOddAnalysis from './pages/analysis/EvenOddAnalysis';
import RiskDisclosure from './components/RiskDisclosure';

function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/over-under" element={<OverUnderAnalysis />} />
        <Route path="/even-odd" element={<EvenOddAnalysis />} />
        <Route
          path="/dashboard"
          element={
            <UserProvider>
              <ContractsProvider>
                  <Dashboard />
              </ContractsProvider>
            </UserProvider>
          }
        >
          <Route index element={<MainSection />} />
          <Route path="home" element={<MainSection />} />
          <Route path="trading" element={<TraderPage />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="account" element={<UserProfile />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="risk" element={<RiskDisclosure />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default AppRoutes;