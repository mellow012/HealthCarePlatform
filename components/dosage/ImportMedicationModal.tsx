
'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Clock, Bell, AlertCircle, CheckCircle } from 'lucide-react';

interface ImportMedicationModalProps {
  medication: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    purpose?: string;
    prescribedBy?: string;
  };
  recordId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportMedicationModal({
  medication,
  recordId,
  onClose,
  onSuccess,
}: ImportMedicationModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [timings, setTimings] = useState<string[]>(['08:00']);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(15);

  const addTiming = () => {
    setTimings([...timings, '12:00']);
  };

  const removeTiming = (index: number) => {
    if (timings.length > 1) {
      setTimings(timings.filter((_, i) => i !== index));
    }
  };

  const updateTiming = (index: number, value: string) => {
    const newTimings = [...timings];
    newTimings[index] = value;
    setTimings(newTimings);
  };

  const handleImport = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/dosage-scheduler/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId,
          medicationData: medication,
          timings,
          reminderEnabled,
          reminderMinutesBefore,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import medication');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Import to Dosage Scheduler</h3>
            <p className="text-sm text-gray-600 mt-1">Set up your medication schedule</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-purple-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200'
              }`}>
                1
              </div>
              <span className="text-sm font-medium">Review</span>
            </div>
            <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-purple-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">Schedule</span>
            </div>
            <div className={`w-16 h-0.5 ${step >= 3 ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-purple-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 3 ? 'bg-purple-600 text-white' : 'bg-gray-200'
              }`}>
                3
              </div>
              <span className="text-sm font-medium">Reminders</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 mb-4">Medication Details</h4>
              
              <div className="bg-purple-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Medication Name</p>
                    <p className="font-semibold text-gray-900">{medication.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Dosage</p>
                    <p className="font-semibold text-gray-900">{medication.dosage}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Frequency</p>
                    <p className="font-semibold text-gray-900">{medication.frequency}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Duration</p>
                    <p className="font-semibold text-gray-900">{medication.duration}</p>
                  </div>
                </div>
                {medication.purpose && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Purpose</p>
                    <p className="text-sm text-gray-700">{medication.purpose}</p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">What happens next?</p>
                  <p className="text-xs text-blue-700 mt-1">
                    We'll create a complete schedule for this medication and send you reminders to take it on time.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Set Dosage Times</h4>
                <p className="text-sm text-gray-600 mb-4">
                  When do you want to take this medication each day?
                </p>
              </div>

              <div className="space-y-3">
                {timings.map((time, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => updateTiming(index, e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    {timings.length > 1 && (
                      <button
                        onClick={() => removeTiming(index)}
                        className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addTiming}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-500 hover:text-purple-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Another Time
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Reminder Settings</h4>
                <p className="text-sm text-gray-600">
                  Get notified before it's time to take your medication
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className={`w-5 h-5 ${reminderEnabled ? 'text-purple-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-medium text-gray-900">Enable Reminders</p>
                      <p className="text-xs text-gray-600">Get notifications for each dose</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setReminderEnabled(!reminderEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      reminderEnabled ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        reminderEnabled ? 'transform translate-x-6' : ''
                      }`}
                    ></div>
                  </button>
                </div>

                {reminderEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Remind me before
                    </label>
                    <select
                      value={reminderMinutesBefore}
                      onChange={(e) => setReminderMinutesBefore(parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value={5}>5 minutes</option>
                      <option value={10}>10 minutes</option>
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900">Ready to start!</p>
                  <p className="text-xs text-green-700 mt-1">
                    Your dosage schedule will be created with {timings.length} dose(s) per day for {medication.duration}.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Import & Start Schedule
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}