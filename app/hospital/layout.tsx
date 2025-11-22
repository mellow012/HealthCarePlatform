// app/hospital/layout.tsx - ROLE-BASED NAVIGATION
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  Activity,
  Pill,
  UserCheck,
  ClipboardList,
  UserPlus,
  Clock,
} from 'lucide-react';

// Define navigation items per role
const getNavigationForRole = (role: string, isSetupComplete: boolean) => {
  // Doctor navigation
  if (role === 'doctor') {
    return [
      { href: '/hospital/doctor', label: 'My Patients', icon: Users },
      { href: '/hospital/doctor/appointments', label: 'Appointments', icon: Calendar },
      { href: '/hospital/doctor/prescriptions', label: 'Prescriptions', icon: Pill },
      { href: '/hospital/doctor/history', label: 'History', icon: FileText },
    ];
  }

  // Receptionist navigation
  if (role === 'receptionist') {
    return [
      { href: '/hospital/receptionist', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/hospital/receptionist/checkin', label: 'Check-in', icon: UserPlus },
      { href: '/hospital/receptionist/queue', label: 'Patient Queue', icon: Clock },
      { href: '/hospital/receptionist/search', label: 'Find Patient', icon: Users },
    ];
  }

  // Hospital Admin navigation
  if (role === 'hospital_admin') {
    return [
      { href: '/hospital/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/hospital/patients', label: 'All Patients', icon: Users },
      { href: '/hospital/staff', label: 'Staff Management', icon: UserCheck },
      { href: '/hospital/visits', label: 'Visits & Queue', icon: Activity },
      { href: '/hospital/prescriptions', label: 'Prescriptions', icon: Pill },
      { href: '/hospital/reports', label: 'Reports', icon: FileText },
      { href: '/hospital/settings', label: 'Settings', icon: Settings },
    ];
  }

  return [];
};

export default function HospitalLayout({ children }: { children: React.ReactNode }) {
  const { userData, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading || !userData) return;

    const allowedRoles = ['hospital_admin', 'doctor', 'receptionist'];
    if (!allowedRoles.includes(userData.role) || !userData.hospitalId) {
      router.replace('/auth/login');
    }
  }, [userData, loading, router]);

  if (loading || !userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const navItems = getNavigationForRole(userData.role, userData.setupComplete ?? true);

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'doctor': return { label: 'Doctor', color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'receptionist': return { label: 'Receptionist', color: 'text-purple-600', bg: 'bg-purple-100' };
      case 'hospital_admin': return { label: 'Administrator', color: 'text-green-600', bg: 'bg-green-100' };
      default: return { label: 'Staff', color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  const roleInfo = getRoleDisplay(userData.role);

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform lg:translate-x-0 lg:static ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo & User Info */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Heal</h1>
                <p className="text-xs text-gray-500">HealthCare Portal</p>
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-900">
                {userData.profile?.firstName} {userData.profile?.lastName}
              </p>
              <span className={`inline-flex items-center px-2 py-1 ${roleInfo.bg} ${roleInfo.color} text-xs font-semibold rounded-full mt-1`}>
                {roleInfo.label}
              </span>
              {userData.department && (
                <p className="text-xs text-gray-500 mt-1">{userData.department}</p>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 lg:hidden sticky top-0 z-30">
          <div className="px-4 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Hospital Portal</h2>
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Close Button */}
      {sidebarOpen && (
        <button 
          onClick={() => setSidebarOpen(false)} 
          className="fixed top-4 right-4 z-50 bg-white rounded-full p-2 shadow-lg lg:hidden"
        >
          <X className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}