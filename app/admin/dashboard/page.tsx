'use client';
import { useEffect, useState } from 'react';
// FIX: Changed alias imports (@/) to relative imports (../../) to resolve compilation errors
import ProtectedRoute from '@/components/auth/ProtectedRoute'; 
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  Building2, 
  UserPlus,
  CheckCircle,
  Clock
} from 'lucide-react';
import {CreateAdminModal} from '@/components/admin/CreateAdminModal';

// Updated interface type to reflect that createdAt will be a standard date string or number after API serialization
interface HospitalAdmin {
  id: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
  };
  setupComplete: boolean;
  requirePasswordReset: boolean;
  createdAt: string | number | null; // Data from API is usually string or number, not the Firestore Timestamp object
}

export default function SuperAdminDashboard() {
  const { signOut, userData } = useAuth();
  const [admins, setAdmins] = useState<HospitalAdmin[]>([]);
  const [stats, setStats] = useState({
    totalAdmins: 0,
    activeHospitals: 0,
    pendingSetup: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      // NOTE: This assumes an API route exists at /api/admin/hospital-admins
      const response = await fetch('/api/admin/hospital-admins');
      const data = await response.json();
      
      if (data.success) {
        setAdmins(data.data);
        setStats({
          totalAdmins: data.data.length,
          activeHospitals: data.data.filter((a: HospitalAdmin) => a.setupComplete).length,
          pendingSetup: data.data.filter((a: HospitalAdmin) => !a.setupComplete).length,
        });
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <div className="min-h-screen bg-gray-50">
        
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Page Title and Welcome Message - Moved from Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Super Admin Dashboard
            </h1>
            <p className="text-md text-gray-600">
              Welcome back, {userData?.profile?.firstName || userData?.email}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Admins</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalAdmins}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Hospitals</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.activeHospitals}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Building2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Setup</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.pendingSetup}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Hospital Admins Table */}
          <div className="bg-white rounded-xl shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Hospital Administrators</h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Hospital Admin
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {admins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {admin.profile.firstName} {admin.profile.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{admin.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {admin.setupComplete ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              Active
                            </span>
                          ) : admin.requirePasswordReset ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                              <Clock className="w-3 h-3" />
                              Pending Password
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                              <Clock className="w-3 h-3" />
                              Pending Setup
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {/* Uses new Date() constructor on the serialized string/number */}
                          {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && admins.length === 0 && (
                <div className="text-center p-12 text-gray-500">
                    <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg font-medium">No Administrators found</p>
                    <p className="text-sm">Click 'Add Hospital Admin' to get started.</p>
                </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Admin Modal */}
      {showCreateModal && (
        <CreateAdminModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchAdmins();
          }}
        />
      )}
    </ProtectedRoute>
  );
}