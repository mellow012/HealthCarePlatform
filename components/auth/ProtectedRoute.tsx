'use client';

// Changed to a relative path as a workaround for the alias resolution error.
// !!! Adjust this path if AuthContext is elsewhere relative to components/auth !!!
import { useAuth } from '../../contexts/AuthContext'; 
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
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
    if (!loading) {
      if (!user) {
        // 1. Not authenticated: Redirect to login
        router.push('/login');
        
      } else if (userData && !userData.setupComplete && pathname !== '/auth/profile' && requireSetup && userData.role === 'patient') {
        // 2. Patient requires profile setup: Redirect to setup page
        // Note: '/auth/profile' matches the path of app/auth/profile/page.tsx
        router.push('/auth/profile');
      
      } else if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
        // 3. Unauthorized role: Redirect to unauthorized page
        router.push('/unauthorized');

      } else if (requireSetup && userData?.role === 'hospital_admin' && !userData.setupComplete && pathname !== '/hospital/setup') {
        // 4. Hospital Admin requires specific setup
        router.push('/hospital/setup');
      }
    
    }
  }, [user, userData, loading, router, pathname, allowedRoles, requireSetup]);

  if (loading || (user && !userData)) {
    // Show a loading screen while fetching user data or initial auth is incomplete
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 text-blue-600" />
      </div>
    );
  }

  // If unauthenticated or unauthorized role (handled in useEffect, but we block rendering until then)
  if (!user || (allowedRoles && userData && !allowedRoles.includes(userData.role))) {
    return null;
  }

  return <>{children}</>;
}