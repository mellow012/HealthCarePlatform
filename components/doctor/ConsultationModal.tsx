// components/doctor/ConsultationModal.tsx
'use client';

import { useState } from 'react';
import { X, Loader2, FileText, Plus, Trash2, Clock, Pill } from 'lucide-react';

interface PatientVisit {
  id: string;
  patientId: string;
  patient: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

interface Medication {
  name: string;
  genericName: string;
  form: string;
  strength: string;
  quantity: number;
  unit: string;
  frequency: string;
  timesPerDay: number;
  specificTimes: string[];
  timing: string;
  duration: string;
  durationUnit: string;
  instructions: string;
  refills: number;
}

const emptyMedication: Medication = {
  name: '',
  genericName: '',
  form: 'tablet',
  strength: '',
  quantity: 1,
  unit: 'tablet',
  frequency: 'once_daily',
  timesPerDay: 1,
  specificTimes: ['08:00'],
  timing: '',
  duration: '7',
  durationUnit: 'days',
  instructions: '',
  refills: 0,
};

const FREQUENCIES = [
  { value: 'once_daily', label: 'Once daily', times: 1 },
  { value: 'twice_daily', label: 'Twice daily', times: 2 },
  { value: 'three_times_daily', label: 'Three times daily', times: 3 },
  { value: 'four_times_daily', label: 'Four times daily', times: 4 },
  { value: 'every_12_hours', label: 'Every 12 hours', times: 2 },
  { value: 'every_8_hours', label: 'Every 8 hours', times: 3 },
  { value: 'every_6_hours', label: 'Every 6 hours', times: 4 },
  { value: 'as_needed', label: 'As needed (PRN)', times: 0 },
];

const FORMS = [
  'tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 
  'drops', 'inhaler', 'patch', 'suppository', 'other'
];

const TIMINGS = [
  { value: '', label: 'No specific timing' },
  { value: 'before_meals', label: 'Before meals' },
  { value: 'after_meals', label: 'After meals' },
  { value: 'with_food', label: 'With food' },
  { value: 'empty_stomach', label: 'On empty stomach' },
  { value: 'bedtime', label: 'At bedtime' },
  { value: 'morning', label: 'In the morning' },
];

interface Props {
  visit: PatientVisit;
  onClose: () => void;
  onSuccess: () => void;
  showNotification: (msg: string, type: 'success' | 'error') => void;
}

export default function ConsultationModal({ visit, onClose, onSuccess, showNotification }: Props) {
  const [diagnosis, setDiagnosis] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [medications, setMedications] = useState<Medication[]>([{ ...emptyMedication }]);
  const [saving, setSaving] = useState(false);
  const [expandedMed, setExpandedMed] = useState<number | null>(0);

  const addMedication = () => {
    setMedications([...medications, { ...emptyMedication }]);
    setExpandedMed(medications.length);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
    if (expandedMed === index) setExpandedMed(null);
  };

  const updateMedication = (index: number, field: keyof Medication, value: any) => {
    const updated = [...medications];
    (updated[index] as any)[field] = value;

    // Auto-update times per day when frequency changes
    if (field === 'frequency') {
      const freq = FREQUENCIES.find(f => f.value === value);
      if (freq) {
        updated[index].timesPerDay = freq.times;
        updated[index].specificTimes = getDefaultTimes(value);
      }
    }

    setMedications(updated);
  };

  const getDefaultTimes = (frequency: string): string[] => {
    const map: Record<string, string[]> = {
      'once_daily': ['08:00'],
      'twice_daily': ['08:00', '20:00'],
      'three_times_daily': ['08:00', '14:00', '20:00'],
      'four_times_daily': ['08:00', '12:00', '16:00', '20:00'],
      'every_12_hours': ['08:00', '20:00'],
      'every_8_hours': ['08:00', '16:00', '00:00'],
      'every_6_hours': ['06:00', '12:00', '18:00', '00:00'],
      'as_needed': [],
    };
    return map[frequency] || ['08:00'];
  };

  const updateSpecificTime = (medIndex: number, timeIndex: number, value: string) => {
    const updated = [...medications];
    updated[medIndex].specificTimes[timeIndex] = value;
    setMedications(updated);
  };

  const submit = async () => {
    if (!diagnosis.trim()) {
      showNotification('Diagnosis is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/doctor/diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: visit.patientId,
          visitId: visit.id,
          diagnosis,
          recommendations,
          medications: medications.filter(m => m.name.trim()),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');

      onSuccess();
      onClose();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Consultation</h2>
            <p className="text-gray-600">
              {visit.patient.profile.firstName} {visit.patient.profile.lastName}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Diagnosis */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Diagnosis <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter diagnosis..."
            />
          </div>

          {/* Recommendations */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Recommendations
            </label>
            <textarea
              rows={3}
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Follow-up instructions, lifestyle changes, etc."
            />
          </div>

          {/* Prescriptions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Pill className="w-5 h-5 text-blue-600" />
                Prescriptions
              </label>
              <button
                onClick={addMedication}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add Medication
              </button>
            </div>

            <div className="space-y-4">
              {medications.map((med, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-xl overflow-hidden"
                >
                  {/* Medication Header */}
                  <div
                    className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedMed(expandedMed === index ? null : index)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Pill className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {med.name || `Medication ${index + 1}`}
                        </p>
                        {med.name && (
                          <p className="text-sm text-gray-500">
                            {med.quantity} {med.unit} • {FREQUENCIES.find(f => f.value === med.frequency)?.label} • {med.duration} {med.durationUnit}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {medications.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeMedication(index);
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Form */}
                  {expandedMed === index && (
                    <div className="p-4 space-y-4 border-t">
                      {/* Row 1: Name, Generic, Form, Strength */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Medication Name *
                          </label>
                          <input
                            type="text"
                            value={med.name}
                            onChange={(e) => updateMedication(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            placeholder="e.g., Amoxicillin"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Generic Name
                          </label>
                          <input
                            type="text"
                            value={med.genericName}
                            onChange={(e) => updateMedication(index, 'genericName', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Form
                          </label>
                          <select
                            value={med.form}
                            onChange={(e) => updateMedication(index, 'form', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm capitalize"
                          >
                            {FORMS.map(form => (
                              <option key={form} value={form} className="capitalize">{form}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Strength
                          </label>
                          <input
                            type="text"
                            value={med.strength}
                            onChange={(e) => updateMedication(index, 'strength', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            placeholder="e.g., 500mg"
                          />
                        </div>
                      </div>

                      {/* Row 2: Quantity, Frequency, Timing */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Dose Quantity
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="1"
                              value={med.quantity}
                              onChange={(e) => updateMedication(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-20 px-3 py-2 border rounded-lg text-sm"
                            />
                            <select
                              value={med.unit}
                              onChange={(e) => updateMedication(index, 'unit', e.target.value)}
                              className="flex-1 px-3 py-2 border rounded-lg text-sm"
                            >
                              <option value="tablet">tablet(s)</option>
                              <option value="capsule">capsule(s)</option>
                              <option value="ml">ml</option>
                              <option value="mg">mg</option>
                              <option value="puff">puff(s)</option>
                              <option value="drop">drop(s)</option>
                              <option value="application">application(s)</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Frequency
                          </label>
                          <select
                            value={med.frequency}
                            onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          >
                            {FREQUENCIES.map(freq => (
                              <option key={freq.value} value={freq.value}>{freq.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Timing
                          </label>
                          <select
                            value={med.timing}
                            onChange={(e) => updateMedication(index, 'timing', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          >
                            {TIMINGS.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Duration
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="1"
                              value={med.duration}
                              onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                              className="w-20 px-3 py-2 border rounded-lg text-sm"
                            />
                            <select
                              value={med.durationUnit}
                              onChange={(e) => updateMedication(index, 'durationUnit', e.target.value)}
                              className="flex-1 px-3 py-2 border rounded-lg text-sm"
                            >
                              <option value="days">days</option>
                              <option value="weeks">weeks</option>
                              <option value="months">months</option>
                              <option value="ongoing">ongoing</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Row 3: Specific Times (for scheduler) */}
                      {med.frequency !== 'as_needed' && med.specificTimes.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Scheduled Times (for patient's dosage scheduler)
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {med.specificTimes.map((time, timeIndex) => (
                              <input
                                key={timeIndex}
                                type="time"
                                value={time}
                                onChange={(e) => updateSpecificTime(index, timeIndex, e.target.value)}
                                className="px-3 py-2 border rounded-lg text-sm"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Row 4: Instructions & Refills */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Special Instructions
                          </label>
                          <input
                            type="text"
                            value={med.instructions}
                            onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            placeholder="e.g., Take with plenty of water, avoid alcohol"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Refills Allowed
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={med.refills}
                            onChange={(e) => updateMedication(index, 'refills', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex gap-4 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !diagnosis.trim()}
            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
            {saving ? 'Saving...' : 'Save & Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}