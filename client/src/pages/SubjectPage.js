import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Download, FileText } from 'lucide-react';
import { FRONTEND_URL } from '../config/appConfig';
import {
  fetchSubjectResources,
  fetchSubjectSummary,
  recordResourceDownload,
  recordResourceView,
} from '../services/resourceApi';
import './SubjectPage.css';
import './SubjectPageCompact.css';

const RESOURCE_TABS = [
  { value: 'all', label: 'All Resources', short: 'All' },
  { value: 'question_paper', label: 'Question Papers', short: 'Papers' },
  { value: 'solution', label: 'Solutions', short: 'Solutions' },
  { value: 'notes', label: 'Notes', short: 'Notes' },
  { value: 'formula_sheet', label: 'Formula Sheets', short: 'Formula' },
  { value: 'assignment', label: 'Assignments', short: 'Assignments' },
  { value: 'lab_material', label: 'Lab Material', short: 'Labs' },
  { value: 'quiz', label: 'Quizzes', short: 'Quizzes' },
  { value: 'viva_questions', label: 'Viva Questions', short: 'Viva' },
  { value: 'important_questions', label: 'Important Questions', short: 'Important' },
  { value: 'revision_sheet', label: 'Revision Sheets', short: 'Revision' },
  { value: 'syllabus', label: 'Syllabus', short: 'Syllabus' },
  { value: 'other', label: 'Other Resources', short: 'Other' },
];

const RESOURCE_LABELS = Object.fromEntries(RESOURCE_TABS.map((item) => [item.value, item.label]));
RESOURCE_LABELS.syllabus = 'Syllabus';
RESOURCE_LABELS.other = 'Other Resource';

function cleanList(values = []) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function resourceKindLabel(kind) {
  return RESOURCE_LABELS[kind] || String(kind || 'Resource').replace(/_/g, ' ');
}

function ResourceCard({ resource, user, toast, navigate }) {
  const isPaper = resource.kind === 'question_paper';
  const canOpen = Boolean(resource.fileUrl);

  const openResource = async () => {
    if (!canOpen) {
      toast?.('This resource file is not available yet.', 'info');
      return;
    }

    try {
      await recordResourceView(resource._id);
    } catch (error) {
      console.warn('Resource view tracking failed:', error);
    }
    window.open(resource.fileUrl, '_blank', 'noopener,noreferrer');
  };

  const downloadResource = async () => {
    if (!user) {
      toast?.('Please login with your IIIT Surat account to download resources.', 'info');
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!canOpen) {
      toast?.('This resource file is not available yet.', 'info');
      return;
    }

    try {
      await recordResourceDownload(resource._id);
    } catch (error) {
      console.warn('Resource download tracking failed:', error);
    }
    window.open(resource.fileUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <article className="subject-hub-resource-card">
      <div className="subject-hub-resource-topline">
        <span className={`subject-hub-kind subject-hub-kind-${resource.kind}`}>
          {isPaper ? <FileText size={16} /> : <BookOpen size={16} />}
          {resourceKindLabel(resource.kind)}
        </span>
        {resource.year ? <span className="subject-hub-year">{resource.year}</span> : null}
      </div>

      <h3>{resource.title || resource.subjectName || 'Untitled resource'}</h3>

      <div className="subject-hub-resource-meta">
        {resource.examType ? <span>{resource.examType}</span> : null}
        {(resource.semesters || []).length ? <span>Sem {(resource.semesters || []).join(', ')}</span> : null}
        {(resource.branches || []).length ? <span>{(resource.branches || []).join(' / ')}</span> : null}
      </div>

      {(resource.tags || []).length > 0 && (
        <div className="subject-hub-tags">
          {resource.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      )}

      <div className="subject-hub-resource-stats">
        <span>{Number(resource.views || 0).toLocaleString('en-IN')} views</span>
        <span>{Number(resource.downloads || 0).toLocaleString('en-IN')} downloads</span>
      </div>

      <div className="subject-hub-resource-actions">
        <button type="button" onClick={openResource} disabled={!canOpen}>
          {isPaper ? 'View Paper' : 'Open Resource'} <ArrowRight size={16} />
        </button>
        <button type="button" className="secondary" onClick={downloadResource} disabled={!canOpen}>
          <Download size={16} /> Download
        </button>
      </div>
    </article>
  );
}

function EmptyResources({
  label,
  contributionPath,
  resourceContributionPath,
  isPaperTab,
}) {
  return (
    <div className="subject-hub-empty">
      <span>Nothing here yet</span>
      <h3>No {label.toLowerCase()} have been added for this subject.</h3>
      <p>Be the first student to help complete this category.</p>
      <Link to={isPaperTab ? contributionPath : resourceContributionPath}>
        {isPaperTab ? 'Upload a question paper' : `Upload ${label}`}
      </Link>
    </div>
  );
}

export default function SubjectPage({ user, toast }) {
  const { subjectKey = '' } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeKind, setActiveKind] = useState('all');
  const [yearFilter, setYearFilter] = useState('');
  const [examFilter, setExamFilter] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadSubject() {
      setLoading(true);
      setError('');
      try {
        const [summaryResult, resourceResult] = await Promise.all([
          fetchSubjectSummary(subjectKey),
          fetchSubjectResources(subjectKey, 100),
        ]);
        if (!mounted) return;
        setSummary(summaryResult);
        setResources(Array.isArray(resourceResult?.resources) ? resourceResult.resources : []);
      } catch (requestError) {
        if (!mounted) return;
        console.error('Subject hub load failed:', requestError.response?.data || requestError.message);
        setError(requestError.response?.data?.error || 'Could not load this subject hub.');
        setSummary(null);
        setResources([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSubject();
    return () => { mounted = false; };
  }, [subjectKey]);

  const years = useMemo(() => cleanList(resources.map((resource) => resource.year)).sort((a, b) => b - a), [resources]);
  const examTypes = useMemo(() => cleanList(resources.map((resource) => resource.examType)), [resources]);

  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return resources.filter((resource) => {
      if (activeKind !== 'all' && resource.kind !== activeKind) return false;
      if (yearFilter && String(resource.year || '') !== String(yearFilter)) return false;
      if (examFilter && String(resource.examType || '') !== examFilter) return false;
      if (normalizedQuery) {
        const searchText = [
          resource.title,
          resource.subjectName,
          resource.subjectCode,
          resource.subjectShortCode,
          ...(resource.tags || []),
          ...(resource.topics || []),
        ].join(' ').toLowerCase();
        if (!searchText.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [resources, activeKind, yearFilter, examFilter, query]);

  const subjectName = summary?.subjectName || decodeURIComponent(subjectKey);
  const subjectCode = summary?.subjectCode || summary?.subjectShortCode || subjectKey;
  const branchText = (summary?.branches || []).join(' / ') || 'IIIT Surat';
  const semesterText = (summary?.semesters || []).map((semester) => `Sem ${semester}`).join(' / ');
  const firstBranch = summary?.branches?.[0] || '';
  const firstSemester = summary?.semesters?.[0] || '';

  const contributionParams = new URLSearchParams();
  if (summary?.subjectName) contributionParams.set('subject', summary.subjectName);
  if (summary?.subjectCode) contributionParams.set('subjectCode', summary.subjectCode);
  if (firstBranch) contributionParams.set('branch', firstBranch);
  if (firstSemester) contributionParams.set('semester', String(firstSemester));
  const contributionPath = `/contribute${contributionParams.toString() ? `?${contributionParams.toString()}` : ''}`;

  const resourceContributionParams = new URLSearchParams();
  if (summary?.subjectName) resourceContributionParams.set('subject', summary.subjectName);
  if (summary?.subjectCode) resourceContributionParams.set('subjectCode', summary.subjectCode);
  if (summary?.subjectShortCode) resourceContributionParams.set('shortCode', summary.subjectShortCode);
  if (firstBranch) resourceContributionParams.set('branch', firstBranch);
  if (firstSemester) resourceContributionParams.set('semester', String(firstSemester));
  if (activeKind !== 'all' && activeKind !== 'question_paper') {
    resourceContributionParams.set('kind', activeKind);
  }
  const resourceContributionPath = `/contribute-resource${resourceContributionParams.toString() ? `?${resourceContributionParams.toString()}` : ''}`;
  const isPaperTab = activeKind === 'question_paper';
  const activeUploadPath = isPaperTab ? contributionPath : resourceContributionPath;
  const activeUploadLabel = isPaperTab ? 'Upload Paper' : 'Upload Resource';

  const examParams = new URLSearchParams();
  if (firstBranch) examParams.set('branch', firstBranch);
  if (firstSemester) examParams.set('semester', String(firstSemester));
  if (summary?.subjectName) examParams.set('subject', summary.subjectName);
  const examModePath = `/exam-mode${examParams.toString() ? `?${examParams.toString()}` : ''}`;
  const studyQuery = `?subjectCode=${encodeURIComponent(subjectCode)}`;

  if (loading) {
    return (
      <main className="subject-hub-page subject-hub-loading-page">
        <div className="subject-hub-loading-card">
          <div className="subject-hub-spinner" />
          <h2>Building your subject hub...</h2>
          <p>Loading papers, solutions, and resource statistics.</p>
        </div>
      </main>
    );
  }

  if (error || !summary) {
    return (
      <main className="subject-hub-page">
        <Helmet>
          <title>Subject not found - PaperStack</title>
        </Helmet>
        <section className="subject-hub-error-card">
          <span>Subject Hub</span>
          <h1>We could not find resources for this subject.</h1>
          <p>{error || 'No resources are available yet.'}</p>
          <div>
            <Link to="/">Back to papers</Link>
            <Link to={contributionPath}>Contribute</Link>
          </div>
        </section>
      </main>
    );
  }

  const canonicalKey = summary.subjectKey || subjectKey;
  const canonicalUrl = `${FRONTEND_URL.replace(/\/$/, '')}/subject/${encodeURIComponent(canonicalKey)}`;
  const currentTab = RESOURCE_TABS.find((tab) => tab.value === activeKind) || RESOURCE_TABS[0];

  return (
    <main className="subject-hub-page">
      <Helmet>
        <title>{subjectName} ({subjectCode}) - PaperStack</title>
        <meta
          name="description"
          content={`IIIT Surat ${subjectName} subject hub with previous papers, solutions, resources, exam statistics, and preparation tools.`}
        />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      <div className="subject-hub-breadcrumbs">
        <Link to="/">PaperStack</Link>
        <span>/</span>
        <span>{subjectName}</span>
      </div>

      <section className="subject-hub-hero">
        <div className="subject-hub-hero-copy">
          <span className="subject-hub-eyebrow">Subject library</span>
          <div className="subject-hub-title-row">
            <div className="subject-hub-code-badge">{summary.subjectShortCode || subjectCode}</div>
            <div>
              <h1>{subjectName}</h1>
              <p>{subjectCode}{semesterText ? ` • ${semesterText}` : ''}{branchText ? ` • ${branchText}` : ''}</p>
            </div>
          </div>
          <p className="subject-hub-description">{summary.kindCounts?.question_paper || 0} papers · {summary.kindCounts?.solution || 0} solutions · {(summary.years || []).length} years in the archive</p>
          <div className="subject-hub-hero-actions">
            <Link to={examModePath} className="subject-hub-primary-action">Open Exam Mode</Link>
            <Link to={contributionPath} className="subject-hub-secondary-action">Contribute Paper</Link>
            <Link to={resourceContributionPath} className="subject-hub-secondary-action subject-hub-resource-upload-action">Upload Resource</Link>
          </div>
        </div>

      </section>

      <nav className="subject-hub-tools" aria-label="Study this subject">
        <Link to={`/questions${studyQuery}`}>Practice questions</Link>
        <Link to={`/pyq-intelligence${studyQuery}`}>PYQ patterns</Link>
        <Link to={`/important-topics${studyQuery}`}>Important topics</Link>
        <Link to={`/revision-sheets${studyQuery}`}>Revision sheet</Link>
        <Link to={`/exam-war-room${studyQuery}`}>Exam War Room</Link>
        <Link to={`/mock-exams${studyQuery}`}>Mock exam</Link>
      </nav>

      <section className="subject-hub-resources" id="resources">
        <div className="subject-hub-section-heading subject-hub-resource-heading">
          <div>
            <span>Resource Library</span>
            <h2>{currentTab.label}</h2>
          </div>
          <div className="subject-hub-resource-heading-actions">
            <p>{filteredResources.length} of {resources.length} resources</p>
            <Link to={activeUploadPath} className="subject-hub-upload-resource-btn">
              + {activeUploadLabel}
            </Link>
          </div>
        </div>

        <div className="subject-hub-tabs" role="group" aria-label="Filter by resource type">
          {RESOURCE_TABS.map((tab) => {
            const count = tab.value === 'all' ? resources.length
              : resources.filter((resource) => resource.kind === tab.value).length;
            const selected = activeKind === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                aria-pressed={selected}
                className={selected ? 'active' : ''}
                onClick={() => setActiveKind(tab.value)}
              >
                <span>{tab.value === 'question_paper' ? 'Papers' : tab.label}</span>
                <b>{count}</b>
              </button>
            );
          })}
        </div>

        <div className="subject-hub-filter-bar">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search this subject..."
            aria-label="Search subject resources"
          />
          <select aria-label="Year" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
            <option value="">All years</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <select aria-label="Exam type" value={examFilter} onChange={(event) => setExamFilter(event.target.value)}>
            <option value="">All exam types</option>
            {examTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          {(query || yearFilter || examFilter) && (
            <button type="button" onClick={() => { setQuery(''); setYearFilter(''); setExamFilter(''); }}>Clear</button>
          )}
        </div>

        {filteredResources.length ? (
          <div className="subject-hub-resource-grid">
            {filteredResources.map((resource) => (
              <ResourceCard key={resource._id} resource={resource} user={user} toast={toast} navigate={navigate} />
            ))}
          </div>
        ) : (
          <EmptyResources
            label={currentTab.label}
            contributionPath={contributionPath}
            resourceContributionPath={resourceContributionPath}
            isPaperTab={isPaperTab}
          />
        )}
      </section>

    </main>
  );
}
