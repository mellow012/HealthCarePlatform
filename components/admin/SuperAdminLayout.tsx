'use client';

import { SuperAdminNav } from './SuperAdminNav';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <SuperAdminNav />
      {children}
    </div>
  );
}