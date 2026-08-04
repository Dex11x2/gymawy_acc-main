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
import ContentCalendar from './pages/ContentCalendar';
import CalendarMonth from './pages/CalendarMonth';
import VideoReviews from './pages/VideoReviews';
import Reports from './pages/Reports';
import Tasks from './pages/Tasks';
import DevTasks from './pages/DevTasks';
import MySpace from './pages/MySpace';
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
import Protected from './components/Protected';
import GlobalToaster from './components/GlobalToaster';
import ReportSettings from './pages/ReportSettings';
import AdsFundingReport from './pages/AdsFundingReport';
import MediaSalaries from './pages/MediaSalaries';

const App: React.FC = () => {
  const { isAuthenticated, isLoading, initAuth, user } = useAuthStore();

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

  if (isLoading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f8fafc', zIndex: 9999
      }}>
        <div style={{
          width: 48, height: 48, border: '4px solid #e2e8f0', borderTopColor: '#3b82f6',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite'
        }} />
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <GlobalToaster />
    {isAuthenticated && <OccasionsPopup />}
    <Router>
      <Routes>
        <Route path="/register" element={<Registration />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginForm />} />
        <Route path="/" element={!isAuthenticated ? <LoginForm /> : <Navigate to="/dashboard" replace />} />
        
        {isAuthenticated && (
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardWrapper />} />
            <Route path="/my-space" element={<MySpace />} />
            <Route path="/instructions" element={<Protected module="instructions"><Instructions /></Protected>} />

            <Route path="/departments" element={<Protected module="departments"><Departments /></Protected>} />
            <Route path="/employees" element={<Protected module="employees"><Employees /></Protected>} />
            <Route path="/payroll" element={<Protected module="salaries"><Salaries /></Protected>} />
            <Route path="/salaries" element={<Protected module="salaries"><Salaries /></Protected>} />
            <Route path="/revenues" element={<Protected module="revenues"><Revenues /></Protected>} />
            <Route path="/expenses" element={<Protected module="expenses"><Expenses /></Protected>} />
            <Route path="/custody" element={<Protected module="custody"><CustodyAndAdvances /></Protected>} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/posts" element={<Protected module="posts"><Posts /></Protected>} />
            <Route path="/content-calendar" element={<Protected module="content_calendar"><ContentCalendar /></Protected>} />
            <Route path="/content-calendar/:monthId" element={<Protected module="content_calendar"><CalendarMonth /></Protected>} />
            <Route path="/video-reviews" element={<Protected module="video_reviews"><VideoReviews /></Protected>} />
            <Route path="/reports" element={<Protected module="reports"><Reports /></Protected>} />
            <Route path="/tasks" element={<Protected module="tasks"><Tasks /></Protected>} />
            <Route path="/dev-tasks" element={<Protected module="dev_tasks"><DevTasks /></Protected>} />
            <Route path="/password-management" element={<Protected roles={['dev', 'general_manager', 'administrative_manager']}><PasswordManagement /></Protected>} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/complaints" element={<Protected module="complaints"><Complaints /></Protected>} />
            <Route path="/attendance-system" element={<Protected roles={['dev', 'general_manager', 'administrative_manager']}><AttendanceSystem /></Protected>} />
            <Route path="/reviews" element={<Protected module="reviews"><EmployeeReviews /></Protected>} />
            <Route path="/role-permissions" element={<Protected roles={['dev', 'general_manager', 'administrative_manager']}><RolePermissionsManager /></Protected>} />
            <Route path="/branches" element={<Protected roles={['dev', 'general_manager', 'administrative_manager']}><Branches /></Protected>} />
            <Route path="/attendance-management" element={<Protected roles={['dev', 'general_manager', 'administrative_manager']}><AttendanceManagement /></Protected>} />
            <Route path="/attendance-map" element={<AttendanceWithMap />} />
            <Route path="/occasions" element={<Protected module="occasions"><Occasions /></Protected>} />
            <Route path="/report-settings" element={<Protected roles={['dev', 'general_manager', 'administrative_manager']}><ReportSettings /></Protected>} />
            <Route path="/ads-funding" element={<Protected module="ads_funding"><AdsFundingReport /></Protected>} />
            <Route path="/media-salaries" element={<Protected module="media_salaries"><MediaSalaries /></Protected>} />
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