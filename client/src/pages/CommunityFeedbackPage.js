import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageSquareWarning, Star, Quote, MessageCircle } from 'lucide-react';
import PaperStackLoader from '../components/PaperStackLoader';
import { API_URL } from '../config/appConfig';
import { authHeader, adminHeader } from '../services/authHeaders';
import { OFFICIAL_BRANCHES } from '../config/branches';
import './CommunityFeedbackPage.css';

const categories = ['Broken page', 'Incorrect paper', 'Missing file', 'Wrong metadata', 'Feature not working', 'UI problem', 'Login issue', 'AI answer problem', 'Inappropriate resource', 'Duplicate content', 'Other'];

export function TestimonialsPage({ user, isAdmin }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ message: '', branch: '', semester: '', rating: 0 });
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const loadReviews = useCallback(async (nextPage = 1) => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await axios.get(`${API_URL}/api/testimonials?page=${nextPage}`);
      const reviews = Array.isArray(data) ? data : data.items;
      if (!Array.isArray(reviews)) throw new Error('Invalid reviews response');
      setItems((current) => nextPage === 1 ? reviews : [...new Map([...current, ...reviews].map((item) => [item._id, item])).values()]);
      setPage(nextPage);
      setHasMore(data.hasMore);
    } catch {
      setLoadError('Reviews could not be loaded. Please try again.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadReviews(); }, [loadReviews]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.rating) { setStatus('Please select a star rating.'); return; }
    setBusy(true);
    setStatus('');
    try {
      await axios.post(`${API_URL}/api/testimonials`, form, { headers: authHeader() });
      await loadReviews();
      setForm({ message: '', branch: '', semester: '', rating: 0 });
      setStatus('Thank you. Your experience is now visible.');
    } catch (error) {
      setStatus(error.response?.data?.error || 'Could not share your experience.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/admin/testimonials/${id}`, { headers: adminHeader() });
      await loadReviews();
    } catch (error) {
      setStatus(error.response?.data?.error || 'Could not delete this experience.');
    }
  };

  return <main className="feedback-page testimonials-page">
    <header className="feedback-heading testimonials-heading"><div><span className="testimonials-eyebrow"><MessageCircle size={18} /> THE PAPERSTACK COMMUNITY</span><h1>Student experiences</h1><p>Honest reviews. Shared by the students behind the stack.</p><a href="#share-experience">Share your experience <ArrowRight size={17} /></a></div><img src="/testimonials.png" alt="" /></header>
    <div className="feedback-layout">
      <div className="testimonials-feed">
      <h2 className="testimonials-feed-title">Community reviews</h2>
      <section className="feedback-list" aria-label="Student experiences">
        {items.length ? items.map((item) => <article className="feedback-item" key={item._id}>
          <div className="review-card-top"><Quote size={23} aria-hidden="true" />{item.rating ? <span className="review-stars" aria-label={`${item.rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={17} fill={value <= item.rating ? 'currentColor' : 'none'} aria-hidden="true" />)}</span> : <span className="review-unrated">Not rated</span>}</div>
          <p>{item.message}</p><div className="feedback-author"><span className="review-avatar" aria-hidden="true">{item.displayName?.slice(0, 1).toUpperCase()}</span><div><strong>{item.displayName}</strong><span>{[item.branch, item.semester ? `Semester ${item.semester}` : ''].filter(Boolean).join(' · ')}</span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString('en-IN')}</time></div></div>
          {isAdmin && <button type="button" onClick={() => remove(item._id)}>Delete</button>}
        </article>) : !loading && !loadError && <p className="feedback-empty">No reviews yet. Share your experience and start the conversation.</p>}
      </section>
      {loading && <PaperStackLoader label="Loading student reviews..." />}
      {loadError && <div className="review-load-error" role="alert"><p>{loadError}</p><button onClick={() => loadReviews(page + 1)}>Try again</button></div>}
      {hasMore && !loading && !loadError && <button className="reviews-load-more" onClick={() => loadReviews(page + 1)}>Load more reviews <ArrowRight size={16} /></button>}
      </div>
      <form id="share-experience" className="feedback-form testimonial-form" onSubmit={submit}>
        <h2>Share your experience</h2>
        {user ? <><fieldset className="review-rating"><legend>Your rating</legend><div className="rating-options">{[1, 2, 3, 4, 5].map((value) => <label key={value} className={value <= form.rating ? 'selected' : ''}><input type="radio" name="rating" value={value} checked={form.rating === value} onChange={() => setForm({ ...form, rating: value })} required aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`} /><Star size={30} fill={value <= form.rating ? 'currentColor' : 'none'} aria-hidden="true" /></label>)}</div><span>{form.rating ? ['Needs improvement', 'Could be better', 'Good', 'Really helpful', 'Excellent'][form.rating - 1] : 'Select your rating'}</span></fieldset><label htmlFor="experience-message">Your experience</label><textarea id="experience-message" required minLength={15} maxLength={600} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="What helped you study or find a paper?" /><span className="review-word-count">{form.message.length}/600 characters</span>
          <label htmlFor="experience-branch">Branch (optional)</label><select id="experience-branch" value={form.branch} onChange={(event) => setForm({ ...form, branch: event.target.value })}><option value="">Not specified</option>{OFFICIAL_BRANCHES.map((branch) => <option key={branch.key} value={branch.key}>{branch.key}</option>)}</select>
          <label htmlFor="experience-semester">Semester (optional)</label><select id="experience-semester" value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })}><option value="">Not specified</option>{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>Semester {index + 1}</option>)}</select>
          <button type="submit" disabled={busy}>{busy ? 'Sharing...' : 'Share experience'} <ArrowRight size={17} /></button></> : <p><Link to="/login">Sign in</Link> to share an experience from your PaperStack account.</p>}
        {status && <p role="status" className="feedback-status">{status}</p>}
      </form>
    </div>
  </main>;
}

export function SiteReportPage({ user }) {
  const [form, setForm] = useState({ category: '', page: '', title: '', message: '', url: '', relatedId: '' });
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const { data } = await axios.post(`${API_URL}/api/site-reports`, form, { headers: authHeader() });
      setStatus(data.message);
      setForm({ category: '', page: '', title: '', message: '', url: '', relatedId: '' });
    } catch (error) {
      setStatus(error.response?.data?.error || 'Could not send your report.');
    } finally {
      setBusy(false);
    }
  };
  return <main className="feedback-page feedback-report-page">
    <div className="feedback-heading"><span><MessageSquareWarning size={16} /> Help improve PaperStack</span><h1>Report a problem</h1><p>Tell us what went wrong so the team can investigate it.</p></div>
    {user ? <form className="feedback-form" onSubmit={submit}>
      <label htmlFor="report-category">Category</label><select id="report-category" required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="">Choose a category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select>
      <label htmlFor="report-page">Page or feature</label><input id="report-page" maxLength={120} value={form.page} onChange={(event) => setForm({ ...form, page: event.target.value })} placeholder="e.g. Archive, Mock Exams" />
      <label htmlFor="report-title">Short title</label><input id="report-title" required minLength={5} maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="What happened?" />
      <label htmlFor="report-description">Details</label><textarea id="report-description" required minLength={15} maxLength={2000} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="What were you trying to do, and what happened instead?" />
      <div className="feedback-pair"><div><label htmlFor="report-url">URL or path (optional)</label><input id="report-url" maxLength={300} value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="/archive" /></div><div><label htmlFor="report-related">Paper or resource ID (optional)</label><input id="report-related" maxLength={80} value={form.relatedId} onChange={(event) => setForm({ ...form, relatedId: event.target.value })} /></div></div>
      <button type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send report'} <ArrowRight size={17} /></button>
      {status && <p role="status" className="feedback-status">{status}</p>}
    </form> : <div className="feedback-form"><p>Sign in to send a report. This helps us follow up and limits spam.</p><Link to="/login">Sign in <ArrowRight size={17} /></Link></div>}
  </main>;
}
