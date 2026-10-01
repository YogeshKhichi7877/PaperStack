import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { ArrowRight, UserRound, X } from 'lucide-react';
import { API_URL } from '../config/appConfig';
import { authHeader } from '../services/authHeaders';
import PaperStackLoader from '../components/PaperStackLoader';
import paperStackOwl from '../assets/Paperstack_auth_owl.png';
import paperStackWordmark from '../assets/Paperstack_auth_wordmark.png';
import onboardingStudyOwl from '../assets/paperstack-onboarding-study-owl.png';
import '../components/StudentProfile.css';

const SUPPORTED_SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const StudentProfileContext = createContext({
  profile: { displayName: '', semester: null, onboardingCompleted: true },
  displayName: '',
  semester: null,
  onboardingCompleted: true,
  updateProfile: async () => false,
  openPreferences: () => {},
  closePreferences: () => {},
});

function cleanName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

function validSemester(value) {
  const number = Number(value);
  return SUPPORTED_SEMESTERS.includes(number) ? number : null;
}

function ProfileDialog({ initialProfile, onboarding, saving, onSave, onClose }) {
  const [displayName, setDisplayName] = useState(initialProfile.displayName || '');
  const [semester, setSemester] = useState(validSemester(initialProfile.semester));
  const dialogRef = useRef(null);
  const nameRef = useRef(null);
  const isValid = cleanName(displayName).length >= 2 && Boolean(semester);

  useEffect(() => {
    nameRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onboarding, onClose]);

  const submit = (event) => {
    event.preventDefault();
    if (isValid) onSave({ displayName: cleanName(displayName), semester });
  };

  return (
    <div className={`student-profile-overlay ${onboarding ? 'is-onboarding' : 'is-preferences'}`} role="presentation" onMouseDown={(event) => {
      if (!onboarding && event.target === event.currentTarget) onClose();
    }}>
      <section ref={dialogRef} className={`student-profile-dialog ${onboarding ? 'is-onboarding' : 'is-preferences'}`} role="dialog" aria-modal="true" aria-labelledby="student-profile-title" aria-describedby="student-profile-description">
        <button
          type="button"
          className="student-profile-close"
          aria-label={onboarding ? 'Close onboarding for now' : 'Close academic preferences'}
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>

        {onboarding && (
          <aside className="student-profile-story" aria-hidden="true">
            <div className="student-profile-lockup">
              <img className="student-profile-lockup-owl" src={paperStackOwl} alt="" />
              <img className="student-profile-lockup-wordmark" src={paperStackWordmark} alt="" />
            </div>
            <h1>
              Your Academic
              <span>Home Awaits</span>
            </h1>
            <p>A smarter way to access, practice and grow — just for your semester.</p>
            <img className="student-profile-illustration" src={onboardingStudyOwl} alt="" />
          </aside>
        )}

        <div className="student-profile-form-panel">
          {!onboarding && (
            <div className="student-profile-form-brand">
              <img src={paperStackOwl} alt="" />
              <img src={paperStackWordmark} alt="PaperStack" />
            </div>
          )}
          <header className="student-profile-heading">
            <h2 id="student-profile-title">{onboarding ? "Let's get started" : 'Academic preferences'}</h2>
            <p id="student-profile-description">
              {onboarding
                ? 'Enter your name and current semester to see relevant resources.'
                : 'Keep your workspace relevant to your current semester.'}
            </p>
          </header>

          <form onSubmit={submit}>
            <label htmlFor="student-display-name">Name to display</label>
            <div className="student-profile-input-wrap">
              <UserRound size={17} aria-hidden="true" />
              <input
                ref={nameRef}
                id="student-display-name"
                value={displayName}
                maxLength={60}
                autoComplete="name"
                placeholder="e.g. Yogesh"
                aria-required="true"
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <fieldset>
              <legend>Your current semester</legend>
              <div className="student-semester-grid">
                {SUPPORTED_SEMESTERS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={semester === item ? 'active' : ''}
                    aria-label={`Semester ${item}`}
                    aria-pressed={semester === item}
                    onClick={() => setSemester(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="student-profile-actions">
              {!onboarding && <button type="button" className="student-profile-cancel" onClick={onClose}>Cancel</button>}
              <button type="submit" className="student-profile-save" disabled={!isValid || saving}>
                <span>{saving ? 'Saving…' : onboarding ? 'Continue' : 'Save changes'}</span>
                {onboarding && !saving && <ArrowRight size={17} aria-hidden="true" />}
              </button>
            </div>
          </form>
          <small>You can change this anytime later.</small>
        </div>
      </section>
    </div>
  );
}

export function StudentProfileProvider({ user, authReady, onUserUpdate, toast, children }) {
  const [profile, setProfile] = useState(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (user) {
      const displayName = cleanName(user.name || user.displayName || user.username);
      const semester = validSemester(user.semester);
      const onboardingCompleted = typeof user.onboardingCompleted === 'boolean'
        ? user.onboardingCompleted
        : Boolean(displayName && semester);
      setProfile({ displayName, semester, onboardingCompleted });
    } else {
      // Guests intentionally browse the complete archive. Academic preferences
      // belong to an account so they can be restored reliably on every device.
      setProfile({ displayName: '', semester: null, onboardingCompleted: true });
    }
    setOnboardingDismissed(false);
  }, [authReady, user]);

  const updateProfile = useCallback(async (changes) => {
    const next = {
      displayName: cleanName(changes.displayName ?? profile?.displayName),
      semester: validSemester(changes.semester ?? profile?.semester),
      onboardingCompleted: true,
    };
    if (next.displayName.length < 2 || !next.semester) return false;
    setSaving(true);
    try {
      if (user && localStorage.getItem('token')) {
        const response = await axios.patch(`${API_URL}/api/user/profile`, next, { headers: authHeader() });
        const savedUser = response.data?.user || {};
        onUserUpdate?.((current) => ({
          ...current,
          name: savedUser.displayName || next.displayName,
          displayName: savedUser.displayName || next.displayName,
          semester: savedUser.semester || next.semester,
          onboardingCompleted: savedUser.onboardingCompleted ?? true,
        }));
      }
      localStorage.setItem('userSemester', String(next.semester));
      localStorage.setItem('paperstack_preferred_semester', String(next.semester));
      setProfile(next);
      setPreferencesOpen(false);
      window.dispatchEvent(new CustomEvent('paperstack:profile-changed', { detail: next }));
      toast?.('Academic preferences saved.', 'success');
      return true;
    } catch (error) {
      toast?.(error.response?.data?.error || 'Could not save academic preferences.', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }, [onUserUpdate, profile, toast, user]);

  const value = useMemo(() => ({
    profile,
    displayName: profile?.displayName || '',
    semester: profile?.semester || null,
    onboardingCompleted: Boolean(profile?.onboardingCompleted),
    updateProfile,
    openPreferences: () => setPreferencesOpen(true),
    closePreferences: () => setPreferencesOpen(false),
  }), [profile, updateProfile]);

  if (!authReady || !profile) return <div className="student-profile-loading"><PaperStackLoader label="Preparing your academic space…" /></div>;

  const showOnboarding = Boolean(user && !profile.onboardingCompleted && !onboardingDismissed);
  return (
    <StudentProfileContext.Provider value={value}>
      {children}
      {showOnboarding && (
        <ProfileDialog
          initialProfile={profile}
          onboarding
          saving={saving}
          onSave={updateProfile}
          onClose={() => setOnboardingDismissed(true)}
        />
      )}
      {preferencesOpen && <ProfileDialog initialProfile={profile} onboarding={false} saving={saving} onSave={updateProfile} onClose={() => setPreferencesOpen(false)} />}
    </StudentProfileContext.Provider>
  );
}

export function useStudentProfile() {
  return useContext(StudentProfileContext);
}

export { SUPPORTED_SEMESTERS };
