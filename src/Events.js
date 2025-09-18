import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from './TenantContext';
import { createEventService } from './services/EventService';
import './Events.css';

const Events = () => {
  const { tenantId } = useTenant();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const eventService = createEventService(tenantId);
      let eventData;
      
      if (filterStatus === 'all') {
        eventData = await eventService.getEvents();
      } else {
        eventData = await eventService.getEventsByStatus(filterStatus);
      }
      
      setEvents(eventData);
      setError('');
    } catch (err) {
      setError('Failed to load events');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, filterStatus]);

  useEffect(() => {
    if (tenantId) {
      loadEvents();
    }
  }, [tenantId, loadEvents]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadEvents();
      return;
    }

    try {
      setLoading(true);
      const eventService = createEventService(tenantId);
      const searchResults = await eventService.searchEvents(searchTerm);
      setEvents(searchResults);
    } catch (err) {
      setError('Failed to search events');
    } finally {
      setLoading(false);
    }
  };

  // Note: debounce removed — searches run only when user clicks Search or presses Enter

  const handleDelete = async (eventId) => {
    try {
      const eventService = createEventService(tenantId);
      await eventService.deleteEvent(eventId);
      setEvents(events.filter(event => event.id !== eventId));
      setDeleteConfirm(null);
    } catch (err) {
      setError('Failed to delete event');
    }
  };

  const handleStatusChange = async (eventId, newStatus) => {
    try {
      const eventService = createEventService(tenantId);
      await eventService.updateEvent(eventId, { status: newStatus });
      loadEvents();
    } catch (err) {
      setError('Failed to update event status');
    }
  };

  const handleGenerateLink = async (event) => {
    try {
      const eventService = createEventService(tenantId);
      let updated = event;
      if (!event.publicRegistrationId) {
        const token = Math.random().toString(36).substr(2, 9);
        await eventService.updateEvent(event.id, { publicRegistrationId: token });
        updated = { ...event, publicRegistrationId: token };
      }

      // Build public URL
      const origin = window.location.origin;
      const publicUrl = `${origin}/r/${tenantId}/${event.id}/${updated.publicRegistrationId}`;
      // Copy to clipboard
      await navigator.clipboard.writeText(publicUrl);
      alert('Public registration link copied to clipboard:\n' + publicUrl);
      // Refresh events list
      loadEvents();
    } catch (err) {
      console.error('Failed to generate link', err);
      setError('Failed to generate public link');
    }
  };

  const filteredEvents = events.filter(event => {
    if (!searchTerm) return true;
    return event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           event.description?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="events-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="events-container">
      <div className="events-header">
        <div className="events-title-section">
          <h1 className="events-title">
            <i className="fas fa-calendar-alt"></i>
            Events Management
          </h1>
          <p className="events-subtitle">Manage and organize your events</p>
        </div>
        <Link to="/create-event" className="create-event-btn">
          <i className="fas fa-plus"></i>
          Create Event
        </Link>
      </div>

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      <div className="events-controls">
        <div className="search-section">
          <div className="search-container">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // prevent form submission / page refresh
                  e.preventDefault();
                  handleSearch();
                }
              }}
              className="search-input"
            />
            {/* Search button removed; users press Enter to run search */}
          </div>
        </div>

        <div className="filter-section">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Events</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="events-content">
        {filteredEvents.length === 0 ? (
          <div className="no-events">
            <div className="no-events-icon">
              <i className="fas fa-calendar-times"></i>
            </div>
            <h3>No Events Found</h3>
            <p>
              {searchTerm ? 
                'No events match your search criteria.' : 
                'You haven\'t created any events yet. Click "Create Event" to get started.'
              }
            </p>
            {!searchTerm && (
              <Link to="/create-event" className="create-first-event-btn">
                <i className="fas fa-plus"></i>
                Create Your First Event
              </Link>
            )}
          </div>
        ) : (
          <div className="events-grid">
            {filteredEvents.map((event) => (
              <div key={event.id} className={`event-card ${event.status}`}>
                <div className="event-card-header">
                  <h3 className="event-name">{event.name}</h3>
                  <div className="event-actions">
                    <div className="status-badge">
                      <select
                        value={event.status || 'active'}
                        onChange={(e) => handleStatusChange(event.id, e.target.value)}
                        className="status-select"
                      >
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <Link
                      to={`/edit-event/${event.id}`}
                      className="link-btn"
                      title="Edit Event"
                      aria-label="Edit event"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </Link>
                    {event.publicRegistrationId && (
                      <button
                        onClick={() => handleGenerateLink(event)}
                        className="link-btn"
                        title="Copy Public Link"
                        aria-label="Copy public link"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-3 3" />
                          <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l3-3" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteConfirm(event.id)}
                      className="delete-btn"
                      title="Delete Event"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>

                <div className="event-details">
                  {event.description && (
                    <p className="event-description">{event.description}</p>
                  )}
                  
                  <div className="event-meta">
                    <div className="meta-item">
                      <i className="fas fa-calendar"></i>
                      <span>Created: {formatDate(event.createdAt)}</span>
                    </div>
                    {event.startDate && (
                      <div className="meta-item">
                        <i className="fas fa-play-circle"></i>
                        <span>Start: {formatDate(event.startDate)}</span>
                      </div>
                    )}
                    {event.endDate && (
                      <div className="meta-item">
                        <i className="fas fa-stop-circle"></i>
                        <span>End: {formatDate(event.endDate)}</span>
                      </div>
                    )}
                    {event.registrationStart && (
                      <div className="meta-item">
                        <i className="fas fa-calendar-plus"></i>
                        <span>Registration start: {formatDate(event.registrationStart)}</span>
                      </div>
                    )}
                    {event.registrationEnd && (
                      <div className="meta-item">
                        <i className="fas fa-flag-checkered"></i>
                        <span>Registration end: {formatDate(event.registrationEnd)}</span>
                      </div>
                    )}
                  </div>

                  {event.location && (
                    <div className="event-location">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>{event.location}</span>
                    </div>
                  )}

                  {/* Public link (shown only when enabled) */}
                  {event.publicRegistrationId && (
                    <div style={{
                      marginTop: 12,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: 10
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: 8, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-3 3" />
                          <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l3-3" />
                        </svg>
                        Public Registration Link
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/r/${tenantId}/${event.id}/${event.publicRegistrationId}`}
                          style={{ flex: 1, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                          onFocus={(e) => e.target.select()}
                        />
                        <button
                          type="button"
                          className="link-btn"
                          title="Copy Link"
                          aria-label="Copy link"
                          onClick={async () => {
                            try {
                              const url = `${window.location.origin}/r/${tenantId}/${event.id}/${event.publicRegistrationId}`;
                              await navigator.clipboard.writeText(url);
                            } catch {}
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                        <a
                          href={`${window.location.origin}/r/${tenantId}/${event.id}/${event.publicRegistrationId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="link-btn"
                          title="Open Link"
                          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          aria-label="Open public link"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <div className="modal-icon">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Delete Event?</h3>
            <p>Are you sure you want to delete this event? This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="confirm-delete-btn"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;