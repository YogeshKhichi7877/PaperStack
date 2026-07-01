import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import { Helmet } from 'react-helmet-async';
import logo from './assets/Paperstack_logo_wt2.png';
import authLogo from './assets/Paperstack_auth_owl.png';
import authWordmark from './assets/Paperstack_auth_wordmark.png';

import paperstackWordmark from './assets/Paperstack_auth_wordmark.png';
import paperstackOwl from './assets/Paperstack_auth_owl.png';
import iiitSuratLogo from './assets/iiit_surat.png';
import PWAInstallPrompt from './components/PWAInstallPrompt';

import './App.css';

const API_URL = process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';
const CONTRIBUTION_EMAIL = process.env.REACT_APP_CONTRIBUTION_EMAIL || 'paperstack@example.com';
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

function isValidGoogleClientId(id) {
  return Boolean(
    id &&
    id === id.trim() &&
    id.includes('.apps.googleusercontent.com') &&
    !/["'\s]/.test(id)
  );
}

const GOOGLE_AUTH_CONFIGURED = isValidGoogleClientId(GOOGLE_CLIENT_ID);

function getPaperShareUrl(paper) {
  const baseUrl = FRONTEND_URL.replace(/\/$/, '');
  return paper?._id ? `${baseUrl}/paper/${encodeURIComponent(paper._id)}` : baseUrl;
}

function getPaperShareText(paper) {
  const subject = paper?.subject || 'IIIT Surat paper';
  const examType = paper?.examType || 'Exam';
  const year = paper?.year || '';
  return `Check this IIIT Surat paper on PaperStack: ${subject} (${examType}${year ? ` - ${year}` : ''}) ${getPaperShareUrl(paper)}`;
}

function authHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function adminHeader() {
  const token = localStorage.getItem('adminToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function ToastStack({ toasts, dismissToast }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span>{toast.message}</span>
          <button type="button" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">x</button>
        </div>
      ))}
    </div>
  );
}

function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <button
      type="button"
      className={`back-to-top-btn ${visible ? 'show' : ''}`}
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
    >
      ↑
    </button>
  );
}

function PaperStackLoader({ label = 'Loading PaperStack...', compact = false }) {
  if (compact) {
    return (
      <span className="ps-loader-wrap ps-loader-compact" role="status" aria-live="polite">
        <span className="ps-loader-mark">
          <img src={logo} alt="" aria-hidden="true" />
          <span />
          <span />
          <span />
        </span>
        <span>{label}</span>
      </span>
    );
  }

  return (
    <div className="ps-loader-wrap" role="status" aria-live="polite">
      <div className="ps-loader-mark">
        <img src={logo} alt="" aria-hidden="true" />
        <span />
        <span />
        <span />
      </div>
      <p>{label}</p>
    </div>
  );
}

function storeAuthSession(authPayload, setUser) {
  const user = authPayload.user || authPayload;
  localStorage.setItem('token', authPayload.token);
  localStorage.setItem('username', user.username);
  const semester = user.semester || user.currentSemester;
  if (semester) localStorage.setItem('userSemester', semester);
  setUser({
    username: user.username,
    email: user.email,
    bookmarks: user.bookmarks || [],
    semester,
    avatar: user.avatar || '',
    authProvider: user.authProvider || 'local',
  });
}

function GoogleAuthButton({ setUser, toast }) {
  const [loading, setLoading] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (isDev && GOOGLE_CLIENT_ID && !GOOGLE_AUTH_CONFIGURED) {
      console.warn(
        'Google login disabled: REACT_APP_GOOGLE_CLIENT_ID must be a valid Web OAuth client ID ending with .apps.googleusercontent.com, with no quotes or whitespace.'
      );
    }
  }, [isDev]);

  const openGoogleFallback = (message = 'Google login is currently unavailable. Please use manual login.') => {
    setShowFallback(true);
    toast(message, 'info');
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      openGoogleFallback('Google did not return a valid login credential. Please use manual login for now.');
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/api/auth/google`, {
        credential: credentialResponse.credential,
      });

      storeAuthSession(res.data, setUser);
      toast('Google login successful.', 'success');

      const queryParams = new URLSearchParams(location.search);
      const redirectTo = queryParams.get('redirect') || '/';
      navigate(redirectTo);
    } catch (err) {
      const status = err.response?.status;
      const serverMessage = err.response?.data?.message || err.response?.data?.error;

      if (status === 403) {
        toast(serverMessage || 'Please create a manual account first, then use Google login.', 'error');
      } else if (status === 401) {
        openGoogleFallback('Google login is currently unavailable. Please use manual login.');
      } else {
        openGoogleFallback(serverMessage || 'Google login is currently unavailable. Please use manual login.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fallbackModal = showFallback && (
    <div className="auth-fallback-overlay" role="presentation" onClick={() => setShowFallback(false)}>
      <div
        className="auth-fallback-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-fallback-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="auth-fallback-close"
          onClick={() => setShowFallback(false)}
          aria-label="Close Google login message"
        >
          x
        </button>

        <div className="auth-fallback-icon">G</div>
        <h3 id="google-fallback-title">Google login is temporarily unavailable</h3>
        <p>Please use manual login while Google authentication is unavailable.</p>

        <button type="button" className="login-btn-gradient" onClick={() => setShowFallback(false)}>
          Use Manual Login
        </button>
      </div>
    </div>
  );

  if (!GOOGLE_AUTH_CONFIGURED) {
    return (
      <>
        <div className="google-auth-wrap">
          <button
            type="button"
            className="google-fallback-btn auth-google-fallback"
            onClick={() => openGoogleFallback()}
          >
            <span className="google-g">G</span>
            Continue with Google
          </button>
          <p className="google-soon-note">Google sign-in is temporarily unavailable.</p>
        </div>
        {fallbackModal}
      </>
    );
  }

  return (
    <>
      <div className={`google-auth-wrap ${loading ? 'is-loading' : ''}`}>
        <div className="google-login-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => openGoogleFallback('Google login is currently unavailable. Please use manual login.')}
            text="continue_with"
            size="large"
            theme="outline"
            width="360"
          />
        </div>

        {loading && <div className="google-loading">Signing in...</div>}
      </div>

      {fallbackModal}
    </>
  );
}

function AuthDivider() {
  return (
    <div className="auth-divider auth-or-divider">
      <span />
      <em>or</em>
      <span />
    </div>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo-wrapper">
              <img src={logo} alt="PaperStack logo" className="footer-logo-img" />
              <h3 className="footer-logo">PaperStack</h3>
            </div>
            <p className="footer-description">
              A premium, community-driven academic archive platform built for IIIT Surat students.
            </p>
          </div>
          <div className="footer-links">
            <h4 className="footer-heading">Explore</h4>
            <ul className="footer-list">
              <li><Link to="/">Archive</Link></li>
              <li><Link to="/exam-mode">Exam Mode</Link></li>
              <li><Link to="/missing-papers">Missing Papers</Link></li>
              <li><Link to="/contributors">Contributors</Link></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4 className="footer-heading">Support</h4>
            <ul className="footer-list">
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contribute">Contribute</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4 className="footer-heading">Policy</h4>
            <ul className="footer-list">
              <li><Link to="/privacy-policy">Privacy</Link></li>
              <li><Link to="/terms">Terms</Link></li>
              <li><Link to="/disclaimer">Disclaimer</Link></li>
              <li><Link to="/copyright">Copyright</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} PaperStack. Built by students, for students.</p>
          <div className="footer-status"><span className="status-dot" /> System Online Version 2.0</div>
        </div>
      </div>
    </footer>
  );
}

function Navbar({ user, setUser, theme, toggleTheme, isAdmin, setIsAdmin, toast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Archive' },
    { to: '/exam-mode', label: 'Exam Mode' },
    { to: '/missing-papers', label: 'Missing Papers' },
    { to: '/contributors', label: 'Leaderboard' },
    { to: '/analytics', label: 'Analytics' },
    { to: '/contribute', label: 'Contribute', featured: true }
  ];

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const closeMenu = () => setMenuOpen(false);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userSemester');
    setUser(null);
    toast('Logged out successfully', 'info');
    closeMenu();
    navigate('/');
  };

  const exitAdmin = () => {
    localStorage.removeItem('adminToken');
    setIsAdmin(false);
    toast('Exited admin mode', 'info');
    closeMenu();
    navigate('/');
  };

  const navLinks = (
    <>
      {navItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={closeMenu}
          className={`nav-text-link ${item.featured ? 'btn-navbar-contrib' : ''} ${
            isActive(item.to) ? 'active' : ''
          }`}
        >
          {item.label}
        </Link>
      ))}
    </>
  );

  const navActions = (
    <>
      <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'light' ? 'Dark' : 'Light'}
      </button>

      {!isAdmin && (
        <Link to="/admin" onClick={closeMenu} className="nav-admin-btn">
          ADMIN
        </Link>
      )}

      {isAdmin && (
        <div className="ps-admin-actions">
          <Link to="/admin/upload" onClick={closeMenu} className="nav-admin-link">
            Upload
          </Link>

          <Link to="/admin/contributions" onClick={closeMenu} className="nav-admin-link">
            Review Panel
          </Link>

          <Link to="/admin/reports" onClick={closeMenu} className="nav-admin-link">
            Reports
          </Link>

          <button className="btn-exit-admin" onClick={exitAdmin}>
            Exit Admin
          </button>
        </div>
      )}

      {user ? (
        <>
          <span className="user-greeting">{user.username}</span>
          <button className="btn-logout" onClick={logout}>
            Logout
          </button>
        </>
      ) : (
        <Link to="/login" onClick={closeMenu} className="btn-login">
          Login
        </Link>
      )}
    </>
  );

  return (
    <nav className="navbar ps-navbar-repaired">
      <div className="nav-spacer" aria-hidden="true" />

      <div className="nav-center-links">{navLinks}</div>

      <div className="nav-right-actions">{navActions}</div>

      <button
        type="button"
        className={`mobile-menu-toggle ${menuOpen ? 'is-open' : ''}`}
        onClick={() => setMenuOpen((open) => !open)}
        aria-label="Toggle navigation menu"
        aria-expanded={menuOpen}
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`mobile-nav-panel ${menuOpen ? 'is-open' : ''}`}>
        {navLinks}
        <div className="mobile-nav-divider" />
        {navActions}
      </div>
    </nav>
  );
}

function Register({ setUser, toast }) {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', semester: 1 });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.email.toLowerCase().endsWith('@iiitsurat.ac.in')) {
      toast('Please use your @iiitsurat.ac.in email', 'error');
      return;
    }
    if (formData.password.length < 6) {
      toast('Password must be at least 6 characters.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, formData);
      storeAuthSession(res.data, setUser);
      toast('Registration successful.', 'success');
      const queryParams = new URLSearchParams(location.search);
      const redirectTo = queryParams.get('redirect') || '/';
      navigate(redirectTo);
    } catch (err) {
      toast(err.response?.data?.message || err.response?.data?.error || 'Registration failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page auth-page-register">
      <Helmet>
        <title>Register - PaperStack</title>
        <meta name="description" content="Create a PaperStack student account for saved papers and discussions." />
      </Helmet>

      <div className="auth-shell">
        <section className="auth-brand-panel" aria-label="PaperStack signup">
          <span className="auth-floating-paper auth-paper-one" />
          <span className="auth-floating-paper auth-paper-two" />
          <img src={authLogo} alt="" aria-hidden="true" className="auth-owl-watermark" />
          <div className="auth-brand-content">
            <Link to="/" className="auth-brand-logo auth-logo-row">
              <img src={authLogo} alt="PaperStack owl" className="auth-owl-logo" />
              <img src={authWordmark} alt="PaperStack" className="auth-wordmark" />
            </Link>
            <p className="auth-kicker auth-pill">Join PaperStack</p>
            <h1 className="auth-brand-title">Join the PaperStack Community</h1>
            <p className="auth-brand-copy">Create your account manually using your IIIT Surat email.</p>
            <div className="auth-benefit-grid">
              <span className="auth-benefit-pill">Save Papers</span>
              <span className="auth-benefit-pill">Earn Contributor Points</span>
              <span className="auth-benefit-pill">Help Juniors</span>
            </div>
            <div className="auth-mini-proof">
              <span>Secure student access</span>
              <span>Built by students, for students</span>
            </div>
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-card auth-form-card">
            <div className="auth-card-header">
              <div className="auth-card-logo-row">
                <img src={authLogo} alt="PaperStack" className="auth-card-logo" />
                <img src={authWordmark} alt="PaperStack" className="auth-card-wordmark" />
                <img src="/iiit_surat.png" alt="IIIT Surat Logo" className="inst-logo" />
              </div>
              <h2>Create Account</h2>
              <p>Create your account manually using your IIIT Surat email.</p>
            </div>

            <form onSubmit={handleRegister} className="login-form-content auth-form">
              <input className="auth-input" type="text" placeholder="Username" onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
              <input className="auth-input" type="email" placeholder="Institute email" onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              <input className="auth-input" type="password" placeholder="Password" onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
              <div className="sem-select-container">
                <label>Current Semester</label>
                <select className="auth-input" value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => <option key={sem} value={sem}>Semester {sem}</option>)}
                </select>
              </div>
              <button type="submit" className="login-btn-gradient auth-submit" disabled={submitting}>
                {submitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <p className="auth-switch-text auth-switch-link auth-switch">Already have an account? <Link to={`/login${location.search}`}>Login here</Link></p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Login({ setUser, toast }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.email.toLowerCase().endsWith('@iiitsurat.ac.in')) {
      toast('Please use your @iiitsurat.ac.in email', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, formData);
      storeAuthSession(res.data, setUser);
      const returnedUser = res.data.user || res.data;
      toast(`Welcome back, ${returnedUser.username}!`, 'success');
      
      const queryParams = new URLSearchParams(location.search);
      const redirectTo = queryParams.get('redirect') || '/';
      navigate(redirectTo);
    } catch (err) {
      toast(err.response?.data?.message || err.response?.data?.error || 'Invalid credentials', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page auth-page-login">
      <Helmet>
        <title>Login - PaperStack</title>
        <meta name="description" content="Login to PaperStack to save papers and join discussions." />
      </Helmet>

      <div className="auth-shell">
        <section className="auth-brand-panel" aria-label="PaperStack login">
          <span className="auth-floating-paper auth-paper-one" />
          <span className="auth-floating-paper auth-paper-two" />
          <img src={authLogo} alt="" aria-hidden="true" className="auth-owl-watermark" />
          <div className="auth-brand-content">
            <Link to="/" className="auth-brand-logo auth-logo-row">
              <img src={authLogo} alt="PaperStack owl" className="auth-owl-logo" />
              <img src={authWordmark} alt="PaperStack" className="auth-wordmark" />
            </Link>
            <p className="auth-kicker auth-pill">IIIT Surat Archive</p>
            <h1 className="auth-brand-title">Your Smart Academic Archive</h1>
            <p className="auth-brand-copy">Access IIIT Surat papers, save resources, and contribute to the student archive.</p>
            <div className="auth-benefit-grid">
              <span className="auth-benefit-pill">Verified Papers</span>
              <span className="auth-benefit-pill">Fast Access</span>
              <span className="auth-benefit-pill">Student Powered</span>
            </div>
            <div className="auth-mini-proof">
              <span>Secure student access</span>
              <span>Built by students, for students</span>
            </div>
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-card auth-form-card">
            <div className="auth-card-header">
              <div className="auth-card-logo-row">
                <img src={authLogo} alt="PaperStack" className="auth-card-logo" />
                <img src={authWordmark} alt="PaperStack" className="auth-card-wordmark" />
                <img src="/iiit_surat.png" alt="IIIT Surat Logo" className="inst-logo" />
              </div>
              <h2>Welcome Back</h2>
              <p>Login to continue to PaperStack</p>
            </div>

            <form onSubmit={handleLogin} className="login-form-content auth-form">
              <input className="auth-input" type="email" placeholder="Institute Email ID" onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              <input className="auth-input" type="password" placeholder="Password" onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
              <button type="submit" className="auth-btn login-btn-gradient auth-submit" disabled={submitting}>
                {submitting ? 'Signing In...' : 'Secure Login'}
              </button>
            </form>

            <AuthDivider />
            <GoogleAuthButton setUser={setUser} toast={toast} />

            <p className="auth-switch-text auth-switch-link auth-switch">New here? <Link to={`/register${location.search}`}>Create account</Link></p>
          </div>
        </section>
      </div>
    </div>
  );
}

function AdminLogin({ setIsAdmin, toast }) {
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/admin/verify`, { password });
      localStorage.setItem('adminToken', res.data.token);
      setIsAdmin(true);
      toast('Admin verified successfully', 'success');
      navigate('/');
    } catch (err) {
      toast(err.response?.data?.error || 'Wrong admin password', 'error');
    }
  };

  return (
    <div className="auth-container">
      <Helmet>
        <title>Admin Login - PaperStack</title>
        <meta name="description" content="PaperStack admin access page." />
      </Helmet>
      <div className="auth-card">
        <h2>Admin Access</h2>
        <form onSubmit={handleAdminLogin}>
          <input type="password" placeholder="Admin Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="auth-btn" type="submit">Unlock Admin Hub</button>
        </form>
      </div>
    </div>
  );
}

function ReportModal({ paper, onClose, toast, user, navigate }) {
  const [reason, setReason] = useState('Wrong subject');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast('Please login to report incorrect papers', 'info');
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/papers/${paper._id}/report`, { reason, message }, { headers: authHeader() });
      toast('Thanks, report submitted.', 'success');
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to submit report', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content report-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal-btn" onClick={onClose} aria-label="Close report form">x</button>
        <h3>Report Paper Issue</h3>
        <p className="report-subtitle">Report incorrect details or broken PDFs for: <strong>{paper.title}</strong></p>
        
        <form onSubmit={handleSubmit} className="report-form">
          <label>Reason for Report</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option>Wrong subject</option>
            <option>Wrong semester</option>
            <option>Wrong year</option>
            <option>Wrong exam type</option>
            <option>PDF not opening</option>
            <option>Duplicate paper</option>
            <option>Solution missing</option>
            <option>Other</option>
          </select>

          <label>Details / Message</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Please explain the issue..." rows={4} required />

          <div className="report-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaperModal({ paper, user, onClose, toast, navigate }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [iframeLoading, setIframeLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/papers/${paper._id}/comments`);
      setComments(res.data);
    } catch (err) {
      console.error('Could not fetch comments', err);
    }
  }, [paper._id]);

  useEffect(() => {
    fetchComments();
    setIframeLoading(true);
  }, [fetchComments]);

  const postComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user) {
      toast('Please login to ask a doubt', 'info');
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    try {
      await axios.post(`${API_URL}/api/papers/${paper._id}/comments`, { text: newComment }, { headers: authHeader() });
      setNewComment('');
      fetchComments();
    } catch (err) {
      toast('Failed to post comment', 'error');
    }
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    if (!user) {
      toast('Please login with your IIIT Surat account to continue.', 'info');
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    window.open(paper.filePath, '_blank');
  };

  const handleShareWhatsApp = (e) => {
    e.stopPropagation();
    window.open(`https://wa.me/?text=${encodeURIComponent(getPaperShareText(paper))}`, '_blank');
  };

  const handleCopyLink = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(getPaperShareUrl(paper))
      .then(() => toast('PaperStack share link copied!', 'success'))
      .catch(() => toast('Failed to copy link', 'error'));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal-btn" onClick={onClose} aria-label="Close paper viewer">x</button>
        <div className="modal-split">
          <div className="modal-left">
            <div className="modal-header-info">
              <h3>{paper.subject}</h3>
              <span className="badge-pill">{paper.examType} - {paper.year}</span>
              {paper.contributedByName && (
                <span className="contributor-name-badge">Contributed by {paper.contributedByName}</span>
              )}
            </div>
            <div className="pdf-container">
              {iframeLoading && <div className="pdf-skeleton"><div className="skeleton-shimmer" /><p>Loading document...</p></div>}
              <iframe
                src={`${paper.filePath}#toolbar=0`}
                title={`${paper.subject} ${paper.examType} paper`}
                className="pdf-frame"
                onLoad={() => setIframeLoading(false)}
                style={{ opacity: iframeLoading ? 0 : 1 }}
              />
            </div>
            <div className="modal-actions-v2">
              <button onClick={handleDownload} className="btn-download">Download Paper</button>
              {paper.solutionPath && <a href={paper.solutionPath} target="_blank" rel="noopener noreferrer" className="btn-solution">View Solution</a>}
              <button onClick={handleShareWhatsApp} className="btn-share-wa">Share on WhatsApp</button>
              <button onClick={handleCopyLink} className="btn-copy-link">Copy Link</button>
            </div>
          </div>
          <div className="modal-right">
            <div className="discussion-header">
              <h3>Doubt Section</h3>
              <p>{comments.length} thoughts</p>
            </div>
            <div className="comments-list">
              {comments.length === 0 ? (
                <div className="empty-comments"><p>No doubts yet. Be the first to ask.</p></div>
              ) : comments.map((comment) => (
                <div key={comment._id} className="comment-bubble">
                  <div className="comment-user-icon">{comment.username?.charAt(0).toUpperCase()}</div>
                  <div className="comment-details">
                    <strong>{comment.username}</strong>
                    <p>{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={postComment} className="comment-form">
              <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={user ? 'Write a doubt...' : 'Login to join discussion'} disabled={!user} />
              <button type="submit" disabled={!user || !newComment.trim()}>Send</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContributionPopup() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/') return undefined;
    if (sessionStorage.getItem('paperstack_contribution_popup_session_seen')) return undefined;
    if (localStorage.getItem('paperstack_contribution_popup_hidden') === 'true') return undefined;
    const lastShown = Number(localStorage.getItem('paperstack_contribution_popup_last_shown') || 0);
    if (Date.now() - lastShown < 24 * 60 * 60 * 1000) return undefined;
    const timer = setTimeout(() => {
      setVisible(true);
      sessionStorage.setItem('paperstack_contribution_popup_session_seen', 'true');
      localStorage.setItem('paperstack_contribution_popup_last_shown', String(Date.now()));
    }, 2500);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    if (!visible) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setVisible(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="contribution-popup-overlay" onClick={() => setVisible(false)}>
      <div className="contribution-popup" role="dialog" aria-modal="true" aria-labelledby="contribution-title" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={() => setVisible(false)} aria-label="Close contribution popup">x</button>
        <h2 id="contribution-title">Want to contribute papers?</h2>
        <p>Help IIIT Surat students by sharing previous year question papers. Your contribution can help many students prepare better.</p>
        <div className="popup-actions">
          <button onClick={() => { setVisible(false); navigate('/contribute'); }}>Yes, I want to contribute</button>
          <button onClick={() => setVisible(false)} className="secondary">Maybe later</button>
          <button onClick={() => { localStorage.setItem('paperstack_contribution_popup_hidden', 'true'); setVisible(false); }} className="ghost">Don't show again</button>
        </div>
      </div>
    </div>
  );
}

function Home({ user, setUser, theme, toggleTheme, isAdmin, setIsAdmin, toast }) {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSem, setFilterSem] = useState(user?.semester?.toString() || '');
  const [filterExam, setFilterExam] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [selectedReportPaper, setSelectedReportPaper] = useState(null);
  
  // V2 stats state
  const [analyticsData, setAnalyticsData] = useState({
    totalPapers: 0,
    totalViews: 0,
    totalDownloads: 0,
    totalContributors: 5
  });

  const navigate = useNavigate();

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/papers`);
      const loadedPapers = Array.isArray(res.data) ? res.data : res.data?.papers || [];
      const sorted = loadedPapers.sort((a, b) => {
        if ((b.year || 0) !== (a.year || 0)) return (b.year || 0) - (a.year || 0);
        if ((b.semester || 0) !== (a.semester || 0)) return (b.semester || 0) - (a.semester || 0);
        return String(a.subject || '').localeCompare(String(b.subject || ''));
      });
      setPapers(sorted);
    } catch (err) {
      toast('Failed to load papers. Please check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPapers();
    // Fetch quick stats
    axios.get(`${API_URL}/api/analytics`)
      .then(res => setAnalyticsData(res.data))
      .catch(() => console.warn('Failed to load quick stats'));
  }, [fetchPapers]);

  useEffect(() => {
    if (user?.semester) setFilterSem(user.semester.toString());
  }, [user?.semester]);

  const years = useMemo(() => Array.from(new Set(papers.map((paper) => paper.year).filter(Boolean))).sort((a, b) => b - a), [papers]);
  const branches = useMemo(() => Array.from(new Set(papers.map((paper) => paper.branch).filter(Boolean))).sort(), [papers]);

  const displayedPapers = papers.filter((paper) => {
    const haystack = [
      paper.title,
      paper.subject,
      paper.normalizedSubject,
      paper.subjectCode,
      paper.year,
      paper.examType,
      paper.semester,
      paper.branch,
      paper.contributedByName
    ].join(' ').toLowerCase();
    const matchesSearch = haystack.includes(searchTerm.toLowerCase());
    const matchesTab = filter === 'saved' ? user?.bookmarks?.some((id) => String(id) === String(paper._id)) : true;
    const matchesSem = filterSem ? String(paper.semester) === filterSem : true;
    const matchesExam = filterExam ? paper.examType === filterExam : true;
    const matchesYear = filterYear ? String(paper.year) === filterYear : true;
    const matchesBranch = filterBranch ? paper.branch === filterBranch : true;
    return matchesSearch && matchesTab && matchesSem && matchesExam && matchesYear && matchesBranch;
  });

  const handleView = async (paper) => {
    setSelectedPaper(paper);
    try {
      await axios.post(`${API_URL}/api/papers/${paper._id}/view`);
      setPapers((prev) => prev.map((item) => item._id === paper._id ? { ...item, views: (item.views || 0) + 1 } : item));
    } catch (err) {
      console.error('Failed to count view', err);
    }
  };

  const handleDownload = async (event, paper) => {
    event.stopPropagation();
    if (!user) {
      toast('Please login with your IIIT Surat account to continue.', 'info');
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    window.open(paper.filePath, '_blank');
    try {
      await axios.post(`${API_URL}/api/papers/${paper._id}/download`);
      setPapers((prev) => prev.map((item) => item._id === paper._id ? { ...item, downloads: (item.downloads || 0) + 1 } : item));
    } catch (err) {
      console.error('Failed to count download', err);
    }
  };

  const toggleBookmark = async (paperId, event) => {
    event.stopPropagation();
    if (!user) {
      toast('Please login with your IIIT Surat account to continue.', 'info');
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    try {
      const res = await axios.put(`${API_URL}/api/user/bookmark/${paperId}`, {}, { headers: authHeader() });
      setUser({ ...user, bookmarks: res.data });
      toast('Saved papers updated', 'success');
    } catch (err) {
      toast('Failed to update saved papers', 'error');
    }
  };

  const handleSolution = (event, paper) => {
    event.stopPropagation();
    if (paper.solutionPath) window.open(paper.solutionPath, '_blank');
    else toast('No solution available', 'info');
  };

  const handleAddSolutionToExisting = async (paperId, selectedFile) => {
    if (!selectedFile) return;
    try {
      const data = new FormData();
      data.append('solution', selectedFile);
      await axios.put(`${API_URL}/api/papers/${paperId}/solution`, data, { headers: { ...adminHeader(), 'Content-Type': 'multipart/form-data' } });
      toast('Solution added', 'success');
      fetchPapers();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to upload solution', 'error');
    }
  };

  const handleDelete = async (event, paperId) => {
    event.stopPropagation();
    if (!window.confirm('Delete this paper permanently?')) return;
    try {
      await axios.delete(`${API_URL}/api/papers/${paperId}`, { headers: adminHeader() });
      toast('Paper deleted', 'success');
      setPapers((prev) => prev.filter((paper) => paper._id !== paperId));
    } catch (err) {
      toast('Delete failed', 'error');
    }
  };

  const handleCopyLink = (paper, event) => {
    event.stopPropagation();
    navigator.clipboard.writeText(getPaperShareUrl(paper))
      .then(() => toast('PaperStack share link copied!', 'success'))
      .catch(() => toast('Failed to copy link', 'error'));
  };

  const handleWhatsAppShare = (paper, event) => {
    event.stopPropagation();
    window.open(`https://wa.me/?text=${encodeURIComponent(getPaperShareText(paper))}`, '_blank');
  };

  return (
    <>
      <Helmet>
        <title>{filterSem ? `Semester ${filterSem} Papers - PaperStack` : 'PaperStack - IIIT Surat Question Papers'}</title>
        <meta name="description" content="Browse IIIT Surat previous year question papers by semester, subject, branch, year, and exam type." />
        <link rel="canonical" href={`${FRONTEND_URL}/`} />
      </Helmet>
      <ContributionPopup />
      
      <div className="app-container">
        <Navbar user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} isAdmin={isAdmin} setIsAdmin={setIsAdmin} toast={toast} />
        
        <header className="ps-home-hero-final">
  <img
    src={iiitSuratLogo}
    alt=""
    aria-hidden="true"
    className="ps-bg-watermark ps-bg-iiit-left"
  />

  <img
    src={paperstackOwl}
    alt=""
    aria-hidden="true"
    className="ps-bg-watermark ps-bg-owl-right"
  />

  <div className="ps-home-hero-inner">
    <section className="ps-home-hero-left">
      <img
        src={paperstackWordmark}
        alt="PaperStack"
        className="ps-home-wordmark"
      />

      <span className="ps-home-pill">IIIT SURAT ARCHIVE</span>

      <h1>
        The Smart Archive for <span>IIIT Surat </span>Students
      </h1>

      <p>
        Access mid-sem and end-sem past papers, solutions, exam stats, and
        semester resources — curated by students, for students.
      </p>

      <div className="ps-home-actions">
        <button
          type="button"
          className="ps-home-btn ps-home-btn-primary"
          onClick={() =>
            document.getElementById('archive-browser')?.scrollIntoView({
              behavior: 'smooth',
            })
          }
        >
          Browse Papers
        </button>

        <Link to="/contribute" className="ps-home-btn ps-home-btn-secondary">
          Contribute Papers
        </Link>
      </div>
    </section>

    <section className="ps-home-hero-right">
      <div className="ps-owl-visual-wrap">
        <img
          src={iiitSuratLogo}
          alt=""
          aria-hidden="true"
          className="ps-owl-iiit-watermark"
        />

        <div className="ps-owl-orbit ps-owl-orbit-one" />
        <div className="ps-owl-orbit ps-owl-orbit-two" />

        <img
          src={paperstackOwl}
          alt="PaperStack owl mascot"
          className="ps-home-main-owl"
        />

        <span className="ps-home-float-chip ps-home-chip-download">Download</span>
        <span className="ps-home-float-chip ps-home-chip-search">Search</span>
        <span className="ps-home-float-chip ps-home-chip-share">Share</span>
        <span className="ps-home-float-chip ps-home-chip-contribute">Contribute</span>
      </div>
    </section>
  </div>
</header>

        {/* Stats Strip */}
        <section className="stats-strip-container">
          <div className="stats-strip-grid">
            <div className="stats-strip-card">
              <h3>{papers.length || 0}</h3>
              <p>Total Papers</p>
            </div>
            <div className="stats-strip-card">
              <h3>{analyticsData.totalViews || 0}</h3>
              <p>Total Views</p>
            </div>
            <div className="stats-strip-card">
              <h3>{analyticsData.totalDownloads || 0}</h3>
              <p>Total Downloads</p>
            </div>
            <div className="stats-strip-card">
              <h3>{analyticsData.totalContributors || 5}</h3>
              <p>Active Contributors</p>
            </div>
          </div>
        </section>

        <main className="main-content" id="archive-browser">
          <div className="controls-section">
            <div className="section-title-row">
              <h2 className="section-heading">{filterSem ? `Semester ${filterSem} Question Papers` : 'All Semester Papers'}</h2>
            </div>
            
            <div className="controls-bar">
              <div className="tabs">
                <button className={filter === 'all' ? 'tab active' : 'tab'} onClick={() => setFilter('all')}>Papers</button>
                <button className={filter === 'saved' ? 'tab active' : 'tab'} onClick={() => setFilter('saved')}>Saved</button>
              </div>
              <span className="navbar-paper-count"><h5>{displayedPapers.length} papers</h5></span>
              <div className="filters">
                <select className="sem-filter" value={filterSem} onChange={(e) => setFilterSem(e.target.value)}>
                  <option value="">All Sems</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => <option key={sem} value={sem}>Sem {sem}</option>)}
                </select>
                <select className="sem-filter" value={filterExam} onChange={(e) => setFilterExam(e.target.value)}>
                  <option value="">All Types</option>
                  <option>Mid-Sem</option>
                  <option>End-Sem</option>
                </select>
                <select className="sem-filter" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                  <option value="">All Years</option>
                  {years.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
                <select className="sem-filter" value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}>
                  <option value="">All Branches</option>
                  {branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
                </select>
                <input className="search-input" type="text" placeholder="Search subject, branch..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="papers-grid">
            {loading ? (
              <div className="papers-loading-panel">
                <PaperStackLoader label="Loading question papers..." />
              </div>
            ) : displayedPapers.length === 0 ? (
              <div className="empty-state">
                <h3>No papers found</h3>
                <p>Try changing filters or search terms.</p>
              </div>
            ) : displayedPapers.map((paper) => {
              const saved = user?.bookmarks?.some((id) => String(id) === String(paper._id));
              return (
                <div key={paper._id} className="paper-card">
                  <div className="card-stats-row">
                    <div className="stat-item">Views {paper.views || 0}</div>
                    <div className="stat-item">Downloads {paper.downloads || 0}</div>
                    <button className={`heart-icon ${saved ? 'liked' : ''}`} onClick={(e) => toggleBookmark(paper._id, e)} aria-label={saved ? 'Remove saved paper' : 'Save paper'}>
                      {saved ? 'Saved' : 'Save'}
                    </button>
                  </div>
                  <div className="card-body" onClick={() => handleView(paper)} style={{ cursor: 'pointer' }}>
                    <span className={`badge ${paper.examType === 'Mid-Sem' ? 'mid' : 'end'}`}>{paper.examType}</span>
                    <h3 className="subject-name">{paper.subject}</h3>
                    <p className="paper-title">{paper.title}</p>
                    <p className="paper-meta">Sem {paper.semester} - {paper.branch || 'CSE'} - {paper.year}</p>
                    {paper.contributedByName && (
                      <p className="contributor-name-small">Contributed by {paper.contributedByName}</p>
                    )}
                  </div>
                  <div className="card-actions-v2">
                    <button className="btn-view-pdf" onClick={() => handleView(paper)}>View</button>
                    
                    <div className="card-sharing-row">
                      {paper.solutionPath && <button className="btn-icon solution-icon" onClick={(e) => handleSolution(e, paper)} title="Solution">Sol</button>}
                      <button className="btn-icon download-icon" onClick={(e) => handleDownload(e, paper)} title="Download">Download</button>
                      <button className="btn-icon share-wa-icon" onClick={(e) => handleWhatsAppShare(paper, e)} title="Share WhatsApp">WA</button>
                      <button className="btn-icon copy-link-icon" onClick={(e) => handleCopyLink(paper, e)} title="Copy Link">Link</button>
                      <button className="btn-icon report-icon" onClick={(e) => { e.stopPropagation(); setSelectedReportPaper(paper); }} title="Report Wrong Details">⚠️</button>
                      
                      {isAdmin && (
                        <label className="btn-icon solution-icon update-btn" title="Update Solution">
                          {paper.solutionPath ? 'Upd' : 'Add'}
                          <input type="file" hidden accept="application/pdf" onChange={(e) => handleAddSolutionToExisting(paper._id, e.target.files[0])} />
                        </label>
                      )}
                      {isAdmin && <button className="btn-icon delete-icon" onClick={(e) => handleDelete(e, paper._id)}>Del</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
        
        <Footer />
        {selectedPaper && <PaperModal paper={selectedPaper} user={user} onClose={() => setSelectedPaper(null)} toast={toast} navigate={navigate} />}
        {selectedReportPaper && <ReportModal paper={selectedReportPaper} user={user} onClose={() => setSelectedReportPaper(null)} toast={toast} navigate={navigate} />}
      </div>
    </>
  );
}

function InfoPage({ title, description, path, children }) {
  return (
    <div className="app-container">
      <Helmet>
        <title>{title} - PaperStack</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`${FRONTEND_URL}${path}`} />
      </Helmet>
      <main className="page-shell">
        <Link to="/" className="page-back-link">Back to papers</Link>
        <h1>{title}</h1>
        <p className="page-lead">{description}</p>
        <div className="page-content">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

function AboutPage() {
  return (
    <InfoPage title="About" path="/about" description="PaperStack is a community-driven IIIT Surat previous year question paper archive.">
      <p>PaperStack helps students prepare smarter by organizing previous year papers by subject, semester, year, branch, and exam type.</p>
      <p>The goal is simple: make useful academic references easier to find before exams.</p>
    </InfoPage>
  );
}

function ContactPage() {
  return (
    <InfoPage title="Contact" path="/contact" description="Contact the PaperStack team for corrections, removal requests, and contributions.">
      <p>Email: <a href={`mailto:${CONTRIBUTION_EMAIL}`}>{CONTRIBUTION_EMAIL}</a></p>
      <p>Include paper title, subject, semester, year, and a short description of your request.</p>
    </InfoPage>
  );
}

function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy" path="/privacy-policy" description="How PaperStack handles login data, saved papers, comments, and contributions.">
      <p>PaperStack stores student login details, saved papers, semester preference, and comments so core features can work.</p>
      <p>Contribution emails may include sender details and attached academic material. PaperStack does not sell personal data.</p>
      <p>Administrators may remove content, accounts, or comments that are inaccurate, abusive, or inappropriate.</p>
    </InfoPage>
  );
}

function TermsPage() {
  return (
    <InfoPage title="Terms" path="/terms" description="Rules for using PaperStack responsibly.">
      <p>PaperStack is for academic reference and exam preparation. Do not misuse papers, spam the service, or upload material you are not allowed to share.</p>
      <p>Users are responsible for the material they upload, share, or submit for contribution.</p>
    </InfoPage>
  );
}

function DisclaimerPage() {
  return (
    <InfoPage title="Disclaimer" path="/disclaimer" description="Important accuracy and affiliation notes for PaperStack.">
      <p>PaperStack is not an official IIIT Surat website unless the owner later states otherwise.</p>
      <p>Papers are shared for educational reference. Accuracy, completeness, and formatting may vary.</p>
    </InfoPage>
  );
}

function CopyrightPage() {
  return (
    <InfoPage title="Copyright" path="/copyright" description="Removal request instructions for copyrighted or incorrectly shared material.">
      <p>If you own material on PaperStack and want it removed, contact the admin with the paper title, subject, year, exam type, and reason for removal.</p>
      <p>Email removal requests to <a href={`mailto:${CONTRIBUTION_EMAIL}`}>{CONTRIBUTION_EMAIL}</a>.</p>
    </InfoPage>
  );
}

function PaperSharePage({ user, setUser, theme, toggleTheme, isAdmin, setIsAdmin, toast }) {
  const { id } = useParams();
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_URL}/api/papers`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data.papers || [];
        const foundPaper = list.find((item) => String(item._id) === String(id));
        if (foundPaper) {
          setPaper(foundPaper);
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => {
        setNotFound(true);
        toast('Could not load this paper.', 'error');
      })
      .finally(() => setLoading(false));
  }, [id, toast]);

  const shareUrl = paper ? getPaperShareUrl(paper) : `${FRONTEND_URL.replace(/\/$/, '')}/paper/${id}`;
  const title = paper ? `${paper.subject} ${paper.examType} ${paper.year} - PaperStack` : 'PaperStack Paper';
  const description = paper ? `Check this IIIT Surat paper on PaperStack: ${paper.subject}, Semester ${paper.semester}, ${paper.examType} ${paper.year}.` : 'Check this IIIT Surat paper on PaperStack.';
  const ogImage = `${FRONTEND_URL.replace(/\/$/, '')}/logo512.png`;

  const handleDownload = async () => {
    if (!paper) return;
    window.open(paper.filePath, '_blank');
    try {
      await axios.post(`${API_URL}/api/papers/${paper._id}/download`);
    } catch (err) {
      // Download should still work even if counter update fails.
    }
  };

  return (
    <div className="app-container">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content="Check this IIIT Surat paper on PaperStack" />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={shareUrl} />
      </Helmet>
      <Navbar user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} isAdmin={isAdmin} setIsAdmin={setIsAdmin} toast={toast} />
      <main className="page-shell paper-share-page">
        <Link to="/" className="page-back-link">Back to papers</Link>
        {loading ? (
          <section className="paper-share-card">
            <PaperStackLoader label="Loading shared paper..." />
          </section>
        ) : notFound || !paper ? (
          <section className="paper-share-card empty-state">
            <h1>Paper not found</h1>
            <p>This PaperStack share link may be outdated or removed.</p>
            <Link to="/" className="btn-primary-teal">Browse Archive</Link>
          </section>
        ) : (
          <section className="paper-share-card">
            <div className="paper-share-brand">
              <img src={logo} alt="PaperStack" />
              <span>PaperStack Share</span>
            </div>
            <span className={`badge ${paper.examType === 'Mid-Sem' ? 'mid' : 'end'}`}>{paper.examType}</span>
            <h1>{paper.subject}</h1>
            <p className="page-lead">{paper.title || `Semester ${paper.semester} ${paper.examType} question paper`}</p>
            <div className="paper-share-meta">
              <span>Branch {paper.branch || 'CSE'}</span>
              <span>Semester {paper.semester}</span>
              <span>{paper.year}</span>
              <span>{paper.views || 0} views</span>
            </div>
            <div className="paper-share-actions">
              <button type="button" className="btn-primary-teal" onClick={() => window.open(paper.filePath, '_blank')}>View PDF</button>
              <button type="button" className="btn-secondary-outline" onClick={handleDownload}>Download</button>
              {paper.solutionPath && <a href={paper.solutionPath} target="_blank" rel="noopener noreferrer" className="btn-secondary-outline">View Solution</a>}
              <button type="button" className="btn-secondary-outline" onClick={() => {
                navigator.clipboard.writeText(shareUrl)
                  .then(() => toast('PaperStack share link copied!', 'success'))
                  .catch(() => toast('Failed to copy link', 'error'));
              }}>Copy Link</button>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

function FAQPage() {
  return (
    <InfoPage title="FAQ" path="/faq" description="Common questions about PaperStack.">
      <div className="faq-list">
        <h3>Is PaperStack free?</h3>
        <p>Yes. The paper archive is free to browse, view, and download.</p>
        <h3>Who can use it?</h3>
        <p>Anyone can browse public papers. Student features such as saved papers and comments require login.</p>
        <h3>How can I contribute papers?</h3>
        <p>Use the contribute page and email the paper details with PDF attachments.</p>
        <h3>How do I save papers?</h3>
        <p>Login with your IIIT Surat email and use the Save button on paper cards.</p>
        <h3>How do I report wrong papers?</h3>
        <p>Contact the admin with the subject, semester, year, and issue details.</p>
      </div>
    </InfoPage>
  );
}

function NotFoundPage() {
  return (
    <InfoPage title="404" path="/404" description="The page you are looking for does not exist.">
      <Link to="/" className="btn-login">Return to Papers</Link>
    </InfoPage>
  );
}

function RankBadge({ rank }) {
  const badges = {
    1: { label: '1st', className: 'gold', icon: 'M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.3 7.2 17.9l.9-5.4-3.9-3.8 5.4-.8L12 3z' },
    2: { label: '2nd', className: 'silver', icon: 'M7 3h10v4a5 5 0 1 1-10 0V3zm2 2v2a3 3 0 1 0 6 0V5H9zm3 8l3 6H9l3-6z' },
    3: { label: '3rd', className: 'bronze', icon: 'M12 4a5 5 0 0 1 5 5c0 3.8-5 9-5 9s-5-5.2-5-9a5 5 0 0 1 5-5zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z' }
  };
  const badge = badges[rank] || { label: `#${rank}`, className: 'standard', icon: 'M12 4l7 4v8l-7 4-7-4V8l7-4z' };
  return (
    <span className={`rank-badge rank-badge-${badge.className}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={badge.icon} />
      </svg>
      {badge.label}
    </span>
  );
}

// V2 Page: Contributors Leaderboard page
function ContributorsPage({ user, setUser, theme, toggleTheme, isAdmin, setIsAdmin, toast }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/api/contributors/leaderboard`)
      .then(res => setLeaderboard(res.data))
      .catch(() => toast('Failed to load leaderboard', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  return (
    <div className="app-container">
      <Navbar user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} isAdmin={isAdmin} setIsAdmin={setIsAdmin} toast={toast} />
      <main className="page-shell">
        <Link to="/" className="page-back-link">Back to papers</Link>
        <div className="contributors-container">
          <div className="contributors-header">
            <h1>Contributors Leaderboard</h1>
            <p className="page-lead">Earn points by contributing approved papers. Top contributors get featured for helping the IIIT Surat community prepare smarter.</p>
          </div>
          {loading ? (
            <div className="analytics-state">
              <PaperStackLoader label="Loading leaderboard..." />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="leaderboard-empty-state">
              <div className="leaderboard-empty-icon">
                <RankBadge rank={1} />
              </div>
              <h2>No contributions published yet. Be the first contributor.</h2>
              <p>Upload verified question papers, get approved by the admin, and start climbing the PaperStack leaderboard.</p>
              <Link to="/contribute" className="btn-primary-teal">Contribute Papers</Link>
            </div>
          ) : (
            <div className="leaderboard-grid">
              <div className="top-podium">
                {leaderboard.slice(0, 3).map((item, idx) => (
                  <div key={item.userId} className={`podium-card rank-${idx + 1}`}>
                    <RankBadge rank={idx + 1} />
                    <div className="podium-name">{item.name}</div>
                    <div className="podium-points">{item.points} pts</div>
                    <div className="podium-stats">{item.approvedCount} papers approved</div>
                  </div>
                ))}
              </div>
              
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Contributor</th>
                    <th>Approved Papers</th>
                    <th>Approved Solutions</th>
                    <th>Total Points</th>
                    <th>Earned Badges</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((item, idx) => (
                    <tr key={item.userId} className={idx < 3 ? 'top-row' : ''}>
                      <td><RankBadge rank={idx + 1} /></td>
                      <td>
                        <div className="contributor-name-cell">
                          <strong>{item.name}</strong>
                          <span className="contributor-email-sub">{item.email}</span>
                        </div>
                      </td>
                      <td>{item.approvedCount}</td>
                      <td>{item.solutionCount || 0}</td>
                      <td>{item.points}</td>
                      <td>
                        <div className="badges-list">
                          {(item.badges || []).map(b => (
                            <span key={b} className="badge-pill">{b}</span>
                          ))}
                          {(!item.badges || item.badges.length === 0) && <span className="badge-pill">New Contributor</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="leaderboard-mobile-cards">
                {leaderboard.map((item, idx) => (
                  <article key={item.userId} className={`leaderboard-mobile-card ${idx < 3 ? 'top-row' : ''}`}>
                    <div className="leaderboard-mobile-top">
                      <RankBadge rank={idx + 1} />
                      <strong>{item.name}</strong>
                    </div>
                    <span className="contributor-email-sub">{item.email}</span>
                    <div className="leaderboard-mobile-stats">
                      <span>{item.approvedCount} papers</span>
                      <span>{item.solutionCount || 0} solutions</span>
                      <span>{item.points} pts</span>
                    </div>
                    <div className="badges-list">
                      {(item.badges || []).map(b => (
                        <span key={b} className="badge-pill">{b}</span>
                      ))}
                      {(!item.badges || item.badges.length === 0) && <span className="badge-pill">New Contributor</span>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// V2 Page: Interactive Contribution Form with Cloudinary Upload
function ContributePageNew({ user, setUser, theme, toggleTheme, isAdmin, setIsAdmin, toast }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user && !localStorage.getItem('token')) {
      toast('Please login with your IIIT Surat account to continue.', 'info');
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
    }
  }, [user, navigate, location, toast]);

  const queryParams = new URLSearchParams(location.search);
  const [formData, setFormData] = useState({
    subject: queryParams.get('subject') || '',
    title: queryParams.get('title') || '',
    branch: queryParams.get('branch') || 'CSE',
    semester: queryParams.get('semester') || '1',
    year: queryParams.get('year') || new Date().getFullYear().toString(),
    examType: queryParams.get('examType') || 'Mid-Sem',
    notes: '',
    confirmChecked: false
  });
  const [paperFile, setPaperFile] = useState(null);
  const [solutionFile, setSolutionFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.confirmChecked) {
      toast('Please confirm the paper information is correct.', 'warning');
      return;
    }
    if (!paperFile) {
      toast('Paper PDF file is required.', 'warning');
      return;
    }
    setSubmitting(true);
    setUploadProgress(20);

    const data = new FormData();
    data.append('file', paperFile);
    if (solutionFile) data.append('solution', solutionFile);
    Object.entries(formData).forEach(([key, val]) => data.append(key, val));

    try {
      setUploadProgress(50);
      const res = await axios.post(`${API_URL}/api/contributions`, data, {
        headers: {
          ...authHeader(),
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadProgress(100);
      toast(res.data.message || 'Contribution submitted successfully.', 'success');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Submission failed.';
      toast(msg, 'error');
      setUploadProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="app-container">
      <Navbar user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} isAdmin={isAdmin} setIsAdmin={setIsAdmin} toast={toast} />
      
      <main className="page-shell">
        <Link to="/" className="page-back-link">Back to papers</Link>
        <div className="contribute-form-container contribute-v2">
          <div className="contribute-hero-panel">
            <span className="page-eyebrow">Community Archive</span>
            <h1>Contribute Papers to PaperStack</h1>
            <p className="page-lead">Help IIIT Surat students prepare smarter by sharing verified previous year question papers and solutions.</p>
          </div>

          <div className="contribute-layout">
            <aside className="contribute-side-card">
              <span className="side-card-label">Before you upload</span>
              <h2>Keep the archive clean and useful.</h2>
              <ul>
                <li>Upload only clear PDF files for IIIT Surat papers.</li>
                <li>Check subject, semester, year, branch, and exam type carefully.</li>
                <li>Solutions are optional but highly useful for students.</li>
                <li>Earn leaderboard points after admin approval.</li>
              </ul>
            </aside>

            <form onSubmit={handleSubmit} className="contrib-form contribution-form-card">
              <div className="contrib-grid">
                <div className="form-group">
                  <label>Subject Name <span>*</span></label>
                  <input type="text" placeholder="e.g. Data Structures" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Subject Code / Title Details <span>*</span></label>
                  <input type="text" placeholder="e.g. CSE-201 / Mid-Sem Paper" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Branch <span>*</span></label>
                  <select value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })}>
                    <option>CSE</option>
                    <option>ECE</option>
                    <option>AI</option>
                    <option>AIML</option>
                    <option>IT</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Semester <span>*</span></label>
                  <select value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Exam Year <span>*</span></label>
                  <input type="number" placeholder="2025" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Exam Type <span>*</span></label>
                  <select value={formData.examType} onChange={(e) => setFormData({ ...formData, examType: e.target.value })}>
                    <option>Mid-Sem</option>
                    <option>End-Sem</option>
                  </select>
                </div>
              </div>

              <div className="contrib-grid">
                <div className="form-group">
                  <label>Paper PDF File <span>*</span></label>
                  <input type="file" accept="application/pdf" onChange={(e) => setPaperFile(e.target.files[0])} required />
                  {paperFile && <p className="file-size-preview">Size: {(paperFile.size / (1024 * 1024)).toFixed(2)} MB</p>}
                </div>
                <div className="form-group">
                  <label>Optional Solution PDF</label>
                  <input type="file" accept="application/pdf" onChange={(e) => setSolutionFile(e.target.files[0])} />
                  {solutionFile && <p className="file-size-preview">Size: {(solutionFile.size / (1024 * 1024)).toFixed(2)} MB</p>}
                </div>
              </div>

              <div className="form-group">
                <label>Notes / Message to Reviewer</label>
                <textarea rows={3} placeholder="Add any details about questions or code..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>

              <div className="checkbox-confirm-row">
                <input type="checkbox" id="confirm" checked={formData.confirmChecked} onChange={(e) => setFormData({ ...formData, confirmChecked: e.target.checked })} />
                <label htmlFor="confirm">I confirm that this paper information is correct and the PDF is clear.</label>
              </div>

              {uploadProgress > 0 && (
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                  <span>Uploading: {uploadProgress}%</span>
                </div>
              )}

              <button type="submit" className="login-btn-gradient" disabled={submitting}>
                {submitting ? <PaperStackLoader label="Uploading paper..." compact /> : 'Submit Contribution'}
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// V2 Page: Exam Mode screen
// V2 Page: Exam Mode Screen
function ExamModePage({ user, setUser, theme, toggleTheme, isAdmin, setIsAdmin, toast }) {
  const CURRENT_YEAR = new Date().getFullYear();
  const EXPECTED_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3, CURRENT_YEAR - 4, CURRENT_YEAR - 5];
  const navigate = useNavigate();

  const [papers, setPapers] = useState([]);
  const [branch, setBranch] = useState('ECE');
  const [semester, setSemester] = useState('4');
  const [subject, setSubject] = useState('');
  const [examType, setExamType] = useState('Mid-Sem');
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);

  const normalize = (value) => {
    return String(value || '')
      .toLowerCase()
      .replace(/branch\s*:/g, '')
      .replace(/semester\s*/g, '')
      .replace(/sem\s*/g, '')
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  };

  const normalizeSubject = (value) => {
    return normalize(value)
      .replace(/\bdsa\b/g, 'data structure algorithms')
      .replace(/\bdaa\b/g, 'design analysis algorithm')
      .replace(/\badc\b/g, 'analog digital communication')
      .replace(/\boot\b/g, 'object oriented technology')
      .replace(/\bss\b/g, 'system software');
  };

  const getPaperSemester = (paper) => {
    const raw = paper?.semester || paper?.sem || '';
    const match = String(raw).match(/\d+/);
    return match ? match[0] : String(raw);
  };

  const paperMatchesBranch = (paper) => {
    const selectedBranch = normalize(branch);
    const paperBranch = normalize(paper?.branch);

    if (!selectedBranch || selectedBranch === 'all') return true;

    return (
      paperBranch === selectedBranch ||
      paperBranch.includes(selectedBranch) ||
      selectedBranch.includes(paperBranch)
    );
  };

  const paperMatchesSemester = (paper) => {
    const selectedSem = String(semester).replace(/\D/g, '');
    const paperSem = String(getPaperSemester(paper)).replace(/\D/g, '');

    if (!selectedSem) return true;

    return paperSem === selectedSem;
  };

  const paperMatchesExamType = (paper) => {
    const selectedType = normalize(examType);
    const paperType = normalize(paper?.examType || paper?.type);

    if (!selectedType || selectedType === 'all') return true;

    return paperType === selectedType || paperType.includes(selectedType);
  };

  const paperMatchesSubject = (paper) => {
    const selectedSubject = normalizeSubject(subject);
    const paperSubject = normalizeSubject(paper?.subject || paper?.normalizedSubject || paper?.title);

    if (!selectedSubject) return true;

    return (
      paperSubject.includes(selectedSubject) ||
      selectedSubject.includes(paperSubject)
    );
  };

  useEffect(() => {
    let mounted = true;

    const loadPapers = async () => {
      setLoading(true);

      try {
        const res = await axios.get(`${API_URL}/api/papers`);
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.papers)
            ? res.data.papers
            : [];

        if (mounted) setPapers(list);
      } catch (error) {
        console.error('Exam mode papers load failed:', error);
        if (toast) toast('Failed to load papers for Exam Mode', 'error');
        if (mounted) setPapers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadPapers();

    return () => {
      mounted = false;
    };
  }, [toast]);

  const baseMatchedPapers = useMemo(() => {
    return papers.filter((paper) => {
      return (
        paperMatchesBranch(paper) &&
        paperMatchesSemester(paper) &&
        paperMatchesExamType(paper)
      );
    });
  }, [papers, branch, semester, examType]);

  const subjectMatchedPapers = useMemo(() => {
    return baseMatchedPapers.filter((paper) => paperMatchesSubject(paper));
  }, [baseMatchedPapers, subject]);

  const availableYears = useMemo(() => {
    const years = new Set();

    subjectMatchedPapers.forEach((paper) => {
      const year = Number(paper?.year);
      if (year) years.add(year);
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [subjectMatchedPapers]);

  const missingYears = useMemo(() => {
    return EXPECTED_YEARS.filter((year) => !availableYears.includes(year));
  }, [EXPECTED_YEARS, availableYears]);

  const recommendedPapers = useMemo(() => {
    return [...subjectMatchedPapers]
      .sort((a, b) => {
        const scoreA = Number(a.views || 0) + Number(a.downloads || 0) * 2 + Number(a.year || 0);
        const scoreB = Number(b.views || 0) + Number(b.downloads || 0) * 2 + Number(b.year || 0);
        return scoreB - scoreA;
      })
      .slice(0, 6);
  }, [subjectMatchedPapers]);

  const semesterPackPapers = useMemo(() => {
    return baseMatchedPapers;
  }, [baseMatchedPapers]);

  const handleSearch = (event) => {
    event.preventDefault();
    setSearched(true);
  };

  const downloadPaper = (paper) => {
    if (!user) {
      window.location.href = '/login?redirect=/exam-mode';
      return;
    }

    const url = paper?.filePath || paper?.paperUrl || paper?.url;

    if (!url) {
      if (toast) toast('Paper file is not available', 'error');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openContribute = (year) => {
    const query = new URLSearchParams({
      branch,
      semester,
      subject,
      examType,
      year: String(year)
    }).toString();

    window.location.href = `/contribute?${query}`;
  };

  const downloadSemesterPack = async ({ branch: packBranch, semester: packSemester, examType: packExamType }) => {
    const token = localStorage.getItem('token');

    if (!token) {
      if (toast) toast('Please login to download semester pack.', 'error');
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (!semesterPackPapers.length) {
      if (toast) toast('No papers available for this semester pack', 'error');
      return;
    }

    try {
      const params = new URLSearchParams({
        branch: String(packBranch || ''),
        semester: String(packSemester || ''),
        examType: String(packExamType || '')
      });

      const response = await fetch(`${API_URL}/api/papers/download-pack?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        if (toast) toast('Session expired. Please login again.', 'error');
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('userSemester');
        setUser(null);
        navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      if (!response.ok) {
        let message = 'Failed to download semester pack.';
        try {
          const data = await response.json();
          message = data.error || data.message || message;
        } catch {
          try {
            const text = await response.text();
            if (text) message = text;
          } catch {}
        }

        if (toast) toast(message, 'error');
        return;
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition') || '';
      const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
      const safeBranch = String(packBranch || 'Branch').replace(/\s+/g, '_');
      const safeExamType = String(packExamType || 'Exam').replace(/\s+/g, '_');
      const fileName =
        fileNameMatch?.[1] ||
        `PaperStack_${safeBranch}_Sem${packSemester}_${safeExamType}_Pack.zip`;

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      if (toast) toast('Semester pack download started.', 'success');
    } catch (error) {
      console.error('Semester pack download failed:', error);
      if (toast) toast('Download failed. Please try again.', 'error');
    }
  };

  return (
    <div className="app-container">
      <Navbar
        user={user}
        setUser={setUser}
        theme={theme}
        toggleTheme={toggleTheme}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        toast={toast}
      />

      <main className="exam-mode-v2-page">
        <Link to="/" className="exam-back-link">
          Back to papers
        </Link>

        <section className="exam-hero-panel">
          <span className="exam-label">Exam Mode</span>
          <h1>Subject Exam Prep Mode</h1>
          <p>
            Select your branch, semester, subject, and exam type to find available papers,
            missing years, and recommended practice papers.
          </p>
        </section>

        <section className="exam-main-grid">
          <form className="exam-search-card" onSubmit={handleSearch}>
            <div className="exam-field">
              <label>Branch</label>
              <select value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="CSE & ECE">CSE & ECE</option>
              </select>
            </div>

            <div className="exam-field">
              <label>Semester</label>
              <select value={semester} onChange={(e) => setSemester(e.target.value)}>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
                <option value="4">Semester 4</option>
                <option value="5">Semester 5</option>
                <option value="6">Semester 6</option>
                <option value="7">Semester 7</option>
                <option value="8">Semester 8</option>
              </select>
            </div>

            <div className="exam-field">
              <label>Subject Name</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Data Structures"
              />
              <small>Leave empty to show all matching semester papers.</small>
            </div>

            <div className="exam-field">
              <label>Exam Type</label>
              <select value={examType} onChange={(e) => setExamType(e.target.value)}>
                <option value="Mid-Sem">Mid-Sem</option>
                <option value="End-Sem">End-Sem</option>
              </select>
            </div>

            <button type="submit" className="exam-search-btn">
              Search Papers
            </button>
          </form>

          <aside className="exam-summary-card">
            <h2>Current Selection</h2>

            <div className="exam-summary-row">
              <span>Branch</span>
              <strong>{branch}</strong>
            </div>

            <div className="exam-summary-row">
              <span>Semester</span>
              <strong>Semester {semester}</strong>
            </div>

            <div className="exam-summary-row">
              <span>Exam Type</span>
              <strong>{examType}</strong>
            </div>

            <div className="exam-summary-row">
              <span>Matched Papers</span>
              <strong>{subjectMatchedPapers.length}</strong>
            </div>
          </aside>
        </section>

        {loading ? (
          <section className="exam-result-card">
            <PaperStackLoader label="Loading exam mode papers..." />
          </section>
        ) : (
          <section className="exam-results-section">
            <div className="exam-result-card">
              <div className="exam-section-header">
                <h2>Available Years</h2>
                <p>
                  Papers found for the selected filters.
                </p>
              </div>

              {availableYears.length ? (
                <div className="exam-year-grid">
                  {availableYears.map((year) => (
                    <span className="exam-year-pill available" key={year}>
                      {year}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="exam-empty-state">
                  No papers available for this exact combination.
                  Try leaving subject empty or checking branch as CSE & ECE.
                </div>
              )}
            </div>

            <div className="exam-result-card">
              <div className="exam-section-header">
                <h2>Missing Years</h2>
                <p>
                  These years are missing from the archive for this selection.
                </p>
              </div>

              {missingYears.length ? (
                <div className="exam-year-grid">
                  {missingYears.map((year) => (
                    <button
                      type="button"
                      className="exam-year-pill missing"
                      key={year}
                      onClick={() => openContribute(year)}
                    >
                      {year} · Contribute
                    </button>
                  ))}
                </div>
              ) : (
                <div className="exam-empty-state success">
                  Archive looks complete for this selection.
                </div>
              )}
            </div>

            <div className="exam-result-card">
              <div className="exam-section-header">
                <h2>Recommended Practice List</h2>
                <p>
                  Start with the most useful papers based on activity and recency.
                </p>
              </div>

              {recommendedPapers.length ? (
                <div className="exam-paper-list">
                  {recommendedPapers.map((paper, index) => (
                    <div className="exam-paper-row" key={paper._id || `${paper.subject}-${index}`}>
                      <span className="exam-rank">#{index + 1}</span>

                      <div>
                        <strong>{paper.subject || paper.title || 'Untitled Paper'}</strong>
                        <p>
                          {paper.examType || 'Exam'} · {paper.year || 'Year'} · {paper.branch || 'Branch'}
                        </p>
                      </div>

                      <button type="button" onClick={() => downloadPaper(paper)}>
                        Open
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="exam-empty-state">
                  No recommended papers found.
                </div>
              )}
            </div>

            <div className="exam-pack-card">
              <div>
                <h2>Download Full Semester Pack</h2>
                <p>
                  Get all {examType} PDFs for Semester {semester} of {branch} packed in one ZIP.
                </p>
              </div>

              <button
                type="button"
                onClick={() => downloadSemesterPack({ branch, semester, examType })}
                disabled={!semesterPackPapers.length}
              >
                Download ZIP Pack
              </button>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
// V2 Page: Missing Papers Board
// V2 Page: Missing Papers Board
function MissingPapersPage({
  user,
  setUser,
  theme,
  toggleTheme,
  isAdmin,
  setIsAdmin,
  toast
} = {}) {
  const [data, setData] = useState({
    summary: null,
    missingPapers: []
  });

  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState('All');
  const [semesterFilter, setSemesterFilter] = useState('All');
  const [examTypeFilter, setExamTypeFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const loadMissingPapers = async () => {
    setLoading(true);

    try {
      const res = await axios.get(`${API_URL}/api/missing-papers`);

      const payload = res.data || {};

      const missingList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.missingPapers)
          ? payload.missingPapers
          : [];

      setData({
        summary: payload.summary || null,
        missingPapers: missingList
      });
    } catch (error) {
      console.error('Missing papers load failed:', error);

      if (toast) {
        toast('Failed to load missing papers', 'error');
      }

      setData({
        summary: null,
        missingPapers: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMissingPapers();
  }, []);

  const normalize = (value) => {
    return String(value || '').toLowerCase().trim();
  };

  const filteredMissingPapers = useMemo(() => {
    return data.missingPapers.filter((item) => {
      const matchesBranch =
        branchFilter === 'All' || item.branch === branchFilter;

      const matchesSemester =
        semesterFilter === 'All' ||
        Number(item.semester) === Number(semesterFilter);

      const matchesExamType =
        examTypeFilter === 'All' || item.examType === examTypeFilter;

      const matchesYear =
        yearFilter === 'All' || Number(item.year) === Number(yearFilter);

      const matchesPriority =
        priorityFilter === 'All' || item.priority === priorityFilter;

      const searchPool = [
        item.subject,
        item.subjectCode,
        item.shortCode,
        item.branch,
        item.examType,
        item.year,
        `semester ${item.semester}`,
        `sem ${item.semester}`
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        !searchTerm.trim() || searchPool.includes(normalize(searchTerm));

      return (
        matchesBranch &&
        matchesSemester &&
        matchesExamType &&
        matchesYear &&
        matchesPriority &&
        matchesSearch
      );
    });
  }, [
    data.missingPapers,
    branchFilter,
    semesterFilter,
    examTypeFilter,
    yearFilter,
    priorityFilter,
    searchTerm
  ]);

  const availableYears = useMemo(() => {
    const years = new Set(
      data.missingPapers
        .map((item) => item.year)
        .filter(Boolean)
    );

    return Array.from(years).sort((a, b) => b - a);
  }, [data.missingPapers]);

  const summary = data.summary || {
    totalMissing: data.missingPapers.length,
    highPriority: data.missingPapers.filter((item) => item.priority === 'High').length,
    mediumPriority: data.missingPapers.filter((item) => item.priority === 'Medium').length,
    lowPriority: data.missingPapers.filter((item) => item.priority === 'Low').length
  };

  const openContribution = (item) => {
    const contributionUrl =
      item.contributionUrl ||
      `/contribute?branch=${encodeURIComponent(item.branch)}&semester=${encodeURIComponent(item.semester)}&subject=${encodeURIComponent(item.subject)}&subjectCode=${encodeURIComponent(item.subjectCode || '')}&examType=${encodeURIComponent(item.examType)}&year=${encodeURIComponent(item.year)}`;

    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(contributionUrl)}`;
      return;
    }

    window.location.href = contributionUrl;
  };

  const clearFilters = () => {
    setBranchFilter('All');
    setSemesterFilter('All');
    setExamTypeFilter('All');
    setYearFilter('All');
    setPriorityFilter('All');
    setSearchTerm('');
  };

  const priorityClass = (priority) => {
    if (priority === 'High') return 'mp-priority-high';
    if (priority === 'Medium') return 'mp-priority-medium';
    return 'mp-priority-low';
  };

  return (
    <div className="app-container">
      <Helmet>
        <title>Missing Papers Board - PaperStack</title>
        <meta
          name="description"
          content="Find missing IIIT Surat previous year question papers and contribute to PaperStack."
        />
      </Helmet>

      <Navbar
        user={user}
        setUser={setUser}
        theme={theme}
        toggleTheme={toggleTheme}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        toast={toast}
      />

      <main className="missing-page-v2">
        <Link to="/" className="mp-back-link">
          Back to papers
        </Link>

        <section className="mp-hero-panel">
          <div>
            <span className="mp-label">Community Mission</span>
            <h1>Missing Papers Board</h1>
            <p>
              See which papers are still missing from PaperStack. Upload missing papers,
              help your juniors, and earn contributor points.
            </p>
          </div>

          <div className="mp-hero-card">
            <span>Contribution Score</span>
            <strong>Build the Archive</strong>
            <p>
              Every approved paper improves the archive and your contributor rank.
            </p>
          </div>
        </section>

        <section className="mp-stats-grid">
          <div className="mp-stat-card">
            <span>Total Missing</span>
            <strong>{summary.totalMissing || 0}</strong>
            <p>Expected papers not uploaded yet</p>
          </div>

          <div className="mp-stat-card high">
            <span>High Priority</span>
            <strong>{summary.highPriority || 0}</strong>
            <p>Current year missing papers</p>
          </div>

          <div className="mp-stat-card medium">
            <span>Medium Priority</span>
            <strong>{summary.mediumPriority || 0}</strong>
            <p>Previous year missing papers</p>
          </div>

          <div className="mp-stat-card low">
            <span>Low Priority</span>
            <strong>{summary.lowPriority || 0}</strong>
            <p>Older missing papers</p>
          </div>
        </section>

        <section className="mp-filter-panel">
          <div className="mp-filter-header">
            <div>
              <h2>Find Missing Papers</h2>
              <p>
                Showing <strong>{filteredMissingPapers.length}</strong> of{' '}
                <strong>{data.missingPapers.length}</strong> missing papers.
              </p>
            </div>

            <button
              type="button"
              onClick={loadMissingPapers}
              className="mp-refresh-btn"
            >
              Refresh
            </button>
          </div>

          <div className="mp-filter-grid">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="All">All Branches</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
            </select>

            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
            >
              <option value="All">All Semesters</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
              <option value="3">Semester 3</option>
              <option value="4">Semester 4</option>
              <option value="5">Semester 5</option>
              <option value="6">Semester 6</option>
              <option value="7">Semester 7</option>
            </select>

            <select
              value={examTypeFilter}
              onChange={(e) => setExamTypeFilter(e.target.value)}
            >
              <option value="All">All Exam Types</option>
              <option value="Mid-Sem">Mid-Sem</option>
              <option value="End-Sem">End-Sem</option>
            </select>

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <option value="All">All Years</option>
              {availableYears.map((year) => (
                <option value={year} key={year}>
                  {year}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="All">All Priority</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search subject, code, year..."
            />
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="mp-clear-btn"
          >
            Clear all filters
          </button>
        </section>

        <section className="mp-list-section">
          {loading ? (
            <div className="mp-loading-card">
              <PaperStackLoader label="Checking expected curriculum against uploaded papers..." />
            </div>
          ) : filteredMissingPapers.length ? (
            <div className="mp-cards-grid">
              {filteredMissingPapers.map((item, index) => (
                <article
                  className="mp-paper-card"
                  key={`${item.branch}-${item.semester}-${item.subject}-${item.examType}-${item.year}-${index}`}
                >
                  <div className="mp-card-top">
                    <span className={`mp-priority ${priorityClass(item.priority)}`}>
                      {item.priority}
                    </span>

                    <span className="mp-year">{item.year}</span>
                  </div>

                  <h3>{item.subject}</h3>

                  <div className="mp-meta-grid">
                    <span>{item.branch}</span>
                    <span>Semester {item.semester}</span>
                    <span>{item.examType}</span>
                    <span>{item.shortCode || item.subjectCode || 'Paper'}</span>
                  </div>

                  <button type="button" onClick={() => openContribution(item)}>
                    Contribute Paper
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="mp-empty-state">
              <h2>No missing papers found</h2>
              <p>Try changing filters or refresh the missing papers board.</p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
function getAnalyticsSubjectCode(item, fallback) {
  const source = String(item?.shortCode || item?.subjectCode || item?.subject || fallback || '').toLowerCase();
  const direct = String(item?.shortCode || item?.subjectCode || '').trim();
  if (direct && direct.length <= 8) return direct.toUpperCase();

  const subjectCodes = [
    [/data\s*structures?|algorithms?|\bdsa\b/, 'DSA'],
    [/discrete\s*math|\bdm\b/, 'DM'],
    [/digital\s*logic|dld|digital\s*design|\bdd\b/, 'DLD/DD'],
    [/probability|statistics|\bpsa\b/, 'PSA'],
    [/analog|communication|\badc\b/, 'ADC'],
    [/computer\s*architecture|organisation|organization|\bcao\b/, 'CAO'],
    [/electronic\s*devices?|circuits?|\bedc\b/, 'EDC'],
    [/database|\bdbms\b/, 'DBMS'],
    [/operating\s*system|\bos\b/, 'OS'],
    [/computer\s*network|\bcn\b/, 'CN'],
    [/software\s*engineering|\bse\b/, 'SE'],
    [/machine\s*learning|\bml\b/, 'ML']
  ];

  const match = subjectCodes.find(([pattern]) => pattern.test(source));
  if (match) return match[1];

  return String(fallback || '')
    .replace(/\.\.\.$/, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'SUB';
}

function SimpleBarChart({ data, xKey, yKey, colors = ['#0f9f9f'], height = 320, variant = 'subject' }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const items = Array.isArray(data) ? data : [];
  const width = 720;
  const margin = variant === 'subject'
    ? { top: 42, right: 28, bottom: 70, left: 56 }
    : { top: 38, right: 28, bottom: 54, left: 56 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(...items.map((item) => Number(item?.[yKey] || 0)), 1);
  const slotWidth = items.length ? chartWidth / items.length : chartWidth;
  const barWidth = Math.max(18, Math.min(54, slotWidth * 0.58));
  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const activeItem = activeIndex !== null ? items[activeIndex] : null;

  return (
    <div className="analytics-svg-chart-wrap">
      <svg
        className="analytics-svg-chart"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label="Analytics bar chart"
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setActiveIndex(null)}
      >
        <g transform={`translate(${margin.left} ${margin.top})`}>
          {gridLines.map((ratio) => {
            const y = chartHeight - ratio * chartHeight;
            const value = Math.round(maxValue * ratio);

            return (
              <g key={ratio}>
                <line x1="0" y1={y} x2={chartWidth} y2={y} className="analytics-chart-grid-line" />
                <text x="-12" y={y + 4} textAnchor="end" className="analytics-chart-axis-text">
                  {value}
                </text>
              </g>
            );
          })}

          <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} className="analytics-chart-axis-line" />

          {items.map((item, index) => {
            const value = Number(item?.[yKey] || 0);
            const barHeight = Math.max(value > 0 ? 4 : 0, (value / maxValue) * chartHeight);
            const x = index * slotWidth + (slotWidth - barWidth) / 2;
            const y = chartHeight - barHeight;
            const rawLabel = String(item?.[xKey] || '');
            const label = variant === 'subject' ? getAnalyticsSubjectCode(item, rawLabel) : rawLabel;
            const fill = colors[index % colors.length] || colors[0];
            const isActive = activeIndex === index;

            return (
              <g
                key={`${rawLabel}-${index}`}
                className={`analytics-bar-group ${isActive ? 'is-active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                tabIndex="0"
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
              >
                <rect
                  x={x - 4}
                  y={0}
                  width={barWidth + 8}
                  height={chartHeight}
                  fill="transparent"
                />
                <rect
                  x={x}
                  y={isActive ? Math.max(0, y - 5) : y}
                  width={barWidth}
                  height={isActive ? Math.min(chartHeight, barHeight + 5) : barHeight}
                  rx="9"
                  fill={fill}
                  className="analytics-bar-rect"
                />
                <text x={x + barWidth / 2} y={Math.max(12, y - 10)} textAnchor="middle" className="analytics-chart-value-label">
                  {value}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + (variant === 'subject' ? 32 : 28)}
                  textAnchor="middle"
                  className="analytics-chart-x-label"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {activeItem && (
        <div className="analytics-chart-tooltip">
          {variant === 'subject' ? (
            <>
              <strong>{activeItem.subject || activeItem[xKey] || 'Subject'}</strong>
              <span>Views: {Number(activeItem.views || 0).toLocaleString('en-IN')}</span>
              <span>Downloads: {Number(activeItem.downloads || 0).toLocaleString('en-IN')}</span>
              <span>Activity Score: {Number(activeItem[yKey] || 0).toLocaleString('en-IN')}</span>
            </>
          ) : (
            <>
              <strong>{activeItem[xKey] || 'Semester'}</strong>
              <span>Papers Count: {Number(activeItem[yKey] || 0).toLocaleString('en-IN')}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SimplePieChart({ data, colors = ['#0f9f9f'], size = 220 }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const items = Array.isArray(data) ? data : [];
  const total = items.reduce((sum, item) => sum + Number(item?.value || 0), 0) || 1;
  const radius = size * 0.42;
  const innerRadius = size * 0.24;
  const center = size / 2;
  let startAngle = -90;

  const polarToCartesian = (angle, r) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: center + r * Math.cos(radians),
      y: center + r * Math.sin(radians)
    };
  };

  const describeArc = (start, end) => {
    const outerStart = polarToCartesian(start, radius);
    const outerEnd = polarToCartesian(end, radius);
    const innerEnd = polarToCartesian(end, innerRadius);
    const innerStart = polarToCartesian(start, innerRadius);
    const largeArcFlag = end - start > 180 ? 1 : 0;

    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
      'Z'
    ].join(' ');
  };

  return (
    <div className="analytics-donut-wrap">
      <svg
        className="analytics-donut-svg"
        viewBox={`0 0 ${size} ${size}`}
        width="100%"
        height={size}
        role="img"
        aria-label="Analytics exam type pie chart"
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setActiveIndex(null)}
      >
        {items.map((item, index) => {
          const value = Number(item?.value || 0);
          const angle = items.length === 1 ? 359.99 : (value / total) * 360;
          const endAngle = startAngle + angle;
          const path = describeArc(startAngle, endAngle);
          const midPoint = polarToCartesian(startAngle + angle / 2, (radius + innerRadius) / 2);
          const percent = Math.round((value / total) * 100);
          startAngle = endAngle;
          const isActive = activeIndex === index;

          return (
            <g
              key={`${item.name}-${index}`}
              className={`analytics-donut-slice ${isActive ? 'is-active' : ''}`}
              transform={isActive ? `translate(${center} ${center}) scale(1.045) translate(${-center} ${-center})` : undefined}
              onMouseEnter={() => setActiveIndex(index)}
              tabIndex="0"
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
            >
              <path d={path} fill={colors[index % colors.length] || colors[0]} />
              {percent >= 8 && (
                <text x={midPoint.x} y={midPoint.y + 4} textAnchor="middle" fontSize="12" fontWeight="800" fill="#ffffff">
                  {percent}%
                </text>
              )}
            </g>
          );
        })}
        <circle cx={center} cy={center} r={innerRadius - 2} fill="var(--surface)" />
        <text x={center} y={center - 3} textAnchor="middle" fontSize="24" fontWeight="800" fill="var(--text)">
          {total}
        </text>
        <text x={center} y={center + 18} textAnchor="middle" fontSize="11" fill="var(--muted)">
          papers
        </text>
      </svg>

      {activeIndex !== null && items[activeIndex] && (
        <div className="analytics-chart-tooltip analytics-donut-tooltip">
          <strong>{items[activeIndex].name}</strong>
          <span>Count: {Number(items[activeIndex].value || 0).toLocaleString('en-IN')}</span>
          <span>Share: {Math.round((Number(items[activeIndex].value || 0) / total) * 100)}%</span>
        </div>
      )}

      <div className="analytics-donut-legend">
        {items.map((item, index) => {
          const value = Number(item?.value || 0);
          const percent = Math.round((value / total) * 100);

          return (
            <div
              key={`${item.name}-legend-${index}`}
              className={`analytics-donut-legend-item ${activeIndex === index ? 'is-active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <span style={{ background: colors[index % colors.length] || colors[0] }} />
              <span>{item.name}</span>
              <strong>{value} ({percent}%)</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// V2 Page: Analytics Dashboard Screen
function AnalyticsPage({ user, setUser, theme, toggleTheme, isAdmin, setIsAdmin, toast }) {
  const [data, setData] = useState(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');

  const safeArray = (value) => Array.isArray(value) ? value : [];

  useEffect(() => {
    let mounted = true;

    const loadAnalytics = async () => {
      setLoading(true);

      try {
        const [analyticsRes, papersRes] = await Promise.allSettled([
          axios.get(`${API_URL}/api/analytics`),
          axios.get(`${API_URL}/api/papers`)
        ]);

        if (!mounted) return;

        if (analyticsRes.status === 'fulfilled') {
          setData(analyticsRes.value.data || {});
        } else {
          setData({});
          toast('Failed to load analytics', 'error');
        }

        if (papersRes.status === 'fulfilled') {
          const paperData = papersRes.value.data;
          setPapers(Array.isArray(paperData) ? paperData : safeArray(paperData?.papers));
        } else {
          setPapers([]);
        }
      } catch (error) {
        if (!mounted) return;
        setData({});
        setPapers([]);
        toast('Failed to load analytics', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAnalytics();

    return () => {
      mounted = false;
    };
  }, [toast]);

  const analyticsData = data || {};
  const subjects = safeArray(analyticsData.subjects);

  const subjectChartData = useMemo(() => {
    const fromApi = subjects.map((item) => ({
      subject: item.subject || item.name || 'Unknown',
      shortSubject: String(item.subject || item.name || 'Unknown').length > 18
        ? `${String(item.subject || item.name || 'Unknown').slice(0, 18)}...`
        : String(item.subject || item.name || 'Unknown'),
      activity: Number(item.difficultyScore || item.activityScore || (Number(item.views || 0) + Number(item.downloads || 0) + Number(item.paperCount || item.papers || item.count || 0) * 5)),
      views: Number(item.views || 0),
      downloads: Number(item.downloads || 0),
      papers: Number(item.paperCount || item.papers || item.count || 1)
    }));

    if (fromApi.length) {
      return fromApi.filter((item) => item.activity > 0 || item.papers > 0).sort((a, b) => b.activity - a.activity).slice(0, 8);
    }

    const map = {};

    papers.forEach((paper) => {
      const subject = paper.subject || paper.normalizedSubject || paper.title || 'Unknown';

      if (!map[subject]) {
        map[subject] = {
          subject,
          shortSubject: subject.length > 18 ? `${subject.slice(0, 18)}...` : subject,
          activity: 0,
          views: 0,
          downloads: 0,
          papers: 0
        };
      }

      map[subject].views += Number(paper.views || 0);
      map[subject].downloads += Number(paper.downloads || 0);
      map[subject].papers += 1;
      map[subject].activity =
        map[subject].views + map[subject].downloads + map[subject].papers * 5;
    });

    return Object.values(map)
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 8);
  }, [subjects, papers]);

  const examTypeData = useMemo(() => {
    const fromApi = safeArray(analyticsData.examTypeDistribution);
    if (fromApi.length) {
      return fromApi
        .map((item) => ({
          name: item.examType || item.name || 'Unknown',
          value: Number(item.paperCount || item.value || item.count || 0)
        }))
        .filter((item) => item.value > 0);
    }

    const map = {};

    papers.forEach((paper) => {
      const type = paper.examType || 'Unknown';
      map[type] = (map[type] || 0) + 1;
    });

    return ['Mid-Sem', 'End-Sem']
      .map((name) => ({ name, value: Number(map[name] || 0) }))
      .filter((item) => item.value > 0);
  }, [analyticsData.examTypeDistribution, papers]);

  const semesterData = useMemo(() => {
    const fromApi = safeArray(analyticsData.semesterDistribution);
    if (fromApi.length) {
      return fromApi
        .map((item) => ({
          semester: item.semester ? `Sem ${item.semester}` : item.name || 'Unknown',
          papers: Number(item.paperCount || item.count || item.value || 0)
        }))
        .filter((item) => item.papers > 0)
        .sort((a, b) => {
          const aNum = Number(String(a.semester).replace(/\D/g, '')) || 99;
          const bNum = Number(String(b.semester).replace(/\D/g, '')) || 99;
          return aNum - bNum;
        });
    }

    const map = {};

    papers.forEach((paper) => {
      const sem = paper.semester ? `Sem ${paper.semester}` : 'Unknown';
      map[sem] = (map[sem] || 0) + 1;
    });

    return Object.entries(map)
      .map(([semester, papers]) => ({ semester, papers }))
      .sort((a, b) => {
        const aNum = Number(String(a.semester).replace(/\D/g, '')) || 99;
        const bNum = Number(String(b.semester).replace(/\D/g, '')) || 99;
        return aNum - bNum;
      });
  }, [analyticsData.semesterDistribution, papers]);

  const trendingSubjects = useMemo(() => {
    const fromApi = safeArray(analyticsData.trendingSubjects);

    if (fromApi.length) {
      return fromApi.slice(0, 5).map((item) => (
        typeof item === 'string' ? item : item.subject || item.name || 'Unknown'
      ));
    }

    return subjectChartData.slice(0, 5).map((item) => item.subject);
  }, [analyticsData.trendingSubjects, subjectChartData]);

  const mostViewedPapers = useMemo(() => {
    const fromApi = safeArray(analyticsData.mostViewedPapers);

    if (fromApi.length) return fromApi.slice(0, 5);

    return [...papers]
      .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
      .slice(0, 5);
  }, [analyticsData.mostViewedPapers, papers]);

  const mostDownloadedPapers = useMemo(() => {
    const fromApi = safeArray(analyticsData.mostDownloadedPapers);

    if (fromApi.length) return fromApi.slice(0, 5);

    return [...papers]
      .sort((a, b) => Number(b.downloads || 0) - Number(a.downloads || 0))
      .slice(0, 5);
  }, [analyticsData.mostDownloadedPapers, papers]);

  const totalPapers = analyticsData.totalPapers ?? papers.length;

  const totalViews =
    analyticsData.totalViews ??
    papers.reduce((sum, paper) => sum + Number(paper.views || 0), 0);

  const totalDownloads =
    analyticsData.totalDownloads ??
    papers.reduce((sum, paper) => sum + Number(paper.downloads || 0), 0);

  const mostActiveSubject =
    analyticsData.hardestSubject ||
    subjectChartData?.[0]?.subject ||
    'No data yet';

  const chartColors = ['#0f9f9f', '#38d7d4', '#087373', '#6ee7e3'];

  return (
    <div className="app-container">
      <Helmet>
        <title>Analytics - PaperStack</title>
        <meta
          name="description"
          content="PaperStack analytics dashboard for IIIT Surat previous year question papers."
        />
      </Helmet>

      <Navbar
        user={user}
        setUser={setUser}
        theme={theme}
        toggleTheme={toggleTheme}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        toast={toast}
      />

      <main className="analytics-dashboard-page">
        <Link to="/" className="analytics-back-link">
          Back to papers
        </Link>

        <section className="analytics-hero-panel">
          <div className="analytics-hero-copy">
            <span className="analytics-label">PaperStack Insights</span>
            <h1>Archive Analytics Dashboard</h1>
            <p>
              Track paper views, downloads, trending subjects, semester coverage, and student activity patterns.
            </p>
          </div>

          <div className="analytics-highlight-card">
            <span>Most Active Subject</span>
            <strong>{mostActiveSubject}</strong>
            <p>Based on views, downloads, and archive activity.</p>
          </div>
        </section>

        {loading ? (
          <section className="analytics-loading-card">
            <PaperStackLoader label="Preparing dashboard insights..." />
          </section>
        ) : (
          <>
            <section className="analytics-kpi-grid">
              <div className="analytics-kpi-card">
                <span>Total Papers</span>
                <strong>{formatNumber(totalPapers)}</strong>
                <p>Uploaded in archive</p>
              </div>

              <div className="analytics-kpi-card">
                <span>Total Views</span>
                <strong>{formatNumber(totalViews)}</strong>
                <p>Paper views by students</p>
              </div>

              <div className="analytics-kpi-card">
                <span>Total Downloads</span>
                <strong>{formatNumber(totalDownloads)}</strong>
                <p>PDF downloads recorded</p>
              </div>

              <div className="analytics-kpi-card">
                <span>Subjects Tracked</span>
                <strong>{formatNumber(subjectChartData.length)}</strong>
                <p>Active subject categories</p>
              </div>
            </section>

            <section className="analytics-grid analytics-grid-main">
              <div className="analytics-card analytics-chart-card analytics-card-large">
                <div className="analytics-card-header">
                  <div>
                    <h2>Subject Activity Score</h2>
                    <p>Views + downloads + paper activity combined.</p>
                  </div>
                  <span className="analytics-mini-badge">Top 8</span>
                </div>

                {subjectChartData.length ? (
                  <div className="analytics-chart-shell">
                    <SimpleBarChart data={subjectChartData} xKey="shortSubject" yKey="activity" colors={chartColors} height={320} />
                  </div>
                ) : (
                  <div className="analytics-empty-chart">No subject activity data yet.</div>
                )}
              </div>

              <div className="analytics-card analytics-chart-card">
                <div className="analytics-card-header">
                  <div>
                    <h2>Exam Type Split</h2>
                    <p>Mid-sem vs end-sem coverage.</p>
                  </div>
                </div>

                {examTypeData.length ? (
                  <div className="analytics-chart-shell small">
                    <SimplePieChart data={examTypeData} colors={chartColors} size={220} />
                  </div>
                ) : (
                  <div className="analytics-empty-chart">No exam type data yet.</div>
                )}
              </div>
            </section>

            <section className="analytics-grid">
              <div className="analytics-card analytics-chart-card">
                <div className="analytics-card-header">
                  <div>
                    <h2>Semester Coverage</h2>
                    <p>How many papers are available semester-wise.</p>
                  </div>
                </div>

                {semesterData.length ? (
                  <div className="analytics-chart-shell small">
                    <SimpleBarChart data={semesterData} xKey="semester" yKey="papers" colors={['#0f9f9f']} height={280} variant="semester" />
                  </div>
                ) : (
                  <div className="analytics-empty-chart">No semester data yet.</div>
                )}
              </div>

              <div className="analytics-card analytics-trending-card">
                <div className="analytics-card-header">
                  <div>
                    <h2>Trending Subjects</h2>
                    <p>Subjects students are opening the most.</p>
                  </div>
                </div>

                {trendingSubjects.length ? (
                  <div className="analytics-trending-list">
                    {trendingSubjects.map((subject, index) => (
                      <div className="analytics-trending-item" key={`${subject}-${index}`}>
                        <span>#{index + 1}</span>
                        <strong>{subject}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="analytics-empty-state">No trending subjects yet.</div>
                )}
              </div>
            </section>

            <section className="analytics-grid">
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <div>
                    <h2>Most Viewed Papers</h2>
                    <p>Papers students open most frequently.</p>
                  </div>
                </div>

                {mostViewedPapers.length ? (
                  <div className="analytics-paper-list">
                    {mostViewedPapers.map((paper, index) => (
                      <div className="analytics-paper-row" key={paper._id || `${paper.subject}-${index}`}>
                        <span className="analytics-rank">#{index + 1}</span>
                        <div>
                          <strong>{paper.subject || paper.title || 'Untitled Paper'}</strong>
                          <p>{paper.examType || 'Exam'} · {paper.year || 'Year'} · {paper.branch || 'Branch'}</p>
                        </div>
                        <b>{formatNumber(paper.views || 0)}</b>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="analytics-empty-state">No viewed papers yet.</div>
                )}
              </div>

              <div className="analytics-card">
                <div className="analytics-card-header">
                  <div>
                    <h2>Most Downloaded Papers</h2>
                    <p>High-demand PDFs by downloads.</p>
                  </div>
                </div>

                {mostDownloadedPapers.length ? (
                  <div className="analytics-paper-list">
                    {mostDownloadedPapers.map((paper, index) => (
                      <div className="analytics-paper-row" key={paper._id || `${paper.subject}-download-${index}`}>
                        <span className="analytics-rank">#{index + 1}</span>
                        <div>
                          <strong>{paper.subject || paper.title || 'Untitled Paper'}</strong>
                          <p>{paper.examType || 'Exam'} · {paper.year || 'Year'} · {paper.branch || 'Branch'}</p>
                        </div>
                        <b>{formatNumber(paper.downloads || 0)}</b>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="analytics-empty-state">No downloaded papers yet.</div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

// V2 Page: Admin Contribution Hub
function AdminContributionsPage({ toast }) {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchContributions = useCallback(() => {
    setLoading(true);
    axios.get(`${API_URL}/api/admin/contributions`, { headers: adminHeader() })
      .then(res => setContributions(res.data))
      .catch(() => toast('Failed to load contributions', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    fetchContributions();
  }, [fetchContributions]);

  const handleApprove = async (item) => {
    if (!window.confirm(`Approve and publish: ${item.subject}?`)) return;
    try {
      await axios.patch(`${API_URL}/api/admin/contributions/${item._id}/approve`, {}, { headers: adminHeader() });
      toast('Contribution approved and published successfully!', 'success');
      fetchContributions();
    } catch (err) {
      toast(err.response?.data?.error || 'Approval failed', 'error');
    }
  };

  const handleReject = async (item) => {
    const adminNote = window.prompt('Enter reason for rejection:');
    if (adminNote === null) return;
    try {
      await axios.patch(`${API_URL}/api/admin/contributions/${item._id}/reject`, { adminNote }, { headers: adminHeader() });
      toast('Contribution rejected.', 'info');
      fetchContributions();
    } catch (err) {
      toast('Rejection failed', 'error');
    }
  };

  return (
    <div className="app-container">
      <Navbar user={null} setUser={() => {}} theme="light" toggleTheme={() => {}} isAdmin={true} setIsAdmin={() => {}} toast={toast} />
      <main className="page-shell">
        <Link to="/" className="page-back-link">Back to papers</Link>
        
        <div className="contributors-header">
          <h1>Admin Contribution review Hub</h1>
          <p className="page-lead">Review student submissions and confirm them to credit contributors and publish them.</p>
        </div>

        {loading ? (
          <div className="analytics-state">Loading contributions...</div>
        ) : (
          <div className="admin-contributions-list">
            {contributions.map(item => (
              <div key={item._id} className="auth-card admin-contrib-card">
                <div className="admin-contrib-details">
                  <h4>{item.subject}</h4>
                  <p><strong>Title:</strong> {item.title} | <strong>Exam:</strong> {item.examType} ({item.year}) | <strong>Sem:</strong> {item.semester}</p>
                  <p><strong>Contributor:</strong> {item.contributorName} (${item.contributorEmail})</p>
                  {item.notes && <p className="notes-para"><strong>Notes:</strong> {item.notes}</p>}
                  <p className="status-pill-v2">Status: <span className={`status-${item.status}`}>{item.status.toUpperCase()}</span></p>
                </div>
                <div className="admin-contrib-actions">
                  <a href={item.paperUrl} target="_blank" rel="noopener noreferrer" className="btn-view-contrib">View PDF</a>
                  {item.solutionUrl && <a href={item.solutionUrl} target="_blank" rel="noopener noreferrer" className="btn-view-sol-contrib">View Sol</a>}
                  
                  {item.status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(item)} className="btn-approve-contrib">Approve</button>
                      <button onClick={() => handleReject(item)} className="btn-reject-contrib">Reject</button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {contributions.length === 0 && <p className="no-data-notice">No contributions submitted yet.</p>}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

// V2 Page: Admin Reports panel page
function AdminReportsPage({ toast }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(() => {
    setLoading(true);
    axios.get(`${API_URL}/api/admin/reports`, { headers: adminHeader() })
      .then(res => setReports(res.data))
      .catch(() => toast('Failed to load reports', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleUpdateStatus = async (item, status) => {
    try {
      await axios.patch(`${API_URL}/api/admin/reports/${item._id}`, { status }, { headers: adminHeader() });
      toast('Report updated successfully', 'success');
      fetchReports();
    } catch (err) {
      toast('Failed to update report', 'error');
    }
  };

  return (
    <div className="app-container">
      <Navbar user={null} setUser={() => {}} theme="light" toggleTheme={() => {}} isAdmin={true} setIsAdmin={() => {}} toast={toast} />
      <main className="page-shell">
        <Link to="/" className="page-back-link">Back to papers</Link>

        <div className="contributors-header">
          <h1>Admin Reports Hub</h1>
          <p className="page-lead">Review wrong detail reports and PDF issues reported by students.</p>
        </div>

        {loading ? (
          <div className="analytics-state">Loading reports...</div>
        ) : (
          <div className="admin-contributions-list">
            {reports.map(item => (
              <div key={item._id} className="auth-card admin-contrib-card">
                <div className="admin-contrib-details">
                  <h4>Paper: {item.paperTitle}</h4>
                  <p><strong>Reporter:</strong> {item.reporterName} ({item.reporterEmail})</p>
                  <p style={{ color: '#ef4444' }}><strong>Reason:</strong> {item.reason}</p>
                  <p className="notes-para"><strong>Details:</strong> {item.message}</p>
                  <p className="status-pill-v2">Status: <span className={`status-${item.status}`}>{item.status.toUpperCase()}</span></p>
                </div>
                <div className="admin-contrib-actions">
                  {item.status !== 'resolved' && (
                    <>
                      <button onClick={() => handleUpdateStatus(item, 'reviewed')} className="btn-view-sol-contrib">Mark Reviewed</button>
                      <button onClick={() => handleUpdateStatus(item, 'resolved')} className="btn-approve-contrib">Mark Resolved</button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {reports.length === 0 && <p className="no-data-notice">No issue reports submitted yet.</p>}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

const ADMIN_UPLOAD_INITIAL_FORM = {
  subject: '',
  subjectCode: '',
  branch: 'CSE',
  semester: '1',
  year: new Date().getFullYear().toString(),
  examType: 'Mid-Sem',
  notes: ''
};

const CSV_TEMPLATE_CONTENT = `fileName,solutionFileName,branch,semester,subject,subjectCode,examType,year,title
dsa_mid_2024.pdf,dsa_mid_2024_solution.pdf,CSE,2,Data Structure and Algorithms,DSA,Mid-Sem,2024,Branch : CSE
dm_mid_2024.pdf,,CSE & ECE,2,Discrete Mathematics,DM,Mid-Sem,2024,Branch : CSE & ECE
`;

function AdminAccessRequired({ setIsAdmin, toast, theme, toggleTheme }) {
  const navigate = useNavigate();

  return (
    <div className="app-container">
      <Navbar user={null} setUser={() => {}} theme={theme} toggleTheme={toggleTheme} isAdmin={false} setIsAdmin={setIsAdmin} toast={toast} />
      <main className="admin-upload-page">
        <section className="admin-upload-access-card">
          <h1>Admin access required</h1>
          <p>Please verify admin access before opening this admin panel.</p>
          <button type="button" className="login-btn-gradient" onClick={() => navigate('/admin')}>
            Go to Admin Login
          </button>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function AdminUploadCenter({ isAdmin, setIsAdmin, toast, theme, toggleTheme }) {
  const [uploadMode, setUploadMode] = useState('single');
  const [singleForm, setSingleForm] = useState(ADMIN_UPLOAD_INITIAL_FORM);
  const [paperFile, setPaperFile] = useState(null);
  const [solutionFile, setSolutionFile] = useState(null);
  const [singleUploading, setSingleUploading] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [paperFiles, setPaperFiles] = useState([]);
  const [solutionFiles, setSolutionFiles] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewSummary, setPreviewSummary] = useState(null);
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const navigate = useNavigate();

  const clearBulkPreview = () => {
    setPreviewRows([]);
    setPreviewSummary(null);
    setBulkResults([]);
  };

  const fileListLabel = (files) => files.length ? `${files.length} file${files.length === 1 ? '' : 's'} selected` : 'No files selected';

  const downloadCsvTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE_CONTENT], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'paperstack_bulk_upload_template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const submitSingleUpload = async (event) => {
    event.preventDefault();
    if (!paperFile) {
      toast('Paper PDF file is required.', 'error');
      return;
    }
    if (!paperFile.name.toLowerCase().endsWith('.pdf')) {
      toast('Paper file must be a PDF.', 'error');
      return;
    }
    if (solutionFile && !solutionFile.name.toLowerCase().endsWith('.pdf')) {
      toast('Solution file must be a PDF.', 'error');
      return;
    }

    setSingleUploading(true);
    try {
      const data = new FormData();
      Object.entries(singleForm).forEach(([key, value]) => data.append(key, value));
      data.append('paperFile', paperFile);
      if (solutionFile) data.append('solutionFile', solutionFile);
      const res = await axios.post(`${API_URL}/api/admin/upload/single`, data, {
        headers: { ...adminHeader(), 'Content-Type': 'multipart/form-data' }
      });
      toast(res.data.message || 'Paper uploaded successfully', 'success');
      setSingleForm(ADMIN_UPLOAD_INITIAL_FORM);
      setPaperFile(null);
      setSolutionFile(null);
      event.target.reset();
    } catch (err) {
      const uploadError = err.response?.data;
      toast(uploadError?.error || uploadError?.message || 'Paper upload failed', 'error');
    } finally {
      setSingleUploading(false);
    }
  };

  const buildBulkFormData = () => {
    const data = new FormData();
    if (csvFile) data.append('csv', csvFile);
    paperFiles.forEach((file) => data.append('papers', file));
    solutionFiles.forEach((file) => data.append('solutions', file));
    return data;
  };

  const previewBulkUpload = async () => {
    if (!csvFile) {
      toast('CSV mapping file is required.', 'error');
      return;
    }
    if (!paperFiles.length) {
      toast('Select at least one paper PDF.', 'error');
      return;
    }

    setBulkUploading(true);
    setBulkResults([]);
    try {
      const res = await axios.post(`${API_URL}/api/admin/upload/bulk/preview`, buildBulkFormData(), {
        headers: { ...adminHeader(), 'Content-Type': 'multipart/form-data' }
      });
      setPreviewRows(res.data.rows || []);
      setPreviewSummary(res.data.summary || null);
      toast('CSV preview generated.', 'success');
    } catch (err) {
      toast(err.response?.data?.message || err.response?.data?.error || 'Bulk preview failed', 'error');
    } finally {
      setBulkUploading(false);
    }
  };

  const confirmBulkUpload = async () => {
    if (!previewSummary || previewSummary.errorRows > 0) {
      toast('Fix preview errors before confirming bulk upload.', 'error');
      return;
    }

    setBulkUploading(true);
    try {
      const res = await axios.post(`${API_URL}/api/admin/upload/bulk/confirm`, buildBulkFormData(), {
        headers: { ...adminHeader(), 'Content-Type': 'multipart/form-data' }
      });
      setBulkResults(res.data.results || []);
      const summary = res.data.summary || {};
      toast(`Bulk upload completed: ${summary.uploaded || 0} uploaded, ${summary.skipped || 0} skipped, ${summary.failed || 0} failed.`, summary.failed ? 'warning' : 'success');
    } catch (err) {
      const rows = err.response?.data?.rows;
      if (Array.isArray(rows)) {
        setPreviewRows(rows);
        setPreviewSummary({
          totalRows: rows.length,
          readyRows: rows.filter((row) => !row.errors?.length).length,
          errorRows: rows.filter((row) => row.errors?.length).length
        });
      }
      toast(err.response?.data?.message || err.response?.data?.error || 'Bulk upload failed', 'error');
    } finally {
      setBulkUploading(false);
    }
  };

  const statusClass = (status = '') => String(status).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const confirmDisabled = !previewSummary || previewSummary.errorRows > 0 || bulkUploading;

  if (!isAdmin) {
    return (
      <div className="app-container">
        <Navbar user={null} setUser={() => {}} theme={theme} toggleTheme={toggleTheme} isAdmin={false} setIsAdmin={setIsAdmin} toast={toast} />
        <main className="admin-upload-page">
          <section className="admin-upload-access-card">
            <h1>Admin access required</h1>
            <p>Please verify admin access before uploading papers to PaperStack.</p>
            <button type="button" className="login-btn-gradient" onClick={() => navigate('/admin')}>
              Go to Admin Login
            </button>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Helmet>
        <title>Admin Upload Center - PaperStack</title>
        <meta name="description" content="Admin upload center for PaperStack question papers." />
      </Helmet>
      <Navbar user={null} setUser={() => {}} theme={theme} toggleTheme={toggleTheme} isAdmin={isAdmin} setIsAdmin={setIsAdmin} toast={toast} />

      <main className="admin-upload-page">
        <Link to="/" className="page-back-link">Back to papers</Link>

        <section className="admin-upload-hero">
          <span>Admin Upload Center</span>
          <h1>Upload Papers to PaperStack</h1>
          <p>Use single upload for one paper, or bulk upload with CSV mapping for many papers.</p>
        </section>

        <section className="admin-upload-shell">
          <div className="admin-upload-tabs" role="tablist" aria-label="Upload mode">
            <button type="button" className={uploadMode === 'single' ? 'active' : ''} onClick={() => setUploadMode('single')}>
              Single Upload
            </button>
            <button type="button" className={uploadMode === 'bulk' ? 'active' : ''} onClick={() => setUploadMode('bulk')}>
              Bulk Upload
            </button>
          </div>

          {uploadMode === 'single' ? (
            <form className="admin-upload-form" onSubmit={submitSingleUpload}>
              <div className="admin-upload-grid">
                <label>Subject Name <span>*</span>
                  <input value={singleForm.subject} onChange={(e) => setSingleForm({ ...singleForm, subject: e.target.value })} placeholder="Data Structure and Algorithms" required />
                </label>
                <label>Subject Code / Title Details
                  <input value={singleForm.subjectCode} onChange={(e) => setSingleForm({ ...singleForm, subjectCode: e.target.value })} placeholder="DSA" />
                </label>
                <label>Branch <span>*</span>
                  <select value={singleForm.branch} onChange={(e) => setSingleForm({ ...singleForm, branch: e.target.value })}>
                    <option>CSE</option>
                    <option>ECE</option>
                    <option>CSE & ECE</option>
                  </select>
                </label>
                <label>Semester <span>*</span>
                  <select value={singleForm.semester} onChange={(e) => setSingleForm({ ...singleForm, semester: e.target.value })}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => <option key={sem} value={sem}>Semester {sem}</option>)}
                  </select>
                </label>
                <label>Exam Year <span>*</span>
                  <input type="number" value={singleForm.year} onChange={(e) => setSingleForm({ ...singleForm, year: e.target.value })} required />
                </label>
                <label>Exam Type <span>*</span>
                  <select value={singleForm.examType} onChange={(e) => setSingleForm({ ...singleForm, examType: e.target.value })}>
                    <option>Mid-Sem</option>
                    <option>End-Sem</option>
                  </select>
                </label>
              </div>

              <div className="admin-upload-file-grid">
                <label className="admin-upload-file-box">Paper PDF File <span>*</span>
                  <input type="file" accept="application/pdf,.pdf" onChange={(e) => setPaperFile(e.target.files?.[0] || null)} required />
                  <strong>{paperFile?.name || 'Choose paper PDF'}</strong>
                </label>
                <label className="admin-upload-file-box">Optional Solution PDF
                  <input type="file" accept="application/pdf,.pdf" onChange={(e) => setSolutionFile(e.target.files?.[0] || null)} />
                  <strong>{solutionFile?.name || 'Choose solution PDF'}</strong>
                </label>
              </div>

              <label className="admin-upload-notes">Notes / Message
                <textarea rows={3} value={singleForm.notes} onChange={(e) => setSingleForm({ ...singleForm, notes: e.target.value })} placeholder="Optional notes for future reference" />
              </label>

              <button type="submit" className="login-btn-gradient admin-upload-submit" disabled={singleUploading}>
                {singleUploading ? 'Uploading...' : 'Confirm Upload'}
              </button>
            </form>
          ) : (
            <div className="admin-upload-form">
              <div className="admin-upload-file-grid">
                <label className="admin-upload-file-box">CSV Mapping File <span>*</span>
                  <input type="file" accept=".csv,text/csv" onChange={(e) => { setCsvFile(e.target.files?.[0] || null); clearBulkPreview(); }} />
                  <strong>{csvFile?.name || 'Choose CSV file'}</strong>
                </label>
                <label className="admin-upload-file-box">Paper PDFs <span>*</span>
                  <input type="file" accept="application/pdf,.pdf" multiple onChange={(e) => { setPaperFiles(Array.from(e.target.files || [])); clearBulkPreview(); }} />
                  <strong>{fileListLabel(paperFiles)}</strong>
                </label>
                <label className="admin-upload-file-box">Optional Solution PDFs
                  <input type="file" accept="application/pdf,.pdf" multiple onChange={(e) => { setSolutionFiles(Array.from(e.target.files || [])); clearBulkPreview(); }} />
                  <strong>{fileListLabel(solutionFiles)}</strong>
                </label>
              </div>

              <div className="admin-upload-template-card">
                <div>
                  <h3>CSV template</h3>
                  <p>Required columns: fileName, solutionFileName, branch, semester, subject, subjectCode, examType, year, title</p>
                </div>
                <button type="button" onClick={downloadCsvTemplate}>Download CSV Template</button>
                <pre>{CSV_TEMPLATE_CONTENT.trim()}</pre>
              </div>

              <div className="admin-upload-actions-row">
                <button type="button" className="login-btn-gradient" onClick={previewBulkUpload} disabled={bulkUploading}>
                  {bulkUploading ? 'Working...' : 'Preview CSV'}
                </button>
                <button type="button" className="admin-upload-secondary-btn" onClick={confirmBulkUpload} disabled={confirmDisabled}>
                  Confirm Bulk Upload
                </button>
              </div>

              {previewSummary && (
                <div className="admin-upload-summary">
                  <span>Total rows: {previewSummary.totalRows}</span>
                  <span>Ready: {previewSummary.readyRows}</span>
                  <span>Errors: {previewSummary.errorRows}</span>
                </div>
              )}

              {previewRows.length > 0 && (
                <div className="admin-upload-table-wrap">
                  <table className="admin-upload-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>File Name</th>
                        <th>Branch</th>
                        <th>Semester</th>
                        <th>Subject</th>
                        <th>Exam Type</th>
                        <th>Year</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row) => (
                        <tr key={`${row.rowNumber}-${row.fileName}`}>
                          <td>{row.rowNumber}</td>
                          <td>{row.fileName}</td>
                          <td>{row.branch}</td>
                          <td>{row.semester}</td>
                          <td>{row.subject}</td>
                          <td>{row.examType}</td>
                          <td>{row.year}</td>
                          <td>
                            <span className={`admin-upload-status status-${statusClass(row.status)}`}>{row.status}</span>
                            {row.errors?.length > 0 && <small>{row.errors.join(', ')}</small>}
                            {row.warnings?.length > 0 && <small className="warning">{row.warnings.join(', ')}</small>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {bulkResults.length > 0 && (
                <div className="admin-upload-table-wrap">
                  <h3>Bulk upload results</h3>
                  <table className="admin-upload-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>File Name</th>
                        <th>Status</th>
                        <th>Paper ID / Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkResults.map((result) => (
                        <tr key={`${result.rowNumber}-${result.fileName}-${result.status}`}>
                          <td>{result.rowNumber}</td>
                          <td>{result.fileName}</td>
                          <td><span className={`admin-upload-status status-${statusClass(result.status)}`}>{result.status}</span></td>
                          <td>{result.paperId || result.error || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isAdmin, setIsAdmin] = useState(Boolean(localStorage.getItem('adminToken')));
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((items) => items.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((items) => [...items, { id, message, type }]);
    setTimeout(() => dismissToast(id), 3800);
  }, [dismissToast]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const savedSem = localStorage.getItem('userSemester');
    if (!token || !username) return;
    setUser({ username, bookmarks: [], semester: savedSem ? Number(savedSem) : null });
    axios.get(`${API_URL}/api/user/me`, { headers: authHeader() })
      .then((res) => {
        const semester = res.data.semester || res.data.currentSemester;
        setUser({
          username: res.data.username,
          email: res.data.email,
          bookmarks: res.data.bookmarks || [],
          semester,
          avatar: res.data.avatar || '',
          authProvider: res.data.authProvider || 'local',
        });
        if (semester) localStorage.setItem('userSemester', semester);
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
      });
  }, []);

  const appRoutes = (
    <Router>
      <ToastStack toasts={toasts} dismissToast={dismissToast} />
      <PWAInstallPrompt />
      <BackToTopButton />
      <Routes>
        <Route path="/" element={<Home user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} isAdmin={isAdmin} setIsAdmin={setIsAdmin} toast={toast} />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy-policy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/disclaimer" element={<DisclaimerPage />} />
        <Route path="/copyright" element={<CopyrightPage />} />
        <Route path="/paper/:id" element={<PaperSharePage user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} isAdmin={isAdmin} setIsAdmin={setIsAdmin} toast={toast} />} />
        
        {/* Interactive V2 routes */}
        <Route path="/contribute" element={<ContributePageNew user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} isAdmin={isAdmin} setIsAdmin={setIsAdmin} toast={toast} />} />
        <Route path="/contributors" element={<ContributorsPage user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} isAdmin={isAdmin} setIsAdmin={setIsAdmin} toast={toast} />} />
        <Route path="/exam-mode" element={<ExamModePage user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} isAdmin={isAdmin} setIsAdmin={setIsAdmin} toast={toast} />} />
        <Route path="/missing-papers" element={<MissingPapersPage user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} isAdmin={isAdmin} setIsAdmin={setIsAdmin} toast={toast} />} />
        <Route path="/analytics" element={<AnalyticsPage user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} isAdmin={isAdmin} setIsAdmin={setIsAdmin} toast={toast} />} />
        
        {/* Admin panel routes */}
        <Route
          path="/admin/upload"
          element={
            isAdmin ? (
              <AdminUploadCenter isAdmin={isAdmin} setIsAdmin={setIsAdmin} theme={theme} toggleTheme={toggleTheme} toast={toast} />
            ) : (
              <AdminAccessRequired setIsAdmin={setIsAdmin} theme={theme} toggleTheme={toggleTheme} toast={toast} />
            )
          }
        />
        <Route
          path="/admin/contributions"
          element={
            isAdmin ? (
              <AdminContributionsPage toast={toast} />
            ) : (
              <AdminAccessRequired setIsAdmin={setIsAdmin} theme={theme} toggleTheme={toggleTheme} toast={toast} />
            )
          }
        />
        <Route
          path="/admin/reports"
          element={
            isAdmin ? (
              <AdminReportsPage toast={toast} />
            ) : (
              <AdminAccessRequired setIsAdmin={setIsAdmin} theme={theme} toggleTheme={toggleTheme} toast={toast} />
            )
          }
        />

        <Route path="/faq" element={<FAQPage />} />
        <Route path="/login" element={<Login setUser={setUser} toast={toast} />} />
        <Route path="/register" element={<Register setUser={setUser} toast={toast} />} />
        <Route path="/admin" element={<AdminLogin setIsAdmin={setIsAdmin} toast={toast} />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );

  return appRoutes;
}
