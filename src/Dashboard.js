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
// ...existing code...

const Dashboard = () => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [checkedInUsers, setCheckedInUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pivotData, setPivotData] = useState({ rows: [], columns: [] });
  const [userWiseRows, setUserWiseRows] = useState([]);
  const [usersData, setUsersData] = useState({});
  const [popover, setPopover] = useState({ visible: false, content: [], x: 0, y: 0 });

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (popover.visible) {
        setPopover({ visible: false, content: [], x: 0, y: 0 });
      }
    };

    if (popover.visible) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [popover.visible]);

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
              const time = rec.time || rec['time'] || '';
              const key = userId + '||' + date + '||' + optFor;
              if (!userWiseMap[key]) {
                userWiseMap[key] = { userId, date, optFor, count: 0, time: '', allTimes: [] };
              }
              
              // Handle time data - can be string or object with indexed times
              let timeArray = [];
              if (typeof time === 'object' && time !== null) {
                // Convert object with numeric keys to array
                timeArray = Object.values(time).filter(t => t && typeof t === 'string');
              } else if (typeof time === 'string' && time) {
                timeArray = [time];
              }
              
              // Merge with existing times and remove duplicates
              userWiseMap[key].allTimes = [...new Set([...userWiseMap[key].allTimes, ...timeArray])];
              
              // Store the latest time for this combination
              if (timeArray.length > 0) {
                const latestTime = timeArray.sort().pop(); // Get the latest time
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
        pivotMap[key] = { userId: row.userId, date: row.date, counts: {}, allTimes: {} };
      }
      // Store count, last time, and all times for each option
      const displayValue = row.time ? `${row.count}(${row.time})` : row.count.toString();
      pivotMap[key].counts[row.optFor] = displayValue;
      pivotMap[key].allTimes[row.optFor] = row.allTimes || [];
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
          ...optForColumns.map(optFor => row.counts[optFor] || '0')
        ];
        lines.push(line.join(','));
      });
      downloadCSV(lines.join('\r\n'), 'user_wise_pivot.csv');
    }
    // Functions for popover
    const showPopover = (event, times) => {
      if (times && times.length > 0) {
        setPopover({
          visible: true,
          content: times,
          x: event.clientX,
          y: event.clientY
        });
      }
    };

    const hidePopover = () => {
      setPopover({ visible: false, content: [], x: 0, y: 0 });
    };

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
                  {optForColumns.map(optFor => {
                    const cellValue = row.counts[optFor] || 0;
                    const times = row.allTimes[optFor] || [];
                    const hasMultipleTimes = times.length > 1;
                    
                    return (
                      <td 
                        key={optFor}
                      >
                        {cellValue}
                        {hasMultipleTimes && (
                          <span 
                            className="info-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (popover.visible) {
                                hidePopover();
                              } else {
                                showPopover(e, times);
                              }
                            }}
                            title="Click to see all times"
                          >
                            i
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {/* Popover */}
        {popover.visible && (
          <div
            className="time-popover"
            style={{
              left: popover.x + 10,
              top: popover.y - 10
            }}
          >
            <div className="popover-title">
              All Times ({popover.content.length})
            </div>
            {popover.content.sort().map((time, idx) => (
              <div key={idx} className="time-item">
                {time}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="reports-page">
      <h1>Dashboard</h1>
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

export default Dashboard;
