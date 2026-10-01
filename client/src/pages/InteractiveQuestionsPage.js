// import React, { useCallback, useEffect, useMemo, useState } from 'react';
// import { Helmet } from 'react-helmet-async';
// import {
//   Link,
//   useNavigate,
//   useParams,
//   useSearchParams,
// } from 'react-router-dom';

// import {
//   browseQuestions,
//   getQuestionDetail,
//   getQuestionFacets,
//   getRandomQuestion,
// } from '../services/questionBrowserApi';

// import QuestionSolutionsPanel from '../components/QuestionSolutionsPanel';
// import QuestionAssistantPanel from '../components/QuestionAssistantPanel';
// import './InteractiveQuestionsPage.css';

// const DEFAULT_FILTERS = {
//   q: '',
//   subjectCode: '',
//   branch: '',
//   semester: '',
//   year: '',
//   examType: '',
//   marks: '',
//   unit: '',
//   questionType: '',
//   difficulty: '',
//   topic: '',
//   sort: 'latest',
// };

// function readInitialFilters(searchParams) {
//   return Object.fromEntries(
//     Object.keys(DEFAULT_FILTERS).map((key) => [
//       key,
//       searchParams.get(key) || DEFAULT_FILTERS[key],
//     ])
//   );
// }

// function sourcePdfUrl(question) {
//   const base = question?.paper?.filePath || '';
//   if (!base) return '';

//   const page = Number(question?.sourceLocation?.pageStart || 0);
//   return page > 0 ? `${base}#page=${page}` : base;
// }

// function QuestionMeta({ question, hideSource = false }) {
//   return (
//     <div className="iq-meta">
//       {question.marks !== null && question.marks !== undefined && (
//         <span>{question.marks} mark{Number(question.marks) === 1 ? '' : 's'}</span>
//       )}
//       {question.primaryTopic && <span>{question.primaryTopic}</span>}
//       {question.unit && <span>Unit {question.unit}</span>}
//       {question.questionType && question.questionType !== 'unknown' && (
//         <span>{question.questionType}</span>
//       )}
//       {!hideSource && question.year && <span>{question.year}</span>}
//       {!hideSource && question.examType && <span>{question.examType}</span>}
//       {!hideSource && question.branch && <span>{question.branch}</span>}
//     </div>
//   );
// }

// function QuestionCard({ question, onCopy, navigate }) {
//   const sourceUrl = sourcePdfUrl(question);

//   return (
//     <article className={`iq-card ${question.needsReview ? 'needs-review' : ''}`}>
//       <div className="iq-card-top">
//         <div>
//           <span className="iq-question-label">{question.questionLabel}</span>
//           <span className="iq-source-subject">
//             {question.subjectCode || question.shortCode || ''} · {question.subject || 'Subject'}
//           </span>
//         </div>

//         {question.needsReview && (
//           <span className="iq-review-flag">Needs review</span>
//         )}
//       </div>

//       <p className="iq-question-text">{question.questionText}</p>

//       <QuestionMeta question={question} />

//       {Array.isArray(question.topics) && question.topics.length > 0 && (
//         <div className="iq-topics">
//           {question.topics.slice(0, 4).map((topic) => (
//             <span key={topic}>{topic}</span>
//           ))}
//         </div>
//       )}

//       <div className="iq-card-actions">
//         <button
//           type="button"
//           onClick={() => navigate(`/questions/${question._id}`)}
//         >
//           Open question
//         </button>

//         {sourceUrl && (
//           <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
//             Source PDF
//           </a>
//         )}

//         <button type="button" className="secondary" onClick={() => onCopy(question)}>
//           Copy link
//         </button>
//       </div>
//     </article>
//   );
// }

// function PracticePanel({
//   question,
//   loading,
//   revealed,
//   onReveal,
//   onAnother,
//   onClose,
// }) {
//   if (!question && !loading) return null;

//   return (
//     <section className="iq-practice">
//       <div className="iq-practice-head">
//         <div>
//           <span>Practice Mode</span>
//           <h2>Try this without seeing the source.</h2>
//         </div>
//         <button type="button" onClick={onClose}>Exit practice</button>
//       </div>

//       {loading ? (
//         <div className="iq-practice-loading">Picking a question…</div>
//       ) : (
//         <>
//           <div className="iq-practice-question">
//             <span className="iq-question-label">{question.questionLabel}</span>
//             <p>{question.questionText}</p>
//             <QuestionMeta question={question} hideSource={!revealed} />
//           </div>

//           {!revealed ? (
//             <button className="iq-reveal" type="button" onClick={onReveal}>
//               Reveal source & metadata
//             </button>
//           ) : (
//             <div className="iq-practice-source">
//               <div>
//                 <strong>{question.subject}</strong>
//                 <span>
//                   {question.subjectCode || question.shortCode || 'Subject'} · Semester {question.semester || '—'}
//                   {' · '}{question.year || 'Year'} · {question.examType || 'Exam'}
//                 </span>
//               </div>

//               {sourcePdfUrl(question) && (
//                 <a
//                   href={sourcePdfUrl(question)}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                 >
//                   Open source PDF
//                 </a>
//               )}
//             </div>
//           )}

//           <button className="iq-another" type="button" onClick={onAnother}>
//             Another question →
//           </button>
//         </>
//       )}
//     </section>
//   );
// }

// function QuestionDetail({ questionId, toast }) {
//   const navigate = useNavigate();
//   const [detail, setDetail] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [detailError, setDetailError] = useState('');
//   const [activePanel, setActivePanel] = useState('ask');
//   const [hasAnswer, setHasAnswer] = useState(false);

//   useEffect(() => {
//     let mounted = true;
//     setHasAnswer(false);
//     setActivePanel('ask');

//     async function load() {
//       setLoading(true);
//       setDetailError('');
//       try {
//         const data = await getQuestionDetail(questionId);
//         if (mounted) setDetail(data || null);
//       } catch (error) {
//         if (mounted) setDetailError(error.response?.data?.error || 'Could not load this question.');
//         if (toast) {
//           toast(
//             error.response?.data?.error || 'Could not load this question.',
//             'error'
//           );
//         }
//         if (mounted) setDetail(null);
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     }

//     load();
//     return () => { mounted = false; };
//   }, [questionId, toast]);

//   const copy = async () => {
//     const url = window.location.href;
//     try {
//       await navigator.clipboard.writeText(url);
//       if (toast) toast('Question link copied.', 'success');
//     } catch {
//       if (toast) toast('Could not copy the link.', 'error');
//     }
//   };

//   if (loading) {
//     return <div className="iq-detail-state">Loading question…</div>;
//   }

//   if (!detail?.question) {
//     return (
//       <div className="iq-detail-state">
//         <h2>{detailError || 'Question not found'}</h2>
//         <button type="button" onClick={() => navigate('/questions')}>
//           Back to questions
//         </button>
//       </div>
//     );
//   }

//   const question = {
//     ...detail.question,
//     paper: detail.paper || null,
//   };

//   return (
//     <section className="iq-detail">
//       <button
//         type="button"
//         className="iq-detail-back"
//         onClick={() => navigate('/questions')}
//       >
//         ← All questions
//       </button>

//       <div className={`iq-detail-layout${hasAnswer ? ' has-answer' : ''}`}>
//       <div className="iq-detail-card">
//         <div className="iq-detail-heading">
//           <div>
//             <span className="iq-question-label">{question.questionLabel}</span>
//             <h1>{question.subject}</h1>
//             <p>
//               {question.subjectCode || question.shortCode || 'Subject'}
//               {' · '}Semester {question.semester || '—'}
//             </p>
//           </div>

//           {question.needsReview && (
//             <span className="iq-review-flag">Needs review</span>
//           )}
//         </div>

//         <div className="iq-detail-question">
//           {question.questionText}
//         </div>

//         <QuestionMeta question={question} />

//         {Array.isArray(question.topics) && question.topics.length > 0 && (
//           <div className="iq-topics">
//             {question.topics.map((topic) => <span key={topic}>{topic}</span>)}
//           </div>
//         )}

//         <details className="iq-detail-provenance"><summary>Source details</summary>
//           <p>{question.year || 'Year unknown'} · {question.examType || 'Exam unknown'} · {question.branch || 'Branch unknown'} · Page {question.sourceLocation?.pageStart || 'unknown'}</p>
//           <p>Extraction: {question.extraction?.source || 'unknown'}{question.extraction?.confidence == null ? '' : ` · ${question.extraction.confidence}% confidence`}</p>
//         </details>

//         <div className="iq-detail-actions">
//           {sourcePdfUrl(question) && (
//             <a
//               href={sourcePdfUrl(question)}
//               target="_blank"
//               rel="noopener noreferrer"
//             >
//               Open source PDF
//             </a>
//           )}
//           <button type="button" onClick={copy}>Copy question link</button>
//         </div>
//       </div>
//       <div className="iq-detail-workspace">
//         <div className="iq-detail-tabs" role="tablist" aria-label="Question workspace">
//           <button type="button" role="tab" aria-selected={activePanel === 'ask'} onClick={() => setActivePanel('ask')}>Ask this question</button>
//           <button type="button" role="tab" aria-selected={activePanel === 'solutions'} onClick={() => setActivePanel('solutions')}>Solutions</button>
//         </div>
//         <div hidden={activePanel !== 'ask'}>
//           <QuestionAssistantPanel question={question} toast={toast} onAnswered={() => setHasAnswer(true)} />
//         </div>
//         {activePanel === 'solutions' && <QuestionSolutionsPanel question={question} toast={toast} />}
//       </div>
//       </div>
//     </section>
//   );
// }

// export default function InteractiveQuestionsPage({ toast }) {
//   const navigate = useNavigate();
//   const { questionId } = useParams();
//   const [searchParams, setSearchParams] = useSearchParams();

//   const [facets, setFacets] = useState(null);
//   const [filters, setFilters] = useState(() => readInitialFilters(searchParams));
//   const [questions, setQuestions] = useState([]);
//   const [total, setTotal] = useState(0);
//   const [totalPages, setTotalPages] = useState(1);
//   const [page, setPage] = useState(Number(searchParams.get('page') || 1));
//   const [loading, setLoading] = useState(true);
//   const [loadError, setLoadError] = useState('');

//   const [practiceOpen, setPracticeOpen] = useState(false);
//   const [practiceQuestion, setPracticeQuestion] = useState(null);
//   const [practiceLoading, setPracticeLoading] = useState(false);
//   const [practiceRevealed, setPracticeRevealed] = useState(false);

//   const activeFilters = useMemo(() => ({
//     ...filters,
//     page,
//     limit: 24,
//   }), [filters, page]);

//   const syncUrl = useCallback((nextFilters, nextPage) => {
//     const params = {};

//     Object.entries(nextFilters).forEach(([key, value]) => {
//       if (
//         value !== '' &&
//         value !== null &&
//         value !== undefined &&
//         value !== DEFAULT_FILTERS[key]
//       ) {
//         params[key] = String(value);
//       }
//     });

//     if (nextPage > 1) params.page = String(nextPage);
//     setSearchParams(params, { replace: true });
//   }, [setSearchParams]);

//   const loadQuestions = useCallback(async () => {
//     setLoading(true);

//     try {
//       const data = await browseQuestions(activeFilters);
//       setQuestions(data?.questions || []);
//       setTotal(Number(data?.total || 0));
//       setTotalPages(Number(data?.totalPages || 1));
//       setLoadError('');
//     } catch (error) {
//       setLoadError(error.response?.data?.error || 'Failed to load questions.');
//       if (toast) {
//         toast(
//           error.response?.data?.error || 'Failed to load questions.',
//           'error'
//         );
//       }
//       setQuestions([]);
//       setTotal(0);
//       setTotalPages(1);
//     } finally {
//       setLoading(false);
//     }
//   }, [activeFilters, toast]);

//   useEffect(() => {
//     if (questionId) return;

//     getQuestionFacets()
//       .then((data) => setFacets(data || null))
//       .catch(() => setFacets(null));
//   }, [questionId]);

//   useEffect(() => {
//     if (questionId) return;

//     const timer = setTimeout(() => {
//       syncUrl(filters, page);
//       loadQuestions();
//     }, filters.q ? 280 : 0);

//     return () => clearTimeout(timer);
//   }, [filters, page, questionId, syncUrl, loadQuestions]);

//   const updateFilter = (key, value) => {
//     setFilters((current) => ({
//       ...current,
//       [key]: value,
//     }));
//     setPage(1);
//   };

//   const clearFilters = () => {
//     setFilters({ ...DEFAULT_FILTERS });
//     setPage(1);
//   };

//   const practiceFilters = useMemo(() => {
//     const {
//       sort,
//       q,
//       ...rest
//     } = filters;

//     return {
//       ...rest,
//       q,
//     };
//   }, [filters]);

//   const pickPracticeQuestion = async () => {
//     setPracticeOpen(true);
//     setPracticeLoading(true);
//     setPracticeRevealed(false);

//     try {
//       const data = await getRandomQuestion(practiceFilters);
//       setPracticeQuestion(data?.question || null);

//       if (!data?.question && toast) {
//         toast('No question matches the current filters.', 'info');
//       }
//     } catch (error) {
//       if (toast) {
//         toast(
//           error.response?.data?.error || 'Could not pick a practice question.',
//           'error'
//         );
//       }
//       setPracticeQuestion(null);
//     } finally {
//       setPracticeLoading(false);
//     }
//   };

//   const copyQuestionLink = async (question) => {
//     const url = `${window.location.origin}/questions/${question._id}`;

//     try {
//       await navigator.clipboard.writeText(url);
//       if (toast) toast('Question link copied.', 'success');
//     } catch {
//       if (toast) toast('Could not copy the link.', 'error');
//     }
//   };

//   if (questionId) {
//     return (
//       <main className="iq-page iq-page-detail">
//         <Helmet>
//           <title>PYQ Question - PaperStack</title>
//         </Helmet>

//         <div className="iq-shell">
//           <QuestionDetail questionId={questionId} toast={toast} />
//         </div>
//       </main>
//     );
//   }

//   return (
//     <main className="iq-page">
//       <Helmet>
//         <title>Interactive PYQs - PaperStack</title>
//         <meta
//           name="description"
//           content="Search, filter, practice, and open individual IIIT Surat PYQ questions."
//         />
//       </Helmet>

//       <div className="iq-shell">
//         <section className="iq-hero">
//           <div>
//             <span>Question-Level PYQs</span>
//             <h1>Practice the archive question by question.</h1>
//             <p>
//               Search extracted PYQs directly instead of opening every PDF.
//               Filter by subject, year, marks, exam, topic, unit, and question type.
//             </p>
//           </div>

//           <div className="iq-hero-stat">
//             <strong>{Number(facets?.totalQuestions || 0).toLocaleString('en-IN')}</strong>
//             <span>extracted questions</span>
//             <button type="button" onClick={pickPracticeQuestion}>
//               Start Practice Mode
//             </button>
//           </div>
//         </section>

//         {practiceOpen && (
//           <PracticePanel
//             question={practiceQuestion}
//             loading={practiceLoading}
//             revealed={practiceRevealed}
//             onReveal={() => setPracticeRevealed(true)}
//             onAnother={pickPracticeQuestion}
//             onClose={() => {
//               setPracticeOpen(false);
//               setPracticeQuestion(null);
//               setPracticeRevealed(false);
//             }}
//           />
//         )}

//         <section className="iq-filter-panel">
//           <div className="iq-search-row">
//             <input
//               value={filters.q}
//               onChange={(event) => updateFilter('q', event.target.value)}
//               placeholder="Search question text… e.g. midpoint circle"
//             />

//             <select
//               value={filters.sort}
//               onChange={(event) => updateFilter('sort', event.target.value)}
//             >
//               <option value="latest">Latest first</option>
//               <option value="oldest">Oldest first</option>
//               <option value="marks-high">Highest marks</option>
//               <option value="marks-low">Lowest marks</option>
//               <option value="question-order">Question order</option>
//             </select>

//             <button type="button" onClick={clearFilters}>Clear filters</button>
//           </div>

//           <div className="iq-filter-grid">
//             <select
//               value={filters.subjectCode}
//               onChange={(event) => updateFilter('subjectCode', event.target.value)}
//             >
//               <option value="">All subjects</option>
//               {(facets?.subjects || []).map((item) => (
//                 <option
//                   key={`${item.subjectKey}-${item.subjectCode}`}
//                   value={item.subjectCode}
//                 >
//                   {item.subjectCode || item.shortCode || 'SUB'} · {item.subject} ({item.count})
//                 </option>
//               ))}
//             </select>

//             <select
//               value={filters.branch}
//               onChange={(event) => updateFilter('branch', event.target.value)}
//             >
//               <option value="">All branches</option>
//               {(facets?.branches || []).map((item) => (
//                 <option key={item.value} value={item.value}>
//                   {item.value} ({item.count})
//                 </option>
//               ))}
//             </select>

//             <select
//               value={filters.semester}
//               onChange={(event) => updateFilter('semester', event.target.value)}
//             >
//               <option value="">All semesters</option>
//               {(facets?.semesters || []).map((item) => (
//                 <option key={item.value} value={item.value}>
//                   Semester {item.value} ({item.count})
//                 </option>
//               ))}
//             </select>

//             <select
//               value={filters.year}
//               onChange={(event) => updateFilter('year', event.target.value)}
//             >
//               <option value="">All years</option>
//               {(facets?.years || []).map((item) => (
//                 <option key={item.value} value={item.value}>
//                   {item.value} ({item.count})
//                 </option>
//               ))}
//             </select>

//             <select
//               value={filters.examType}
//               onChange={(event) => updateFilter('examType', event.target.value)}
//             >
//               <option value="">All exam types</option>
//               {(facets?.examTypes || []).map((item) => (
//                 <option key={item.value} value={item.value}>
//                   {item.value} ({item.count})
//                 </option>
//               ))}
//             </select>

//             <select
//               value={filters.marks}
//               onChange={(event) => updateFilter('marks', event.target.value)}
//             >
//               <option value="">Any marks</option>
//               {(facets?.marks || []).map((item) => (
//                 <option key={item.value} value={item.value}>
//                   {item.value} marks ({item.count})
//                 </option>
//               ))}
//             </select>

//             <select
//               value={filters.unit}
//               onChange={(event) => updateFilter('unit', event.target.value)}
//             >
//               <option value="">Any unit</option>
//               {(facets?.units || []).map((item) => (
//                 <option key={item.value} value={item.value}>
//                   Unit {item.value} ({item.count})
//                 </option>
//               ))}
//             </select>

//             <select
//               value={filters.questionType}
//               onChange={(event) => updateFilter('questionType', event.target.value)}
//             >
//               <option value="">Any question type</option>
//               {(facets?.questionTypes || []).map((item) => (
//                 <option key={item.value} value={item.value}>
//                   {item.value} ({item.count})
//                 </option>
//               ))}
//             </select>

//             <select
//               value={filters.difficulty}
//               onChange={(event) => updateFilter('difficulty', event.target.value)}
//             >
//               <option value="">Any difficulty</option>
//               {(facets?.difficulties || []).map((item) => (
//                 <option key={item.value} value={item.value}>
//                   {item.value} ({item.count})
//                 </option>
//               ))}
//             </select>

//             <select
//               value={filters.topic}
//               onChange={(event) => updateFilter('topic', event.target.value)}
//             >
//               <option value="">Any topic</option>
//               {(facets?.topics || []).map((item) => (
//                 <option key={item.value} value={item.value}>
//                   {item.value} ({item.count})
//                 </option>
//               ))}
//             </select>
//           </div>
//         </section>

//         <div className="iq-result-head">
//           <div>
//             <span>Question Bank</span>
//             <strong>{total.toLocaleString('en-IN')} matching questions</strong>
//           </div>

//           {total > 0 && (
//             <span>Page {page} of {totalPages}</span>
//           )}
//         </div>

//         {loading ? (
//           <div className="iq-state">Loading questions…</div>
//         ) : questions.length ? (
//           <>
//             <section className="iq-grid">
//               {questions.map((question) => (
//                 <QuestionCard
//                   key={question._id}
//                   question={question}
//                   onCopy={copyQuestionLink}
//                   navigate={navigate}
//                 />
//               ))}
//             </section>

//             <div className="iq-pagination">
//               <button
//                 type="button"
//                 disabled={page <= 1}
//                 onClick={() => setPage((current) => Math.max(1, current - 1))}
//               >
//                 ← Previous
//               </button>

//               <span>{page} / {totalPages}</span>

//               <button
//                 type="button"
//                 disabled={page >= totalPages}
//                 onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
//               >
//                 Next →
//               </button>
//             </div>
//           </>
//         ) : (
//           <section className="iq-state iq-empty">
//             <h2>{loadError || 'No extracted questions found.'}</h2>
//             {!loadError && <p>
//               Change the filters, or ask an admin to process papers from the
//               Question Extraction Console first.
//             </p>}
//             <Link to="/archive">Browse papers</Link>
//           </section>
//         )}
//       </div>
//     </main>
//   );
// }















import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Helmet } from 'react-helmet-async';

import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileQuestion,
  Filter,
  GraduationCap,
  Search,
  Shuffle,
  Sparkles,
  Target,
  X,
} from 'lucide-react';

import {
  browseQuestions,
  getQuestionDetail,
  getQuestionFacets,
  getRandomQuestion,
} from '../services/questionBrowserApi';

import QuestionSolutionsPanel from '../components/QuestionSolutionsPanel';
import QuestionAssistantPanel from '../components/QuestionAssistantPanel';
import QuestionText from '../components/QuestionText';
import SaveButton from '../components/SaveButton';
import RelatedPyqs from '../components/RelatedPyqs';
import { recordStudyProgressOnce } from '../services/studyProgressApi';
import '../components/StudentUtility.css';

import './InteractiveQuestionsPage.css';

/* =========================================================
   FILTERS
========================================================= */

const DEFAULT_FILTERS = {
  q: '',
  subjectCode: '',
  branch: '',
  semester: '',
  year: '',
  examType: '',
  marks: '',
  unit: '',
  questionType: '',
  difficulty: '',
  topic: '',
  sort: 'latest',
};

function readInitialFilters(searchParams) {
  return Object.fromEntries(
    Object.keys(DEFAULT_FILTERS).map((key) => [
      key,
      searchParams.get(key) || DEFAULT_FILTERS[key],
    ])
  );
}

/* =========================================================
   HELPERS
========================================================= */

function sourcePdfUrl(question) {
  const base = question?.paper?.filePath || '';

  if (!base) return '';

  const page = Number(
    question?.sourceLocation?.pageStart || 0
  );

  return page > 0
    ? `${base}#page=${page}`
    : base;
}

function formatCount(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

function getFacetCount(facet) {
  return Array.isArray(facet) ? facet.length : 0;
}

/* =========================================================
   META
========================================================= */

function QuestionMeta({
  question,
  hideSource = false,
}) {
  return (
    <div className="iq-meta">
      {question.marks !== null &&
        question.marks !== undefined && (
          <span className="iq-meta-primary">
            {question.marks}{' '}
            {Number(question.marks) === 1
              ? 'mark'
              : 'marks'}
          </span>
        )}

      {question.primaryTopic && (
        <span>{question.primaryTopic}</span>
      )}

      {question.unit && (
        <span>Unit {question.unit}</span>
      )}

      {question.questionType &&
        question.questionType !== 'unknown' && (
          <span>{question.questionType}</span>
        )}

      {!hideSource && question.year && (
        <span>{question.year}</span>
      )}

      {!hideSource && question.examType && (
        <span>{question.examType}</span>
      )}

      {!hideSource && question.branch && (
        <span>{question.branch}</span>
      )}
    </div>
  );
}

/* =========================================================
   QUESTION CARD
========================================================= */

function QuestionCard({
  question,
  onCopy,
  navigate,
  toast,
}) {
  const sourceUrl = sourcePdfUrl(question);

  const subjectCode =
    question.subjectCode ||
    question.shortCode ||
    '';

  return (
    <article
      className={`iq-card ${
        question.needsReview
          ? 'needs-review'
          : ''
      }`}
    >
      <div className="iq-card-accent" />

      <header className="iq-card-top">
        <div className="iq-card-identification">
          <span className="iq-question-label">
            {question.questionLabel ||
              'Question'}
          </span>

          <div className="iq-card-subject">
            <strong>
              {question.subject || 'Subject'}
            </strong>

            {subjectCode && (
              <small>{subjectCode}</small>
            )}
          </div>
        </div>

        {question.needsReview && (
          <span className="iq-review-flag">
            Needs review
          </span>
        )}
      </header>

      <div className="iq-card-question-wrap">
        <p className="iq-question-text">
          <QuestionText inline>{question.questionText}</QuestionText>
        </p>
      </div>

      <QuestionMeta question={question} />

      {Array.isArray(question.topics) &&
        question.topics.length > 0 && (
          <div className="iq-topics">
            {question.topics
              .slice(0, 4)
              .map((topic) => (
                <span key={topic}>
                  {topic}
                </span>
              ))}
          </div>
        )}

      <div className="iq-card-actions">
        <button
          type="button"
          className="iq-open-question"
          onClick={() =>
            navigate(
              `/questions/${question._id}`
            )
          }
        >
          <FileQuestion size={16} />
          Open Question
          <ArrowRight size={15} />
        </button>

        <div className="iq-card-utility-actions">
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open source PDF"
            >
              <ExternalLink size={15} />
              Source PDF
            </a>
          )}

          <button
            type="button"
            onClick={() =>
              onCopy(question)
            }
            title="Copy question link"
          >
            <Copy size={15} />
            Copy
          </button>

          <SaveButton entityType="question" entityId={question._id} title={question.questionText} route={`/questions/${question._id}`} subjectCode={question.subjectCode} toast={toast} />
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   PRACTICE MODE
========================================================= */

function PracticePanel({
  question,
  loading,
  revealed,
  onReveal,
  onAnother,
  onClose,
}) {
  if (!question && !loading) {
    return null;
  }

  return (
    <section className="iq-practice">
      <div className="iq-practice-decoration" />

      <header className="iq-practice-head">
        <div>
          <span className="iq-eyebrow">
            Practice Mode
          </span>

          <h2>
            Solve first. Check the source
            later.
          </h2>

          <p>
            PaperStack picked a question
            based on your current filters.
          </p>
        </div>

        <button
          type="button"
          className="iq-practice-close"
          onClick={onClose}
        >
          <X size={17} />
          Exit
        </button>
      </header>

      {loading ? (
        <div className="iq-practice-loading">
          <span className="iq-loading-orb" />

          <strong>
            Picking a question…
          </strong>

          <small>
            Finding something useful from
            the archive.
          </small>
        </div>
      ) : (
        <>
          <div className="iq-practice-question">
            <div className="iq-practice-question-top">
              <span className="iq-question-label">
                {question.questionLabel}
              </span>

              {!revealed && (
                <span className="iq-hidden-source">
                  Source hidden
                </span>
              )}
            </div>

            <p><QuestionText inline>{question.questionText}</QuestionText></p>

            <QuestionMeta
              question={question}
              hideSource={!revealed}
            />
          </div>

          <div className="iq-practice-bottom">
            {!revealed ? (
              <button
                className="iq-reveal"
                type="button"
                onClick={onReveal}
              >
                <Sparkles size={17} />
                Reveal Source & Metadata
              </button>
            ) : (
              <div className="iq-practice-source">
                <div>
                  <strong>
                    {question.subject}
                  </strong>

                  <span>
                    {question.subjectCode ||
                      question.shortCode ||
                      'Subject'}
                    {' · '}
                    Semester{' '}
                    {question.semester || '—'}
                    {' · '}
                    {question.year || 'Year'}
                    {' · '}
                    {question.examType ||
                      'Exam'}
                  </span>
                </div>

                {sourcePdfUrl(question) && (
                  <a
                    href={sourcePdfUrl(
                      question
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={15} />
                    Open PDF
                  </a>
                )}
              </div>
            )}

            <button
              className="iq-another"
              type="button"
              onClick={onAnother}
            >
              <Shuffle size={16} />
              Another Question
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/* =========================================================
   QUESTION DETAIL
========================================================= */

function QuestionDetail({
  questionId,
  toast,
}) {
  const navigate = useNavigate();

  const [detail, setDetail] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [
    detailError,
    setDetailError,
  ] = useState('');

  const [
    activePanel,
    setActivePanel,
  ] = useState('ask');

  const [
    hasAnswer,
    setHasAnswer,
  ] = useState(false);

  useEffect(() => {
    let mounted = true;

    setHasAnswer(false);
    setActivePanel('ask');

    async function load() {
      setLoading(true);
      setDetailError('');

      try {
        const data =
          await getQuestionDetail(
            questionId
          );

        if (mounted) {
          setDetail(data || null);
          if (data?.question) {
            recordStudyProgressOnce({
              entityType: 'question',
              entityId: data.question._id,
              title: `${data.question.subject || 'Question'} · ${data.question.questionLabel || ''}`,
              route: `/questions/${data.question._id}`,
              subjectCode: data.question.subjectCode || '',
              status: 'in_progress',
              progress: 10,
            }).catch(() => {});
          }
        }
      } catch (error) {
        const message =
          error.response?.data?.error ||
          'Could not load this question.';

        if (mounted) {
          setDetailError(message);
          setDetail(null);
        }

        if (toast) {
          toast(message, 'error');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [questionId, toast]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        window.location.href
      );

      toast?.(
        'Question link copied.',
        'success'
      );
    } catch {
      toast?.(
        'Could not copy the link.',
        'error'
      );
    }
  };

  if (loading) {
    return (
      <div className="iq-detail-state">
        <span className="iq-loading-orb" />
        Loading question…
      </div>
    );
  }

  if (!detail?.question) {
    return (
      <div className="iq-detail-state">
        <FileQuestion size={38} />

        <h2>
          {detailError ||
            'Question not found'}
        </h2>

        <button
          type="button"
          onClick={() =>
            navigate('/questions')
          }
        >
          Back to Questions
        </button>
      </div>
    );
  }

  const question = {
    ...detail.question,
    paper: detail.paper || null,
  };

  return (
    <section className="iq-detail">
      <button
        type="button"
        className="iq-detail-back"
        onClick={() =>
          navigate('/questions')
        }
      >
        <ArrowLeft size={17} />
        All Questions
      </button>

      <div
        className={`iq-detail-layout ${
          hasAnswer
            ? 'has-answer'
            : ''
        }`}
      >
        <article className="iq-detail-card">
          <div className="iq-detail-heading">
            <div>
              <span className="iq-question-label">
                {question.questionLabel}
              </span>

              <h1>
                {question.subject}
              </h1>

              <p>
                {question.subjectCode ||
                  question.shortCode ||
                  'Subject'}
                {' · '}
                Semester{' '}
                {question.semester || '—'}
              </p>
            </div>

            {question.needsReview && (
              <span className="iq-review-flag">
                Needs review
              </span>
            )}
          </div>

          <div className="iq-detail-question">
            <QuestionText>{question.questionText}</QuestionText>
          </div>

          <QuestionMeta
            question={question}
          />

          {Array.isArray(
            question.topics
          ) &&
            question.topics.length >
              0 && (
              <div className="iq-topics">
                {question.topics.map(
                  (topic) => (
                    <span key={topic}>
                      {topic}
                    </span>
                  )
                )}
              </div>
            )}

          <details className="iq-detail-provenance">
            <summary>
              Source details
            </summary>

            <p>
              {question.year ||
                'Year unknown'}
              {' · '}
              {question.examType ||
                'Exam unknown'}
              {' · '}
              {question.branch ||
                'Branch unknown'}
              {' · '}
              Page{' '}
              {question.sourceLocation
                ?.pageStart ||
                'unknown'}
            </p>

            <p>
              Extraction:{' '}
              {question.extraction
                ?.source || 'unknown'}

              {question.extraction
                ?.confidence == null
                ? ''
                : ` · ${question.extraction.confidence}% confidence`}
            </p>
          </details>

          <div className="iq-detail-actions">
            {sourcePdfUrl(question) && (
              <a
                href={sourcePdfUrl(
                  question
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={16} />
                Open Source PDF
              </a>
            )}

            <button
              type="button"
              onClick={copy}
            >
              <Copy size={16} />
              Copy Link
            </button>

            <SaveButton entityType="question" entityId={question._id} title={question.questionText} route={`/questions/${question._id}`} subjectCode={question.subjectCode} toast={toast} />
          </div>
          <RelatedPyqs questions={detail.relatedQuestions || []} />
        </article>

        <section className="iq-detail-workspace">
          <div
            className="iq-detail-tabs"
            role="tablist"
            aria-label="Question workspace"
          >
            <button
              type="button"
              role="tab"
              aria-selected={
                activePanel === 'ask'
              }
              onClick={() =>
                setActivePanel('ask')
              }
            >
              <Sparkles size={17} />
              Ask PaperStack
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={
                activePanel ===
                'solutions'
              }
              onClick={() =>
                setActivePanel(
                  'solutions'
                )
              }
            >
              <BookOpen size={17} />
              Solutions
            </button>
          </div>

          <div
            hidden={
              activePanel !== 'ask'
            }
          >
            <QuestionAssistantPanel
              question={question}
              toast={toast}
              onAnswered={() =>
                setHasAnswer(true)
              }
            />
          </div>

          {activePanel ===
            'solutions' && (
            <QuestionSolutionsPanel
              question={question}
              toast={toast}
            />
          )}
        </section>
      </div>
    </section>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function InteractiveQuestionsPage({
  toast,
}) {
  const navigate = useNavigate();

  const { questionId } =
    useParams();

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const [facets, setFacets] =
    useState(null);

  const [filters, setFilters] =
    useState(() =>
      readInitialFilters(
        searchParams
      )
    );

  const [questions, setQuestions] =
    useState([]);

  const [total, setTotal] =
    useState(0);

  const [
    totalPages,
    setTotalPages,
  ] = useState(1);

  const [page, setPage] = useState(
    Number(
      searchParams.get('page') || 1
    )
  );

  const [loading, setLoading] =
    useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState('');

  const [
    practiceOpen,
    setPracticeOpen,
  ] = useState(false);

  const [
    practiceQuestion,
    setPracticeQuestion,
  ] = useState(null);

  const [
    practiceLoading,
    setPracticeLoading,
  ] = useState(false);

  const [
    practiceRevealed,
    setPracticeRevealed,
  ] = useState(false);

  const [
    filtersExpanded,
    setFiltersExpanded,
  ] = useState(false);

  /* ========================
     FILTER DATA
  ======================== */

  const activeFilters =
    useMemo(
      () => ({
        ...filters,
        page,
        limit: 24,
      }),
      [filters, page]
    );

  const activeFilterCount =
    useMemo(() => {
      return Object.entries(
        filters
      ).filter(
        ([key, value]) =>
          key !== 'sort' &&
          value !== '' &&
          value !== null &&
          value !== undefined
      ).length;
    }, [filters]);

  const syncUrl = useCallback(
    (nextFilters, nextPage) => {
      const params = {};

      Object.entries(
        nextFilters
      ).forEach(([key, value]) => {
        if (
          value !== '' &&
          value !== null &&
          value !== undefined &&
          value !==
            DEFAULT_FILTERS[key]
        ) {
          params[key] =
            String(value);
        }
      });

      if (nextPage > 1) {
        params.page =
          String(nextPage);
      }

      setSearchParams(params, {
        replace: true,
      });
    },
    [setSearchParams]
  );

  /* ========================
     LOAD QUESTIONS
  ======================== */

  const loadQuestions =
    useCallback(async () => {
      setLoading(true);

      try {
        const data =
          await browseQuestions(
            activeFilters
          );

        setQuestions(
          data?.questions || []
        );

        setTotal(
          Number(data?.total || 0)
        );

        setTotalPages(
          Number(
            data?.totalPages || 1
          )
        );

        setLoadError('');
      } catch (error) {
        const message =
          error.response?.data
            ?.error ||
          'Failed to load questions.';

        setLoadError(message);

        toast?.(
          message,
          'error'
        );

        setQuestions([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }, [
      activeFilters,
      toast,
    ]);

  useEffect(() => {
    if (questionId) return;

    getQuestionFacets()
      .then((data) =>
        setFacets(data || null)
      )
      .catch(() =>
        setFacets(null)
      );
  }, [questionId]);

  useEffect(() => {
    if (questionId) return;

    const timer = setTimeout(
      () => {
        syncUrl(filters, page);
        loadQuestions();
      },
      filters.q ? 280 : 0
    );

    return () =>
      clearTimeout(timer);
  }, [
    filters,
    page,
    questionId,
    syncUrl,
    loadQuestions,
  ]);

  /* ========================
     ACTIONS
  ======================== */

  const updateFilter = (
    key,
    value
  ) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));

    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      ...DEFAULT_FILTERS,
    });

    setPage(1);
  };

  const practiceFilters =
    useMemo(() => {
      const {
        sort,
        ...rest
      } = filters;

      return rest;
    }, [filters]);

  const pickPracticeQuestion =
    async () => {
      setPracticeOpen(true);
      setPracticeLoading(true);
      setPracticeRevealed(false);

      try {
        const data =
          await getRandomQuestion(
            practiceFilters
          );

        setPracticeQuestion(
          data?.question || null
        );

        if (
          !data?.question &&
          toast
        ) {
          toast(
            'No question matches the current filters.',
            'info'
          );
        }
      } catch (error) {
        toast?.(
          error.response?.data
            ?.error ||
            'Could not pick a practice question.',
          'error'
        );

        setPracticeQuestion(null);
      } finally {
        setPracticeLoading(false);
      }
    };

  const copyQuestionLink =
    async (question) => {
      const url = `${window.location.origin}/questions/${question._id}`;

      try {
        await navigator.clipboard.writeText(
          url
        );

        toast?.(
          'Question link copied.',
          'success'
        );
      } catch {
        toast?.(
          'Could not copy the link.',
          'error'
        );
      }
    };

  /* ========================
     DETAIL PAGE
  ======================== */

  if (questionId) {
    return (
      <main className="iq-page iq-page-detail">
        <Helmet>
          <title>
            PYQ Question - PaperStack
          </title>
        </Helmet>

        <div className="iq-shell">
          <QuestionDetail
            questionId={questionId}
            toast={toast}
          />
        </div>
      </main>
    );
  }

  const subjectCount =
    getFacetCount(
      facets?.subjects
    );

  const yearCount =
    getFacetCount(
      facets?.years
    );

  /* =========================================================
     BROWSE PAGE
  ========================================================= */

  return (
    <main className="iq-page">
      <Helmet>
        <title>
          Questions - PaperStack
        </title>

        <meta
          name="description"
          content="Search, filter, practice and study IIIT Surat previous-year questions with PaperStack."
        />
      </Helmet>

      <div className="iq-shell">
        {/* HERO */}

        <section className="iq-hero">
          <div className="iq-hero-copy">
            <span className="iq-eyebrow">
              <FileQuestion size={15} />
              Question Bank
            </span>

            <h1>
              Find a question.
              <br />

              <span>
                Start practising.
              </span>
            </h1>

            <p>
              Search the archive or start a focused practice question.
            </p>

            <div className="iq-hero-actions">
              <button
                type="button"
                className="iq-practice-primary"
                onClick={
                  pickPracticeQuestion
                }
              >
                <Target size={18} />
                Start Practice
                <ArrowRight size={16} />
              </button>

              <Link
                to="/pyq-intelligence"
                className="iq-intelligence-link"
              >
                <Sparkles size={17} />
                PYQ Intelligence
              </Link>
            </div>
          </div>

          <div className="iq-hero-dashboard">
            <div className="iq-hero-count">
              <div className="iq-hero-count-icon">
                <FileQuestion
                  size={27}
                />
              </div>

              <div>
                <strong>
                  {formatCount(
                    facets?.totalQuestions
                  )}
                </strong>

                <span>
                  extracted questions
                </span>
              </div>
            </div>

            <div className="iq-hero-mini-stats">
              <div>
                <BookOpen size={18} />

                <span>
                  <strong>
                    {subjectCount ||
                      '—'}
                  </strong>

                  Subjects
                </span>
              </div>

              <div>
                <GraduationCap
                  size={18}
                />

                <span>
                  <strong>
                    {yearCount || '—'}
                  </strong>

                  Exam years
                </span>
              </div>
            </div>

            <div className="iq-hero-tip">
              <Sparkles size={17} />

              <p>
                Pick filters first, then
                Practice Mode can generate a
                random question from that
                exact selection.
              </p>
            </div>
          </div>
        </section>

        {/* PRACTICE */}

        {practiceOpen && (
          <PracticePanel
            question={
              practiceQuestion
            }
            loading={
              practiceLoading
            }
            revealed={
              practiceRevealed
            }
            onReveal={() =>
              setPracticeRevealed(true)
            }
            onAnother={
              pickPracticeQuestion
            }
            onClose={() => {
              setPracticeOpen(false);
              setPracticeQuestion(null);
              setPracticeRevealed(false);
            }}
          />
        )}

        {/* SEARCH / FILTERS */}

        <section className="iq-filter-panel">
          <div className="iq-filter-heading">
            <div>
              <span className="iq-filter-icon">
                <Search size={20} />
              </span>

              <div>
                <h2>
                  Search questions
                </h2>

                <p>
                  Add filters only when you need them.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="iq-filter-toggle"
              onClick={() =>
                setFiltersExpanded(
                  (open) => !open
                )
              }
            >
              <Filter size={16} />

              Filters

              {activeFilterCount > 0 && (
                <span>
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="iq-search-row">
            <label className="iq-search-input">
              <Search size={19} />

              <input
                value={filters.q}
                onChange={(event) =>
                  updateFilter(
                    'q',
                    event.target.value
                  )
                }
                placeholder="Search questions... e.g. midpoint circle, Amdahl's law"
              />

              {filters.q && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() =>
                    updateFilter(
                      'q',
                      ''
                    )
                  }
                >
                  <X size={16} />
                </button>
              )}
            </label>

            <select
              value={filters.sort}
              onChange={(event) =>
                updateFilter(
                  'sort',
                  event.target.value
                )
              }
            >
              <option value="latest">
                Latest first
              </option>

              <option value="oldest">
                Oldest first
              </option>

              <option value="marks-high">
                Highest marks
              </option>

              <option value="marks-low">
                Lowest marks
              </option>

              <option value="question-order">
                Question order
              </option>
            </select>

            <button
              type="button"
              className="iq-clear"
              onClick={clearFilters}
            >
              <X size={16} />
              Clear
            </button>
          </div>

          {filtersExpanded && (
            <div className="iq-filter-grid">
              <label>
                <span>Subject</span>

                <select
                  value={
                    filters.subjectCode
                  }
                  onChange={(event) =>
                    updateFilter(
                      'subjectCode',
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    All subjects
                  </option>

                  {(facets?.subjects ||
                    []).map((item) => (
                    <option
                      key={`${item.subjectKey}-${item.subjectCode}`}
                      value={
                        item.subjectCode
                      }
                    >
                      {item.subjectCode ||
                        item.shortCode ||
                        'SUB'}
                      {' · '}
                      {item.subject}
                      {' ('}
                      {item.count}
                      {')'}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Branch</span>

                <select
                  value={
                    filters.branch
                  }
                  onChange={(event) =>
                    updateFilter(
                      'branch',
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    All branches
                  </option>

                  {(facets?.branches ||
                    []).map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.value} (
                      {item.count})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Semester</span>

                <select
                  value={
                    filters.semester
                  }
                  onChange={(event) =>
                    updateFilter(
                      'semester',
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    All semesters
                  </option>

                  {(facets?.semesters ||
                    []).map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      Semester{' '}
                      {item.value} (
                      {item.count})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Year</span>

                <select
                  value={filters.year}
                  onChange={(event) =>
                    updateFilter(
                      'year',
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    All years
                  </option>

                  {(facets?.years ||
                    []).map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.value} (
                      {item.count})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Exam type</span>

                <select
                  value={
                    filters.examType
                  }
                  onChange={(event) =>
                    updateFilter(
                      'examType',
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    All exam types
                  </option>

                  {(facets?.examTypes ||
                    []).map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.value} (
                      {item.count})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Marks</span>

                <select
                  value={filters.marks}
                  onChange={(event) =>
                    updateFilter(
                      'marks',
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Any marks
                  </option>

                  {(facets?.marks ||
                    []).map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.value} marks (
                      {item.count})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Unit</span>

                <select
                  value={filters.unit}
                  onChange={(event) =>
                    updateFilter(
                      'unit',
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Any unit
                  </option>

                  {(facets?.units ||
                    []).map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      Unit {item.value} (
                      {item.count})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>
                  Question type
                </span>

                <select
                  value={
                    filters.questionType
                  }
                  onChange={(event) =>
                    updateFilter(
                      'questionType',
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Any question type
                  </option>

                  {(facets?.questionTypes ||
                    []).map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.value} (
                      {item.count})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>
                  Difficulty
                </span>

                <select
                  value={
                    filters.difficulty
                  }
                  onChange={(event) =>
                    updateFilter(
                      'difficulty',
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Any difficulty
                  </option>

                  {(facets?.difficulties ||
                    []).map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.value} (
                      {item.count})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Topic</span>

                <select
                  value={filters.topic}
                  onChange={(event) =>
                    updateFilter(
                      'topic',
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Any topic
                  </option>

                  {(facets?.topics ||
                    []).map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.value} (
                      {item.count})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </section>

        {/* RESULTS */}

        <div className="iq-result-head">
          <div>
            <span className="iq-eyebrow">
              Question Bank
            </span>

            <h2>
              {formatCount(total)}{' '}
              matching questions
            </h2>

            <p>
              Open a question for
              PaperStack AI, solutions and
              source details.
            </p>
          </div>

          {total > 0 && (
            <span className="iq-page-counter">
              Page {page} of{' '}
              {totalPages}
            </span>
          )}
        </div>

        {loading ? (
          <div className="iq-state">
            <span className="iq-loading-orb" />

            <strong>
              Loading questions…
            </strong>
          </div>
        ) : questions.length ? (
          <>
            <section className="iq-grid">
              {questions.map(
                (question) => (
                  <QuestionCard
                    key={question._id}
                    question={question}
                    onCopy={
                      copyQuestionLink
                    }
                    navigate={
                      navigate
                    }
                    toast={toast}
                  />
                )
              )}
            </section>

            <nav
              className="iq-pagination"
              aria-label="Question pages"
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  setPage((current) =>
                    Math.max(
                      1,
                      current - 1
                    )
                  )
                }
              >
                <ChevronLeft
                  size={17}
                />
                Previous
              </button>

              <span>
                <strong>{page}</strong>
                <small>
                  of {totalPages}
                </small>
              </span>

              <button
                type="button"
                disabled={
                  page >= totalPages
                }
                onClick={() =>
                  setPage((current) =>
                    Math.min(
                      totalPages,
                      current + 1
                    )
                  )
                }
              >
                Next
                <ChevronRight
                  size={17}
                />
              </button>
            </nav>
          </>
        ) : (
          <section className="iq-state iq-empty">
            <FileQuestion size={38} />

            <h2>
              {loadError ||
                'No matching questions found.'}
            </h2>

            {!loadError && (
              <p>
                Try changing the filters or
                search text. More questions
                appear as papers are
                processed by PaperStack.
              </p>
            )}

            <div className="iq-empty-actions">
              <button
                type="button"
                onClick={clearFilters}
              >
                Clear Filters
              </button>

              <Link to="/archive">
                Browse Papers
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
