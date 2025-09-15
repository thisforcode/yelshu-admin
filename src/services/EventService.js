import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';

class EventService {
  constructor(tenantId) {
    if (!tenantId) {
      throw new Error('TenantId is required for EventService');
    }
    this.tenantId = tenantId;
    this.eventsCollection = `tenants/${tenantId}/events`;
  }

  // Get a single event by ID
  async getEvent(eventId) {
    try {
      await this._waitForAuth();
      const eventRef = doc(db, this.eventsCollection, eventId);
      const snap = await getDoc(eventRef);
      if (!snap.exists()) {
        throw new Error('Event not found');
      }
      return { id: snap.id, ...snap.data() };
    } catch (error) {
      console.error('Error fetching event:', error);
      throw new Error('Failed to fetch event');
    }
  }

  // Check if user is authenticated before making requests
  _ensureAuthenticated() {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to access Firestore');
    }
  }

  // Wait for authentication if needed
  async _waitForAuth() {
    return new Promise((resolve, reject) => {
      if (auth.currentUser) {
        resolve(auth.currentUser);
        return;
      }
      
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error('Authentication timeout'));
      }, 10000); // 10 second timeout
      
      const unsubscribe = auth.onAuthStateChanged((user) => {
        clearTimeout(timeout);
        unsubscribe();
        if (user) {
          resolve(user);
        } else {
          reject(new Error('User not authenticated'));
        }
      });
    });
  }

  // Create a new event
  async createEvent(eventData) {
    try {
      const eventsRef = collection(db, this.eventsCollection);
      const eventWithTenant = {
        ...eventData,
        tenantId: this.tenantId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: eventData.status || 'active'
      };
      
      const docRef = await addDoc(eventsRef, eventWithTenant);
      return { id: docRef.id, ...eventWithTenant };
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event');
    }
  }

  // Get all events for the current tenant
  async getEvents() {
    try {
      // Wait for authentication
      await this._waitForAuth();
      
      const eventsRef = collection(db, this.eventsCollection);
      const q = query(eventsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const events = [];
      querySnapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() });
      });
      
      return events;
    } catch (error) {
      console.error('Error fetching events:', error);
      
      // Handle specific Firestore errors
      if (error.code === 'permission-denied') {
        throw new Error('Access denied. Please check your authentication.');
      } else if (error.code === 'unavailable') {
        throw new Error('Firestore is temporarily unavailable. Please try again.');
      } else if (error.message.includes('Authentication timeout')) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      throw new Error('Failed to fetch events');
    }
  }

  // Get events by status
  async getEventsByStatus(status) {
    try {
      const eventsRef = collection(db, this.eventsCollection);
      const q = query(
        eventsRef, 
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const events = [];
      querySnapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() });
      });
      
      return events;
    } catch (error) {
      console.error('Error fetching events by status:', error);
      throw new Error('Failed to fetch events by status');
    }
  }

  // Update an event
  async updateEvent(eventId, updates) {
    try {
      // Ensure user is authenticated before attempting to update
      await this._waitForAuth();
      const eventRef = doc(db, this.eventsCollection, eventId);
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(eventRef, updateData);
      return { id: eventId, ...updateData };
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error('Failed to update event');
    }
  }

  // Delete an event
  async deleteEvent(eventId) {
    try {
      // Ensure user is authenticated before attempting to delete
      await this._waitForAuth();
      const eventRef = doc(db, this.eventsCollection, eventId);
      await deleteDoc(eventRef);
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error('Failed to delete event');
    }
  }

  // Search events by name
  async searchEvents(searchTerm) {
    try {
      const events = await this.getEvents();
      return events.filter(event => 
        event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching events:', error);
      throw new Error('Failed to search events');
    }
  }
}

// Factory function to create EventService with tenant context
export const createEventService = (tenantId) => {
  return new EventService(tenantId);
};

export default EventService;