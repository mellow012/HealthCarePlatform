// app/super-admin/admins/page.tsx
'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  Shield,
  UserCog,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Loader2,
  Crown,
} from 'lucide-react';
import { CreateSuperAdminModal } from '@/components/admin/CreateSuperAdminModal';
import { CreateAdminModal } from '@/components/admin/CreateAdminModal';

interface Admin {
  id: string;
  email: string;
  role: 'hospital_admin' | 'super_admin';
  profile?: {
    firstName?: string;
    lastName?: string;
  };
  hospitalId?: string;
  setupComplete: boolean;
  requirePasswordReset: boolean;
  isActive: boolean;
  createdAt: any;
}

export default function AdminsManagementPage() {
  const { userData } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<Admin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'hospital_admin' | 'super_admin'>('all');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateSuperAdminModal, setShowCreateSuperAdminModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    superAdmins: 0,
    hospitalAdmins: 0,
    active: 0,
    pending: 0,
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  useEffect(() => {
    filterAdmins();
  }, [admins, searchQuery, roleFilter]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/super-admin/admins');
      const data = await response.json();

      if (data.success) {
        setAdmins(data.data);
        calculateStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (adminsList: Admin[]) => {
    setStats({
      total: adminsList.length,
      superAdmins: adminsList.filter(a => a.role === 'super_admin').length,
      hospitalAdmins: adminsList.filter(a => a.role === 'hospital_admin').length,
      active: adminsList.filter(a => a.setupComplete && a.isActive !== false).length,
      pending: adminsList.filter(a => !a.setupComplete).length,
    });
  };

  const filterAdmins = () => {
    let filtered = admins;

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(a => a.role === roleFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.email.toLowerCase().includes(query) ||
        a.profile?.firstName?.toLowerCase().includes(query) ||
        a.profile?.lastName?.toLowerCase().includes(query)
      );
    }

    setFilteredAdmins(filtered);
  };

  const handleToggleStatus = async (adminId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/super-admin/admins/${adminId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Admin ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        fetchAdmins();
      } else {
        alert(data.error || 'Failed to update admin status');
      }
    } catch (error) {
      console.error('Error updating admin status:', error);
      alert('Failed to update admin status');
    }
  };

  const handleDelete = async (adminId: string) => {
    if (!confirm('Are you sure you want to delete this admin? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/super-admin/admins/${adminId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('Admin deleted successfully');
        fetchAdmins();
      } else {
        alert(data.error || 'Failed to delete admin');
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('Failed to delete admin');
    }
  };

  const getStatusBadge = (admin: Admin) => {
    if (!admin.setupComplete) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
          <Clock className="w-3 h-3" />
          Pending Setup
        </span>
      );
    } else if (admin.isActive === false) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
          <XCircle className="w-3 h-3" />
          Inactive
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
          <CheckCircle className="w-3 h-3" />
          Active
        </span>
      );
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'super_admin') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
          <Crown className="w-3 h-3" />
          Super Admin
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
          <Shield className="w-3 h-3" />
          Hospital Admin
        </span>
      );
    }
  };

  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Administrators Management
            </h1>
            <p className="text-md text-gray-600">
              Manage all administrators and super admins in the system
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Admins</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Super Admins</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.superAdmins}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Crown className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Hospital Admins</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.hospitalAdmins}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-xl shadow mb-6">
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="all">All Roles</option>
                  <option value="super_admin">Super Admins</option>
                  <option value="hospital_admin">Hospital Admins</option>
                </select>

                {/* Add Admin Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedAdmin(null);
                      setShowCreateModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Add Hospital Admin
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateSuperAdminModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-md whitespace-nowrap"
                  >
                    <Crown className="w-4 h-4" />
                    Add Super Admin
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Admins Table */}
          <div className="bg-white rounded-xl shadow">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading administrators...</p>
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div className="text-center p-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">No administrators found</p>
                <p className="text-sm">
                  {searchQuery || roleFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Click "Add Admin" to create one'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Administrator
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredAdmins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${
                              admin.role === 'super_admin' ? 'bg-purple-100' : 'bg-blue-100'
                            }`}>
                              {admin.role === 'super_admin' ? (
                                <Crown className={`w-5 h-5 text-purple-600`} />
                              ) : (
                                <UserCog className={`w-5 h-5 text-blue-600`} />
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {admin.profile?.firstName || 'N/A'} {admin.profile?.lastName || ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 flex items-center gap-1">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {admin.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getRoleBadge(admin.role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(admin)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {admin.setupComplete && (
                              <button
                                onClick={() => handleToggleStatus(admin.id, admin.isActive !== false)}
                                className={`${
                                  admin.isActive === false
                                    ? 'text-green-600 hover:text-green-900 hover:bg-green-50'
                                    : 'text-orange-600 hover:text-orange-900 hover:bg-orange-50'
                                } p-1 rounded transition`}
                                title={admin.isActive === false ? 'Activate' : 'Deactivate'}
                              >
                                {admin.isActive === false ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : (
                                  <XCircle className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(admin.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition"
                              title="Delete"
                              disabled={admin.id === userData?.uid}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Hospital Admin Modal */}
      {showCreateModal && (
        <CreateAdminModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchAdmins();
          }}
        />
      )}

      {/* Create Super Admin Modal */}
      {showCreateSuperAdminModal && (
        <CreateSuperAdminModal
          onClose={() => setShowCreateSuperAdminModal(false)}
          onSuccess={() => {
            setShowCreateSuperAdminModal(false);
            fetchAdmins();
          }}
        />
      )}
    </ProtectedRoute>
  );
}