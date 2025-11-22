'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, User, Search, Save, AlertCircle, CheckCircle, Loader2, X, Activity } from 'lucide-react';

interface Patient {
  id: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    bloodType?: string;
  };
}

export default function CreateReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [reportData, setReportData] = useState({
    diagnosis: '',
    symptoms: '',
    physicalExam: '',
    vitalSigns: {
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      respiratoryRate: '',
      oxygenSaturation: '',
    },
    labResults: '',
    recommendations: '',
    followUpDate: '',
    notes: '',
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

    if (!reportData.diagnosis.trim()) {
      setNotification({ msg: 'Diagnosis is required', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/doctor/reports/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          ...reportData,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setNotification({ msg: 'Medical report created successfully!', type: 'success' });
      setTimeout(() => router.push('/hospital/doctor/reports'), 1500);
    } catch (err: any) {
      setNotification({ msg: err.message || 'Failed to create report', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Create Medical Report
          </h1>
          <p className="text-gray-600 mt-1">Document patient diagnosis and findings</p>
        </div>

        <div className="space-y-6">
          {/* Patient Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Patient Information
            </h2>

            {selectedPatient ? (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <p className="font-semibold text-gray-900">
                    {selectedPatient.profile.firstName} {selectedPatient.profile.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{selectedPatient.email}</p>
                  {selectedPatient.profile.bloodType && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                      {selectedPatient.profile.bloodType}
                    </span>
                  )}
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

          {/* Clinical Assessment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Clinical Assessment
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint / Symptoms</label>
                <textarea
                  value={reportData.symptoms}
                  onChange={(e) => setReportData({ ...reportData, symptoms: e.target.value })}
                  placeholder="Patient's main complaints..."
                  rows={3}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Physical Examination</label>
                <textarea
                  value={reportData.physicalExam}
                  onChange={(e) => setReportData({ ...reportData, physicalExam: e.target.value })}
                  placeholder="Findings from physical examination..."
                  rows={3}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis *</label>
                <input
                  type="text"
                  value={reportData.diagnosis}
                  onChange={(e) => setReportData({ ...reportData, diagnosis: e.target.value })}
                  placeholder="Primary diagnosis..."
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Vital Signs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-600" />
              Vital Signs
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Blood Pressure</label>
                <input
                  type="text"
                  value={reportData.vitalSigns.bloodPressure}
                  onChange={(e) => setReportData({
                    ...reportData,
                    vitalSigns: { ...reportData.vitalSigns, bloodPressure: e.target.value }
                  })}
                  placeholder="e.g., 120/80 mmHg"
                  className="w-full p-3 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Heart Rate</label>
                <input
                  type="text"
                  value={reportData.vitalSigns.heartRate}
                  onChange={(e) => setReportData({
                    ...reportData,
                    vitalSigns: { ...reportData.vitalSigns, heartRate: e.target.value }
                  })}
                  placeholder="e.g., 72 bpm"
                  className="w-full p-3 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Temperature</label>
                <input
                  type="text"
                  value={reportData.vitalSigns.temperature}
                  onChange={(e) => setReportData({
                    ...reportData,
                    vitalSigns: { ...reportData.vitalSigns, temperature: e.target.value }
                  })}
                  placeholder="e.g., 37°C / 98.6°F"
                  className="w-full p-3 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Respiratory Rate</label>
                <input
                  type="text"
                  value={reportData.vitalSigns.respiratoryRate}
                  onChange={(e) => setReportData({
                    ...reportData,
                    vitalSigns: { ...reportData.vitalSigns, respiratoryRate: e.target.value }
                  })}
                  placeholder="e.g., 16 breaths/min"
                  className="w-full p-3 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">O₂ Saturation</label>
                <input
                  type="text"
                  value={reportData.vitalSigns.oxygenSaturation}
                  onChange={(e) => setReportData({
                    ...reportData,
                    vitalSigns: { ...reportData.vitalSigns, oxygenSaturation: e.target.value }
                  })}
                  placeholder="e.g., 98%"
                  className="w-full p-3 border rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lab Results / Tests</label>
                <textarea
                  value={reportData.labResults}
                  onChange={(e) => setReportData({ ...reportData, labResults: e.target.value })}
                  placeholder="Laboratory and diagnostic test results..."
                  rows={3}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Plan / Recommendations</label>
                <textarea
                  value={reportData.recommendations}
                  onChange={(e) => setReportData({ ...reportData, recommendations: e.target.value })}
                  placeholder="Treatment recommendations, lifestyle advice..."
                  rows={3}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Date</label>
                <input
                  type="date"
                  value={reportData.followUpDate}
                  onChange={(e) => setReportData({ ...reportData, followUpDate: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                <textarea
                  value={reportData.notes}
                  onChange={(e) => setReportData({ ...reportData, notes: e.target.value })}
                  placeholder="Any additional notes or observations..."
                  rows={2}
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
              Create Report
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