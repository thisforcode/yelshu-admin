import React, { useState, useEffect, useMemo } from 'react';
import { useTenant } from './TenantContext';
import { createEventService } from './services/EventService';
import './EventSelector.css';

const EventSelector = () => {
  const { tenantId, selectedEventId, setSelectedEventId, isAuthenticated } = useTenant();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  console.log('EventSelector render:', { tenantId, selectedEventId, eventsLength: events.length, isAuthenticated }); // Debug log

  useEffect(() => {
    const loadEvents = async () => {
      if (!tenantId || !isAuthenticated) {
        console.log('EventSelector: Not ready to load events', { tenantId, isAuthenticated });
        return;
      }
      
      try {
        setLoading(true);
        console.log('EventSelector: Starting to load events for tenant:', tenantId);
        const eventService = createEventService(tenantId);
        const eventData = await eventService.getEvents();
        console.log('EventSelector: Loaded events:', eventData); // Debug log
        setEvents(eventData);
        
        // Auto-select first event if none is selected and events exist
        if (!selectedEventId && eventData.length > 0) {
          console.log('EventSelector: Auto-selecting first event:', eventData[0].id); // Debug log
          setSelectedEventId(eventData[0].id);
        }
      } catch (error) {
        console.error('EventSelector: Error loading events:', error);
        setEvents([]); // Ensure events is empty on error
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [tenantId, isAuthenticated, selectedEventId, setSelectedEventId]); // Wait for both tenantId and authentication

  // close on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!e.target.closest || !document) return;
      const el = e.target.closest('.event-selector-container');
      if (!el) setOpen(false);
    };
    if (open) document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  // Compute active events only
  const activeEvents = useMemo(() => {
    return (events || []).filter((e) => String(e?.status || '').toLowerCase() === 'active');
  }, [events]);

  // Auto-select first ACTIVE event when events change or when selection is invalid
  useEffect(() => {
    if (activeEvents.length === 0) return; // nothing to select
    const isSelectionActive = activeEvents.some((e) => e.id === selectedEventId);
    if (!selectedEventId || !isSelectionActive) {
      const firstActiveId = activeEvents[0].id;
      console.log('EventSelector: Auto-selecting first ACTIVE event:', firstActiveId);
      setSelectedEventId(firstActiveId);
    }
  }, [activeEvents, selectedEventId, setSelectedEventId]);

  const handleEventChange = (eventId) => {
    setSelectedEventId(eventId);
    setOpen(false);
  };

  const selectedEvent = useMemo(() => {
    return activeEvents.find((event) => event.id === selectedEventId) || null;
  }, [activeEvents, selectedEventId]);

  if (!tenantId || !isAuthenticated || loading) {
    return (
      <div className="event-selector-container">
        <div className="event-selector-loading">
          {!tenantId ? 'Waiting for tenant...' : !isAuthenticated ? 'Authenticating...' : 'Loading events...'}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="event-selector-container">
        <div className="event-selector-no-events">No events available for this tenant</div>
        <button 
          onClick={() => window.location.href = '/events'} 
          style={{ marginTop: '10px', padding: '5px 10px', background: '#22325a', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Create Event
        </button>
      </div>
    );
  }

  if (activeEvents.length === 0) {
    return (
      <div className="event-selector-container">
        <div className="event-selector-no-events">No active events</div>
      </div>
    );
  }

  // format date helper
  const fmt = (d) => {
    if (!d) return '';
    // Firestore Timestamp (has toDate)
    try {
      if (typeof d === 'object') {
        if (typeof d.toDate === 'function') {
          return d.toDate().toLocaleString();
        }
        // { seconds, nanoseconds }
        if (d.seconds && typeof d.seconds === 'number') {
          return new Date(d.seconds * 1000).toLocaleString();
        }
        // sometimes stored as { _seconds:..., _nanoseconds: ... }
        if (d._seconds && typeof d._seconds === 'number') {
          return new Date(d._seconds * 1000).toLocaleString();
        }
      }

      const dt = new Date(d);
      if (isNaN(dt)) return String(d);
      return dt.toLocaleString();
    } catch (e) {
      return String(d);
    }
  };

  return (
    <div className="event-selector-container">
      {/* Dropdown first */}
      <div className={`event-dropdown ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} role="button" tabIndex={0}>
        <div className="event-dropdown-toggle">
          <span className="label">{selectedEvent ? selectedEvent.name : `Select an active event (${activeEvents.length})`}</span>
          <span className="caret">▾</span>
        </div>

        <div className="event-dropdown-list" style={{ display: open ? 'block' : 'none' }}>
          {activeEvents.map((event) => (
            <div
              key={event.id}
              className={`event-dropdown-item ${event.id === selectedEventId ? 'selected' : ''}`}
              onClick={(e) => { e.stopPropagation(); handleEventChange(event.id); }}
            >
              <div className="event-item-name">{event.name}</div>
              <div className="event-item-date">{fmt(event.startDate)} — {fmt(event.endDate)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventSelector;