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
          const arr = Object.values(usersData).filter(user => user.status === 1 || user.status === '1');
          setTotalUsers(arr.length);
        } else {
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

          // User-wise optted data: group by user name, date, opt-for
          const userWiseMap = {};
          Object.values(opttedData).forEach(rec => {
            if (rec['optted'] === true || rec['optted'] === 1 || rec['optted'] === '1') {
              const date = rec.date || rec['date'] || '';
              const optFor = rec['opt-for'] || '';
              const userId = rec['user-id'] || rec['userId'] || rec['userid'] || rec['uid'] || '';
              let userName = userId;
              if (userId && usersData[userId] && usersData[userId].name) {
                userName = usersData[userId].name;
              }
              const key = userName + '||' + date + '||' + optFor;
              if (!userWiseMap[key]) {
                userWiseMap[key] = { userName, date, optFor, count: 0 };
              }
              userWiseMap[key].count += 1;
            }
          });
          const userWiseRows = Object.values(userWiseMap).sort((a, b) => {
            if (a.userName < b.userName) return -1;
            if (a.userName > b.userName) return 1;
            if (a.date < b.date) return 1;
            if (a.date > b.date) return -1;
            if (a.optFor < b.optFor) return -1;
            if (a.optFor > b.optFor) return 1;
            return 0;
              onClick={() => downloadCSV(pivotDataToCSV(pivotData))}
            >
              Export as CSV
            </button>
          </h2>
          <div className="users-table-wrapper">
            {pivotTableContent}
          </div>
        </div>

        {/* User Wise Optted Data Table */}
        <div className="grouped-table-section">
          <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>User Wise Optted Data</span>
            <button
              className="export-csv-btn"
              style={{ marginLeft: 16, padding: '4px 12px', fontSize: 14 }}
              disabled={loading || userWiseRows.length === 0}
