import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { createTenantDataService } from './services/TenantDataService';
// emailService no longer needed for simple registration
import './CreateEvent.css'; // reuse some form styles
import logoImg from './assets/logo.jpeg';

export default function PublicRegister() {
  const { tenantId, eventId, token } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [regBeforeStart, setRegBeforeStart] = useState(false);
  const [regAfterEnd, setRegAfterEnd] = useState(false);
  const [regStartAt, setRegStartAt] = useState(null);
  const [regEndAt, setRegEndAt] = useState(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [closeCountdown, setCloseCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  // Form state
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    mobile: '',
    verificationCode: ''
  });
  
  // Verification state
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const eventRef = doc(db, `tenants/${tenantId}/events`, eventId);
        const snap = await getDoc(eventRef);
        if (!snap.exists()) {
          setError('Event not found');
          setLoading(false);
          return;
        }
        const data = { id: snap.id, ...snap.data() };
        if (!data.publicRegistrationId || data.publicRegistrationId !== token) {
          setError('Invalid or expired registration link');
          setLoading(false);
          return;
        }
        setEvent(data);

        // Compute registration window state
        const now = new Date();
        const regStart = data.registrationStart ? new Date(data.registrationStart.seconds ? data.registrationStart.seconds * 1000 : data.registrationStart) : null;
        const regEnd = data.registrationEnd ? new Date(data.registrationEnd.seconds ? data.registrationEnd.seconds * 1000 : data.registrationEnd) : null;
        setRegEndAt(regEnd);
        // Store start also for inline display when open
        setRegStartAt(regStart);

        if (regStart && now < regStart) {
          setRegistrationOpen(false);
          setRegBeforeStart(true);
          setRegAfterEnd(false);
          setRegStartAt(regStart);
          setRegistrationMessage(`Registration opens on ${regStart.toLocaleString()}`);
        } else if (regEnd && now > regEnd) {
          setRegistrationOpen(false);
          setRegBeforeStart(false);
          setRegAfterEnd(true);
          setRegStartAt(null);
          setRegistrationMessage('Registration has ended. Sorry, you can no longer register for this event.');
        } else {
          setRegistrationOpen(true);
          setRegBeforeStart(false);
          setRegAfterEnd(false);
          setRegStartAt(null);
          setRegistrationMessage('');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    if (tenantId && eventId && token) fetchEvent();
  }, [tenantId, eventId, token]);

  // Live countdown for registration start
  useEffect(() => {
    if (!regBeforeStart || !regStartAt) return;
    const tick = () => {
      const now = new Date();
      let diff = Math.max(0, regStartAt.getTime() - now.getTime());
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      diff -= days * 24 * 60 * 60 * 1000;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      diff -= hours * 60 * 60 * 1000;
      const minutes = Math.floor(diff / (1000 * 60));
      diff -= minutes * 60 * 1000;
      const seconds = Math.floor(diff / 1000);
      setCountdown({ days, hours, minutes, seconds });
      if (regStartAt.getTime() <= now.getTime()) {
        // Auto-open when countdown finishes
        setRegistrationOpen(true);
        setRegBeforeStart(false);
        setRegistrationMessage('');
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [regBeforeStart, regStartAt]);

  // Live countdown for registration close when open
  useEffect(() => {
    if (!registrationOpen || !regEndAt) return;
    const tick = () => {
      const now = new Date();
      let diff = Math.max(0, regEndAt.getTime() - now.getTime());
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      diff -= days * 24 * 60 * 60 * 1000;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      diff -= hours * 60 * 60 * 1000;
      const minutes = Math.floor(diff / (1000 * 60));
      diff -= minutes * 60 * 1000;
      const seconds = Math.floor(diff / 1000);
      setCloseCountdown({ days, hours, minutes, seconds });
      if (regEndAt.getTime() <= now.getTime()) {
        setRegistrationOpen(false);
        setRegAfterEnd(true);
        setRegBeforeStart(false);
        setRegistrationMessage('Registration has ended. Sorry, you can no longer register for this event.');
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [registrationOpen, regEndAt]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError(''); // Clear error when user types
  };

  const validateForm = () => {
    if (!form.name.trim()) return 'Name is required';
    if (!form.email.trim()) return 'Email is required';
    if (!form.mobile.trim()) return 'Mobile number is required';
    
    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return 'Enter a valid email address';
    }
    
    // Mobile validation - allow various formats but ensure it has digits
    const mobileDigits = form.mobile.replace(/[^0-9]/g, '');
    if (mobileDigits.length < 7 || mobileDigits.length > 15) {
      return 'Enter a valid mobile number (7-15 digits)';
    }
    
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setRegistering(true);

    try {
      const tenantService = createTenantDataService(tenantId);
      
      // Duplicate checks
      const emailExists = await tenantService.checkEmailExists(form.email, eventId);
      if (emailExists) {
        setError('This email address has already been registered');
        setRegistering(false);
        return;
      }

      const phoneExists = await tenantService.checkPhoneExists(form.mobile, eventId);
      if (phoneExists) {
        setError('This mobile number has already been registered');
        setRegistering(false);
        return;
      }

      // Create user
      const userData = {
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        status: 1,
        eventId: eventId,
        'event-id': eventId,
        createdFromPublicLink: true,
        registrationDate: new Date().toISOString()
      };
      
      await tenantService.createUser(userData);
      setSuccess(true);
    } catch (err) {
      console.error('Error registering user:', err);
      setError('Registration failed. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  // No resend code function needed in simple registration

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 16 }}>Loading event details...</div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="public-hero">
        <div className="animated-bg">
          <div className="orb o1"></div>
          <div className="orb o2"></div>
          <div className="orb o3"></div>
          <div className="glow g1"></div>
          <div className="glow g2"></div>
        </div>
        <div className="hero-content">
            <div className="material-card">
            <div className="material-card-header">
              <img src={logoImg} alt="Logo" className="material-logo" />
              <div className="material-chip warning"><i className="fas fa-link-slash"></i> Invalid Link</div>
              <h1 className="material-title">Event Not Found</h1>
              <p className="material-subtitle">{error}</p>
            </div>
            <div className="material-actions">
              <Link to="/" className="material-btn primary">
                <i className="fas fa-home"></i> Go Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="create-event-container">
        <div className="success-message">
          <img src={logoImg} alt="Logo" className="material-logo" />
          <div className="success-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <h2>Registration Successful!</h2>
          <p>Thank you for registering for <strong>{event?.name}</strong>.</p>
          <p>Your registration is recorded. See you at the event!</p>
          <div className="success-animation">
            <div className="pulse-circle"></div>
            <div className="pulse-circle delay-1"></div>
            <div className="pulse-circle delay-2"></div>
          </div>
        </div>
      </div>
    );
  }

  // Fancy pre-registration UI when not yet started
  if (!registrationOpen && regBeforeStart) {
    const pad = (n) => String(n).padStart(2, '0');
    return (
      <div className="public-hero">
        <div className="animated-bg">
          <div className="orb o1"></div>
          <div className="orb o2"></div>
          <div className="orb o3"></div>
          <div className="glow g1"></div>
          <div className="glow g2"></div>
        </div>
        <div className="hero-content">
            <div className="material-card">
            <div className="material-card-header">
              <img src={logoImg} alt="Logo" className="material-logo" />
              <div className="material-chip info"><i className="fas fa-calendar-star"></i> {event?.name || 'Upcoming Event'}</div>
              <h1 className="material-title">Registration Opens In</h1>
              {(regStartAt || regEndAt) && (
                <div className="material-inline-meta">
                  {regStartAt && (<><i className="fas fa-play"></i><span>Start: {regStartAt.toLocaleString()}</span></>)}
                  <span className="dot"></span>
                  {regEndAt && (<><i className="fas fa-flag-checkered"></i><span>End: {regEndAt.toLocaleString()}</span></>)}
                </div>
              )}
            </div>
            <div className="material-timer">
              <div className="material-timebox"><span className="num">{pad(countdown.days)}</span><span className="lbl">Days</span></div>
              <div className="material-sep">:</div>
              <div className="material-timebox"><span className="num">{pad(countdown.hours)}</span><span className="lbl">Hours</span></div>
              <div className="material-sep">:</div>
              <div className="material-timebox"><span className="num">{pad(countdown.minutes)}</span><span className="lbl">Minutes</span></div>
              <div className="material-sep">:</div>
              <div className="material-timebox"><span className="num">{pad(countdown.seconds)}</span><span className="lbl">Seconds</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Nice end-of-registration UI
  if (!registrationOpen && regAfterEnd) {
    return (
      <div className="public-hero">
        <div className="animated-bg">
          <div className="orb o1"></div>
          <div className="orb o2"></div>
          <div className="orb o3"></div>
          <div className="glow g1"></div>
          <div className="glow g2"></div>
        </div>
        <div className="hero-content">
            <div className="material-card">
            <div className="material-card-header">
              <img src={logoImg} alt="Logo" className="material-logo" />
              <div className="material-chip"><i className="fas fa-calendar-xmark"></i> {event?.name || 'Event'}</div>
              <h1 className="material-title">Registration Closed</h1>
              {(regStartAt || regEndAt) && (
                <div className="material-inline-meta">
                  {regStartAt && (<><i className="fas fa-play"></i><span>Start: {regStartAt.toLocaleString()}</span></>)}
                  <span className="dot"></span>
                  {regEndAt && (<><i className="fas fa-flag-checkered"></i><span>End: {regEndAt.toLocaleString()}</span></>)}
                </div>
              )}
              <p className="material-subtitle" style={{ marginTop: 6 }}>{registrationMessage}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-hero">
      <div className="animated-bg">
        <div className="orb o1"></div>
        <div className="orb o2"></div>
        <div className="orb o3"></div>
        <div className="glow g1"></div>
        <div className="glow g2"></div>
        <div className="particles">
          <span></span><span></span><span></span><span></span><span></span>
          <span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>
      <div className="hero-content">
        <div className="material-card">
          <div className="material-card-header">
            <img src={logoImg} alt="Logo" className="material-logo" />
            <div className="material-chip"><i className="fas fa-calendar-plus"></i> {event?.name || 'Event Registration'}</div>
            <h1 className="material-title">Register for {event?.name}</h1>
            {(regStartAt || regEndAt) && (
              <div className="material-inline-meta">
                {regStartAt && (<><i className="fas fa-play"></i><span>Start: {regStartAt.toLocaleString()}</span></>)}
                <span className="dot"></span>
                {regEndAt && (<><i className="fas fa-flag-checkered"></i><span>End: {regEndAt.toLocaleString()}</span></>)}
              </div>
            )}
            <p className="material-subtitle" style={{ marginTop: 6 }}>{registrationMessage || 'Fill in your details to register for this event.'}</p>
            {regEndAt && registrationOpen && (
              <>
                <p className="material-subtitle" style={{ marginTop: 8, marginBottom: 0, color: '#0f172a', fontWeight: 600 }}>Registration closes in</p>
                {(() => {
                  const pad = (n) => String(n).padStart(2, '0');
                  return (
                    <div className="material-timer" style={{ paddingTop: 14 }}>
                      <div className="material-timebox"><span className="num">{pad(closeCountdown.days)}</span><span className="lbl">Days</span></div>
                      <div className="material-sep">:</div>
                      <div className="material-timebox"><span className="num">{pad(closeCountdown.hours)}</span><span className="lbl">Hours</span></div>
                      <div className="material-sep">:</div>
                      <div className="material-timebox"><span className="num">{pad(closeCountdown.minutes)}</span><span className="lbl">Minutes</span></div>
                      <div className="material-sep">:</div>
                      <div className="material-timebox"><span className="num">{pad(closeCountdown.seconds)}</span><span className="lbl">Seconds</span></div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          <form onSubmit={handleSubmit} className="material-form">
            <div className="form-group">
              <label className="form-label">Full Name <span className="required">*</span></label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your full name"
                disabled={registering || !registrationOpen}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address <span className="required">*</span></label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your email address"
                disabled={registering || !registrationOpen}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number <span className="required">*</span></label>
              <input
                type="tel"
                name="mobile"
                value={form.mobile}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your mobile number"
                disabled={registering || !registrationOpen}
              />
            </div>

            {error && (
              <div className="error-message" style={{ marginBottom: 16 }}>
                <i className="fas fa-exclamation-triangle"></i>
                {error}
              </div>
            )}

            <div className="material-actions">
              <button type="submit" className="material-btn primary" disabled={registering || !registrationOpen}>
                {registering ? (
                  <>
                    <div className="loading-spinner-small"></div>
                    Registering...
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-check"></i>
                    {registrationOpen ? 'Register' : 'Registration Closed'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
