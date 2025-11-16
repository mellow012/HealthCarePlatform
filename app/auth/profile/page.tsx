'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  MapPin,
  Edit3,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

interface ProfileData {
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string | null;
  gender: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

interface ApiProfileResponse {
  success: boolean;
  data?: ProfileData;
  error?: string;
  hasProfile?: boolean;
  setupComplete?: boolean;
}

export default function ProfilePage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: null,
    gender: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
  });
  const [viewData, setViewData] = useState<ProfileData | null>(null);
  const [hasProfile, setHasProfile] = useState(false);

  // Fetch full profile data from /api/profile (GET) on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // FIXED: Fetch from /api/profile (GET), not /api/profile/setup
        const response = await fetch('/api/profile');
        const result: ApiProfileResponse = await response.json();

        if (result.success && result.data) {
          setViewData(result.data);
          setHasProfile(!!result.hasProfile);
          // Prefill form for potential edits
          setFormData({
            ...result.data,
            dateOfBirth: result.data.dateOfBirth || '', // Stringify for input
          });
        } else {
          setViewData(null);
          setHasProfile(false);
          // Reset form for setup
          setFormData({
            firstName: '',
            lastName: '',
            phone: '',
            dateOfBirth: '',
            gender: '',
            address: { street: '', city: '', state: '', zipCode: '' },
          });
        }
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Set initial mode: setup if !setupComplete or !hasProfile
  useEffect(() => {
    if (!loading) {
      const needsSetup = !userData?.setupComplete || !hasProfile;
      setIsEditing(needsSetup);
    }
  }, [loading, userData?.setupComplete, hasProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData({
        ...formData,
        address: { ...formData.address, [addressField]: value },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleEditToggle = () => {
    if (!isEditing && viewData) {
      // Edit: pre-fill form
      setFormData({
        ...viewData,
        dateOfBirth: viewData.dateOfBirth || '', // For input
      });
    }
    setIsEditing(!isEditing);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First and last name are required');
      return;
    }
    setError('');
    setSaving(true);

    try {
      // Route to right endpoint: setup (initial) or update (edit)
      const endpoint = hasProfile ? '/api/profile/update' : '/api/profile/setup';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          dateOfBirth: formData.dateOfBirth || null, // Nullify empty dates
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || (hasProfile ? 'Update failed' : 'Setup failed'));
      }

      // Refetch to update UI
      const refreshResponse = await fetch('/api/profile');
      const refreshResult: ApiProfileResponse = await refreshResponse.json();
      if (refreshResult.success && refreshResult.data) {
        setViewData(refreshResult.data);
        setHasProfile(true);
        setFormData({
          ...refreshResult.data,
          dateOfBirth: refreshResult.data.dateOfBirth || '',
        });
      }

      setIsEditing(false);
      if (!hasProfile) {
        router.push('/patient/dashboard'); // Redirect after setup
      } else {
        // Success toast or stay (add toast lib if needed)
        console.log('Profile updated!');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!hasProfile) {
      router.push('/patient/dashboard'); // Skip setup
    } else {
      setIsEditing(false);
    }
    setError('');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pageTitle = !hasProfile ? 'Complete Your Profile' : `${viewData?.firstName || ''} ${viewData?.lastName || ''}'s Profile` || "Your Profile";
  const subtitle = !hasProfile 
    ? 'Help us personalize your healthcare experience' 
    : (isEditing ? 'Edit your information below' : 'View and manage your profile');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
                <p className="text-gray-600 text-sm">{subtitle}</p>
              </div>
            </div>
            {hasProfile && (
              <button
                onClick={handleEditToggle}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                disabled={saving}
              >
                <Edit3 className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {isEditing || !hasProfile ? (
            /* Form Mode (Setup or Edit) */
            <form onSubmit={handleSubmit} className="space-y-6">
              {!hasProfile && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3 mb-6">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800 font-medium">Why we need this</p>
                    <p className="text-sm text-blue-700 mt-1">Your profile helps hospitals provide better care.</p>
                  </div>
                </div>
              )}

              {/* Email (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name {!hasProfile && '*'}
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required={!hasProfile}
                    disabled={saving}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name {!hasProfile && '*'}
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required={!hasProfile}
                    disabled={saving}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number {!hasProfile && '*'}
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="+265 123 456 789"
                />
              </div>

              {/* DOB & Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth || ''}
                    onChange={handleChange}
                    disabled={saving}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    disabled={saving}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Address
                </label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                  disabled={saving}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 mb-3"
                  placeholder="Street Address"
                />
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    disabled={saving}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="City"
                  />
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    disabled={saving}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="State/Region"
                  />
                  <input
                    type="text"
                    name="address.zipCode"
                    value={formData.address.zipCode}
                    onChange={handleChange}
                    disabled={saving}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="Zip Code"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={saving}
                >
                  <X className="w-4 h-4 inline mr-2" />
                  {hasProfile ? 'Cancel' : 'Skip for now'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      {hasProfile ? 'Saving...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      {hasProfile ? 'Save Changes' : 'Complete Profile'}
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* View Mode */
            <div className="space-y-6">
              {/* Email */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <p className="text-sm font-medium text-gray-700">Email Address</p>
                </div>
                <p className="text-gray-900 text-sm">{user.email}</p>
              </div>

              {/* Name */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <User className="w-5 h-5 text-gray-500" />
                  <p className="text-sm font-medium text-gray-700">Full Name</p>
                </div>
                <p className="text-gray-900 text-sm">{`${viewData?.firstName || ''} ${viewData?.lastName || ''}`.trim() || 'Not provided'}</p>
              </div>

              {/* Phone */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <p className="text-sm font-medium text-gray-700">Phone Number</p>
                </div>
                <p className="text-gray-900 text-sm">{viewData?.phone || 'Not provided'}</p>
              </div>

              {/* DOB & Gender */}
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <p className="text-sm font-medium text-gray-700">Date of Birth</p>
                  </div>
                  <p className="text-gray-900 text-sm">
                    {viewData?.dateOfBirth 
                      ? new Date(viewData.dateOfBirth).toLocaleDateString() 
                      : 'Not provided'
                    }
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-gray-500" />
                    <p className="text-sm font-medium text-gray-700">Gender</p>
                  </div>
                  <p className="text-gray-900 text-sm">{viewData?.gender || 'Not provided'}</p>
                </div>
              </div>

              {/* Address */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <p className="text-sm font-medium text-gray-700">Address</p>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-900">{viewData?.address.street || 'Not provided'}</p>
                  <p className="text-gray-900">
                    {viewData?.address.city || ''}, {viewData?.address.state || ''} {viewData?.address.zipCode || ''}
                  </p>
                </div>
              </div>

              {/* Edit Button */}
              <button
                onClick={handleEditToggle}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Edit3 className="w-5 h-5" />
                Edit Profile
              </button>
            </div>
          )}

          {/* Note */}
          {!isEditing && hasProfile && (
            <p className="text-xs text-gray-500 text-center mt-6">
              You can update your profile anytime. All changes are saved securely.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}