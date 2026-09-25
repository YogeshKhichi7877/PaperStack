/*
 * PaperStack Feature #3.1 - Smart Contribution Flow UX
 * Run from the PaperStack repository root AFTER Feature #3:
 *   node apply-feature-03-1.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PATCH_ROOT = path.join(__dirname, 'patch-files');
const CLIENT_APP = path.join(ROOT, 'client', 'src', 'App.js');
const SMART_UPLOAD_JS = path.join(ROOT, 'client', 'src', 'components', 'SmartPaperUpload.js');
const SMART_UPLOAD_CSS = path.join(ROOT, 'client', 'src', 'components', 'SmartPaperUpload.css');
const BACKUP_ROOT = path.join(ROOT, '.paperstack-backups', 'feature-03-1-original');

const NEW_COMPONENT = `function ContributePageNew({ user, setUser, theme, toggleTheme, isAdmin, setIsAdmin, toast }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user && !localStorage.getItem('token')) {
      toast('Please login with your IIIT Surat account to continue.', 'info');
      navigate(\`/login?redirect=\${encodeURIComponent(location.pathname + location.search)}\`);
    }
  }, [user, navigate, location, toast]);

  const queryParams = new URLSearchParams(location.search);
  const [uploadMode, setUploadMode] = useState('smart');
  const [formData, setFormData] = useState({
    subject: queryParams.get('subject') || '',
    subjectCode: queryParams.get('subjectCode') || '',
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
  const [analyzingPaper, setAnalyzingPaper] = useState(false);
  const [paperAnalysis, setPaperAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState('');

  const validatePaperFile = useCallback((selectedFile) => {
    if (!selectedFile) return false;
    const isPdf = selectedFile.type === 'application/pdf' || /\\.pdf$/i.test(selectedFile.name || '');
    if (!isPdf) {
      toast('Please select a PDF question paper.', 'warning');
      return false;
    }
    if (selectedFile.size > 30 * 1024 * 1024) {
      toast('Paper PDF must be 30 MB or smaller.', 'warning');
      return false;
    }
    return true;
  }, [toast]);

  const applyDetectedMetadata = useCallback((analysis) => {
    const metadata = analysis?.metadata || {};
    setFormData((current) => ({
      ...current,
      subject: metadata.subjectName || current.subject,
      subjectCode: metadata.subjectCode || current.subjectCode,
      branch: metadata.branch || current.branch,
      semester: metadata.semester ? String(metadata.semester) : current.semester,
      year: metadata.year ? String(metadata.year) : current.year,
      examType: metadata.examType || current.examType,
      title: current.title?.trim() ? current.title : (metadata.title || current.title),
    }));
  }, []);

  const analyzeSelectedPaper = useCallback(async (selectedFile) => {
    if (!selectedFile) return;
    setAnalyzingPaper(true);
    setAnalysisError('');
    setPaperAnalysis(null);
    try {
      const analysis = await analyzeContributionPdf(selectedFile);
      setPaperAnalysis(analysis);
      applyDetectedMetadata(analysis);
      if (analysis?.status === 'ready') {
        toast('Paper details detected. Review them and submit.', 'success');
      } else {
        toast('Paper analyzed. Please review the uncertain fields.', 'info');
      }
    } catch (error) {
      console.error('Smart contribution analysis failed:', error.response?.data || error.message);
      setAnalysisError(error.response?.data?.error || 'Automatic metadata detection failed.');
      toast('Automatic detection could not finish. You can edit the fields manually.', 'warning');
    } finally {
      setAnalyzingPaper(false);
    }
  }, [applyDetectedMetadata, toast]);

  const handleSmartPaperSelection = useCallback((selectedFile) => {
    if (!validatePaperFile(selectedFile)) return;
    setPaperFile(selectedFile);
    setPaperAnalysis(null);
    setAnalysisError('');
    setUploadProgress(0);
    analyzeSelectedPaper(selectedFile);
  }, [analyzeSelectedPaper, validatePaperFile]);

  const handleManualPaperSelection = useCallback((selectedFile) => {
    if (!validatePaperFile(selectedFile)) return;
    setPaperFile(selectedFile);
    setPaperAnalysis(null);
    setAnalysisError('');
    setUploadProgress(0);
  }, [validatePaperFile]);

  const handleAnalyzeAgain = useCallback(() => {
    if (paperFile) analyzeSelectedPaper(paperFile);
  }, [paperFile, analyzeSelectedPaper]);

  const changeUploadMode = useCallback((nextMode) => {
    setUploadMode(nextMode);
    setUploadProgress(0);
    if (nextMode === 'smart' && paperFile && !paperAnalysis && !analyzingPaper) {
      analyzeSelectedPaper(paperFile);
    }
  }, [paperFile, paperAnalysis, analyzingPaper, analyzeSelectedPaper]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (analyzingPaper) {
      toast('Please wait for paper analysis to finish.', 'info');
      return;
    }
    if (!formData.confirmChecked) {
      toast('Please confirm the paper information is correct.', 'warning');
      return;
    }
    if (!paperFile) {
      toast('Paper PDF file is required.', 'warning');
      return;
    }
    if (!formData.subject.trim() || !formData.title.trim() || !formData.semester || !formData.year || !formData.examType) {
      toast('Please complete all required paper details.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      setUploadProgress(10);

      const data = new FormData();
      data.append('file', paperFile);
      if (solutionFile) data.append('solution', solutionFile);
      Object.entries(formData).forEach(([key, val]) => data.append(key, val));

      const res = await axios.post(\`\${API_URL}/api/contributions\`, data, {
        headers: {
          ...authHeader(),
          'Content-Type': 'multipart/form-data'
        },
        timeout: 120000,
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          const percent = Math.round(10 + (progressEvent.loaded * 70) / progressEvent.total);
          setUploadProgress(Math.min(80, Math.max(10, percent)));
        },
      });
      setUploadProgress(100);
      toast(res.data.message || 'Contribution submitted successfully.', 'success');
      navigate('/');
    } catch (err) {
      console.error('Contribution upload failed:', err.response?.data || err.message);
      const serverError = err.response?.data;
      toast(
        serverError?.error ||
        serverError?.message ||
        err.message ||
        'Contribution upload failed. Please try again.',
        'error'
      );
      setUploadProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  const showDetails = uploadMode === 'manual' || Boolean(paperFile && !analyzingPaper && (paperAnalysis || analysisError));

  return (
    <div className="app-container">
      <Navbar user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} isAdmin={isAdmin} setIsAdmin={setIsAdmin} toast={toast} />

      <main className="smart-contribution-page">
        <Link to="/" className="page-back-link">← Back to papers</Link>

        <section className="smart-contribution-hero">
          <span className="page-eyebrow">Community Archive</span>
          <h1>Contribute to PaperStack</h1>
          <p>Upload a question paper and let PaperStack fill the details for you. You can always correct anything before submitting.</p>
        </section>

        <section className="smart-contribution-shell">
          <div className="contribution-mode-switch" role="tablist" aria-label="Contribution upload mode">
            <button
              type="button"
              className={\`contribution-mode-btn \${uploadMode === 'smart' ? 'active' : ''}\`}
              onClick={() => changeUploadMode('smart')}
            >
              Smart Upload
              <span>Upload PDF → auto-detect details</span>
            </button>
            <button
              type="button"
              className={\`contribution-mode-btn \${uploadMode === 'manual' ? 'active' : ''}\`}
              onClick={() => changeUploadMode('manual')}
            >
              Manual Upload
              <span>Enter every field yourself</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="contrib-form">
            {uploadMode === 'smart' ? (
              <>
                <div className="contribution-step-head">
                  <div>
                    <span className="contribution-step-number">Step 1</span>
                    <h2>Upload the question paper</h2>
                    <p>Initially, this is all you need to provide.</p>
                  </div>
                </div>

                <SmartPaperUpload
                  file={paperFile}
                  analyzing={analyzingPaper}
                  analysis={paperAnalysis}
                  analysisError={analysisError}
                  onFileSelected={handleSmartPaperSelection}
                  onAnalyzeAgain={handleAnalyzeAgain}
                />

                {!paperFile && (
                  <p className="contribution-smart-hint">No form to fill yet — upload the PDF first and PaperStack will do the first pass.</p>
                )}
              </>
            ) : (
              <>
                <div className="contribution-step-head">
                  <div>
                    <span className="contribution-step-number">Manual</span>
                    <h2>Enter paper details yourself</h2>
                    <p>Use this when automatic detection is unnecessary or you already know the metadata.</p>
                  </div>
                </div>

                <div className="contribution-manual-file form-group">
                  <label>Paper PDF File <span>*</span></label>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) => handleManualPaperSelection(event.target.files?.[0])}
                  />
                  {paperFile && <p className="file-size-preview">Selected: {paperFile.name} • {(paperFile.size / (1024 * 1024)).toFixed(2)} MB</p>}
                </div>
              </>
            )}

            {showDetails && (
              <section className="contribution-details-panel">
                <div className="contribution-step-head">
                  <div>
                    <span className="contribution-step-number">{uploadMode === 'smart' ? 'Step 2' : 'Details'}</span>
                    <h2>{uploadMode === 'smart' ? 'Review detected details' : 'Paper information'}</h2>
                    <p>{uploadMode === 'smart' ? 'Correct any field that PaperStack did not identify perfectly.' : 'Complete the required metadata before submitting.'}</p>
                  </div>
                </div>

                {uploadMode === 'smart' && paperAnalysis && (
                  <div className="contribution-detected-banner">
                    ✓ PaperStack pre-filled these values. You have final control over every field.
                  </div>
                )}

                <div className="contribution-field-grid">
                  <div className="form-group">
                    <label>Subject Name <span>*</span></label>
                    <input type="text" placeholder="e.g. Computer Graphics" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required />
                  </div>

                  <div className="form-group">
                    <label>Subject Code</label>
                    <input type="text" placeholder="e.g. CS502" value={formData.subjectCode || ''} onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value.toUpperCase() })} />
                  </div>

                  <div className="form-group full-width">
                    <label>Paper Title <span>*</span></label>
                    <input type="text" placeholder="e.g. Computer Graphics Mid-Sem 2026" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                  </div>

                  <div className="form-group">
                    <label>Branch <span>*</span></label>
                    <select value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })}>
                      <option>CSE</option>
                      <option>ECE</option>
                      <option>CSE &amp; ECE</option>
                      <option>AI</option>
                      <option>AIML</option>
                      <option>IT</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Semester <span>*</span></label>
                    <select value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })}>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => <option key={semester} value={semester}>Semester {semester}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Exam Year <span>*</span></label>
                    <input type="number" min="2000" max="2100" placeholder="2026" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} required />
                  </div>

                  <div className="form-group">
                    <label>Exam Type <span>*</span></label>
                    <select value={formData.examType} onChange={(e) => setFormData({ ...formData, examType: e.target.value })}>
                      <option>Mid-Sem</option>
                      <option>End-Sem</option>
                    </select>
                  </div>
                </div>

                <div className="contribution-extra-grid">
                  <div className="form-group">
                    <label>Optional Solution PDF</label>
                    <input type="file" accept="application/pdf,.pdf" onChange={(e) => setSolutionFile(e.target.files?.[0] || null)} />
                    {solutionFile && <p className="file-size-preview">Selected: {solutionFile.name}</p>}
                  </div>

                  <div className="form-group notes-field">
                    <label>Notes / Message to Reviewer</label>
                    <textarea rows={3} placeholder="Anything the reviewer should know?" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                  </div>
                </div>

                <div className="smart-contribution-submit-area">
                  <div className="checkbox-confirm-row">
                    <input type="checkbox" id="confirm" checked={formData.confirmChecked} onChange={(e) => setFormData({ ...formData, confirmChecked: e.target.checked })} />
                    <label htmlFor="confirm">I checked the detected information and confirm that the paper details are correct.</label>
                  </div>

                  {uploadProgress > 0 && (
                    <div className="progress-bar-wrap">
                      <div className="progress-bar-fill" style={{ width: \`\${uploadProgress}%\` }} />
                      <span>Uploading: {uploadProgress}%</span>
                    </div>
                  )}

                  <button type="submit" className="login-btn-gradient" disabled={submitting || analyzingPaper}>
                    {submitting ? <PaperStackLoader label="Uploading paper..." compact /> : 'Submit Contribution'}
                  </button>
                </div>
              </section>
            )}
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}

`;

function fail(message) {
  throw new Error(`[Feature #3.1] ${message}`);
}

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) fail(`Required file not found: ${path.relative(ROOT, filePath)}`);
}

function backupFile(filePath) {
  const relative = path.relative(ROOT, filePath);
  const destination = path.join(BACKUP_ROOT, relative);
  if (fs.existsSync(destination)) return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(filePath, destination);
}

function replaceContributionPage(source) {
  if (source.includes('Initially, this is all you need to provide.')) return source;
  if (!source.includes("import SmartPaperUpload from './components/SmartPaperUpload';")) {
    fail('Feature #3 is missing: SmartPaperUpload import was not found.');
  }
  if (!source.includes("import { analyzeContributionPdf } from './services/contributionApi';")) {
    fail('Feature #3 is missing: analyzeContributionPdf import was not found.');
  }

  const start = source.indexOf('function ContributePageNew(');
  const end = source.indexOf('// V2 Page: Exam Mode', start);
  if (start === -1 || end === -1) fail('Could not locate the contribution page boundaries.');
  return source.slice(0, start) + NEW_COMPONENT + source.slice(end);
}

function copyFile(relativePath) {
  const source = path.join(PATCH_ROOT, relativePath);
  const target = path.join(ROOT, relativePath);
  requireFile(source);
  if (fs.existsSync(target)) backupFile(target);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function restore() {
  for (const filePath of [CLIENT_APP, SMART_UPLOAD_JS, SMART_UPLOAD_CSS]) {
    const backup = path.join(BACKUP_ROOT, path.relative(ROOT, filePath));
    if (fs.existsSync(backup)) fs.copyFileSync(backup, filePath);
  }
}

function main() {
  [CLIENT_APP, SMART_UPLOAD_JS, SMART_UPLOAD_CSS].forEach(requireFile);
  [CLIENT_APP, SMART_UPLOAD_JS, SMART_UPLOAD_CSS].forEach(backupFile);

  try {
    copyFile('client/src/components/SmartPaperUpload.js');
    copyFile('client/src/components/SmartPaperUpload.css');
    const updated = replaceContributionPage(fs.readFileSync(CLIENT_APP, 'utf8'));
    fs.writeFileSync(CLIENT_APP, updated);

    console.log('\nFeature #3.1 applied successfully.');
    console.log('Smart Upload is now the default PDF-first flow.');
    console.log('Manual Upload remains available as a separate mode.');
    console.log('\nNext:');
    console.log('  1. node .\\verify-feature-03-1.js');
    console.log('  2. cd client && npm run build');
    console.log('  3. Restart npm start and hard-refresh /contribute');
  } catch (error) {
    restore();
    throw error;
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
