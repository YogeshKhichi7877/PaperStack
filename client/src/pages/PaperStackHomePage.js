// import React, { useEffect, useMemo, useState } from 'react';
// import { Link } from 'react-router-dom';
// import axios from 'axios';
// import { ArrowRight, BookOpen, CalendarDays, Check, Download, FileText, Search, Sparkles, Trophy, Users } from 'lucide-react';
// import { API_URL } from '../config/appConfig';
// import { getContributorLeaderboard } from '../services/contributorApi';
// import { getSubjectHubPath } from '../utils/subjectRoute';
// import campusArt from '../assets/paperstack-campus.png';
// import archiveArt from '../assets/paperstack-past-papers.png';
// import examArt from '../assets/paperstack-exam-prep.png';
// import aiArt from '../assets/paperstack-ai-owl.png';
// import owlArt from '../assets/Paperstack_auth_owl.png';
// import './PaperStackHomePage.css';

// const formatCount = (value) => Number(value || 0).toLocaleString('en-IN');

// export default function PaperStackHomePage({ user }) {
//   const [papers, setPapers] = useState([]);
//   const [analytics, setAnalytics] = useState(null);
//   const [contributors, setContributors] = useState([]);
//   const [errors, setErrors] = useState([]);

//   useEffect(() => {
//     let active = true;
//     Promise.allSettled([
//       axios.get(`${API_URL}/api/papers`),
//       axios.get(`${API_URL}/api/analytics`),
//       getContributorLeaderboard(),
//     ]).then(([paperResult, analyticsResult, contributorResult]) => {
//       if (!active) return;
//       const failed = [];
//       if (paperResult.status === 'fulfilled') {
//         const data = paperResult.value.data;
//         setPapers(Array.isArray(data) ? data : data?.papers || []);
//       } else failed.push('papers');
//       if (analyticsResult.status === 'fulfilled') setAnalytics(analyticsResult.value.data);
//       else failed.push('archive statistics');
//       if (contributorResult.status === 'fulfilled') setContributors(contributorResult.value);
//       else failed.push('contributors');
//       setErrors(failed);
//     });
//     return () => { active = false; };
//   }, []);

//   const subjects = useMemo(() => {
//     const map = new Map();
//     papers.forEach((paper) => {
//       const subject = paper.subject || paper.normalizedSubject;
//       if (!subject) return;
//       const key = subject.trim().toLowerCase();
//       const previous = map.get(key);
//       map.set(key, { name: subject, count: (previous?.count || 0) + 1, paper });
//     });
//     return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
//   }, [papers]);

//   const metrics = [
//     { label: 'Papers in Archive', value: analytics?.totalPapers, icon: FileText },
//     { label: 'Student Contributors', value: analytics?.totalContributors, icon: Users },
//     { label: 'Subjects Covered', value: analytics ? analytics.subjects?.length : subjects.length || null, icon: BookOpen },
//     { label: 'Total Downloads', value: analytics?.totalDownloads, icon: Download },
//   ];

//   return (
//     <main className="landing-page">
//       <section className="landing-hero" aria-labelledby="landing-heading">
//         <div className="landing-hero-copy">
//           {user && <p className="landing-welcome">Welcome back, <strong>{user.name || user.username || 'student'}!</strong></p>}
//           <h1 id="landing-heading">Past Papers.<br /><span>Brighter Futures.</span></h1>
//           <p className="landing-hero-lead">Access mid-sem and end-sem past papers, solutions, exam stats, revision resources, and AI tools, curated by IIIT Surat students for IIIT Surat students.</p>
//           <div className="landing-hero-actions">
//             <Link to="/archive" className="landing-button landing-button-primary"><Search size={20} /> View All Papers <ArrowRight size={18} /></Link>
//             <Link to="/contribute" className="landing-button landing-button-secondary"><FileText size={20} /> Contribute Papers</Link>
//           </div>
//           <div className="landing-trust"><span><Check /> Student driven</span><span><Check /> Organized by subject</span><span><Check /> Open access</span></div>
//         </div>
//         <img className="landing-hero-art" src={campusArt} alt="Illustration of IIIT Surat and study resources" />
//         <img className="landing-hero-owl" src={owlArt} alt="" />
//       </section>

//       {errors.length > 0 && <p className="landing-data-status" role="status">Some live data could not be loaded ({errors.join(', ')}). Try refreshing the page.</p>}

//       <section className="landing-metrics" aria-label="Archive at a glance">
//         {metrics.map(({ label, value, icon: Icon }) => (
//           <div className="landing-metric" key={label}><span className="landing-metric-icon"><Icon size={27} /></span><div><strong>{value == null ? '—' : formatCount(value)}</strong><span>{label}</span></div></div>
//         ))}
//       </section>

//       <section className="landing-workspace" aria-label="Explore PaperStack">
//         <div className="landing-archive-feature">
//           <div className="landing-feature-copy"><span className="landing-eyebrow">Explore</span><h2>Open Archive</h2><p>Find papers by subject, semester, year, and exam type.</p><div className="landing-feature-points"><span><BookOpen /> All subjects</span><span><CalendarDays /> Every semester</span><span><FileText /> Mid & End Sem</span></div><Link to="/archive" className="landing-button landing-button-light">View All Papers <ArrowRight size={18} /></Link></div>
//           <img src={archiveArt} alt="Illustrated stack of past papers" loading="lazy" />
//         </div>
//         <div className="landing-quick-features">
//           <Link to="/exam-war-room" className="landing-quick-feature"><div><span className="landing-feature-icon"><CalendarDays /></span><h3>Prepare for<br />Mid-Sem / End-Sem</h3><p>Build your exam plan with past papers, important topics, and revision resources.</p><strong>Start Preparing <ArrowRight size={16} /></strong></div><img src={examArt} alt="Exam preparation illustration" loading="lazy" /></Link>
//           <Link to="/ask-paperstack" className="landing-quick-feature"><div><span className="landing-feature-icon"><Sparkles /></span><h3>AI Study Tools</h3><p>Ask a question, revise a topic, or work through a paper.</p><strong>Try AI Tools <ArrowRight size={16} /></strong></div><img src={aiArt} alt="PaperStack study assistant" loading="lazy" /></Link>
//         </div>
//         <aside className="landing-contributors"><div className="landing-section-heading"><h2><Trophy size={20} /> Top Contributors</h2><Link to="/contributors">View All <ArrowRight size={15} /></Link></div>{contributors.length ? <ol>{contributors.slice(0, 5).map((entry, index) => <li key={entry.userId || `${entry.name}-${index}`}><span className="landing-rank">{index + 1}</span><span className="landing-contributor-name">{entry.name || 'Contributor'}<small>{formatCount(entry.approvedPapers)} approved papers</small></span></li>)}</ol> : <p className="landing-empty">{errors.includes('contributors') ? 'Contributor rankings are temporarily unavailable.' : 'No approved contributors yet.'}</p>}</aside>
//       </section>

//       <section className="landing-subjects" aria-labelledby="landing-subjects-title"><div className="landing-section-heading"><div><h2 id="landing-subjects-title">Subject Hubs</h2><p>Go straight to papers and solutions for a subject.</p></div><Link to="/archive">Browse all subjects <ArrowRight size={16} /></Link></div>{subjects.length ? <div className="landing-subject-grid">{subjects.slice(0, 8).map((subject) => <Link key={subject.name} to={getSubjectHubPath(subject.paper)}><BookOpen size={24} /><span><strong>{subject.name}</strong><small>{formatCount(subject.count)} {subject.count === 1 ? 'paper' : 'papers'}</small></span><ArrowRight size={18} /></Link>)}</div> : <p className="landing-empty">{errors.includes('papers') ? 'Subjects are temporarily unavailable.' : 'No subjects in the archive yet.'}</p>}</section>
//       <section className="landing-bottom-cta"><div><h2>Have a paper others could use?</h2><p>Add it to the archive for the next batch of students.</p></div><Link to="/contribute" className="landing-button landing-button-primary">Contribute a Paper <ArrowRight size={18} /></Link></section>
//     </main>
//   );
// }












import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  Download,
  Eye,
  FileText,
  Flame,
  Heart,
  Search,
  Sparkles,
  Star,
  Target,
  Trophy,
  UploadCloud,
  UserRound,
  Users,
  Zap,
} from 'lucide-react';

import { API_URL } from '../config/appConfig';
import { getContributorLeaderboard } from '../services/contributorApi';
import { getSubjectHubPath } from '../utils/subjectRoute';
import { useStudentProfile } from '../context/StudentProfileContext';

import campusArt from '../assets/paperstack-campus.png';
import archiveArt from '../assets/paperstack-past-papers.png';
import examArt from '../assets/paperstack-exam-prep.png';
import aiArt from '../assets/paperstack-ai-owl.png';
import owlArt from '../assets/Paperstack_auth_owl.png';
import instituteEmblem from '../assets/iiit_surat.png';

import './PaperStackHomePage.css';

const formatCount = (value) =>
  Number(value || 0).toLocaleString('en-IN');

const getPaperViews = (paper) =>
  Number(
    paper?.views ??
      paper?.viewCount ??
      paper?.totalViews ??
      paper?.analytics?.views ??
      0
  );

const getPaperDownloads = (paper) =>
  Number(
    paper?.downloads ??
      paper?.downloadCount ??
      paper?.totalDownloads ??
      paper?.analytics?.downloads ??
      0
  );

export default function PaperStackHomePage({ user }) {
  const { displayName, semester } = useStudentProfile();
  const personalized = Boolean(user && semester);
  const [papers, setPapers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [contributors, setContributors] = useState([]);
  const [errors, setErrors] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0);
  const [reviewsPaused, setReviewsPaused] = useState(false);
  const testimonialIds = useRef('');

  useEffect(() => {
    let active = true;
    let loading = false;
    const loadTestimonials = async () => {
      if (!active || loading || document.hidden) return;
      loading = true;
      try {
        const { data } = await axios.get(`${API_URL}/api/testimonials`);
        if (!active || !Array.isArray(data)) return;
        const latest = data.slice(0, 5);
        const ids = latest.map((item) => item._id).join(',');
        if (ids !== testimonialIds.current) {
          testimonialIds.current = ids;
          setTestimonials(latest);
          setActiveTestimonialIndex(0);
        }
      } catch {
        // Keep previously loaded reviews visible during a temporary network failure.
      } finally {
        loading = false;
      }
    };
    const refreshWhenVisible = () => { if (!document.hidden) loadTestimonials(); };
    loadTestimonials();
    const refreshTimer = window.setInterval(loadTestimonials, 60_000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    if (testimonials.length < 2 || reviewsPaused || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActiveTestimonialIndex((index) => (index + 1) % testimonials.length);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [testimonials.length, reviewsPaused]);

  const orderedTestimonials = testimonials.length
    ? [...testimonials.slice(activeTestimonialIndex), ...testimonials.slice(0, activeTestimonialIndex)]
    : [];

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      axios.get(`${API_URL}/api/papers`, { params: personalized ? { semester } : {} }),
      axios.get(`${API_URL}/api/analytics`),
      getContributorLeaderboard(),
    ]).then(([paperResult, analyticsResult, contributorResult]) => {
      if (!active) return;

      const failed = [];

      if (paperResult.status === 'fulfilled') {
        const data = paperResult.value.data;
        setPapers(Array.isArray(data) ? data : data?.papers || []);
      } else {
        failed.push('papers');
      }

      if (analyticsResult.status === 'fulfilled') {
        setAnalytics(analyticsResult.value.data);
      } else {
        failed.push('archive statistics');
      }

      if (contributorResult.status === 'fulfilled') {
        setContributors(
          Array.isArray(contributorResult.value)
            ? contributorResult.value
            : []
        );
      } else {
        failed.push('contributors');
      }

      setErrors(failed);
    });

    return () => {
      active = false;
    };
  }, [personalized, semester]);

  const subjects = useMemo(() => {
    const map = new Map();

    papers.forEach((paper) => {
      const subject = paper.subject || paper.normalizedSubject;
      if (!subject) return;

      const key = subject.trim().toLowerCase();
      const previous = map.get(key);

      map.set(key, {
        name: subject,
        count: (previous?.count || 0) + 1,
        paper,
      });
    });

    return [...map.values()].sort(
      (a, b) =>
        b.count - a.count ||
        a.name.localeCompare(b.name)
    );
  }, [papers]);

  const trendingPapers = useMemo(() => {
    return [...papers]
      .map((paper) => ({
        ...paper,
        _trendScore:
          getPaperViews(paper) +
          getPaperDownloads(paper) * 3,
      }))
      .sort((a, b) => b._trendScore - a._trendScore)
      .slice(0, 3);
  }, [papers]);

  const semesterViews = papers.reduce((total, paper) => total + getPaperViews(paper), 0);
  const semesterDownloads = papers.reduce((total, paper) => total + getPaperDownloads(paper), 0);
  const globalPapers = analytics?.totalPapers ?? (!personalized ? papers.length : null);
  const globalViews = analytics?.totalViews ?? (!personalized ? semesterViews : null);
  const globalDownloads = analytics?.totalDownloads ?? (!personalized ? semesterDownloads : null);
  const globalSubjects = analytics ? analytics.subjects?.length : (!personalized ? subjects.length : null);

  const metrics = personalized
    ? [
        { label: `Semester ${semester} Papers`, value: papers.length, icon: FileText },
        { label: `Semester ${semester} Views`, value: semesterViews, icon: Eye },
        { label: `Semester ${semester} Downloads`, value: semesterDownloads, icon: Download },
        { label: 'Your Subjects', value: subjects.length, icon: BookOpen },
        { label: 'Global Papers', value: globalPapers, icon: FileText },
        { label: 'Global Views', value: globalViews, icon: Eye },
        { label: 'Global Downloads', value: globalDownloads, icon: Download },
        { label: 'Student Contributors', value: analytics?.totalContributors, icon: Users },
      ]
    : [
        { label: 'Global Papers', value: globalPapers, icon: FileText },
        { label: 'Global Views', value: globalViews, icon: Eye },
        { label: 'Global Downloads', value: globalDownloads, icon: Download },
        { label: 'Subjects Covered', value: globalSubjects, icon: BookOpen },
        { label: 'Student Contributors', value: analytics?.totalContributors, icon: Users },
      ];

  return (
    <main className="landing-page">
      {/* =========================
          EXISTING HERO
      ========================== */}

      <section
        className="landing-hero"
        aria-labelledby="landing-heading"
      >
        <div className="landing-hero-copy">
          <p className="landing-welcome">{personalized ? <>Welcome back, <strong>{displayName || user?.name || 'student'} 👋</strong></> : <>Welcome to <strong>PaperStack</strong></>}</p>

          <h1 id="landing-heading">
            {personalized ? `Your Semester ${semester}` : 'All semester papers'}
            <br />
            <span>{personalized ? 'academic workspace' : 'in one place'}</span>
          </h1>

          <p className="landing-hero-lead">
            {personalized ? 'Papers, subject hubs and focused study tools for what you are learning now.' : 'Browse every semester, see the complete archive, or sign in to personalize your workspace.'}
          </p>

          <div className="landing-hero-actions"><Link to={personalized ? `/archive?semester=${semester}` : '/archive'} className="landing-button landing-button-primary"><Search size={20} /> Find a paper <ArrowRight size={18} /></Link><Link to="/ask-paperstack" className="landing-button landing-button-secondary">Ask PaperStack</Link></div>

          <div className="landing-trust">
            <span>
              <Check />
              {personalized ? `Semester ${semester} first` : 'All semesters'}
            </span>

            <span>
              <Check />
              {personalized ? 'Ready to study' : 'Global archive stats'}
            </span>

            <span>
              <Check />
              Explore anytime
            </span>
          </div>
        </div>

        <img className="landing-hero-emblem" src={instituteEmblem} alt="" aria-hidden="true" />
        <img
          className="landing-hero-art"
          src={campusArt}
          alt="Illustration of IIIT Surat and study resources"
        />

        <img
          className="landing-hero-owl"
          src={owlArt}
          alt=""
          aria-hidden="true"
        />
      </section>

      {errors.length > 0 && (
        <p
          className="landing-data-status"
          role="status"
        >
          Some live data could not be loaded (
          {errors.join(', ')}). Try refreshing the page.
        </p>
      )}

      {/* =========================
          METRICS
      ========================== */}

      <section
        className={`landing-metrics ${personalized ? 'is-personalized' : 'is-global'}`}
        aria-label="Archive at a glance"
      >
        {metrics.map(
          ({ label, value, icon: Icon }) => (
            <div
              className="landing-metric"
              key={label}
            >
              <span className="landing-metric-icon">
                <Icon size={27} />
              </span>

              <div>
                <strong>
                  {value == null
                    ? '—'
                    : formatCount(value)}
                </strong>

                <span>{label}</span>
              </div>
            </div>
          )
        )}
      </section>

      {/* =========================
          EXISTING OPEN ARCHIVE
      ========================== */}

      <section
        className="landing-workspace"
        aria-label="Explore PaperStack"
      >
        <div className="landing-archive-feature">
          <div className="landing-feature-copy">
            <span className="landing-eyebrow">
              Explore
            </span>

            <h2>Open Archive</h2>

            <p>
              Find papers by subject, semester, year,
              and exam type.
            </p>

            <div className="landing-feature-points">
              <span>
                <BookOpen />
                All subjects
              </span>

              <span>
                <CalendarDays />
                Every semester
              </span>

              <span>
                <FileText />
                Mid & End Sem
              </span>
            </div>

            <Link
              to="/archive"
              className="landing-button landing-button-light"
            >
              View All Papers
              <ArrowRight size={18} />
            </Link>
          </div>

          <img
            src={archiveArt}
            alt="Illustrated stack of past papers"
            loading="lazy"
          />
        </div>

        <div className="landing-quick-features">
          <Link
            to="/exam-war-room"
            className="landing-quick-feature"
          >
            <div>
              <span className="landing-feature-icon">
                <CalendarDays />
              </span>

              <h3>
                Prepare for
                <br />
                Mid-Sem / End-Sem
              </h3>

              <p>
                Build your exam plan with past papers,
                important topics, and revision resources.
              </p>

              <strong>
                Start Preparing
                <ArrowRight size={16} />
              </strong>
            </div>

            <img
              src={examArt}
              alt="Exam preparation illustration"
              loading="lazy"
            />
          </Link>

          <Link
            to="/ask-paperstack"
            className="landing-quick-feature"
          >
            <div>
              <span className="landing-feature-icon">
                <Sparkles />
              </span>

              <h3>AI Study Tools</h3>

              <p>
                Ask a question, revise a topic, or work
                through a paper.
              </p>

              <strong>
                Try AI Tools
                <ArrowRight size={16} />
              </strong>
            </div>

            <img
              src={aiArt}
              alt="PaperStack study assistant"
              loading="lazy"
            />
          </Link>
        </div>

        <aside className="landing-contributors">
          <div className="landing-section-heading">
            <h2>
              <Trophy size={20} />
              Top Contributors
            </h2>

            <Link to="/contributors">
              View All
              <ArrowRight size={15} />
            </Link>
          </div>

          {contributors.length ? (
            <ol>
              {contributors
                .slice(0, 5)
                .map((entry, index) => (
                  <li
                    key={
                      entry.userId ||
                      `${entry.name}-${index}`
                    }
                  >
                    <span className="landing-rank">
                      {index + 1}
                    </span>

                    <span className="landing-contributor-name">
                      {entry.name || 'Contributor'}

                      <small>
                        {formatCount(
                          entry.approvedPapers
                        )}{' '}
                        approved papers
                      </small>
                    </span>
                  </li>
                ))}
            </ol>
          ) : (
            <p className="landing-empty">
              {errors.includes('contributors')
                ? 'Contributor rankings are temporarily unavailable.'
                : 'No approved contributors yet.'}
            </p>
          )}
        </aside>
      </section>

      {/* =====================================================
          NEW SECTION — SUBJECT HUB SHOWCASE
      ====================================================== */}

      <section className="home-subject-showcase">
        <div className="home-subject-intro">
          <div className="home-card-heading">
            <span className="home-heading-icon">
              <BookOpen size={27} />
            </span>

            <div>
              <h2>{personalized ? `Semester ${semester} Subjects` : 'All Semester Subjects'}</h2>
              <p>
                {personalized ? 'Everything for your current subjects.' : 'Browse subjects across the complete archive.'}
              </p>
            </div>
          </div>

          <p className="home-subject-copy">Open papers and resources grouped by subject.</p>

          <Link
            to="/archive"
            className="home-feature-button"
          >
            Open a subject
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className="home-subject-art">
          <img
            src="/subject-hubs-owl.png"
            alt=""
            loading="lazy"
          />
        </div>

        <div className="home-popular-subjects">
          <div className="home-mini-heading">
            <h3>Your subjects</h3>

            <Link to="/archive">
              View All Subjects
              <ArrowRight size={15} />
            </Link>
          </div>

          {subjects.length ? (
            <div className="home-subject-mini-grid">
              {subjects.slice(0, 6).map((subject) => (
                <Link
                  key={subject.name}
                  to={getSubjectHubPath(
                    subject.paper
                  )}
                >
                  <BookOpen size={21} />

                  <span>
                    <strong>
                      {subject.name}
                    </strong>

                    <small>
                      {formatCount(subject.count)}{' '}
                      {subject.count === 1
                        ? 'paper'
                        : 'papers'}
                    </small>
                  </span>

                  <ArrowRight size={17} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="landing-empty">
              {personalized ? `Semester ${semester} is still growing. Help build the archive for your batch.` : 'The PaperStack archive is still growing. Help add the next useful resource.'}
              <br /><Link to="/contribute">Contribute a resource →</Link>
            </p>
          )}
        </div>
      </section>

      {/* =====================================================
          NEW SECTION — MAIN STUDY FEATURES
      ====================================================== */}

      <section className="home-main-feature-grid">
        {/* Revision */}

        <article className="home-study-card home-revision-card">
          <div className="home-card-content">
            <div className="home-card-heading">
              <span className="home-round-icon">
                <Zap size={24} />
              </span>

              <div>
                <h2>Quick Revision Zone</h2>
                <p>
                  Remember the important things quickly.
                </p>
              </div>
            </div>

            <div className="home-check-list">
              <span>
                <Check size={15} />
                Short notes & formula sheets
              </span>

              <span>
                <Check size={15} />
                Important questions
              </span>

              <span>
                <Check size={15} />
                Topic-wise revision
              </span>
            </div>

            <Link
              to="/revision-sheets"
              className="home-feature-button"
            >
              Start Revising
              <ArrowRight size={18} />
            </Link>
          </div>

          <img
            className="home-study-art"
            src="/revision-zone-owl.png"
            alt=""
            loading="lazy"
          />
        </article>

        {/* Mock */}

        <article className="home-study-card home-mock-card">
          <div className="home-card-content">
            <div className="home-card-heading">
              <span className="home-square-icon">
                <FileText size={24} />
              </span>

              <div>
                <h2>Mock Exam Center</h2>
                <p>
                  Practice under real exam conditions.
                </p>
              </div>
            </div>

            <div className="home-check-list">
              <span>
                <Check size={15} />
                Timed mock tests
              </span>

              <span>
                <Check size={15} />
                Past-paper based practice
              </span>

              <span>
                <Check size={15} />
                Instant score & analysis
              </span>
            </div>

            <Link
              to="/mock-exams"
              className="home-feature-button"
            >
              Start a Mock Test
              <ArrowRight size={18} />
            </Link>
          </div>

          <img
            className="home-study-art home-mock-art"
            src="/mock-exam-center.png"
            alt=""
            loading="lazy"
          />
        </article>

        {/* War Room */}

        <article className="home-study-card home-war-card">
          <div className="home-card-content">
            <div className="home-card-heading">
              <span className="home-war-icon">
                <Target size={24} />
              </span>

              <div>
                <h2>Exam Planner</h2>
                <p>
                  Decide what you should study next.
                </p>
              </div>
            </div>

            <div className="home-check-list">
              <span>
                <Check size={15} />
                Countdown & study planning
              </span>

              <span>
                <Check size={15} />
                Subject priorities
              </span>

              <span>
                <Check size={15} />
                Weakness-focused preparation
              </span>

              <span>
                <Check size={15} />
                Smart next actions
              </span>
            </div>

            <Link
              to="/exam-war-room"
              className="home-feature-button"
            >
              Open Exam Planner
              <ArrowRight size={18} />
            </Link>
          </div>

          <img
            className="home-study-art home-war-art"
            src="/exam-war-room.png"
            alt=""
            loading="lazy"
          />
        </article>
      </section>

      {/* =====================================================
          NEW SECTION — INTELLIGENCE / DISCOVERY
      ====================================================== */}

      <section className="home-intelligence-grid">
        {/* Trending */}

        <article className="home-info-card">
          <div className="home-mini-heading">
            <div>
              <h2>
                <Flame
                  size={20}
                  className="home-flame-icon"
                />
                Trending Papers
              </h2>

              <p>
                Papers students are exploring right now.
              </p>
            </div>

            <Link to="/trending">
              View Trending Papers
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="home-trending-body">
            <div className="home-ranking-list">
              {trendingPapers.length ? (
                trendingPapers.map(
                  (paper, index) => (
                    <Link
                      key={
                        paper._id ||
                        `${paper.subject}-${index}`
                      }
                      to={
                        paper._id
                          ? `/paper/${paper._id}`
                          : '/trending'
                      }
                    >
                      <span className="home-list-number">
                        {index + 1}
                      </span>

                      <span className="home-list-main">
                        <strong>
                          {paper.subject ||
                            paper.normalizedSubject ||
                            'Paper'}
                        </strong>

                        <small>
                          {paper.subjectCode ||
                            paper.code ||
                            paper.examType ||
                            'Previous paper'}
                        </small>
                      </span>

                      <span className="home-list-meta">
                        {getPaperViews(paper) > 0
                          ? `${formatCount(
                              getPaperViews(paper)
                            )} views`
                          : 'Open'}
                      </span>
                    </Link>
                  )
                )
              ) : (
                <p className="landing-empty">
                  Trending papers will appear here when
                  archive activity is available.
                </p>
              )}
            </div>

            <img
              src="/trending.png"
              alt=""
              loading="lazy"
            />
          </div>
        </article>

        {/* PYQ */}

        <article className="home-info-card home-pyq-card">
          <div className="home-card-heading">
            <span className="home-heading-icon">
              <BarChart3 size={24} />
            </span>

            <div>
              <h2>Repeated topics</h2>

              <p>
                Understand what previous papers actually
                tell you.
              </p>
            </div>
          </div>

          <div className="home-pyq-layout">
            <div className="home-check-list">
              <span>
                <Check size={15} />
                Repeated topic analysis
              </span>

              <span>
                <Check size={15} />
                Weightage patterns
              </span>

              <span>
                <Check size={15} />
                Most asked concepts
              </span>

              <span>
                <Check size={15} />
                Historical exam insights
              </span>

              <Link
                to="/pyq-intelligence"
                className="home-feature-button"
              >
                Explore PYQ Intel
                <ArrowRight size={18} />
              </Link>
            </div>

            <img
              src="/pyq-intelligence.png"
              alt=""
              loading="lazy"
            />
          </div>
        </article>

        {/* Most used */}

        <article className="home-info-card">
          <div className="home-mini-heading">
            <div>
              <h2>
                <Star
                  size={20}
                  className="home-star-icon"
                />
                Explore Popular Tools
              </h2>

              <p>
                Useful ways to get more from PaperStack.
              </p>
            </div>
          </div>

          <div className="home-tool-links">
            <Link to="/search">
              <span className="home-tool-index">
                1
              </span>

              <span>
                <strong>Search Papers</strong>
                <small>
                  Find subjects, topics and papers
                </small>
              </span>

              <ArrowRight size={17} />
            </Link>

            <Link to="/ask-paperstack">
              <span className="home-tool-index">
                2
              </span>

              <span>
                <strong>Ask PaperStack</strong>
                <small>
                  Get explanations and study help
                </small>
              </span>

              <ArrowRight size={17} />
            </Link>

            <Link to="/important-topics">
              <span className="home-tool-index">
                3
              </span>

              <span>
                <strong>Top Exam Topics</strong>
                <small>
                  Focus on concepts that deserve
                  attention
                </small>
              </span>

              <ArrowRight size={17} />
            </Link>
          </div>
        </article>
      </section>

      {/* =====================================================
          RESOURCE CONTRIBUTION CTA
      ====================================================== */}

      <section className="home-resource-cta">
        <div className="home-resource-main">
          <span className="home-resource-icon">
            <UploadCloud size={28} />
          </span>

          <div>
            <h2>
              Upload Notes, Formula Sheets & More
            </h2>

            <p>
              Have useful notes, formula sheets,
              solutions, assignments or revision
              resources? Share them with students across
              PaperStack.
            </p>
          </div>
        </div>

        <div className="home-resource-benefits">
          <div>
            <Trophy size={21} />

            <span>
              <strong>Earn points</strong>
              <small>
                Get rewarded for approved resources.
              </small>
            </span>
          </div>

          <div>
            <BarChart3 size={21} />

            <span>
              <strong>Climb the leaderboard</strong>
              <small>
                Become a top contributor.
              </small>
            </span>
          </div>

          <div>
            <Users size={21} />

            <span>
              <strong>Help juniors</strong>
              <small>
                Make preparation easier for others.
              </small>
            </span>
          </div>

          <div>
            <Star size={21} />

            <span>
              <strong>Build your profile</strong>
              <small>
                Get recognized for useful work.
              </small>
            </span>
          </div>
        </div>

        <Link
          to="/contribute-resource"
          className="home-feature-button home-resource-button"
        >
          Upload Notes &amp; Resources
          <ArrowRight size={18} />
        </Link>

        <img
          className="home-resource-owl"
          src="/resource-upload-owl.png"
          alt=""
          loading="lazy"
        />
      </section>

      {/* =====================================================
          FINAL COMMUNITY CTA
      ====================================================== */}

      {/* <section className="landing-bottom-cta">
        <div>
          <h2>
            <Heart
              size={22}
              className="home-inline-heart"
            />
            Have a paper others could use?
          </h2>

          <p>
            Add it to the archive for the next batch of
            students.
          </p>
        </div>

        <Link
          to="/contribute"
          className="landing-button landing-button-primary"
        >
          Contribute a Paper
          <ArrowRight size={18} />
        </Link>
      </section> */}

      <section className="home-whats-new" aria-labelledby="home-whats-new-heading">
        <div className="home-whats-new-heading">
          <div><span>EXPLORE MORE</span><h2 id="home-whats-new-heading">What's new to PaperStack</h2><p>More ways to prepare, contribute, and follow the archive.</p></div>
          <Sparkles size={32} aria-hidden="true" />
        </div>
        <div className="home-whats-new-grid">
          {[
            { title: 'ZIP download', intro: 'Gather the papers for an upcoming exam in one focused view.' },
            { title: 'Practice Questions', intro: 'Work through questions extracted from past papers.' },
            { title: 'Archive Analytics', intro: 'See how papers are viewed and downloaded across the archive.' },
            { title: 'Missing Papers', intro: 'Spot gaps in the archive and request papers students need.' },
            { title: 'Archive Progress', intro: 'See which subjects and exam years are covered or still missing.' },
            { title: 'Verify Papers', intro: 'Check paper details and PDF quality to keep the archive reliable.' },
            { title: 'Branch Rankings', intro: 'See how each branch contributes to the shared library.' },
            { title: 'My Progress', intro: 'Follow your study activity and keep a consistent streak.' },
            { title: 'Notifications', intro: 'Stay updated on contributions and activity that matters to you.' },
          ].map(({ title, intro }) => <div key={title} className="home-new-feature"><strong>{title}</strong><small>{intro}</small></div>)}
        </div>
      </section>
      <section className="home-contribute-banner">
  <div className="home-contribute-content">
    <span className="home-contribute-kicker">
      <Heart size={16} />
      Help the next batch
    </span>

    <h2>Have a paper others could use?</h2>

    <p>Share your question papers with the next batch.</p>
    <p className="home-contribute-community-line">The more you contribute resources, the more useful it becomes.</p>
    <div className="home-contribute-badges" aria-label="Badges to earn">
      <strong>Badges to earn</strong>
      <span><Trophy size={16} /> Verified Uploader</span>
      <span><Star size={16} /> Resource Contributor</span>
      <span><Zap size={16} /> Archive Builder</span>
      <Link to="/contributors">See leaderboard <ArrowRight size={15} /></Link>
    </div>

    <Link
      to="/contribute"
      className="home-contribute-button"
    >
      <UploadCloud size={19} />
      Contribute a Paper
      <ArrowRight size={18} />
    </Link>
  </div>

  <div className="home-contribute-message">
    <span className="home-contribute-note">
      SAME STUDENTS.
      <br />
      BRIGHTER FUTURES.
    </span>
  </div>

  <div className="home-contribute-owl-wrap">
    {[1, 2, 3, 4, 5].map((heart) => <span key={heart} className={`home-contribute-heart heart-position-${heart}`} aria-hidden="true"><Heart fill="currentColor" strokeWidth={1.5} /></span>)}

    <img
      src="/contribute-owl.png"
      alt="PaperStack owl encouraging students to contribute papers"
      className="home-contribute-owl"
      loading="lazy"
    />
  </div>
</section>
      {testimonials.length > 0 && <section
        className="landing-testimonials"
        aria-labelledby="landing-testimonials-heading"
        onMouseEnter={() => setReviewsPaused(true)}
        onMouseLeave={() => setReviewsPaused(false)}
        onFocusCapture={() => setReviewsPaused(true)}
        onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setReviewsPaused(false); }}
      >
        <div className="landing-testimonials-heading">
          <div><span>STUDENT VOICES</span><h2 id="landing-testimonials-heading">Latest student stories</h2><p>Reviews from the PaperStack community, newest first.</p></div>
          <Link to="/testimonials">All reviews <ArrowRight size={17} /></Link>
        </div>
        <div className="landing-testimonials-grid" aria-live="off" key={activeTestimonialIndex}>
          {orderedTestimonials.map((item) => <blockquote className="landing-review-card" key={item._id}>
            <div className="landing-review-rating">
              {item.rating ? <span className="landing-review-stars" aria-label={`${item.rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={17} fill={value <= item.rating ? 'currentColor' : 'none'} aria-hidden="true" />)}</span> : <span>Not rated</span>}
              {item.createdAt && <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</time>}
            </div>
            <p>{item.message}</p>
            <footer><span className="landing-review-avatar" aria-hidden="true"><UserRound size={20} /></span><span><strong>{item.displayName}</strong><small>{[item.branch, item.semester ? `Semester ${item.semester}` : ''].filter(Boolean).join(' · ') || 'PaperStack student'}</small></span></footer>
          </blockquote>)}
        </div>
        {testimonials.length > 1 && <div className="landing-review-pagination" aria-label="Student review controls">
          <span>{activeTestimonialIndex + 1} / {testimonials.length}</span>
          <button type="button" aria-label="Previous review" onClick={() => setActiveTestimonialIndex((index) => (index - 1 + testimonials.length) % testimonials.length)}><ChevronLeft size={18} /></button>
          <button type="button" aria-label="Next review" onClick={() => setActiveTestimonialIndex((index) => (index + 1) % testimonials.length)}><ChevronRight size={18} /></button>
        </div>}
      </section>}
    </main>
  );
}
