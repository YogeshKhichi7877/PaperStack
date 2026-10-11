import React from 'react';
import { X } from 'lucide-react';
import SearchableSubjectSelector from './SearchableSubjectSelector';
import './CurrentSubjectsSelector.css';

export default function CurrentSubjectsSelector({ value = [], onChange, semester, branch, label = 'Current subjects' }) {
  const codes = Array.from(new Set((Array.isArray(value) ? value : String(value || '').split(','))
    .map((code) => String(code || '').trim().toUpperCase()).filter(Boolean)));

  const add = ({ subjectCode }) => {
    if (subjectCode && !codes.includes(subjectCode)) onChange([...codes, subjectCode]);
  };

  return <div className="current-subjects-field">
    <SearchableSubjectSelector
      label={label}
      value=""
      semester={semester}
      branch={branch}
      emptyLabel="Add a current subject"
      onChange={add}
    />
    {codes.length > 0 && <div className="current-subject-chips" aria-label="Selected current subjects">
      {codes.map((code) => <span key={code}>{code}<button type="button" aria-label={`Remove ${code}`} onClick={() => onChange(codes.filter((item) => item !== code))}><X size={13} /></button></span>)}
    </div>}
  </div>;
}
