import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';
import { useTenant } from './TenantContext';

const FirestoreDebug = () => {
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);
  const { tenantId, currentUser } = useTenant();

  useEffect(() => {
    const testFirestoreConnection = async () => {
      setLoading(true);
      setTestResult('Testing Firestore connection...\n');
      
      try {
        // Test 1: Check authentication
        setTestResult(prev => prev + `Auth User: ${auth.currentUser ? auth.currentUser.email : 'Not authenticated'}\n`);
        setTestResult(prev => prev + `Tenant ID: ${tenantId}\n`);
        
        if (!auth.currentUser) {
          setTestResult(prev => prev + 'ERROR: No authenticated user\n');
          return;
        }
        
        // Test 2: Try to write a simple document
        const testCollection = collection(db, `tenants/${tenantId}/test`);
        const testDoc = {
          message: 'Test document',
          timestamp: new Date(),
          userId: auth.currentUser.uid
        };
        
        setTestResult(prev => prev + 'Attempting to write test document...\n');
        const docRef = await addDoc(testCollection, testDoc);
        setTestResult(prev => prev + `✅ Successfully wrote document with ID: ${docRef.id}\n`);
        
        // Test 3: Try to read documents
        setTestResult(prev => prev + 'Attempting to read documents...\n');
        const querySnapshot = await getDocs(testCollection);
        setTestResult(prev => prev + `✅ Successfully read ${querySnapshot.size} documents\n`);
        
        // Test 4: Test events collection
        const eventsCollection = collection(db, `tenants/${tenantId}/events`);
        setTestResult(prev => prev + 'Testing events collection...\n');
        const eventsSnapshot = await getDocs(eventsCollection);
        setTestResult(prev => prev + `✅ Successfully accessed events collection (${eventsSnapshot.size} events)\n`);
        
      } catch (error) {
        console.error('Firestore test error:', error);
        setTestResult(prev => prev + `❌ ERROR: ${error.message}\n`);
        setTestResult(prev => prev + `Error Code: ${error.code || 'unknown'}\n`);
        setTestResult(prev => prev + `Error Details: ${JSON.stringify(error, null, 2)}\n`);
      } finally {
        setLoading(false);
      }
    };

    if (tenantId && currentUser) {
      testFirestoreConnection();
    }
  }, [tenantId, currentUser]);

  const manualTest = async () => {
    const testCollection = collection(db, `tenants/${tenantId}/test`);
    const testDoc = {
      message: 'Manual test document',
      timestamp: new Date(),
      userId: auth.currentUser.uid
    };
    
    try {
      setLoading(true);
      setTestResult('Running manual test...\n');
      const docRef = await addDoc(testCollection, testDoc);
      setTestResult(prev => prev + `✅ Manual test successful: ${docRef.id}\n`);
    } catch (error) {
      setTestResult(prev => prev + `❌ Manual test failed: ${error.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', margin: '10px', borderRadius: '8px' }}>
      <h3>Firestore Connection Debug</h3>
      <button 
        onClick={manualTest} 
        disabled={loading}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: loading ? '#ccc' : '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Testing...' : 'Test Firestore Connection'}
      </button>
      <pre style={{ 
        backgroundColor: '#000', 
        color: '#0f0', 
        padding: '15px', 
        marginTop: '10px', 
        borderRadius: '4px',
        fontSize: '12px',
        whiteSpace: 'pre-wrap',
        maxHeight: '400px',
        overflow: 'auto'
      }}>
        {testResult || 'Click "Test Firestore Connection" to run diagnostics...'}
      </pre>
    </div>
  );
};

export default FirestoreDebug;