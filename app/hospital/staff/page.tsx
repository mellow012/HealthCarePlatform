'use client';

import React, { useEffect, useState } from 'react';
import {
  Loader2,
  Users,
  UserPlus,
  Search,
  Stethoscope,
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  X,
  AlertCircle,
  FileText, // Icon for records/billing
  BriefcaseBusiness, // Icon for general administration
} from 'lucide-react';

// --- TYPES ---
interface StaffMember {
  uid: string;
  email: string;
  profile?: { firstName?: string; lastName?: string };
  role: string;
  department?: string;
  status: 'active' | 'inactive';
  setupComplete: boolean;
  createdAt: any;
}

interface Department {
  id: string;
  name: string;
}

// --- MODAL COMPONENT (Internal) ---
// Using the previous modal structure but assuming 'Administration' will be available 
// in the fetched departments list from /api/hospital/departments
const AddStaffModal = ({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [formData, setFormData] = useState({ email: '', role: '', department: '' });
  const [roles, setRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load options for the dropdowns
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        // NOTE: In a real app, this API would return the full list including the new 'administration' department
        const [rolesRes, deptRes] = await Promise.all([
          fetch('/api/hospital/roles'),
          fetch('/api/hospital/departments')
        ]);
        const rData = await rolesRes.json();
        const dData = await deptRes.json();
        if (rData.success) {
            // Include sample administrative roles if the API doesn't provide them all
            const apiRoles = rData.data || [];
            if (!apiRoles.some((r: any) => r.name === 'receptionist')) {
                setRoles([...apiRoles, { id: 'rec', name: 'receptionist' }, { id: 'bill', name: 'billing_specialist' }]);
            } else {
                setRoles(apiRoles);
            }
        }
        if (dData.success) {
             // Ensure 'administration' is present in the list
             const apiDepts = dData.data || [];
             if (!apiDepts.some((d: any) => d.id === 'administration')) {
                 setDepartments([...apiDepts, { id: 'administration', name: 'Administration' }]);
             } else {
                 setDepartments(apiDepts);
             }
        }
      } catch (e) {
        console.error("Failed to load options");
      }
    };
    fetchOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/hospital/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to invite staff');
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Invite Staff</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" required 
              className="w-full px-3 py-2 border rounded-lg"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select 
              required 
              className="w-full px-3 py-2 border rounded-lg"
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value})}
            >
              <option value="">Select Role</option>
              {/* Filter out admin role from staff invites */}
              {roles.filter(r => r.name !== 'hospital_admin').map(r => <option key={r.id} value={r.name}>{r.name.replace(/_/g, ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select 
              className="w-full px-3 py-2 border rounded-lg"
              value={formData.department}
              onChange={e => setFormData({...formData, department: e.target.value})}
            >
              <option value="">Select Department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Sending Invite...' : 'Send Invitation'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---

export default function HospitalStaffManagementPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffRes, deptRes] = await Promise.all([
        fetch('/api/hospital/staff'),
        fetch('/api/hospital/departments'),
      ]);

      const staffJson = await staffRes.json();
      const deptJson = await deptRes.json();

      if (staffJson.success) setStaff(staffJson.data || []);
      
      let fetchedDepts = deptJson.data || [];
      // Manually ensure the Administration department is available for display purposes
      if (!fetchedDepts.some((d: Department) => d.id === 'administration')) {
          fetchedDepts.push({ id: 'administration', name: 'Administration' });
      }
      setDepartments(fetchedDepts);

    } catch (err) {
      console.error('Failed to load staff data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helpers
  const getDeptName = (deptId?: string) =>
    departments.find((d) => d.id === deptId)?.name || '—';

  const getRoleConfig = (role: string) => {
    const configs: Record<string, { icon: any; color: string; label: string }> = {
      // CLINICAL ROLES
      'doctor': { icon: Stethoscope, color: 'blue', label: 'Doctor' },
      'nurse': { icon: ClipboardList, color: 'purple', label: 'Nurse' },
      'pharmacist': { icon: ClipboardList, color: 'yellow', label: 'Pharmacist' },
      
      // ADMINISTRATIVE SUPPORT ROLES (New)
      'receptionist': { icon: BriefcaseBusiness, color: 'green', label: 'Receptionist' },
      'billing_specialist': { icon: FileText, color: 'green', label: 'Billing Specialist' },
      'records_clerk': { icon: FileText, color: 'green', label: 'Records Clerk' },

      // MANAGEMENT ROLES
      'hospital_admin': { icon: Users, color: 'indigo', label: 'Hospital Admin' },
    };
    
    // Convert role_name to "Role Name" for display if not found, otherwise use the specific label
    const defaultLabel = role.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    return configs[role.toLowerCase()] || { icon: Users, color: 'gray', label: defaultLabel };
  };

  const getStatusBadge = (member: StaffMember) => {
    if (!member.setupComplete) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
          <Clock className="w-3.5 h-3.5" /> Pending Setup
        </span>
      );
    }
    if (member.status === 'inactive') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
          <XCircle className="w-3.5 h-3.5" /> Inactive
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
        <CheckCircle className="w-3.5 h-3.5" /> Active
      </span>
    );
  };

  // Filter staff
  const filteredStaff = staff.filter((s) => {
    const query = search.toLowerCase();
    const fullName = `${s.profile?.firstName || ''} ${s.profile?.lastName || ''}`.toLowerCase();
    const roleLabel = getRoleConfig(s.role).label.toLowerCase();
    return fullName.includes(query) || s.email.toLowerCase().includes(query) || roleLabel.includes(query);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Staff Dashboard</h1>
        </div>

        {/* Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-2xl p-8 mb-8 text-center shadow-xl">
          <h2 className="text-2xl font-bold mb-3">Manage Hospital Staff</h2>
          <p className="text-lg opacity-90 mb-6">View directory and invite new members, including dedicated administrative staff.</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-indigo-700 font-bold rounded-xl hover:bg-gray-50 transition shadow-lg"
          >
            <UserPlus className="w-6 h-6" />
            Add New Staff Member
          </button>
        </div>

        {/* Search */}
        <div className="mb-8 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search staff by name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-blue-600"/></div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No staff found matching your search.</div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Staff Member</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStaff.map((member) => {
                  const config = getRoleConfig(member.role);
                  const Icon = config.icon;
                  return (
                    <tr key={member.uid} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full bg-${config.color}-100 flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 text-${config.color}-600`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{member.profile?.firstName || 'Pending'} {member.profile?.lastName}</p>
                            <p className="text-sm text-gray-500">{config.label}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{member.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{config.label}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{getDeptName(member.department)}</td>
                      <td className="px-6 py-4">{getStatusBadge(member)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Instance */}
      {showModal && (
        <AddStaffModal 
          onClose={() => setShowModal(false)} 
          onSuccess={() => {
            loadData(); // Refresh list on success
            setShowModal(false);
          }} 
        />
      )}
    </div>
  );
}