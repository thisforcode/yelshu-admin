import './Users.css';
import { useEffect, useState } from 'react';
import { getDatabase, ref, query, orderByKey, limitToFirst, startAt, push, update, get } from 'firebase/database';
import '../src/firebase';
import { QRCodeCanvas } from 'qrcode.react';

import Papa from 'papaparse';

export default function Users() {
  const [usersData, setUsersData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [lastKey, setLastKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', mobile: '', guestType: '', status: 1 });
  const [formError, setFormError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrUserId, setQrUserId] = useState(null);

  // Bulk upload states
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRows, setBulkRows] = useState([]); // {row, errors, isValid, originalIdx}
  const [bulkInvalidCount, setBulkInvalidCount] = useState(0);
  const [bulkUploading, setBulkUploading] = useState(false);

  // Fetch total count (for pagination)
  useEffect(() => {
    const db = getDatabase();
    const usersRef = ref(db, 'users');
    const fetchCount = async () => {
      const snap = await get(usersRef);
      if (snap.exists()) {
        const data = snap.val();
        const arr = Object.values(data).filter((user) => user.status === 1 || user.status === '1');
        setTotalCount(arr.length);
      } else {
        setTotalCount(0);
      }
    };
    fetchCount();
  }, []);

  // Fetch paginated users from Firebase
  useEffect(() => {
    setLoading(true);
    const db = getDatabase();
    let usersQuery = query(ref(db, 'users'), orderByKey());
    // For pagination, calculate startAt key
    // Firebase Realtime DB does not support offset, so we fetch (page * pageSize) and slice
    const fetchUsers = async () => {
      const snap = await get(usersQuery);
      if (snap.exists()) {
        let data = snap.val();
        let arr = Object.entries(data)
          .map(([id, user]) => ({ id, ...user }))
          .filter((user) => user.status === 1 || user.status === '1');
        // Search filter
        if (searchTerm.trim()) {
          const term = searchTerm.trim().toLowerCase();
          arr = arr.filter(user =>
            (user.name && user.name.toLowerCase().includes(term)) ||
            (user.email && user.email.toLowerCase().includes(term)) ||
            (user.mobile && user.mobile.toLowerCase().includes(term)) ||
            (user.guestType && user.guestType.toLowerCase().includes(term))
          );
        }
        setTotalCount(arr.length);
        // Pagination
        const startIdx = (page - 1) * pageSize;
        const paged = arr.slice(startIdx, startIdx + pageSize);
        setUsersData(paged);
      } else {
        setUsersData([]);
        setTotalCount(0);
      }
      setLoading(false);
    };
    fetchUsers();
  }, [page, pageSize, searchTerm]);

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

  // Bulk row validation
  const validateBulkRow = (row) => {
    const errors = {};
    if (!row.name || !row.name.trim()) errors.name = 'Name is required.';
    if (!row.mobile || !row.mobile.trim()) errors.mobile = 'Mobile is required.';
    else if (!validateMobile(row.mobile.trim())) errors.mobile = 'Invalid mobile.';
    if (row.email && !validateEmail(row.email.trim())) errors.email = 'Invalid email.';
    return errors;
  };

  // Handle Bulk Upload button click
  const handleBulkUploadClick = () => {
    console.log('Bulk Upload Clicked');
    setShowBulkModal(true);
    setBulkRows([]);
    setBulkInvalidCount(0);
    setBulkUploading(false);
  };

  // Handle CSV file input
  const handleBulkFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.map((row, idx) => {
          // Normalize keys
          const normalized = {
            name: row.name || row.Name || '',
            email: row.email || row.Email || '',
            mobile: row.mobile || row.Mobile || '',
            guestType: row.guestType || row.GuestType || '',
            status: 1
          };
          const errors = validateBulkRow(normalized);
          return {
            row: normalized,
            errors,
            isValid: Object.keys(errors).length === 0,
            originalIdx: idx
          };
        });
        const invalidCount = rows.filter(r => !r.isValid).length;
        setBulkRows(rows);
        setBulkInvalidCount(invalidCount);
      },
      error: () => {
        alert('Failed to parse CSV.');
      }
    });
  };

  // Handle edit in bulk table
  const handleBulkEdit = (idx, field, value) => {
    setBulkRows(prev => {
      const updated = [...prev];
      const rowObj = { ...updated[idx].row, [field]: value };
      const errors = validateBulkRow(rowObj);
      updated[idx] = {
        ...updated[idx],
        row: rowObj,
        errors,
        isValid: Object.keys(errors).length === 0
      };
      const invalidCount = updated.filter(r => !r.isValid).length;
      setBulkInvalidCount(invalidCount);
      return updated;
    });
  };

  // Remove row from bulk table
  const handleBulkRemove = (idx) => {
    setBulkRows(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      const invalidCount = updated.filter(r => !r.isValid).length;
      setBulkInvalidCount(invalidCount);
      return updated;
    });
  };

  // Submit valid rows to Firebase
  const handleBulkSubmit = async () => {
    setBulkUploading(true);
    const validRows = bulkRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setBulkUploading(false);
      return;
    }
    try {
      const db = getDatabase();
      const usersRef = ref(db, 'users');
      for (const r of validRows) {
        await push(usersRef, { ...r.row, status: 1 });
      }
      setShowBulkModal(false);
      setBulkRows([]);
      setBulkInvalidCount(0);
    } catch (err) {
      alert('Failed to upload users.');
    } finally {
      setBulkUploading(false);
    }
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

  // Handler for QR code modal
  const handleShowQR = (userId) => {
    setQrUserId(userId);
    setShowQRModal(true);
  };
  const handleCloseQR = () => {
    setShowQRModal(false);
    setQrUserId(null);
  };

  return (
    <div className="users-container">
      <div className="users-header-row">
        <h1 className="users-title">Admin Dashboard</h1>
        <div className="users-actions">
          <button className="users-upload-btn" onClick={handleBulkUploadClick}>Bulk Upload CSV</button>
          <button className="users-add-btn" onClick={handleAddUserClick}>Add User</button>
        </div>
      </div>
      <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
          style={{ padding: 8, minWidth: 220, borderRadius: 4, border: '1px solid #ccc' }}
        />
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
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>Loading...</td></tr>
            ) : usersData.length === 0 ? (
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
                    <span className="icon qr" title="QR" onClick={() => handleShowQR(user.id)} style={{ cursor: 'pointer' }}>#️⃣</span>
                    <span className="icon delete" title="Delete" onClick={() => handleDeleteUser(user.id)}>🗑️</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="users-pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <div>
            {totalCount > 0 ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount}` : '0–0 of 0'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>Prev</button>
            <span>Page {page}</span>
            <button onClick={() => setPage(p => (p * pageSize < totalCount ? p + 1 : p))} disabled={page * pageSize >= totalCount || loading}>Next</button>
            <span style={{ marginLeft: 16 }}>Rows per page:</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} disabled={loading}>
              {[5, 10, 20, 50].map(sz => <option key={sz} value={sz}>{sz}</option>)}
            </select>
          </div>
        </div>
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

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="users-modal-overlay">
          <div className="users-modal" style={{ minWidth: 600, maxWidth: 900 }}>
            <h2>Bulk Upload Users (CSV)</h2>
            {bulkRows.length === 0 ? (
              <>
                <input className="bulk-upload-file" type="file" accept=".csv" onChange={handleBulkFileChange} />
                <div className="bulk-upload-info">
                  CSV columns: <b>name</b>, <b>email</b>, <b>mobile</b>, <b>guestType</b>
                </div>
                <div className="users-modal-actions" style={{ marginTop: 24 }}>
                  <button type="button" onClick={() => setShowBulkModal(false)} disabled={bulkUploading}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="bulk-upload-summary">
                  {bulkInvalidCount > 0 ? (
                    <span style={{ color: 'red' }}>{bulkInvalidCount} invalid record{bulkInvalidCount > 1 ? 's' : ''} (highlighted below)</span>
                  ) : (
                    <span style={{ color: 'green' }}>All records valid</span>
                  )}
                </div>
                <div style={{ maxHeight: 350, overflow: 'auto', border: '1px solid #eee', borderRadius: 6 }}>
                  <table className="bulk-upload-table" style={{ minWidth: 600, width: '100%' }}>
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
                      {bulkRows.map((r, idx) => (
                        <tr key={idx} className={r.isValid ? '' : 'invalid-row'}>
                          <td>
                            <input type="text" value={r.row.name} onChange={e => handleBulkEdit(idx, 'name', e.target.value)} className="bulk-upload-input" style={r.errors.name ? { borderColor: 'red' } : {}} />
                            {r.errors.name && <div style={{ color: 'red', fontSize: 12 }}>{r.errors.name}</div>}
                          </td>
                          <td>
                            <input type="email" value={r.row.email} onChange={e => handleBulkEdit(idx, 'email', e.target.value)} className="bulk-upload-input" style={r.errors.email ? { borderColor: 'red' } : {}} />
                            {r.errors.email && <div style={{ color: 'red', fontSize: 12 }}>{r.errors.email}</div>}
                          </td>
                          <td>
                            <input type="text" value={r.row.mobile} onChange={e => handleBulkEdit(idx, 'mobile', e.target.value)} className="bulk-upload-input" style={r.errors.mobile ? { borderColor: 'red' } : {}} maxLength={10} />
                            {r.errors.mobile && <div style={{ color: 'red', fontSize: 12 }}>{r.errors.mobile}</div>}
                          </td>
                          <td>
                            <input type="text" value={r.row.guestType} onChange={e => handleBulkEdit(idx, 'guestType', e.target.value)} className="bulk-upload-input" />
                          </td>
                          <td>
                            <button type="button" onClick={() => handleBulkRemove(idx)}>Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="users-modal-actions" style={{ marginTop: 18 }}>
                  <button type="button" onClick={() => setShowBulkModal(false)} disabled={bulkUploading}>Cancel</button>
                  <button type="button" onClick={handleBulkSubmit} disabled={bulkUploading || bulkRows.filter(r => r.isValid).length === 0}>
                    {bulkUploading ? 'Uploading...' : `Save ${bulkRows.filter(r => r.isValid).length} Valid User(s)`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* QR Code Modal */}
      {showQRModal && (
        <div className="users-modal-overlay">
          <div className="users-modal" style={{ textAlign: 'center', minWidth: 320 }}>
            <h2>User QR Code</h2>
            <div style={{ margin: '20px 0', position: 'relative', display: 'inline-block', width: 200, height: 200 }}>
              {qrUserId && (
                <>
                  <QRCodeCanvas value={qrUserId} size={200} style={{ display: 'block' }} />
                  <img 
                    src={require('./assets/logo.jpeg')} 
                    alt="Logo" 
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 44,
                      height: 44,
                      borderRadius: '8px',
                      objectFit: 'contain',
                      background: '#fff',
                      padding: 2,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                      zIndex: 2
                    }}
                  />
                </>
              )}
            </div>
            <div className="users-modal-actions">
              <button type="button" onClick={handleCloseQR}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
