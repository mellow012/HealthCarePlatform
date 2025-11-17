'use client'
import React, { useState, useEffect } from 'react';
import { Phone, MapPin, Navigation, Clock, Activity, AlertCircle, Newspaper, TrendingUp, Heart, Shield, Loader2, ArrowLeft } from 'lucide-react';

// --- Local Navigation/Routing replacements ---

// Custom hook to simulate useRouter().back() and allow for setting the 'tab' query param
const useSimpleRouter = (activeTab: string, setActiveTab: (tab: string) => void) => {
  const navigate = (newTab: string) => {
    setActiveTab(newTab);
    // Simple URL update to reflect the tab, without using 'next/navigation'
    window.history.pushState(null, '', `?tab=${newTab}`);
  };

  const back = () => {
    window.history.back();
  };

  return { navigate, back };
};

// Custom hook to simulate useSearchParams() for initial load
const useInitialSearchParams = () => {
    const [initialTab, setInitialTab] = useState('emergency');
    
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab) {
            setInitialTab(tab);
        }
    }, []);

    return initialTab;
};

// Simple ProtectedRoute placeholder component (since the external component cannot be resolved)
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  // In a real implementation using Firebase/etc., we would check auth status here.
  // For the fix, we just render the content.
  return <>{children}</>;
};

// --- Interfaces & Types ---

interface Hospital {
  id: string;
  name: string;
  type: string;
  phone: string;
  services: string[]; // Ensure this is always defined as a string[]
  status: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  distance?: number | string;
  estimatedTime?: string;
}

interface HealthNews {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  publishedAt: any;
}

// --- Main Component ---

export default function EmergencyServicesPage() {
  const initialTab = useInitialSearchParams();
  const [activeTab, setActiveTab] = useState(initialTab);
  const { back } = useSimpleRouter(activeTab, setActiveTab); // Use the simple router replacement

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [newsArticles, setNewsArticles] = useState<HealthNews[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);

  // Update URL state when activeTab changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (activeTab && params.get('tab') !== activeTab) {
        window.history.pushState(null, '', `?tab=${activeTab}`);
    }
  }, [activeTab]);

  useEffect(() => {
    loadHospitals();
  }, [userLocation]);

  useEffect(() => {
    loadNews();
  }, [selectedCategory]);

  // --- Data Loading Mock Functions (API calls would be here) ---

  const loadHospitals = async () => {
    try {
      setLoadingHospitals(true);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

      const mockHospitals: Hospital[] = [
        {
          id: 'h1', name: 'City General Hospital', type: 'Major Trauma Center', phone: '555-0101',
          services: ['Emergency Surgery', 'ICU', 'Pediatrics'], status: 'High Capacity',
          address: '123 Main St', location: { latitude: 34.0522, longitude: -118.2437 },
          distance: undefined, estimatedTime: undefined,
        },
        {
          id: 'h2', name: 'Downtown Urgent Care', type: '24/7 Clinic', phone: '555-0202',
          services: ['Minor Injuries', 'X-Ray', 'Flu Shots', 'General Practice'], status: 'Low Capacity',
          address: '456 Oak Ave', location: { latitude: 34.0622, longitude: -118.2537 },
          distance: undefined, estimatedTime: undefined,
        },
        {
          id: 'h3', name: 'Children\'s Medical Center', type: 'Specialty Pediatric Hospital', phone: '555-0303',
          services: ['Pediatric ICU', 'Neonatology', 'Child Psychiatry'], status: 'Medium Capacity',
          address: '789 Pine Ln', location: { latitude: 34.0422, longitude: -118.2337 },
          distance: undefined, estimatedTime: undefined,
        },
        // Ensure ALL mock objects have the 'services' property initialized as an array.
      ].map(h => ({
        ...h,
        // If location is detected, simulate distance calculation based on mock data availability
        distance: userLocation ? parseFloat((Math.random() * 20 + 1).toFixed(1)) : undefined,
        estimatedTime: userLocation ? (Math.floor(Math.random() * 30) + 5) + ' min' : undefined,
      })) as Hospital[];
      
      setHospitals(mockHospitals);

    } catch (error) {
      console.error('Error loading hospitals:', error);
      setHospitals([]); 
    } finally {
      setLoadingHospitals(false);
    }
  };

  const loadNews = async () => {
    // NOTE: Since API endpoints are not available in this environment,
    // this function is mocked to return sample data.
    try {
      setLoadingNews(true);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

      const allNews: HealthNews[] = [
        { id: 'n1', title: 'New strain of flu detected in North East region', summary: 'Health officials advise vigilance and vaccination.', source: 'Regional Health Authority', category: 'Disease Alert', priority: 'high', publishedAt: Date.now() - (1000 * 60 * 60 * 4) },
        { id: 'n2', title: 'Tips for maintaining mental health during stress', summary: 'Expert advice on simple daily routines.', source: 'Wellness Magazine', category: 'Health Tips', priority: 'low', publishedAt: Date.now() - (1000 * 60 * 60 * 25) },
        { id: 'n3', title: 'Local Hospital expands emergency department capacity', summary: 'City General is adding 15 new beds.', source: 'City News', category: 'Hospital News', priority: 'medium', publishedAt: Date.now() - (1000 * 60 * 60 * 72) },
        { id: 'n4', title: 'Community first aid awareness drive successful', summary: 'Over 500 residents participated in free training.', source: 'Local Charity', category: 'Awareness', priority: 'low', publishedAt: Date.now() - (1000 * 60 * 60 * 2) },
      ];

      const filteredNews = allNews.filter(article => 
        selectedCategory === 'All' || article.category === selectedCategory
      );
      
      setNewsArticles(filteredNews);
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoadingNews(false);
    }
  };

  // --- Handlers & Utility Functions ---

  const handleEmergencyCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleGetDirections = (hospital: Hospital) => {
    // Open Google Maps link for directions
    const url = `https://www.google.com/maps/dir/?api=1&destination=${hospital.location.latitude},${hospital.location.longitude}`;
    window.open(url, '_blank');
  };

  const handleGetLocation = () => {
    setLoadingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLoadingLocation(false);
        },
        (error) => {
          console.error('Geolocation Error:', error);
          // Simple notification replacement for alert/toast
          alert('Unable to get your location. Please enable location services.'); 
          setLoadingLocation(false);
        }
      );
    } else {
      console.warn('Geolocation is not supported by your browser.');
      setLoadingLocation(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'Disease Alert': return <AlertCircle className="w-4 h-4" />;
      case 'Health Tips': return <Heart className="w-4 h-4" />;
      case 'Hospital News': return <Activity className="w-4 h-4" />;
      case 'Awareness': return <TrendingUp className="w-4 h-4" />;
      default: return <Newspaper className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Recently';
    
    // Check if it's a timestamp number (like from Date.now() mock)
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  const categories = ['All', 'Disease Alert', 'Health Tips', 'Hospital News', 'Events', 'Awareness'];

  // --- Render ---
  
  return (
    <ProtectedRoute allowedRoles={['patient']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={back}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <ArrowLeft className="w-6 h-6 text-gray-700" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Emergency Services</h1>
                    <p className="text-gray-600 text-sm">Quick access to emergency care and health information</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleEmergencyCall('997')}
                className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-red-700 transition flex items-center gap-2 animate-pulse"
              >
                <Phone className="w-5 h-5" />
                CALL 997
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-md p-2 mb-6 flex gap-2">
            <button
              onClick={() => setActiveTab('emergency')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                activeTab === 'emergency'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Activity className="w-5 h-5" />
              Emergency Contacts
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                activeTab === 'news'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Newspaper className="w-5 h-5" />
              Health News
            </button>
          </div>

          {/* Emergency Tab */}
          {activeTab === 'emergency' && (
            <div>
              {/* Location Button */}
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-6 h-6 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">Your Location</h3>
                      <p className="text-gray-600 text-sm">
                        {userLocation ? 'Location detected - showing nearest hospitals' : 'Enable location for accurate results'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleGetLocation}
                    disabled={loadingLocation}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:bg-gray-400"
                  >
                    {loadingLocation ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Getting Location...
                      </>
                    ) : (
                      <>
                        Use My Location
                        <Navigation className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Hospitals List */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {userLocation ? 'Nearest Hospitals & Clinics' : 'Hospitals & Clinics'}
                </h2>
                
                {loadingHospitals ? (
                  <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-600">Loading hospitals...</p>
                  </div>
                ) : hospitals.length === 0 ? ( 
                  <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">No hospitals found. Please check back later.</p>
                  </div>
                ) : (
                  hospitals.map((hospital) => (
                    <div
                      key={hospital.id}
                      className="bg-white rounded-xl shadow-md hover:shadow-lg transition p-6 border-l-4 border-red-500"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-1">{hospital.name}</h3>
                          <p className="text-gray-600 text-sm mb-2">{hospital.type}</p>
                          <div className="flex items-center gap-4 text-sm flex-wrap">
                            {hospital.distance && (
                              <span className="flex items-center gap-1 text-gray-700">
                                <MapPin className="w-4 h-4 text-red-600" />
                                {hospital.distance} km
                              </span>
                            )}
                            {hospital.estimatedTime && (
                              <span className="flex items-center gap-1 text-gray-700">
                                <Clock className="w-4 h-4 text-blue-600" />
                                {hospital.estimatedTime}
                              </span>
                            )}
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                              {hospital.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Available Services:</p>
                        <div className="flex flex-wrap gap-2">
                          {/* FIX APPLIED HERE: Use optional chaining (?.) to prevent crash if 'services' is undefined */}
                          {hospital.services?.map((service, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                            >
                              {service}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEmergencyCall(hospital.phone)}
                          className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 font-semibold"
                        >
                          <Phone className="w-5 h-5" />
                          Call Now
                        </button>
                        <button
                          onClick={() => handleGetDirections(hospital)}
                          className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 font-semibold"
                        >
                          <Navigation className="w-5 h-5" />
                          Get Directions
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Emergency Tips */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl shadow-md p-6 mt-6 border border-orange-200">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  Emergency Tips
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Stay calm and assess the situation before calling for help</li>
                  <li>• Have your medical information ready (allergies, medications, conditions)</li>
                  <li>• Provide clear location details to emergency responders</li>
                  <li>• Don't move seriously injured persons unless absolutely necessary</li>
                  <li>• Keep emergency contact numbers saved in your phone</li>
                </ul>
              </div>
            </div>
          )}

          {/* Health News Tab */}
          {activeTab === 'news' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Latest Health News & Updates</h2>
                <p className="text-gray-600">Stay informed about health developments in your region</p>
              </div>

              {/* Category Filter */}
              <div className="bg-white rounded-xl shadow-md p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Filter by Category</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        selectedCategory === cat
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* News Articles */}
              {loadingNews ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600">Loading health news...</p>
                </div>
              ) : newsArticles.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                  <Newspaper className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">No news articles found in this category.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {newsArticles.map((article) => (
                    <div
                      key={article.id}
                      className={`bg-white rounded-xl shadow-md hover:shadow-lg transition p-6 border-l-4 ${
                        article.priority === 'high'
                          ? 'border-red-500'
                          : article.priority === 'medium'
                          ? 'border-yellow-500'
                          : 'border-blue-500'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(article.priority)}`}>
                            {article.priority.toUpperCase()}
                          </span>
                          <span className="flex items-center gap-1 text-sm text-gray-600">
                            {getCategoryIcon(article.category)}
                            {article.category}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">{formatTimestamp(article.publishedAt)}</span>
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 mb-2">{article.title}</h3>
                      <p className="text-gray-600 mb-3">{article.summary}</p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 italic">Source: {article.source}</span>
                        <button className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
                          Read More →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}