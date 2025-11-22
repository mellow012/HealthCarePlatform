'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Correct import for App Router
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { 
  User, 
  Calendar, 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  CheckCircle,
  Pill
} from 'lucide-react';

// Types
interface PrescriptionItem {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string;
}

export default function ConsultationPage({ params }: { params: { appointmentId: string } }) {
  const router = useRouter();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);
  
  // Form State
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([
    { medication: '', dosage: '', frequency: '', duration: '', notes: '' }
  ]);

  // Fetch Appointment Details on Load
  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const res = await fetch(`/api/doctor/appointments/${params.appointmentId}`);
        const data = await res.json();
        if (data.success) {
          setAppointment(data.data);
        }
      } catch (error) {
        console.error('Error fetching appointment:', error);
      }
    };
    fetchAppointment();
  }, [params.appointmentId]);

  // Prescription Management
  const updatePrescription = (index: number, field: keyof PrescriptionItem, value: string) => {
    const newItems = [...prescriptions];
    newItems[index][field] = value;
    setPrescriptions(newItems);
  };

  const addPrescriptionItem = () => {
    setPrescriptions([...prescriptions, { medication: '', dosage: '', frequency: '', duration: '', notes: '' }]);
  };

  const removePrescriptionItem = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim()) return alert('Diagnosis is required');

    setLoading(true);
    try {
      const payload = {
        appointmentId: params.appointmentId,
        patientId: appointment.patientId, // Assuming this exists on the appointment object
        patientName: appointment.patientName,
        diagnosis,
        symptoms,
        clinicalNotes,
        prescriptions: prescriptions.filter(p => p.medication.trim() !== '') // Remove empty rows
      };

      const res = await fetch('/api/consultation/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Redirect back to dashboard
      router.push('/hospital/dashboard');
    } catch (error: any) {
      alert(error.message || 'Failed to save consultation');
    } finally {
      setLoading(false);
    }
  };

  if (!appointment) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <ProtectedRoute allowedRoles={['doctor', 'hospital_admin']}>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* Patient Header Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Patient Consultation</h1>
              <div className="flex items-center gap-4 text-gray-600 mt-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{appointment.patientName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
              Visit ID: {params.appointmentId.slice(0, 8)}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Clinical Assessment */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Clinical Assessment
              </h2>
              
              <div className="grid gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Symptoms Reported</label>
                  <textarea 
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Patient complaints..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis *</label>
                  <input 
                    type="text"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                    placeholder="Primary diagnosis..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Clinical Notes / Advice</label>
                  <textarea 
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder="Treatment plan, lifestyle advice, etc."
                  />
                </div>
              </div>
            </div>

            {/* Electronic Prescription */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-green-600" />
                  Prescription
                </h2>
                <button 
                  type="button" 
                  onClick={addPrescriptionItem}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Drug
                </button>
              </div>

              <div className="space-y-4">
                {prescriptions.map((item, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative group">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Medication</label>
                        <input 
                          type="text" 
                          value={item.medication}
                          onChange={(e) => updatePrescription(index, 'medication', e.target.value)}
                          placeholder="e.g., Amoxicillin"
                          className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Dosage</label>
                        <input 
                          type="text" 
                          value={item.dosage}
                          onChange={(e) => updatePrescription(index, 'dosage', e.target.value)}
                          placeholder="e.g., 500mg"
                          className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Frequency</label>
                        <select 
                          value={item.frequency}
                          onChange={(e) => updatePrescription(index, 'frequency', e.target.value)}
                          className="w-full mt-1 p-2 border border-gray-300 rounded-md bg-white"
                        >
                          <option value="">Select...</option>
                          <option value="1x daily">1x daily (OD)</option>
                          <option value="2x daily">2x daily (BD)</option>
                          <option value="3x daily">3x daily (TDS)</option>
                          <option value="4x daily">4x daily (QDS)</option>
                          <option value="As needed">As needed (PRN)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Duration</label>
                        <input 
                          type="text" 
                          value={item.duration}
                          onChange={(e) => updatePrescription(index, 'duration', e.target.value)}
                          placeholder="e.g., 5 days"
                          className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Instructions</label>
                        <input 
                          type="text" 
                          value={item.notes}
                          onChange={(e) => updatePrescription(index, 'notes', e.target.value)}
                          placeholder="e.g., After meals"
                          className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    
                    {prescriptions.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removePrescriptionItem(index)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Complete Consultation
              </button>
            </div>

          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}