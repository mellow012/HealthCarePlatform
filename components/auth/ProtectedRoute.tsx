'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getRoleBasedRedirect } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  requireSetup?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles,
  requireSetup = true 
}: ProtectedRouteProps) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || !userData) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    const userRole = (userData.role || '').toLowerCase();
    const allowedLower = allowedRoles.map(r => r.toLowerCase());

    // Not allowed on this page
    if (!allowedLower.includes(userRole)) {
      const correctPath = getRoleBasedRedirect(userData.role, userData.setupComplete ?? true);
      router.replace(correctPath);
      return;
    }

    // Needs setup
    if (requireSetup && !userData.setupComplete) {
      if (userRole === 'hospital_admin') {
        router.replace('/hospital/setup');
      } else if (['doctor', 'receptionist', 'hospital_staff'].includes(userRole)) {
        router.replace('/hospital/staff/setup');
      }
      return;
    }

    // If they're on setup page but already done → kick them out
    if (userData.setupComplete && pathname.includes('/staff/setup')) {
      const correctPath = getRoleBasedRedirect(userData.role, true);
      router.replace(correctPath);
    }

  }, [user, userData, loading, allowedRoles, requireSetup, router, pathname]);

  if (loading || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const userRole = (userData.role || '').toLowerCase();
  if (allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}