import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from './TenantContext';
import { createEventService } from './services/EventService';
import './CreateEvent.css';

const EditEvent = () => {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const { eventId } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    registrationStart: '',
    registrationEnd: '',
    location: '',
    status: 'active',
    maxAttendees: '',
    registrationRequired: false,
    contactEmail: '',
    contactPhone: '',
    eventType: 'conference',
    tags: ''
  });

  const [errors, setErrors] = useState({});
  const [publicLink, setPublicLink] = useState('');
  const [hasPublicLink, setHasPublicLink] = useState(false);

  const eventTypes = [
    { value: 'conference', label: 'Conference' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'seminar', label: 'Seminar' },
    { value: 'meetup', label: 'Meetup' },
    { value: 'webinar', label: 'Webinar' },
    { value: 'training', label: 'Training' },
    { value: 'networking', label: 'Networking' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const service = createEventService(tenantId);
        const evt = await service.getEvent(eventId);
        setFormData({
          name: evt.name || '',
          description: evt.description || '',
          startDate: evt.startDate ? (evt.startDate.toDate ? toLocalInput(evt.startDate.toDate()) : toLocalInput(new Date(evt.startDate))) : '',
          endDate: evt.endDate ? (evt.endDate.toDate ? toLocalInput(evt.endDate.toDate()) : toLocalInput(new Date(evt.endDate))) : '',
          registrationStart: evt.registrationStart ? (evt.registrationStart.toDate ? toLocalInput(evt.registrationStart.toDate()) : toLocalInput(new Date(evt.registrationStart))) : '',
          registrationEnd: evt.registrationEnd ? (evt.registrationEnd.toDate ? toLocalInput(evt.registrationEnd.toDate()) : toLocalInput(new Date(evt.registrationEnd))) : '',
          location: evt.location || '',
          status: evt.status || 'active',
          maxAttendees: evt.maxAttendees ?? '',
          registrationRequired: !!evt.registrationRequired,
          contactEmail: evt.contactEmail || '',
          contactPhone: evt.contactPhone || '',
          eventType: evt.eventType || 'conference',
          tags: Array.isArray(evt.tags) ? evt.tags.join(', ') : (evt.tags || '')
        });
        // Setup public link state
        if (evt.publicRegistrationId) {
          setHasPublicLink(true);
          const origin = window.location.origin;
          setPublicLink(`${origin}/r/${tenantId}/${eventId}/${evt.publicRegistrationId}`);
        } else {
          setHasPublicLink(false);
          setPublicLink('');
        }
        setError('');
      } catch (err) {
        console.error(err);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };
    if (tenantId && eventId) loadEvent();
  }, [tenantId, eventId]);

  const toLocalInput = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mi = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Event name is required';
    if (!formData.description.trim()) newErrors.description = 'Event description is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) newErrors.endDate = 'End date cannot be before start date';
    }

    if (formData.registrationStart && formData.registrationEnd) {
      const rStart = new Date(formData.registrationStart);
      const rEnd = new Date(formData.registrationEnd);
      if (rEnd < rStart) newErrors.registrationEnd = 'Registration end cannot be before registration start';
    }

    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }

    if (formData.contactPhone && !/^[+]?([0-9\s\-()]){7,16}$/.test(formData.contactPhone)) {
      newErrors.contactPhone = 'Please enter a valid phone number';
    }

    if (formData.maxAttendees && (isNaN(formData.maxAttendees) || parseInt(formData.maxAttendees) < 1)) {
      newErrors.maxAttendees = 'Max attendees must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    setError('');

    try {
      const service = createEventService(tenantId);
      const updates = {
        ...formData,
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        startDate: formData.startDate ? new Date(formData.startDate) : null,
        endDate: formData.endDate ? new Date(formData.endDate) : null,
        registrationStart: formData.registrationStart ? new Date(formData.registrationStart) : null,
        registrationEnd: formData.registrationEnd ? new Date(formData.registrationEnd) : null
      };
      await service.updateEvent(eventId, updates);
      setSuccess(true);
      setTimeout(() => navigate('/events'), 1400);
    } catch (err) {
      console.error(err);
      setError('Failed to update event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate('/events');

  const togglePublicLink = async (enable) => {
    try {
      const service = createEventService(tenantId);
      if (enable) {
        // Generate token if missing
        const genToken = () => {
          const part = () => Math.random().toString(36).slice(2, 12);
          return (part() + part()).slice(0, 20);
        };
        const token = genToken();
        await service.updateEvent(eventId, { publicRegistrationId: token });
        const origin = window.location.origin;
        const url = `${origin}/r/${tenantId}/${eventId}/${token}`;
        setHasPublicLink(true);
        setPublicLink(url);
        try { await navigator.clipboard.writeText(url); } catch {}
      } else {
        // Remove token
        await service.updateEvent(eventId, { publicRegistrationId: null });
        setHasPublicLink(false);
        setPublicLink('');
      }
    } catch (err) {
      console.error('Failed to toggle public link', err);
      setError('Failed to update public link setting');
    }
  };

  if (loading) {
    return (
      <div className="create-event-container" style={{ padding: 40, textAlign: 'center' }}>
        Loading event...
      </div>
    );
  }

  if (success) {
    return (
      <div className="create-event-container">
        <div className="success-message">
          <div className="success-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <h2>Event Updated Successfully!</h2>
          <p>Your changes have been saved.</p>
          <div className="success-animation">
            <div className="pulse-circle"></div>
            <div className="pulse-circle delay-1"></div>
            <div className="pulse-circle delay-2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-event-container">
      <div className="create-event-header">
        <button onClick={handleCancel} className="back-btn">
          <i className="fas fa-arrow-left"></i>
          Back to Events
        </button>
        <div className="header-content">
          <h1 className="create-event-title">
            <i className="fas fa-edit"></i>
            Edit Event
          </h1>
          <p className="create-event-subtitle">Modify your event details and save changes</p>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="create-event-form">
        <div className="form-sections">
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="section-title">
              <i className="fas fa-info-circle"></i>
              Basic Information
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Event Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  placeholder="Enter event name"
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="eventType" className="form-label">Event Type</label>
                <select
                  id="eventType"
                  name="eventType"
                  value={formData.eventType}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  {eventTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                Description <span className="required">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className={`form-textarea ${errors.description ? 'error' : ''}`}
                placeholder="Describe your event..."
                rows="4"
              />
              {errors.description && <span className="error-text">{errors.description}</span>}
            </div>
          </div>

          {/* Date & Time */}
          <div className="form-section">
            <h3 className="section-title">
              <i className="fas fa-clock"></i>
              Date & Time
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDate" className="form-label">
                  Start Date & Time <span className="required">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className={`form-input ${errors.startDate ? 'error' : ''}`}
                />
                {errors.startDate && <span className="error-text">{errors.startDate}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="endDate" className="form-label">End Date & Time</label>
                <input
                  type="datetime-local"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className={`form-input ${errors.endDate ? 'error' : ''}`}
                />
                {errors.endDate && <span className="error-text">{errors.endDate}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="registrationStart" className="form-label">
                  Registration Start (optional)
                </label>
                <input
                  type="datetime-local"
                  id="registrationStart"
                  name="registrationStart"
                  value={formData.registrationStart}
                  onChange={handleInputChange}
                  className={`form-input ${errors.registrationStart ? 'error' : ''}`}
                />
                {errors.registrationStart && <span className="error-text">{errors.registrationStart}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="registrationEnd" className="form-label">
                  Registration End (optional)
                </label>
                <input
                  type="datetime-local"
                  id="registrationEnd"
                  name="registrationEnd"
                  value={formData.registrationEnd}
                  onChange={handleInputChange}
                  className={`form-input ${errors.registrationEnd ? 'error' : ''}`}
                />
                {errors.registrationEnd && <span className="error-text">{errors.registrationEnd}</span>}
              </div>
            </div>
          </div>

          {/* Location & Details */}
          <div className="form-section">
            <h3 className="section-title">
              <i className="fas fa-map-marker-alt"></i>
              Location & Details
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="location" className="form-label">Location</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Event location or online meeting link"
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxAttendees" className="form-label">Max Attendees</label>
                <input
                  type="number"
                  id="maxAttendees"
                  name="maxAttendees"
                  value={formData.maxAttendees}
                  onChange={handleInputChange}
                  className={`form-input ${errors.maxAttendees ? 'error' : ''}`}
                  placeholder="Leave empty for unlimited"
                  min="1"
                />
                {errors.maxAttendees && <span className="error-text">{errors.maxAttendees}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="tags" className="form-label">Tags</label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter tags separated by commas (e.g., tech, networking, business)"
              />
              <small className="form-hint">Separate multiple tags with commas</small>
            </div>
          </div>

          {/* Contact Information */}
          <div className="form-section">
            <h3 className="section-title">
              <i className="fas fa-address-book"></i>
              Contact Information
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contactEmail" className="form-label">Contact Email</label>
                <input
                  type="email"
                  id="contactEmail"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  className={`form-input ${errors.contactEmail ? 'error' : ''}`}
                  placeholder="contact@example.com"
                />
                {errors.contactEmail && <span className="error-text">{errors.contactEmail}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="contactPhone" className="form-label">Contact Phone</label>
                <input
                  type="tel"
                  id="contactPhone"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleInputChange}
                  className={`form-input ${errors.contactPhone ? 'error' : ''}`}
                  placeholder="+1 (555) 123-4567"
                />
                {errors.contactPhone && <span className="error-text">{errors.contactPhone}</span>}
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="form-section">
            <h3 className="section-title">
              <i className="fas fa-cog"></i>
              Settings
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="status" className="form-label">Status</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="registrationRequired"
                    name="registrationRequired"
                    checked={formData.registrationRequired}
                    onChange={handleInputChange}
                    className="form-checkbox"
                  />
                  <label htmlFor="registrationRequired" className="checkbox-label">
                    Registration Required
                  </label>
                </div>
              </div>
            </div>

            {/* Public link setting */}
            <div className="form-row">
              <div className="form-group">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="enablePublicLink"
                    name="enablePublicLink"
                    checked={hasPublicLink}
                    onChange={(e) => togglePublicLink(e.target.checked)}
                    className="form-checkbox"
                  />
                  <label htmlFor="enablePublicLink" className="checkbox-label">
                    Enable Public Registration Link
                  </label>
                </div>
                {!hasPublicLink && (
                  <small className="form-hint">Check to generate a public registration URL.</small>
                )}
                {hasPublicLink && (
                  <div style={{
                    marginTop: 10,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: 12
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 8, color: '#0f172a' }}>Public Registration Link</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        readOnly
                        value={publicLink}
                        style={{ flex: 1, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                        onFocus={(e) => e.target.select()}
                      />
                      <button
                        type="button"
                        className="submit-btn"
                        onClick={async () => { try { await navigator.clipboard.writeText(publicLink); } catch {} }}
                      >
                        <i className="fas fa-copy"></i>
                        Copy
                      </button>
                      <a
                        href={publicLink}
                        target="_blank"
                        rel="noreferrer"
                        className="cancel-btn"
                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <i className="fas fa-external-link-alt"></i>
                        Open
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="cancel-btn"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="submit-btn"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="loading-spinner-small"></div>
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditEvent;
