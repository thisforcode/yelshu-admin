import React, { useEffect, useState } from 'react';
import { useTenant } from './TenantContext';
import { createTenantDataService } from './services/TenantDataService';
import FirestoreDebug from './FirestoreDebug';
import './Reports.css';
import './NoEventSelected.css';

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
  const { tenantId, selectedEventId } = useTenant();
  const [totalUsers, setTotalUsers] = useState(0);
  const [checkedInUsers, setCheckedInUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pivotData, setPivotData] = useState({ rows: [], columns: [] });
  const [userWiseRows, setUserWiseRows] = useState([]);
  const [usersData, setUsersData] = useState({});
  const [popover, setPopover] = useState({ visible: false, content: [], x: 0, y: 0 });
  const [migrationNeeded, setMigrationNeeded] = useState(false);

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
    if (!tenantId || !selectedEventId) return;
    
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const tenantService = createTenantDataService(tenantId);
        const stats = await tenantService.getDashboardStats(selectedEventId);
        
        setTotalUsers(stats.totalUsers);
        setCheckedInUsers(stats.checkedInUsers);
        setPivotData(stats.pivotData);
        setUserWiseRows(stats.userWiseRows);
        setUsersData(stats.usersData);
        setMigrationNeeded(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // If no tenant data exists, offer migration
        setMigrationNeeded(true);
        setTotalUsers(0);
        setCheckedInUsers(0);
        setPivotData({ rows: [], columns: [] });
        setUserWiseRows([]);
        setUsersData({});
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [tenantId, selectedEventId]);

  const handleMigrateData = async () => {
    if (!tenantId) return;
    
    try {
      setLoading(true);
      const tenantService = createTenantDataService(tenantId);
      await tenantService.migrateExistingData();
      
      // Refresh data after migration
      const stats = await tenantService.getDashboardStats(selectedEventId);
      setTotalUsers(stats.totalUsers);
      setCheckedInUsers(stats.checkedInUsers);
      setPivotData(stats.pivotData);
      setUserWiseRows(stats.userWiseRows);
      setUsersData(stats.usersData);
      setMigrationNeeded(false);
    } catch (error) {
      console.error('Error migrating data:', error);
      alert('Failed to migrate data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

  if (!selectedEventId) {
    return (
      <div className="reports-page">
        <h1>Dashboard</h1>
        <div className="no-event-selected">
          <div className="no-event-icon">
            <i className="fas fa-calendar-times"></i>
          </div>
          <div className="no-event-content">
            <h3>No Event Selected</h3>
            <p>Please select an event from the header dropdown to view dashboard data.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <h1>Dashboard</h1>
      
      {migrationNeeded && (
        <div className="migration-notice">
          <div className="migration-icon">
            <i className="fas fa-database"></i>
          </div>
          <div className="migration-content">
            <h3>Data Migration Required</h3>
            <p>Your existing data needs to be migrated to the new tenant-based system. This is a one-time process.</p>
            <button onClick={handleMigrateData} className="migrate-btn" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  Migrating...
                </>
              ) : (
                <>
                  <i className="fas fa-arrow-right"></i>
                  Migrate Data Now
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
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
      
      {/* Firestore Debug Component - Temporary */}
      <FirestoreDebug />
    </div>
  );
}

export default Dashboard;
