import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../firebase';

class TenantDataService {
  constructor(tenantId) {
    if (!tenantId) {
      throw new Error('TenantId is required for TenantDataService');
    }
    this.tenantId = tenantId;
    this.basePath = `tenants/${tenantId}`;
    this.usersCollectionPath = `${this.basePath}/users`;
    this.opttedCollectionPath = `${this.basePath}/tbl-optted`;
  }

  // Duplicate checks
  async checkEmailExists(email, eventId = null) {
    if (!email) return false;
    try {
      const usersCol = collection(db, this.usersCollectionPath);
      // We cannot query case-insensitive email easily; fetch candidates by eventId if provided
      let q;
      if (eventId) {
        q = query(usersCol, where('eventId', '==', eventId));
      } else {
        q = query(usersCol);
      }
      const snap = await getDocs(q);
      if (snap.empty) return false;

      const emailLower = email.trim().toLowerCase();
      for (const d of snap.docs) {
        const user = d.data();
        const matchesStatus = user.status === 1 || user.status === '1' || user.status === 'draft';
        const userEmail = user.email || '';
        if (matchesStatus && userEmail && userEmail.trim().toLowerCase() === emailLower) return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking email existence:', error);
      throw new Error('Failed to check email');
    }
  }

  async checkPhoneExists(mobile, eventId = null) {
    if (!mobile) return false;
    try {
      const usersCol = collection(db, this.usersCollectionPath);
      let q;
      if (eventId) q = query(usersCol, where('eventId', '==', eventId));
      else q = query(usersCol);
      const snap = await getDocs(q);
      if (snap.empty) return false;

      const norm = String(mobile).replace(/\D/g, '');
      for (const d of snap.docs) {
        const user = d.data();
        const matchesStatus = user.status === 1 || user.status === '1' || user.status === 'draft';
        const userNorm = user.mobile ? String(user.mobile).replace(/\D/g, '') : '';
        if (matchesStatus && userNorm && userNorm === norm) return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking phone existence:', error);
      throw new Error('Failed to check phone');
    }
  }

  // Users operations
  async getUsers(eventId = null) {
    try {
      const usersCol = collection(db, this.usersCollectionPath);
      let q;
      if (eventId) q = query(usersCol, where('eventId', '==', eventId));
      else q = query(usersCol);

      const snapshot = await getDocs(q);
      if (snapshot.empty) return [];

      const users = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.status === 1 || u.status === '1');

      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  async createUser(userData) {
    try {
      const usersCol = collection(db, this.usersCollectionPath);
      const userWithTenant = {
        ...userData,
        tenantId: this.tenantId,
        createdAt: new Date().toISOString(),
        status: userData.status || 1
      };

      // If caller passed an id, write with that id; otherwise addDoc
      if (userWithTenant.id) {
        const id = userWithTenant.id;
        const userDocRef = doc(db, this.usersCollectionPath, id);
        // Remove id from payload when saving as doc id
        const payload = { ...userWithTenant };
        delete payload.id;
        await setDoc(userDocRef, payload);
        return { id, ...payload };
      } else {
        const docRef = await addDoc(usersCol, userWithTenant);
        return { id: docRef.id, ...userWithTenant };
      }
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async updateUser(userId, userData) {
    try {
      const userDocRef = doc(db, this.usersCollectionPath, userId);
      const updateData = {
        ...userData,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userDocRef, updateData);
      return { id: userId, ...updateData };
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  async deleteUser(userId) {
    try {
      const userDocRef = doc(db, this.usersCollectionPath, userId);
      await updateDoc(userDocRef, { status: 0, deletedAt: new Date().toISOString() });
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  // Optted data operations
  async getOpttedData(eventId = null) {
    try {
      const opttedCol = collection(db, this.opttedCollectionPath);
      let q;
      if (eventId) q = query(opttedCol, where('eventId', '==', eventId));
      else q = query(opttedCol);
      const snap = await getDocs(q);
      if (snap.empty) return [];

      let records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return records;
    } catch (error) {
      console.error('Error fetching optted data:', error);
      throw new Error('Failed to fetch optted data');
    }
  }

  async createOpttedRecord(recordData) {
    try {
      const opttedCol = collection(db, this.opttedCollectionPath);
      const recordWithTenant = {
        ...recordData,
        tenantId: this.tenantId,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(opttedCol, recordWithTenant);
      return { id: docRef.id, ...recordWithTenant };
    } catch (error) {
      console.error('Error creating optted record:', error);
      throw new Error('Failed to create optted record');
    }
  }

  // Dashboard analytics
  async getDashboardStats(eventId = null) {
    try {
      const [users, opttedData] = await Promise.all([
        this.getUsers(eventId),
        this.getOpttedData(eventId)
      ]);

      const totalUsers = users.length;
      const checkedInUsers = opttedData.filter(
        record => record['opt-for'] === 'Check-in' && 
                 (record['optted'] === true || record['optted'] === 1 || record['optted'] === '1')
      ).length;

      // Build pivot data
      const dateSet = new Set();
      const optForSet = new Set();
      const pivotMap = {};

      opttedData.forEach(rec => {
        if (rec['optted'] === true || rec['optted'] === 1 || rec['optted'] === '1') {
          const date = rec.date || rec['date'] || '';
          const optFor = rec['opt-for'] || '';
          dateSet.add(date);
          optForSet.add(optFor);
          if (!pivotMap[date]) pivotMap[date] = {};
          if (!pivotMap[date][optFor]) pivotMap[date][optFor] = 0;
          pivotMap[date][optFor] += 1;
        }
      });

      const dates = Array.from(dateSet).sort((a, b) => new Date(b) - new Date(a));
      const optFors = Array.from(optForSet).sort();
      const rows = dates.map(date => {
        const row = { date };
        optFors.forEach(optFor => {
          row[optFor] = pivotMap[date] && pivotMap[date][optFor] ? pivotMap[date][optFor] : 0;
        });
        return row;
      });

      // User-wise optted data
      const userWiseMap = {};
      opttedData.forEach(rec => {
        if (rec['optted'] === true || rec['optted'] === 1 || rec['optted'] === '1') {
          const date = rec.date || rec['date'] || '';
          const optFor = rec['opt-for'] || '';
          const userId = rec['id'] || '';
          const time = rec.time || rec['time'] || '';
          const key = userId + '||' + date + '||' + optFor;
          
          if (!userWiseMap[key]) {
            userWiseMap[key] = { userId, date, optFor, count: 0, time: '', allTimes: [] };
          }
          
          let timeArray = [];
          if (typeof time === 'object' && time !== null) {
            timeArray = Object.values(time).filter(t => t && typeof t === 'string');
          } else if (typeof time === 'string' && time) {
            timeArray = [time];
          }
          
          userWiseMap[key].allTimes = [...new Set([...userWiseMap[key].allTimes, ...timeArray])];
          
          if (timeArray.length > 0) {
            const latestTime = timeArray.sort().pop();
            if (!userWiseMap[key].time || latestTime > userWiseMap[key].time) {
              userWiseMap[key].time = latestTime;
            }
          }
          
          if (optFor === 'Beverages' && typeof rec.count === 'number') {
            userWiseMap[key].count += rec.count;
          } else {
            userWiseMap[key].count += 1;
          }
        }
      });

      const userWiseRows = Object.values(userWiseMap).sort((a, b) => {
        if (a.userId < b.userId) return -1;
        if (a.userId > b.userId) return 1;
        if (a.date < b.date) return 1;
        if (a.date > b.date) return -1;
        if (a.optFor < b.optFor) return -1;
        if (a.optFor > b.optFor) return 1;
        return 0;
      });

      return {
        totalUsers,
        checkedInUsers,
        pivotData: { rows, columns: optFors },
        userWiseRows,
        usersData: users.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw new Error('Failed to get dashboard statistics');
    }
  }

  // Migration helper - move existing data to tenant structure
  async migrateExistingData() {
    try {
      console.log('Starting data migration for tenant:', this.tenantId);

      // Migrate from root Firestore collections if they exist
      // Root users
      const rootUsersCol = collection(db, 'users');
      const rootUsersSnap = await getDocs(rootUsersCol);
      if (!rootUsersSnap.empty) {
        for (const d of rootUsersSnap.docs) {
          const data = d.data();
          const migrated = { ...data, tenantId: this.tenantId, migratedAt: new Date().toISOString() };
          // Preserve original id
          await setDoc(doc(db, this.usersCollectionPath, d.id), migrated);
        }
        console.log('Users migrated successfully from root Firestore collection');
      }

      // Root tbl-optted
      const rootOpttedCol = collection(db, 'tbl-optted');
      const rootOpttedSnap = await getDocs(rootOpttedCol);
      if (!rootOpttedSnap.empty) {
        for (const d of rootOpttedSnap.docs) {
          const data = d.data();
          const migrated = { ...data, tenantId: this.tenantId, migratedAt: new Date().toISOString() };
          await setDoc(doc(db, this.opttedCollectionPath, d.id), migrated);
        }
        console.log('Optted data migrated successfully from root Firestore collection');
      }

      return true;
    } catch (error) {
      console.error('Error migrating data:', error);
      throw new Error('Failed to migrate existing data');
    }
  }

  // Search operations
  async searchUsers(searchTerm, eventId = null) {
    try {
      const users = await this.getUsers(eventId);
      if (!searchTerm.trim()) return users;
      
      const term = searchTerm.trim().toLowerCase();
      return users.filter(user =>
        (user.name && user.name.toLowerCase().includes(term)) ||
        (user.email && user.email.toLowerCase().includes(term)) ||
        (user.mobile && user.mobile.toLowerCase().includes(term)) ||
        (user.guestType && user.guestType.toLowerCase().includes(term))
      );
    } catch (error) {
      console.error('Error searching users:', error);
      throw new Error('Failed to search users');
    }
  }

  // Pagination
  async getUsersPaginated(page = 1, pageSize = 10, searchTerm = '', eventId = null) {
    try {
      let users = await this.getUsers(eventId);
      
      // Apply search filter
      if (searchTerm.trim()) {
        users = await this.searchUsers(searchTerm, eventId);
      }
      
      const totalCount = users.length;
      const startIdx = (page - 1) * pageSize;
      const paginatedUsers = users.slice(startIdx, startIdx + pageSize);
      
      return {
        users: paginatedUsers,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize)
      };
    } catch (error) {
      console.error('Error getting paginated users:', error);
      throw new Error('Failed to get paginated users');
    }
  }
}

// Factory function to create TenantDataService with tenant context
export const createTenantDataService = (tenantId) => {
  return new TenantDataService(tenantId);
};

export default TenantDataService;