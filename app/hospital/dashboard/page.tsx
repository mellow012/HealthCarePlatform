"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { 
  Users, 
  UserCheck, 
  Activity,
  Clock,
  Calendar,
  X,
  AlertCircle,
  CheckCircle,
  Building2,
  ChevronRight,
  Loader2
} from 'lucide-react';

interface Visit {
  id: string;
  patientId: string;
  checkInTime: string;
  purpose: string;
  department: string;
  patient: {
    email: string;
    name: string;
  };
  status: 'checked_in';
}

export default function HospitalDashboard() {
  const { signOut, userData } = useAuth();
  const [activeVisits, setActiveVisits] = useState<Visit[]>([]);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showConfirmCheckout, setShowConfirmCheckout] = useState(false);
  const [visitToCheckout, setVisitToCheckout] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchActiveVisits = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/visits/active');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch active visits');
      }

      setActiveVisits(data.data || []);
    } catch (err: any) {
      console.error('Error fetching visits:', err);
      setNotification({ message: err.message || 'Failed to load visits', type: 'error' });
      setActiveVisits([]); // Show empty state on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveVisits();
  }, [fetchActiveVisits]);

  const initiateCheckOut = (visitId: string) => {
    setVisitToCheckout(visitId);
    setShowConfirmCheckout(true);
  };

  const handleCheckOut = async () => {
    setShowConfirmCheckout(false);
    if (!visitToCheckout) return;

    try {
      const response = await fetch(`/api/visits/${visitToCheckout}/checkout`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check out patient');
      }

      setActiveVisits(prev => prev.filter(v => v.id !== visitToCheckout));
      setNotification({ message: 'Patient checked out successfully', type: 'success' });
      fetchActiveVisits(); // Refresh list
    } catch (err: any) {
      setNotification({ message: err.message || 'Failed to check out patient', type: 'error' });
    } finally {
      setVisitToCheckout(null);
    }
  };

  const handleCheckInSuccess = (email: string) => {
    setNotification({ message: `Patient ${email} checked in successfully`, type: 'success' });
    fetchActiveVisits(); // Refresh list
  };

  const handleNotificationClose = () => setNotification(null);

  return (
    <ProtectedRoute allowedRoles={['hospital_admin']}>
      <div className="min-h-screen bg-gray-50 font-sans">
        
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-blue-600" />
                  Hospital Dashboard
                </h1>
                <p className="text-sm text-gray-600">Welcome back, {userData?.profile?.firstName}</p>
              </div>
              <button
                onClick={signOut}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard icon={UserCheck} title="Active Patients" value={activeVisits.length} color="blue" />
            <StatCard icon={Calendar} title="Today's Check-ins" value={activeVisits.length} color="green" />
            <StatCard icon={Activity} title="System Status" value="Active" color="purple" isText={true} />
          </div>

          {/* Active Patients Table */}
          <div className="bg-white rounded-xl shadow-lg">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Active Patients</h2>
              <button
                onClick={() => setShowCheckInModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md transform hover:scale-[1.02]"
              >
                <UserCheck className="w-4 h-4" />
                Check-in Patient
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                <p className="mt-2 text-sm text-gray-500">Loading active visits...</p>
              </div>
            ) : activeVisits.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No active patients</p>
                <p className="text-sm">Check in a patient to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <TableHead>Patient</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Check-in Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeVisits.map((visit) => (
                      <tr key={visit.id} className="hover:bg-blue-50/50 transition-colors">
                        <TableCell>
                          <div className="font-medium text-gray-900">{visit.patient.name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{visit.patient.email}</div>
                        </TableCell>
                        <TableCell>{visit.department}</TableCell>
                        <TableCell>{visit.purpose}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-gray-600 text-sm">
                            <Clock className="w-4 h-4" />
                            {new Date(visit.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => initiateCheckOut(visit.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                          >
                            Check Out
                          </button>
                        </TableCell>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Check-in Modal */}
      {showCheckInModal && (
        <CheckInModal
          onClose={() => setShowCheckInModal(false)}
          onSuccess={handleCheckInSuccess}
        />
      )}

      {/* Confirmation Modal (for Check-out) */}
      <ConfirmationModal
        isOpen={showConfirmCheckout}
        title="Confirm Patient Check-out"
        message="Are you sure you want to mark this patient as checked out? This will revoke their current hospital access."
        onConfirm={handleCheckOut}
        onCancel={() => {
            setShowConfirmCheckout(false);
            setVisitToCheckout(null);
        }}
      />

      {/* Notification */}
      {notification && (
        <Notification 
          message={notification.message}
          type={notification.type}
          onClose={handleNotificationClose}
        />
      )}
    </ProtectedRoute>
  );
}

// CheckInModal Component (Real API Integration)
const CheckInModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: (email: string) => void }) => {
  const [email, setEmail] = useState('');
  const [purpose, setPurpose] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckIn = async () => {
    if (!email || !purpose || !department) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/visits/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientEmail: email, purpose, department }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Check-in failed');
      }

      onSuccess(email);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6 border-b pb-3">
          <h3 className="text-xl font-bold text-gray-900">Patient Check-in</h3>
          <button onClick={onClose} className="text-gray-400 p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
        <div className="space-y-4">
          <input 
            type="email" 
            placeholder="Patient Email Address *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition duration-150"
          />
          <input 
            type="text" 
            placeholder="Purpose of Visit *"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition duration-150"
          />
          <select 
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition duration-150"
          >
            <option value="">Select Department *</option>
            <option value="Emergency">Emergency</option>
            <option value="General Practice">General Practice</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="Pediatrics">Pediatrics</option>
            {/* Add more as needed */}
          </select>
        </div>
        <button
          onClick={handleCheckIn}
          disabled={loading || !email || !purpose || !department}
          className="w-full mt-6 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition duration-150 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
          {loading ? 'Checking In...' : 'Confirm Check-in'}
        </button>
      </div>
    </div>
  );
}

// ConfirmationModal Component
const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel} 
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-150"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition duration-150 shadow-md"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// Notification Component
const Notification = ({ message, type, onClose }: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}) => {
  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  const Icon = type === 'success' ? CheckCircle : AlertCircle;

  useEffect(() => {
    const timer = setTimeout(onClose, 5000); 
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 ${bgColor} text-white p-4 rounded-xl shadow-2xl flex items-center gap-3 transition-transform duration-300 transform translate-y-0 z-50`}>
      <Icon className="w-5 h-5" />
      <p className="font-medium text-sm">{message}</p>
      <button onClick={onClose} className="ml-4 p-1 hover:bg-white/20 rounded-full">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Reusable Stat Card Component
const StatCard = ({ icon: Icon, title, value, color, isText = false }: any) => {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        purple: 'bg-purple-100 text-purple-600',
    };
    return (
        <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-l-4 border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    {isText ? (
                        <p className={`text-xl font-bold ${colorClasses[color]}`}>{value}</p>
                    ) : (
                        <p className="text-3xl font-bold text-gray-900">{value}</p>
                    )}
                </div>
                <div className={`p-3 rounded-full ${colorClasses[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium text-gray-400">
                View Details <ChevronRight className="w-4 h-4 ml-1" />
            </div>
        </div>
    );
};

// Reusable Table Cell and Header Components
const TableHead = ({ children }: any) => (
    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{children}</th>
);

const TableCell = ({ children }: any) => (
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{children}</td>
);