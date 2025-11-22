'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, User, Search, Save, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';

interface Patient {
  id: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
  };
}

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00'
];

export default function CreateAppointmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [appointmentData, setAppointmentData] = useState({
    date: '',
    timeSlot: '',
    duration: 30,
    reason: '',
    department: '',
  });

  const searchPatients = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`/api/patients/search?q=${encodeURIComponent(searchQuery)}`);
      const json = await res.json();
      if (json.success) {
        setPatients(json.data || []);
      }
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchPatients();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSubmit = async () => {
    if (!selectedPatient) {
      setNotification({ msg: 'Please select a patient', type: 'error' });
      return;
    }

    if (!appointmentData.date || !appointmentData.timeSlot) {
      setNotification({ msg: 'Date and time are required', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/doctor/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          ...appointmentData,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setNotification({ msg: 'Appointment created successfully!', type: 'success' });
      setTimeout(() => router.push('/hospital/doctor/appointments'), 1500);
    } catch (err: any) {
      setNotification({ msg: err.message || 'Failed to create appointment', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            Create Appointment
          </h1>
          <p className="text-gray-600 mt-1">Schedule a new appointment</p>
        </div>

        <div className="space-y-6">
          {/* Patient Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Patient
            </h2>

            {selectedPatient ? (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <p className="font-semibold text-gray-900">
                    {selectedPatient.profile.firstName} {selectedPatient.profile.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{selectedPatient.email}</p>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowPatientSearch(true);
                  }}
                  placeholder="Search patient by name or email..."
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />

                {showPatientSearch && patients.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-lg border max-h-60 overflow-y-auto">
                    {patients.map((patient) => (
                      <button
                        key={patient.id}
                        onClick={() => {
                          setSelectedPatient(patient);
                          setShowPatientSearch(false);
                          setSearchQuery('');
                        }}
                        className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <p className="font-medium text-gray-900">
                          {patient.profile.firstName} {patient.profile.lastName}
                        </p>
                        <p className="text-sm text-gray-600">{patient.email}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Appointment Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              Appointment Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                <input
                  type="date"
                  value={appointmentData.date}
                  onChange={(e) => setAppointmentData({ ...appointmentData, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Slot *</label>
                <select
                  value={appointmentData.timeSlot}
                  onChange={(e) => setAppointmentData({ ...appointmentData, timeSlot: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select time</option>
                  {TIME_SLOTS.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                <select
                  value={appointmentData.duration}
                  onChange={(e) => setAppointmentData({ ...appointmentData, duration: parseInt(e.target.value) })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <input
                  type="text"
                  value={appointmentData.department}
                  onChange={(e) => setAppointmentData({ ...appointmentData, department: e.target.value })}
                  placeholder="e.g., Cardiology, General Medicine"
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Visit</label>
                <textarea
                  value={appointmentData.reason}
                  onChange={(e) => setAppointmentData({ ...appointmentData, reason: e.target.value })}
                  placeholder="Brief description..."
                  rows={3}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => router.back()}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedPatient}
              className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Create Appointment
            </button>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{notification.msg}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:bg-white/20 rounded p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}