import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

// Create the context
const TenantContext = createContext();

// Custom hook to use the tenant context
export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

// Tenant Provider component
export const TenantProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? 'authenticated' : 'not authenticated');
      
      if (user) {
        setCurrentUser(user);
        setTenantId(user.uid); // Using user UID as tenant ID
        setAuthError(null);
        // Update session storage to maintain consistency
        sessionStorage.setItem('user', JSON.stringify(user));
      } else {
        setCurrentUser(null);
        setTenantId(null);
        setAuthError(null);
        sessionStorage.removeItem('user');
      }
      setLoading(false);
    }, (error) => {
      console.error('Auth state change error:', error);
      setAuthError(error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helper function to get tenant-scoped collection path
  const getTenantCollection = (collectionName) => {
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }
    return `tenants/${tenantId}/${collectionName}`;
  };

  // Helper function to check if user has access to data
  const hasAccess = (dataOwnerId) => {
    return tenantId === dataOwnerId;
  };

  const value = {
    currentUser,
    tenantId,
    selectedEventId,
    setSelectedEventId,
    loading,
    authError,
    getTenantCollection,
    hasAccess,
    isAuthenticated: !!currentUser
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export default TenantContext;