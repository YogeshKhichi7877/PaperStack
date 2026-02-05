// import React, { useState, useEffect , Suspense, lazy } from 'react';
// import { BrowserRouter as Router, Routes, Route, useNavigate, Link } from 'react-router-dom';
// import axios from 'axios';
// import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
// import { HelmetProvider , Helmet } from 'react-helmet-async';
// import logo from './assets/Paperstack_logo_wt.png'; 
// import './App.css';

//  // const API_URL = 'https://paperstack-backend-7oeo.onrender.com'; // main url link hai ye 
//  const API_URL = 'https://paperstack.onrender.com' // new render link 


// //  const API_URL = 'http://localhost:5000'

// // --- HELPER: PAGE LOADER ---
// function PageLoader() {
//   return (
//     <div className="page-loading-screen">
//        <img src="/logo.png" alt="Loading..." style={{ height: '60px', marginBottom: '10px' }} />
//        <p>Loading PaperStack...</p>
//     </div>
//   );
// }

// // --- CUSTOM ALERT COMPONENT ---
// function CustomAlert({ alert }) {
//   if (!alert.show) return null;
//   return (
//     <div className={`custom-alert alert-${alert.type}`}>
//       <span>{alert.type === 'success' ? '✅' : alert.type === 'error' ? '⚠️' : 'ℹ️'}</span>
//       {alert.msg}
//     </div>
//   );
// }
// function Footer() {
//   return (
//     <footer className="site-footer">
//       <div className="container">
//         <div className="footer-grid">
//           {/* Brand Section with Logo */}
//           <div className="footer-brand">
//             <div className="footer-logo-wrapper">
//               <img src={logo} alt="PaperStack Logo" className="footer-logo-img" />
//               <h3 className="footer-logo">PaperStack</h3>
//             </div>
//             <p className="footer-description">
//               The official archive for IIIT Surat previous year papers. 
//               Helping students prepare better with organized academic resources.
//             </p>
//             <p>Managed and maintained by <strong>Yogesh Khinchi</strong>.</p>
//           </div>

//           {/* Quick Links */}
//           <div className="footer-links">
//             <h4 className="footer-heading">Navigation</h4>
//             <ul className="footer-list">
//               <li><Link to="">Home</Link></li>
//               <li><Link to="/login">Student Login</Link></li>
//               <li><Link to="/admin">Admin Access</Link></li>
//             </ul>
//           </div>

//           {/* Community Section */}
//           <div className="footer-links">
//             <h4 className="footer-heading">Community</h4>
//             <ul className="footer-list">
//               <li><a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a></li>
//               <li><a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a></li>
//               <li><a href="mailto:paperstack.iiitsurat@gmail.com">Support</a></li>
//             </ul>
//           </div>
//         </div>

//         {/* Bottom Bar */}
//         <div className="footer-bottom">
//           <p>&copy; {new Date().getFullYear()} IIIT Surat Archive. Built for the community.</p>
//           <div className="footer-status">
//             <span className="status-dot"></span>
//             System Online
//           </div>
//         </div>
//       </div>
//     </footer>
//   );
// }
// // --- AUTH COMPONENTS ---
// function Register({ showAlert }) { 
//   const [formData, setFormData] = useState({ username: '', email: '', password: '', semester: 1 });
//   const navigate = useNavigate();

//   // Paths for your logos (Matches your Login page structure)
//   const paperStackLogo = "/logo.png"; 

//   const handleRegister = async (e) => {
//     e.preventDefault();

//     // Domain Restriction: Ensure it's an official IIIT Surat email
//     if (!formData.email.toLowerCase().endsWith('@iiitsurat.ac.in')) {
//         showAlert("Access Denied: Please use your @iiitsurat.ac.in email", "error");
//         return;
//     }

//     try { 
//         await axios.post(`${API_URL}/api/auth/register`, formData); 
//         showAlert("Registration Successful! Please Login.", "success"); 
//         navigate('/login'); 
//     } 
//     catch (err) { 
//         showAlert(err.response?.data?.message || "Registration Failed", "error"); 
//         console.log("Registratin error : ", err)
//     }
//   };

//   return ( 
//     <div className="auth-page-wrapper">
//         <div className="auth-card login-card-animated">
//             {/* Dual Logo Section - NEW */}
//             <div className="login-logo-container">
//                 <img src={paperStackLogo} alt="PaperStack" className="login-logo-img pulse-entry" />
//             </div>

//             <div className="login-intro">
//                 <h2 className="slide-up-text">
//                    <span className="paperstack-brand-text">IIIT Surat Archive</span>
//                 </h2>
//                 <p className="fade-in-text">Create your IIIT Surat student profile</p>
//             </div>

//             {/* Important Password Note */}
//             <div className="auth-note-box pulse-entry">
//                 <span className="note-icon">⚠️</span>
//                 <p><strong>Important:</strong> You cant reset your password , So choose it carefully .</p>
//             </div>

//             <form onSubmit={handleRegister} className="login-form-content">
//                 <div className="input-field-animation">
//                     <input 
//                         type="text" 
//                         placeholder="Username" 
//                         onChange={e => setFormData({...formData, username: e.target.value})} 
//                         required 
//                     />
//                 </div>
//                 <div className="input-field-animation-delay">
//                     <input 
//                         type="email" 
//                         placeholder="Institute Email (name@iiitsurat.ac.in)" 
//                         onChange={e => setFormData({...formData, email: e.target.value})} 
//                         required 
//                     />
//                 </div>
//                 <div className="input-field-animation-delay">
//                     <input 
//                         type="password" 
//                         placeholder="Password" 
//                         onChange={e => setFormData({...formData, password: e.target.value})} 
//                         required 
//                     />
//                 </div>

//                 <div className="sem-select-container">
//                     <label>Current Semester:</label>
//                     <select 
//                         value={formData.semester} 
//                         onChange={e => setFormData({...formData, semester: Number(e.target.value)})}
//                     >
//                         {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
//                     </select>
//                 </div>

//                 <button type="submit" className="login-btn-gradient">
//                     Create Account
//                 </button>
//             </form>
            
//             <p className="auth-switch-text">
//                 Already have an account? <Link to="/login">Login here</Link>
//             </p>
//         </div>
//     </div> 
//   );
// }
// function Login({ setUser, showAlert }) { 
//   const [formData, setFormData] = useState({ email: '', password: '' });
//   const navigate = useNavigate();

//   // Paths for your logos (Update filename if different)
//   const paperStackLogo = "/logo.png"; 
//   const iiitSuratLogo = "/iiit_surat.png";

//   const handleLogin = async (e) => {
//     e.preventDefault();

//     // 1. Domain Restriction Check
//     if (!formData.email.toLowerCase().endsWith('@iiitsurat.ac.in')) {
//         showAlert("Access Denied: Please use your @iiitsurat.ac.in email", "error");
//         return;
//     }

//     try { 
//         const res = await axios.post(`${API_URL}/api/auth/login`, formData); 
//         localStorage.setItem('token', res.data.token); 
//         localStorage.setItem('username', res.data.username);
//         if(res.data.semester) localStorage.setItem('userSemester', res.data.semester);

//         setUser({ 
//             username: res.data.username, 
//             bookmarks: res.data.bookmarks,
//             semester: res.data.semester 
//         }); 
        
//         navigate('/'); 
//         showAlert(`Welcome back, ${res.data.username}!`, "success");
//     } 
//     catch (err) { 
//         showAlert(err.response?.data?.message || "Invalid Credentials", "error"); 
//     }
//   };
  
//   return ( 
//     <div className="auth-page-wrapper">
//         <div className="auth-card login-card-animated">
//             {/* Logo Section */}
//             <div className="login-logo-container">
//                 <img src={paperStackLogo} alt="PaperStack" className="login-logo-img pulse-entry" />
//                 <div className="logo-vertical-line"></div>
//                 <img src={iiitSuratLogo} alt="IIIT Surat" className="login-logo-img pulse-entry-delay" />
//             </div>
            
//             <div className="login-intro">
//                 <h2 className="slide-up-text">IIIT SURAT ARCHIVE</h2>
//                 <p className="fade-in-text">Login to access your semester papers</p>
//             </div>

//             <form onSubmit={handleLogin} className="login-form-content">
//                 <div className="input-field-animation">
//                     <input 
//                         type="email" 
//                         placeholder="Institute Email ID" 
//                         onChange={e => setFormData({...formData, email: e.target.value})} 
//                         required 
//                     />
//                 </div>
//                 <div className="input-field-animation-delay">
//                     <input 
//                         type="password" 
//                         placeholder="Password" 
//                         onChange={e => setFormData({...formData, password: e.target.value})} 
//                         required 
//                     />
//                 </div>
//                 <button type="submit" className="auth-btn login-btn-gradient">
//                     Secure Login
//                 </button>
//             </form>
//             <p className="auth-switch-text">
//                 Not registered? <Link to="/register">Join the Community</Link>
//             </p>
//              <div className="auth-note-box pulse-entry">
//                 <span className="note-icon">⚠️</span>
//                 <p><strong>NOTE:</strong> For any queries mail at : <a href="mailto:paperstack.iiitsurat@gmail.com">paperstack.iiitsurat@gmail.com</a></p>
//             </div>
//         </div>
//     </div> 
//   );
// }

// function AdminLogin({ showAlert }) {
//   const [password, setPassword] = useState('');
//   const navigate = useNavigate();

//   const handleAdminLogin = async (e) => { 
//       e.preventDefault(); 
//       try { 
//           const res = await axios.post(`${API_URL}/api/admin/verify`, { password }); 
//           if(res.data.success) { 
//               localStorage.setItem('adminPass', password); 
//               showAlert("Admin Verified!", "success");
//               navigate('/'); 
//           } 
//       } catch { showAlert("Wrong Password", "error"); } 
//   };
//   return ( <div className="auth-container"><div className="auth-card"><h2>🔐 Admin Access</h2><form onSubmit={handleAdminLogin}><input type="password" placeholder="Admin Password" onChange={e=>setPassword(e.target.value)} /><button className="auth-btn">Unlock</button></form></div></div> )
// }

// // --- SEMESTER SELECTION MODAL ---
// function SemesterModal({ user, setUser, onClose, showAlert }) {
//     const [selectedSem, setSelectedSem] = useState(user?.semester || 1);

//     const handleSave = async () => {
//         try {
//             await axios.put(`${API_URL}/api/user/semester`, 
//                 { semester: selectedSem }, 
//                 { headers: { Authorization: localStorage.getItem('token') } }
//             );

//             const updatedUser = { ...user, semester: selectedSem };
//             setUser(updatedUser);
//             localStorage.setItem('userSemester', selectedSem);
            
//             if(showAlert) showAlert(`Preference saved: Semester ${selectedSem}`, "success");
//             if (onClose) onClose();
//         } catch (err) {
//             if(showAlert) showAlert("Failed to save semester", "error");
//             console.error(err);
//         }
//     };

//     return (
//         <div className="modal-overlay">
//             <div className="modal-content" style={{ maxWidth: '310px', maxHeight : '250px', width: '90%', padding: '25px', textAlign: 'center', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
//                 <h3>🎓 Which Semester are you in?</h3>
//                 <p>We'll show you these papers first.</p>
//                 <div style={{ margin: '10px 0' }}>
//                     <select 
//                         value={selectedSem} 
//                         onChange={(e) => setSelectedSem(Number(e.target.value))}
//                         style={{ padding: '10px', fontSize: '16px', width: '100%' }}
//                     >
//                         {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
//                     </select>
//                 </div>
//                 <button onClick={handleSave} className="auth-btn">Save Preference</button>
//             </div>
//         </div>
//     );
// }

// // --- ANALYTICS DASHBOARD ---
// function AnalyticsDashboard({ onClose }) {
//     const [data, setData] = useState([]);
//     useEffect(() => { axios.get(`${API_URL}/api/analytics`).then(res => setData(res.data)); }, []);

//     return (
//         <div className="analytics-panel">
//             <div className="panel-header"><h3>📊 Exam Difficulty Analytics</h3><button onClick={onClose} className="close-btn">✖</button></div>
//             <div className="chart-container">
//                 <ResponsiveContainer width="100%" height={300}>
//                     <BarChart data={data}>
//                         <XAxis dataKey="_id" stroke="#8884d8" /><YAxis /><Tooltip cursor={{fill: 'transparent'}} contentStyle={{ color: '#333' }} />
//                         <Bar dataKey="totalViews" fill="#4f46e5" radius={[4, 4, 0, 0]}>
//                             {data.map((entry, index) => (<Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#4f46e5'} />))}
//                         </Bar>
//                     </BarChart>
//                 </ResponsiveContainer>
//                 <p className="insight-text">💡 <strong>Insight:</strong> "{data[0]?._id}" seems to be the toughest subject!</p>
//             </div>
//         </div>
//     );
// }

// // --- UPDATED PAPER DETAILS MODAL ---
// function PaperModal({ paper, user, onClose, showAlert }) {
//     const [comments, setComments] = useState([]);
//     const [newComment, setNewComment] = useState('');
//     const [iframeLoading, setIframeLoading] = useState(true); // Track PDF loading


//     useEffect(() => { 
//         fetchComments(); 
//         setIframeLoading(true);
//     }, [paper._id]);

//     const fetchComments = async () => { 
//         try {
//             const res = await axios.get(`${API_URL}/api/papers/${paper._id}/comments`); 
//             setComments(res.data); 
//         } catch (err) {
//             console.error("Error fetching comments", err);
//         }
//     };

//     const postComment = async (e) => {
//         e.preventDefault();
//         if(!newComment.trim()) return;
//         if(!user) { showAlert("Please Login to comment", "error"); return; }
        
//         try {
//             await axios.post(
//                 `${API_URL}/api/papers/${paper._id}/comments`, 
//                 { text: newComment }, 
//                 { headers: { Authorization: localStorage.getItem('token') } }
//             );
//             setNewComment(''); 
//             fetchComments();
//         } catch (err) { 
//             showAlert("Failed to post comment", "error"); 
//         }
//     };

//     return (
//         <div className="modal-overlay" onClick={onClose}>
//             <div className="modal-content" onClick={e => e.stopPropagation()}>
//                 <button className="close-modal-btn" onClick={onClose}>✖</button>
                
//                 <div className="modal-split">
//                     {/* LEFT SIDE: PDF Viewer */}
//                     <div className="modal-left">
//                         <div className="modal-header-info">
//                             <h3>📄 {paper.subject}</h3>
//                             <span className="badge-pill">{paper.examType} • {paper.year}</span>
//                         </div>

//                         <div className="pdf-container">
//                             {/* SKELETON LOADER FOR PDF */}
//                             {iframeLoading && (
//                                 <div className="pdf-skeleton">
//                                     <div className="skeleton-shimmer"></div>
//                                     <p>Loading document...</p>
//                                 </div>
//                             )}
                            
//                             <iframe 
//                                 src={`${paper.filePath}#toolbar=0`} // Hide toolbar for cleaner look
//                                 title="PDF Preview" 
//                                 className="pdf-frame"
//                                 onLoad={() => setIframeLoading(false)}
//                                 style={{ opacity: iframeLoading ? 0 : 1 }}
//                             ></iframe>
//                         </div>

//                         <div className="modal-actions">
//                             <a href={paper.filePath} target="_blank" rel="noreferrer" className="btn-download">
//                                 ⬇️ Download Paper
//                             </a>
//                             {paper.solutionPath && (
//                                 <a href={paper.solutionPath} target="_blank" rel="noreferrer" className="btn-solution">
//                                     💡 View Solution
//                                 </a>
//                             )}
//                         </div>
//                     </div>

//                     {/* RIGHT SIDE: Comments/Doubts */}
//                     <div className="modal-right">
//                         <div className="discussion-header">
//                             <h3>💬 Doubt Section</h3>
//                             <p>{comments.length} Thoughts</p>
//                         </div>

//                         <div className="comments-list">
//                             {comments.length === 0 ? (
//                                 <div className="empty-comments">
//                                     <p>No doubts yet. Be the first to ask!</p>
//                                 </div>
//                             ) : (
//                                 comments.map(c => (
//                                     <div key={c._id} className="comment-bubble">
//                                         <div className="comment-user-icon">
//                                             {c.username.charAt(0).toUpperCase()}
//                                         </div>
//                                         <div className="comment-details">
//                                             <strong>{c.username}</strong>
//                                             <p>{c.text}</p>
//                                         </div>
//                                     </div>
//                                 ))
//                             )}
//                         </div>

//                         <form onSubmit={postComment} className="comment-form">
//                             <input 
//                                 value={newComment} 
//                                 onChange={e => setNewComment(e.target.value)} 
//                                 placeholder={user ? "Write a doubt..." : "Login to join discussion"} 
//                                 disabled={!user} 
//                             />
//                             <button type="submit" disabled={!user || !newComment.trim()}>
//                                 Send
//                             </button>
//                         </form>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }

// function PaperSkeleton() {
//   return (
//     <div className="paper-card skeleton">
//       <div className="card-stats-row">
//         <div className="skeleton-circle"></div>
//         <div className="skeleton-circle"></div>
//         <div className="skeleton-circle"></div>
//       </div>
//       <div className="card-body">
//         <div className="skeleton-line skeleton-badge"></div>
//         <div className="skeleton-line skeleton-title"></div>
//         <div className="skeleton-line skeleton-text"></div>
//         <div className="skeleton-line skeleton-meta"></div>
//       </div>
//       <div className="card-actions">
//         <div className="skeleton-line skeleton-button"></div>
//       </div>
//     </div>
//   );
// }

// // --- HOME COMPONENT ---
// function Home({ user, setUser, theme, toggleTheme, showAlert }) {
// const [papers, setPapers] = useState([]);
//   const [loading, setLoading] = useState(true); // ✅ Added Loading State
//   const [filter, setFilter] = useState('all'); 
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterSem, setFilterSem] = useState(user?.semester?.toString() || '');
//   const [showAnalytics, setShowAnalytics] = useState(false);
//   const [selectedPaper, setSelectedPaper] = useState(null);
//   const [showSemModal, setShowSemModal] = useState(false);
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [formData, setFormData] = useState({ title: '', subject: '', year: '', semester: '', examType: 'Mid-Sem' });
//   const [file, setFile] = useState(null);
//   const [solutionFile, setSolutionFile] = useState(null);
//   const [isUploading, setIsUploading] = useState(false);
  

//   const handleSolution = (e, paper) => {
//       e.stopPropagation();
//       if(paper.solutionPath) {
//           window.open(paper.solutionPath, '_blank');
//       } else {
//           showAlert("No solution available", "info");
//       }
//   };

//   useEffect(() => { 
//       fetchPapers(); 
//       if(localStorage.getItem('adminPass')) setIsAdmin(true);
//       if (user && !user.semester) { setShowSemModal(true); }
//       if (user && user.semester) { setFilterSem(user.semester.toString()); }
//   }, [user]);

// //   // Updated fetch with Sorting (Newest Year First, then Newest Sem)
// //  const fetchPapers = async () => { 
// //     setLoading(true);
// //     try {
// //         const res = await axios.get(`${API_URL}/api/papers`); 
// //         console.log("res from line 535 in fetchPapers" , res);
// //         const sorted = res.data.sort((a, b) => {
// //             // 1. Sort by Year (Newest first)
// //             if (b.year !== a.year) return b.year - a.year;

// //             // 2. Sort by Semester (Highest first)
// //             if (b.semester !== a.semester) return b.semester - a.semester;

// //             // 3. Sort by Exam Type (Mid-Sem first, then End-Sem)
// //             const typeOrder = { 'Mid-Sem': 1, 'End-Sem': 2 };
            
// //             // This ensures Mid-Sem (1) comes before End-Sem (2)
// //             return (typeOrder[a.examType] || 3) - (typeOrder[b.examType] || 3);
// //         });
// //         setPapers(sorted); 
// //     } catch (err) { 
// //         console.error("Fetch Error:", err); 
// //         showAlert("Failed to load papers", "error");
// //     } finally {
// //         // Add a slight delay (500ms) so the skeleton doesn't "flash" too fast
// //         setTimeout(() => setLoading(false), 500); 
// //     }
// //   };

// const fetchPapers = async () => { 
//     setLoading(true);
//     try {
//         // 1. Ensure API_URL is defined to prevent "undefined/api..." errors
//         const baseURL = typeof API_URL !== 'undefined' ? API_URL : 'https://paperstack.onrender.com';
        
//         const res = await axios.get(`${baseURL}/api/papers`); 
        
//         console.log("✅ Data received:", res.data);

//         // 2. CRITICAL SAFETY CHECK: 
//         // If the server returns an error object or HTML (404), .sort() will crash the app.
//         if (!res.data || !Array.isArray(res.data)) {
//             console.error("Invalid data format:", res.data);
//             showAlert("Received invalid data from server", "error");
//             setPapers([]); // Set empty array to prevent map errors in UI
//             return; 
//         }

//         const sorted = res.data.sort((a, b) => {
//             // 3. SAFE SORTING: Handle null/undefined values to prevent NaN errors
//             const yearA = a.year || 0;
//             const yearB = b.year || 0;
//             const semA = a.semester || 0;
//             const semB = b.semester || 0;

//             // 1. Sort by Year (Newest first)
//             if (yearB !== yearA) return yearB - yearA;

//             // 2. Sort by Semester (Highest first)
//             if (semB !== semA) return semB - semA;

//             // 3. Sort by Exam Type
//             const typeOrder = { 'Mid-Sem': 1, 'End-Sem': 2 };
//             const typeA = typeOrder[a.examType] || 3;
//             const typeB = typeOrder[b.examType] || 3;
            
//             return typeA - typeB;
//         });

//         setPapers(sorted); 

//     } catch (err) { 
//         console.error("❌ Fetch Error:", err); 
//         // Check if showAlert exists before calling it
//         if (typeof showAlert === 'function') {
//             showAlert("Failed to load papers", "error");
//         }
//     } finally {
//         setTimeout(() => setLoading(false), 500); 
//     }
//   };

//   // Fixed handleUpload with Loader and proper logic
//   const handleUpload = async (e) => {
//     e.preventDefault();
//     if (!file) { showAlert("Please select a paper PDF", "error"); return; }
    
//     setIsUploading(true); // START LOADER

//     const data = new FormData();
//     Object.keys(formData).forEach(key => data.append(key, formData[key]));
//     data.append('file', file);
//     if(solutionFile) data.append('solution', solutionFile);

//     try {
//         const adminPass = localStorage.getItem('adminPass');
//         await axios.post(`${API_URL}/api/upload`, data, {
//             headers: { 'Content-Type': 'multipart/form-data', 'x-admin-password': adminPass }
//         });
//         showAlert("Paper Uploaded Successfully!", "success");
//         setFile(null); 
//         setSolutionFile(null);
//         fetchPapers(); // Refresh the list
//     } catch (err) { 
//         showAlert("Upload Failed. Check credentials/connection.", "error"); 
//         console.error(err); 
//     } finally {
//         setIsUploading(false); // STOP LOADER
//     }
//   };

//   // --- NEW: FUNCTION TO ADD SOLUTION TO EXISTING PAPER ---
//   const handleAddSolutionToExisting = async (paperId, selectedFile) => {
//     if (!selectedFile) return;
//     setIsUploading(true);
//     const data = new FormData();
//     data.append('solution', selectedFile);

//     try {
//       const adminPass = localStorage.getItem('adminPass');
//       // This matches the PUT route we discussed earlier
//       await axios.put(`${API_URL}/api/papers/${paperId}/solution`, data, {
//         headers: { 'Content-Type': 'multipart/form-data', 'x-admin-password': adminPass }
//       });
//       showAlert("Solution Added!", "success");
//       fetchPapers();
//     } catch (err) {
//       showAlert("Failed to upload solution", "error");
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   const handleDelete = async (e, paperId) => {
//       e.stopPropagation();
//       if(!window.confirm("⚠️ Delete this paper permanently?")) return;
//       try {
//           const adminPass = localStorage.getItem('adminPass');
//           await axios.delete(`${API_URL}/api/papers/${paperId}`, { headers: { 'x-admin-password': adminPass } });
//           showAlert("Deleted", "success");
//           setPapers(prev => prev.filter(p => p._id !== paperId));
//       } catch (err) { showAlert("Delete Failed", "error"); }
//   };

//   const getHardestSubject = () => {
//       if (!papers.length) return null;
//       const relevantPapers = filterSem ? papers.filter(p => p.semester.toString() === filterSem) : papers;
//       if (relevantPapers.length === 0) return null;
//       const scores = {};
//       relevantPapers.forEach(p => { const score = (p.views || 0) + (p.downloads || 0); scores[p.subject] = (scores[p.subject] || 0) + score; });
//       const hardest = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
//       return { subject: hardest, score: scores[hardest] };
//   };

//   const hardestSubject = getHardestSubject();

//   const handleView = async (paper) => {
//       setSelectedPaper(paper);
//       axios.post(`${API_URL}/api/papers/${paper._id}/view`);
//       setPapers(prev => prev.map(p => p._id === paper._id ? { ...p, views: (p.views || 0) + 1 } : p));
//   };

//   const handleDownload = async (e, paper) => {
//       e.stopPropagation();
//       window.open(paper.filePath, '_blank'); 
//       await axios.post(`${API_URL}/api/papers/${paper._id}/download`);
//       setPapers(prev => prev.map(p => p._id === paper._id ? { ...p, downloads: (p.downloads || 0) + 1 } : p));
//   };

//   const toggleBookmark = async (paperId, e) => {
//       e.stopPropagation();
//       if (!user) { showAlert("Please Login to Bookmark!", "info"); return; }
//       const res = await axios.put(`${API_URL}/api/user/bookmark/${paperId}`, {}, { headers: { Authorization: localStorage.getItem('token') } });
//       setUser({ ...user, bookmarks: res.data });
//   };
  
//   const displayedPapers = papers.filter(p => {
//       const matchesSearch = p.subject.toLowerCase().includes(searchTerm.toLowerCase());
//       const matchesTab = filter === 'saved' ? user?.bookmarks.includes(p._id) : true;
//       const matchesSem = filterSem ? p.semester.toString() === filterSem : true;
//       return matchesSearch && matchesTab && matchesSem;
//   });

//   return (
//     <> 
//     <Helmet>
//       {/* 1. This is where you put the info Google sees */}
//       <title>
//         {filterSem ? `Sem ${filterSem} | PaperStack IIIT Surat` : 'PaperStack | IIIT Surat Previous Year Papers'}
//       </title>
//       <meta name="description" content="Access all IIIT Surat previous semesters exam papers, solutions, and analytics in one place." />
//       <meta property="og:title" content="PaperStack - IIIT Surat Archive" />
//       <link rel="canonical" href="https://paperstackcom.vercel.app/" />

//       {/* Open Graph / Facebook (How it looks when shared) */}
//         <meta property="og:type" content="website" />
//         <meta property="og:title" content="PaperStack - IIIT Surat Archive" />
//         <meta property="og:description" content="Stop searching for papers on WhatsApp groups. Get them all here." />
//         <meta property="og:image" content="https://paperstackcom.vercel.app/logo.png" />

//         {/* Twitter */}
//         <meta name="twitter:card" content="summary_large_image" />
//         <meta name="twitter:title" content="PaperStack | IIIT Surat" />
//     </Helmet>

//     <div className="app-container">
//       {showSemModal && (
//         <SemesterModal 
//             user={user} 
//             setUser={setUser} 
//             showAlert={showAlert}
//             onClose={() => {
//                 setShowSemModal(false);
//                 if(user.semester) setFilterSem(user.semester.toString());
//             }} 
//         />
//       )}

//       <nav className="navbar">
//         <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
//           <img src={logo} alt="Logo" style={{ height: '45px', borderRadius: '8px', objectFit: 'contain' }} /> 
//           <span>PaperStack</span>
          
//         </div>
//         <div className="nav-links">
//           <button className="theme-btn" onClick={toggleTheme}>{theme === 'light' ? '🌙' : '☀️'}</button>
//           <button className="stats-btn" onClick={() => setShowAnalytics(!showAnalytics)}>📊 Stats</button>
          
//           {!isAdmin && <Link to="/admin" className="btn-admin-login">Admin</Link>}
//           {isAdmin && <span className="admin-badge">ADMIN MODE</span>}
          
//           {user ? (
//             <div className="user-info">
//               <span>👤 {user.username}</span>
//               <button onClick={() => setShowSemModal(true)} style={{ marginLeft: '10px', background: 'transparent', border: '1px solid currentColor', borderRadius: '4px', cursor: 'pointer', color: 'inherit', padding: '2px 6px', fontSize: '0.8rem' }}>
//                   Sem {user.semester || '?'} ✎
//               </button>
//               <button className="btn-logout" onClick={() => { localStorage.clear(); window.location.reload(); }}>Logout</button>
//             </div>
//           ) : <Link to="/login" className="btn-login">Login</Link>}
//         </div>
//       </nav>

//       <main className="main-content">
//         {showAnalytics && <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />}
        
//         {isAdmin && (
//             <div className="admin-upload-section">
//                 <div className="admin-card">
//                     <h3>📤 Admin Upload Panel</h3>
//                     <form onSubmit={handleUpload} className="upload-form">
//                         <div className="form-row">
//                             <input type="text" placeholder="Subject" onChange={e => setFormData({...formData, subject: e.target.value})} required />
//                             <input type="text" placeholder="Title" onChange={e => setFormData({...formData, title: e.target.value})} required />
//                         </div>
//                         <div className="form-row">
//                             <input type="number" placeholder="Year" onChange={e => setFormData({...formData, year: e.target.value})} required />
//                             <select onChange={e => setFormData({...formData, semester: e.target.value})} required>
//                                 <option value="">Select Sem</option>
//                                 {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
//                             </select>
//                             <select onChange={e => setFormData({...formData, examType: e.target.value})}>
//                                 <option>Mid-Sem</option><option>End-Sem</option>
//                             </select>
//                         </div>
//                         <div className="file-inputs">
//                             <label className="file-label">📄 Paper: <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files[0])} /><b> {file ? file.name : ''} </b></label>
//                             <label className="file-label">💡 Solution: <input type="file" accept="application/pdf" onChange={e => setSolutionFile(e.target.files[0])} /><b> {solutionFile ? solutionFile.name : ''}</b></label>
//                         </div>
                        
//                         {/* Updated Button with Loader Logic */}
//                         <button type="submit" className="btn-upload" disabled={isUploading}>
//                             {isUploading ? "⏳ Uploading to Cloudinary..." : "🚀 Upload Paper"}
//                         </button>
//                     </form>
//                 </div>
//             </div>
//         )}

//         <div className="controls-section">
//     <div className="controls-bar">
//         <div className="tabs">
//             <button className={filter === 'all' ? 'tab active' : 'tab'} onClick={() => setFilter('all')}>
//                 📚 Papers
//             </button>
//             <button className={filter === 'saved' ? 'tab active' : 'tab'} onClick={() => setFilter('saved')}>
//                 ❤️ Saved
//             </button>
//         </div>

//         {/* Updated this line to show filtered count */}
//         <span className="navbar-paper-count">
//             <h5>
//                 {searchTerm || filterSem !== '' ? 'Papers Found: ' : 'Total Papers: '} 
//                 {displayedPapers.length}
//             </h5>
//         </span>

//         <div className="filters">
//             <select className="sem-filter" value={filterSem} onChange={e => setFilterSem(e.target.value)}>
//                 <option value="">All Sems</option>
//                 {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
//             </select>
//             <input 
//                 className="search-input" 
//                 type="text" 
//                 placeholder="🔍 Search..." 
//                 onChange={e => setSearchTerm(e.target.value)} 
//             />
//         </div>
//     </div>

//     {hardestSubject && (
//         <div className="difficulty-banner">
//             <span className="fire-icon">🔥</span>
//             <div><strong>Insight:</strong> <span className="highlight-subject">{hardestSubject.subject}</span> is currently the toughest!</div>
//         </div>
//     )}
// </div>

//         <div className="papers-grid">
//             {loading ? (
//                 // showing skeleton while loading
//                 [...Array(6)].map((_, idx) => <PaperSkeleton key={idx} />) ) :

//                 displayedPapers.length === 0 && filterSem ? (
//                 <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: '#888'}}>
//                     <h3>No papers found for Semester {filterSem}</h3>
//                     <p>Try switching to "All Sems"</p>
//                 </div>
//             ) : (
//                 displayedPapers.map(p => (
//                     <div key={p._id} className="paper-card">
//                         <div className="card-stats-row">
//                             <div className="stat-item">👁️ {p.views || 0}</div>
//                             <div className="stat-item">⬇️ {p.downloads || 0}</div>
//                             <button className={`heart-icon ${user?.bookmarks.includes(p._id) ? 'liked' : ''}`} onClick={(e) => toggleBookmark(p._id, e)}>{user?.bookmarks.includes(p._id) ? '❤️' : '🤍'}</button>
//                         </div>
//                         <div className="card-body">
//                             <span className={`badge ${p.examType === 'Mid-Sem' ? 'mid' : 'end'}`}>{p.examType}</span>
//                             <h3 className="subject-name">{p.subject}</h3>
//                             <p className="paper-title">{p.title}</p>
//                             <p className="paper-meta">Sem {p.semester} • {p.year}</p>
//                         </div>
//                         <div className="card-actions">
//                             <button className="btn-view-pdf" onClick={() => handleView(p)}>📄 View</button>
//                             <div className="action-icons">
//                                 {p.solutionPath && <button className="btn-icon solution-icon" onClick={(e) => handleSolution(e, p)} title="Solution">💡</button>}
//                                 <button className="btn-icon download-icon" onClick={(e) => handleDownload(e, p)} title="Download">⬇</button>
//                                 {isAdmin && (
//                                 <label className="btn-icon solution-icon update-btn" title="Update Solution">
//                                     {p.solutionPath ? '🔄' : '➕'}
//                                     <input 
//                                         type="file" 
//                                         hidden 
//                                         accept="application/pdf" 
//                                         onChange={(e) => handleAddSolutionToExisting(p._id, e.target.files[0])} 
//                                     />
//                                 </label>
//                             )}
//                             {isAdmin && <button className="btn-icon delete-icon" onClick={(e) => handleDelete(e, p._id)}>🗑️</button>}
//                             </div>
//                         </div>
//                     </div>
//                 ))
//             )}
//         </div>
//       </main>
//       <Footer />
      
//       {selectedPaper && <PaperModal paper={selectedPaper} user={user} onClose={() => setSelectedPaper(null)} showAlert={showAlert} />}
//     </div>
//     </>
//   );
// }


// // --- MAIN APP COMPONENT ---
// export default function App() { 
//   const [user, setUser] = useState(null);
//   const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
//   const [alertInfo, setAlertInfo] = useState({ show: false, msg: '', type: 'success' });

//   const showAlert = (msg, type = 'success') => {
//     setAlertInfo({ show: true, msg, type });
//     setTimeout(() => {
//         setAlertInfo({ show: false, msg: '', type: '' });
//     }, 3000);
//   };

//   const toggleTheme = () => { const newTheme = theme === 'light' ? 'dark' : 'light'; setTheme(newTheme); localStorage.setItem('theme', newTheme); };
  
//   useEffect(() => { 
//       document.body.className = theme; 
//       const token = localStorage.getItem('token'); 
//       const username = localStorage.getItem('username'); 
//       const savedSem = localStorage.getItem('userSemester'); 
      
//       if(token && username) {
//           setUser({ 
//               username, 
//               bookmarks: [], 
//               semester: savedSem ? Number(savedSem) : null 
//           }); 
//       }
//   }, [theme]);

//   return (
//     <HelmetProvider>
//     <Router>
//         <CustomAlert alert={alertInfo} />
//         <Suspense fallback={<PageLoader />}>
//         <Routes>
//             <Route path="/" element={<Home user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} showAlert={showAlert} />} />
//             <Route path="/login" element={<Login setUser={setUser} showAlert={showAlert} />} />
//             <Route path="/register" element={<Register showAlert={showAlert} />} />
//             <Route path="/admin" element={<AdminLogin showAlert={showAlert} />} />
//         </Routes>
//         </Suspense>
//     </Router>
//     </HelmetProvider>
//   );
// }






















// import React, { useState, useEffect, useCallback } from 'react';
// import { BrowserRouter as Router, Routes, Route, useNavigate, Link } from 'react-router-dom';
// import axios from 'axios';
// import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
// import { HelmetProvider, Helmet } from 'react-helmet-async';
// import logo from './assets/Paperstack_logo_wt.png'; 
// import './App.css';

// // Backend URL (Render) - Your backend is on Render
// const API_URL = 'https://paperstack.onrender.com';

// // Frontend URL (Vercel) - Your frontend is on Vercel
// const FRONTEND_URL = 'https://paper-stack-beryl.vercel.app';

// // --- CUSTOM ALERT COMPONENT ---
// function CustomAlert({ alert }) {
//   if (!alert.show) return null;
//   return (
//     <div className={`custom-alert alert-${alert.type}`}>
//       <span>{alert.type === 'success' ? '✅' : alert.type === 'error' ? '⚠️' : 'ℹ️'}</span>
//       {alert.msg}
//     </div>
//   );
// }

// function Footer() {
//   return (
//     <footer className="site-footer">
//       <div className="container">
//         <div className="footer-grid">
//           {/* Brand Section with Logo */}
//           <div className="footer-brand">
//             <div className="footer-logo-wrapper">
//               <img src={logo} alt="PaperStack Logo - IIIT Surat Previous Year Papers Archive" className="footer-logo-img" />
//               <h3 className="footer-logo">PaperStack</h3>
//             </div>
//             <p className="footer-description">
//               The official archive for IIIT Surat previous year papers. 
//               Helping students prepare better with organized academic resources.
//             </p>
//             <p>Managed and maintained by <strong>Yogesh Khinchi</strong>.</p>
//           </div>

//           {/* Quick Links */}
//           <div className="footer-links">
//             <h4 className="footer-heading">Navigation</h4>
//             <ul className="footer-list">
//               <li><Link to="">Home</Link></li>
//               <li><Link to="/login">Student Login</Link></li>
//               <li><Link to="/admin">Admin Access</Link></li>
//             </ul>
//           </div>

//           {/* Community Section */}
//           <div className="footer-links">
//             <h4 className="footer-heading">Community</h4>
//             <ul className="footer-list">
//               <li><a href="https://github.com" target="_blank" rel="noreferrer noopener">GitHub</a></li>
//               <li><a href="https://linkedin.com" target="_blank" rel="noreferrer noopener">LinkedIn</a></li>
//               <li><a href="mailto:paperstack.iiitsurat@gmail.com">Support</a></li>
//             </ul>
//           </div>
//         </div>

//         {/* Bottom Bar */}
//         <div className="footer-bottom">
//           <p>&copy; {new Date().getFullYear()} IIIT Surat Archive. Built for the community.</p>
//           <div className="footer-status">
//             <span className="status-dot"></span>
//             System Online
//           </div>
//         </div>
//       </div>
//     </footer>
//   );
// }

// // --- AUTH COMPONENTS ---
// function Register({ showAlert }) { 
//   const [formData, setFormData] = useState({ username: '', email: '', password: '', semester: 1 });
//   const navigate = useNavigate();

//   const paperStackLogo = "/logo.png"; 

//   const handleRegister = async (e) => {
//     e.preventDefault();

//     // Domain Restriction: Ensure it's an official IIIT Surat email
//     if (!formData.email.toLowerCase().endsWith('@iiitsurat.ac.in')) {
//         showAlert("Access Denied: Please use your @iiitsurat.ac.in email", "error");
//         return;
//     }

//     try { 
//         await axios.post(`${API_URL}/api/auth/register`, formData); 
//         showAlert("Registration Successful! Please Login.", "success"); 
//         navigate('/login'); 
//     } 
//     catch (err) { 
//         showAlert(err.response?.data?.message || "Registration Failed", "error"); 
//         console.log("Registration error:", err);
//     }
//   };

//   return ( 
//     <div className="auth-page-wrapper">
//         <Helmet>
//           <title>Register - PaperStack | IIIT Surat Student Portal</title>
//           <meta name="description" content="Create your student account on PaperStack to access IIIT Surat previous year question papers, solutions, and study materials." />
//           <meta name="keywords" content="IIIT Surat registration, student account, IIIT Surat papers access, engineering student portal" />
//           <link rel="canonical" href={`${FRONTEND_URL}/register`} />
//         </Helmet>
        
//         <div className="auth-card login-card-animated">
//             <div className="login-logo-container">
//                 <img src={paperStackLogo} alt="PaperStack Logo - IIIT Surat Papers Archive" className="login-logo-img pulse-entry" />
//             </div>

//             <div className="login-intro">
//                 <h2 className="slide-up-text">
//                    <span className="paperstack-brand-text">IIIT Surat Archive</span>
//                 </h2>
//                 <p className="fade-in-text">Create your IIIT Surat student profile</p>
//             </div>

//             <div className="auth-note-box pulse-entry">
//                 <span className="note-icon">⚠️</span>
//                 <p><strong>Important:</strong> You can't reset your password, so choose it carefully.</p>
//             </div>

//             <form onSubmit={handleRegister} className="login-form-content">
//                 <div className="input-field-animation">
//                     <input 
//                         type="text" 
//                         placeholder="Username" 
//                         onChange={e => setFormData({...formData, username: e.target.value})} 
//                         required 
//                     />
//                 </div>
//                 <div className="input-field-animation-delay">
//                     <input 
//                         type="email" 
//                         placeholder="Institute Email (name@iiitsurat.ac.in)" 
//                         onChange={e => setFormData({...formData, email: e.target.value})} 
//                         required 
//                     />
//                 </div>
//                 <div className="input-field-animation-delay">
//                     <input 
//                         type="password" 
//                         placeholder="Password" 
//                         onChange={e => setFormData({...formData, password: e.target.value})} 
//                         required 
//                     />
//                 </div>

//                 <div className="sem-select-container">
//                     <label>Current Semester:</label>
//                     <select 
//                         value={formData.semester} 
//                         onChange={e => setFormData({...formData, semester: Number(e.target.value)})}
//                     >
//                         {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
//                     </select>
//                 </div>

//                 <button type="submit" className="login-btn-gradient">
//                     Create Account
//                 </button>
//             </form>
            
//             <p className="auth-switch-text">
//                 Already have an account? <Link to="/login">Login here</Link>
//             </p>
//         </div>
//     </div> 
//   );
// }

// function Login({ setUser, showAlert }) { 
//   const [formData, setFormData] = useState({ email: '', password: '' });
//   const navigate = useNavigate();

//   const paperStackLogo = "/logo.png"; 
//   const iiitSuratLogo = "/iiit_surat.png";

//   const handleLogin = async (e) => {
//     e.preventDefault();

//     if (!formData.email.toLowerCase().endsWith('@iiitsurat.ac.in')) {
//         showAlert("Access Denied: Please use your @iiitsurat.ac.in email", "error");
//         return;
//     }

//     try { 
//         const res = await axios.post(`${API_URL}/api/auth/login`, formData); 
//         localStorage.setItem('token', res.data.token); 
//         localStorage.setItem('username', res.data.username);
//         if(res.data.semester) localStorage.setItem('userSemester', res.data.semester);

//         setUser({ 
//             username: res.data.username, 
//             bookmarks: res.data.bookmarks,
//             semester: res.data.semester 
//         }); 
        
//         navigate('/'); 
//         showAlert(`Welcome back, ${res.data.username}!`, "success");
//     } 
//     catch (err) { 
//         showAlert(err.response?.data?.message || "Invalid Credentials", "error"); 
//     }
//   };
  
//   return ( 
//     <div className="auth-page-wrapper">
//       <Helmet>
//         <title>Login - PaperStack | IIIT Surat Student Access</title>
//         <meta name="description" content="Login to your PaperStack account to access IIIT Surat previous year question papers, solutions, and exam resources." />
//         <meta name="keywords" content="IIIT Surat login, student portal, access papers, engineering exam papers login" />
//         <link rel="canonical" href={`${FRONTEND_URL}/login`} />
//       </Helmet>
      
//       <div className="auth-card login-card-animated">
//           <div className="login-logo-container">
//               <img src={paperStackLogo} alt="PaperStack Logo - IIIT Surat Papers" className="login-logo-img pulse-entry" />
//               <div className="logo-vertical-line"></div>
//               <img src={iiitSuratLogo} alt="IIIT Surat Logo" className="login-logo-img pulse-entry-delay" />
//           </div>
          
//           <div className="login-intro">
//               <h2 className="slide-up-text">IIIT SURAT ARCHIVE</h2>
//               <p className="fade-in-text">Login to access your semester papers</p>
//           </div>

//           <form onSubmit={handleLogin} className="login-form-content">
//               <div className="input-field-animation">
//                   <input 
//                       type="email" 
//                       placeholder="Institute Email ID" 
//                       onChange={e => setFormData({...formData, email: e.target.value})} 
//                       required 
//                   />
//               </div>
//               <div className="input-field-animation-delay">
//                   <input 
//                       type="password" 
//                       placeholder="Password" 
//                       onChange={e => setFormData({...formData, password: e.target.value})} 
//                       required 
//                   />
//               </div>
//               <button type="submit" className="auth-btn login-btn-gradient">
//                   Secure Login
//               </button>
//           </form>
//           <p className="auth-switch-text">
//               Not registered? <Link to="/register">Join the Community</Link>
//           </p>
//            <div className="auth-note-box pulse-entry">
//               <span className="note-icon">⚠️</span>
//               <p><strong>NOTE:</strong> For any queries mail at : <a href="mailto:paperstack.iiitsurat@gmail.com">paperstack.iiitsurat@gmail.com</a></p>
//           </div>
//       </div>
//     </div> 
//   );
// }

// function AdminLogin({ showAlert }) {
//   const [password, setPassword] = useState('');
//   const navigate = useNavigate();

//   const handleAdminLogin = async (e) => { 
//       e.preventDefault(); 
//       try { 
//           const res = await axios.post(`${API_URL}/api/admin/verify`, { password }); 
//           if(res.data.success) { 
//               localStorage.setItem('adminPass', password); 
//               showAlert("Admin Verified!", "success");
//               navigate('/'); 
//           } 
//       } catch { showAlert("Wrong Password", "error"); } 
//   };
  
//   return ( 
//     <div className="auth-container">
//       <Helmet>
//         <title>Admin Login - PaperStack | IIIT Surat Management</title>
//         <meta name="description" content="Admin access portal for PaperStack - IIIT Surat's previous year papers archive management system." />
//         <link rel="canonical" href={`${FRONTEND_URL}/admin`} />
//       </Helmet>
//       <div className="auth-card">
//         <h2>🔐 Admin Access</h2>
//         <form onSubmit={handleAdminLogin}>
//           <input type="password" placeholder="Admin Password" onChange={e=>setPassword(e.target.value)} />
//           <button className="auth-btn">Unlock</button>
//         </form>
//       </div>
//     </div> 
//   );
// }

// // --- SEMESTER SELECTION MODAL ---
// function SemesterModal({ user, setUser, onClose, showAlert }) {
//     const [selectedSem, setSelectedSem] = useState(user?.semester || 1);

//     const handleSave = async () => {
//         try {
//             await axios.put(`${API_URL}/api/user/semester`, 
//                 { semester: selectedSem }, 
//                 { headers: { Authorization: localStorage.getItem('token') } }
//             );

//             const updatedUser = { ...user, semester: selectedSem };
//             setUser(updatedUser);
//             localStorage.setItem('userSemester', selectedSem);
            
//             if(showAlert) showAlert(`Preference saved: Semester ${selectedSem}`, "success");
//             if (onClose) onClose();
//         } catch (err) {
//             if(showAlert) showAlert("Failed to save semester", "error");
//             console.error(err);
//         }
//     };

//     return (
//         <div className="modal-overlay">
//             <div className="modal-content" style={{ maxWidth: '310px', maxHeight: '250px', width: '90%', padding: '25px', textAlign: 'center', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
//                 <h3>🎓 Which Semester are you in?</h3>
//                 <p>We'll show you these papers first.</p>
//                 <div style={{ margin: '10px 0' }}>
//                     <select 
//                         value={selectedSem} 
//                         onChange={(e) => setSelectedSem(Number(e.target.value))}
//                         style={{ padding: '10px', fontSize: '16px', width: '100%' }}
//                     >
//                         {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
//                     </select>
//                 </div>
//                 <button onClick={handleSave} className="auth-btn">Save Preference</button>
//             </div>
//         </div>
//     );
// }

// // --- ANALYTICS DASHBOARD ---
// function AnalyticsDashboard({ onClose }) {
//     const [data, setData] = useState([]);
//     useEffect(() => { 
//         axios.get(`${API_URL}/api/analytics`)
//             .then(res => setData(res.data))
//             .catch(err => console.error("Analytics error:", err)); 
//     }, []);

//     return (
//         <div className="analytics-panel">
//             <div className="panel-header">
//                 <h3>📊 Exam Difficulty Analytics</h3>
//                 <button onClick={onClose} className="close-btn">✖</button>
//             </div>
//             <div className="chart-container">
//                 <ResponsiveContainer width="100%" height={300}>
//                     <BarChart data={data}>
//                         <XAxis dataKey="_id" stroke="#8884d8" />
//                         <YAxis />
//                         <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ color: '#333' }} />
//                         <Bar dataKey="totalViews" fill="#4f46e5" radius={[4, 4, 0, 0]}>
//                             {data.map((entry, index) => (
//                                 <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#4f46e5'} />
//                             ))}
//                         </Bar>
//                     </BarChart>
//                 </ResponsiveContainer>
//                 <p className="insight-text">
//                     💡 <strong>Insight:</strong> "{data[0]?._id || 'No data'}" seems to be the toughest subject!
//                 </p>
//             </div>
//         </div>
//     );
// }

// // --- UPDATED PAPER DETAILS MODAL ---
// function PaperModal({ paper, user, onClose, showAlert }) {
//     const [comments, setComments] = useState([]);
//     const [newComment, setNewComment] = useState('');
//     const [iframeLoading, setIframeLoading] = useState(true);

//     const fetchComments = useCallback(async () => { 
//         try {
//             const res = await axios.get(`${API_URL}/api/papers/${paper._id}/comments`); 
//             setComments(res.data); 
//         } catch (err) {
//             console.error("Error fetching comments", err);
//         }
//     }, [paper._id]);

//     useEffect(() => { 
//         fetchComments(); 
//         setIframeLoading(true);
//     }, [paper._id, fetchComments]);

//     const postComment = async (e) => {
//         e.preventDefault();
//         if(!newComment.trim()) return;
//         if(!user) { showAlert("Please Login to comment", "error"); return; }
        
//         try {
//             await axios.post(
//                 `${API_URL}/api/papers/${paper._id}/comments`, 
//                 { text: newComment }, 
//                 { headers: { Authorization: localStorage.getItem('token') } }
//             );
//             setNewComment(''); 
//             fetchComments();
//         } catch (err) { 
//             showAlert("Failed to post comment", "error"); 
//         }
//     };

//     return (
//         <div className="modal-overlay" onClick={onClose}>
//             <div className="modal-content" onClick={e => e.stopPropagation()}>
//                 <button className="close-modal-btn" onClick={onClose}>✖</button>
                
//                 <div className="modal-split">
//                     {/* LEFT SIDE: PDF Viewer */}
//                     <div className="modal-left">
//                         <div className="modal-header-info">
//                             <h3>📄 {paper.subject}</h3>
//                             <span className="badge-pill">{paper.examType} • {paper.year}</span>
//                         </div>

//                         <div className="pdf-container">
//                             {iframeLoading && (
//                                 <div className="pdf-skeleton">
//                                     <div className="skeleton-shimmer"></div>
//                                     <p>Loading document...</p>
//                                 </div>
//                             )}
                            
//                             <iframe 
//                                 src={`${paper.filePath}#toolbar=0`}
//                                 title={`${paper.subject} ${paper.examType} Paper - Semester ${paper.semester}, ${paper.year}`}
//                                 className="pdf-frame"
//                                 onLoad={() => setIframeLoading(false)}
//                                 style={{ opacity: iframeLoading ? 0 : 1 }}
//                             ></iframe>
//                         </div>

//                         <div className="modal-actions">
//                             <a href={paper.filePath} target="_blank" rel="noopener noreferrer" className="btn-download">
//                                 ⬇️ Download Paper
//                             </a>
//                             {paper.solutionPath && (
//                                 <a href={paper.solutionPath} target="_blank" rel="noopener noreferrer" className="btn-solution">
//                                     💡 View Solution
//                                 </a>
//                             )}
//                         </div>
//                     </div>

//                     {/* RIGHT SIDE: Comments/Doubts */}
//                     <div className="modal-right">
//                         <div className="discussion-header">
//                             <h3>💬 Doubt Section</h3>
//                             <p>{comments.length} Thoughts</p>
//                         </div>

//                         <div className="comments-list">
//                             {comments.length === 0 ? (
//                                 <div className="empty-comments">
//                                     <p>No doubts yet. Be the first to ask!</p>
//                                 </div>
//                             ) : (
//                                 comments.map(c => (
//                                     <div key={c._id} className="comment-bubble">
//                                         <div className="comment-user-icon">
//                                             {c.username.charAt(0).toUpperCase()}
//                                         </div>
//                                         <div className="comment-details">
//                                             <strong>{c.username}</strong>
//                                             <p>{c.text}</p>
//                                         </div>
//                                     </div>
//                                 ))
//                             )}
//                         </div>

//                         <form onSubmit={postComment} className="comment-form">
//                             <input 
//                                 value={newComment} 
//                                 onChange={e => setNewComment(e.target.value)} 
//                                 placeholder={user ? "Write a doubt..." : "Login to join discussion"} 
//                                 disabled={!user} 
//                             />
//                             <button type="submit" disabled={!user || !newComment.trim()}>
//                                 Send
//                             </button>
//                         </form>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }

// function PaperSkeleton() {
//   return (
//     <div className="paper-card skeleton">
//       <div className="card-stats-row">
//         <div className="skeleton-circle"></div>
//         <div className="skeleton-circle"></div>
//         <div className="skeleton-circle"></div>
//       </div>
//       <div className="card-body">
//         <div className="skeleton-line skeleton-badge"></div>
//         <div className="skeleton-line skeleton-title"></div>
//         <div className="skeleton-line skeleton-text"></div>
//         <div className="skeleton-line skeleton-meta"></div>
//       </div>
//       <div className="card-actions">
//         <div className="skeleton-line skeleton-button"></div>
//       </div>
//     </div>
//   );
// }

// // --- HOME COMPONENT ---
// function Home({ user, setUser, theme, toggleTheme, showAlert }) {
//   const [papers, setPapers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState('all'); 
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterSem, setFilterSem] = useState(user?.semester?.toString() || '');
//   const [showAnalytics, setShowAnalytics] = useState(false);
//   const [selectedPaper, setSelectedPaper] = useState(null);
//   const [showSemModal, setShowSemModal] = useState(false);
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [formData, setFormData] = useState({ title: '', subject: '', year: '', semester: '', examType: 'Mid-Sem' });
//   const [file, setFile] = useState(null);
//   const [solutionFile, setSolutionFile] = useState(null);
//   const [isUploading, setIsUploading] = useState(false);

//   const handleSolution = (e, paper) => {
//       e.stopPropagation();
//       if(paper.solutionPath) {
//           window.open(paper.solutionPath, '_blank');
//       } else {
//           showAlert("No solution available", "info");
//       }
//   };

//   const fetchPapers = useCallback(async () => { 
//     setLoading(true);
//     try {
//         const res = await axios.get(`${API_URL}/api/papers`); 
        
//         if (!res.data || !Array.isArray(res.data)) {
//             console.error("Invalid data format:", res.data);
//             showAlert("Received invalid data from server", "error");
//             setPapers([]);
//             return; 
//         }

//         const sorted = res.data.sort((a, b) => {
//             const yearA = a.year || 0;
//             const yearB = b.year || 0;
//             const semA = a.semester || 0;
//             const semB = b.semester || 0;

//             if (yearB !== yearA) return yearB - yearA;
//             if (semB !== semA) return semB - semA;

//             const typeOrder = { 'Mid-Sem': 1, 'End-Sem': 2 };
//             const typeA = typeOrder[a.examType] || 3;
//             const typeB = typeOrder[b.examType] || 3;
            
//             return typeA - typeB;
//         });

//         setPapers(sorted); 
//     } catch (err) { 
//         console.error("❌ Fetch Error:", err); 
//         showAlert("Failed to load papers. Please check your connection.", "error");
//     } finally {
//         setTimeout(() => setLoading(false), 500); 
//     }
//   }, [showAlert]);

//   useEffect(() => { 
//       fetchPapers(); 
//       if(localStorage.getItem('adminPass')) setIsAdmin(true);
//       if (user && !user.semester) { setShowSemModal(true); }
//       if (user && user.semester) { setFilterSem(user.semester.toString()); }
//   }, [user, fetchPapers]);

//   const handleUpload = async (e) => {
//     e.preventDefault();
//     if (!file) { showAlert("Please select a paper PDF", "error"); return; }
    
//     setIsUploading(true);

//     const data = new FormData();
//     Object.keys(formData).forEach(key => data.append(key, formData[key]));
//     data.append('file', file);
//     if(solutionFile) data.append('solution', solutionFile);

//     try {
//         const adminPass = localStorage.getItem('adminPass');
//         await axios.post(`${API_URL}/api/upload`, data, {
//             headers: { 'Content-Type': 'multipart/form-data', 'x-admin-password': adminPass }
//         });
//         showAlert("Paper Uploaded Successfully!", "success");
//         setFile(null); 
//         setSolutionFile(null);
//         fetchPapers();
//     } catch (err) { 
//         showAlert("Upload Failed. Check credentials/connection.", "error"); 
//         console.error(err); 
//     } finally {
//         setIsUploading(false);
//     }
//   };

//   const handleAddSolutionToExisting = async (paperId, selectedFile) => {
//     if (!selectedFile) return;
//     setIsUploading(true);
//     const data = new FormData();
//     data.append('solution', selectedFile);

//     try {
//       const adminPass = localStorage.getItem('adminPass');
//       await axios.put(`${API_URL}/api/papers/${paperId}/solution`, data, {
//         headers: { 'Content-Type': 'multipart/form-data', 'x-admin-password': adminPass }
//       });
//       showAlert("Solution Added!", "success");
//       fetchPapers();
//     } catch (err) {
//       showAlert("Failed to upload solution", "error");
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   const handleDelete = async (e, paperId) => {
//       e.stopPropagation();
//       if(!window.confirm("⚠️ Delete this paper permanently?")) return;
//       try {
//           const adminPass = localStorage.getItem('adminPass');
//           await axios.delete(`${API_URL}/api/papers/${paperId}`, { headers: { 'x-admin-password': adminPass } });
//           showAlert("Deleted", "success");
//           setPapers(prev => prev.filter(p => p._id !== paperId));
//       } catch (err) { showAlert("Delete Failed", "error"); }
//   };

//   const getHardestSubject = () => {
//       if (!papers.length) return null;
//       const relevantPapers = filterSem ? papers.filter(p => p.semester.toString() === filterSem) : papers;
//       if (relevantPapers.length === 0) return null;
//       const scores = {};
//       relevantPapers.forEach(p => { 
//           const score = (p.views || 0) + (p.downloads || 0); 
//           scores[p.subject] = (scores[p.subject] || 0) + score; 
//       });
//       const hardest = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
//       return { subject: hardest, score: scores[hardest] };
//   };

//   const hardestSubject = getHardestSubject();

//   const handleView = async (paper) => {
//       setSelectedPaper(paper);
//       try {
//           await axios.post(`${API_URL}/api/papers/${paper._id}/view`);
//       } catch (err) {
//           console.error("Failed to increment view count:", err);
//       }
//       setPapers(prev => prev.map(p => p._id === paper._id ? { ...p, views: (p.views || 0) + 1 } : p));
//   };

//   const handleDownload = async (e, paper) => {
//       e.stopPropagation();
//       window.open(paper.filePath, '_blank'); 
//       try {
//           await axios.post(`${API_URL}/api/papers/${paper._id}/download`);
//       } catch (err) {
//           console.error("Failed to increment download count:", err);
//       }
//       setPapers(prev => prev.map(p => p._id === paper._id ? { ...p, downloads: (p.downloads || 0) + 1 } : p));
//   };

//   const toggleBookmark = async (paperId, e) => {
//       e.stopPropagation();
//       if (!user) { showAlert("Please Login to Bookmark!", "info"); return; }
//       try {
//           const res = await axios.put(`${API_URL}/api/user/bookmark/${paperId}`, {}, { 
//               headers: { Authorization: localStorage.getItem('token') } 
//           });
//           setUser({ ...user, bookmarks: res.data });
//       } catch (err) {
//           showAlert("Failed to bookmark", "error");
//       }
//   };
  
//   const displayedPapers = papers.filter(p => {
//       const matchesSearch = p.subject.toLowerCase().includes(searchTerm.toLowerCase());
//       const matchesTab = filter === 'saved' ? user?.bookmarks.includes(p._id) : true;
//       const matchesSem = filterSem ? p.semester.toString() === filterSem : true;
//       return matchesSearch && matchesTab && matchesSem;
//   });

//   // SEO Structured Data
//   const websiteStructuredData = {
//     "@context": "https://schema.org",
//     "@type": "EducationalOrganization",
//     "name": "PaperStack - IIIT Surat Archive",
//     "url": `${FRONTEND_URL}/`,
//     "logo": `${FRONTEND_URL}/logo.png`,
//     "description": "Digital archive of previous year question papers for IIIT Surat students",
//     "founder": "Yogesh Khinchi",
//     "keywords": "IIIT Surat papers, question papers, exam papers, engineering papers",
//     "educationalLevel": "Undergraduate",
//     "educationalProgram": "Bachelor of Technology (B.Tech)"
//   };

//   const breadcrumbStructuredData = {
//     "@context": "https://schema.org",
//     "@type": "BreadcrumbList",
//     "itemListElement": [
//       {
//         "@type": "ListItem",
//         "position": 1,
//         "name": "Home",
//         "item": `${FRONTEND_URL}/`
//       },
//       {
//         "@type": "ListItem",
//         "position": 2,
//         "name": filterSem ? `Semester ${filterSem} Papers` : "All Papers",
//         "item": `${FRONTEND_URL}/${filterSem ? `?sem=${filterSem}` : ''}`
//       }
//     ]
//   };

//   const faqStructuredData = {
//     "@context": "https://schema.org",
//     "@type": "FAQPage",
//     "mainEntity": [
//       {
//         "@type": "Question",
//         "name": "What is PaperStack?",
//         "acceptedAnswer": {
//           "@type": "Answer",
//           "text": "PaperStack is the official archive of IIIT Surat previous year question papers, providing free access to exam papers for all semesters and subjects."
//         }
//       },
//       {
//         "@type": "Question",
//         "name": "Are the papers free to download?",
//         "acceptedAnswer": {
//           "@type": "Answer",
//           "text": "Yes, all question papers on PaperStack are completely free to view and download for IIIT Surat students."
//         }
//       },
//       {
//         "@type": "Question",
//         "name": "Which semesters are covered?",
//         "acceptedAnswer": {
//           "@type": "Answer",
//           "text": "We provide papers for all 8 semesters of B.Tech program including both Mid-Semester and End-Semester exams."
//         }
//       }
//     ]
//   };

//   return (
//     <> 
//     <Helmet>
//       <title>
//         {filterSem ? `Sem ${filterSem} Papers - IIIT Surat Previous Year Question Papers` : 'IIIT Surat Previous Year Papers - PaperStack Archive'}
//       </title>
//       <meta 
//         name="description" 
//         content="Access 1000+ IIIT Surat previous year question papers, solutions, and study materials for all semesters (1-8). Download free exam papers for Mid-Sem and End-Sem exams." 
//       />
//       <meta 
//         name="keywords" 
//         content="IIIT Surat previous year papers, IIIT Surat question papers, semester exam papers, engineering question papers, mid sem papers, end sem papers, computer science papers, BTech papers"
//       />
//       <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
//       <link rel="canonical" href={`${FRONTEND_URL}/`} />
      
//       {/* Open Graph / Facebook */}
//       <meta property="og:type" content="website" />
//       <meta property="og:title" content="PaperStack - IIIT Surat Previous Year Papers Archive" />
//       <meta property="og:description" content="Free access to IIIT Surat previous year question papers, solutions, and study resources for all engineering branches and semesters." />
//       <meta property="og:image" content={`${FRONTEND_URL}/logo.png`} />
//       <meta property="og:url" content={`${FRONTEND_URL}/`} />
//       <meta property="og:site_name" content="PaperStack" />
//       <meta property="og:locale" content="en_IN" />
//       <meta property="og:image:width" content="1200" />
//       <meta property="og:image:height" content="630" />
//       <meta property="og:image:alt" content="IIIT Surat Previous Year Papers - PaperStack" />
      
//       {/* Twitter */}
//       <meta name="twitter:card" content="summary_large_image" />
//       <meta name="twitter:title" content="PaperStack | IIIT Surat Question Papers" />
//       <meta name="twitter:description" content="Download free IIIT Surat previous year papers for all semesters." />
//       <meta name="twitter:image" content={`${FRONTEND_URL}/logo.png`} />
      
//       {/* Additional Meta Tags */}
//       <meta name="author" content="Yogesh Khinchi, IIIT Surat" />
//       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//       <meta name="theme-color" content="#4f46e5" />
//       <meta name="language" content="English" />
      
//       {/* Structured Data for SEO */}
//       <script type="application/ld+json">
//         {JSON.stringify(websiteStructuredData)}
//       </script>
//       <script type="application/ld+json">
//         {JSON.stringify(breadcrumbStructuredData)}
//       </script>
//       <script type="application/ld+json">
//         {JSON.stringify(faqStructuredData)}
//       </script>
//     </Helmet>

//     <div className="app-container">
//       {showSemModal && (
//         <SemesterModal 
//             user={user} 
//             setUser={setUser} 
//             showAlert={showAlert}
//             onClose={() => {
//                 setShowSemModal(false);
//                 if(user.semester) setFilterSem(user.semester.toString());
//             }} 
//         />
//       )}

//       <nav className="navbar">
//         <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
//           <img src={logo} alt="PaperStack Logo - IIIT Surat Previous Year Papers Archive" style={{ height: '45px', borderRadius: '8px', objectFit: 'contain' }} /> 
//           <span>PaperStack</span>
//         </div>
//         <div className="nav-links">
//           <button className="theme-btn" onClick={toggleTheme}>{theme === 'light' ? '🌙' : '☀️'}</button>
//           <button className="stats-btn" onClick={() => setShowAnalytics(!showAnalytics)}>📊 Stats</button>
          
//           {!isAdmin && <Link to="/admin" className="btn-admin-login">Admin</Link>}
//           {isAdmin && <span className="admin-badge">ADMIN MODE</span>}
          
//           {user ? (
//             <div className="user-info">
//               <span>👤 {user.username}</span>
//               <button onClick={() => setShowSemModal(true)} style={{ marginLeft: '10px', background: 'transparent', border: '1px solid currentColor', borderRadius: '4px', cursor: 'pointer', color: 'inherit', padding: '2px 6px', fontSize: '0.8rem' }}>
//                   Sem {user.semester || '?'} ✎
//               </button>
//               <button className="btn-logout" onClick={() => { localStorage.clear(); window.location.reload(); }}>Logout</button>
//             </div>
//           ) : <Link to="/login" className="btn-login">Login</Link>}
//         </div>
//       </nav>

//       <main className="main-content">
//         <h1 className="visually-hidden">IIIT Surat Previous Year Question Papers Archive</h1>
        
//         {showAnalytics && <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />}
        
//         {isAdmin && (
//             <div className="admin-upload-section">
//                 <div className="admin-card">
//                     <h3>📤 Admin Upload Panel</h3>
//                     <form onSubmit={handleUpload} className="upload-form">
//                         <div className="form-row">
//                             <input type="text" placeholder="Subject" onChange={e => setFormData({...formData, subject: e.target.value})} required />
//                             <input type="text" placeholder="Title" onChange={e => setFormData({...formData, title: e.target.value})} required />
//                         </div>
//                         <div className="form-row">
//                             <input type="number" placeholder="Year" onChange={e => setFormData({...formData, year: e.target.value})} required />
//                             <select onChange={e => setFormData({...formData, semester: e.target.value})} required>
//                                 <option value="">Select Sem</option>
//                                 {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
//                             </select>
//                             <select onChange={e => setFormData({...formData, examType: e.target.value})}>
//                                 <option>Mid-Sem</option><option>End-Sem</option>
//                             </select>
//                         </div>
//                         <div className="file-inputs">
//                             <label className="file-label">📄 Paper: <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files[0])} /><b> {file ? file.name : ''} </b></label>
//                             <label className="file-label">💡 Solution: <input type="file" accept="application/pdf" onChange={e => setSolutionFile(e.target.files[0])} /><b> {solutionFile ? solutionFile.name : ''}</b></label>
//                         </div>
                        
//                         <button type="submit" className="btn-upload" disabled={isUploading}>
//                             {isUploading ? "⏳ Uploading to Cloudinary..." : "🚀 Upload Paper"}
//                         </button>
//                     </form>
//                 </div>
//             </div>
//         )}

//         <div className="controls-section">
//           <h2 className="section-heading">
//             {filterSem ? `Semester ${filterSem} Question Papers` : 'All Semester Papers'}
//           </h2>
          
//           <div className="controls-bar">
//               <div className="tabs">
//                   <button className={filter === 'all' ? 'tab active' : 'tab'} onClick={() => setFilter('all')}>
//                       📚 Papers
//                   </button>
//                   <button className={filter === 'saved' ? 'tab active' : 'tab'} onClick={() => setFilter('saved')}>
//                       ❤️ Saved
//                   </button>
//               </div>

//               <span className="navbar-paper-count">
//                   <h5>
//                       {searchTerm || filterSem !== '' ? 'Papers Found: ' : 'Total Papers: '} 
//                       {displayedPapers.length}
//                   </h5>
//               </span>

//               <div className="filters">
//                   <select className="sem-filter" value={filterSem} onChange={e => setFilterSem(e.target.value)}>
//                       <option value="">All Sems</option>
//                       {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
//                   </select>
//                   <input 
//                       className="search-input" 
//                       type="text" 
//                       placeholder="🔍 Search..." 
//                       onChange={e => setSearchTerm(e.target.value)} 
//                   />
//               </div>
//           </div>

//           {hardestSubject && (
//               <div className="difficulty-banner">
//                   <span className="fire-icon">🔥</span>
//                   <div><strong>Insight:</strong> <span className="highlight-subject">{hardestSubject.subject}</span> is currently the toughest!</div>
//               </div>
//           )}
//         </div>

//         <div className="papers-grid">
//             {loading ? (
//                 [...Array(6)].map((_, idx) => <PaperSkeleton key={idx} />) ) :

//                 displayedPapers.length === 0 && filterSem ? (
//                 <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: '#888'}}>
//                     <h3>No papers found for Semester {filterSem}</h3>
//                     <p>Try switching to "All Sems"</p>
//                 </div>
//             ) : (
//                 displayedPapers.map(p => (
//                     <div key={p._id} className="paper-card">
//                         <div className="card-stats-row">
//                             <div className="stat-item">👁️ {p.views || 0}</div>
//                             <div className="stat-item">⬇️ {p.downloads || 0}</div>
//                             <button className={`heart-icon ${user?.bookmarks.includes(p._id) ? 'liked' : ''}`} onClick={(e) => toggleBookmark(p._id, e)}>
//                                 {user?.bookmarks.includes(p._id) ? '❤️' : '🤍'}
//                             </button>
//                         </div>
//                         <div className="card-body">
//                             <span className={`badge ${p.examType === 'Mid-Sem' ? 'mid' : 'end'}`}>{p.examType}</span>
//                             <h3 className="subject-name">{p.subject}</h3>
//                             <p className="paper-title">{p.title}</p>
//                             <p className="paper-meta">Sem {p.semester} • {p.year}</p>
//                         </div>
//                         <div className="card-actions">
//                             <button className="btn-view-pdf" onClick={() => handleView(p)}>📄 View</button>
//                             <div className="action-icons">
//                                 {p.solutionPath && <button className="btn-icon solution-icon" onClick={(e) => handleSolution(e, p)} title="Solution">💡</button>}
//                                 <button className="btn-icon download-icon" onClick={(e) => handleDownload(e, p)} title="Download">⬇</button>
//                                 {isAdmin && (
//                                 <label className="btn-icon solution-icon update-btn" title="Update Solution">
//                                     {p.solutionPath ? '🔄' : '➕'}
//                                     <input 
//                                         type="file" 
//                                         hidden 
//                                         accept="application/pdf" 
//                                         onChange={(e) => handleAddSolutionToExisting(p._id, e.target.files[0])} 
//                                     />
//                                 </label>
//                             )}
//                             {isAdmin && <button className="btn-icon delete-icon" onClick={(e) => handleDelete(e, p._id)}>🗑️</button>}
//                             </div>
//                         </div>
//                     </div>
//                 ))
//             )}
//         </div>
//       </main>
//       <Footer />
      
//       {selectedPaper && <PaperModal paper={selectedPaper} user={user} onClose={() => setSelectedPaper(null)} showAlert={showAlert} />}
//     </div>
//     </>
//   );
// }

// // --- MAIN APP COMPONENT ---
// export default function App() { 
//   const [user, setUser] = useState(null);
//   const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
//   const [alertInfo, setAlertInfo] = useState({ show: false, msg: '', type: 'success' });

//   const showAlert = useCallback((msg, type = 'success') => {
//     setAlertInfo({ show: true, msg, type });
//     setTimeout(() => {
//         setAlertInfo({ show: false, msg: '', type: '' });
//     }, 3000);
//   }, []);

//   const toggleTheme = () => { 
//     const newTheme = theme === 'light' ? 'dark' : 'light'; 
//     setTheme(newTheme); 
//     localStorage.setItem('theme', newTheme); 
//   };
  
//   useEffect(() => { 
//       document.body.className = theme; 
//       const token = localStorage.getItem('token'); 
//       const username = localStorage.getItem('username'); 
//       const savedSem = localStorage.getItem('userSemester'); 
      
//       if(token && username) {
//           setUser({ 
//               username, 
//               bookmarks: [], 
//               semester: savedSem ? Number(savedSem) : null 
//           }); 
//       }
//   }, [theme]);

//   return (
//     <HelmetProvider>
//     <Router>
//         <CustomAlert alert={alertInfo} />
//         <Routes>
//             <Route path="/" element={<Home user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} showAlert={showAlert} />} />
//             <Route path="/login" element={<Login setUser={setUser} showAlert={showAlert} />} />
//             <Route path="/register" element={<Register showAlert={showAlert} />} />
//             <Route path="/admin" element={<AdminLogin showAlert={showAlert} />} />
//             <Route path="*" element={
//               <div className="not-found-page" style={{textAlign: 'center', padding: '50px 20px'}}>
//                 <h1>404 - Page Not Found</h1>
//                 <p>The page you're looking for doesn't exist.</p>
//                 <Link to="/" style={{color: '#4f46e5', textDecoration: 'underline'}}>Return to Papers</Link>
//               </div>
//             } />
//         </Routes>
//     </Router>
//     </HelmetProvider>
//   );
// }















// import React, { useState, useEffect, useCallback } from 'react';
// import { BrowserRouter as Router, Routes, Route, useNavigate, Link } from 'react-router-dom';
// import axios from 'axios';
// import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
// import { HelmetProvider, Helmet } from 'react-helmet-async';
// import logo from './assets/Paperstack_logo_wt.png'; 
// import './App.css';

// // Backend URL (Render) - Your backend is on Render
// const API_URL = 'https://paperstack.onrender.com';

// // Frontend URL (Vercel) - Your frontend is on Vercel
// const FRONTEND_URL = 'https://paper-stack-beryl.vercel.app';


// // --- CUSTOM ALERT COMPONENT ---
// function CustomAlert({ alert }) {
//   if (!alert.show) return null;
//   return (
//     <div className={`custom-alert alert-${alert.type}`}>
//       <span>{alert.type === 'success' ? '✅' : alert.type === 'error' ? '⚠️' : 'ℹ️'}</span>
//       {alert.msg}
//     </div>
//   );
// }

// function Footer() {
//   return (
//     <footer className="site-footer">
//       <div className="container">
//         <div className="footer-grid">
//           {/* Brand Section with Logo */}
//           <div className="footer-brand">
//             <div className="footer-logo-wrapper">
//               <img src={logo} alt="PaperStack Logo - IIIT Surat Previous Year Papers Archive" className="footer-logo-img" />
//               <h3 className="footer-logo">PaperStack</h3>
//             </div>
//             <p className="footer-description">
//               The official archive for IIIT Surat previous year papers. 
//               Helping students prepare better with organized academic resources.
//             </p>
//             <p>Managed and maintained by <strong>Yogesh Khinchi</strong>.</p>
//           </div>

//           {/* Quick Links */}
//           <div className="footer-links">
//             <h4 className="footer-heading">Navigation</h4>
//             <ul className="footer-list">
//               <li><Link to="">Home</Link></li>
//               <li><Link to="/login">Student Login</Link></li>
//               <li><Link to="/admin">Admin Access</Link></li>
//             </ul>
//           </div>

//           {/* Community Section */}
//           <div className="footer-links">
//             <h4 className="footer-heading">Community</h4>
//             <ul className="footer-list">
//               <li><a href="https://github.com" target="_blank" rel="noreferrer noopener">GitHub</a></li>
//               <li><a href="https://linkedin.com" target="_blank" rel="noreferrer noopener">LinkedIn</a></li>
//               <li><a href="mailto:paperstack.iiitsurat@gmail.com">Support</a></li>
//             </ul>
//           </div>
//         </div>

//         {/* Bottom Bar */}
//         <div className="footer-bottom">
//           <p>&copy; {new Date().getFullYear()} IIIT Surat Archive. Built for the community.</p>
//           <div className="footer-status">
//             <span className="status-dot"></span>
//             System Online
//           </div>
//         </div>
//       </div>
//     </footer>
//   );
// }

// // --- AUTH COMPONENTS ---
// function Register({ showAlert }) { 
//   const [formData, setFormData] = useState({ username: '', email: '', password: '', semester: 1 });
//   const navigate = useNavigate();

//   const paperStackLogo = "/logo.png"; 

//   const handleRegister = async (e) => {
//     e.preventDefault();

//     // Domain Restriction: Ensure it's an official IIIT Surat email
//     if (!formData.email.toLowerCase().endsWith('@iiitsurat.ac.in')) {
//         showAlert("Access Denied: Please use your @iiitsurat.ac.in email", "error");
//         return;
//     }

//     try { 
//         await axios.post(`${API_URL}/api/auth/register`, formData); 
//         showAlert("Registration Successful! Please Login.", "success"); 
//         navigate('/login'); 
//     } 
//     catch (err) { 
//         showAlert(err.response?.data?.message || "Registration Failed", "error"); 
//         console.log("Registration error:", err);
//     }
//   };

//   return ( 
//     <div className="auth-page-wrapper">
//         <Helmet>
//           <title>Register - PaperStack | IIIT Surat Student Portal</title>
//           <meta name="description" content="Create your student account on PaperStack to access IIIT Surat previous year question papers, solutions, and study materials." />
//           <meta name="keywords" content="IIIT Surat registration, student account, IIIT Surat papers access, engineering student portal" />
//           <link rel="canonical" href={`${FRONTEND_URL}/register`} />
//         </Helmet>
        
//         <div className="auth-card login-card-animated">
//             <div className="login-logo-container">
//                 <img src={paperStackLogo} alt="PaperStack Logo - IIIT Surat Papers Archive" className="login-logo-img pulse-entry" />
//             </div>

//             <div className="login-intro">
//                 <h2 className="slide-up-text">
//                    <span className="paperstack-brand-text">IIIT Surat Archive</span>
//                 </h2>
//                 <p className="fade-in-text">Create your IIIT Surat student profile</p>
//             </div>

//             <div className="auth-note-box pulse-entry">
//                 <span className="note-icon">⚠️</span>
//                 <p><strong>Important:</strong> You can't reset your password, so choose it carefully.</p>
//             </div>

//             <form onSubmit={handleRegister} className="login-form-content">
//                 <div className="input-field-animation">
//                     <input 
//                         type="text" 
//                         placeholder="Username" 
//                         onChange={e => setFormData({...formData, username: e.target.value})} 
//                         required 
//                     />
//                 </div>
//                 <div className="input-field-animation-delay">
//                     <input 
//                         type="email" 
//                         placeholder="Institute Email (name@iiitsurat.ac.in)" 
//                         onChange={e => setFormData({...formData, email: e.target.value})} 
//                         required 
//                     />
//                 </div>
//                 <div className="input-field-animation-delay">
//                     <input 
//                         type="password" 
//                         placeholder="Password" 
//                         onChange={e => setFormData({...formData, password: e.target.value})} 
//                         required 
//                     />
//                 </div>

//                 <div className="sem-select-container">
//                     <label>Current Semester:</label>
//                     <select 
//                         value={formData.semester} 
//                         onChange={e => setFormData({...formData, semester: Number(e.target.value)})}
//                     >
//                         {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
//                     </select>
//                 </div>

//                 <button type="submit" className="login-btn-gradient">
//                     Create Account
//                 </button>
//             </form>
            
//             <p className="auth-switch-text">
//                 Already have an account? <Link to="/login">Login here</Link>
//             </p>
//         </div>
//     </div> 
//   );
// }

// function Login({ setUser, showAlert }) { 
//   const [formData, setFormData] = useState({ email: '', password: '' });
//   const navigate = useNavigate();

//   const paperStackLogo = "/logo.png"; 
//   const iiitSuratLogo = "/iiit_surat.png";

//   const handleLogin = async (e) => {
//     e.preventDefault();

//     if (!formData.email.toLowerCase().endsWith('@iiitsurat.ac.in')) {
//         showAlert("Access Denied: Please use your @iiitsurat.ac.in email", "error");
//         return;
//     }

//     try { 
//         const res = await axios.post(`${API_URL}/api/auth/login`, formData); 
//         localStorage.setItem('token', res.data.token); 
//         localStorage.setItem('username', res.data.username);
//         if(res.data.semester) localStorage.setItem('userSemester', res.data.semester);

//         setUser({ 
//             username: res.data.username, 
//             bookmarks: res.data.bookmarks,
//             semester: res.data.semester 
//         }); 
        
//         navigate('/'); 
//         showAlert(`Welcome back, ${res.data.username}!`, "success");
//     } 
//     catch (err) { 
//         showAlert(err.response?.data?.message || "Invalid Credentials", "error"); 
//     }
//   };
  
//   return ( 
//     <div className="auth-page-wrapper">
//       <Helmet>
//         <title>Login - PaperStack | IIIT Surat Student Access</title>
//         <meta name="description" content="Login to your PaperStack account to access IIIT Surat previous year question papers, solutions, and exam resources." />
//         <meta name="keywords" content="IIIT Surat login, student portal, access papers, engineering exam papers login" />
//         <link rel="canonical" href={`${FRONTEND_URL}/login`} />
//       </Helmet>
      
//       <div className="auth-card login-card-animated">
//           <div className="login-logo-container">
//               <img src={paperStackLogo} alt="PaperStack Logo - IIIT Surat Papers" className="login-logo-img pulse-entry" />
//               <div className="logo-vertical-line"></div>
//               <img src={iiitSuratLogo} alt="IIIT Surat Logo" className="login-logo-img pulse-entry-delay" />
//           </div>
          
//           <div className="login-intro">
//               <h2 className="slide-up-text">IIIT SURAT ARCHIVE</h2>
//               <p className="fade-in-text">Login to access your semester papers</p>
//           </div>

//           <form onSubmit={handleLogin} className="login-form-content">
//               <div className="input-field-animation">
//                   <input 
//                       type="email" 
//                       placeholder="Institute Email ID" 
//                       onChange={e => setFormData({...formData, email: e.target.value})} 
//                       required 
//                   />
//               </div>
//               <div className="input-field-animation-delay">
//                   <input 
//                       type="password" 
//                       placeholder="Password" 
//                       onChange={e => setFormData({...formData, password: e.target.value})} 
//                       required 
//                   />
//               </div>
//               <button type="submit" className="auth-btn login-btn-gradient">
//                   Secure Login
//               </button>
//           </form>
//           <p className="auth-switch-text">
//               Not registered? <Link to="/register">Join the Community</Link>
//           </p>
//            <div className="auth-note-box pulse-entry">
//               <span className="note-icon">⚠️</span>
//               <p><strong>NOTE:</strong> For any queries mail at : <a href="mailto:paperstack.iiitsurat@gmail.com">paperstack.iiitsurat@gmail.com</a></p>
//           </div>
//       </div>
//     </div> 
//   );
// }

// function AdminLogin({ showAlert }) {
//   const [password, setPassword] = useState('');
//   const navigate = useNavigate();

//   const handleAdminLogin = async (e) => { 
//       e.preventDefault(); 
//       try { 
//           const res = await axios.post(`${API_URL}/api/admin/verify`, { password }); 
//           if(res.data.success) { 
//               localStorage.setItem('adminPass', password); 
//               showAlert("Admin Verified!", "success");
//               navigate('/'); 
//           } 
//       } catch { showAlert("Wrong Password", "error"); } 
//   };
  
//   return ( 
//     <div className="auth-container">
//       <Helmet>
//         <title>Admin Login - PaperStack | IIIT Surat Management</title>
//         <meta name="description" content="Admin access portal for PaperStack - IIIT Surat's previous year papers archive management system." />
//         <link rel="canonical" href={`${FRONTEND_URL}/admin`} />
//       </Helmet>
//       <div className="auth-card">
//         <h2>🔐 Admin Access</h2>
//         <form onSubmit={handleAdminLogin}>
//           <input type="password" placeholder="Admin Password" onChange={e=>setPassword(e.target.value)} />
//           <button className="auth-btn">Unlock</button>
//         </form>
//       </div>
//     </div> 
//   );
// }

// // --- SEMESTER SELECTION MODAL ---
// function SemesterModal({ user, setUser, onClose, showAlert }) {
//     const [selectedSem, setSelectedSem] = useState(user?.semester || 1);

//     const handleSave = async () => {
//         try {
//             await axios.put(`${API_URL}/api/user/semester`, 
//                 { semester: selectedSem }, 
//                 { headers: { Authorization: localStorage.getItem('token') } }
//             );

//             const updatedUser = { ...user, semester: selectedSem };
//             setUser(updatedUser);
//             localStorage.setItem('userSemester', selectedSem);
            
//             if(showAlert) showAlert(`Preference saved: Semester ${selectedSem}`, "success");
//             if (onClose) onClose();
//         } catch (err) {
//             if(showAlert) showAlert("Failed to save semester", "error");
//             console.error(err);
//         }
//     };

//     return (
//         <div className="modal-overlay">
//             <div className="modal-content" style={{ maxWidth: '310px', maxHeight: '250px', width: '90%', padding: '25px', textAlign: 'center', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
//                 <h3>🎓 Which Semester are you in?</h3>
//                 <p>We'll show you these papers first.</p>
//                 <div style={{ margin: '10px 0' }}>
//                     <select 
//                         value={selectedSem} 
//                         onChange={(e) => setSelectedSem(Number(e.target.value))}
//                         style={{ padding: '10px', fontSize: '16px', width: '100%' }}
//                     >
//                         {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
//                     </select>
//                 </div>
//                 <button onClick={handleSave} className="auth-btn">Save Preference</button>
//             </div>
//         </div>
//     );
// }

// // --- ANALYTICS DASHBOARD ---
// function AnalyticsDashboard({ onClose }) {
//     const [data, setData] = useState([]);
//     useEffect(() => { 
//         axios.get(`${API_URL}/api/analytics`)
//             .then(res => setData(res.data))
//             .catch(err => console.error("Analytics error:", err)); 
//     }, []);

//     return (
//         <div className="analytics-panel">
//             <div className="panel-header">
//                 <h3>📊 Exam Difficulty Analytics</h3>
//                 <button onClick={onClose} className="close-btn">✖</button>
//             </div>
//             <div className="chart-container">
//                 <ResponsiveContainer width="100%" height={300}>
//                     <BarChart data={data}>
//                         <XAxis dataKey="_id" stroke="#8884d8" />
//                         <YAxis />
//                         <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ color: '#333' }} />
//                         <Bar dataKey="totalViews" fill="#4f46e5" radius={[4, 4, 0, 0]}>
//                             {data.map((entry, index) => (
//                                 <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#4f46e5'} />
//                             ))}
//                         </Bar>
//                     </BarChart>
//                 </ResponsiveContainer>
//                 <p className="insight-text">
//                     💡 <strong>Insight:</strong> "{data[0]?._id || 'No data'}" seems to be the toughest subject!
//                 </p>
//             </div>
//         </div>
//     );
// }

// // --- UPDATED PAPER DETAILS MODAL ---
// function PaperModal({ paper, user, onClose, showAlert }) {
//     const [comments, setComments] = useState([]);
//     const [newComment, setNewComment] = useState('');
//     const [iframeLoading, setIframeLoading] = useState(true);

//     const fetchComments = useCallback(async () => { 
//         try {
//             const res = await axios.get(`${API_URL}/api/papers/${paper._id}/comments`); 
//             setComments(res.data); 
//         } catch (err) {
//             console.error("Error fetching comments", err);
//         }
//     }, [paper._id]);

//     useEffect(() => { 
//         fetchComments(); 
//         setIframeLoading(true);
//     }, [paper._id, fetchComments]);

//     const postComment = async (e) => {
//         e.preventDefault();
//         if(!newComment.trim()) return;
//         if(!user) { showAlert("Please Login to comment", "error"); return; }
        
//         try {
//             await axios.post(
//                 `${API_URL}/api/papers/${paper._id}/comments`, 
//                 { text: newComment }, 
//                 { headers: { Authorization: localStorage.getItem('token') } }
//             );
//             setNewComment(''); 
//             fetchComments();
//         } catch (err) { 
//             showAlert("Failed to post comment", "error"); 
//         }
//     };

//     return (
//         <div className="modal-overlay" onClick={onClose}>
//             <div className="modal-content" onClick={e => e.stopPropagation()}>
//                 <button className="close-modal-btn" onClick={onClose}>✖</button>
                
//                 <div className="modal-split">
//                     {/* LEFT SIDE: PDF Viewer */}
//                     <div className="modal-left">
//                         <div className="modal-header-info">
//                             <h3>📄 {paper.subject}</h3>
//                             <span className="badge-pill">{paper.examType} • {paper.year}</span>
//                         </div>

//                         <div className="pdf-container">
//                             {iframeLoading && (
//                                 <div className="pdf-skeleton">
//                                     <div className="skeleton-shimmer"></div>
//                                     <p>Loading document...</p>
//                                 </div>
//                             )}
                            
//                             <iframe 
//                                 src={`${paper.filePath}#toolbar=0`}
//                                 title={`${paper.subject} ${paper.examType} Paper - Semester ${paper.semester}, ${paper.year}`}
//                                 className="pdf-frame"
//                                 onLoad={() => setIframeLoading(false)}
//                                 style={{ opacity: iframeLoading ? 0 : 1 }}
//                             ></iframe>
//                         </div>

//                         <div className="modal-actions">
//                             <a href={paper.filePath} target="_blank" rel="noopener noreferrer" className="btn-download">
//                                 ⬇️ Download Paper
//                             </a>
//                             {paper.solutionPath && (
//                                 <a href={paper.solutionPath} target="_blank" rel="noopener noreferrer" className="btn-solution">
//                                     💡 View Solution
//                                 </a>
//                             )}
//                         </div>
//                     </div>

//                     {/* RIGHT SIDE: Comments/Doubts */}
//                     <div className="modal-right">
//                         <div className="discussion-header">
//                             <h3>💬 Doubt Section</h3>
//                             <p>{comments.length} Thoughts</p>
//                         </div>

//                         <div className="comments-list">
//                             {comments.length === 0 ? (
//                                 <div className="empty-comments">
//                                     <p>No doubts yet. Be the first to ask!</p>
//                                 </div>
//                             ) : (
//                                 comments.map(c => (
//                                     <div key={c._id} className="comment-bubble">
//                                         <div className="comment-user-icon">
//                                             {c.username.charAt(0).toUpperCase()}
//                                         </div>
//                                         <div className="comment-details">
//                                             <strong>{c.username}</strong>
//                                             <p>{c.text}</p>
//                                         </div>
//                                     </div>
//                                 ))
//                             )}
//                         </div>

//                         <form onSubmit={postComment} className="comment-form">
//                             <input 
//                                 value={newComment} 
//                                 onChange={e => setNewComment(e.target.value)} 
//                                 placeholder={user ? "Write a doubt..." : "Login to join discussion"} 
//                                 disabled={!user} 
//                             />
//                             <button type="submit" disabled={!user || !newComment.trim()}>
//                                 Send
//                             </button>
//                         </form>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }

// function PaperSkeleton() {
//   return (
//     <div className="paper-card skeleton">
//       <div className="card-stats-row">
//         <div className="skeleton-circle"></div>
//         <div className="skeleton-circle"></div>
//         <div className="skeleton-circle"></div>
//       </div>
//       <div className="card-body">
//         <div className="skeleton-line skeleton-badge"></div>
//         <div className="skeleton-line skeleton-title"></div>
//         <div className="skeleton-line skeleton-text"></div>
//         <div className="skeleton-line skeleton-meta"></div>
//       </div>
//       <div className="card-actions">
//         <div className="skeleton-line skeleton-button"></div>
//       </div>
//     </div>
//   );
// }

// // --- HOME COMPONENT ---
// function Home({ user, setUser, theme, toggleTheme, showAlert }) {
//   const [papers, setPapers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState('all'); 
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterSem, setFilterSem] = useState(user?.semester?.toString() || '');
//   const [showAnalytics, setShowAnalytics] = useState(false);
//   const [selectedPaper, setSelectedPaper] = useState(null);
//   const [showSemModal, setShowSemModal] = useState(false);
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [formData, setFormData] = useState({ title: '', subject: '', year: '', semester: '', examType: 'Mid-Sem' });
//   const [file, setFile] = useState(null);
//   const [solutionFile, setSolutionFile] = useState(null);
//   const [isUploading, setIsUploading] = useState(false);

//   const handleSolution = (e, paper) => {
//       e.stopPropagation();
//       if(paper.solutionPath) {
//           window.open(paper.solutionPath, '_blank');
//       } else {
//           showAlert("No solution available", "info");
//       }
//   };

//   const fetchPapers = useCallback(async () => { 
//     setLoading(true);
//     try {
//         const res = await axios.get(`${API_URL}/api/papers`); 
        
//         if (!res.data || !Array.isArray(res.data)) {
//             console.error("Invalid data format:", res.data);
//             showAlert("Received invalid data from server", "error");
//             setPapers([]);
//             return; 
//         }

//         const sorted = res.data.sort((a, b) => {
//             const yearA = a.year || 0;
//             const yearB = b.year || 0;
//             const semA = a.semester || 0;
//             const semB = b.semester || 0;

//             if (yearB !== yearA) return yearB - yearA;
//             if (semB !== semA) return semB - semA;

//             const typeOrder = { 'Mid-Sem': 1, 'End-Sem': 2 };
//             const typeA = typeOrder[a.examType] || 3;
//             const typeB = typeOrder[b.examType] || 3;
            
//             return typeA - typeB;
//         });

//         setPapers(sorted); 
//     } catch (err) { 
//         console.error("❌ Fetch Error:", err); 
//         showAlert("Failed to load papers. Please check your connection.", "error");
//     } finally {
//         setTimeout(() => setLoading(false), 500); 
//     }
//   }, [showAlert]);

//   useEffect(() => { 
//       fetchPapers(); 
//       if(localStorage.getItem('adminPass')) setIsAdmin(true);
//       if (user && !user.semester) { setShowSemModal(true); }
//       if (user && user.semester) { setFilterSem(user.semester.toString()); }
//   }, [user, fetchPapers]);

//   // Function to exit admin mode
//   const exitAdminMode = () => {
//     localStorage.removeItem('adminPass');
//     setIsAdmin(false);
//     showAlert("Exited admin mode", "success");
//   };

//   const handleUpload = async (e) => {
//     e.preventDefault();
//     if (!file) { showAlert("Please select a paper PDF", "error"); return; }
    
//     setIsUploading(true);

//     const data = new FormData();
//     Object.keys(formData).forEach(key => data.append(key, formData[key]));
//     data.append('file', file);
//     if(solutionFile) data.append('solution', solutionFile);

//     try {
//         const adminPass = localStorage.getItem('adminPass');
//         await axios.post(`${API_URL}/api/upload`, data, {
//             headers: { 'Content-Type': 'multipart/form-data', 'x-admin-password': adminPass }
//         });
//         showAlert("Paper Uploaded Successfully!", "success");
//         setFile(null); 
//         setSolutionFile(null);
//         fetchPapers();
//     } catch (err) { 
//         showAlert("Upload Failed. Check credentials/connection.", "error"); 
//         console.error(err); 
//     } finally {
//         setIsUploading(false);
//     }
//   };

//   const handleAddSolutionToExisting = async (paperId, selectedFile) => {
//     if (!selectedFile) return;
//     setIsUploading(true);
//     const data = new FormData();
//     data.append('solution', selectedFile);

//     try {
//       const adminPass = localStorage.getItem('adminPass');
//       await axios.put(`${API_URL}/api/papers/${paperId}/solution`, data, {
//         headers: { 'Content-Type': 'multipart/form-data', 'x-admin-password': adminPass }
//       });
//       showAlert("Solution Added!", "success");
//       fetchPapers();
//     } catch (err) {
//       showAlert("Failed to upload solution", "error");
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   const handleDelete = async (e, paperId) => {
//       e.stopPropagation();
//       if(!window.confirm("⚠️ Delete this paper permanently?")) return;
//       try {
//           const adminPass = localStorage.getItem('adminPass');
//           await axios.delete(`${API_URL}/api/papers/${paperId}`, { headers: { 'x-admin-password': adminPass } });
//           showAlert("Deleted", "success");
//           setPapers(prev => prev.filter(p => p._id !== paperId));
//       } catch (err) { showAlert("Delete Failed", "error"); }
//   };

//   const getHardestSubject = () => {
//       if (!papers.length) return null;
//       const relevantPapers = filterSem ? papers.filter(p => p.semester.toString() === filterSem) : papers;
//       if (relevantPapers.length === 0) return null;
//       const scores = {};
//       relevantPapers.forEach(p => { 
//           const score = (p.views || 0) + (p.downloads || 0); 
//           scores[p.subject] = (scores[p.subject] || 0) + score; 
//       });
//       const hardest = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
//       return { subject: hardest, score: scores[hardest] };
//   };

//   const hardestSubject = getHardestSubject();

//   const handleView = async (paper) => {
//       setSelectedPaper(paper);
//       try {
//           await axios.post(`${API_URL}/api/papers/${paper._id}/view`);
//       } catch (err) {
//           console.error("Failed to increment view count:", err);
//       }
//       setPapers(prev => prev.map(p => p._id === paper._id ? { ...p, views: (p.views || 0) + 1 } : p));
//   };

//   const handleDownload = async (e, paper) => {
//       e.stopPropagation();
//       window.open(paper.filePath, '_blank'); 
//       try {
//           await axios.post(`${API_URL}/api/papers/${paper._id}/download`);
//       } catch (err) {
//           console.error("Failed to increment download count:", err);
//       }
//       setPapers(prev => prev.map(p => p._id === paper._id ? { ...p, downloads: (p.downloads || 0) + 1 } : p));
//   };

//   const toggleBookmark = async (paperId, e) => {
//       e.stopPropagation();
//       if (!user) { showAlert("Please Login to Bookmark!", "info"); return; }
//       try {
//           const res = await axios.put(`${API_URL}/api/user/bookmark/${paperId}`, {}, { 
//               headers: { Authorization: localStorage.getItem('token') } 
//           });
//           setUser({ ...user, bookmarks: res.data });
//       } catch (err) {
//           showAlert("Failed to bookmark", "error");
//       }
//   };
  
//   const displayedPapers = papers.filter(p => {
//       const matchesSearch = p.subject.toLowerCase().includes(searchTerm.toLowerCase());
//       const matchesTab = filter === 'saved' ? user?.bookmarks.includes(p._id) : true;
//       const matchesSem = filterSem ? p.semester.toString() === filterSem : true;
//       return matchesSearch && matchesTab && matchesSem;
//   });

//   // SEO Structured Data
//   const websiteStructuredData = {
//     "@context": "https://schema.org",
//     "@type": "EducationalOrganization",
//     "name": "PaperStack - IIIT Surat Archive",
//     "url": `${FRONTEND_URL}/`,
//     "logo": `${FRONTEND_URL}/logo.png`,
//     "description": "Digital archive of previous year question papers for IIIT Surat students",
//     "founder": "Yogesh Khinchi",
//     "keywords": "IIIT Surat papers, question papers, exam papers, engineering papers , iiit surat, iiit surat papers , surat college papers ",
//     "educationalLevel": "Undergraduate",
//     "educationalProgram": "Bachelor of Technology (B.Tech)"
//   };\

//   const breadcrumbStructuredData = {
//     "@context": "https://schema.org",
//     "@type": "BreadcrumbList",
//     "itemListElement": [
//       {
//         "@type": "ListItem",
//         "position": 1,
//         "name": "Home",
//         "item": `${FRONTEND_URL}/`
//       },
//       {
//         "@type": "ListItem",
//         "position": 2,
//         "name": filterSem ? `Semester ${filterSem} Papers` : "All Papers",
//         "item": `${FRONTEND_URL}/${filterSem ? `?sem=${filterSem}` : ''}`
//       }
//     ]
//   };

//   const faqStructuredData = {
//     "@context": "https://schema.org",
//     "@type": "FAQPage",
//     "mainEntity": [
//       {
//         "@type": "Question",
//         "name": "What is PaperStack?",
//         "acceptedAnswer": {
//           "@type": "Answer",
//           "text": "PaperStack is the official archive of IIIT Surat previous year question papers, providing free access to exam papers for all semesters and subjects."
//         }
//       },
//       {
//         "@type": "Question",
//         "name": "Are the papers free to download?",
//         "acceptedAnswer": {
//           "@type": "Answer",
//           "text": "Yes, all question papers on PaperStack are completely free to view and download for IIIT Surat students."
//         }
//       },
//       {
//         "@type": "Question",
//         "name": "Which semesters are covered?",
//         "acceptedAnswer": {
//           "@type": "Answer",
//           "text": "We provide papers for all 8 semesters of B.Tech program including both Mid-Semester and End-Semester exams."
//         }
//       }
//     ]
//   };

//   return (
//     <> 
//     <Helmet>
//       <title>
//         {filterSem ? `Sem ${filterSem} Papers - IIIT Surat Previous Year Question Papers` : 'IIIT Surat Previous Year Papers - PaperStack Archive'}
//       </title>
//       <meta 
//         name="description" 
//         content="Access 1000+ IIIT Surat previous year question papers, solutions, and study materials for all semesters (1-8). Download free exam papers for Mid-Sem and End-Sem exams." 
//       />
//       <meta 
//         name="keywords" 
//         content="IIIT Surat previous year papers, IIIT Surat question papers, semester exam papers, engineering question papers, mid sem papers, end sem papers, computer science papers, BTech papers"
//       />
//       <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
//       <link rel="canonical" href={`${FRONTEND_URL}/`} />
      
//       {/* Open Graph / Facebook */}
//       <meta property="og:type" content="website" />
//       <meta property="og:title" content="PaperStack - IIIT Surat Previous Year Papers Archive" />
//       <meta property="og:description" content="Free access to IIIT Surat previous year question papers, solutions, and study resources for all engineering branches and semesters." />
//       <meta property="og:image" content={`${FRONTEND_URL}/logo.png`} />
//       <meta property="og:url" content={`${FRONTEND_URL}/`} />
//       <meta property="og:site_name" content="PaperStack" />
//       <meta property="og:locale" content="en_IN" />
//       <meta property="og:image:width" content="1200" />
//       <meta property="og:image:height" content="630" />
//       <meta property="og:image:alt" content="IIIT Surat Previous Year Papers - PaperStack" />
      
//       {/* Twitter */}
//       <meta name="twitter:card" content="summary_large_image" />
//       <meta name="twitter:title" content="PaperStack | IIIT Surat Question Papers" />
//       <meta name="twitter:description" content="Download free IIIT Surat previous year papers for all semesters." />
//       <meta name="twitter:image" content={`${FRONTEND_URL}/logo.png`} />
      
//       {/* Additional Meta Tags */}
//       <meta name="author" content="Yogesh Khinchi, IIIT Surat" />
//       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//       <meta name="theme-color" content="#4f46e5" />
//       <meta name="language" content="English" />
      
//       {/* Structured Data for SEO */}
//       <script type="application/ld+json">
//         {JSON.stringify(websiteStructuredData)}
//       </script>
//       <script type="application/ld+json">
//         {JSON.stringify(breadcrumbStructuredData)}
//       </script>
//       <script type="application/ld+json">
//         {JSON.stringify(faqStructuredData)}
//       </script>
//     </Helmet>

//     <div className="app-container">
//       {showSemModal && (
//         <SemesterModal 
//             user={user} 
//             setUser={setUser} 
//             showAlert={showAlert}
//             onClose={() => {
//                 setShowSemModal(false);
//                 if(user.semester) setFilterSem(user.semester.toString());
//             }} 
//         />
//       )}

//       <nav className="navbar">
//         <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
//           <img src={logo} alt="PaperStack Logo - IIIT Surat Previous Year Papers Archive" style={{ height: '45px', borderRadius: '8px', objectFit: 'contain' }} /> 
//           <span>PaperStack</span>
//         </div>
//         <div className="nav-links">
//           <button className="theme-btn" onClick={toggleTheme}>{theme === 'light' ? '🌙' : '☀️'}</button>
//           <button className="stats-btn" onClick={() => setShowAnalytics(!showAnalytics)}>📊 Stats</button>
          
//           {!isAdmin && <Link to="/admin" className="btn-admin-login">Admin</Link>}
//           {isAdmin && (
//             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//               <span className="admin-badge">ADMIN MODE</span>
//               <button 
//                 onClick={exitAdminMode}
//                 className="btn-exit-admin"
//                 style={{
//                   background: '#f59e0b',
//                   color: 'white',
//                   border: 'none',
//                   padding: '6px 12px',
//                   borderRadius: '6px',
//                   cursor: 'pointer',
//                   fontSize: '0.85rem',
//                   fontWeight: '500',
//                   transition: 'background 0.3s'
//                 }}
//                 onMouseOver={(e) => e.currentTarget.style.background = '#d97706'}
//                 onMouseOut={(e) => e.currentTarget.style.background = '#f59e0b'}
//               >
//                 Exit Admin
//               </button>
//             </div>
//           )}
          
//           {user ? (
//             <div className="user-info">
//               <span>👤 {user.username}</span>
//               <button onClick={() => setShowSemModal(true)} style={{ marginLeft: '10px', background: 'transparent', border: '1px solid currentColor', borderRadius: '4px', cursor: 'pointer', color: 'inherit', padding: '2px 6px', fontSize: '0.8rem' }}>
//                   Sem {user.semester || '?'} ✎
//               </button>
//               <button className="btn-logout" onClick={() => { localStorage.clear(); window.location.reload(); }}>Logout</button>
//             </div>
//           ) : <Link to="/login" className="btn-login">Login</Link>}
//         </div>
//       </nav>

//       <main className="main-content">
//         <h1 className="visually-hidden">IIIT Surat Previous Year Question Papers Archive</h1>
        
//         {showAnalytics && <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />}
        
//         {isAdmin && (
//             <div className="admin-upload-section">
//                 <div className="admin-card">
//                     <h3>📤 Admin Upload Panel</h3>
//                     <form onSubmit={handleUpload} className="upload-form">
//                         <div className="form-row">
//                             <input type="text" placeholder="Subject" onChange={e => setFormData({...formData, subject: e.target.value})} required />
//                             <input type="text" placeholder="Title" onChange={e => setFormData({...formData, title: e.target.value})} required />
//                         </div>
//                         <div className="form-row">
//                             <input type="number" placeholder="Year" onChange={e => setFormData({...formData, year: e.target.value})} required />
//                             <select onChange={e => setFormData({...formData, semester: e.target.value})} required>
//                                 <option value="">Select Sem</option>
//                                 {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
//                             </select>
//                             <select onChange={e => setFormData({...formData, examType: e.target.value})}>
//                                 <option>Mid-Sem</option><option>End-Sem</option>
//                             </select>
//                         </div>
//                         <div className="file-inputs">
//                             <label className="file-label">📄 Paper: <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files[0])} /><b> {file ? file.name : ''} </b></label>
//                             <label className="file-label">💡 Solution: <input type="file" accept="application/pdf" onChange={e => setSolutionFile(e.target.files[0])} /><b> {solutionFile ? solutionFile.name : ''}</b></label>
//                         </div>
                        
//                         <button type="submit" className="btn-upload" disabled={isUploading}>
//                             {isUploading ? "⏳ Uploading to Cloudinary..." : "🚀 Upload Paper"}
//                         </button>
//                     </form>
//                 </div>
//             </div>
//         )}

//         <div className="controls-section">
//           <h2 className="section-heading">
//             {filterSem ? `Semester ${filterSem} Question Papers` : 'All Semester Papers'}
//           </h2>
          
//           <div className="controls-bar">
//               <div className="tabs">
//                   <button className={filter === 'all' ? 'tab active' : 'tab'} onClick={() => setFilter('all')}>
//                       📚 Papers
//                   </button>
//                   <button className={filter === 'saved' ? 'tab active' : 'tab'} onClick={() => setFilter('saved')}>
//                       ❤️ Saved
//                   </button>
//               </div>

//               <span className="navbar-paper-count">
//                   <h5>
//                       {searchTerm || filterSem !== '' ? 'Papers Found: ' : 'Total Papers: '} 
//                       {displayedPapers.length}
//                   </h5>
//               </span>

//               <div className="filters">
//                   <select className="sem-filter" value={filterSem} onChange={e => setFilterSem(e.target.value)}>
//                       <option value="">All Sems</option>
//                       {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
//                   </select>
//                   <input 
//                       className="search-input" 
//                       type="text" 
//                       placeholder="🔍 Search..." 
//                       onChange={e => setSearchTerm(e.target.value)} 
//                   />
//               </div>
//           </div>

//           {hardestSubject && (
//               <div className="difficulty-banner">
//                   <span className="fire-icon">🔥</span>
//                   <div><strong>Insight:</strong> <span className="highlight-subject">{hardestSubject.subject}</span> is currently the toughest!</div>
//               </div>
//           )}
//         </div>

//         <div className="papers-grid">
//             {loading ? (
//                 [...Array(6)].map((_, idx) => <PaperSkeleton key={idx} />) ) :

//                 displayedPapers.length === 0 && filterSem ? (
//                 <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: '#888'}}>
//                     <h3>No papers found for Semester {filterSem}</h3>
//                     <p>Try switching to "All Sems"</p>
//                 </div>
//             ) : (
//                 displayedPapers.map(p => (
//                     <div key={p._id} className="paper-card">
//                         <div className="card-stats-row">
//                             <div className="stat-item">👁️ {p.views || 0}</div>
//                             <div className="stat-item">⬇️ {p.downloads || 0}</div>
//                             <button className={`heart-icon ${user?.bookmarks.includes(p._id) ? 'liked' : ''}`} onClick={(e) => toggleBookmark(p._id, e)}>
//                                 {user?.bookmarks.includes(p._id) ? '❤️' : '🤍'}
//                             </button>
//                         </div>
//                         <div className="card-body">
//                             <span className={`badge ${p.examType === 'Mid-Sem' ? 'mid' : 'end'}`}>{p.examType}</span>
//                             <h3 className="subject-name">{p.subject}</h3>
//                             <p className="paper-title">{p.title}</p>
//                             <p className="paper-meta">Sem {p.semester} • {p.year}</p>
//                         </div>
//                         <div className="card-actions">
//                             <button className="btn-view-pdf" onClick={() => handleView(p)}>📄 View</button>
//                             <div className="action-icons">
//                                 {p.solutionPath && <button className="btn-icon solution-icon" onClick={(e) => handleSolution(e, p)} title="Solution">💡</button>}
//                                 <button className="btn-icon download-icon" onClick={(e) => handleDownload(e, p)} title="Download">⬇</button>
//                                 {isAdmin && (
//                                 <label className="btn-icon solution-icon update-btn" title="Update Solution">
//                                     {p.solutionPath ? '🔄' : '➕'}
//                                     <input 
//                                         type="file" 
//                                         hidden 
//                                         accept="application/pdf" 
//                                         onChange={(e) => handleAddSolutionToExisting(p._id, e.target.files[0])} 
//                                     />
//                                 </label>
//                             )}
//                             {isAdmin && <button className="btn-icon delete-icon" onClick={(e) => handleDelete(e, p._id)}>🗑️</button>}
//                             </div>
//                         </div>
//                     </div>
//                 ))
//             )}
//         </div>
//       </main>
//       <Footer />
      
//       {selectedPaper && <PaperModal paper={selectedPaper} user={user} onClose={() => setSelectedPaper(null)} showAlert={showAlert} />}
//     </div>
//     </>
//   );
// }

// // --- MAIN APP COMPONENT ---
// export default function App() { 
//   const [user, setUser] = useState(null);
//   const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
//   const [alertInfo, setAlertInfo] = useState({ show: false, msg: '', type: 'success' });

//   const showAlert = useCallback((msg, type = 'success') => {
//     setAlertInfo({ show: true, msg, type });
//     setTimeout(() => {
//         setAlertInfo({ show: false, msg: '', type: '' });
//     }, 3000);
//   }, []);

//   const toggleTheme = () => { 
//     const newTheme = theme === 'light' ? 'dark' : 'light'; 
//     setTheme(newTheme); 
//     localStorage.setItem('theme', newTheme); 
//   };
  
//   useEffect(() => { 
//       document.body.className = theme; 
//       const token = localStorage.getItem('token'); 
//       const username = localStorage.getItem('username'); 
//       const savedSem = localStorage.getItem('userSemester'); 
      
//       if(token && username) {
//           setUser({ 
//               username, 
//               bookmarks: [], 
//               semester: savedSem ? Number(savedSem) : null 
//           }); 
//       }
//   }, [theme]);

//   return (
//     <HelmetProvider>
//     <Router>
//         <CustomAlert alert={alertInfo} />
//         <Routes>
//             <Route path="/" element={<Home user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} showAlert={showAlert} />} />
//             <Route path="/login" element={<Login setUser={setUser} showAlert={showAlert} />} />
//             <Route path="/register" element={<Register showAlert={showAlert} />} />
//             <Route path="/admin" element={<AdminLogin showAlert={showAlert} />} />
//             <Route path="*" element={
//               <div className="not-found-page" style={{textAlign: 'center', padding: '50px 20px'}}>
//                 <h1>404 - Page Not Found</h1>
//                 <p>The page you're looking for doesn't exist.</p>
//                 <Link to="/" style={{color: '#4f46e5', textDecoration: 'underline'}}>Return to Papers</Link>
//               </div>
//             } />
//         </Routes>
//     </Router>
//     </HelmetProvider>
//   );
// }























// import React, { useState, useEffect, useCallback } from 'react';
// import { BrowserRouter as Router, Routes, Route, useNavigate, Link } from 'react-router-dom';
// import axios from 'axios';
// import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
// import { HelmetProvider, Helmet } from 'react-helmet-async';
// import logo from './assets/Paperstack_logo_wt.png'; 
// import './App.css';

// // Backend URL (Render) - Your backend is on Render
// const API_URL = 'https://paperstack.onrender.com';

// // Frontend URL (Vercel) - Your frontend is on Vercel
// const FRONTEND_URL = 'https://paper-stack-beryl.vercel.app';

// // --- OFFLINE BANNER COMPONENT ---
// function OfflineBanner({ theme }) {
//   const [isOnline, setIsOnline] = useState(navigator.onLine);
//   const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

//   useEffect(() => {
//     const handleOnline = () => setIsOnline(true);
//     const handleOffline = () => setIsOnline(false);
//     const handleResize = () => setIsMobile(window.innerWidth <= 768);

//     window.addEventListener('online', handleOnline);
//     window.addEventListener('offline', handleOffline);
//     window.addEventListener('resize', handleResize);

//     return () => {
//       window.removeEventListener('online', handleOnline);
//       window.removeEventListener('offline', handleOffline);
//       window.removeEventListener('resize', handleResize);
//     };
//   }, []);

//   if (isOnline || !isMobile) return null;

//   return (
//     <div className={`offline-banner ${theme}`}>
//       <div className="offline-content">
//         <span className="offline-icon">📶</span>
//         <div className="offline-text">
//           <strong>You're Offline</strong>
//           <p>Cached papers are available. Some features may be limited.</p>
//         </div>
//         <button 
//           className="offline-retry" 
//           onClick={() => window.location.reload()}
//         >
//           Retry
//         </button>
//       </div>
//     </div>
//   );
// }

// // --- MOBILE APP DOWNLOAD POPUP ---
// function MobileAppPopup({ theme, onClose }) {
//   const [showPopup, setShowPopup] = useState(false);
//   const [dontShowAgain, setDontShowAgain] = useState(false);

//   useEffect(() => {
//     const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
//     const hasSeenPopup = localStorage.getItem('hasSeenAppPopup');
//     const isFirstVisit = !localStorage.getItem('paperStackVisits');
    
//     if (isMobile && !hasSeenPopup) {
//       // Set visit count
//       const visits = localStorage.getItem('paperStackVisits') || 0;
//       localStorage.setItem('paperStackVisits', String(Number(visits) + 1));
      
//       // Show on first visit or every 5th visit
//       if (isFirstVisit || Number(visits) % 5 === 0) {
//         setTimeout(() => setShowPopup(true), 2000);
//       }
//     }
//   }, []);

//   const handleClose = () => {
//     if (dontShowAgain) {
//       localStorage.setItem('hasSeenAppPopup', 'true');
//     }
//     setShowPopup(false);
//     if (onClose) onClose();
//   };

//   const handleDownload = (platform) => {
//     if (dontShowAgain) {
//       localStorage.setItem('hasSeenAppPopup', 'true');
//     }
    
//     // Track download attempt
//     localStorage.setItem('appDownloadAttempted', 'true');
    
//     // App download links (replace with actual links)
//     const downloadLinks = {
//       android: 'https://play.google.com/store/apps/details?id=com.paperstack',
//       ios: 'https://apps.apple.com/app/paperstack-iiit-surat/id123456789',
//       web: 'https://paper-stack-beryl.vercel.app/'
//     };
    
//     window.open(downloadLinks[platform], '_blank');
//     setShowPopup(false);
//   };

//   const handleAddToHomeScreen = () => {
//     // For PWA - This will trigger the browser's install prompt
//     if (window.deferredPrompt) {
//       window.deferredPrompt.prompt();
//       window.deferredPrompt.userChoice.then((choiceResult) => {
//         if (choiceResult.outcome === 'accepted') {
//           console.log('User accepted the install prompt');
//         }
//         window.deferredPrompt = null;
//       });
//     }
//     setShowPopup(false);
//   };

//   if (!showPopup) return null;

//   return (
//     <div className="mobile-popup-overlay">
//       <div className={`mobile-popup ${theme}`}>
//         <div className="popup-header">
//           <h3>📱 Get the Best Experience</h3>
//           <button onClick={handleClose} className="popup-close">×</button>
//         </div>
        
//         <div className="popup-content">
//           <div className="app-features">
//             <div className="feature-item">
//               <span className="feature-icon">⚡</span>
//               <div>
//                 <strong>Faster Loading</strong>
//                 <p>Optimized for mobile networks</p>
//               </div>
//             </div>
//             <div className="feature-item">
//               <span className="feature-icon">📥</span>
//               <div>
//                 <strong>Offline Access</strong>
//                 <p>View papers without internet</p>
//               </div>
//             </div>
//             <div className="feature-item">
//               <span className="feature-icon">🔔</span>
//               <div>
//                 <strong>Notifications</strong>
//                 <p>Get updates on new papers</p>
//               </div>
//             </div>
//             <div className="feature-item">
//               <span className="feature-icon">💾</span>
//               <div>
//                 <strong>Save Storage</strong>
//                 <p>Cache papers locally</p>
//               </div>
//             </div>
//           </div>

//           <div className="download-options">
//             <button 
//               onClick={() => handleDownload('android')}
//               className="download-btn android-btn"
//             >
//               <span>🤖</span>
//               <div>
//                 <strong>Android App</strong>
//                 <small>Play Store</small>
//               </div>
//             </button>
            
//             <button 
//               onClick={() => handleDownload('ios')}
//               className="download-btn ios-btn"
//             >
//               <span>🍎</span>
//               <div>
//                 <strong>iOS App</strong>
//                 <small>App Store</small>
//               </div>
//             </button>
            
//             <button 
//               onClick={handleAddToHomeScreen}
//               className="download-btn pwa-btn"
//             >
//               <span>➕</span>
//               <div>
//                 <strong>Add to Home Screen</strong>
//                 <small>PWA Installation</small>
//               </div>
//             </button>
//           </div>

//           <div className="popup-footer">
//             <label className="dont-show-again">
//               <input 
//                 type="checkbox" 
//                 checked={dontShowAgain}
//                 onChange={(e) => setDontShowAgain(e.target.checked)}
//               />
//               <span>Don't show this again</span>
//             </label>
//             <button onClick={handleClose} className="later-btn">
//               Maybe Later
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // --- MOBILE BOTTOM NAVIGATION ---
// function MobileBottomNav({ user, isAdmin, onStatsClick, onHomeClick, onSavedClick, onAdminClick, onProfileClick }) {
//   const [activeTab, setActiveTab] = useState('home');

//   const handleClick = (tab, callback) => {
//     setActiveTab(tab);
//     if (callback) callback();
//   };

//   if (window.innerWidth > 768) return null; // Only show on mobile

//   return (
//     <nav className="mobile-bottom-nav">
//       <button 
//         className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
//         onClick={() => handleClick('home', onHomeClick)}
//       >
//         <span className="nav-icon">📚</span>
//         <span className="nav-label">Papers</span>
//       </button>
      
//       <button 
//         className={`nav-item ${activeTab === 'saved' ? 'active' : ''}`}
//         onClick={() => handleClick('saved', onSavedClick)}
//       >
//         <span className="nav-icon">❤️</span>
//         <span className="nav-label">Saved</span>
//       </button>
      
//       <button 
//         className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`}
//         onClick={() => handleClick('stats', onStatsClick)}
//       >
//         <span className="nav-icon">📊</span>
//         <span className="nav-label">Stats</span>
//       </button>
      
//       {isAdmin && (
//         <button 
//           className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
//           onClick={() => handleClick('admin', onAdminClick)}
//         >
//           <span className="nav-icon">⚙️</span>
//           <span className="nav-label">Admin</span>
//         </button>
//       )}
      
//       <button 
//         className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
//         onClick={() => handleClick('profile', onProfileClick)}
//       >
//         <span className="nav-icon">{user ? '👤' : '🔓'}</span>
//         <span className="nav-label">{user ? 'Profile' : 'Login'}</span>
//       </button>
//     </nav>
//   );
// }

// // --- MOBILE SEARCH BAR ---
// function MobileSearchBar({ searchTerm, setSearchTerm, filterSem, setFilterSem }) {
//   const [showSearch, setShowSearch] = useState(false);

//   if (window.innerWidth > 768) return null;

//   return (
//     <div className="mobile-search-container">
//       {!showSearch ? (
//         <button 
//           className="mobile-search-toggle"
//           onClick={() => setShowSearch(true)}
//         >
//           <span className="search-icon">🔍</span>
//           <span className="search-placeholder">
//             {searchTerm || "Search papers..."}
//           </span>
//         </button>
//       ) : (
//         <div className="mobile-search-active">
//           <input
//             type="text"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             placeholder="Search papers..."
//             autoFocus
//             className="mobile-search-input"
//           />
//           <div className="mobile-search-actions">
//             <select 
//               value={filterSem}
//               onChange={(e) => setFilterSem(e.target.value)}
//               className="mobile-sem-filter"
//             >
//               <option value="">All Sem</option>
//               {[1,2,3,4,5,6,7,8].map(s => (
//                 <option key={s} value={s}>Sem {s}</option>
//               ))}
//             </select>
//             <button 
//               onClick={() => setShowSearch(false)}
//               className="mobile-search-close"
//             >
//               Done
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // --- SWIPE INDICATOR FOR MOBILE ---
// function SwipeIndicator() {
//   const [showIndicator, setShowIndicator] = useState(false);

//   useEffect(() => {
//     const hasSeenSwipeTip = localStorage.getItem('hasSeenSwipeTip');
//     if (!hasSeenSwipeTip && window.innerWidth <= 768) {
//       setShowIndicator(true);
//       setTimeout(() => {
//         setShowIndicator(false);
//         localStorage.setItem('hasSeenSwipeTip', 'true');
//       }, 5000);
//     }
//   }, []);

//   if (!showIndicator) return null;

//   return (
//     <div className="swipe-indicator">
//       <div className="swipe-handle">
//         <span className="swipe-arrow">↔</span>
//         <p>Swipe left/right on papers for quick actions</p>
//       </div>
//     </div>
//   );
// }

// // --- MOBILE PAPER CARD (Enhanced for touch) ---
// function MobilePaperCard({ paper, user, isAdmin, onView, onDownload, onSolution, onBookmark, onDelete, onAddSolution }) {
//   const [swipeOffset, setSwipeOffset] = useState(0);
//   const [showActions, setShowActions] = useState(false);
  
//   const handleTouchStart = (e) => {
//     const touch = e.touches[0];
//     this.startX = touch.clientX;
//     this.startY = touch.clientY;
//   };
  
//   const handleTouchMove = (e) => {
//     if (!this.startX || !this.startY) return;
    
//     const touch = e.touches[0];
//     const diffX = touch.clientX - this.startX;
//     const diffY = Math.abs(touch.clientY - this.startY);
    
//     // Only handle horizontal swipe
//     if (Math.abs(diffX) > diffY && Math.abs(diffX) > 10) {
//       e.preventDefault();
//       setSwipeOffset(diffX);
//     }
//   };
  
//   const handleTouchEnd = () => {
//     if (Math.abs(swipeOffset) > 60) {
//       setShowActions(true);
//     } else {
//       setShowActions(false);
//     }
//     setSwipeOffset(0);
//     this.startX = null;
//     this.startY = null;
//   };

//   return (
//     <div 
//       className={`mobile-paper-card ${showActions ? 'show-actions' : ''}`}
//       onTouchStart={handleTouchStart}
//       onTouchMove={handleTouchMove}
//       onTouchEnd={handleTouchEnd}
//       style={{ transform: `translateX(${swipeOffset}px)` }}
//     >
//       <div className="paper-card-main" onClick={() => !showActions && onView(paper)}>
//         <div className="paper-header">
//           <span className={`badge ${paper.examType === 'Mid-Sem' ? 'mid' : 'end'}`}>
//             {paper.examType}
//           </span>
//           <button 
//             className={`heart-icon ${user?.bookmarks.includes(paper._id) ? 'liked' : ''}`}
//             onClick={(e) => {
//               e.stopPropagation();
//               onBookmark(paper._id, e);
//             }}
//           >
//             {user?.bookmarks.includes(paper._id) ? '❤️' : '🤍'}
//           </button>
//         </div>
        
//         <div className="paper-content">
//           <h4>{paper.subject}</h4>
//           <p className="paper-meta">Sem {paper.semester} • {paper.year}</p>
//           <p className="paper-title">{paper.title}</p>
//         </div>
        
//         <div className="paper-stats">
//           <span className="stat">👁️ {paper.views || 0}</span>
//           <span className="stat">⬇️ {paper.downloads || 0}</span>
//           {paper.solutionPath && <span className="stat solution-available">💡</span>}
//         </div>
//       </div>
      
//       <div className="paper-swipe-actions">
//         <button 
//           className="swipe-action view-action"
//           onClick={() => onView(paper)}
//         >
//           👁️ View
//         </button>
//         <button 
//           className="swipe-action download-action"
//           onClick={(e) => onDownload(e, paper)}
//         >
//           ⬇️ Download
//         </button>
//         {paper.solutionPath && (
//           <button 
//             className="swipe-action solution-action"
//             onClick={(e) => onSolution(e, paper)}
//           >
//             💡 Solution
//           </button>
//         )}
//         {isAdmin && (
//           <>
//             <label className="swipe-action update-action">
//               {paper.solutionPath ? '🔄' : '➕'}
//               <input 
//                 type="file" 
//                 hidden 
//                 accept="application/pdf" 
//                 onChange={(e) => onAddSolution(paper._id, e.target.files[0])} 
//               />
//             </label>
//             <button 
//               className="swipe-action delete-action"
//               onClick={(e) => onDelete(e, paper._id)}
//             >
//               🗑️
//             </button>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

// // --- CUSTOM ALERT COMPONENT (Enhanced for mobile) ---
// function CustomAlert({ alert }) {
//   if (!alert.show) return null;
  
//   const isMobile = window.innerWidth <= 768;
  
//   return (
//     <div className={`custom-alert alert-${alert.type} ${isMobile ? 'mobile-alert' : ''}`}>
//       <span className="alert-icon">
//         {alert.type === 'success' ? '✅' : 
//          alert.type === 'error' ? '⚠️' : 
//          alert.type === 'info' ? 'ℹ️' : '💡'}
//       </span>
//       <span className="alert-message">{alert.msg}</span>
//     </div>
//   );
// }


// // --- CACHE MANAGEMENT COMPONENT ---
// function CacheManager({ papers, user }) {
//   const [cacheStatus, setCacheStatus] = useState({
//     total: 0,
//     cached: 0,
//     size: '0 MB'
//   });
  
//   const [isCaching, setIsCaching] = useState(false);

//   useEffect(() => {
//     updateCacheStatus();
//   }, [papers]);

//   const updateCacheStatus = useCallback(async () => {
//     if (!papers.length) return;
    
//     try {
//       const cache = await caches.open('paperstack-papers-v1');
//       const cachedUrls = await cache.keys();
      
//       // Filter papers that belong to user's semester or all if not logged in
//       const relevantPapers = user?.semester 
//         ? papers.filter(p => p.semester === user.semester)
//         : papers;
      
//       const paperUrls = relevantPapers.map(p => p.filePath);
//       const solutionUrls = relevantPapers.map(p => p.solutionPath).filter(Boolean);
//       const allUrls = [...paperUrls, ...solutionUrls];
      
//       const cachedCount = cachedUrls.filter(req => 
//         allUrls.some(url => req.url.includes(url.split('/').pop()))
//       ).length;
      
//       // Estimate cache size
//       let totalSize = 0;
//       for (const request of cachedUrls) {
//         const response = await cache.match(request);
//         if (response) {
//           const blob = await response.blob();
//           totalSize += blob.size;
//         }
//       }
      
//       setCacheStatus({
//         total: allUrls.length,
//         cached: cachedCount,
//         size: `${(totalSize / (1024 * 1024)).toFixed(2)} MB`
//       });
//     } catch (error) {
//       console.log('Cache status error:', error);
//     }
//   }, [papers, user]);

//   const prefetchPapers = useCallback(async () => {
//     if (!papers.length || isCaching) return;
    
//     setIsCaching(true);
//     try {
//       const cache = await caches.open('paperstack-papers-v1');
//       const relevantPapers = user?.semester 
//         ? papers.filter(p => p.semester === user.semester)
//         : papers.slice(0, 20); // Limit to 20 papers for non-logged users
      
//       // Prefetch PDFs in background
//       for (const paper of relevantPapers) {
//         try {
//           // Cache main paper
//           await cache.add(paper.filePath);
          
//           // Cache solution if exists
//           if (paper.solutionPath) {
//             await cache.add(paper.solutionPath);
//           }
//         } catch (err) {
//           console.log(`Failed to cache ${paper.subject}:`, err);
//         }
//       }
      
//       await updateCacheStatus();
//       setIsCaching(false);
//     } catch (error) {
//       console.log('Cache prefetch error:', error);
//       setIsCaching(false);
//     }
//   }, [papers, user, updateCacheStatus]);

//   const clearCache = useCallback(async () => {
//     try {
//       await caches.delete('paperstack-papers-v1');
//       await updateCacheStatus();
//     } catch (error) {
//       console.log('Clear cache error:', error);
//     }
//   }, [updateCacheStatus]);

//   if (!papers.length) return null;

//   return (
//     <div className="fixed bottom-4 right-4 z-40">
//       <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-64 border border-gray-200 dark:border-gray-700">
//         <div className="flex items-center justify-between mb-2">
//           <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
//             📦 Paper Cache
//           </h4>
//           <button
//             onClick={clearCache}
//             className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 transition"
//           >
//             Clear
//           </button>
//         </div>
        
//         <div className="mb-3">
//           <div className="flex justify-between text-xs mb-1">
//             <span className="text-gray-600 dark:text-gray-400">
//               {cacheStatus.cached}/{cacheStatus.total} papers
//             </span>
//             <span className="text-gray-600 dark:text-gray-400">
//               {cacheStatus.size}
//             </span>
//           </div>
//           <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
//             <div 
//               className="bg-blue-500 h-2 rounded-full transition-all duration-500"
//               style={{ width: `${(cacheStatus.cached / cacheStatus.total) * 100 || 0}%` }}
//             ></div>
//           </div>
//         </div>
        
//         <button
//           onClick={prefetchPapers}
//           disabled={isCaching || cacheStatus.cached === cacheStatus.total}
//           className={`w-full py-2 text-sm font-medium rounded-md transition ${
//             isCaching 
//               ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
//               : cacheStatus.cached === cacheStatus.total
//               ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 cursor-default'
//               : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
//           }`}
//         >
//           {isCaching ? '⏳ Caching...' : 
//            cacheStatus.cached === cacheStatus.total ? '✅ All Papers Cached' : 
//            '⚡ Prefetch Papers'}
//         </button>
        
//         <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
//           Cache papers for offline viewing and faster loading
//         </p>
//       </div>
//     </div>
//   );
// }

// // --- APP DOWNLOAD POPUP ---
// function AppDownloadPopup({ theme, onClose }) {
//   const [showPopup, setShowPopup] = useState(true);
//   const [rememberChoice, setRememberChoice] = useState(false);

//   useEffect(() => {
//     const hasClosedPopup = localStorage.getItem('hideAppDownloadPopup');
//     if (hasClosedPopup) {
//       setShowPopup(false);
//     }
//   }, []);

//   const handleClose = () => {
//     if (rememberChoice) {
//       localStorage.setItem('hideAppDownloadPopup', 'true');
//     }
//     setShowPopup(false);
//     if (onClose) onClose();
//   };

//   const handleDownload = (platform) => {
//     // Track download attempt
//     localStorage.setItem('appDownloadAttempted', 'true');
    
//     // For demo - in production, these would be real app store links
//     if (platform === 'android') {
//       window.open('https://play.google.com/store/apps/details?id=com.paperstack', '_blank');
//     } else if (platform === 'ios') {
//       window.open('https://apps.apple.com/app/paperstack-iiit-surat/id123456789', '_blank');
//     }
    
//     if (rememberChoice) {
//       localStorage.setItem('hideAppDownloadPopup', 'true');
//     }
//     setShowPopup(false);
//   };

//   if (!showPopup) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
//       <div className={`relative rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 animate-fadeIn ${
//         theme === 'dark' 
//           ? 'bg-gray-800 text-white' 
//           : 'bg-white text-gray-800'
//       }`}>
//         {/* Close button */}
//         <button
//           onClick={handleClose}
//           className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl"
//         >
//           ×
//         </button>
        
//         {/* Header */}
//         <div className="p-6 text-center">
//           <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 mb-4">
//             <span className="text-2xl">📱</span>
//           </div>
//           <h3 className="text-xl font-bold mb-2">Get the PaperStack App!</h3>
//           <p className="text-gray-600 dark:text-gray-300">
//             Access your papers faster with our mobile app. Download now for the best experience.
//           </p>
//         </div>
        
//         {/* App Features */}
//         <div className="px-6 mb-6">
//           <div className="grid grid-cols-2 gap-3 mb-4">
//             <div className="flex items-center space-x-2">
//               <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
//                 <span className="text-blue-600 dark:text-blue-300">⚡</span>
//               </div>
//               <span className="text-sm">Faster Loading</span>
//             </div>
//             <div className="flex items-center space-x-2">
//               <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
//                 <span className="text-green-600 dark:text-green-300">📥</span>
//               </div>
//               <span className="text-sm">Offline Access</span>
//             </div>
//             <div className="flex items-center space-x-2">
//               <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
//                 <span className="text-purple-600 dark:text-purple-300">🔔</span>
//               </div>
//               <span className="text-sm">Notifications</span>
//             </div>
//             <div className="flex items-center space-x-2">
//               <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
//                 <span className="text-yellow-600 dark:text-yellow-300">📊</span>
//               </div>
//               <span className="text-sm">Better Stats</span>
//             </div>
//           </div>
//         </div>
        
//         {/* Download Buttons */}
//         <div className="p-6 pt-0">
//           <button
//             onClick={() => handleDownload('android')}
//             className="w-full mb-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center transition transform hover:scale-[1.02]"
//           >
//             <span className="mr-2">🤖</span>
//             Download for Android
//           </button>
          
//           <button
//             onClick={() => handleDownload('ios')}
//             className="w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white font-semibold py-3 rounded-xl flex items-center justify-center transition transform hover:scale-[1.02]"
//           >
//             <span className="mr-2">🍎</span>
//             Download for iOS
//           </button>
          
//           {/* Remember choice checkbox */}
//           <div className="flex items-center mt-4">
//             <input
//               type="checkbox"
//               id="rememberChoice"
//               checked={rememberChoice}
//               onChange={(e) => setRememberChoice(e.target.checked)}
//               className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
//             />
//             <label htmlFor="rememberChoice" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
//               Don't show this again
//             </label>
//           </div>
          
//           {/* Later button */}
//           <button
//             onClick={handleClose}
//             className="w-full mt-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium py-2 transition"
//           >
//             Maybe Later
//           </button>
//         </div>
        
//         {/* App Rating */}
//         <div className="border-t border-gray-200 dark:border-gray-700 p-4 text-center">
//           <div className="flex items-center justify-center mb-1">
//             {[1, 2, 3, 4, 5].map((star) => (
//               <span key={star} className="text-yellow-400 text-lg">★</span>
//             ))}
//           </div>
//           <p className="text-sm text-gray-500 dark:text-gray-400">
//             Rated 4.9 by 500+ IIIT Surat students
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

// // --- CUSTOM ALERT COMPONENT ---
// function CustomAlert({ alert }) {
//   if (!alert.show) return null;
//   return (
//     <div className={`custom-alert alert-${alert.type}`}>
//       <span>{alert.type === 'success' ? '✅' : alert.type === 'error' ? '⚠️' : 'ℹ️'}</span>
//       {alert.msg}
//     </div>
//   );
// }

// function Footer() {
//   return (
//     <footer className="site-footer">
//       <div className="container">
//         <div className="footer-grid">
//           {/* Brand Section with Logo */}
//           <div className="footer-brand">
//             <div className="footer-logo-wrapper">
//               <img src={logo} alt="PaperStack Logo - IIIT Surat Previous Year Papers Archive" className="footer-logo-img" />
//               <h3 className="footer-logo">PaperStack</h3>
//             </div>
//             <p className="footer-description">
//               The official archive for IIIT Surat previous year papers. 
//               Helping students prepare better with organized academic resources.
//             </p>
//             <p>Managed and maintained by <strong>Yogesh Khinchi</strong>.</p>
//           </div>

//           {/* Quick Links */}
//           <div className="footer-links">
//             <h4 className="footer-heading">Navigation</h4>
//             <ul className="footer-list">
//               <li><Link to="">Home</Link></li>
//               <li><Link to="/login">Student Login</Link></li>
//               <li><Link to="/admin">Admin Access</Link></li>
//             </ul>
//           </div>

//           {/* Community Section */}
//           <div className="footer-links">
//             <h4 className="footer-heading">Community</h4>
//             <ul className="footer-list">
//               <li><a href="https://github.com" target="_blank" rel="noreferrer noopener">GitHub</a></li>
//               <li><a href="https://linkedin.com" target="_blank" rel="noreferrer noopener">LinkedIn</a></li>
//               <li><a href="mailto:paperstack.iiitsurat@gmail.com">Support</a></li>
//             </ul>
//           </div>
//         </div>

//         {/* Bottom Bar */}
//         <div className="footer-bottom">
//           <p>&copy; {new Date().getFullYear()} IIIT Surat Archive. Built for the community.</p>
//           <div className="footer-status">
//             <span className="status-dot"></span>
//             System Online
//           </div>
//         </div>
//       </div>
//     </footer>
//   );
// }

// // --- AUTH COMPONENTS ---
// function Register({ showAlert }) { 
//   const [formData, setFormData] = useState({ username: '', email: '', password: '', semester: 1 });
//   const navigate = useNavigate();

//   const paperStackLogo = "/logo.png"; 

//   const handleRegister = async (e) => {
//     e.preventDefault();

//     // Domain Restriction: Ensure it's an official IIIT Surat email
//     if (!formData.email.toLowerCase().endsWith('@iiitsurat.ac.in')) {
//         showAlert("Access Denied: Please use your @iiitsurat.ac.in email", "error");
//         return;
//     }

//     try { 
//         await axios.post(`${API_URL}/api/auth/register`, formData); 
//         showAlert("Registration Successful! Please Login.", "success"); 
//         navigate('/login'); 
//     } 
//     catch (err) { 
//         showAlert(err.response?.data?.message || "Registration Failed", "error"); 
//         console.log("Registration error:", err);
//     }
//   };

//   return ( 
//     <div className="auth-page-wrapper">
//         <Helmet>
//           <title>Register - PaperStack | IIIT Surat Student Portal</title>
//           <meta name="description" content="Create your student account on PaperStack to access IIIT Surat previous year question papers, solutions, and study materials." />
//           <meta name="keywords" content="IIIT Surat registration, student account, IIIT Surat papers access, engineering student portal" />
//           <link rel="canonical" href={`${FRONTEND_URL}/register`} />
//         </Helmet>
        
//         <div className="auth-card login-card-animated">
//             <div className="login-logo-container">
//                 <img src={paperStackLogo} alt="PaperStack Logo - IIIT Surat Papers Archive" className="login-logo-img pulse-entry" />
//             </div>

//             <div className="login-intro">
//                 <h2 className="slide-up-text">
//                    <span className="paperstack-brand-text">IIIT Surat Archive</span>
//                 </h2>
//                 <p className="fade-in-text">Create your IIIT Surat student profile</p>
//             </div>

//             <div className="auth-note-box pulse-entry">
//                 <span className="note-icon">⚠️</span>
//                 <p><strong>Important:</strong> You can't reset your password, so choose it carefully.</p>
//             </div>

//             <form onSubmit={handleRegister} className="login-form-content">
//                 <div className="input-field-animation">
//                     <input 
//                         type="text" 
//                         placeholder="Username" 
//                         onChange={e => setFormData({...formData, username: e.target.value})} 
//                         required 
//                     />
//                 </div>
//                 <div className="input-field-animation-delay">
//                     <input 
//                         type="email" 
//                         placeholder="Institute Email (name@iiitsurat.ac.in)" 
//                         onChange={e => setFormData({...formData, email: e.target.value})} 
//                         required 
//                     />
//                 </div>
//                 <div className="input-field-animation-delay">
//                     <input 
//                         type="password" 
//                         placeholder="Password" 
//                         onChange={e => setFormData({...formData, password: e.target.value})} 
//                         required 
//                     />
//                 </div>

//                 <div className="sem-select-container">
//                     <label>Current Semester:</label>
//                     <select 
//                         value={formData.semester} 
//                         onChange={e => setFormData({...formData, semester: Number(e.target.value)})}
//                     >
//                         {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
//                     </select>
//                 </div>

//                 <button type="submit" className="login-btn-gradient">
//                     Create Account
//                 </button>
//             </form>
            
//             <p className="auth-switch-text">
//                 Already have an account? <Link to="/login">Login here</Link>
//             </p>
//         </div>
//     </div> 
//   );
// }

// function Login({ setUser, showAlert }) { 
//   const [formData, setFormData] = useState({ email: '', password: '' });
//   const navigate = useNavigate();

//   const paperStackLogo = "/logo.png"; 
//   const iiitSuratLogo = "/iiit_surat.png";

//   const handleLogin = async (e) => {
//     e.preventDefault();

//     if (!formData.email.toLowerCase().endsWith('@iiitsurat.ac.in')) {
//         showAlert("Access Denied: Please use your @iiitsurat.ac.in email", "error");
//         return;
//     }

//     try { 
//         const res = await axios.post(`${API_URL}/api/auth/login`, formData); 
//         localStorage.setItem('token', res.data.token); 
//         localStorage.setItem('username', res.data.username);
//         if(res.data.semester) localStorage.setItem('userSemester', res.data.semester);

//         setUser({ 
//             username: res.data.username, 
//             bookmarks: res.data.bookmarks,
//             semester: res.data.semester 
//         }); 
        
//         navigate('/'); 
//         showAlert(`Welcome back, ${res.data.username}!`, "success");
//     } 
//     catch (err) { 
//         showAlert(err.response?.data?.message || "Invalid Credentials", "error"); 
//     }
//   };
  
//   return ( 
//     <div className="auth-page-wrapper">
//       <Helmet>
//         <title>Login - PaperStack | IIIT Surat Student Access</title>
//         <meta name="description" content="Login to your PaperStack account to access IIIT Surat previous year question papers, solutions, and exam resources." />
//         <meta name="keywords" content="IIIT Surat login, student portal, access papers, engineering exam papers login" />
//         <link rel="canonical" href={`${FRONTEND_URL}/login`} />
//       </Helmet>
      
//       <div className="auth-card login-card-animated">
//           <div className="login-logo-container">
//               <img src={paperStackLogo} alt="PaperStack Logo - IIIT Surat Papers" className="login-logo-img pulse-entry" />
//               <div className="logo-vertical-line"></div>
//               <img src={iiitSuratLogo} alt="IIIT Surat Logo" className="login-logo-img pulse-entry-delay" />
//           </div>
          
//           <div className="login-intro">
//               <h2 className="slide-up-text">IIIT SURAT ARCHIVE</h2>
//               <p className="fade-in-text">Login to access your semester papers</p>
//           </div>

//           <form onSubmit={handleLogin} className="login-form-content">
//               <div className="input-field-animation">
//                   <input 
//                       type="email" 
//                       placeholder="Institute Email ID" 
//                       onChange={e => setFormData({...formData, email: e.target.value})} 
//                       required 
//                   />
//               </div>
//               <div className="input-field-animation-delay">
//                   <input 
//                       type="password" 
//                       placeholder="Password" 
//                       onChange={e => setFormData({...formData, password: e.target.value})} 
//                       required 
//                   />
//               </div>
//               <button type="submit" className="auth-btn login-btn-gradient">
//                   Secure Login
//               </button>
//           </form>
//           <p className="auth-switch-text">
//               Not registered? <Link to="/register">Join the Community</Link>
//           </p>
//            <div className="auth-note-box pulse-entry">
//               <span className="note-icon">⚠️</span>
//               <p><strong>NOTE:</strong> For any queries mail at : <a href="mailto:paperstack.iiitsurat@gmail.com">paperstack.iiitsurat@gmail.com</a></p>
//           </div>
//       </div>
//     </div> 
//   );
// }

// function AdminLogin({ showAlert }) {
//   const [password, setPassword] = useState('');
//   const navigate = useNavigate();

//   const handleAdminLogin = async (e) => { 
//       e.preventDefault(); 
//       try { 
//           const res = await axios.post(`${API_URL}/api/admin/verify`, { password }); 
//           if(res.data.success) { 
//               localStorage.setItem('adminPass', password); 
//               showAlert("Admin Verified!", "success");
//               navigate('/'); 
//           } 
//       } catch { showAlert("Wrong Password", "error"); } 
//   };
  
//   return ( 
//     <div className="auth-container">
//       <Helmet>
//         <title>Admin Login - PaperStack | IIIT Surat Management</title>
//         <meta name="description" content="Admin access portal for PaperStack - IIIT Surat's previous year papers archive management system." />
//         <link rel="canonical" href={`${FRONTEND_URL}/admin`} />
//       </Helmet>
//       <div className="auth-card">
//         <h2>🔐 Admin Access</h2>
//         <form onSubmit={handleAdminLogin}>
//           <input type="password" placeholder="Admin Password" onChange={e=>setPassword(e.target.value)} />
//           <button className="auth-btn">Unlock</button>
//         </form>
//       </div>
//     </div> 
//   );
// }

// // --- SEMESTER SELECTION MODAL ---
// function SemesterModal({ user, setUser, onClose, showAlert }) {
//     const [selectedSem, setSelectedSem] = useState(user?.semester || 1);

//     const handleSave = async () => {
//         try {
//             await axios.put(`${API_URL}/api/user/semester`, 
//                 { semester: selectedSem }, 
//                 { headers: { Authorization: localStorage.getItem('token') } }
//             );

//             const updatedUser = { ...user, semester: selectedSem };
//             setUser(updatedUser);
//             localStorage.setItem('userSemester', selectedSem);
            
//             if(showAlert) showAlert(`Preference saved: Semester ${selectedSem}`, "success");
//             if (onClose) onClose();
//         } catch (err) {
//             if(showAlert) showAlert("Failed to save semester", "error");
//             console.error(err);
//         }
//     };

//     return (
//         <div className="modal-overlay">
//             <div className="modal-content" style={{ maxWidth: '310px', maxHeight: '250px', width: '90%', padding: '25px', textAlign: 'center', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
//                 <h3>🎓 Which Semester are you in?</h3>
//                 <p>We'll show you these papers first.</p>
//                 <div style={{ margin: '10px 0' }}>
//                     <select 
//                         value={selectedSem} 
//                         onChange={(e) => setSelectedSem(Number(e.target.value))}
//                         style={{ padding: '10px', fontSize: '16px', width: '100%' }}
//                     >
//                         {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
//                     </select>
//                 </div>
//                 <button onClick={handleSave} className="auth-btn">Save Preference</button>
//             </div>
//         </div>
//     );
// }

// // --- ANALYTICS DASHBOARD ---
// function AnalyticsDashboard({ onClose }) {
//     const [data, setData] = useState([]);
//     useEffect(() => { 
//         axios.get(`${API_URL}/api/analytics`)
//             .then(res => setData(res.data))
//             .catch(err => console.error("Analytics error:", err)); 
//     }, []);

//     return (
//         <div className="analytics-panel">
//             <div className="panel-header">
//                 <h3>📊 Exam Difficulty Analytics</h3>
//                 <button onClick={onClose} className="close-btn">✖</button>
//             </div>
//             <div className="chart-container">
//                 <ResponsiveContainer width="100%" height={300}>
//                     <BarChart data={data}>
//                         <XAxis dataKey="_id" stroke="#8884d8" />
//                         <YAxis />
//                         <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ color: '#333' }} />
//                         <Bar dataKey="totalViews" fill="#4f46e5" radius={[4, 4, 0, 0]}>
//                             {data.map((entry, index) => (
//                                 <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#4f46e5'} />
//                             ))}
//                         </Bar>
//                     </BarChart>
//                 </ResponsiveContainer>
//                 <p className="insight-text">
//                     💡 <strong>Insight:</strong> "{data[0]?._id || 'No data'}" seems to be the toughest subject!
//                 </p>
//             </div>
//         </div>
//     );
// }

// // --- UPDATED PAPER DETAILS MODAL with Caching ---
// function PaperModal({ paper, user, onClose, showAlert }) {
//     const [comments, setComments] = useState([]);
//     const [newComment, setNewComment] = useState('');
//     const [iframeLoading, setIframeLoading] = useState(true);
//     const [cached, setCached] = useState(false);

//     const fetchComments = useCallback(async () => { 
//         try {
//             const res = await axios.get(`${API_URL}/api/papers/${paper._id}/comments`); 
//             setComments(res.data); 
//         } catch (err) {
//             console.error("Error fetching comments", err);
//         }
//     }, [paper._id]);

//     const checkIfCached = useCallback(async () => {
//       try {
//         const cache = await caches.open('paperstack-papers-v1');
//         const response = await cache.match(paper.filePath);
//         setCached(!!response);
//       } catch (error) {
//         console.log('Cache check error:', error);
//       }
//     }, [paper.filePath]);

//     const cachePaper = useCallback(async () => {
//       try {
//         const cache = await caches.open('paperstack-papers-v1');
//         await cache.add(paper.filePath);
//         setCached(true);
//         showAlert(`Paper cached for offline viewing!`, 'success');
//       } catch (error) {
//         console.log('Cache error:', error);
//       }
//     }, [paper.filePath, showAlert]);

//     useEffect(() => { 
//         fetchComments(); 
//         setIframeLoading(true);
//         checkIfCached();
//     }, [paper._id, fetchComments, checkIfCached]);

//     const postComment = async (e) => {
//         e.preventDefault();
//         if(!newComment.trim()) return;
//         if(!user) { showAlert("Please Login to comment", "error"); return; }
        
//         try {
//             await axios.post(
//                 `${API_URL}/api/papers/${paper._id}/comments`, 
//                 { text: newComment }, 
//                 { headers: { Authorization: localStorage.getItem('token') } }
//             );
//             setNewComment(''); 
//             fetchComments();
//         } catch (err) { 
//             showAlert("Failed to post comment", "error"); 
//         }
//     };

//     return (
//         <div className="modal-overlay" onClick={onClose}>
//             <div className="modal-content" onClick={e => e.stopPropagation()}>
//                 <button className="close-modal-btn" onClick={onClose}>✖</button>
                
//                 <div className="modal-split">
//                     {/* LEFT SIDE: PDF Viewer */}
//                     <div className="modal-left">
//                         <div className="modal-header-info">
//                             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
//                                 <div>
//                                     <h3>📄 {paper.subject}</h3>
//                                     <span className="badge-pill">{paper.examType} • {paper.year}</span>
//                                 </div>
//                                 <button
//                                     onClick={cachePaper}
//                                     style={{
//                                         padding: '6px 12px',
//                                         borderRadius: '20px',
//                                         fontSize: '0.85rem',
//                                         fontWeight: '500',
//                                         transition: 'all 0.3s',
//                                         border: 'none',
//                                         cursor: 'pointer',
//                                         ...(cached 
//                                             ? { backgroundColor: '#d1fae5', color: '#065f46' }
//                                             : { backgroundColor: '#dbeafe', color: '#1e40af' })
//                                     }}
//                                     title={cached ? "Paper is cached for offline viewing" : "Cache paper for offline viewing"}
//                                 >
//                                     {cached ? '✅ Cached' : '💾 Cache'}
//                                 </button>
//                             </div>
//                         </div>

//                         <div className="pdf-container">
//                             {iframeLoading && (
//                                 <div className="pdf-skeleton">
//                                     <div className="skeleton-shimmer"></div>
//                                     <p>Loading document...</p>
//                                 </div>
//                             )}
                            
//                             <iframe 
//                                 src={`${paper.filePath}#toolbar=0`}
//                                 title={`${paper.subject} ${paper.examType} Paper - Semester ${paper.semester}, ${paper.year}`}
//                                 className="pdf-frame"
//                                 onLoad={() => setIframeLoading(false)}
//                                 style={{ opacity: iframeLoading ? 0 : 1 }}
//                             ></iframe>
//                         </div>

//                         <div className="modal-actions">
//                             <a href={paper.filePath} target="_blank" rel="noopener noreferrer" className="btn-download">
//                                 ⬇️ Download Paper
//                             </a>
//                             {paper.solutionPath && (
//                                 <a href={paper.solutionPath} target="_blank" rel="noopener noreferrer" className="btn-solution">
//                                     💡 View Solution
//                                 </a>
//                             )}
//                         </div>
//                     </div>

//                     {/* RIGHT SIDE: Comments/Doubts */}
//                     <div className="modal-right">
//                         <div className="discussion-header">
//                             <h3>💬 Doubt Section</h3>
//                             <p>{comments.length} Thoughts</p>
//                         </div>

//                         <div className="comments-list">
//                             {comments.length === 0 ? (
//                                 <div className="empty-comments">
//                                     <p>No doubts yet. Be the first to ask!</p>
//                                 </div>
//                             ) : (
//                                 comments.map(c => (
//                                     <div key={c._id} className="comment-bubble">
//                                         <div className="comment-user-icon">
//                                             {c.username.charAt(0).toUpperCase()}
//                                         </div>
//                                         <div className="comment-details">
//                                             <strong>{c.username}</strong>
//                                             <p>{c.text}</p>
//                                         </div>
//                                     </div>
//                                 ))
//                             )}
//                         </div>

//                         <form onSubmit={postComment} className="comment-form">
//                             <input 
//                                 value={newComment} 
//                                 onChange={e => setNewComment(e.target.value)} 
//                                 placeholder={user ? "Write a doubt..." : "Login to join discussion"} 
//                                 disabled={!user} 
//                             />
//                             <button type="submit" disabled={!user || !newComment.trim()}>
//                                 Send
//                             </button>
//                         </form>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }

// function PaperSkeleton() {
//   return (
//     <div className="paper-card skeleton">
//       <div className="card-stats-row">
//         <div className="skeleton-circle"></div>
//         <div className="skeleton-circle"></div>
//         <div className="skeleton-circle"></div>
//       </div>
//       <div className="card-body">
//         <div className="skeleton-line skeleton-badge"></div>
//         <div className="skeleton-line skeleton-title"></div>
//         <div className="skeleton-line skeleton-text"></div>
//         <div className="skeleton-line skeleton-meta"></div>
//       </div>
//       <div className="card-actions">
//         <div className="skeleton-line skeleton-button"></div>
//       </div>
//     </div>
//   );
// }

// // --- HOME COMPONENT ---
// function Home({ user, setUser, theme, toggleTheme, showAlert }) {
//   const [papers, setPapers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState('all'); 
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterSem, setFilterSem] = useState(user?.semester?.toString() || '');
//   const [showAnalytics, setShowAnalytics] = useState(false);
//   const [selectedPaper, setSelectedPaper] = useState(null);
//   const [showSemModal, setShowSemModal] = useState(false);
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [formData, setFormData] = useState({ title: '', subject: '', year: '', semester: '', examType: 'Mid-Sem' });
//   const [file, setFile] = useState(null);
//   const [solutionFile, setSolutionFile] = useState(null);
//   const [isUploading, setIsUploading] = useState(false);
//   const [showAppDownload, setShowAppDownload] = useState(false);

//   const handleSolution = (e, paper) => {
//       e.stopPropagation();
//       if(paper.solutionPath) {
//           window.open(paper.solutionPath, '_blank');
//       } else {
//           showAlert("No solution available", "info");
//       }
//   };

//   const fetchPapers = useCallback(async () => { 
//     setLoading(true);
//     try {
//         const res = await axios.get(`${API_URL}/api/papers`); 
        
//         if (!res.data || !Array.isArray(res.data)) {
//             console.error("Invalid data format:", res.data);
//             showAlert("Received invalid data from server", "error");
//             setPapers([]);
//             return; 
//         }

//         const sorted = res.data.sort((a, b) => {
//             const yearA = a.year || 0;
//             const yearB = b.year || 0;
//             const semA = a.semester || 0;
//             const semB = b.semester || 0;

//             if (yearB !== yearA) return yearB - yearA;
//             if (semB !== semA) return semB - semA;

//             const typeOrder = { 'Mid-Sem': 1, 'End-Sem': 2 };
//             const typeA = typeOrder[a.examType] || 3;
//             const typeB = typeOrder[b.examType] || 3;
            
//             return typeA - typeB;
//         });

//         setPapers(sorted); 
//     } catch (err) { 
//         console.error("❌ Fetch Error:", err); 
//         showAlert("Failed to load papers. Please check your connection.", "error");
//     } finally {
//         setTimeout(() => setLoading(false), 500); 
//     }
//   }, [showAlert]);

//   useEffect(() => { 
//       fetchPapers(); 
//       if(localStorage.getItem('adminPass')) setIsAdmin(true);
//       if (user && !user.semester) { setShowSemModal(true); }
//       if (user && user.semester) { setFilterSem(user.semester.toString()); }
      
//       // Show app download popup on first visit for mobile users
//       const hasSeenPopup = localStorage.getItem('hasSeenAppDownloadPopup');
//       const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
//       if (isMobile && !hasSeenPopup) {
//         const timer = setTimeout(() => {
//           setShowAppDownload(true);
//           localStorage.setItem('hasSeenAppDownloadPopup', 'true');
//         }, 3000);
        
//         return () => clearTimeout(timer);
//       }
//   }, [user, fetchPapers]);

//   // Function to exit admin mode
//   const exitAdminMode = () => {
//     localStorage.removeItem('adminPass');
//     setIsAdmin(false);
//     showAlert("Exited admin mode", "success");
//   };

//   const handleUpload = async (e) => {
//     e.preventDefault();
//     if (!file) { showAlert("Please select a paper PDF", "error"); return; }
    
//     setIsUploading(true);

//     const data = new FormData();
//     Object.keys(formData).forEach(key => data.append(key, formData[key]));
//     data.append('file', file);
//     if(solutionFile) data.append('solution', solutionFile);

//     try {
//         const adminPass = localStorage.getItem('adminPass');
//         await axios.post(`${API_URL}/api/upload`, data, {
//             headers: { 'Content-Type': 'multipart/form-data', 'x-admin-password': adminPass }
//         });
//         showAlert("Paper Uploaded Successfully!", "success");
//         setFile(null); 
//         setSolutionFile(null);
//         fetchPapers();
//     } catch (err) { 
//         showAlert("Upload Failed. Check credentials/connection.", "error"); 
//         console.error(err); 
//     } finally {
//         setIsUploading(false);
//     }
//   };

//   const handleAddSolutionToExisting = async (paperId, selectedFile) => {
//     if (!selectedFile) return;
//     setIsUploading(true);
//     const data = new FormData();
//     data.append('solution', selectedFile);

//     try {
//       const adminPass = localStorage.getItem('adminPass');
//       await axios.put(`${API_URL}/api/papers/${paperId}/solution`, data, {
//         headers: { 'Content-Type': 'multipart/form-data', 'x-admin-password': adminPass }
//       });
//       showAlert("Solution Added!", "success");
//       fetchPapers();
//     } catch (err) {
//       showAlert("Failed to upload solution", "error");
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   const handleDelete = async (e, paperId) => {
//       e.stopPropagation();
//       if(!window.confirm("⚠️ Delete this paper permanently?")) return;
//       try {
//           const adminPass = localStorage.getItem('adminPass');
//           await axios.delete(`${API_URL}/api/papers/${paperId}`, { headers: { 'x-admin-password': adminPass } });
//           showAlert("Deleted", "success");
//           setPapers(prev => prev.filter(p => p._id !== paperId));
//       } catch (err) { showAlert("Delete Failed", "error"); }
//   };

//   const getHardestSubject = () => {
//       if (!papers.length) return null;
//       const relevantPapers = filterSem ? papers.filter(p => p.semester.toString() === filterSem) : papers;
//       if (relevantPapers.length === 0) return null;
//       const scores = {};
//       relevantPapers.forEach(p => { 
//           const score = (p.views || 0) + (p.downloads || 0); 
//           scores[p.subject] = (scores[p.subject] || 0) + score; 
//       });
//       const hardest = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
//       return { subject: hardest, score: scores[hardest] };
//   };

//   const hardestSubject = getHardestSubject();

//   const handleView = async (paper) => {
//       setSelectedPaper(paper);
//       try {
//           await axios.post(`${API_URL}/api/papers/${paper._id}/view`);
//       } catch (err) {
//           console.error("Failed to increment view count:", err);
//       }
//       setPapers(prev => prev.map(p => p._id === paper._id ? { ...p, views: (p.views || 0) + 1 } : p));
//   };

//   const handleDownload = async (e, paper) => {
//       e.stopPropagation();
//       window.open(paper.filePath, '_blank'); 
//       try {
//           await axios.post(`${API_URL}/api/papers/${paper._id}/download`);
//       } catch (err) {
//           console.error("Failed to increment download count:", err);
//       }
//       setPapers(prev => prev.map(p => p._id === paper._id ? { ...p, downloads: (p.downloads || 0) + 1 } : p));
//   };

//   const toggleBookmark = async (paperId, e) => {
//       e.stopPropagation();
//       if (!user) { showAlert("Please Login to Bookmark!", "info"); return; }
//       try {
//           const res = await axios.put(`${API_URL}/api/user/bookmark/${paperId}`, {}, { 
//               headers: { Authorization: localStorage.getItem('token') } 
//           });
//           setUser({ ...user, bookmarks: res.data });
//       } catch (err) {
//           showAlert("Failed to bookmark", "error");
//       }
//   };
  
//   const displayedPapers = papers.filter(p => {
//       const matchesSearch = p.subject.toLowerCase().includes(searchTerm.toLowerCase());
//       const matchesTab = filter === 'saved' ? user?.bookmarks.includes(p._id) : true;
//       const matchesSem = filterSem ? p.semester.toString() === filterSem : true;
//       return matchesSearch && matchesTab && matchesSem;
//   });

//   // SEO Structured Data
//   const websiteStructuredData = {
//     "@context": "https://schema.org",
//     "@type": "EducationalOrganization",
//     "name": "PaperStack - IIIT Surat Archive",
//     "url": `${FRONTEND_URL}/`,
//     "logo": `${FRONTEND_URL}/logo.png`,
//     "description": "Digital archive of previous year question papers for IIIT Surat students",
//     "founder": "Yogesh Khinchi",
//     "keywords": "IIIT Surat papers, question papers, exam papers, engineering papers , iiit surat, iiit surat papers , surat college papers ",
//     "educationalLevel": "Undergraduate",
//     "educationalProgram": "Bachelor of Technology (B.Tech)"
//   };

//   const breadcrumbStructuredData = {
//     "@context": "https://schema.org",
//     "@type": "BreadcrumbList",
//     "itemListElement": [
//       {
//         "@type": "ListItem",
//         "position": 1,
//         "name": "Home",
//         "item": `${FRONTEND_URL}/`
//       },
//       {
//         "@type": "ListItem",
//         "position": 2,
//         "name": filterSem ? `Semester ${filterSem} Papers` : "All Papers",
//         "item": `${FRONTEND_URL}/${filterSem ? `?sem=${filterSem}` : ''}`
//       }
//     ]
//   };

//   const faqStructuredData = {
//     "@context": "https://schema.org",
//     "@type": "FAQPage",
//     "mainEntity": [
//       {
//         "@type": "Question",
//         "name": "What is PaperStack?",
//         "acceptedAnswer": {
//           "@type": "Answer",
//           "text": "PaperStack is the official archive of IIIT Surat previous year question papers, providing free access to exam papers for all semesters and subjects."
//         }
//       },
//       {
//         "@type": "Question",
//         "name": "Are the papers free to download?",
//         "acceptedAnswer": {
//           "@type": "Answer",
//           "text": "Yes, all question papers on PaperStack are completely free to view and download for IIIT Surat students."
//         }
//       },
//       {
//         "@type": "Question",
//         "name": "Which semesters are covered?",
//         "acceptedAnswer": {
//           "@type": "Answer",
//           "text": "We provide papers for all 8 semesters of B.Tech program including both Mid-Semester and End-Semester exams."
//         }
//       }
//     ]
//   };

//   return (
//     <> 
//     <Helmet>
//       <title>
//         {filterSem ? `Sem ${filterSem} Papers - IIIT Surat Previous Year Question Papers` : 'IIIT Surat Previous Year Papers - PaperStack Archive'}
//       </title>
//       <meta 
//         name="description" 
//         content="Access 1000+ IIIT Surat previous year question papers, solutions, and study materials for all semesters (1-8). Download free exam papers for Mid-Sem and End-Sem exams." 
//       />
//       <meta 
//         name="keywords" 
//         content="IIIT Surat previous year papers, IIIT Surat question papers, semester exam papers, engineering question papers, mid sem papers, end sem papers, computer science papers, BTech papers"
//       />
//       <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
//       <link rel="canonical" href={`${FRONTEND_URL}/`} />
      
//       {/* Open Graph / Facebook */}
//       <meta property="og:type" content="website" />
//       <meta property="og:title" content="PaperStack - IIIT Surat Previous Year Papers Archive" />
//       <meta property="og:description" content="Free access to IIIT Surat previous year question papers, solutions, and study resources for all engineering branches and semesters." />
//       <meta property="og:image" content={`${FRONTEND_URL}/logo.png`} />
//       <meta property="og:url" content={`${FRONTEND_URL}/`} />
//       <meta property="og:site_name" content="PaperStack" />
//       <meta property="og:locale" content="en_IN" />
//       <meta property="og:image:width" content="1200" />
//       <meta property="og:image:height" content="630" />
//       <meta property="og:image:alt" content="IIIT Surat Previous Year Papers - PaperStack" />
      
//       {/* Twitter */}
//       <meta name="twitter:card" content="summary_large_image" />
//       <meta name="twitter:title" content="PaperStack | IIIT Surat Question Papers" />
//       <meta name="twitter:description" content="Download free IIIT Surat previous year papers for all semesters." />
//       <meta name="twitter:image" content={`${FRONTEND_URL}/logo.png`} />
      
//       {/* Additional Meta Tags */}
//       <meta name="author" content="Yogesh Khinchi, IIIT Surat" />
//       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//       <meta name="theme-color" content="#4f46e5" />
//       <meta name="language" content="English" />
      
//       {/* Structured Data for SEO */}
//       <script type="application/ld+json">
//         {JSON.stringify(websiteStructuredData)}
//       </script>
//       <script type="application/ld+json">
//         {JSON.stringify(breadcrumbStructuredData)}
//       </script>
//       <script type="application/ld+json">
//         {JSON.stringify(faqStructuredData)}
//       </script>
//     </Helmet>

//     <div className="app-container">
//       {showSemModal && (
//         <SemesterModal 
//             user={user} 
//             setUser={setUser} 
//             showAlert={showAlert}
//             onClose={() => {
//                 setShowSemModal(false);
//                 if(user.semester) setFilterSem(user.semester.toString());
//             }} 
//         />
//       )}

//       <nav className="navbar">
//         <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
//           <img src={logo} alt="PaperStack Logo - IIIT Surat Previous Year Papers Archive" style={{ height: '45px', borderRadius: '8px', objectFit: 'contain' }} /> 
//           <span>PaperStack</span>
//         </div>
//         <div className="nav-links">
//           <button className="theme-btn" onClick={toggleTheme}>{theme === 'light' ? '🌙' : '☀️'}</button>
          
//           {/* App Download Button */}
//           <button 
//             onClick={() => setShowAppDownload(true)}
//             className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition transform hover:scale-105 ml-2"
//             style={{
//               boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.4)'
//             }}
//           >
//             <span className="text-lg">📱</span>
//             <span className="font-medium">Get App</span>
//           </button>
          
//           <button className="stats-btn" onClick={() => setShowAnalytics(!showAnalytics)}>📊 Stats</button>
          
//           {!isAdmin && <Link to="/admin" className="btn-admin-login">Admin</Link>}
//           {isAdmin && (
//             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//               <span className="admin-badge">ADMIN MODE</span>
//               <button 
//                 onClick={exitAdminMode}
//                 className="btn-exit-admin"
//                 style={{
//                   background: '#f59e0b',
//                   color: 'white',
//                   border: 'none',
//                   padding: '6px 12px',
//                   borderRadius: '6px',
//                   cursor: 'pointer',
//                   fontSize: '0.85rem',
//                   fontWeight: '500',
//                   transition: 'background 0.3s'
//                 }}
//                 onMouseOver={(e) => e.currentTarget.style.background = '#d97706'}
//                 onMouseOut={(e) => e.currentTarget.style.background = '#f59e0b'}
//               >
//                 Exit Admin
//               </button>
//             </div>
//           )}
          
//           {user ? (
//             <div className="user-info">
//               <span>👤 {user.username}</span>
//               <button onClick={() => setShowSemModal(true)} style={{ marginLeft: '10px', background: 'transparent', border: '1px solid currentColor', borderRadius: '4px', cursor: 'pointer', color: 'inherit', padding: '2px 6px', fontSize: '0.8rem' }}>
//                   Sem {user.semester || '?'} ✎
//               </button>
//               <button className="btn-logout" onClick={() => { localStorage.clear(); window.location.reload(); }}>Logout</button>
//             </div>
//           ) : <Link to="/login" className="btn-login">Login</Link>}
//         </div>
//       </nav>

//       <main className="main-content">
//         <h1 className="visually-hidden">IIIT Surat Previous Year Question Papers Archive</h1>
        
//         {showAnalytics && <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />}
        
//         {isAdmin && (
//             <div className="admin-upload-section">
//                 <div className="admin-card">
//                     <h3>📤 Admin Upload Panel</h3>
//                     <form onSubmit={handleUpload} className="upload-form">
//                         <div className="form-row">
//                             <input type="text" placeholder="Subject" onChange={e => setFormData({...formData, subject: e.target.value})} required />
//                             <input type="text" placeholder="Title" onChange={e => setFormData({...formData, title: e.target.value})} required />
//                         </div>
//                         <div className="form-row">
//                             <input type="number" placeholder="Year" onChange={e => setFormData({...formData, year: e.target.value})} required />
//                             <select onChange={e => setFormData({...formData, semester: e.target.value})} required>
//                                 <option value="">Select Sem</option>
//                                 {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
//                             </select>
//                             <select onChange={e => setFormData({...formData, examType: e.target.value})}>
//                                 <option>Mid-Sem</option><option>End-Sem</option>
//                             </select>
//                         </div>
//                         <div className="file-inputs">
//                             <label className="file-label">📄 Paper: <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files[0])} /><b> {file ? file.name : ''} </b></label>
//                             <label className="file-label">💡 Solution: <input type="file" accept="application/pdf" onChange={e => setSolutionFile(e.target.files[0])} /><b> {solutionFile ? solutionFile.name : ''}</b></label>
//                         </div>
                        
//                         <button type="submit" className="btn-upload" disabled={isUploading}>
//                             {isUploading ? "⏳ Uploading to Cloudinary..." : "🚀 Upload Paper"}
//                         </button>
//                     </form>
//                 </div>
//             </div>
//         )}

//         <div className="controls-section">
//           <h2 className="section-heading">
//             {filterSem ? `Semester ${filterSem} Question Papers` : 'All Semester Papers'}
//           </h2>
          
//           <div className="controls-bar">
//               <div className="tabs">
//                   <button className={filter === 'all' ? 'tab active' : 'tab'} onClick={() => setFilter('all')}>
//                       📚 Papers
//                   </button>
//                   <button className={filter === 'saved' ? 'tab active' : 'tab'} onClick={() => setFilter('saved')}>
//                       ❤️ Saved
//                   </button>
//               </div>

//               <span className="navbar-paper-count">
//                   <h5>
//                       {searchTerm || filterSem !== '' ? 'Papers Found: ' : 'Total Papers: '} 
//                       {displayedPapers.length}
//                   </h5>
//               </span>

//               <div className="filters">
//                   <select className="sem-filter" value={filterSem} onChange={e => setFilterSem(e.target.value)}>
//                       <option value="">All Sems</option>
//                       {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
//                   </select>
//                   <input 
//                       className="search-input" 
//                       type="text" 
//                       placeholder="🔍 Search..." 
//                       onChange={e => setSearchTerm(e.target.value)} 
//                   />
//               </div>
//           </div>

//           {hardestSubject && (
//               <div className="difficulty-banner">
//                   <span className="fire-icon">🔥</span>
//                   <div><strong>Insight:</strong> <span className="highlight-subject">{hardestSubject.subject}</span> is currently the toughest!</div>
//               </div>
//           )}
//         </div>

//         <div className="papers-grid">
//             {loading ? (
//                 [...Array(6)].map((_, idx) => <PaperSkeleton key={idx} />) ) :

//                 displayedPapers.length === 0 && filterSem ? (
//                 <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: '#888'}}>
//                     <h3>No papers found for Semester {filterSem}</h3>
//                     <p>Try switching to "All Sems"</p>
//                 </div>
//             ) : (
//                 displayedPapers.map(p => (
//                     <div key={p._id} className="paper-card">
//                         <div className="card-stats-row">
//                             <div className="stat-item">👁️ {p.views || 0}</div>
//                             <div className="stat-item">⬇️ {p.downloads || 0}</div>
//                             <button className={`heart-icon ${user?.bookmarks.includes(p._id) ? 'liked' : ''}`} onClick={(e) => toggleBookmark(p._id, e)}>
//                                 {user?.bookmarks.includes(p._id) ? '❤️' : '🤍'}
//                             </button>
//                         </div>
//                         <div className="card-body">
//                             <span className={`badge ${p.examType === 'Mid-Sem' ? 'mid' : 'end'}`}>{p.examType}</span>
//                             <h3 className="subject-name">{p.subject}</h3>
//                             <p className="paper-title">{p.title}</p>
//                             <p className="paper-meta">Sem {p.semester} • {p.year}</p>
//                         </div>
//                         <div className="card-actions">
//                             <button className="btn-view-pdf" onClick={() => handleView(p)}>📄 View</button>
//                             <div className="action-icons">
//                                 {p.solutionPath && <button className="btn-icon solution-icon" onClick={(e) => handleSolution(e, p)} title="Solution">💡</button>}
//                                 <button className="btn-icon download-icon" onClick={(e) => handleDownload(e, p)} title="Download">⬇</button>
//                                 {isAdmin && (
//                                 <label className="btn-icon solution-icon update-btn" title="Update Solution">
//                                     {p.solutionPath ? '🔄' : '➕'}
//                                     <input 
//                                         type="file" 
//                                         hidden 
//                                         accept="application/pdf" 
//                                         onChange={(e) => handleAddSolutionToExisting(p._id, e.target.files[0])} 
//                                     />
//                                 </label>
//                             )}
//                             {isAdmin && <button className="btn-icon delete-icon" onClick={(e) => handleDelete(e, p._id)}>🗑️</button>}
//                             </div>
//                         </div>
//                     </div>
//                 ))
//             )}
//         </div>
//       </main>
//       <Footer />
      
//       {/* Cache Manager Component */}
//       <CacheManager papers={papers} user={user} />
      
//       {/* App Download Popup */}
//       {showAppDownload && (
//         <AppDownloadPopup 
//           theme={theme} 
//           onClose={() => setShowAppDownload(false)} 
//         />
//       )}
      
//       {selectedPaper && <PaperModal paper={selectedPaper} user={user} onClose={() => setSelectedPaper(null)} showAlert={showAlert} />}
//     </div>
//     </>
//   );
// }

// // --- MAIN APP COMPONENT ---
// export default function App() { 
//   const [user, setUser] = useState(null);
//   const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
//   const [alertInfo, setAlertInfo] = useState({ show: false, msg: '', type: 'success' });

//   const showAlert = useCallback((msg, type = 'success') => {
//     setAlertInfo({ show: true, msg, type });
//     setTimeout(() => {
//         setAlertInfo({ show: false, msg: '', type: '' });
//     }, 3000);
//   }, []);

//   const toggleTheme = () => { 
//     const newTheme = theme === 'light' ? 'dark' : 'light'; 
//     setTheme(newTheme); 
//     localStorage.setItem('theme', newTheme); 
//   };
  
//   useEffect(() => { 
//       document.body.className = theme; 
//       const token = localStorage.getItem('token'); 
//       const username = localStorage.getItem('username'); 
//       const savedSem = localStorage.getItem('userSemester'); 
      
//       if(token && username) {
//           setUser({ 
//               username, 
//               bookmarks: [], 
//               semester: savedSem ? Number(savedSem) : null 
//           }); 
//       }
//   }, [theme]);

//   return (
//     <HelmetProvider>
//     <Router>
//         <CustomAlert alert={alertInfo} />
        
//         {/* Add CSS for animations */}
//         <style>
//           {`
//             @keyframes fadeIn {
//               from { opacity: 0; transform: translateY(-10px); }
//               to { opacity: 1; transform: translateY(0); }
//             }
//             .animate-fadeIn {
//               animation: fadeIn 0.3s ease-out;
//             }
//           `}
//         </style>
        
//         <Routes>
//             <Route path="/" element={<Home user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} showAlert={showAlert} />} />
//             <Route path="/login" element={<Login setUser={setUser} showAlert={showAlert} />} />
//             <Route path="/register" element={<Register showAlert={showAlert} />} />
//             <Route path="/admin" element={<AdminLogin showAlert={showAlert} />} />
//             <Route path="*" element={
//               <div className="not-found-page" style={{textAlign: 'center', padding: '50px 20px'}}>
//                 <h1>404 - Page Not Found</h1>
//                 <p>The page you're looking for doesn't exist.</p>
//                 <Link to="/" style={{color: '#4f46e5', textDecoration: 'underline'}}>Return to Papers</Link>
//               </div>
//             } />
//         </Routes>
//     </Router>
//     </HelmetProvider>
//   );
// }






























// App.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import logo from './assets/Paperstack_logo_wt.png'; 
import './App.css';

// Backend URL (Render) - Your backend is on Render
const API_URL = 'https://paperstack.onrender.com';

// Frontend URL (Vercel) - Your frontend is on Vercel
const FRONTEND_URL = 'https://paper-stack-beryl.vercel.app';

// --- SERVICE WORKER REGISTRATION ---
function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('✅ Service Worker registered:', registration.scope);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('🔄 New service worker found!');
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('📦 New content available, please refresh!');
                // Trigger update notification
                if (window.showUpdateNotification) {
                  window.showUpdateNotification();
                }
              }
            });
          });
        })
        .catch(error => {
          console.error('❌ Service Worker registration failed:', error);
        });
    });
  }
}

// --- PWA INSTALL PROMPT ---
function PWAInstallPrompt({ theme, onClose }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        window.navigator.standalone || 
                        document.referrer.includes('android-app://');
    
    if (isStandalone) {
      console.log('📱 App is already installed');
      return;
    }

    // Check if user has already dismissed
    const hasDismissed = localStorage.getItem('pwaPromptDismissed');
    if (hasDismissed) return;

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show after 3 seconds
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User ${outcome} the install prompt`);
    
    if (dontShowAgain) {
      localStorage.setItem('pwaPromptDismissed', 'true');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
    if (onClose) onClose();
  };

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('pwaPromptDismissed', 'true');
    }
    setShowPrompt(false);
    if (onClose) onClose();
  };

  if (!showPrompt) return null;

  return (
    <div className="pwa-install-overlay">
      <div className={`pwa-install-modal ${theme}`}>
        <div className="pwa-install-header">
          <h3>📱 Install PaperStack App</h3>
          <button onClick={handleClose} className="pwa-install-close">×</button>
        </div>
        
        <div className="pwa-install-content">
          <div className="pwa-features">
            <div className="pwa-feature">
              <span className="feature-icon">⚡</span>
              <div>
                <strong>Faster Access</strong>
                <p>Launch directly from home screen</p>
              </div>
            </div>
            <div className="pwa-feature">
              <span className="feature-icon">📥</span>
              <div>
                <strong>Offline Mode</strong>
                <p>Access papers without internet</p>
              </div>
            </div>
            <div className="pwa-feature">
              <span className="feature-icon">📱</span>
              <div>
                <strong>App Experience</strong>
                <p>Native app-like interface</p>
              </div>
            </div>
            <div className="pwa-feature">
              <span className="feature-icon">🔔</span>
              <div>
                <strong>Push Notifications</strong>
                <p>Get updates on new papers</p>
              </div>
            </div>
          </div>
          
          <div className="pwa-install-buttons">
            <button 
              onClick={handleInstall}
              className="pwa-install-btn"
            >
              <span>📲</span>
              Install App
            </button>
            <button 
              onClick={handleClose}
              className="pwa-later-btn"
            >
              Maybe Later
            </button>
          </div>
          
          <div className="pwa-install-footer">
            <label className="pwa-dont-show">
              <input 
                type="checkbox" 
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
              />
              <span>Don't show this again</span>
            </label>
            <p className="pwa-note">Add to home screen for best experience</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- CACHE MANAGER COMPONENT ---
function CacheManager({ papers, user, theme }) {
  const [cacheStatus, setCacheStatus] = useState({
    total: 0,
    cached: 0,
    size: '0 MB'
  });
  const [isCaching, setIsCaching] = useState(false);
  const [showCacheManager, setShowCacheManager] = useState(false);

  const updateCacheStatus = useCallback(async () => {
    if (!papers.length || !('caches' in window)) return;
    
    try {
      const cache = await caches.open('paperstack-papers-v1');
      const cachedUrls = await cache.keys();
      
      const relevantPapers = user?.semester 
        ? papers.filter(p => p.semester === user.semester)
        : papers.slice(0, 50);
      
      const paperUrls = relevantPapers.map(p => p.filePath);
      const solutionUrls = relevantPapers.map(p => p.solutionPath).filter(Boolean);
      const allUrls = [...paperUrls, ...solutionUrls];
      
      let cachedCount = 0;
      for (const url of allUrls) {
        const response = await cache.match(url);
        if (response) cachedCount++;
      }
      
      let totalSize = 0;
      for (const request of cachedUrls) {
        try {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        } catch (err) {
          console.log('Error calculating cache size:', err);
        }
      }
      
      setCacheStatus({
        total: allUrls.length,
        cached: cachedCount,
        size: `${(totalSize / (1024 * 1024)).toFixed(2)} MB`
      });
    } catch (error) {
      console.log('Cache status error:', error);
    }
  }, [papers, user]);

  useEffect(() => {
    if ('caches' in window && papers.length) {
      updateCacheStatus();
      
      // Update cache status periodically
      const interval = setInterval(updateCacheStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [papers, user, updateCacheStatus]);

  const prefetchPapers = useCallback(async () => {
    if (!papers.length || isCaching || !('caches' in window)) return;
    
    setIsCaching(true);
    
    try {
      const cache = await caches.open('paperstack-papers-v1');
      const relevantPapers = user?.semester 
        ? papers.filter(p => p.semester === user.semester)
        : papers.slice(0, 20);
      
      let cachedCount = 0;
      
      for (const paper of relevantPapers) {
        try {
          // Check if already cached
          const existing = await cache.match(paper.filePath);
          if (!existing) {
            await cache.add(paper.filePath);
            cachedCount++;
          }
          
          if (paper.solutionPath) {
            const existingSolution = await cache.match(paper.solutionPath);
            if (!existingSolution) {
              await cache.add(paper.solutionPath);
              cachedCount++;
            }
          }
        } catch (err) {
          console.log(`Failed to cache ${paper.subject}:`, err);
        }
      }
      
      await updateCacheStatus();
    } catch (error) {
      console.log('Cache prefetch error:', error);
    } finally {
      setIsCaching(false);
    }
  }, [papers, user, updateCacheStatus]);

  const clearCache = useCallback(async () => {
    if (!('caches' in window)) return;
    
    try {
      await caches.delete('paperstack-papers-v1');
      await caches.delete('paperstack-static-v2');
      await caches.delete('paperstack-v2');
      await updateCacheStatus();
    } catch (error) {
      console.log('Clear cache error:', error);
    }
  }, [updateCacheStatus]);

  if (!('caches' in window)) return null;

  return (
    <>
      {/* Floating Cache Button */}
      <button
        onClick={() => setShowCacheManager(!showCacheManager)}
        className="cache-manager-btn"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          width: '60px',
          height: '60px',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          fontSize: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s'
        }}
        title="Cache Manager"
      >
        💾
      </button>

      {/* Cache Manager Panel */}
      {showCacheManager && (
        <div className={`cache-manager-panel ${theme}`} style={{
          position: 'fixed',
          bottom: '90px',
          right: '20px',
          zIndex: 1000,
          background: theme === 'dark' ? '#1f2937' : 'white',
          color: theme === 'dark' ? 'white' : '#374151',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          width: '320px',
          padding: '20px',
          border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ margin: 0 }}>📦 Paper Cache</h4>
            <button 
              onClick={() => setShowCacheManager(false)}
              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
            >
              ×
            </button>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>Progress</span>
              <span style={{ fontWeight: '500' }}>
                {cacheStatus.cached}/{cacheStatus.total} papers
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: theme === 'dark' ? '#374151' : '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
                  width: `${(cacheStatus.cached / cacheStatus.total) * 100 || 0}%`,
                  transition: 'width 0.5s ease-in-out'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
              <span>{cacheStatus.size}</span>
              <span>{((cacheStatus.cached / cacheStatus.total) * 100 || 0).toFixed(1)}% cached</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button
              onClick={prefetchPapers}
              disabled={isCaching || cacheStatus.cached === cacheStatus.total}
              style={{
                flex: 1,
                padding: '10px',
                background: isCaching 
                  ? '#d1d5db' 
                  : cacheStatus.cached === cacheStatus.total
                  ? '#10b981'
                  : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isCaching || cacheStatus.cached === cacheStatus.total ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                transition: 'all 0.3s',
                opacity: isCaching || cacheStatus.cached === cacheStatus.total ? 0.8 : 1
              }}
            >
              {isCaching ? '⏳ Caching...' : 
               cacheStatus.cached === cacheStatus.total ? '✅ All Cached' : 
               '⚡ Prefetch Papers'}
            </button>
            
            <button
              onClick={clearCache}
              style={{
                padding: '10px 15px',
                background: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'background 0.3s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#fecaca'}
              onMouseOut={(e) => e.currentTarget.style.background = '#fee2e2'}
            >
              Clear
            </button>
          </div>
          
          <div style={{ fontSize: '12px', color: theme === 'dark' ? '#9ca3af' : '#6b7280', lineHeight: '1.5' }}>
            <p style={{ margin: 0 }}>
              <strong>💡 Tips:</strong> Caching papers allows offline access and faster loading times.
              {user?.semester && ` We're focusing on your Semester ${user.semester} papers.`}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// --- OFFLINE BANNER COMPONENT ---
function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [show, setShow] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShow(false);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShow(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: isOnline ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      color: 'white',
      padding: '12px 20px',
      zIndex: 10000,
      textAlign: 'center',
      animation: 'slideDown 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        <span style={{ fontSize: '20px' }}>{isOnline ? '✅' : '📶'}</span>
        <div>
          <strong>{isOnline ? 'You\'re back online!' : 'You\'re offline'}</strong>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
            {isOnline ? 'Connection restored.' : 'Cached papers are available. Some features may be limited.'}
          </p>
        </div>
        {!isOnline && (
          <button
            onClick={() => window.location.reload()}
            style={{
              marginLeft: '15px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'background 0.3s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            Retry
          </button>
        )}
      </div>
      <style jsx="true">{`
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// --- MOBILE BOTTOM NAVIGATION ---
function MobileBottomNav({ user, isAdmin, currentFilter, onFilterChange, onStatsClick, onHomeClick, onAdminClick, onProfileClick }) {
  const [activeTab, setActiveTab] = useState('home');

  const isMobile = window.innerWidth <= 768;
  
  useEffect(() => {
    setActiveTab(currentFilter === 'saved' ? 'saved' : 'home');
  }, [currentFilter]);

  if (!isMobile) return null;

  const handleClick = (tab, callback) => {
    setActiveTab(tab);
    if (callback) callback();
  };

  return (
    <nav className="mobile-bottom-nav">
      <button 
        className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => handleClick('home', onHomeClick)}
      >
        <span className="nav-icon">📚</span>
        <span className="nav-label">Papers</span>
      </button>
      
      <button 
        className={`nav-item ${activeTab === 'saved' ? 'active' : ''}`}
        onClick={() => handleClick('saved', () => onFilterChange('saved'))}
      >
        <span className="nav-icon">❤️</span>
        <span className="nav-label">Saved</span>
      </button>
      
      <button 
        className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`}
        onClick={() => handleClick('stats', onStatsClick)}
      >
        <span className="nav-icon">📊</span>
        <span className="nav-label">Stats</span>
      </button>
      
      {isAdmin && (
        <button 
          className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
          onClick={() => handleClick('admin', onAdminClick)}
        >
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">Admin</span>
        </button>
      )}
      
      <button 
        className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => handleClick('profile', onProfileClick)}
      >
        <span className="nav-icon">{user ? '👤' : '🔓'}</span>
        <span className="nav-label">{user ? 'Profile' : 'Login'}</span>
      </button>
    </nav>
  );
}

// --- MOBILE PAPER CARD (Touch Enhanced) ---
function MobilePaperCard({ paper, user, isAdmin, onView, onDownload, onSolution, onBookmark, onDelete, onAddSolution }) {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [showActions, setShowActions] = useState(false);

  // Minimum swipe distance
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      setShowActions(!showActions);
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div 
      className="mobile-paper-card"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="paper-card-main" onClick={() => !showActions && onView(paper)}>
        <div className="paper-header">
          <span className={`badge ${paper.examType === 'Mid-Sem' ? 'mid' : 'end'}`}>
            {paper.examType}
          </span>
          <button 
            className={`heart-icon ${user?.bookmarks?.includes(paper._id) ? 'liked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onBookmark(paper._id, e);
            }}
          >
            {user?.bookmarks?.includes(paper._id) ? '❤️' : '🤍'}
          </button>
        </div>
        
        <div className="paper-content">
          <h4>{paper.subject}</h4>
          <p className="paper-meta">Sem {paper.semester} • {paper.year}</p>
          <p className="paper-title">{paper.title}</p>
        </div>
        
        <div className="paper-stats">
          <span className="stat">👁️ {paper.views || 0}</span>
          <span className="stat">⬇️ {paper.downloads || 0}</span>
          {paper.solutionPath && <span className="stat solution-available">💡</span>}
        </div>
        
        <div className="paper-hint">
          <span>← Swipe for actions →</span>
        </div>
      </div>
      
      {showActions && (
        <div className="paper-swipe-actions">
          <button 
            className="swipe-action view-action"
            onClick={() => onView(paper)}
          >
            👁️ View
          </button>
          <button 
            className="swipe-action download-action"
            onClick={(e) => onDownload(e, paper)}
          >
            ⬇️ Download
          </button>
          {paper.solutionPath && (
            <button 
              className="swipe-action solution-action"
              onClick={(e) => onSolution(e, paper)}
            >
              💡 Solution
            </button>
          )}
          {isAdmin && (
            <>
              <label className="swipe-action update-action">
                {paper.solutionPath ? '🔄' : '➕'}
                <input 
                  type="file" 
                  hidden 
                  accept="application/pdf" 
                  onChange={(e) => onAddSolution(paper._id, e.target.files[0])} 
                />
              </label>
              <button 
                className="swipe-action delete-action"
                onClick={(e) => onDelete(e, paper._id)}
              >
                🗑️
              </button>
            </>
          )}
        </div>
      )}
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

// --- FOOTER COMPONENT ---
function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand Section with Logo */}
          <div className="footer-brand">
            <div className="footer-logo-wrapper">
              <img src={logo} alt="PaperStack Logo - IIIT Surat Previous Year Papers Archive" className="footer-logo-img" />
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
              <li><a href="https://github.com" target="_blank" rel="noreferrer noopener">GitHub</a></li>
              <li><a href="https://linkedin.com" target="_blank" rel="noreferrer noopener">LinkedIn</a></li>
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
        console.log("Registration error:", err);
    }
  };

  return ( 
    <div className="auth-page-wrapper">
        <Helmet>
          <title>Register - PaperStack | IIIT Surat Student Portal</title>
          <meta name="description" content="Create your student account on PaperStack to access IIIT Surat previous year question papers, solutions, and study materials." />
          <meta name="keywords" content="IIIT Surat registration, student account, IIIT Surat papers access, engineering student portal" />
          <link rel="canonical" href={`${FRONTEND_URL}/register`} />
        </Helmet>
        
        <div className="auth-card login-card-animated">
            <div className="login-logo-container">
                <img src={paperStackLogo} alt="PaperStack Logo - IIIT Surat Papers Archive" className="login-logo-img pulse-entry" />
            </div>

            <div className="login-intro">
                <h2 className="slide-up-text">
                   <span className="paperstack-brand-text">IIIT Surat Archive</span>
                </h2>
                <p className="fade-in-text">Create your IIIT Surat student profile</p>
            </div>

            <div className="auth-note-box pulse-entry">
                <span className="note-icon">⚠️</span>
                <p><strong>Important:</strong> You can't reset your password, so choose it carefully.</p>
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

  const paperStackLogo = "/logo.png"; 
  const iiitSuratLogo = "/iiit_surat.png";

  const handleLogin = async (e) => {
    e.preventDefault();

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
      <Helmet>
        <title>Login - PaperStack | IIIT Surat Student Access</title>
        <meta name="description" content="Login to your PaperStack account to access IIIT Surat previous year question papers, solutions, and exam resources." />
        <meta name="keywords" content="IIIT Surat login, student portal, access papers, engineering exam papers login" />
        <link rel="canonical" href={`${FRONTEND_URL}/login`} />
      </Helmet>
      
      <div className="auth-card login-card-animated">
          <div className="login-logo-container">
              <img src={paperStackLogo} alt="PaperStack Logo - IIIT Surat Papers" className="login-logo-img pulse-entry" />
              <div className="logo-vertical-line"></div>
              <img src={iiitSuratLogo} alt="IIIT Surat Logo" className="login-logo-img pulse-entry-delay" />
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
  
  return ( 
    <div className="auth-container">
      <Helmet>
        <title>Admin Login - PaperStack | IIIT Surat Management</title>
        <meta name="description" content="Admin access portal for PaperStack - IIIT Surat's previous year papers archive management system." />
        <link rel="canonical" href={`${FRONTEND_URL}/admin`} />
      </Helmet>
      <div className="auth-card">
        <h2>🔐 Admin Access</h2>
        <form onSubmit={handleAdminLogin}>
          <input type="password" placeholder="Admin Password" onChange={e=>setPassword(e.target.value)} />
          <button className="auth-btn">Unlock</button>
        </form>
      </div>
    </div> 
  );
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
            <div className="modal-content" style={{ maxWidth: '310px', maxHeight: '250px', width: '90%', padding: '25px', textAlign: 'center', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
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
    useEffect(() => { 
        axios.get(`${API_URL}/api/analytics`)
            .then(res => setData(res.data))
            .catch(err => console.error("Analytics error:", err)); 
    }, []);

    return (
        <div className="analytics-panel">
            <div className="panel-header">
                <h3>📊 Exam Difficulty Analytics</h3>
                <button onClick={onClose} className="close-btn">✖</button>
            </div>
            <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data}>
                        <XAxis dataKey="_id" stroke="#8884d8" />
                        <YAxis />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ color: '#333' }} />
                        <Bar dataKey="totalViews" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#4f46e5'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
                <p className="insight-text">
                    💡 <strong>Insight:</strong> "{data[0]?._id || 'No data'}" seems to be the toughest subject!
                </p>
            </div>
        </div>
    );
}

// --- PAPER DETAILS MODAL with Caching ---
function PaperModal({ paper, user, onClose, showAlert }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [iframeLoading, setIframeLoading] = useState(true);
    const [cached, setCached] = useState(false);

    const fetchComments = useCallback(async () => { 
        try {
            const res = await axios.get(`${API_URL}/api/papers/${paper._id}/comments`); 
            setComments(res.data); 
        } catch (err) {
            console.error("Error fetching comments", err);
        }
    }, [paper._id]);

    const checkIfCached = useCallback(async () => {
      try {
        if ('caches' in window) {
          const cache = await caches.open('paperstack-papers-v1');
          const response = await cache.match(paper.filePath);
          setCached(!!response);
        }
      } catch (error) {
        console.log('Cache check error:', error);
      }
    }, [paper.filePath]);

    const cachePaper = useCallback(async () => {
      try {
        if ('caches' in window) {
          const cache = await caches.open('paperstack-papers-v1');
          await cache.add(paper.filePath);
          setCached(true);
          showAlert(`✅ Paper cached for offline viewing!`, 'success');
          
          if (paper.solutionPath) {
            await cache.add(paper.solutionPath);
          }
        } else {
          showAlert("❌ Caching not supported in this browser", "error");
        }
      } catch (error) {
        console.log('Cache error:', error);
        showAlert("❌ Failed to cache paper", "error");
      }
    }, [paper.filePath, paper.solutionPath, showAlert]);

    useEffect(() => { 
        fetchComments(); 
        setIframeLoading(true);
        checkIfCached();
    }, [paper._id, fetchComments, checkIfCached]);

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
                    <div className="modal-left">
                        <div className="modal-header-info">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <div>
                                    <h3>📄 {paper.subject}</h3>
                                    <span className="badge-pill">{paper.examType} • {paper.year}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {('caches' in window) && (
                                        <button
                                            onClick={cachePaper}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '20px',
                                                fontSize: '0.85rem',
                                                fontWeight: '500',
                                                transition: 'all 0.3s',
                                                border: 'none',
                                                cursor: 'pointer',
                                                ...(cached 
                                                    ? { backgroundColor: '#d1fae5', color: '#065f46' }
                                                    : { backgroundColor: '#dbeafe', color: '#1e40af' })
                                            }}
                                            title={cached ? "Paper is cached for offline viewing" : "Cache paper for offline viewing"}
                                        >
                                            {cached ? '✅ Cached' : '💾 Cache'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pdf-container">
                            {iframeLoading && (
                                <div className="pdf-skeleton">
                                    <div className="skeleton-shimmer"></div>
                                    <p>Loading document...</p>
                                </div>
                            )}
                            
                            <iframe 
                                src={`${paper.filePath}#toolbar=0`}
                                title={`${paper.subject} ${paper.examType} Paper - Semester ${paper.semester}, ${paper.year}`}
                                className="pdf-frame"
                                onLoad={() => setIframeLoading(false)}
                                style={{ opacity: iframeLoading ? 0 : 1 }}
                            ></iframe>
                        </div>

                        <div className="modal-actions">
                            <a href={paper.filePath} target="_blank" rel="noopener noreferrer" className="btn-download">
                                ⬇️ Download Paper
                            </a>
                            {paper.solutionPath && (
                                <a href={paper.solutionPath} target="_blank" rel="noopener noreferrer" className="btn-solution">
                                    💡 View Solution
                                </a>
                            )}
                        </div>
                    </div>

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
  const [loading, setLoading] = useState(true);
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
  const [showPWAInstall, setShowPWAInstall] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const handleSolution = (e, paper) => {
      e.stopPropagation();
      if(paper.solutionPath) {
          window.open(paper.solutionPath, '_blank');
      } else {
          showAlert("No solution available", "info");
      }
  };

  const fetchPapers = useCallback(async () => { 
    setLoading(true);
    try {
        const res = await axios.get(`${API_URL}/api/papers`); 
        
        if (!res.data || !Array.isArray(res.data)) {
            console.error("Invalid data format:", res.data);
            showAlert("Received invalid data from server", "error");
            setPapers([]);
            return; 
        }

        const sorted = res.data.sort((a, b) => {
            const yearA = a.year || 0;
            const yearB = b.year || 0;
            const semA = a.semester || 0;
            const semB = b.semester || 0;

            if (yearB !== yearA) return yearB - yearA;
            if (semB !== semA) return semB - semA;

            const typeOrder = { 'Mid-Sem': 1, 'End-Sem': 2 };
            const typeA = typeOrder[a.examType] || 3;
            const typeB = typeOrder[b.examType] || 3;
            
            return typeA - typeB;
        });

        setPapers(sorted); 
    } catch (err) { 
        console.error("❌ Fetch Error:", err); 
        showAlert("Failed to load papers. Please check your connection.", "error");
    } finally {
        setTimeout(() => setLoading(false), 500); 
    }
  }, [showAlert]);

  useEffect(() => { 
      fetchPapers(); 
      if(localStorage.getItem('adminPass')) setIsAdmin(true);
      if (user && !user.semester) { setShowSemModal(true); }
      if (user && user.semester) { setFilterSem(user.semester.toString()); }
      
      // Check screen size
      const handleResize = () => {
        setIsMobile(window.innerWidth <= 768);
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, [user, fetchPapers]);

  const exitAdminMode = () => {
    localStorage.removeItem('adminPass');
    setIsAdmin(false);
    showAlert("Exited admin mode", "success");
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { showAlert("Please select a paper PDF", "error"); return; }
    
    setIsUploading(true);

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
        fetchPapers();
    } catch (err) { 
        showAlert("Upload Failed. Check credentials/connection.", "error"); 
        console.error(err); 
    } finally {
        setIsUploading(false);
    }
  };

  const handleAddSolutionToExisting = async (paperId, selectedFile) => {
    if (!selectedFile) return;
    setIsUploading(true);
    const data = new FormData();
    data.append('solution', selectedFile);

    try {
      const adminPass = localStorage.getItem('adminPass');
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
      relevantPapers.forEach(p => { 
          const score = (p.views || 0) + (p.downloads || 0); 
          scores[p.subject] = (scores[p.subject] || 0) + score; 
      });
      const hardest = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
      return { subject: hardest, score: scores[hardest] };
  };

  const hardestSubject = getHardestSubject();

  const handleView = async (paper) => {
      setSelectedPaper(paper);
      try {
          await axios.post(`${API_URL}/api/papers/${paper._id}/view`);
      } catch (err) {
          console.error("Failed to increment view count:", err);
      }
      setPapers(prev => prev.map(p => p._id === paper._id ? { ...p, views: (p.views || 0) + 1 } : p));
  };

  const handleDownload = async (e, paper) => {
      e.stopPropagation();
      window.open(paper.filePath, '_blank'); 
      try {
          await axios.post(`${API_URL}/api/papers/${paper._id}/download`);
      } catch (err) {
          console.error("Failed to increment download count:", err);
      }
      setPapers(prev => prev.map(p => p._id === paper._id ? { ...p, downloads: (p.downloads || 0) + 1 } : p));
  };

  const toggleBookmark = async (paperId, e) => {
      e.stopPropagation();
      if (!user) { showAlert("Please Login to Bookmark!", "info"); return; }
      try {
          const res = await axios.put(`${API_URL}/api/user/bookmark/${paperId}`, {}, { 
              headers: { Authorization: localStorage.getItem('token') } 
          });
          setUser({ ...user, bookmarks: res.data });
      } catch (err) {
          showAlert("Failed to bookmark", "error");
      }
  };
  
  const displayedPapers = papers.filter(p => {
      const matchesSearch = p.subject.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = filter === 'saved' ? user?.bookmarks?.includes(p._id) : true;
      const matchesSem = filterSem ? p.semester.toString() === filterSem : true;
      return matchesSearch && matchesTab && matchesSem;
  });

  // SEO Structured Data
  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "PaperStack - IIIT Surat Archive",
    "url": `${FRONTEND_URL}/`,
    "logo": `${FRONTEND_URL}/logo.png`,
    "description": "Digital archive of previous year question papers for IIIT Surat students",
    "founder": "Yogesh Khinchi",
    "keywords": "IIIT Surat papers, question papers, exam papers, engineering papers , iiit surat, iiit surat papers , surat college papers ",
    "educationalLevel": "Undergraduate",
    "educationalProgram": "Bachelor of Technology (B.Tech)"
  };

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${FRONTEND_URL}/`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": filterSem ? `Semester ${filterSem} Papers` : "All Papers",
        "item": `${FRONTEND_URL}/${filterSem ? `?sem=${filterSem}` : ''}`
      }
    ]
  };

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is PaperStack?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "PaperStack is the official archive of IIIT Surat previous year question papers, providing free access to exam papers for all semesters and subjects."
        }
      },
      {
        "@type": "Question",
        "name": "Are the papers free to download?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, all question papers on PaperStack are completely free to view and download for IIIT Surat students."
        }
      },
      {
        "@type": "Question",
        "name": "Which semesters are covered?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We provide papers for all 8 semesters of B.Tech program including both Mid-Semester and End-Semester exams."
        }
      }
    ]
  };

  return (
    <> 
    <Helmet>
      <title>
        {filterSem ? `Sem ${filterSem} Papers - IIIT Surat Previous Year Question Papers` : 'IIIT Surat Previous Year Papers - PaperStack Archive'}
      </title>
      <meta 
        name="description" 
        content="Access 1000+ IIIT Surat previous year question papers, solutions, and study materials for all semesters (1-8). Download free exam papers for Mid-Sem and End-Sem exams." 
      />
      <meta 
        name="keywords" 
        content="IIIT Surat previous year papers, IIIT Surat question papers, semester exam papers, engineering question papers, mid sem papers, end sem papers, computer science papers, BTech papers"
      />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <link rel="canonical" href={`${FRONTEND_URL}/`} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content="PaperStack - IIIT Surat Previous Year Papers Archive" />
      <meta property="og:description" content="Free access to IIIT Surat previous year question papers, solutions, and study resources for all engineering branches and semesters." />
      <meta property="og:image" content={`${FRONTEND_URL}/logo.png`} />
      <meta property="og:url" content={`${FRONTEND_URL}/`} />
      <meta property="og:site_name" content="PaperStack" />
      <meta property="og:locale" content="en_IN" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="IIIT Surat Previous Year Papers - PaperStack" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="PaperStack | IIIT Surat Question Papers" />
      <meta name="twitter:description" content="Download free IIIT Surat previous year papers for all semesters." />
      <meta name="twitter:image" content={`${FRONTEND_URL}/logo.png`} />
      
      {/* Additional Meta Tags */}
      <meta name="author" content="Yogesh Khinchi, IIIT Surat" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#4f46e5" />
      <meta name="language" content="English" />
      
      {/* Structured Data for SEO */}
      <script type="application/ld+json">
        {JSON.stringify(websiteStructuredData)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbStructuredData)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(faqStructuredData)}
      </script>
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

      {/* PWA Install Prompt */}
      {showPWAInstall && (
        <PWAInstallPrompt 
          theme={theme}
          onClose={() => setShowPWAInstall(false)}
        />
      )}

      <nav className="navbar">
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={logo} alt="PaperStack Logo - IIIT Surat Previous Year Papers Archive" style={{ height: '45px', borderRadius: '8px', objectFit: 'contain' }} /> 
          <span>PaperStack</span>
        </div>
        <div className="nav-links">
          <button className="theme-btn" onClick={toggleTheme}>{theme === 'light' ? '🌙' : '☀️'}</button>
          
          {/* Mobile PWA Install Button */}
          {isMobile && (
            <button 
              onClick={() => setShowPWAInstall(true)}
              className="pwa-install-nav-btn"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>📱</span>
              Install
            </button>
          )}
          
          <button className="stats-btn" onClick={() => setShowAnalytics(!showAnalytics)}>📊 Stats</button>
          
          {!isAdmin && <Link to="/admin" className="btn-admin-login">Admin</Link>}
          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="admin-badge">ADMIN MODE</span>
              <button 
                onClick={exitAdminMode}
                className="btn-exit-admin"
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  transition: 'background 0.3s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#d97706'}
                onMouseOut={(e) => e.currentTarget.style.background = '#f59e0b'}
              >
                Exit Admin
              </button>
            </div>
          )}
          
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
        <h1 className="visually-hidden">IIIT Surat Previous Year Question Papers Archive</h1>
        
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
                        
                        <button type="submit" className="btn-upload" disabled={isUploading}>
                            {isUploading ? "⏳ Uploading to Cloudinary..." : "🚀 Upload Paper"}
                        </button>
                    </form>
                </div>
            </div>
        )}

        <div className="controls-section">
          <h2 className="section-heading">
            {filterSem ? `Semester ${filterSem} Question Papers` : 'All Semester Papers'}
          </h2>
          
          {/* Mobile Search Bar */}
          {isMobile && (
            <div className="mobile-search-container">
              <button 
                className="mobile-search-toggle"
                onClick={() => setShowMobileSearch(!showMobileSearch)}
              >
                <span className="search-icon">🔍</span>
                <span className="search-placeholder">
                  {searchTerm || "Search papers..."}
                </span>
              </button>
              
              {showMobileSearch && (
                <div className="mobile-search-active">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search papers..."
                    autoFocus
                    className="mobile-search-input"
                  />
                  <div className="mobile-search-actions">
                    <select 
                      value={filterSem}
                      onChange={(e) => setFilterSem(e.target.value)}
                      className="mobile-sem-filter"
                    >
                      <option value="">All Sem</option>
                      {[1,2,3,4,5,6,7,8].map(s => (
                        <option key={s} value={s}>Sem {s}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => setShowMobileSearch(false)}
                      className="mobile-search-close"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Desktop Controls */}
          {!isMobile && (
            <div className="controls-bar">
                <div className="tabs">
                    <button className={filter === 'all' ? 'tab active' : 'tab'} onClick={() => setFilter('all')}>
                        📚 Papers
                    </button>
                    <button className={filter === 'saved' ? 'tab active' : 'tab'} onClick={() => setFilter('saved')}>
                        ❤️ Saved
                    </button>
                </div>

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
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)} 
                    />
                </div>
            </div>
          )}

          {hardestSubject && (
              <div className="difficulty-banner">
                  <span className="fire-icon">🔥</span>
                  <div><strong>Insight:</strong> <span className="highlight-subject">{hardestSubject.subject}</span> is currently the toughest!</div>
              </div>
          )}
        </div>

        <div className={`papers-grid ${isMobile ? 'mobile-view' : ''}`}>
            {loading ? (
                [...Array(6)].map((_, idx) => <PaperSkeleton key={idx} />) ) :

                displayedPapers.length === 0 && filterSem ? (
                <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: '#888'}}>
                    <h3>No papers found for Semester {filterSem}</h3>
                    <p>Try switching to "All Sems"</p>
                </div>
            ) : (
                displayedPapers.map(p => (
                  isMobile ? (
                    <MobilePaperCard
                      key={p._id}
                      paper={p}
                      user={user}
                      isAdmin={isAdmin}
                      onView={() => handleView(p)}
                      onDownload={(e) => handleDownload(e, p)}
                      onSolution={(e) => handleSolution(e, p)}
                      onBookmark={toggleBookmark}
                      onDelete={handleDelete}
                      onAddSolution={handleAddSolutionToExisting}
                    />
                  ) : (
                    <div key={p._id} className="paper-card">
                        <div className="card-stats-row">
                            <div className="stat-item">👁️ {p.views || 0}</div>
                            <div className="stat-item">⬇️ {p.downloads || 0}</div>
                            <button className={`heart-icon ${user?.bookmarks?.includes(p._id) ? 'liked' : ''}`} onClick={(e) => toggleBookmark(p._id, e)}>
                                {user?.bookmarks?.includes(p._id) ? '❤️' : '🤍'}
                            </button>
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
                  )
                ))
            )}
        </div>
      </main>
      <Footer />
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        user={user}
        isAdmin={isAdmin}
        currentFilter={filter}
        onFilterChange={setFilter}
        onStatsClick={() => setShowAnalytics(true)}
        onHomeClick={() => {
          setFilter('all');
          setFilterSem('');
          setSearchTerm('');
        }}
        onAdminClick={() => window.location.href = '/admin'}
        onProfileClick={() => {
          if (user) {
            setShowSemModal(true);
          } else {
            window.location.href = '/login';
          }
        }}
      />
      
      {/* Cache Manager */}
      <CacheManager papers={papers} user={user} theme={theme} />
      
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

  const showAlert = useCallback((msg, type = 'success') => {
    setAlertInfo({ show: true, msg, type });
    setTimeout(() => {
        setAlertInfo({ show: false, msg: '', type: '' });
    }, 3000);
  }, []);

  const toggleTheme = () => { 
    const newTheme = theme === 'light' ? 'dark' : 'light'; 
    setTheme(newTheme); 
    localStorage.setItem('theme', newTheme); 
  };
  
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
      
      // Register service worker
      registerServiceWorker();
      
      // Check if PWA is already installed
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          window.navigator.standalone || 
                          document.referrer.includes('android-app://');
      
      if (!isStandalone) {
        // Show PWA install prompt after 5 seconds
        setTimeout(() => {
          const hasDismissed = localStorage.getItem('pwaPromptDismissed');
          if (!hasDismissed) {
            window.dispatchEvent(new Event('showPWAInstall'));
          }
        }, 5000);
      }
  }, [theme]);

  // Listen for custom event to show PWA install
  useEffect(() => {
    const handleShowPWAInstall = () => {
      const event = new Event('beforeinstallprompt');
      window.dispatchEvent(event);
    };
    
    window.addEventListener('showPWAInstall', handleShowPWAInstall);
    
    return () => {
      window.removeEventListener('showPWAInstall', handleShowPWAInstall);
    };
  }, []);

  return (
    <HelmetProvider>
    <Router>
        {/* Offline Banner */}
        <OfflineBanner />
        
        <CustomAlert alert={alertInfo} />
        
        {/* Global Styles for Animations */}
        <style jsx="true">{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out;
          }
          
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          .animate-slideUp {
            animation: slideUp 0.3s ease-out;
          }
        `}</style>
        
        <Routes>
            <Route path="/" element={<Home user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} showAlert={showAlert} />} />
            <Route path="/login" element={<Login setUser={setUser} showAlert={showAlert} />} />
            <Route path="/register" element={<Register showAlert={showAlert} />} />
            <Route path="/admin" element={<AdminLogin showAlert={showAlert} />} />
            <Route path="*" element={
              <div className="not-found-page" style={{textAlign: 'center', padding: '50px 20px'}}>
                <h1>404 - Page Not Found</h1>
                <p>The page you're looking for doesn't exist.</p>
                <Link to="/" style={{color: '#4f46e5', textDecoration: 'underline'}}>Return to Papers</Link>
              </div>
            } />
        </Routes>
    </Router>
    </HelmetProvider>
  );
}