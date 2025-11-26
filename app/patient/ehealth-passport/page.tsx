'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, Activity, Pill, Plus, Clock, Calendar, User, Phone,
  Droplets, AlertCircle, CheckCircle, Loader2, Stethoscope, Hospital,
  FileText, XCircle
} from 'lucide-react';

interface PassportData {
  isActive: boolean;
  activatedAt: string | null;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    bloodType: string | null;
    dateOfBirth: string | null;
  };
  diagnoses: Array<{
    condition: string;
    date: string;
    diagnosedBy: string;
    hospital: string;
    notes?: string;
  }>;
  prescriptions: Array<{
    id: string;
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    prescribedDate: string;
    prescribedBy: string;
    hospital: string;
    instructions?: string;
    raw?: any;
  }>;
  visits: Array<{
    date: string;
    hospital: string;
    department: string;
    purpose: string;
  }>;
}

export default function EHealthPassportPage() {
  const [passport, setPassport] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchPassport = async () => {
      try {
        const res = await fetch('/api/patient/ehealth-passport');
        const json = await res.json();

        if (json.success && json.data) {
          setPassport(json.data);
        } else if (json.error === 'PASSPORT_NOT_ACTIVATED') {
          setPassport(null);
        } else {
          console.error('Failed to load passport:', json);
          setPassport(null);
        }
      } catch (err) {
        console.error('Error fetching passport:', err);
        setPassport(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPassport();
  }, []);

  const handleImportToScheduler = async (rx: any) => {
    const key = rx.id || rx.medication;
    setImporting(key);
    
    try {
      console.log('Importing medication:', rx);
      
      const res = await fetch('/api/dosage-scheduler/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medications: [{
            medication: rx.medication,
            dosage: rx.dosage,
            frequency: rx.frequency,
            specificTimes: rx.raw?.specificTimes || ['08:00'],
            timing: rx.timing || rx.raw?.timing || '',
            duration: rx.duration,
            instructions: rx.instructions || '',
            notes: `Prescribed by ${rx.prescribedBy} at ${rx.hospital} on ${new Date(rx.prescribedDate).toLocaleDateString()}`
          }],
          sourceRecordId: `passport-${rx.id}`
        })
      });

      const result = await res.json();
      console.log('Import result:', result);

      if (res.ok && result.success) {
        showNotification(`✅ "${rx.medication}" added to your schedule!`, 'success');
      } else {
        throw new Error(result.message || result.error || 'Import failed');
      }
    } catch (e: any) {
      console.error('Import error:', e);
      showNotification(`❌ Failed to import: ${e.message}`, 'error');
    } finally {
      setImporting(null);
    }
  };

  const showNotification = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-20">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!passport || !passport.isActive) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <ShieldCheck className="w-24 h-24 mx-auto mb-6 text-gray-300" />
          <h1 className="text-3xl font-bold text-gray-800 mb-4">E-Health Passport Not Active</h1>
          <p className="text-gray-600 text-lg">
            Your universal health record will be automatically activated on your <strong>first hospital check-in</strong>.
          </p>
          <button 
            onClick={() => window.location.href = '/patient/dashboard'}
            className="mt-8 px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-10 text-white shadow-2xl">
          <div className="flex items-center gap-6 mb-8">
            <div className="p-5 bg-white/20 rounded-2xl backdrop-blur">
              <ShieldCheck className="w-16 h-16" />
            </div>
            <div>
              <h1 className="text-5xl font-bold mb-2">E-Health Passport</h1>
              <p className="text-xl text-blue-100 opacity-90">Your Complete Digital Health Record</p>
              {passport.activatedAt && (
                <p className="text-sm mt-3 opacity-80">
                  Activated on {new Date(passport.activatedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-5">
              <User className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-sm opacity-80">Patient</p>
              <p className="text-xl font-bold">{passport.personalInfo.firstName} {passport.personalInfo.lastName}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-5">
              <Droplets className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-sm opacity-80">Blood Type</p>
              <p className="text-xl font-bold">{passport.personalInfo.bloodType || 'Not set'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-5">
              <Activity className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-sm opacity-80">Conditions</p>
              <p className="text-xl font-bold">{passport.diagnoses.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-5">
              <Pill className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-sm opacity-80">Medications</p>
              <p className="text-xl font-bold">{passport.prescriptions.length}</p>
            </div>
          </div>
        </div>

        {/* Patient Info */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <User className="w-7 h-7 text-blue-600" />
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">Full Name</p>
              <p className="text-lg font-semibold">{passport.personalInfo.firstName} {passport.personalInfo.lastName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="text-lg font-semibold">{passport.personalInfo.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-lg font-semibold">{passport.personalInfo.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date of Birth</p>
              <p className="text-lg font-semibold">
                {passport.personalInfo.dateOfBirth 
                  ? new Date(passport.personalInfo.dateOfBirth).toLocaleDateString() 
                  : 'Not set'}
              </p>
            </div>
          </div>
        </div>

        {/* Diagnoses */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <Activity className="w-7 h-7 text-red-600" />
            Medical Conditions & Diagnoses
          </h2>
          {passport.diagnoses.length === 0 ? (
            <p className="text-gray-500 italic py-8 text-center">No diagnosed conditions yet.</p>
          ) : (
            <div className="space-y-5">
              {passport.diagnoses.map((dx, i) => (
                <div key={i} className="bg-red-50 border border-red-200 rounded-xl p-6">
                  <p className="text-xl font-bold text-red-900">{dx.condition}</p>
                  <p className="text-sm text-gray-600 mt-2 flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> {new Date(dx.date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Stethoscope className="w-4 h-4" /> {dx.diagnosedBy}
                    </span>
                    <span className="flex items-center gap-1">
                      <Hospital className="w-4 h-4" /> {dx.hospital}
                    </span>
                  </p>
                  {dx.notes && <p className="text-sm text-gray-700 mt-3 italic">"{dx.notes}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prescriptions */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <Pill className="w-7 h-7 text-blue-600" />
            Medications & Prescriptions
          </h2>
          {passport.prescriptions.length === 0 ? (
            <p className="text-gray-500 italic py-8 text-center">No prescriptions recorded.</p>
          ) : (
            <div className="space-y-6">
              {passport.prescriptions.map((rx) => (
                <div key={rx.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 hover:shadow-xl transition-shadow">
                  <div className="flex justify-between items-start gap-6">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-blue-900">{rx.medication}</h3>
                      <div className="mt-3 space-y-2 text-sm">
                        <p className="font-medium text-gray-700">
                          <span className="text-blue-600">Dosage:</span> {rx.dosage}
                        </p>
                        <p className="font-medium text-gray-700">
                          <span className="text-blue-600">Frequency:</span> {rx.frequency.replace('_', ' ') || 'As directed'}
                        </p>
                        <p className="font-medium text-gray-700">
                          <span className="text-blue-600">Duration:</span> {rx.duration}
                        </p>
                        {rx.instructions && (
                          <p className="italic text-gray-600 mt-3">"{rx.instructions}"</p>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" /> {new Date(rx.prescribedDate).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Stethoscope className="w-4 h-4" /> Dr. {rx.prescribedBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Hospital className="w-4 h-4" /> {rx.hospital}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleImportToScheduler(rx)}
                      disabled={importing === (rx.id || rx.medication)}
                      className="self-start px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 transition shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                    >
                      {importing === (rx.id || rx.medication) ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Plus className="w-5 h-5" />
                      )}
                      Add to Schedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Visit History */}
        {passport.visits?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <FileText className="w-7 h-7 text-purple-600" />
              Recent Hospital Visits
            </h2>
            <div className="space-y-4">
              {passport.visits.slice(0, 5).map((visit, i) => (
                <div key={i} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-semibold text-gray-900">{visit.hospital}</p>
                    <p className="text-sm text-gray-600">{visit.department} • {visit.purpose}</p>
                  </div>
                  <p className="text-sm text-gray-500">{new Date(visit.date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-6 right-6 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 max-w-md`}>
          {notification.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
          <span className="font-medium flex-1">{notification.msg}</span>
          <button 
            onClick={() => setNotification(null)} 
            className="hover:bg-white/20 rounded p-1"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}