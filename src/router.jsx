import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized';
import UserManagement from './pages/UserManagement';
import RegisterBeneficiary from './pages/RegisterBeneficiary';
import Beneficiaries from './pages/Beneficiaries';
import FoodScheduling from './pages/FoodScheduling';
import Distribution from './pages/Distribution';
import DistributionCenters from './pages/DistributionCenters';
import PackagesDistributed from './pages/PackagesDistributed';

export default function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/register-beneficiary"
          element={
            <ProtectedRoute allowedRoles={["admin", "super_admin", "staff"]}>
              <RegisterBeneficiary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/beneficiaries"
          element={
            <ProtectedRoute allowedRoles={["admin", "super_admin", "staff"]}>
              <Beneficiaries />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedule"
          element={
            <ProtectedRoute allowedRoles={["admin", "super_admin", "staff"]}>
              <FoodScheduling />
            </ProtectedRoute>
          }
        />
        <Route
          path="/distribution"
          element={
            <ProtectedRoute allowedRoles={["staff", "admin", "super_admin"]}>
              <Distribution />
            </ProtectedRoute>
          }
        />
        <Route
          path="/centers"
          element={
            <ProtectedRoute allowedRoles={["admin", "super_admin", "staff"]}>
              <DistributionCenters />
            </ProtectedRoute>
          }
        />
        <Route
          path="/packages-distributed"
          element={
            <ProtectedRoute allowedRoles={["admin", "super_admin", "staff"]}>
              <PackagesDistributed />
            </ProtectedRoute>
          }
        />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/" element={<Navigate to="/signup" replace />} />
      </Routes>
    </Router>
  );
}
