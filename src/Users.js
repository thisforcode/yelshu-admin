
import './Users.css';
import { useEffect, useState } from 'react';
import { getDatabase, ref, onValue, push, update } from 'firebase/database';
import '../src/firebase';

export default function Users() {
  const [usersData, setUsersData] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', mobile: '', guestType: '', status: 1 });
  const [formError, setFormError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editUserId, setEditUserId] = useState(null);

  useEffect(() => {
    const db = getDatabase();
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert object to array and filter by status === 1
        const usersArray = Object.entries(data)
          .map(([id, user]) => ({ id, ...user }))
          .filter((user) => user.status === 1 || user.status === '1');
        setUsersData(usersArray);
      } else {
        setUsersData([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Handler for opening add user modal
  const handleAddUserClick = () => {
    setShowAddModal(true);
    setEditUserId(null);
    setNewUser({ name: '', email: '', mobile: '', guestType: '', status: 1 });
    setFormError('');
  };

  // Handler for edit user
  const handleEditUserClick = (user) => {
    setShowAddModal(true);
    setEditUserId(user.id);
    setNewUser({
      name: user.name || '',
      email: user.email || '',
      mobile: user.mobile || '',
      guestType: user.guestType || '',
      status: user.status !== undefined ? user.status : 1
    });
    setFormError('');
  };

  // Handler for closing modal
  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditUserId(null);
    setNewUser({ name: '', email: '', mobile: '', guestType: '', status: 1 });
    setFormError('');
  };

  // Handler for input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
    setFormError('');
  };

  // Validation helpers
  const validateEmail = (email) => {
    // RFC 5322 Official Standard regex
    return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email);
  };
  const validateMobile = (mobile) => {
    // Only 10 digits, mandatory
    return /^\d{10}$/.test(mobile);
  };

  // Handler for submitting new user or editing user
  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    // Validation
    if (!newUser.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!newUser.mobile.trim()) {
      setFormError('Mobile number is required.');
      return;
    }
    if (!validateMobile(newUser.mobile.trim())) {
      setFormError('Enter a valid 10-digit mobile number.');
      return;
    }
    if (newUser.email && !validateEmail(newUser.email.trim())) {
      setFormError('Enter a valid email address.');
      return;
    }
    setAdding(true);
    try {
      const db = getDatabase();
      if (editUserId) {
        // Edit user
        const userRef = ref(db, `users/${editUserId}`);
        await update(userRef, { ...newUser });
      } else {
        // Add user
        const usersRef = ref(db, 'users');
        await push(usersRef, { ...newUser, status: 1 });
      }
      setShowAddModal(false);
      setEditUserId(null);
      setNewUser({ name: '', email: '', mobile: '', guestType: '', status: 1 });
    } catch (err) {
      setFormError(editUserId ? 'Failed to update user.' : 'Failed to add user.');
    } finally {
      setAdding(false);
    }
  };

  // Handler for delete (set status to 0)
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) return;
    try {
      const db = getDatabase();
      const userRef = ref(db, `users/${userId}`);
      await update(userRef, { status: 0 });
    } catch (err) {
      alert('Failed to deactivate user.');
    }
  };

  return (
    <div className="users-container">
      <div className="users-header-row">
        <h1 className="users-title">Admin Dashboard</h1>
        <div className="users-actions">
          <button className="users-upload-btn">Buik Upload CSV</button>
          <button className="users-add-btn" onClick={handleAddUserClick}>Add User</button>
        </div>
      </div>
      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Guest Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersData.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>No users found</td></tr>
            ) : (
              usersData.map((user, idx) => (
                <tr key={user.id || idx}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.mobile}</td>
                  <td>{user.guestType}</td>
                  <td className="users-actions-icons">
                    <span className="icon edit" title="Edit" onClick={() => handleEditUserClick(user)}>✏️</span>
                    <span className="icon qr" title="QR">#️⃣</span>
                    <span className="icon delete" title="Delete" onClick={() => handleDeleteUser(user.id)}>🗑️</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="users-pagination">{usersData.length > 0 ? `1–${usersData.length} of ${usersData.length}` : '0–0 of 0'}</div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="users-modal-overlay">
          <div className="users-modal">
            <h2>{editUserId ? 'Edit User' : 'Add User'}</h2>
            <form onSubmit={handleAddUserSubmit} className="users-modal-form" autoComplete="off">
              <label>
                Name:
                <input name="name" value={newUser.name} onChange={handleInputChange} required />
              </label>
              <label>
                Email:
                <input name="email" type="email" value={newUser.email} onChange={handleInputChange} />
              </label>
              <label>
                Mobile:
                <input name="mobile" value={newUser.mobile} onChange={handleInputChange} required pattern="^\d{10}$" maxLength="10" />
              </label>
              <label>
                Guest Type:
                <input name="guestType" value={newUser.guestType} onChange={handleInputChange} />
              </label>
              {formError && <div style={{ color: 'red', fontSize: '0.95rem', marginTop: '-8px' }}>{formError}</div>}
              <div className="users-modal-actions">
                <button type="button" onClick={handleCloseModal} disabled={adding}>Cancel</button>
                <button type="submit" disabled={adding}>{adding ? (editUserId ? 'Saving...' : 'Adding...') : (editUserId ? 'Save Changes' : 'Add User')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
