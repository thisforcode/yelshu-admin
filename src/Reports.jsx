import React, { useEffect, useState } from 'react';
// import { getDatabase, ref, get } from 'firebase/database';
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



function Reports() {
  const [loading] = useState(true);
  const [pivotData] = useState({ rows: [], columns: [] });
  const [userWiseRows] = useState([]);
  const [checkedInUsers] = useState(0);
  const [totalUsers] = useState(0);
  const [usersData] = useState({});

  useEffect(() => {
    // TODO: Add your data fetching logic here and update state accordingly
  }, []);

  // ...existing code for rendering tables and content...

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

  let userWiseTableContent;
  if (loading) {
    userWiseTableContent = <div>Loading table...</div>;
  } else if (userWiseRows.length === 0) {
    userWiseTableContent = <div>No data available.</div>;
  } else {
    const pivotMap = {};
    const optForSet = new Set();
    userWiseRows.forEach(row => {
      const key = row.userId + '||' + row.date;
      if (!pivotMap[key]) {
        pivotMap[key] = { userId: row.userId, date: row.date, counts: {} };
      }
      if (row.optFor === 'Beverages') {
        pivotMap[key].counts['Beverages'] = row.count;
      } else {
        pivotMap[key].counts[row.optFor] = row.count;
      }
      optForSet.add(row.optFor);
    });
    const optForColumns = Array.from(optForSet).sort();
    const pivotRows = Object.values(pivotMap).sort((a, b) => {
      const nameA = a.userId && usersData[a.userId] && usersData[a.userId].name ? usersData[a.userId].name : a.userId;
      const nameB = b.userId && usersData[b.userId] && usersData[b.userId].name ? usersData[b.userId].name : b.userId;
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      if (a.date < b.date) return 1;
      if (a.date > b.date) return -1;
      return 0;
    });
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
