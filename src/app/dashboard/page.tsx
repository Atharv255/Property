'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthContext';
import { SocketProvider, useSocket } from '@/components/SocketContext';

interface Property {
  _id: string;
  title: string;
  description: string;
  rent: number;
  location: string;
  image: string;
  isAvailable: boolean;
}

function Dashboard() {
  const { user, loading, logout } = useAuth();
  const { socket } = useSocket();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [search, setSearch] = useState('');
  const [minRent, setMinRent] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [location, setLocation] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user?.role === 'admin') {
      router.push('/admin');
    }
  }, [user, loading, router]);

  const fetchProperties = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (minRent) params.append('minRent', minRent);
      if (maxRent) params.append('maxRent', maxRent);
      if (location) params.append('location', location);

      const response = await fetch(`/api/properties?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setProperties(data.properties);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoadingProperties(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'user') {
      fetchProperties();
    }
  }, [user, search, minRent, maxRent, location]);

  const handleRentRequest = async (propertyId: string) => {
    setSubmittingRequest(propertyId);
    
    try {
      const response = await fetch('/api/rent-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ propertyId }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        // Find the property details
        const property = properties.find(p => p._id === propertyId);
        
        // Emit socket event for real-time notification
        if (socket && property) {
          socket.emit('new-rent-request', {
            userName: user?.name,
            userPhone: user?.phone || 'Not provided',
            propertyTitle: property.title,
            propertyId: propertyId,
            timestamp: new Date().toISOString()
          });
        }
        
        alert('Rent request submitted successfully! The admin will contact you soon.');
      } else {
        alert(data.error || 'Failed to submit rent request');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setSubmittingRequest(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'user') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="header-gradient shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Property Rental</h1>
              <p className="text-gray-600">Welcome, {user.name}!</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:transform hover:-translate-y-0.5 hover:shadow-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 mobile-padding">
        {/* Search and Filters */}
        <div className="search-container mb-6">
          <h2 className="text-lg font-semibold mb-4">Search Properties</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mobile-grid-1">
            <div className="form-group">
              <label className="form-label">
                Search
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search properties..."
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location..."
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Min Rent
              </label>
              <input
                type="number"
                value={minRent}
                onChange={(e) => setMinRent(e.target.value)}
                placeholder="Min rent..."
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Max Rent
              </label>
              <input
                type="number"
                value={maxRent}
                onChange={(e) => setMaxRent(e.target.value)}
                placeholder="Max rent..."
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Properties Grid */}
        {loadingProperties ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="responsive-grid">
            {properties.map((property) => (
              <div key={property._id} className="property-card bg-white rounded-lg shadow-soft overflow-hidden fade-in">
                <div className="overflow-hidden">
                  <img
                    src={property.image}
                    alt={property.title}
                    className="property-image w-full h-48 object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {property.title}
                  </h3>
                  <p className="text-gray-600 mb-3 line-clamp-3">
                    {property.description}
                  </p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-blue-600">
                      ${property.rent}/month
                    </span>
                    <span className="text-sm text-gray-500 flex items-center">
                      📍 {property.location}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRentRequest(property._id)}
                    disabled={submittingRequest === property._id}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {submittingRequest === property._id ? 'Submitting...' : 'Rent this house'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loadingProperties && properties.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No properties found matching your criteria.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Dashboard />
      </SocketProvider>
    </AuthProvider>
  );
}

