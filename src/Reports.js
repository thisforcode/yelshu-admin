import React, { useEffect, useState } from 'react';
import { getDatabase, ref, get } from 'firebase/database';
import './Reports.css';

function Reports() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [checkedInUsers, setCheckedInUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);
      const db = getDatabase();
      // Fetch total users
      const usersRef = ref(db, 'users');
      // Fetch check-in users from tbl-optted
      const opttedRef = ref(db, 'tbl-optted');
      try {
        // Total users
        const snap = await get(usersRef);
        if (snap.exists()) {
          const data = snap.val();
          const arr = Object.values(data).filter(user => user.status === 1 || user.status === '1');
          setTotalUsers(arr.length);
        } else {
          setTotalUsers(0);
        }

        // Check-in users
        const opttedSnap = await get(opttedRef);
        if (opttedSnap.exists()) {
          const opttedData = opttedSnap.val();
          // opttedData is an object, count records where opt-for === 'Check-in' and optted === true
          const checkinCount = Object.values(opttedData).filter(
            (rec) => rec['opt-for'] === 'Check-in' && (rec['optted'] === true || rec['optted'] === 1 || rec['optted'] === '1')
          ).length;
          setCheckedInUsers(checkinCount);
        } else {
          setCheckedInUsers(0);
        }
      } catch (e) {
        setTotalUsers(0);
        setCheckedInUsers(0);
      }
      setLoading(false);
    };
    fetchCounts();
  }, []);

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
    </div>
  );
}

export default Reports;
