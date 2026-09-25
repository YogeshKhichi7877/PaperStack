/*
 * PaperStack Feature #3 - Smart Contribution V2
 * Run from the PaperStack repository root AFTER Feature #2.2:
 *   node apply-feature-03.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.cwd();
const PATCH_ROOT = __dirname;
const SERVER_INDEX = path.join(ROOT, 'server', 'index.js');
const SERVER_PACKAGE = path.join(ROOT, 'server', 'package.json');
const SERVER_ENV_EXAMPLE = path.join(ROOT, 'server', '.env.example');
const CLIENT_APP = path.join(ROOT, 'client', 'src', 'App.js');
const BACKUP_ROOT = path.join(ROOT, '.paperstack-backups', 'feature-03-original');

const NEW_FILES = [
  'server/services/smartContributionService.js',
  'server/services/freeAiMetadataService.js',
  'server/services/smartContributionService.test.js',
  'server/services/freeAiMetadataService.test.js',
  'server/routes/smartContributionRoutes.js',
  'client/src/services/contributionApi.js',
  'client/src/components/SmartPaperUpload.js',
  'client/src/components/SmartPaperUpload.css',
];

function fail(message) {
  throw new Error(`[Feature #3] ${message}`);
}

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) fail(`Required file not found: ${path.relative(ROOT, filePath)}`);
}

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const relative = path.relative(ROOT, filePath);
  const destination = path.join(BACKUP_ROOT, relative);
  if (fs.existsSync(destination)) return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(filePath, destination);
}

function copyPatchFiles() {
  for (const relative of NEW_FILES) {
    const source = path.join(PATCH_ROOT, relative);
    const target = path.join(ROOT, relative);
    requireFile(source);
    if (fs.existsSync(target)) backupFile(target);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

function insertAfterOnce(source, anchor, addition, label) {
  if (source.includes(addition.trim())) return source;
  if (!source.includes(anchor)) fail(`Could not find insertion anchor: ${label}`);
  return source.replace(anchor, `${anchor}${addition}`);
}

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) fail(`Could not find patch anchor: ${label}`);
  return source.replace(search, replacement);
}

function patchServerIndex(original) {
  let source = original;

  if (!source.includes("const resourceRoutes = require('./routes/resourceRoutes');")) {
    fail('Feature #1 resource architecture is missing. Apply Features #1 and #2 first.');
  }

  source = insertAfterOnce(
    source,
    "const resourceRoutes = require('./routes/resourceRoutes');",
    `\nconst createSmartContributionRouter = require('./routes/smartContributionRoutes');`,
    'Smart Contribution route import'
  );

  source = insertAfterOnce(
    source,
    "app.use('/api/resources', resourceRoutes);",
    `\napp.use('/api/contributions', createSmartContributionRouter({ authenticate }));`,
    'Smart Contribution route registration'
  );

  return source;
}

function patchClientApp(original) {
  let source = original;

  if (!source.includes("import SubjectPage from './pages/SubjectPage';")) {
    fail('Feature #2 Subject Pages are missing. Apply Feature #2 before Feature #3.');
  }

  source = insertAfterOnce(
    source,
    "import { getSubjectHubPath } from './utils/subjectRoute';",
    `\nimport SmartPaperUpload from './components/SmartPaperUpload';\nimport { analyzeContributionPdf } from './services/contributionApi';`,
    'Smart Contribution client imports'
  );

  const pageStart = source.indexOf('function ContributePageNew(');
  const pageEnd = source.indexOf('// V2 Page: Exam Mode', pageStart);
  if (pageStart === -1 || pageEnd === -1) {
    fail('Could not locate the ContributePageNew component boundaries.');
  }

  let page = source.slice(pageStart, pageEnd);

  if (!page.includes("subjectCode: queryParams.get('subjectCode') || ''")) {
    if (!page.includes("    subject: queryParams.get('subject') || '',")) {
      fail('Could not find contribution form subject state.');
    }
    page = page.replace(
      "    subject: queryParams.get('subject') || '',",
      "    subject: queryParams.get('subject') || '',\n    subjectCode: queryParams.get('subjectCode') || '',"
    );
  }

  if (!page.includes('const [analyzingPaper, setAnalyzingPaper]')) {
    if (!page.includes('  const [submitting, setSubmitting] = useState(false);')) {
      fail('Could not find contribution submitting state.');
    }
    page = page.replace(
      '  const [submitting, setSubmitting] = useState(false);',
      `  const [submitting, setSubmitting] = useState(false);\n  const [analyzingPaper, setAnalyzingPaper] = useState(false);\n  const [paperAnalysis, setPaperAnalysis] = useState(null);\n  const [analysisError, setAnalysisError] = useState('');`
    );
  }

  const handleSubmitAnchor = '  const handleSubmit = async (e) => {';
  const analyzerFunctions = `  const applyDetectedMetadata = useCallback((analysis) => {\n    const metadata = analysis?.metadata || {};\n    setFormData((current) => ({\n      ...current,\n      subject: metadata.subjectName || current.subject,\n      subjectCode: metadata.subjectCode || current.subjectCode,\n      branch: metadata.branch || current.branch,\n      semester: metadata.semester ? String(metadata.semester) : current.semester,\n      year: metadata.year ? String(metadata.year) : current.year,\n      examType: metadata.examType || current.examType,\n      title: current.title?.trim() ? current.title : (metadata.title || current.title),\n    }));\n  }, []);\n\n  const analyzeSelectedPaper = useCallback(async (selectedFile) => {\n    if (!selectedFile) return;\n    setAnalyzingPaper(true);\n    setAnalysisError('');\n    setPaperAnalysis(null);\n    try {\n      const analysis = await analyzeContributionPdf(selectedFile);\n      setPaperAnalysis(analysis);\n      applyDetectedMetadata(analysis);\n      if (analysis?.status === 'ready') {\n        toast('Paper metadata detected. Please confirm it before submitting.', 'success');\n      } else {\n        toast('Metadata detected with some fields to review.', 'info');\n      }\n    } catch (error) {\n      console.error('Smart contribution analysis failed:', error.response?.data || error.message);\n      setAnalysisError(error.response?.data?.error || 'Automatic metadata detection failed.');\n    } finally {\n      setAnalyzingPaper(false);\n    }\n  }, [applyDetectedMetadata, toast]);\n\n  const handlePaperSelection = useCallback((selectedFile) => {\n    if (!selectedFile) return;\n    const isPdf = selectedFile.type === 'application/pdf' || /\\.pdf$/i.test(selectedFile.name || '');\n    if (!isPdf) {\n      toast('Please select a PDF question paper.', 'warning');\n      return;\n    }\n    if (selectedFile.size > 30 * 1024 * 1024) {\n      toast('Paper PDF must be 30 MB or smaller.', 'warning');\n      return;\n    }\n    setPaperFile(selectedFile);\n    setPaperAnalysis(null);\n    setAnalysisError('');\n    analyzeSelectedPaper(selectedFile);\n  }, [analyzeSelectedPaper, toast]);\n\n  const handleAnalyzeAgain = useCallback(() => {\n    if (paperFile) analyzeSelectedPaper(paperFile);\n  }, [paperFile, analyzeSelectedPaper]);\n\n`;

  if (!page.includes('const handlePaperSelection = useCallback')) {
    if (!page.includes(handleSubmitAnchor)) fail('Contribution submit handler was not found.');
    page = page.replace(handleSubmitAnchor, `${analyzerFunctions}${handleSubmitAnchor}`);
  }

  if (!page.includes('value={formData.subjectCode')) {
    const subjectLabel = '<label>Subject Name <span>*</span></label>';
    const subjectLabelPos = page.indexOf(subjectLabel);
    const subjectFieldEnd = subjectLabelPos === -1 ? -1 : page.indexOf('</div>', subjectLabelPos);
    if (subjectLabelPos === -1 || subjectFieldEnd === -1) fail('Could not find Subject Name form field.');
    const insertionPoint = subjectFieldEnd + '</div>'.length;
    const addition = `\n                <div className="form-group">\n                  <label>Subject Code</label>\n                  <input type="text" placeholder="e.g. CS502" value={formData.subjectCode || ''} onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value.toUpperCase() })} />\n                </div>`;
    page = page.slice(0, insertionPoint) + addition + page.slice(insertionPoint);
  }

  page = page.replace('Subject Code / Title Details <span>*</span>', 'Paper Title <span>*</span>');
  page = page.replace('placeholder="e.g. CSE-201 / Mid-Sem Paper"', 'placeholder="e.g. Computer Graphics Mid-Sem 2026"');
  page = page.replace('placeholder="e.g. Data Structures"', 'placeholder="e.g. Computer Graphics"');

  if (!page.includes('<option>CSE & ECE</option>')) {
    const branchSelectStart = page.indexOf('<label>Branch <span>*</span></label>');
    const branchSelectEnd = page.indexOf('</select>', branchSelectStart);
    if (branchSelectStart === -1 || branchSelectEnd === -1) fail('Could not find contribution branch select.');
    const branchBlock = page.slice(branchSelectStart, branchSelectEnd);
    if (!branchBlock.includes('<option>ECE</option>')) fail('Could not find ECE branch option.');
    const updatedBranchBlock = branchBlock.replace('<option>ECE</option>', '<option>ECE</option>\n                    <option>CSE & ECE</option>');
    page = page.slice(0, branchSelectStart) + updatedBranchBlock + page.slice(branchSelectEnd);
  }

  if (!page.includes('<SmartPaperUpload')) {
    const paperLabel = '<label>Paper PDF File <span>*</span></label>';
    const paperLabelPos = page.indexOf(paperLabel);
    const paperFieldStart = paperLabelPos === -1 ? -1 : page.lastIndexOf('<div className="form-group">', paperLabelPos);
    const paperFieldEnd = paperLabelPos === -1 ? -1 : page.indexOf('</div>', paperLabelPos);
    if (paperLabelPos === -1 || paperFieldStart === -1 || paperFieldEnd === -1) fail('Could not find Paper PDF upload field.');
    const paperFieldEndExclusive = paperFieldEnd + '</div>'.length;
    const replacement = `                <div className="form-group smart-paper-upload-field">\n                  <label>Paper PDF File <span>*</span></label>\n                  <SmartPaperUpload\n                    file={paperFile}\n                    analyzing={analyzingPaper}\n                    analysis={paperAnalysis}\n                    analysisError={analysisError}\n                    onFileSelected={handlePaperSelection}\n                    onAnalyzeAgain={handleAnalyzeAgain}\n                  />\n                </div>`;
    page = page.slice(0, paperFieldStart) + replacement + page.slice(paperFieldEndExclusive);
  }

  source = source.slice(0, pageStart) + page + source.slice(pageEnd);
  return source;
}

function patchServerPackage(original) {
  const pkg = JSON.parse(original);
  const tests = [
    'services/smartContributionService.test.js',
    'services/freeAiMetadataService.test.js',
  ];
  let testScript = String(pkg.scripts?.test || 'node --test').trim();
  for (const testFile of tests) {
    if (!testScript.includes(testFile)) testScript += ` ${testFile}`;
  }
  pkg.scripts = { ...(pkg.scripts || {}), test: testScript };
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function patchEnvExample(original) {
  const marker = '# Smart Contribution V2 - optional FREE Gemini metadata fallback';
  if (original.includes(marker)) return original;
  return `${original.replace(/\s*$/, '')}\n\n${marker}\n# Leave GEMINI_API_KEY empty to use only the local rule engine (still fully functional).\nSMART_AI_ENABLED=true\nGEMINI_API_KEY=\nGEMINI_MODEL=gemini-3.5-flash-lite\nSMART_AI_MIN_CONFIDENCE=82\nSMART_AI_INLINE_PDF_MAX_MB=12\nSMART_AI_TIMEOUT_MS=25000\n`;
}

function syntaxCheck(relative) {
  execFileSync(process.execPath, ['--check', path.join(ROOT, relative)], { stdio: 'pipe' });
}

function restoreBackups() {
  for (const target of [SERVER_INDEX, SERVER_PACKAGE, SERVER_ENV_EXAMPLE, CLIENT_APP]) {
    const backup = path.join(BACKUP_ROOT, path.relative(ROOT, target));
    if (fs.existsSync(backup)) fs.copyFileSync(backup, target);
  }
}

function main() {
  [SERVER_INDEX, SERVER_PACKAGE, SERVER_ENV_EXAMPLE, CLIENT_APP].forEach(requireFile);
  requireFile(path.join(ROOT, 'server', 'services', 'subjectService.js'));
  requireFile(path.join(ROOT, 'server', 'services', 'subjectPageService.js'));

  [SERVER_INDEX, SERVER_PACKAGE, SERVER_ENV_EXAMPLE, CLIENT_APP].forEach(backupFile);

  try {
    copyPatchFiles();
    fs.writeFileSync(SERVER_INDEX, patchServerIndex(fs.readFileSync(SERVER_INDEX, 'utf8')));
    fs.writeFileSync(SERVER_PACKAGE, patchServerPackage(fs.readFileSync(SERVER_PACKAGE, 'utf8')));
    fs.writeFileSync(SERVER_ENV_EXAMPLE, patchEnvExample(fs.readFileSync(SERVER_ENV_EXAMPLE, 'utf8')));
    fs.writeFileSync(CLIENT_APP, patchClientApp(fs.readFileSync(CLIENT_APP, 'utf8')));

    [
      'server/index.js',
      'server/routes/smartContributionRoutes.js',
      'server/services/smartContributionService.js',
      'server/services/freeAiMetadataService.js',
      'server/services/smartContributionService.test.js',
      'server/services/freeAiMetadataService.test.js',
    ].forEach(syntaxCheck);

    console.log('\nFeature #3 applied successfully.');
    console.log('The existing contribution POST endpoint was not replaced.');
    console.log('Smart analysis is a pre-fill layer and safely falls back to manual entry.');
    console.log('\nNext:');
    console.log('  1. node .\\verify-feature-03.js');
    console.log('  2. cd server && npm test');
    console.log('  3. cd ../client && npm run build');
    console.log('  4. Restart backend + frontend and test /contribute');
  } catch (error) {
    restoreBackups();
    throw error;
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
