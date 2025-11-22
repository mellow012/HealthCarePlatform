// app/hospital/receptionist/search/page.tsx
'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  Search,
  User,
  Mail,
  Phone,
  Calendar,
  Loader2,
  FileText,
} from 'lucide-react';

export default function ReceptionistSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

 const handleSearch = async () => {
  if (!searchQuery.trim()) {
    setSearchResults([]);
    return;
  }

  setSearching(true);
  try {
    const response = await fetch(`/api/patient/search?q=${encodeURIComponent(searchQuery)}`);
    const data = await response.json();

    if (data.success && Array.isArray(data.data)) {
      setSearchResults(data.data);  // ← THIS IS CORRECT
    } else {
      setSearchResults([]);
    }
  } catch (error) {
    console.error('Error searching:', error);
    setSearchResults([]);
  } finally {
    setSearching(false);
  }
};

  return (
    <ProtectedRoute allowedRoles={['receptionist']}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Search className="w-8 h-8 text-blue-600" />
            Find Patient
          </h1>
          <p className="text-gray-600 mt-1">
            Search for patient records and information
          </p>
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                placeholder="Enter patient email address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center gap-2"
            >
              {searching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-4">
            {searchResults.map((patient) => (
              <div key={patient.id} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {patient.profile?.firstName} {patient.profile?.lastName}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{patient.email}</span>
                      </div>
                      {patient.profile?.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{patient.profile.phone}</span>
                        </div>
                      )}
                      {patient.profile?.dateOfBirth && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(patient.profile.dateOfBirth).toLocaleDateString()}</span>
                        </div>
                      )}
                      {patient.profile?.bloodType && (
                        <div>
                          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                            Blood Type: {patient.profile.bloodType}
                          </span>
                        </div>
                      )}
                    </div>

                    <button className="mt-6 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      View Full Record
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!searching && searchQuery && searchResults.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center text-gray-500">
            <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No patient found</p>
            <p className="text-sm">Try searching with a different email address</p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}