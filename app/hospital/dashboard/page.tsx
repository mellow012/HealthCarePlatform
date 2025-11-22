// app/hospital/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import CheckInModal from '@/components/hospital/CheckInModal';
import { Loader2 } from 'lucide-react';

export default function HospitalDashboard() {
  const { userData } = useAuth();
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [visits, setVisits] = useState([]);

  const fetchVisits = async () => {
    const res = await fetch('/api/visits/active');
    const data = await res.json();
    if (data.success) setVisits(data.data);
  };

  useEffect(() => {
    fetchVisits();
    const interval = setInterval(fetchVisits, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ProtectedRoute allowedRoles={['hospital_admin']}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hospital Dashboard</h1>
            <p className="text-gray-600">Welcome, {userData?.profile?.firstName}</p>
          </div>
          <button
            onClick={() => setShowCheckIn(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-md transition"
          >
            Check In Patient
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-600">Active Patients</p>
            <p className="text-3xl font-bold text-gray-900">{visits.length}</p>
          </div>
        </div>

        {showCheckIn && (
          <CheckInModal onClose={() => setShowCheckIn(false)} onSuccess={fetchVisits} />
        )}
      </div>
    </ProtectedRoute>
  );
}