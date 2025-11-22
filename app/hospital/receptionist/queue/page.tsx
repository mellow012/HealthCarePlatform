// app/hospital/receptionist/queue/page.tsx
'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  Clock,
  User,
  CheckCircle,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';

interface QueueItem {
  id: string;
  patientId: string;
  checkInTime: string;
  purpose: string;
  department: string;
  queueNumber?: number;
  patient: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

export default function ReceptionistQueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      const response = await fetch('/api/visits/active');
      const data = await response.json();

      if (data.success) {
        setQueue(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (visitId: string) => {
    if (!confirm('Are you sure you want to check out this patient?')) return;

    try {
      const response = await fetch(`/api/visits/${visitId}/checkout`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setNotification({ message: 'Patient checked out successfully', type: 'success' });
        fetchQueue();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      setNotification({ message: error.message || 'Check-out failed', type: 'error' });
    }
  };

  return (
    <ProtectedRoute allowedRoles={['receptionist']}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-600" />
            Patient Queue
          </h1>
          <p className="text-gray-600 mt-1">
            Current patients waiting in the hospital
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-600">Total in Queue</p>
            <p className="text-4xl font-bold text-blue-600">{queue.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-600">Average Wait Time</p>
            <p className="text-4xl font-bold text-gray-900">
              {queue.length > 0
                ? Math.round(
                    queue.reduce((acc, item) => {
                      const wait = (Date.now() - new Date(item.checkInTime).getTime()) / 60000;
                      return acc + wait;
                    }, 0) / queue.length
                  )
                : 0}
              <span className="text-lg ml-1">min</span>
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-600">Longest Wait</p>
            <p className="text-4xl font-bold text-orange-600">
              {queue.length > 0
                ? Math.round(
                    Math.max(...queue.map(item => 
                      (Date.now() - new Date(item.checkInTime).getTime()) / 60000
                    ))
                  )
                : 0}
              <span className="text-lg ml-1">min</span>
            </p>
          </div>
        </div>

        {/* Queue Table */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Active Patients</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading queue...</p>
            </div>
          ) : queue.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No patients in queue</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Queue #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Purpose
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Check-in Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Wait Time
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {queue.map((item, index) => {
                    const waitTime = Math.round(
                      (Date.now() - new Date(item.checkInTime).getTime()) / 60000
                    );
                    
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full font-bold">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">
                                {item.patient.profile.firstName} {item.patient.profile.lastName}
                              </p>
                              <p className="text-sm text-gray-500">{item.patient.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            {item.department}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.purpose}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(item.checkInTime).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            waitTime > 30
                              ? 'bg-red-100 text-red-800'
                              : waitTime > 15
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {waitTime} min
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleCheckOut(item.id)}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition"
                          >
                            Check Out
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notification */}
        {notification && (
          <div className={`fixed bottom-6 right-6 ${
            notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50`}>
            {notification.type === 'success' ? <CheckCircle /> : <AlertCircle />}
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)}>
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

// -----------------------------------------------------------
