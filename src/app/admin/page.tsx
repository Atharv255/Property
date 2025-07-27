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

interface RentRequest {
  _id: string;
  userName: string;
  userPhone: string;
  propertyTitle: string;
  status: 'pending' | 'contacted' | 'rejected';
  createdAt: string;
}

interface NotificationData {
  userName: string;
  userPhone: string;
  propertyTitle: string;
  propertyId: string;
  timestamp: string;
}

function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState<'properties' | 'requests'>('properties');
  const [properties, setProperties] = useState<Property[]>([]);
  const [rentRequests, setRentRequests] = useState<RentRequest[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rent: '',
    location: '',
    image: '',
    isAvailable: true
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Socket.IO setup for admin
  useEffect(() => {
    if (socket && user?.role === 'admin') {
      // Join admin room
      socket.emit('join-admin');

      // Listen for rent request notifications
      socket.on('rent-request-notification', (data: NotificationData) => {
        console.log('New rent request notification:', data);
        
        // Add to notifications
        setNotifications(prev => [data, ...prev.slice(0, 9)]); // Keep last 10 notifications
        
        // Show notification popup
        setShowNotifications(true);
        
        // Play notification sound (optional)
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
          audio.play().catch(() => {}); // Ignore errors if audio fails
        } catch (e) {}
        
        // Refresh rent requests
        fetchRentRequests();
      });

      return () => {
        socket.emit('leave-admin');
        socket.off('rent-request-notification');
      };
    }
  }, [socket, user]);

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/admin/properties', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setProperties(data.properties);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchRentRequests = async () => {
    try {
      const response = await fetch('/api/admin/rent-requests', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setRentRequests(data.rentRequests);
      }
    } catch (error) {
      console.error('Error fetching rent requests:', error);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      Promise.all([fetchProperties(), fetchRentRequests()]).finally(() => {
        setLoadingData(false);
      });
    }
  }, [user]);

  const handleSubmitProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingProperty ? `/api/admin/properties/${editingProperty._id}` : '/api/admin/properties';
      const method = editingProperty ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (response.ok) {
        await fetchProperties();
        setShowAddForm(false);
        setEditingProperty(null);
        setFormData({
          title: '',
          description: '',
          rent: '',
          location: '',
          image: '',
          isAvailable: true
        });
        alert(editingProperty ? 'Property updated successfully!' : 'Property added successfully!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save property');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      title: property.title,
      description: property.description,
      rent: property.rent.toString(),
      location: property.location,
      image: property.image,
      isAvailable: property.isAvailable
    });
    setShowAddForm(true);
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return;
    
    try {
      const response = await fetch(`/api/admin/properties/${propertyId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await fetchProperties();
        alert('Property deleted successfully!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete property');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const handleCallUser = (phone: string) => {
    window.location.href = `tel:${phone}`;
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

  if (!user || user.role !== 'admin') {
    return null;
  }

  const pendingRequests = rentRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Welcome, {user.name}!</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notifications Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-600 hover:text-gray-900"
                >
                  🔔
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold">Recent Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-gray-500 text-center">
                          No new notifications
                        </div>
                      ) : (
                        notifications.map((notification, index) => (
                          <div key={index} className="p-4 border-b hover:bg-gray-50">
                            <div className="text-sm">
                              <strong>{notification.userName}</strong> requested to rent{' '}
                              <strong>{notification.propertyTitle}</strong>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Phone: {notification.userPhone}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(notification.timestamp).toLocaleString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="p-2 border-t">
                        <button
                          onClick={() => setNotifications([])}
                          className="w-full text-sm text-blue-600 hover:text-blue-800"
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('properties')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'properties'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Properties ({properties.length})
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-4 px-6 text-sm font-medium border-b-2 relative ${
                  activeTab === 'requests'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Rent Requests ({pendingRequests})
                {pendingRequests > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {pendingRequests}
                  </span>
                )}
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'properties' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Manage Properties</h2>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Add Property
                  </button>
                </div>

                {loadingData ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((property) => (
                      <div key={property._id} className="bg-gray-50 rounded-lg p-4">
                        <img
                          src={property.image}
                          alt={property.title}
                          className="w-full h-32 object-cover rounded mb-3"
                        />
                        <h3 className="font-semibold text-lg mb-2">{property.title}</h3>
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{property.description}</p>
                        <p className="text-blue-600 font-bold mb-2">${property.rent}/month</p>
                        <p className="text-gray-500 text-sm mb-3">📍 {property.location}</p>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            property.isAvailable 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {property.isAvailable ? 'Available' : 'Occupied'}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditProperty(property)}
                            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-1 px-3 rounded text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProperty(property._id)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Rent Requests</h2>
                
                {loadingData ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rentRequests.map((request) => (
                      <div key={request._id} className={`rounded-lg p-4 ${
                        request.status === 'pending' ? 'bg-yellow-50 border-l-4 border-yellow-400' : 'bg-gray-50'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{request.userName}</h3>
                            <p className="text-gray-600">Phone: {request.userPhone}</p>
                            <p className="text-gray-600">Property: {request.propertyTitle}</p>
                            <p className="text-gray-500 text-sm">
                              Requested: {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 rounded text-sm ${
                              request.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800'
                                : request.status === 'contacted'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                            {request.status === 'pending' && (
                              <button
                                onClick={() => handleCallUser(request.userPhone)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
                              >
                                📞 Call
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {rentRequests.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">No rent requests yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add/Edit Property Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingProperty ? 'Edit Property' : 'Add New Property'}
              </h3>
              
              <form onSubmit={handleSubmitProperty} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rent (per month)
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.rent}
                    onChange={(e) => setFormData({...formData, rent: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image URL
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.image}
                    onChange={(e) => setFormData({...formData, image: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isAvailable"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData({...formData, isAvailable: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isAvailable" className="ml-2 block text-sm text-gray-900">
                    Available for rent
                  </label>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium"
                  >
                    {editingProperty ? 'Update' : 'Add'} Property
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingProperty(null);
                      setFormData({
                        title: '',
                        description: '',
                        rent: '',
                        location: '',
                        image: '',
                        isAvailable: true
                      });
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AdminDashboard />
      </SocketProvider>
    </AuthProvider>
  );
}

