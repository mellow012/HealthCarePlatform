'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface Hospital {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    district?: string;
    country?: string;
  };
  adminUserId: string;
  status: 'active' | 'pending' | 'inactive';
  setupCompleted: boolean;
  createdAt: any;
  updatedAt: any;
}

export default function HospitalsManagementPage() {
  const { userData } = useAuth();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    inactive: 0,
  });

  useEffect(() => {
    fetchHospitals();
  }, []);

  useEffect(() => {
    filterHospitals();
  }, [hospitals, searchQuery, statusFilter]);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/hospital-admins');
      const data = await response.json();

      if (data.success) {
        setHospitals(data.data);
        calculateStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching hospitals:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (hospitalsList: Hospital[]) => {
    setStats({
      total: hospitalsList.length,
      active: hospitalsList.filter(h => h.status === 'active').length,
      pending: hospitalsList.filter(h => h.status === 'pending').length,
      inactive: hospitalsList.filter(h => h.status === 'inactive').length,
    });
  };

  const filterHospitals = () => {
    let filtered = hospitals;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(h => h.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(h =>
        h.name.toLowerCase().includes(query) ||
        h.email.toLowerCase().includes(query) ||
        h.phone?.toLowerCase().includes(query)
      );
    }

    setFilteredHospitals(filtered);
  };

  const handleDelete = async (hospitalId: string) => {
    if (!confirm('Are you sure you want to delete this hospital? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/hospitals/${hospitalId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('Hospital deleted successfully');
        fetchHospitals();
      } else {
        alert(data.error || 'Failed to delete hospital');
      }
    } catch (error) {
      console.error('Error deleting hospital:', error);
      alert('Failed to delete hospital');
    }
  };

  const getStatusBadge = (status: string, setupCompleted: boolean) => {
    if (status === 'active' && setupCompleted) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
          <CheckCircle className="w-3 h-3" />
          Active
        </span>
      );
    } else if (status === 'pending' || !setupCompleted) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
          <Clock className="w-3 h-3" />
          Pending Setup
        </span>
      );
    } else if (status === 'inactive') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
          <XCircle className="w-3 h-3" />
          Inactive
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
              Hospitals Management
            </h1>
            <p className="text-md text-gray-600">
              Manage all hospital instances in the system
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Hospitals</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Building2 className="w-6 h-6 text-blue-600" />
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

            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Inactive</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.inactive}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <XCircle className="w-6 h-6 text-red-600" />
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
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>

                {/* Add Hospital Button */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Add Hospital
                </button>
              </div>
            </div>
          </div>

          {/* Hospitals Table */}
          <div className="bg-white rounded-xl shadow">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading hospitals...</p>
              </div>
            ) : filteredHospitals.length === 0 ? (
              <div className="text-center p-12 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">No hospitals found</p>
                <p className="text-sm">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : "Click 'Add Hospital' to create one"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hospital Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
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
                    {filteredHospitals.map((hospital) => (
                      <tr key={hospital.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{hospital.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 flex items-center gap-1">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {hospital.email}
                          </div>
                          {hospital.phone && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="w-4 h-4 text-gray-400" />
                              {hospital.phone}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 flex items-start gap-1">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span>
                              {hospital.address?.city || 'N/A'}
                              {hospital.address?.district && `, ${hospital.address.district}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(hospital.status, hospital.setupCompleted)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {hospital.createdAt ? new Date(hospital.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedHospital(hospital);
                                setShowViewModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedHospital(hospital);
                                setShowEditModal(true);
                              }}
                              className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(hospital.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition"
                              title="Delete"
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

      {/* Modals will go here - we'll create separate components for these */}
    </ProtectedRoute>
  );
}