'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { 
  FileText, 
  User, 
  MapPin, 
  Phone, 
  AlertCircle,
  Calendar,
  Activity,
  Building2,
  Heart,
  Pill,
  Shield,
  CheckCircle,
  XCircle,
  Edit,
  Plus
} from 'lucide-react';

interface EHealthPassportData {
  isActive: boolean;
  activatedAt?: string;
  personalInfo: any;
  addresses: any;
  emergencyContacts: any[];
  medicalHistory: any;
  visitHistory: any;
  consent: any;
}

export default function EHealthPassportPage() {
  const [passport, setPassport] = useState<EHealthPassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');

  useEffect(() => {
    fetchPassport();
  }, []);

  const fetchPassport = async () => {
    try {
      const response = await fetch('/api/patient/ehealth-passport');
      const data = await response.json();
      
      if (data.success) {
        setPassport(data.data);
      }
    } catch (error) {
      console.error('Error fetching passport:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['patient']}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!passport?.isActive) {
    return (
      <ProtectedRoute allowedRoles={['patient']}>
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                E-Health Passport
              </h1>
              <p className="text-gray-600 mb-6">
                Your E-Health Passport hasn't been activated yet
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <p className="text-sm text-blue-800 mb-4">
                  <strong>What is E-Health Passport?</strong>
                </p>
                <p className="text-sm text-blue-700 mb-4">
                  Your E-Health Passport is a comprehensive digital health record that stores all your medical information in one secure place. It will be automatically activated when you check in at any registered hospital for the first time.
                </p>
                <div className="grid md:grid-cols-2 gap-4 text-left">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Access Anywhere</p>
                      <p className="text-xs text-gray-600">View your records from any hospital</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Secure Storage</p>
                      <p className="text-xs text-gray-600">Your data is encrypted and protected</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">You Control Access</p>
                      <p className="text-xs text-gray-600">Manage hospital permissions</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Complete History</p>
                      <p className="text-xs text-gray-600">All visits and records in one place</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Visit any registered hospital to activate your E-Health Passport
              </p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'medical', label: 'Medical History', icon: Heart },
    { id: 'visits', label: 'Hospital Visits', icon: Building2 },
    { id: 'emergency', label: 'Emergency Contacts', icon: AlertCircle },
  ];

  return (
    <ProtectedRoute allowedRoles={['patient']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">E-Health Passport</h1>
                <p className="text-blue-100">Your Complete Digital Health Record</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Active since {new Date(passport.activatedAt!).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>{passport.visitHistory?.hospitalsDetails?.length || 0} Hospitals</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>{passport.visitHistory?.totalVisits || 0} Total Visits</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-6 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {activeTab === 'overview' && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Personal Info Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Personal Information</h3>
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {passport.personalInfo.firstName} {passport.personalInfo.lastName}</p>
                  <p><strong>Email:</strong> {passport.personalInfo.email}</p>
                  <p><strong>Phone:</strong> {passport.personalInfo.phone || 'Not set'}</p>
                  <p><strong>Blood Type:</strong> {passport.personalInfo.bloodType || 'Not set'}</p>
                </div>
              </div>

              {/* Medical Summary */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Medical Summary</h3>
                  <Heart className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Allergies:</span>
                    <span className="font-medium">{passport.medicalHistory.allergies?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Conditions:</span>
                    <span className="font-medium">{passport.medicalHistory.chronicConditions?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Medications:</span>
                    <span className="font-medium">{passport.medicalHistory.currentMedications?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Surgeries:</span>
                    <span className="font-medium">{passport.medicalHistory.surgeries?.length || 0}</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Recent Activity</h3>
                  <Activity className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Last Visit:</strong></p>
                  <p className="text-gray-600">
                    {passport.visitHistory.lastVisit 
                      ? new Date(passport.visitHistory.lastVisit).toLocaleDateString()
                      : 'No visits yet'}
                  </p>
                  <p className="mt-3"><strong>Total Hospitals:</strong></p>
                  <p className="text-gray-600">{passport.visitHistory.hospitalsDetails?.length || 0} facilities</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'personal' && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-xl font-semibold">Personal Information</h3>
                <button className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700">First Name</label>
                    <p className="mt-1 text-gray-900">{passport.personalInfo.firstName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Name</label>
                    <p className="mt-1 text-gray-900">{passport.personalInfo.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-gray-900">{passport.personalInfo.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-gray-900">{passport.personalInfo.phone || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                    <p className="mt-1 text-gray-900">
                      {passport.personalInfo.dateOfBirth 
                        ? new Date(passport.personalInfo.dateOfBirth).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Gender</label>
                    <p className="mt-1 text-gray-900 capitalize">{passport.personalInfo.gender || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Blood Type</label>
                    <p className="mt-1 text-gray-900">{passport.personalInfo.bloodType || 'Not set'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Address</label>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-900">
                      {passport.addresses.primary.street || 'Street not set'}<br />
                      {passport.addresses.primary.city || 'City not set'}, {passport.addresses.primary.state || 'State not set'} {passport.addresses.primary.zipCode}<br />
                      {passport.addresses.primary.country || 'Malawi'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'visits' && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold">Hospital Visit History</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {passport.visitHistory.totalVisits} total visits across {passport.visitHistory.hospitalsDetails?.length || 0} hospitals
                </p>
              </div>
              <div className="p-6">
                {passport.visitHistory.hospitalsDetails?.length > 0 ? (
                  <div className="space-y-4">
                    {passport.visitHistory.hospitalsDetails.map((hospital: any) => (
                      <div key={hospital.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Building2 className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{hospital.name}</h4>
                            <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {hospital.address?.city || 'Location not available'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No hospital visits yet</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="space-y-6">
              {/* Allergies */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-xl font-semibold">Allergies</h3>
                  <button className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
                <div className="p-6">
                  {passport.medicalHistory.allergies?.length > 0 ? (
                    <div className="space-y-3">
                      {passport.medicalHistory.allergies.map((allergy: any) => (
                        <div key={allergy.id} className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
                          <h4 className="font-semibold text-gray-900">{allergy.allergen}</h4>
                          <p className="text-sm text-gray-600">{allergy.reaction}</p>
                          <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded mt-2 inline-block">
                            {allergy.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">No allergies recorded</p>
                  )}
                </div>
              </div>

              {/* Current Medications */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-xl font-semibold">Current Medications</h3>
                  <button className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
                <div className="p-6">
                  {passport.medicalHistory.currentMedications?.length > 0 ? (
                    <div className="space-y-3">
                      {passport.medicalHistory.currentMedications.map((med: any) => (
                        <div key={med.id} className="border border-gray-200 p-4 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Pill className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{med.name}</h4>
                              <p className="text-sm text-gray-600">{med.dosage} - {med.frequency}</p>
                              {med.purpose && <p className="text-xs text-gray-500 mt-1">{med.purpose}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">No current medications</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'emergency' && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-xl font-semibold">Emergency Contacts</h3>
                <button className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Plus className="w-4 h-4" />
                  Add Contact
                </button>
              </div>
              <div className="p-6">
                {passport.emergencyContacts?.length > 0 ? (
                  <div className="space-y-4">
                    {passport.emergencyContacts.map((contact: any) => (
                      <div key={contact.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                              <Phone className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{contact.name}</h4>
                              <p className="text-sm text-gray-600">{contact.relationship}</p>
                              <p className="text-sm text-gray-900 mt-2">{contact.phone}</p>
                              {contact.isPrimary && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mt-2 inline-block">
                                  Primary Contact
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No emergency contacts added</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}