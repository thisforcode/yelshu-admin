import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from './TenantContext';
import { createEventService } from './services/EventService';
import './CreateEvent.css';

const CreateEvent = () => {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [generatedPublicUrl, setGeneratedPublicUrl] = useState('');

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
    generatePublicUrl: false,
    contactEmail: '',
    contactPhone: '',
    eventType: 'conference',
    tags: ''
  });

  const [errors, setErrors] = useState({});

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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Event name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Event description is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    // Date validation
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        newErrors.endDate = 'End date cannot be before start date';
      }
    }

    // Registration window validation (optional but must be consistent if provided)
    if (formData.registrationStart && formData.registrationEnd) {
      const rStart = new Date(formData.registrationStart);
      const rEnd = new Date(formData.registrationEnd);
      if (rEnd < rStart) {
        newErrors.registrationEnd = 'Registration end cannot be before registration start';
      }
    }

    // Optional: registration window should not end before event starts if both provided
    if (formData.registrationEnd && formData.startDate) {
      const rEnd = new Date(formData.registrationEnd);
      const eStart = new Date(formData.startDate);
      if (rEnd > eStart) {
        // Allow but warn? For now, no hard error.
      }
    }

    // Email validation
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }

    // Phone validation (basic)
    if (formData.contactPhone && !/^[+]?[1-9][\d]{0,15}$/.test(formData.contactPhone.replace(/[\s\-()]/g, ''))) {
      newErrors.contactPhone = 'Please enter a valid phone number';
    }

    // Max attendees validation
    if (formData.maxAttendees && (isNaN(formData.maxAttendees) || parseInt(formData.maxAttendees) < 1)) {
      newErrors.maxAttendees = 'Max attendees must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const eventService = createEventService(tenantId);
      
      // Prepare event data
      const eventData = {
        ...formData,
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        startDate: formData.startDate ? new Date(formData.startDate) : null,
        endDate: formData.endDate ? new Date(formData.endDate) : null,
        registrationStart: formData.registrationStart ? new Date(formData.registrationStart) : null,
        registrationEnd: formData.registrationEnd ? new Date(formData.registrationEnd) : null
      };
      // Do not persist the UI-only flag
      delete eventData.generatePublicUrl;

      // Conditionally generate a public registration token
      if (formData.generatePublicUrl) {
        const genToken = () => {
          // Create a reasonably random 20-char token
          const part = () => Math.random().toString(36).slice(2, 12);
          return (part() + part()).slice(0, 20);
        };
        eventData.publicRegistrationId = genToken();
      }
      const created = await eventService.createEvent(eventData);
      // Optionally copy the public link to clipboard if generated
      if (formData.generatePublicUrl && created?.id && eventData.publicRegistrationId) {
        try {
          const origin = window.location.origin;
          const publicUrl = `${origin}/r/${tenantId}/${created.id}/${eventData.publicRegistrationId}`;
          setGeneratedPublicUrl(publicUrl);
          await navigator.clipboard.writeText(publicUrl);
        } catch (clipErr) {
          // Non-fatal if clipboard is not available
          console.warn('Could not copy public URL to clipboard:', clipErr);
        }
      }
      setSuccess(true);
      
      // Redirect after success animation
      const redirectDelay = formData.generatePublicUrl ? 5000 : 2000;
      setTimeout(() => {
        navigate('/events');
      }, redirectDelay);

    } catch (err) {
      setError('Failed to create event. Please try again.');
      console.error('Error creating event:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/events');
  };

  if (success) {
    return (
      <div className="create-event-container">
        <div className="success-message">
          <div className="success-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <h2>Event Created Successfully!</h2>
          <p>Your event has been created and is now available.</p>
          {generatedPublicUrl && (
            <div style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 16,
              marginTop: 12,
              textAlign: 'left'
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#0f172a' }}>Public Registration Link</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                Copied to clipboard. You can share this link with attendees.
              </div>
              <div style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center'
              }}>
                <input
                  type="text"
                  readOnly
                  value={generatedPublicUrl}
                  style={{ flex: 1, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  className="submit-btn"
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(generatedPublicUrl); } catch {}
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </button>
                <a
                  href={generatedPublicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="cancel-btn"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Open
                </a>
              </div>
            </div>
          )}
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
            <i className="fas fa-plus-circle"></i>
            Create New Event
          </h1>
          <p className="create-event-subtitle">Fill in the details to create your event</p>
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

            <div className="form-row">
              <div className="form-group">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="generatePublicUrl"
                    name="generatePublicUrl"
                    checked={formData.generatePublicUrl}
                    onChange={handleInputChange}
                    className="form-checkbox"
                  />
                  <label htmlFor="generatePublicUrl" className="checkbox-label">
                    Generate Public Registration Link
                  </label>
                </div>
                <small className="form-hint">If checked, a public registration URL will be created for this event.</small>
                {formData.generatePublicUrl && (
                  <div style={{
                    marginTop: 10,
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: 10,
                    color: '#334155',
                    fontSize: 13
                  }}>
                    <i className="fas fa-link" style={{ marginRight: 8, color: '#1d4ed8' }}></i>
                    The link will be generated after you create the event and will appear on the success screen.
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
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="loading-spinner-small"></div>
                Creating...
              </>
            ) : (
              <>
                <i className="fas fa-plus"></i>
                Create Event
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEvent;