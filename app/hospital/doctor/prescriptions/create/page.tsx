'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Pill, Plus, Trash2, Save, Search, User, Calendar, 
  AlertCircle, CheckCircle, Loader2, X, Clock
} from 'lucide-react';

interface Patient {
  id: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    bloodType?: string;
  };
}

interface MedicationItem {
  name: string;
  genericName: string;
  form: string;
  strength: string;
  quantity: number;
  unit: string;
  frequency: string;
  timing: string;
  duration: string;
  durationUnit: string;
  instructions: string;
}

export default function CreatePrescriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [medications, setMedications] = useState<MedicationItem[]>([
    {
      name: '',
      genericName: '',
      form: 'tablet',
      strength: '',
      quantity: 1,
      unit: 'tablet',
      frequency: 'once_daily',
      timing: '',
      duration: '7',
      durationUnit: 'days',
      instructions: ''
    }
  ]);

  // Search patients
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

  const updateMedication = (index: number, field: keyof MedicationItem, value: any) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const addMedication = () => {
    setMedications([...medications, {
      name: '',
      genericName: '',
      form: 'tablet',
      strength: '',
      quantity: 1,
      unit: 'tablet',
      frequency: 'once_daily',
      timing: '',
      duration: '7',
      durationUnit: 'days',
      instructions: ''
    }]);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatient) {
      setNotification({ msg: 'Please select a patient', type: 'error' });
      return;
    }

    const validMeds = medications.filter(m => m.name.trim());
    if (validMeds.length === 0) {
      setNotification({ msg: 'Add at least one medication', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/doctor/prescriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          medications: validMeds
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setNotification({ msg: 'Prescription created successfully!', type: 'success' });
      setTimeout(() => router.push('/hospital/doctor/prescriptions'), 1500);
    } catch (err: any) {
      setNotification({ msg: err.message || 'Failed to create prescription', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Pill className="w-8 h-8 text-blue-600" />
            Create New Prescription
          </h1>
          <p className="text-gray-600 mt-1">Write a new prescription for a patient</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                  type="button"
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
                        type="button"
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

          {/* Medications */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-green-600" />
                Medications
              </h2>
              <button
                type="button"
                onClick={addMedication}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus className="w-4 h-4" /> Add Medication
              </button>
            </div>

            <div className="space-y-4">
              {medications.map((med, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative">
                  {medications.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMedication(index)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Medication Name *</label>
                      <input
                        type="text"
                        value={med.name}
                        onChange={(e) => updateMedication(index, 'name', e.target.value)}
                        placeholder="e.g., Amoxicillin"
                        className="w-full mt-1 p-2 border rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Generic Name</label>
                      <input
                        type="text"
                        value={med.genericName}
                        onChange={(e) => updateMedication(index, 'genericName', e.target.value)}
                        placeholder="Generic name"
                        className="w-full mt-1 p-2 border rounded-md"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Form</label>
                      <select
                        value={med.form}
                        onChange={(e) => updateMedication(index, 'form', e.target.value)}
                        className="w-full mt-1 p-2 border rounded-md bg-white"
                      >
                        <option value="tablet">Tablet</option>
                        <option value="capsule">Capsule</option>
                        <option value="syrup">Syrup</option>
                        <option value="injection">Injection</option>
                        <option value="cream">Cream</option>
                        <option value="drops">Drops</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Strength</label>
                      <input
                        type="text"
                        value={med.strength}
                        onChange={(e) => updateMedication(index, 'strength', e.target.value)}
                        placeholder="e.g., 500mg"
                        className="w-full mt-1 p-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Quantity</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={med.quantity}
                          onChange={(e) => updateMedication(index, 'quantity', parseInt(e.target.value))}
                          className="w-20 mt-1 p-2 border rounded-md"
                          min="1"
                        />
                        <select
                          value={med.unit}
                          onChange={(e) => updateMedication(index, 'unit', e.target.value)}
                          className="flex-1 mt-1 p-2 border rounded-md bg-white"
                        >
                          <option value="tablet">tablet(s)</option>
                          <option value="capsule">capsule(s)</option>
                          <option value="ml">ml</option>
                          <option value="mg">mg</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Frequency *</label>
                      <select
                        value={med.frequency}
                        onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                        className="w-full mt-1 p-2 border rounded-md bg-white"
                      >
                        <option value="once_daily">Once daily (OD)</option>
                        <option value="twice_daily">Twice daily (BD)</option>
                        <option value="three_times_daily">3x daily (TDS)</option>
                        <option value="four_times_daily">4x daily (QDS)</option>
                        <option value="every_12_hours">Every 12 hours</option>
                        <option value="every_8_hours">Every 8 hours</option>
                        <option value="as_needed">As needed (PRN)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Timing</label>
                      <select
                        value={med.timing}
                        onChange={(e) => updateMedication(index, 'timing', e.target.value)}
                        className="w-full mt-1 p-2 border rounded-md bg-white"
                      >
                        <option value="">Select timing</option>
                        <option value="before_meals">Before meals</option>
                        <option value="after_meals">After meals</option>
                        <option value="with_meals">With meals</option>
                        <option value="empty_stomach">Empty stomach</option>
                        <option value="bedtime">At bedtime</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Duration</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={med.duration}
                          onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                          className="w-20 mt-1 p-2 border rounded-md"
                          min="1"
                        />
                        <select
                          value={med.durationUnit}
                          onChange={(e) => updateMedication(index, 'durationUnit', e.target.value)}
                          className="flex-1 mt-1 p-2 border rounded-md bg-white"
                        >
                          <option value="days">Days</option>
                          <option value="weeks">Weeks</option>
                          <option value="months">Months</option>
                          <option value="ongoing">Ongoing</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-xs font-medium text-gray-500 uppercase">Instructions</label>
                    <textarea
                      value={med.instructions}
                      onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                      placeholder="Additional instructions..."
                      rows={2}
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedPatient}
              className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Create Prescription
            </button>
          </div>
        </form>
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