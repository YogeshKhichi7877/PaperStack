import React, { useRef, useState } from 'react';
import './SmartPaperUpload.css';

function confidenceLabel(value) {
  const score = Number(value || 0);
  if (score >= 85) return 'High confidence';
  if (score >= 65) return 'Review suggested';
  return 'Needs review';
}

export default function SmartPaperUpload({
  file,
  analyzing,
  analysis,
  analysisError,
  onFileSelected,
  onAnalyzeAgain,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const selectFile = (selected) => {
    if (selected) onFileSelected(selected);
  };

  return (
    <div className="smart-upload-shell">
      <div
        className={`smart-upload-dropzone ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          selectFile(event.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => selectFile(event.target.files?.[0])}
          hidden
        />

        <div className="smart-upload-icon">PDF</div>
        <div className="smart-upload-copy">
          <strong>{file ? file.name : 'Upload your question paper'}</strong>
          <span>
            {file
              ? `${(file.size / (1024 * 1024)).toFixed(2)} MB • ready for metadata detection`
              : 'Drag & drop a PDF here, or choose one from your device'}
          </span>
          {!file && <small>PaperStack will detect subject, code, branch, semester, year and exam type.</small>}
        </div>
        <button type="button" onClick={() => inputRef.current?.click()}>
          {file ? 'Change PDF' : 'Choose PDF'}
        </button>
      </div>

      {analyzing && (
        <div className="smart-analysis-card is-loading">
          <div className="smart-analysis-spinner" />
          <div>
            <strong>Reading your paper...</strong>
            <p>Detecting the exam metadata. This usually takes only a few seconds.</p>
          </div>
        </div>
      )}

      {!analyzing && analysis && (
        <div className="smart-analysis-card">
          <div className="smart-analysis-topline">
            <div>
              <span className="smart-analysis-eyebrow">Detection complete</span>
              <strong>{confidenceLabel(analysis.confidence?.overall)} • {analysis.confidence?.overall || 0}%</strong>
            </div>
            <span className={`smart-engine-pill ${analysis.ai?.used ? 'ai' : 'rules'}`}>
              {analysis.ai?.used ? 'Rules + free AI' : 'Local rules'}
            </span>
          </div>

          <div className="smart-analysis-grid">
            <div><span>Subject</span><b>{analysis.metadata?.subjectName || 'Review'}</b></div>
            <div><span>Code</span><b>{analysis.metadata?.subjectCode || 'Review'}</b></div>
            <div><span>Branch</span><b>{analysis.metadata?.branch || 'Review'}</b></div>
            <div><span>Semester</span><b>{analysis.metadata?.semester ? `Sem ${analysis.metadata.semester}` : 'Review'}</b></div>
            <div><span>Year</span><b>{analysis.metadata?.year || 'Review'}</b></div>
            <div><span>Exam</span><b>{analysis.metadata?.examType || 'Review'}</b></div>
          </div>

          {analysis.warnings?.length > 0 && (
            <div className="smart-analysis-warning">
              <strong>Please review these fields</strong>
              <ul>{analysis.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </div>
          )}

          <div className="smart-analysis-footer">
            <span>Everything detected below remains editable before submission.</span>
            <button type="button" onClick={onAnalyzeAgain}>Analyze again</button>
          </div>
        </div>
      )}

      {!analyzing && analysisError && (
        <div className="smart-analysis-card is-error">
          <div>
            <strong>Automatic detection could not complete.</strong>
            <p>{analysisError} The editable form is available below, so you can finish manually.</p>
          </div>
          {file && <button type="button" onClick={onAnalyzeAgain}>Retry detection</button>}
        </div>
      )}
    </div>
  );
}
