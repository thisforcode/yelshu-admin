import React, { useEffect, useState } from 'react';
import { getDatabase, ref, get } from 'firebase/database';
import './Reports.css';

// Helper to convert pivot data to CSV
function pivotDataToCSV(pivotData) {
  if (!pivotData || !pivotData.rows || !pivotData.columns) return '';
  const headers = ['Date', ...pivotData.columns];
  const lines = [headers.join(',')];
  pivotData.rows.forEach(row => {
    const line = [
      formatDate(row.date),
      ...pivotData.columns.map(optFor => row[optFor])
    ];
    lines.push(line.join(','));
  });
  return lines.join('\r\n');
}

// Helper to convert user-wise data to CSV
function userWiseDataToCSV(userWiseRows) {
  if (!userWiseRows || userWiseRows.length === 0) return '';
  const headers = ['User Name', 'Date', 'Opt-for', 'Count'];
  const lines = [headers.join(',')];
  userWiseRows.forEach(row => {
    lines.push([
      row.userName,
      formatDate(row.date),
      row.optFor,
      row.count
    ].join(','));
  });
  return lines.join('\r\n');
}

// Helper to trigger CSV download
function downloadCSV(csv, filename = 'opted_users.csv') {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helper to format date (assuming date is in a parseable format)
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString();
}

// Helper to build user-wise pivot data for table
function buildUserWisePivot(userWiseRows) {
  const userMap = {};
  userWiseRows.forEach(row => {
    if (!userMap[row.userName]) userMap[row.userName] = [];
    userMap[row.userName].push(row);
  });
  const result = {};
  Object.entries(userMap).forEach(([userName, rows]) => {
    const dateSet = new Set();
    const optForSet = new Set();
    rows.forEach(r => {
      dateSet.add(r.date);
      optForSet.add(r.optFor);
    });
    const dates = Array.from(dateSet).sort((a, b) => new Date(b) - new Date(a));
    const optFors = Array.from(optForSet).sort();
    const pivot = {};
    rows.forEach(r => {
      if (!pivot[r.date]) pivot[r.date] = {};
      pivot[r.date][r.optFor] = r.count;
    });
    const tableRows = dates.map(date => {
      const row = { date };
      optFors.forEach(optFor => {
        row[optFor] = pivot[date] && pivot[date][optFor] ? pivot[date][optFor] : 0;
      });
      return row;
    });
    result[userName] = { rows: tableRows, columns: optFors };
  });
  return result;
}

function Reports() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [checkedInUsers, setCheckedInUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pivotData, setPivotData] = useState({ rows: [], columns: [] });
  const [userWiseRows, setUserWiseRows] = useState([]);
  const [usersData, setUsersData] = useState({});

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);
      const db = getDatabase();
      const usersRef = ref(db, 'users');
      const opttedRef = ref(db, 'tbl-optted');
      try {
        let usersData = {};
        const snap = await get(usersRef);
        if (snap.exists()) {
          usersData = snap.val();
          setUsersData(usersData);
          const arr = Object.values(usersData).filter(user => user.status === 1 || user.status === '1');
          setTotalUsers(arr.length);
        } else {
          setUsersData({});
          setTotalUsers(0);
        }

        const opttedSnap = await get(opttedRef);
        if (opttedSnap.exists()) {
          const opttedData = opttedSnap.val();
          const checkinCount = Object.values(opttedData).filter(
            (rec) => rec['opt-for'] === 'Check-in' && (rec['optted'] === true || rec['optted'] === 1 || rec['optted'] === '1')
          ).length;
          setCheckedInUsers(checkinCount);

          // Pivot: collect all unique dates and opt-for values
          const dateSet = new Set();
          const optForSet = new Set();
          const pivotMap = {};
          Object.values(opttedData).forEach(rec => {
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
          setPivotData({ rows, columns: optFors });

          // User-wise optted data: group by userId, date, opt-for
          const userWiseMap = {};
          Object.values(opttedData).forEach(rec => {
            if (rec['optted'] === true || rec['optted'] === 1 || rec['optted'] === '1') {
              const date = rec.date || rec['date'] || '';
              const optFor = rec['opt-for'] || '';
              // Use 'id' field for join: users.id === tbl-optted.id
              const userId = rec['id'] || '';
              const key = userId + '||' + date + '||' + optFor;
              if (!userWiseMap[key]) {
                userWiseMap[key] = { userId, date, optFor, count: 0 };
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
          setUserWiseRows(userWiseRows);
        } else {
          setCheckedInUsers(0);
          setPivotData({ rows: [], columns: [] });
          setUserWiseRows([]);
        }
      } catch (e) {
        setTotalUsers(0);
        setCheckedInUsers(0);
        setPivotData({ rows: [], columns: [] });
        setUserWiseRows([]);
      }
      setLoading(false);
    };
    fetchCounts();
  }, []);

  // Rendered content for main pivot table
  let pivotTableContent;
  if (loading) {
    pivotTableContent = <div>Loading table...</div>;
  } else if (pivotData.rows.length === 0) {
    pivotTableContent = <div>No data available.</div>;
  } else {
    pivotTableContent = (
      <table className="users-table">
        <thead>
          <tr>
            <th>Date</th>
            {pivotData.columns.map(optFor => (
              <th key={optFor}>{optFor}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pivotData.rows.map((row, idx) => (
            <tr key={row.date + idx}>
              <td>{formatDate(row.date)}</td>
              {pivotData.columns.map(optFor => (
                <td key={optFor}>{row[optFor]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // Rendered content for user-wise pivot table (one row per user/date, columns for each opt-for)
  let userWiseTableContent;
  if (loading) {
    userWiseTableContent = <div>Loading table...</div>;
  } else if (userWiseRows.length === 0) {
    userWiseTableContent = <div>No data available.</div>;
  } else {
    // Build pivot: group by userId+date, columns are all opt-for values found in tbl-optted
    const pivotMap = {};
    const optForSet = new Set();
    userWiseRows.forEach(row => {
      const key = row.userId + '||' + row.date;
      if (!pivotMap[key]) {
        pivotMap[key] = { userId: row.userId, date: row.date, counts: {} };
      }
      // For Beverages, display the count of records (not sum of value)
      if (row.optFor === 'Beverages') {
        pivotMap[key].counts['Beverages'] = row.count;
      } else {
        pivotMap[key].counts[row.optFor] = row.count;
      }
      optForSet.add(row.optFor);
    });
    const optForColumns = Array.from(optForSet).sort();
    // Sort rows by user name, then date desc
    const pivotRows = Object.values(pivotMap).sort((a, b) => {
      const nameA = a.userId && usersData[a.userId] && usersData[a.userId].name ? usersData[a.userId].name : a.userId;
      const nameB = b.userId && usersData[b.userId] && usersData[b.userId].name ? usersData[b.userId].name : b.userId;
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      if (a.date < b.date) return 1;
      if (a.date > b.date) return -1;
      return 0;
    });
    // CSV export for pivot table
    function exportUserWisePivotToCSV() {
      const headers = ['User Name', 'Date', ...optForColumns];
      const lines = [headers.join(',')];
      pivotRows.forEach(row => {
        let displayName = row.userId;
        if (row.userId && usersData[row.userId] && usersData[row.userId].name) {
          displayName = usersData[row.userId].name + (usersData[row.userId].mobile ? ` (${usersData[row.userId].mobile})` : '');
        }
        const line = [
          '"' + displayName.replace(/"/g, '""') + '"',
          formatDate(row.date),
          ...optForColumns.map(optFor => row.counts[optFor] || 0)
        ];
        lines.push(line.join(','));
      });
      downloadCSV(lines.join('\r\n'), 'user_wise_pivot.csv');
    }
    userWiseTableContent = (
      <div style={{ marginTop: 32 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>User Wise Pivot Table</span>
          <button
            className="export-csv-btn"
            style={{ marginLeft: 16, padding: '4px 12px', fontSize: 14 }}
            onClick={exportUserWisePivotToCSV}
            disabled={pivotRows.length === 0}
          >
            Export as CSV
          </button>
        </h2>
        <table className="users-table">
          <thead>
            <tr>
              <th>User Name</th>
              <th>Date</th>
              {optForColumns.map(optFor => (
                <th key={optFor}>{optFor}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pivotRows.map((row, idx) => {
              let displayName = row.userId;
              if (row.userId && usersData[row.userId] && usersData[row.userId].name) {
                displayName = usersData[row.userId].name + (usersData[row.userId].mobile ? ` (${usersData[row.userId].mobile})` : '');
              }
              return (
                <tr key={row.userId + row.date + idx}>
                  <td>{displayName}</td>
                  <td>{formatDate(row.date)}</td>
                  {optForColumns.map(optFor => (
                    <td key={optFor}>{row.counts[optFor] || 0}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <h1>Reports</h1>
      <div className="tile-row">
        <div className="tile">
          <div className="tile-title">Total Registered Users</div>
          <div className="tile-value">{loading ? '...' : totalUsers}</div>
        </div>
        <div className="tile">
          <div className="tile-title">Check-in Users</div>
          <div className="tile-value">{loading ? '...' : checkedInUsers}</div>
        </div>
      </div>

      {/* Pivot Table */}
      <div className="grouped-table-section">
        <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Opted Users by Date and Option</span>
          <button
            className="export-csv-btn"
            style={{ marginLeft: 16, padding: '4px 12px', fontSize: 14 }}
            disabled={loading || pivotData.rows.length === 0}
            onClick={() => downloadCSV(pivotDataToCSV(pivotData))}
          >
            Export as CSV
          </button>
        </h2>
        <div className="users-table-wrapper">
          {pivotTableContent}
        </div>
      </div>

      {/* User Wise Pivot Table Only */}
      <div className="grouped-table-section">
        <div className="users-table-wrapper">
          {userWiseTableContent}
        </div>
      </div>
    </div>
  );
}

export default Reports;
