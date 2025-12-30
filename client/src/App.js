import React, { useState, useEffect , Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { HelmetProvider , Helmet } from 'react-helmet-async';
import logo from './assets/Paperstack_logo_wt.png'; 
import './App.css';

const API_URL = 'https://paperstack-backend.onrender.com';

// --- HELPER: PAGE LOADER ---
function PageLoader() {
  return (
    <div className="page-loading-screen">
       <img src="/logo.png" alt="Loading..." style={{ height: '60px', marginBottom: '10px' }} />
       <p>Loading PaperStack...</p>
    </div>
  );
}

// --- CUSTOM ALERT COMPONENT ---
function CustomAlert({ alert }) {
  if (!alert.show) return null;
  return (
    <div className={`custom-alert alert-${alert.type}`}>
      <span>{alert.type === 'success' ? '✅' : alert.type === 'error' ? '⚠️' : 'ℹ️'}</span>
      {alert.msg}
    </div>
  );
}
function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand Section with Logo */}
          <div className="footer-brand">
            <div className="footer-logo-wrapper">
              <img src={logo} alt="PaperStack Logo" className="footer-logo-img" />
              <h3 className="footer-logo">PaperStack</h3>
            </div>
            <p className="footer-description">
              The official archive for IIIT Surat previous year papers. 
              Helping students prepare better with organized academic resources.
            </p>
            <p>Managed and maintained by <strong>Yogesh Khinchi</strong>.</p>
          </div>

          {/* Quick Links */}
          <div className="footer-links">
            <h4 className="footer-heading">Navigation</h4>
            <ul className="footer-list">
              <li><Link to="">Home</Link></li>
              <li><Link to="/login">Student Login</Link></li>
              <li><Link to="/admin">Admin Access</Link></li>
            </ul>
          </div>

          {/* Community Section */}
          <div className="footer-links">
            <h4 className="footer-heading">Community</h4>
            <ul className="footer-list">
              <li><a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a></li>
              <li><a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a></li>
              <li><a href="mailto:paperstack.iiitsurat@gmail.com">Support</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} IIIT Surat Archive. Built for the community.</p>
          <div className="footer-status">
            <span className="status-dot"></span>
            System Online
          </div>
        </div>
      </div>
    </footer>
  );
}
// --- AUTH COMPONENTS ---
function Register({ showAlert }) { 
  const [formData, setFormData] = useState({ username: '', email: '', password: '', semester: 1 });
  const navigate = useNavigate();

  // Paths for your logos (Matches your Login page structure)
  const paperStackLogo = "/logo.png"; 

  const handleRegister = async (e) => {
    e.preventDefault();

    // Domain Restriction: Ensure it's an official IIIT Surat email
    if (!formData.email.toLowerCase().endsWith('@iiitsurat.ac.in')) {
        showAlert("Access Denied: Please use your @iiitsurat.ac.in email", "error");
        return;
    }

    try { 
        await axios.post(`${API_URL}/api/auth/register`, formData); 
        showAlert("Registration Successful! Please Login.", "success"); 
        navigate('/login'); 
    } 
    catch (err) { 
        showAlert(err.response?.data?.message || "Registration Failed", "error"); 
    }
  };

  return ( 
    <div className="auth-page-wrapper">
        <div className="auth-card login-card-animated">
            {/* Dual Logo Section - NEW */}
            <div className="login-logo-container">
                <img src={paperStackLogo} alt="PaperStack" className="login-logo-img pulse-entry" />
            </div>

            <div className="login-intro">
                <h2 className="slide-up-text">
                   <span className="paperstack-brand-text">IIIT Surat Archive</span>
                </h2>
                <p className="fade-in-text">Create your IIIT Surat student profile</p>
            </div>

            {/* Important Password Note */}
            <div className="auth-note-box pulse-entry">
                <span className="note-icon">⚠️</span>
                <p><strong>Important:</strong> You cant reset your password , So choose it carefully .</p>
            </div>

            <form onSubmit={handleRegister} className="login-form-content">
                <div className="input-field-animation">
                    <input 
                        type="text" 
                        placeholder="Username" 
                        onChange={e => setFormData({...formData, username: e.target.value})} 
                        required 
                    />
                </div>
                <div className="input-field-animation-delay">
                    <input 
                        type="email" 
                        placeholder="Institute Email (name@iiitsurat.ac.in)" 
                        onChange={e => setFormData({...formData, email: e.target.value})} 
                        required 
                    />
                </div>
                <div className="input-field-animation-delay">
                    <input 
                        type="password" 
                        placeholder="Password" 
                        onChange={e => setFormData({...formData, password: e.target.value})} 
                        required 
                    />
                </div>

                <div className="sem-select-container">
                    <label>Current Semester:</label>
                    <select 
                        value={formData.semester} 
                        onChange={e => setFormData({...formData, semester: Number(e.target.value)})}
                    >
                        {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                </div>

                <button type="submit" className="login-btn-gradient">
                    Create Account
                </button>
            </form>
            
            <p className="auth-switch-text">
                Already have an account? <Link to="/login">Login here</Link>
            </p>
        </div>
    </div> 
  );
}
function Login({ setUser, showAlert }) { 
  const [formData, setFormData] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  // Paths for your logos (Update filename if different)
  const paperStackLogo = "/logo.png"; 
  const iiitSuratLogo = "/iiit_surat.png";

  const handleLogin = async (e) => {
    e.preventDefault();

    // 1. Domain Restriction Check
    if (!formData.email.toLowerCase().endsWith('@iiitsurat.ac.in')) {
        showAlert("Access Denied: Please use your @iiitsurat.ac.in email", "error");
        return;
    }

    try { 
        const res = await axios.post(`${API_URL}/api/auth/login`, formData); 
        localStorage.setItem('token', res.data.token); 
        localStorage.setItem('username', res.data.username);
        if(res.data.semester) localStorage.setItem('userSemester', res.data.semester);

        setUser({ 
            username: res.data.username, 
            bookmarks: res.data.bookmarks,
            semester: res.data.semester 
        }); 
        
        navigate('/'); 
        showAlert(`Welcome back, ${res.data.username}!`, "success");
    } 
    catch (err) { 
        showAlert(err.response?.data?.message || "Invalid Credentials", "error"); 
    }
  };
  
  return ( 
    <div className="auth-page-wrapper">
        <div className="auth-card login-card-animated">
            {/* Logo Section */}
            <div className="login-logo-container">
                <img src={paperStackLogo} alt="PaperStack" className="login-logo-img pulse-entry" />
                <div className="logo-vertical-line"></div>
                <img src={iiitSuratLogo} alt="IIIT Surat" className="login-logo-img pulse-entry-delay" />
            </div>
            
            <div className="login-intro">
                <h2 className="slide-up-text">IIIT SURAT ARCHIVE</h2>
                <p className="fade-in-text">Login to access your semester papers</p>
            </div>

            <form onSubmit={handleLogin} className="login-form-content">
                <div className="input-field-animation">
                    <input 
                        type="email" 
                        placeholder="Institute Email ID" 
                        onChange={e => setFormData({...formData, email: e.target.value})} 
                        required 
                    />
                </div>
                <div className="input-field-animation-delay">
                    <input 
                        type="password" 
                        placeholder="Password" 
                        onChange={e => setFormData({...formData, password: e.target.value})} 
                        required 
                    />
                </div>
                <button type="submit" className="auth-btn login-btn-gradient">
                    Secure Login
                </button>
            </form>
            <p className="auth-switch-text">
                Not registered? <Link to="/register">Join the Community</Link>
            </p>
             <div className="auth-note-box pulse-entry">
                <span className="note-icon">⚠️</span>
                <p><strong>NOTE:</strong> For any queries mail at : <a href="mailto:paperstack.iiitsurat@gmail.com">paperstack.iiitsurat@gmail.com</a></p>
            </div>
        </div>
    </div> 
  );
}

function AdminLogin({ showAlert }) {
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleAdminLogin = async (e) => { 
      e.preventDefault(); 
      try { 
          const res = await axios.post(`${API_URL}/api/admin/verify`, { password }); 
          if(res.data.success) { 
              localStorage.setItem('adminPass', password); 
              showAlert("Admin Verified!", "success");
              navigate('/'); 
          } 
      } catch { showAlert("Wrong Password", "error"); } 
  };
  return ( <div className="auth-container"><div className="auth-card"><h2>🔐 Admin Access</h2><form onSubmit={handleAdminLogin}><input type="password" placeholder="Admin Password" onChange={e=>setPassword(e.target.value)} /><button className="auth-btn">Unlock</button></form></div></div> )
}

// --- SEMESTER SELECTION MODAL ---
function SemesterModal({ user, setUser, onClose, showAlert }) {
    const [selectedSem, setSelectedSem] = useState(user?.semester || 1);

    const handleSave = async () => {
        try {
            await axios.put(`${API_URL}/api/user/semester`, 
                { semester: selectedSem }, 
                { headers: { Authorization: localStorage.getItem('token') } }
            );

            const updatedUser = { ...user, semester: selectedSem };
            setUser(updatedUser);
            localStorage.setItem('userSemester', selectedSem);
            
            if(showAlert) showAlert(`Preference saved: Semester ${selectedSem}`, "success");
            if (onClose) onClose();
        } catch (err) {
            if(showAlert) showAlert("Failed to save semester", "error");
            console.error(err);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '310px', maxHeight : '250px', width: '90%', padding: '25px', textAlign: 'center', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                <h3>🎓 Which Semester are you in?</h3>
                <p>We'll show you these papers first.</p>
                <div style={{ margin: '10px 0' }}>
                    <select 
                        value={selectedSem} 
                        onChange={(e) => setSelectedSem(Number(e.target.value))}
                        style={{ padding: '10px', fontSize: '16px', width: '100%' }}
                    >
                        {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                </div>
                <button onClick={handleSave} className="auth-btn">Save Preference</button>
            </div>
        </div>
    );
}

// --- ANALYTICS DASHBOARD ---
function AnalyticsDashboard({ onClose }) {
    const [data, setData] = useState([]);
    useEffect(() => { axios.get(`${API_URL}/api/analytics`).then(res => setData(res.data)); }, []);

    return (
        <div className="analytics-panel">
            <div className="panel-header"><h3>📊 Exam Difficulty Analytics</h3><button onClick={onClose} className="close-btn">✖</button></div>
            <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data}>
                        <XAxis dataKey="_id" stroke="#8884d8" /><YAxis /><Tooltip cursor={{fill: 'transparent'}} contentStyle={{ color: '#333' }} />
                        <Bar dataKey="totalViews" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (<Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#4f46e5'} />))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
                <p className="insight-text">💡 <strong>Insight:</strong> "{data[0]?._id}" seems to be the toughest subject!</p>
            </div>
        </div>
    );
}

// --- UPDATED PAPER DETAILS MODAL ---
function PaperModal({ paper, user, onClose, showAlert }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [iframeLoading, setIframeLoading] = useState(true); // Track PDF loading


    useEffect(() => { 
        fetchComments(); 
        setIframeLoading(true);
    }, [paper._id]);

    const fetchComments = async () => { 
        try {
            const res = await axios.get(`${API_URL}/api/papers/${paper._id}/comments`); 
            setComments(res.data); 
        } catch (err) {
            console.error("Error fetching comments", err);
        }
    };

    const postComment = async (e) => {
        e.preventDefault();
        if(!newComment.trim()) return;
        if(!user) { showAlert("Please Login to comment", "error"); return; }
        
        try {
            await axios.post(
                `${API_URL}/api/papers/${paper._id}/comments`, 
                { text: newComment }, 
                { headers: { Authorization: localStorage.getItem('token') } }
            );
            setNewComment(''); 
            fetchComments();
        } catch (err) { 
            showAlert("Failed to post comment", "error"); 
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-modal-btn" onClick={onClose}>✖</button>
                
                <div className="modal-split">
                    {/* LEFT SIDE: PDF Viewer */}
                    <div className="modal-left">
                        <div className="modal-header-info">
                            <h3>📄 {paper.subject}</h3>
                            <span className="badge-pill">{paper.examType} • {paper.year}</span>
                        </div>

                        <div className="pdf-container">
                            {/* SKELETON LOADER FOR PDF */}
                            {iframeLoading && (
                                <div className="pdf-skeleton">
                                    <div className="skeleton-shimmer"></div>
                                    <p>Loading document...</p>
                                </div>
                            )}
                            
                            <iframe 
                                src={`${paper.filePath}#toolbar=0`} // Hide toolbar for cleaner look
                                title="PDF Preview" 
                                className="pdf-frame"
                                onLoad={() => setIframeLoading(false)}
                                style={{ opacity: iframeLoading ? 0 : 1 }}
                            ></iframe>
                        </div>

                        <div className="modal-actions">
                            <a href={paper.filePath} target="_blank" rel="noreferrer" className="btn-download">
                                ⬇️ Download Paper
                            </a>
                            {paper.solutionPath && (
                                <a href={paper.solutionPath} target="_blank" rel="noreferrer" className="btn-solution">
                                    💡 View Solution
                                </a>
                            )}
                        </div>
                    </div>

                    {/* RIGHT SIDE: Comments/Doubts */}
                    <div className="modal-right">
                        <div className="discussion-header">
                            <h3>💬 Doubt Section</h3>
                            <p>{comments.length} Thoughts</p>
                        </div>

                        <div className="comments-list">
                            {comments.length === 0 ? (
                                <div className="empty-comments">
                                    <p>No doubts yet. Be the first to ask!</p>
                                </div>
                            ) : (
                                comments.map(c => (
                                    <div key={c._id} className="comment-bubble">
                                        <div className="comment-user-icon">
                                            {c.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="comment-details">
                                            <strong>{c.username}</strong>
                                            <p>{c.text}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <form onSubmit={postComment} className="comment-form">
                            <input 
                                value={newComment} 
                                onChange={e => setNewComment(e.target.value)} 
                                placeholder={user ? "Write a doubt..." : "Login to join discussion"} 
                                disabled={!user} 
                            />
                            <button type="submit" disabled={!user || !newComment.trim()}>
                                Send
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PaperSkeleton() {
  return (
    <div className="paper-card skeleton">
      <div className="card-stats-row">
        <div className="skeleton-circle"></div>
        <div className="skeleton-circle"></div>
        <div className="skeleton-circle"></div>
      </div>
      <div className="card-body">
        <div className="skeleton-line skeleton-badge"></div>
        <div className="skeleton-line skeleton-title"></div>
        <div className="skeleton-line skeleton-text"></div>
        <div className="skeleton-line skeleton-meta"></div>
      </div>
      <div className="card-actions">
        <div className="skeleton-line skeleton-button"></div>
      </div>
    </div>
  );
}

// --- HOME COMPONENT ---
function Home({ user, setUser, theme, toggleTheme, showAlert }) {
const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true); // ✅ Added Loading State
  const [filter, setFilter] = useState('all'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSem, setFilterSem] = useState(user?.semester?.toString() || '');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [showSemModal, setShowSemModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({ title: '', subject: '', year: '', semester: '', examType: 'Mid-Sem' });
  const [file, setFile] = useState(null);
  const [solutionFile, setSolutionFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  

  const handleSolution = (e, paper) => {
      e.stopPropagation();
      if(paper.solutionPath) {
          window.open(paper.solutionPath, '_blank');
      } else {
          showAlert("No solution available", "info");
      }
  };

  useEffect(() => { 
      fetchPapers(); 
      if(localStorage.getItem('adminPass')) setIsAdmin(true);
      if (user && !user.semester) { setShowSemModal(true); }
      if (user && user.semester) { setFilterSem(user.semester.toString()); }
  }, [user]);

  // Updated fetch with Sorting (Newest Year First, then Newest Sem)
 const fetchPapers = async () => { 
    setLoading(true);
    try {
        const res = await axios.get(`${API_URL}/api/papers`); 
        const sorted = res.data.sort((a, b) => {
            // 1. Sort by Year (Newest first)
            if (b.year !== a.year) return b.year - a.year;

            // 2. Sort by Semester (Highest first)
            if (b.semester !== a.semester) return b.semester - a.semester;

            // 3. Sort by Exam Type (Mid-Sem first, then End-Sem)
            const typeOrder = { 'Mid-Sem': 1, 'End-Sem': 2 };
            
            // This ensures Mid-Sem (1) comes before End-Sem (2)
            return (typeOrder[a.examType] || 3) - (typeOrder[b.examType] || 3);
        });
        setPapers(sorted); 
    } catch (err) { 
        console.error("Fetch Error:", err); 
        showAlert("Failed to load papers", "error");
    } finally {
        // Add a slight delay (500ms) so the skeleton doesn't "flash" too fast
        setTimeout(() => setLoading(false), 500); 
    }
  };
  // Fixed handleUpload with Loader and proper logic
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { showAlert("Please select a paper PDF", "error"); return; }
    
    setIsUploading(true); // START LOADER

    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    data.append('file', file);
    if(solutionFile) data.append('solution', solutionFile);

    try {
        const adminPass = localStorage.getItem('adminPass');
        await axios.post(`${API_URL}/api/upload`, data, {
            headers: { 'Content-Type': 'multipart/form-data', 'x-admin-password': adminPass }
        });
        showAlert("Paper Uploaded Successfully!", "success");
        setFile(null); 
        setSolutionFile(null);
        fetchPapers(); // Refresh the list
    } catch (err) { 
        showAlert("Upload Failed. Check credentials/connection.", "error"); 
        console.error(err); 
    } finally {
        setIsUploading(false); // STOP LOADER
    }
  };

  // --- NEW: FUNCTION TO ADD SOLUTION TO EXISTING PAPER ---
  const handleAddSolutionToExisting = async (paperId, selectedFile) => {
    if (!selectedFile) return;
    setIsUploading(true);
    const data = new FormData();
    data.append('solution', selectedFile);

    try {
      const adminPass = localStorage.getItem('adminPass');
      // This matches the PUT route we discussed earlier
      await axios.put(`${API_URL}/api/papers/${paperId}/solution`, data, {
        headers: { 'Content-Type': 'multipart/form-data', 'x-admin-password': adminPass }
      });
      showAlert("Solution Added!", "success");
      fetchPapers();
    } catch (err) {
      showAlert("Failed to upload solution", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (e, paperId) => {
      e.stopPropagation();
      if(!window.confirm("⚠️ Delete this paper permanently?")) return;
      try {
          const adminPass = localStorage.getItem('adminPass');
          await axios.delete(`${API_URL}/api/papers/${paperId}`, { headers: { 'x-admin-password': adminPass } });
          showAlert("Deleted", "success");
          setPapers(prev => prev.filter(p => p._id !== paperId));
      } catch (err) { showAlert("Delete Failed", "error"); }
  };

  const getHardestSubject = () => {
      if (!papers.length) return null;
      const relevantPapers = filterSem ? papers.filter(p => p.semester.toString() === filterSem) : papers;
      if (relevantPapers.length === 0) return null;
      const scores = {};
      relevantPapers.forEach(p => { const score = (p.views || 0) + (p.downloads || 0); scores[p.subject] = (scores[p.subject] || 0) + score; });
      const hardest = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
      return { subject: hardest, score: scores[hardest] };
  };

  const hardestSubject = getHardestSubject();

  const handleView = async (paper) => {
      setSelectedPaper(paper);
      axios.post(`${API_URL}/api/papers/${paper._id}/view`);
      setPapers(prev => prev.map(p => p._id === paper._id ? { ...p, views: (p.views || 0) + 1 } : p));
  };

  const handleDownload = async (e, paper) => {
      e.stopPropagation();
      window.open(paper.filePath, '_blank'); 
      await axios.post(`${API_URL}/api/papers/${paper._id}/download`);
      setPapers(prev => prev.map(p => p._id === paper._id ? { ...p, downloads: (p.downloads || 0) + 1 } : p));
  };

  const toggleBookmark = async (paperId, e) => {
      e.stopPropagation();
      if (!user) { showAlert("Please Login to Bookmark!", "info"); return; }
      const res = await axios.put(`${API_URL}/api/user/bookmark/${paperId}`, {}, { headers: { Authorization: localStorage.getItem('token') } });
      setUser({ ...user, bookmarks: res.data });
  };
  
  const displayedPapers = papers.filter(p => {
      const matchesSearch = p.subject.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = filter === 'saved' ? user?.bookmarks.includes(p._id) : true;
      const matchesSem = filterSem ? p.semester.toString() === filterSem : true;
      return matchesSearch && matchesTab && matchesSem;
  });

  return (
    <> 
    <Helmet>
      {/* 1. This is where you put the info Google sees */}
      <title>
        {filterSem ? `Sem ${filterSem} | PaperStack IIIT Surat` : 'PaperStack | IIIT Surat Previous Year Papers'}
      </title>
      <meta name="description" content="Access all IIIT Surat previous semesters exam papers, solutions, and analytics in one place." />
      <meta property="og:title" content="PaperStack - IIIT Surat Archive" />
      <link rel="canonical" href="https://paper-stack-beryl.vercel.app/" />

      {/* Open Graph / Facebook (How it looks when shared) */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="PaperStack - IIIT Surat Archive" />
        <meta property="og:description" content="Stop searching for papers on WhatsApp groups. Get them all here." />
        <meta property="og:image" content="https://paper-stack-beryl.vercel.app/logo.png" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="PaperStack | IIIT Surat" />
    </Helmet>

    <div className="app-container">
      {showSemModal && (
        <SemesterModal 
            user={user} 
            setUser={setUser} 
            showAlert={showAlert}
            onClose={() => {
                setShowSemModal(false);
                if(user.semester) setFilterSem(user.semester.toString());
            }} 
        />
      )}

      <nav className="navbar">
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={logo} alt="Logo" style={{ height: '45px', borderRadius: '8px', objectFit: 'contain' }} /> 
          <span>PaperStack</span>
          
        </div>
        <div className="nav-links">
          <button className="theme-btn" onClick={toggleTheme}>{theme === 'light' ? '🌙' : '☀️'}</button>
          <button className="stats-btn" onClick={() => setShowAnalytics(!showAnalytics)}>📊 Stats</button>
          
          {!isAdmin && <Link to="/admin" className="btn-admin-login">Admin</Link>}
          {isAdmin && <span className="admin-badge">ADMIN MODE</span>}
          
          {user ? (
            <div className="user-info">
              <span>👤 {user.username}</span>
              <button onClick={() => setShowSemModal(true)} style={{ marginLeft: '10px', background: 'transparent', border: '1px solid currentColor', borderRadius: '4px', cursor: 'pointer', color: 'inherit', padding: '2px 6px', fontSize: '0.8rem' }}>
                  Sem {user.semester || '?'} ✎
              </button>
              <button className="btn-logout" onClick={() => { localStorage.clear(); window.location.reload(); }}>Logout</button>
            </div>
          ) : <Link to="/login" className="btn-login">Login</Link>}
        </div>
      </nav>

      <main className="main-content">
        {showAnalytics && <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />}
        
        {isAdmin && (
            <div className="admin-upload-section">
                <div className="admin-card">
                    <h3>📤 Admin Upload Panel</h3>
                    <form onSubmit={handleUpload} className="upload-form">
                        <div className="form-row">
                            <input type="text" placeholder="Subject" onChange={e => setFormData({...formData, subject: e.target.value})} required />
                            <input type="text" placeholder="Title" onChange={e => setFormData({...formData, title: e.target.value})} required />
                        </div>
                        <div className="form-row">
                            <input type="number" placeholder="Year" onChange={e => setFormData({...formData, year: e.target.value})} required />
                            <select onChange={e => setFormData({...formData, semester: e.target.value})} required>
                                <option value="">Select Sem</option>
                                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select onChange={e => setFormData({...formData, examType: e.target.value})}>
                                <option>Mid-Sem</option><option>End-Sem</option>
                            </select>
                        </div>
                        <div className="file-inputs">
                            <label className="file-label">📄 Paper: <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files[0])} /><b> {file ? file.name : ''} </b></label>
                            <label className="file-label">💡 Solution: <input type="file" accept="application/pdf" onChange={e => setSolutionFile(e.target.files[0])} /><b> {solutionFile ? solutionFile.name : ''}</b></label>
                        </div>
                        
                        {/* Updated Button with Loader Logic */}
                        <button type="submit" className="btn-upload" disabled={isUploading}>
                            {isUploading ? "⏳ Uploading to Cloudinary..." : "🚀 Upload Paper"}
                        </button>
                    </form>
                </div>
            </div>
        )}

        <div className="controls-section">
    <div className="controls-bar">
        <div className="tabs">
            <button className={filter === 'all' ? 'tab active' : 'tab'} onClick={() => setFilter('all')}>
                📚 Papers
            </button>
            <button className={filter === 'saved' ? 'tab active' : 'tab'} onClick={() => setFilter('saved')}>
                ❤️ Saved
            </button>
        </div>

        {/* Updated this line to show filtered count */}
        <span className="navbar-paper-count">
            <h5>
                {searchTerm || filterSem !== '' ? 'Papers Found: ' : 'Total Papers: '} 
                {displayedPapers.length}
            </h5>
        </span>

        <div className="filters">
            <select className="sem-filter" value={filterSem} onChange={e => setFilterSem(e.target.value)}>
                <option value="">All Sems</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
            </select>
            <input 
                className="search-input" 
                type="text" 
                placeholder="🔍 Search..." 
                onChange={e => setSearchTerm(e.target.value)} 
            />
        </div>
    </div>

    {hardestSubject && (
        <div className="difficulty-banner">
            <span className="fire-icon">🔥</span>
            <div><strong>Insight:</strong> <span className="highlight-subject">{hardestSubject.subject}</span> is currently the toughest!</div>
        </div>
    )}
</div>

        <div className="papers-grid">
            {loading ? (
                // showing skeleton while loading
                [...Array(6)].map((_, idx) => <PaperSkeleton key={idx} />) ) :

                displayedPapers.length === 0 && filterSem ? (
                <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: '#888'}}>
                    <h3>No papers found for Semester {filterSem}</h3>
                    <p>Try switching to "All Sems"</p>
                </div>
            ) : (
                displayedPapers.map(p => (
                    <div key={p._id} className="paper-card">
                        <div className="card-stats-row">
                            <div className="stat-item">👁️ {p.views || 0}</div>
                            <div className="stat-item">⬇️ {p.downloads || 0}</div>
                            <button className={`heart-icon ${user?.bookmarks.includes(p._id) ? 'liked' : ''}`} onClick={(e) => toggleBookmark(p._id, e)}>{user?.bookmarks.includes(p._id) ? '❤️' : '🤍'}</button>
                        </div>
                        <div className="card-body">
                            <span className={`badge ${p.examType === 'Mid-Sem' ? 'mid' : 'end'}`}>{p.examType}</span>
                            <h3 className="subject-name">{p.subject}</h3>
                            <p className="paper-title">{p.title}</p>
                            <p className="paper-meta">Sem {p.semester} • {p.year}</p>
                        </div>
                        <div className="card-actions">
                            <button className="btn-view-pdf" onClick={() => handleView(p)}>📄 View</button>
                            <div className="action-icons">
                                {p.solutionPath && <button className="btn-icon solution-icon" onClick={(e) => handleSolution(e, p)} title="Solution">💡</button>}
                                <button className="btn-icon download-icon" onClick={(e) => handleDownload(e, p)} title="Download">⬇</button>
                                {isAdmin && (
                                <label className="btn-icon solution-icon update-btn" title="Update Solution">
                                    {p.solutionPath ? '🔄' : '➕'}
                                    <input 
                                        type="file" 
                                        hidden 
                                        accept="application/pdf" 
                                        onChange={(e) => handleAddSolutionToExisting(p._id, e.target.files[0])} 
                                    />
                                </label>
                            )}
                            {isAdmin && <button className="btn-icon delete-icon" onClick={(e) => handleDelete(e, p._id)}>🗑️</button>}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
      </main>
      <Footer />
      
      {selectedPaper && <PaperModal paper={selectedPaper} user={user} onClose={() => setSelectedPaper(null)} showAlert={showAlert} />}
    </div>
    </>
  );
}


// --- MAIN APP COMPONENT ---
export default function App() { 
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [alertInfo, setAlertInfo] = useState({ show: false, msg: '', type: 'success' });

  const showAlert = (msg, type = 'success') => {
    setAlertInfo({ show: true, msg, type });
    setTimeout(() => {
        setAlertInfo({ show: false, msg: '', type: '' });
    }, 3000);
  };

  const toggleTheme = () => { const newTheme = theme === 'light' ? 'dark' : 'light'; setTheme(newTheme); localStorage.setItem('theme', newTheme); };
  
  useEffect(() => { 
      document.body.className = theme; 
      const token = localStorage.getItem('token'); 
      const username = localStorage.getItem('username'); 
      const savedSem = localStorage.getItem('userSemester'); 
      
      if(token && username) {
          setUser({ 
              username, 
              bookmarks: [], 
              semester: savedSem ? Number(savedSem) : null 
          }); 
      }
  }, [theme]);

  return (
    <HelmetProvider>
    <Router>
        <CustomAlert alert={alertInfo} />
        <Suspense fallback={<PageLoader />}>
        <Routes>
            <Route path="/" element={<Home user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} showAlert={showAlert} />} />
            <Route path="/login" element={<Login setUser={setUser} showAlert={showAlert} />} />
            <Route path="/register" element={<Register showAlert={showAlert} />} />
            <Route path="/admin" element={<AdminLogin showAlert={showAlert} />} />
        </Routes>
        </Suspense>
    </Router>
    </HelmetProvider>
  );
}