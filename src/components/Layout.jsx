import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Layout = ({ children }) => {
  const { userData, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Desktop sidebar state

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      // Error handled in context
    }
  };

  const isActive = (path) => location.pathname === path;

  const getMenuItems = () => {
    if (!userData) return [];

    const items = [
      { path: '/dashboard', label: 'Dashboard', icon: '📊' }
    ];

    if (userData.role === 'super_admin') {
      items.push({ path: '/users', label: 'User Management', icon: '👥' });
    }

    if (userData.role === 'admin' || userData.role === 'super_admin') {
      items.push(
        { path: '/beneficiaries', label: 'Beneficiaries', icon: '👤' },
        { path: '/register-beneficiary', label: 'Register Beneficiary', icon: '➕' },
        { path: '/schedule', label: 'Food Scheduling', icon: '📅' },
        { path: '/centers', label: 'Distribution Centers', icon: '📍' }
      );
    }

    if (userData.role === 'staff') {
      items.push(
        { path: '/beneficiaries', label: 'View Beneficiaries', icon: '👤' },
        { path: '/distribution', label: 'Distribution', icon: '📦' }
      );
      // Allow staff to see register page unless explicitly disabled via canCreateBeneficiaries === false
      if (userData?.canCreateBeneficiaries !== false) {
        items.push({ path: '/register-beneficiary', label: 'Register Beneficiary', icon: '➕' });
      }
    }

    return items;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-20 bg-primary text-white p-2 rounded-lg shadow-lg"
      >
        {mobileMenuOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-10 transition-transform duration-300 ${
        // Mobile: show/hide based on mobileMenuOpen
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } ${
        // Desktop: show/hide based on sidebarOpen
        sidebarOpen ? 'md:translate-x-0' : 'md:-translate-x-full'
      } md:block`}>
        <div className="flex flex-col h-full">
          {/* Logo with Toggle Button */}
          <div className="p-6 border-b border-gray-200 relative">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-primary">Food Distribution</h1>
                <p className="text-sm text-gray-600 mt-1">NGO System</p>
              </div>
              {/* Desktop Sidebar Toggle Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden md:flex items-center justify-center w-8 h-8 bg-primary text-white rounded-lg hover:bg-green-600 transition-colors"
                title={sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
              >
                {sidebarOpen ? '◀' : '☰'}
              </button>
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                {userData?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userData?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {userData?.role?.replace('_', ' ') || 'Role'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {getMenuItems().map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <span className="text-xl">🚪</span>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Toggle Button (when sidebar is closed) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="hidden md:flex fixed top-4 left-4 z-20 bg-primary text-white p-2 rounded-lg shadow-lg hover:bg-green-600 transition-colors"
          title="Show Sidebar"
        >
          ☰
        </button>
      )}

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[5] md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className={`transition-all duration-300 ${
        sidebarOpen ? 'md:ml-64' : 'md:ml-0'
      }`}>
        <div className="p-4 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;

