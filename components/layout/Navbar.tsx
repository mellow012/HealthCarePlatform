'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Activity, 
  LogOut, 
  Menu, 
  X, 
  User,
  Settings,
  Building2,
  Users,
  FileText
} from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, userData, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Don't show navbar on auth pages
  const authPages = ['/auth/login', '/auth/register', '/auth/forgot-password'];
  if (authPages.includes(pathname)) {
    return null;
  }

  const getNavLinks = () => {
    if (!user || !userData) {
      return [
        { href: '/auth/login', label: 'Login' },
        { href: '/auth/register', label: 'Register' },
      ];
    }

    switch (userData.role) {
      case 'super_admin':
        return [
          { href: '/admin/dashboard', label: 'Dashboard', icon: Activity },
          { href: '/admin/hospitals', label: 'Hospitals', icon: Building2 },
          { href: '/admin/admins', label: 'Admins', icon: Users },
        ];
      
      case 'hospital_admin':
        return [
          { href: '/hospital/dashboard', label: 'Dashboard', icon: Activity },
          { href: '/hospital/patients', label: 'Patients', icon: Users },
          { href: '/hospital/records', label: 'Records', icon: FileText },
          { href: '/hospital/settings', label: 'Settings', icon: Settings },
        ];
      
      case 'patient':
        return [
          { href: '/patient/dashboard', label: 'Dashboard', icon: Activity },
          { href: '/patient/records', label: 'My Records', icon: FileText },
          { href: '/patient/visits', label: 'Visits', icon: Building2 },
          { href: '/auth/profile', label: 'Profile', icon: User },
        ];
      
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">HealthCare</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {userData?.profile?.firstName || user.email}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {userData?.role?.replace('_', ' ')}
                  </p>
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {link.label}
                </Link>
              );
            })}
            
            {user && (
              <button
                onClick={() => {
                  signOut();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
