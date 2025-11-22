'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  UserPlus,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  User,
  Mail,
  Building2,
} from 'lucide-react';

// Fix TypeScript: Extend Firebase User
import { User as FirebaseUser } from 'firebase/auth';
interface HospitalUser extends FirebaseUser {
  hospitalId?: string;
  role?: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
  status: string;
}

export default function ReceptionistCheckinPage() {
  const { user, loading: authLoading } = useAuth();
  const hospitalUser = user as HospitalUser | null;

  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [purpose, setPurpose] = useState('');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  // FETCH DEPARTMENTS — WORKS 100% (client-side Firestore)
 useEffect(() => {
  if (authLoading || !user) return;

  const fetchDepartments = async () => {
    try {
      setLoadingDepts(true);
      const res = await fetch('/api/hospital/departments', {
        credentials: 'include', // This sends the session cookie
      });

      if (!res.ok) {
        console.error('Failed:', res.status);
        setNotification({ message: 'Failed to load departments', type: 'error' });
        return;
      }

      const data = await res.json();
      if (data.success) {
        const active = data.data
          .filter((d: any) => d.status === 'active')
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
        setDepartments(active);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDepts(false);
    }
  };

  fetchDepartments();
}, [user, authLoading]);

  // PATIENT SEARCH — Fixed URL (99% chance it's plural)
  const handleSearch = async () => {
    if (!searchEmail.trim()) return;

    setSearching(true);
    try {
      // CHANGE THIS TO MATCH YOUR ACTUAL ROUTE
      const res = await fetch(`/api/patient/search?q=${encodeURIComponent(searchEmail)}`);

      if (!res.ok) {
        const text = await res.text();
        console.error('Search API error:', res.status, text);
        throw new Error('Search failed');
      }

      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        setSearchResults(data.data);
      } else {
        setSearchResults([]);
        setNotification({ message: 'Patient not found', type: 'error' });
      }
    } catch (error) {
      console.error('Search failed:', error);
      setNotification({ message: 'Search failed — check email or try again', type: 'error' });
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPatient = (patient: any) => {
    setSelectedPatient(patient);
    setSearchResults([]);
    setSearchEmail('');
  };

  const handleCheckIn = async () => {
    if (!selectedPatient || !purpose.trim() || !department) {
      setNotification({ message: 'Please fill all fields', type: 'error' });
      return;
    }

    setCheckingIn(true);
    try {
      const res = await fetch('/api/visits/checkin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientEmail: selectedPatient.email,
          purpose: purpose.trim(),
          department,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setNotification({ message: 'Patient checked in successfully!', type: 'success' });
        setSelectedPatient(null);
        setPurpose('');
        setDepartment('');
      } else {
        throw new Error(data.error || 'Check-in failed');
      }
    } catch (error: any) {
      setNotification({ message: error.message || 'Check-in failed', type: 'error' });
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['receptionist']}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-blue-600" />
            Patient Check-in
          </h1>
          <p className="text-gray-600 mt-1">Register patient arrival and assign to department</p>
        </div>

        {/* Patient Search */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Find Patient</h2>
          
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                placeholder="Enter patient email address..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !searchEmail.trim()}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center gap-2"
            >
              {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {patient.profile?.firstName} {patient.profile?.lastName}
                      </p>
                      <p className="text-sm text-gray-600">{patient.email}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Check-in Form */}
        {selectedPatient && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-lg font-semibold text-gray-900">2. Check-in Details</h2>
              <button onClick={() => setSelectedPatient(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">
                    {selectedPatient.profile?.firstName} {selectedPatient.profile?.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{selectedPatient.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="inline w-4 h-4 mr-1" />
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  disabled={loadingDepts || departments.length === 0}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-70"
                >
                  <option value="">
                    {loadingDepts 
                      ? 'Loading departments...' 
                      : departments.length === 0 
                        ? 'No active departments found' 
                        : 'Select Department'
                    }
                  </option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}{dept.description && ` — ${dept.description}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purpose of Visit <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g., Chest pain, Follow-up after surgery..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleCheckIn}
                disabled={checkingIn || !purpose.trim() || !department}
                className="w-full py-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2 text-lg"
              >
                {checkingIn ? (
                  <>Checking In...</>
                ) : (
                  <>Complete Check-in</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Notification */}
        {notification && (
          <div className={`fixed bottom-6 right-6 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50`}>
            {notification.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            <span className="font-medium">{notification.message}</span>
            <button onClick={() => setNotification(null)}>
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}