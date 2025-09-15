import { 
  ref as dbRef, 
  get, 
  push, 
  update
} from 'firebase/database';
import { realtimeDb } from '../firebase';

class TenantDataService {
  constructor(tenantId) {
    if (!tenantId) {
      throw new Error('TenantId is required for TenantDataService');
    }
    this.tenantId = tenantId;
    this.basePath = `tenants/${tenantId}`;
  }

  // Duplicate checks
  async checkEmailExists(email, eventId = null) {
    if (!email) return false;
    try {
      const usersRef = dbRef(realtimeDb, `${this.basePath}/users`);
      const snapshot = await get(usersRef);
      if (!snapshot.exists()) return false;

      const data = snapshot.val();
      const emailLower = email.trim().toLowerCase();
      return Object.values(data).some((user) => {
        const matchesEvent = !eventId || user.eventId === eventId || user['event-id'] === eventId;
        const matchesStatus = user.status === 1 || user.status === '1' || user.status === 'draft';
        return matchesEvent && matchesStatus && user.email && user.email.trim().toLowerCase() === emailLower;
      });
    } catch (error) {
      console.error('Error checking email existence:', error);
      throw new Error('Failed to check email');
    }
  }

  async checkPhoneExists(mobile, eventId = null) {
    if (!mobile) return false;
    try {
      const usersRef = dbRef(realtimeDb, `${this.basePath}/users`);
      const snapshot = await get(usersRef);
      if (!snapshot.exists()) return false;

      const data = snapshot.val();
      const norm = String(mobile).replace(/\D/g, '');
      return Object.values(data).some((user) => {
        const matchesEvent = !eventId || user.eventId === eventId || user['event-id'] === eventId;
        const matchesStatus = user.status === 1 || user.status === '1' || user.status === 'draft';
        const userNorm = user.mobile ? String(user.mobile).replace(/\D/g, '') : '';
        return matchesEvent && matchesStatus && userNorm && userNorm === norm;
      });
    } catch (error) {
      console.error('Error checking phone existence:', error);
      throw new Error('Failed to check phone');
    }
  }

  // Users operations
  async getUsers(eventId = null) {
    try {
      const usersRef = dbRef(realtimeDb, `${this.basePath}/users`);
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        let users = Object.entries(data)
          .map(([id, user]) => ({ id, ...user }))
          .filter((user) => user.status === 1 || user.status === '1');
        
        // Filter by eventId if provided
        if (eventId) {
          users = users.filter(user => user.eventId === eventId || user['event-id'] === eventId);
        }
        
        return users;
      }
      return [];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  async createUser(userData) {
    try {
      const usersRef = dbRef(realtimeDb, `${this.basePath}/users`);
      const newUserRef = push(usersRef);
      const userWithTenant = {
        ...userData,
        tenantId: this.tenantId,
        createdAt: new Date().toISOString(),
        status: userData.status || 1
      };
      
      await update(newUserRef, userWithTenant);
      return { id: newUserRef.key, ...userWithTenant };
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async updateUser(userId, userData) {
    try {
      const userRef = dbRef(realtimeDb, `${this.basePath}/users/${userId}`);
      const updateData = {
        ...userData,
        updatedAt: new Date().toISOString()
      };
      
      await update(userRef, updateData);
      return { id: userId, ...updateData };
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  async deleteUser(userId) {
    try {
      const userRef = dbRef(realtimeDb, `${this.basePath}/users/${userId}`);
      await update(userRef, { status: 0, deletedAt: new Date().toISOString() });
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  // Optted data operations
  async getOpttedData(eventId = null) {
    try {
      const opttedRef = dbRef(realtimeDb, `${this.basePath}/tbl-optted`);
      const snapshot = await get(opttedRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        let records = Object.entries(data).map(([id, record]) => ({ id, ...record }));
        
        // Filter by eventId if provided
        if (eventId) {
          records = records.filter(record => record.eventId === eventId || record['event-id'] === eventId);
        }
        
        return records;
      }
      return [];
    } catch (error) {
      console.error('Error fetching optted data:', error);
      throw new Error('Failed to fetch optted data');
    }
  }

  async createOpttedRecord(recordData) {
    try {
      const opttedRef = dbRef(realtimeDb, `${this.basePath}/tbl-optted`);
      const newRecordRef = push(opttedRef);
      const recordWithTenant = {
        ...recordData,
        tenantId: this.tenantId,
        createdAt: new Date().toISOString()
      };
      
      await update(newRecordRef, recordWithTenant);
      return { id: newRecordRef.key, ...recordWithTenant };
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
      
      // Get existing users from root
      const existingUsersRef = dbRef(realtimeDb, 'users');
      const existingUsersSnapshot = await get(existingUsersRef);
      
      if (existingUsersSnapshot.exists()) {
        const existingUsers = existingUsersSnapshot.val();
        const tenantUsersRef = dbRef(realtimeDb, `${this.basePath}/users`);
        
        // Copy users with tenant structure
        const migratedUsers = {};
        Object.entries(existingUsers).forEach(([id, user]) => {
          migratedUsers[id] = {
            ...user,
            tenantId: this.tenantId,
            migratedAt: new Date().toISOString()
          };
        });
        
        await update(tenantUsersRef, migratedUsers);
        console.log('Users migrated successfully');
      }

      // Get existing optted data from root
      const existingOpttedRef = dbRef(realtimeDb, 'tbl-optted');
      const existingOpttedSnapshot = await get(existingOpttedRef);
      
      if (existingOpttedSnapshot.exists()) {
        const existingOptted = existingOpttedSnapshot.val();
        const tenantOpttedRef = dbRef(realtimeDb, `${this.basePath}/tbl-optted`);
        
        // Copy optted data with tenant structure
        const migratedOptted = {};
        Object.entries(existingOptted).forEach(([id, record]) => {
          migratedOptted[id] = {
            ...record,
            tenantId: this.tenantId,
            migratedAt: new Date().toISOString()
          };
        });
        
        await update(tenantOpttedRef, migratedOptted);
        console.log('Optted data migrated successfully');
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