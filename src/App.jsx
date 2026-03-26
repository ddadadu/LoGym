import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './components/MainLayout'
import StoreLayout from './components/StoreLayout'
import RoleSelectPage from './pages/RoleSelectPage'

import HomePage from './pages/HomePage'
import WorkoutPage from './pages/WorkoutPage'
import CommunityPage from './pages/CommunityPage'
import MyGymPage from './pages/MyGymPage'
import ProfilePage from './pages/ProfilePage'

import StoreRegisterPage from './pages/store/StoreRegisterPage'
import StoreManagementPage from './pages/store/StoreManagementPage'
import StoreInfoRequestPage from './pages/store/StoreInfoRequestPage'
import StoreChangePage from './pages/store/StoreChangePage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        {/* 공통 가입 직후 분기 화면 */}
        <Route path="/role-select" element={<RoleSelectPage />} />
        
        {/* 일반 유저 레이아웃 */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/workout" element={<WorkoutPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/mygym" element={<MyGymPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* 점포 관리자 레이아웃 및 뷰 */}
        <Route path="/store/register" element={<StoreRegisterPage />} />
        <Route element={<StoreLayout />}>
          <Route path="/store" element={<StoreManagementPage />} />
          <Route path="/store/requests" element={<StoreInfoRequestPage />} />
          <Route path="/store/change" element={<StoreChangePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
