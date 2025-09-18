import React from 'react';
import Box from '@mui/material/Box';
import './NoEventSelected.css';

// Simple placeholder shown when no event is selected.
export default function NoEventSelected() {
  return (
    <Box className="no-event-root" display="flex" alignItems="center" justifyContent="center" height="100%">
      <div className="no-event-card">
        <h2>No event selected</h2>
        <p>Please choose an event from the left to get started.</p>
      </div>
    </Box>
  );
}
