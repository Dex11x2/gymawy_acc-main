import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { io } from 'socket.io-client';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import LoginForm from './components/LoginForm';
import Registration from './pages/Registration';
import DashboardWrapper from './pages/DashboardWrapper';
import Instructions from './pages/Instructions';
import Departments from './pages/Departments';
import Employees from './pages/Employees';
import Salaries from './pages/Salaries';
import Revenues from './pages/Revenues';
import Expenses from './pages/Expenses';
import Chat from './pages/ChatNew';
import Posts from './pages/PostsNew';
import Reports from './pages/Reports';
import Tasks from './pages/Tasks';
import DevTasks from './pages/DevTasks';
import CustodyAndAdvances from './pages/CustodyAndAdvances';
import PasswordManagement from './pages/PasswordManagement';
import Profile from './pages/Profile';
import Complaints from './pages/Complaints';
import AttendanceSystem from './pages/AttendanceSystem';
import EmployeeReviews from './pages/EmployeeReviews';
import TestConnection from './pages/TestConnection';
import Branches from './pages/Branches';
import AttendanceManagement from './pages/AttendanceManagement';
import AttendanceWithMap from './pages/AttendanceWithMap';
import RolePermissionsManager from './pages/RolePermissionsManager';
import Occasions from './pages/Occasions';
import OccasionsPopup from './components/OccasionsPopup';
import ReportSettings from './pages/ReportSettings';
import AdsFundingReport from './pages/AdsFundingReport';
import MediaSalaries from './pages/MediaSalaries';

const App: React.FC = () => {
  const { isAuthenticated, initAuth, user } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Socket.IO connection
  useEffect(() => {
    if (!user) return;

    // لو مفيش SOCKET_URL، منحاولش نتصل
    const socketUrl = import.meta.env.VITE_SOCKET_URL;
    if (!socketUrl) {
      console.log('ℹ️ Socket.IO disabled - no VITE_SOCKET_URL configured');
      return;
    }

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected');
      socket.emit('join', { userId: user.id, companyId: user.companyId });
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    // Make socket available globally
    (window as any).socket = socket;

    return () => {
      socket.disconnect();
      delete (window as any).socket;
    };
  }, [user]);

  return (
    <ErrorBoundary>
    {isAuthenticated && <OccasionsPopup />}
    <Router>
      <Routes>
        <Route path="/register" element={<Registration />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginForm />} />
        <Route path="/" element={!isAuthenticated ? <LoginForm /> : <Navigate to="/dashboard" replace />} />
        
        {isAuthenticated && (
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardWrapper />} />
            <Route path="/instructions" element={<Instructions />} />

            <Route path="/departments" element={<Departments />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/payroll" element={<Salaries />} />
            <Route path="/salaries" element={<Salaries />} />
            <Route path="/revenues" element={<Revenues />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/custody" element={<CustodyAndAdvances />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/posts" element={<Posts />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/dev-tasks" element={<DevTasks />} />
            <Route path="/password-management" element={<PasswordManagement />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/attendance-system" element={<AttendanceSystem />} />
            <Route path="/reviews" element={<EmployeeReviews />} />
            <Route path="/role-permissions" element={<RolePermissionsManager />} />
            <Route path="/branches" element={<Branches />} />
            <Route path="/attendance-management" element={<AttendanceManagement />} />
            <Route path="/attendance-map" element={<AttendanceWithMap />} />
            <Route path="/occasions" element={<Occasions />} />
            <Route path="/report-settings" element={<ReportSettings />} />
            <Route path="/ads-funding" element={<AdsFundingReport />} />
            <Route path="/media-salaries" element={<MediaSalaries />} />
            <Route path="/test" element={<TestConnection />} />

          </Route>
        )}
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </ErrorBoundary>
  );
};

export default App;