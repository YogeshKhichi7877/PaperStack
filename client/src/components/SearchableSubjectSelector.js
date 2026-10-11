import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { getCanonicalSubjects } from '../services/learningApi';
import './SearchableSubjectSelector.css';

export default function SearchableSubjectSelector({ value, onChange, semester, branch, options, allowAuto = false, label = 'Subject', disabled = false, emptyLabel, emptyOptionLabel }) {
  const [subjects, setSubjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const labelId = useId();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    if (options) {
      setSubjects(options.map((item) => ({ ...item, code: item.code || item.subjectCode, name: item.name || item.subject || item.subjectName, shortCode: item.shortCode || '', aliases: item.aliases || [], current: item.current ?? (!semester || Number(item.semester) === Number(semester)) })));
      return () => { active = false; };
    }
    setError('');
    getCanonicalSubjects({ semester, branch }).then((data) => { if (active) setSubjects(data.subjects || []); }).catch(() => { if (active) setError('Subjects could not be loaded.'); });
    return () => { active = false; };
  }, [branch, options, semester, retry]);
  useEffect(() => {
    const close = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const selected = subjects.find((item) => item.code === value);
  const filtered = useMemo(() => {
    const needle = query.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!needle) return subjects;
    return subjects.filter((item) => [item.code, item.shortCode, item.name, ...(item.aliases || [])]
      .some((field) => String(field || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(needle)));
  }, [query, subjects]);

  const choose = (subject) => {
    onChange(subject ? { subjectCode: subject.code, subjectName: subject.name, subject } : { subjectCode: '', subjectName: '', subject: null });
    setOpen(false); setQuery(''); triggerRef.current?.focus();
  };

  return <div className="subject-picker" ref={rootRef} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); triggerRef.current?.focus(); } if (['ArrowDown', 'ArrowUp'].includes(event.key)) { const items = Array.from(rootRef.current.querySelectorAll('[role="option"]')); if (items.length) { event.preventDefault(); const index = items.indexOf(document.activeElement); items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus(); } } }}>
    <span id={labelId} className="subject-picker-label">{label}</span>
    <button type="button" className="subject-picker-trigger" ref={triggerRef} aria-describedby={labelId} onClick={() => setOpen((shown) => !shown)} disabled={disabled} aria-haspopup="listbox" aria-expanded={open}>
      <span>{selected ? <><b>{selected.code}</b> {selected.name}</> : emptyLabel || (allowAuto ? 'Let PaperStack detect the subject' : 'Choose a subject')}</span><Search size={17} />
    </button>
    {open && <div className="subject-picker-popover">
      <label><Search size={16} /><input aria-label="Search subjects" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search code, name or alias" /></label>
      <div role="listbox" aria-labelledby={labelId}>
        {allowAuto && <button type="button" role="option" aria-selected={!value} onClick={() => choose(null)}>{emptyOptionLabel || 'Detect from my learning'}</button>}
        {filtered.map((item, index) => <React.Fragment key={item.code}>
          {index === 0 && item.current && <small>Your current semester</small>}
          {index > 0 && !item.current && filtered[index - 1]?.current && <small>Other subjects</small>}
          <button type="button" role="option" aria-selected={item.code === value} onClick={() => choose(item)}><b>{item.code}</b><span>{item.name}<em>{item.shortCode}</em></span></button>
        </React.Fragment>)}
        {!filtered.length && !error && <p>No matching subject.</p>}
        {error && <p role="alert">{error} <button type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button></p>}
      </div>
    </div>}
  </div>;
}
