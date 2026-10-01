import { OFFICIAL_BRANCHES as OFFICIAL_BRANCHES_CONFIG } from '../config/branches';
import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Helmet,
} from 'react-helmet-async';

import {
  Link,
  useLocation,
} from 'react-router-dom';

import {
  GoogleLogin,
} from '@react-oauth/google';

import {
  Activity,
  ArrowRight,
  Award,
  Bell,
  Bookmark,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  FileText,
  Flame,
  FolderUp,
  GraduationCap,
  ImagePlus,
  LayoutDashboard,
  LibraryBig,
  Loader2,
  Medal,
  MessageCircleQuestion,
  Pencil,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  X,
} from 'lucide-react';

import {
  GOOGLE_AUTH_CONFIGURED,
} from '../config/appConfig';

import {
  getPersonalDashboard,
  updateProfile,
  uploadProfilePhoto,
  linkGoogleAccount,
} from '../services/personalDashboardApi';

import {
  getSemesterSurvivalPack,
} from '../services/semesterSurvivalApi';

import './PersonalDashboardPage.css';

/* =========================================================
   OFFICIAL IIIT SURAT BRANCHES
========================================================= */

const BRANCHES = OFFICIAL_BRANCHES_CONFIG.map(({ key, short }) => ({ value: key, label: key, short }));

const SEMESTERS = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
];

/* =========================================================
   HELPERS
========================================================= */

function storedPreference(
  key,
  fallback
) {
  try {
    const value =
      localStorage.getItem(
        key
      );

    return (
      value ??
      fallback
    );
  } catch {
    return fallback;
  }
}

function hasStoredKey(
  key
) {
  try {
    return (
      localStorage.getItem(
        key
      ) !== null
    );
  } catch {
    return false;
  }
}

function formatNumber(
  value
) {
  return Number(
    value || 0
  ).toLocaleString(
    'en-IN'
  );
}

function statusLabel(
  status
) {
  return String(
    status || ''
  )
    .replace(
      /_/g,
      ' '
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function scanLocalStudyState() {
  const result = {
    revisionLists: 0,
    revisionChecks: 0,

    warRooms: 0,
    warRoomChecks: 0,

    survivalPacks: 0,
    survivalChecks: 0,

    mockEvaluations: 0,

    latestMockEvaluation:
      null,

    lastMock: null,
  };

  try {
    for (
      let index = 0;
      index <
      localStorage.length;
      index += 1
    ) {
      const key =
        localStorage.key(
          index
        );

      if (!key) {
        continue;
      }

      const raw =
        localStorage.getItem(
          key
        );

      if (
        key.startsWith(
          'paperstack_revision_checklist_'
        )
      ) {
        result.revisionLists +=
          1;

        try {
          const parsed =
            JSON.parse(
              raw || '[]'
            );

          if (
            Array.isArray(
              parsed
            )
          ) {
            result.revisionChecks +=
              parsed.length;
          }
        } catch {}
      }

      if (
        key.startsWith(
          'paperstack_war_room_'
        ) &&
        !key.startsWith(
          'paperstack_war_room_exam_time_'
        )
      ) {
        result.warRooms +=
          1;

        try {
          const parsed =
            JSON.parse(
              raw || '[]'
            );

          if (
            Array.isArray(
              parsed
            )
          ) {
            result.warRoomChecks +=
              parsed.length;
          }
        } catch {}
      }

      if (
        key.startsWith(
          'paperstack_survival_'
        )
      ) {
        result.survivalPacks +=
          1;

        try {
          const parsed =
            JSON.parse(
              raw || '[]'
            );

          if (
            Array.isArray(
              parsed
            )
          ) {
            result.survivalChecks +=
              parsed.length;
          }
        } catch {}
      }

      if (
        key.startsWith(
          'paperstack_mock_evaluation_'
        )
      ) {
        result.mockEvaluations +=
          1;

        try {
          const parsed =
            JSON.parse(
              raw || '{}'
            );

          const currentTime =
            new Date(
              parsed.evaluatedAt ||
                0
            ).getTime();

          const previousTime =
            new Date(
              result
                .latestMockEvaluation
                ?.evaluatedAt ||
                0
            ).getTime();

          if (
            !result
              .latestMockEvaluation ||
            currentTime >
              previousTime
          ) {
            result.latestMockEvaluation =
              parsed;
          }
        } catch {}
      }
    }

    const lastMock =
      localStorage.getItem(
        'paperstack_last_mock'
      );

    if (lastMock) {
      result.lastMock =
        JSON.parse(
          lastMock
        );
    }
  } catch {}

  return result;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function PersonalDashboardPage({
  toast,
  setUser,
}) {
  const [
    dashboard,
    setDashboard,
  ] =
    useState(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    authError,
    setAuthError,
  ] =
    useState(false);

  const location = useLocation();
  const [
    profileOpen,
    setProfileOpen,
  ] =
    useState(location.hash === '#profile');

  useEffect(() => {
    if (location.hash === '#profile') setProfileOpen(true);
  }, [location.hash]);

  const [
    displayName,
    setDisplayName,
  ] =
    useState('');

  const [
    selectedPhoto,
    setSelectedPhoto,
  ] =
    useState(null);

  const [
    photoPreview,
    setPhotoPreview,
  ] =
    useState('');

  const [
    savingProfile,
    setSavingProfile,
  ] =
    useState(false);

  const [
    linkingGoogle,
    setLinkingGoogle,
  ] =
    useState(false);

  const [
    branch,
    setBranch,
  ] =
    useState(
      () =>
        storedPreference(
          'paperstack_preferred_branch',
          'CSE'
        )
    );

  const [
    semester,
    setSemester,
  ] =
    useState(
      () => {
        const value =
          Number(
            storedPreference(
              'paperstack_preferred_semester',
              '5'
            )
          );

        return Number.isFinite(
          value
        )
          ? value
          : 5;
      }
    );

  const [
    semesterPack,
    setSemesterPack,
  ] =
    useState(null);

  const [
    semesterLoading,
    setSemesterLoading,
  ] =
    useState(false);

  const [
    localStudy,
    setLocalStudy,
  ] =
    useState(
      () =>
        scanLocalStudyState()
    );

  /* =========================================================
     PHOTO PREVIEW
  ========================================================= */

  useEffect(() => {
    if (
      !selectedPhoto
    ) {
      setPhotoPreview(
        ''
      );

      return undefined;
    }

    const url =
      URL.createObjectURL(
        selectedPhoto
      );

    setPhotoPreview(
      url
    );

    return () =>
      URL.revokeObjectURL(
        url
      );
  }, [
    selectedPhoto,
  ]);

  /* =========================================================
     DASHBOARD LOAD
  ========================================================= */

  useEffect(() => {
    let mounted =
      true;

    setLoading(
      true
    );

    getPersonalDashboard()
      .then(
        (result) => {
          if (!mounted) {
            return;
          }

          setDashboard(
            result
          );

          setDisplayName(
            result?.user
              ?.name ||
              ''
          );

          setAuthError(
            false
          );

          if (
            result?.user
              ?.semester
          ) {
            setSemester(
              Number(
                result.user
                  .semester
              )
            );
          }

          if (
            result?.user
              ?.branch &&
            !hasStoredKey(
              'paperstack_preferred_branch'
            )
          ) {
            setBranch(
              result.user
                .branch
            );
          }
        }
      )
      .catch(
        (error) => {
          if (!mounted) {
            return;
          }

          if (
            error.response
              ?.status ===
            401
          ) {
            setAuthError(
              true
            );
          } else {
            toast?.(
              error.response
                ?.data
                ?.error ||
                'Could not load your dashboard.',
              'error'
            );
          }
        }
      )
      .finally(() => {
        if (mounted) {
          setLoading(
            false
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, [
    toast,
  ]);

  /* =========================================================
     SEMESTER WORKSPACE
  ========================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        'paperstack_preferred_branch',
        branch
      );

      localStorage.setItem(
        'paperstack_preferred_semester',
        String(
          semester
        )
      );
    } catch {}

    setLocalStudy(
      scanLocalStudyState()
    );

    let mounted =
      true;

    setSemesterLoading(
      true
    );

    getSemesterSurvivalPack({
      branch,
      semester,
    })
      .then(
        (result) => {
          if (mounted) {
            setSemesterPack(
              result
            );
          }
        }
      )
      .catch(() => {
        if (mounted) {
          setSemesterPack(
            null
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setSemesterLoading(
            false
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, [
    branch,
    semester,
  ]);

  /* =========================================================
     DERIVED
  ========================================================= */

  const stats =
    dashboard?.stats ||
    {};

  const contributor =
    dashboard
      ?.contributor ||
    {};

  const weakSubjects =
    useMemo(
      () =>
        (
          semesterPack
            ?.subjects ||
          []
        ).slice(
          0,
          4
        ),
      [semesterPack]
    );

  const totalImpact =
    Number(
      stats.impactViews ||
        0
    ) +
    Number(
      stats.impactDownloads ||
        0
    );

  const contributionTotal =
    Number(
      stats.approvedContributions ||
        0
    ) +
    Number(
      stats.approvedSolutions ||
        0
    ) +
    Number(
      stats.verificationCount ||
        0
    );

  const studyActivity =
    Number(
      localStudy.revisionChecks ||
        0
    ) +
    Number(
      localStudy.warRoomChecks ||
        0
    ) +
    Number(
      localStudy.survivalChecks ||
        0
    ) +
    Number(
      localStudy.mockEvaluations ||
        0
    );

  const savedRecords = useMemo(() => {
    const generic = dashboard?.savedItems || [];
    const papers = (dashboard?.bookmarks || []).map((paper) => ({
      ...paper,
      entityType: 'paper',
      entityKey: String(paper._id),
      route: paper.filePath || '',
    }));
    const seen = new Set();
    return [...generic, ...papers].filter((item) => {
      const key = `${item.entityType}:${item.entityKey || item._id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [dashboard]);

  const branchShort =
    BRANCHES.find(
      (item) =>
        item.value ===
        branch
    )?.short ||
    branch;

  /* =========================================================
     PROFILE UPDATE
  ========================================================= */

  async function saveProfile(
    event
  ) {
    event.preventDefault();

    const nextName =
      displayName
        .trim()
        .replace(
          /\s+/g,
          ' '
        );

    if (
      nextName.length <
        2 ||
      nextName.length >
        60
    ) {
      toast?.(
        'Display name must be 2 to 60 characters.',
        'error'
      );

      return;
    }

    if (
      selectedPhoto &&
      selectedPhoto.size >
        5 *
          1024 *
          1024
    ) {
      toast?.(
        'Profile photo must be smaller than 5 MB.',
        'error'
      );

      return;
    }

    setSavingProfile(
      true
    );

    try {
      let updatedUser =
        await updateProfile(
          nextName,
          semester
        );

      setDashboard(
        (current) => ({
          ...current,

          user: {
            ...current.user,

            name:
              updatedUser.name,

            avatar:
              updatedUser.avatar,

            semester:
              updatedUser.semester,
          },
        })
      );

      setUser?.(
        (current) =>
          current
            ? {
                ...current,

                name:
                  updatedUser.name,

                avatar:
                  updatedUser.avatar,

                semester:
                  updatedUser.semester,
              }
            : current
      );

      if (
        selectedPhoto
      ) {
        updatedUser =
          await uploadProfilePhoto(
            selectedPhoto
          );

        setDashboard(
          (current) => ({
            ...current,

            user: {
              ...current.user,

              name:
                updatedUser.name,

              avatar:
                updatedUser.avatar,
            },
          })
        );

        setUser?.(
          (current) =>
            current
              ? {
                  ...current,

                  name:
                    updatedUser.name,

                  avatar:
                    updatedUser.avatar,
                }
              : current
        );
      }

      setSelectedPhoto(
        null
      );

      try {
        localStorage.setItem('userSemester', String(updatedUser.semester || semester));
        localStorage.setItem('paperstack_preferred_semester', String(updatedUser.semester || semester));
      } catch {}

      setProfileOpen(
        false
      );

      toast?.(
        'Profile updated.',
        'success'
      );
    } catch (
      error
    ) {
      toast?.(
        error.response
          ?.data
          ?.error ||
          'Could not update profile.',
        'error'
      );
    } finally {
      setSavingProfile(
        false
      );
    }
  }

  /* =========================================================
     GOOGLE LINK
  ========================================================= */

  async function linkGoogle(
    result
  ) {
    if (
      !result
        ?.credential
    ) {
      return;
    }

    setLinkingGoogle(
      true
    );

    try {
      const updatedUser =
        await linkGoogleAccount(
          result.credential
        );

      setDashboard(
        (current) => ({
          ...current,

          user: {
            ...current.user,

            authProvider:
              updatedUser.authProvider,

            avatar:
              updatedUser.avatar,
          },
        })
      );

      setUser?.(
        (current) =>
          current
            ? {
                ...current,

                authProvider:
                  updatedUser.authProvider,

                avatar:
                  updatedUser.avatar,
              }
            : current
      );

      toast?.(
        'Google sign-in linked to your account.',
        'success'
      );
    } catch (
      error
    ) {
      toast?.(
        error.response
          ?.data
          ?.error ||
          'Google account could not be linked.',
        'error'
      );
    } finally {
      setLinkingGoogle(
        false
      );
    }
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className="pd-page">
        <div className="pd-shell">
          <section className="pd-state">
            <span className="pd-loader" />

            <strong>
              Opening your
              PaperStack desk…
            </strong>

            <p>
              Loading your semester,
              study activity and
              contribution history.
            </p>
          </section>
        </div>
      </main>
    );
  }

  /* =========================================================
     AUTH
  ========================================================= */

  if (authError) {
    return (
      <main className="pd-page">
        <Helmet>
          <title>
            My Dashboard -
            PaperStack
          </title>
        </Helmet>

        <div className="pd-shell">
          <section className="pd-signin">
            <span>
              <UserRound
                size={28}
              />
            </span>

            <small>
              Personal Workspace
            </small>

            <h1>
              Your PaperStack desk
              opens after sign in.
            </h1>

            <p>
              Saved papers,
              contributions,
              requests, study
              progress and semester
              shortcuts are linked
              to your account.
            </p>

            <Link to="/login">
              Sign in

              <ArrowRight
                size={14}
              />
            </Link>
          </section>
        </div>
      </main>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="pd-page">
      <Helmet>
        <title>
          My Dashboard -
          PaperStack
        </title>

        <meta
          name="description"
          content="Personal PaperStack workspace for semester preparation, contributions, saved papers, requests and study tools."
        />
      </Helmet>

      <div className="pd-shell">
        {/* =================================================
            DESK HEADER
        ================================================= */}

        <header className="pd-desk-head">
          <div className="pd-person">
            <div className="pd-avatar">
              {dashboard
                ?.user
                ?.avatar ? (
                <img
                  src={
                    dashboard
                      .user
                      .avatar
                  }
                  alt=""
                />
              ) : (
                <span>
                  {dashboard
                    ?.user
                    ?.name
                    ?.charAt(
                      0
                    )
                    ?.toUpperCase() ||
                    'P'}
                </span>
              )}

              <button
                type="button"
                aria-label="Edit profile"
                onClick={() =>
                  setProfileOpen(
                    true
                  )
                }
              >
                <Pencil
                  size={11}
                />
              </button>
            </div>

            <div className="pd-person-copy">
              <span>
                <LayoutDashboard
                  size={13}
                />

                My PaperStack
              </span>

              <h1>
                {dashboard
                  ?.user
                  ?.name ||
                  'Student'}
              </h1>

              <p>
                Your semester,
                saved material,
                study progress and
                contribution impact
                in one place.
              </p>
            </div>
          </div>

          <div className="pd-rank-ticket">
            <header>
              <span>
                Contributor card
              </span>

              <Medal
                size={16}
              />
            </header>

            <div className="pd-rank-main">
              <div>
                <span>
                  Level
                </span>

                <strong>
                  {stats.level ||
                    'Explorer'}
                </strong>
              </div>

              <div>
                <span>
                  XP
                </span>

                <strong>
                  {formatNumber(
                    stats.xp
                  )}
                </strong>
              </div>
            </div>

            <div className="pd-rank-foot">
              <span>
                {stats.rank
                  ? `Campus rank #${stats.rank}`
                  : 'No campus rank yet'}
              </span>

              <Link to="/contributors/me">
                Profile

                <ChevronRight
                  size={11}
                />
              </Link>
            </div>
          </div>
        </header>

        {/* =================================================
            PROFILE EDIT DRAWER
        ================================================= */}

        {profileOpen && (
          <section className="pd-profile-editor">
            <header>
              <div>
                <span>
                  Profile settings
                </span>

                <h2>
                  How you appear on
                  PaperStack
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setProfileOpen(
                    false
                  );

                  setSelectedPhoto(
                    null
                  );

                  setDisplayName(
                    dashboard
                      ?.user
                      ?.name ||
                      ''
                  );

                  setSemester(
                    Number(dashboard?.user?.semester) || semester
                  );
                }}
              >
                <X
                  size={15}
                />
              </button>
            </header>

            <form
              onSubmit={
                saveProfile
              }
            >
              <div className="pd-photo-editor">
                <div>
                  {photoPreview ||
                  dashboard
                    ?.user
                    ?.avatar ? (
                    <img
                      src={
                        photoPreview ||
                        dashboard
                          .user
                          .avatar
                      }
                      alt="Profile preview"
                    />
                  ) : (
                    <span>
                      {(displayName ||
                        'P')
                        .charAt(
                          0
                        )
                        .toUpperCase()}
                    </span>
                  )}
                </div>

                <label>
                  <ImagePlus
                    size={14}
                  />

                  Change photo

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(
                      event
                    ) =>
                      setSelectedPhoto(
                        event.target
                          .files?.[0] ||
                          null
                      )
                    }
                  />
                </label>

                <small>
                  JPG, PNG or WebP.
                  Maximum 5 MB.
                </small>
              </div>

              <div className="pd-profile-fields">
                <label>
                  <span>
                    Display name
                  </span>

                  <input
                    value={
                      displayName
                    }
                    onChange={(
                      event
                    ) =>
                      setDisplayName(
                        event.target
                          .value
                      )
                    }
                    maxLength={
                      60
                    }
                    required
                  />
                </label>

                <label>
                  <span>
                    Email
                  </span>

                  <input
                    value={
                      dashboard
                        ?.user
                        ?.email ||
                      ''
                    }
                    readOnly
                  />
                </label>

                <fieldset className="pd-semester-field">
                  <legend>Current semester</legend>
                  <div className="pd-semester-options">
                    {SEMESTERS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={semester === item ? 'active' : ''}
                        aria-pressed={semester === item}
                        onClick={() => setSemester(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <small>Changing this updates your homepage, archive defaults, subjects and study tools.</small>
                </fieldset>
              </div>

              <button
                type="submit"
                className="pd-save-profile"
                disabled={
                  savingProfile
                }
              >
                {savingProfile ? (
                  <>
                    <Loader2
                      className="pd-spin"
                      size={14}
                    />

                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={14}
                    />

                    Save profile
                  </>
                )}
              </button>
            </form>
          </section>
        )}

        {/* =================================================
            GOOGLE LINK
        ================================================= */}

        {GOOGLE_AUTH_CONFIGURED &&
          dashboard
            ?.user
            ?.authProvider ===
            'local' && (
            <section className="pd-google-strip">
              <div>
                <ShieldCheck
                  size={17}
                />

                <div>
                  <span>
                    Account access
                  </span>

                  <strong>
                    Add Google sign-in
                    as another login
                    option.
                  </strong>

                  <p>
                    Your normal
                    password login will
                    continue to work.
                  </p>
                </div>
              </div>

              <div className="pd-google-action">
                <GoogleLogin
                  onSuccess={
                    linkGoogle
                  }
                  onError={() =>
                    toast?.(
                      'Google sign-in is unavailable right now.',
                      'error'
                    )
                  }
                  text="continue_with"
                  width="230"
                />

                {linkingGoogle && (
                  <span>
                    Linking…
                  </span>
                )}
              </div>
            </section>
          )}

        {/* =================================================
            SEMESTER DESK
        ================================================= */}

        <section className="pd-workspace-strip">
          <div className="pd-workspace-title">
            <GraduationCap
              size={18}
            />

            <div>
              <span>
                Semester desk
              </span>

              <strong>
                {branchShort} ·
                Semester{' '}
                {semester}
              </strong>

              <small>
                These choices control
                your personal study
                shortcuts.
              </small>
            </div>
          </div>

          <label>
            <span>
              Branch
            </span>

            <select
              value={
                branch
              }
              onChange={(
                event
              ) =>
                setBranch(
                  event.target
                    .value
                )
              }
            >
              {BRANCHES.map(
                (
                  item
                ) => (
                  <option
                    key={
                      item.value
                    }
                    value={
                      item.value
                    }
                  >
                    {
                      item.label
                    }
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <span>
              Semester
            </span>

            <select
              value={
                semester
              }
              onChange={(
                event
              ) =>
                setSemester(
                  Number(
                    event.target
                      .value
                  )
                )
              }
            >
              {SEMESTERS.map(
                (
                  item
                ) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    Semester{' '}
                    {
                      item
                    }
                  </option>
                )
              )}
            </select>
          </label>

          <Link
            to={`/semester-survival?branch=${encodeURIComponent(
              branch
            )}&semester=${encodeURIComponent(
              semester
            )}`}
          >
            Open Survival Pack

            <ArrowRight
              size={13}
            />
          </Link>
        </section>

        {/* =================================================
            PERSONAL LEDGER
        ================================================= */}

        <section className="pd-ledger">
          <div>
            <span>
              Bookmarks
            </span>

            <strong>
              {formatNumber(
                stats.bookmarkCount
              )}
            </strong>

            <small>
              saved papers
            </small>
          </div>

          <div>
            <span>
              Papers
            </span>

            <strong>
              {formatNumber(
                stats.approvedContributions
              )}
            </strong>

            <small>
              approved uploads
            </small>
          </div>

          <div>
            <span>
              Solutions
            </span>

            <strong>
              {formatNumber(
                stats.approvedSolutions
              )}
            </strong>

            <small>
              approved answers
            </small>
          </div>

          <div>
            <span>
              Archive checks
            </span>

            <strong>
              {formatNumber(
                stats.verificationCount
              )}
            </strong>

            <small>
              verification actions
            </small>
          </div>

          <div>
            <span>
              Study actions
            </span>

            <strong>
              {formatNumber(
                studyActivity
              )}
            </strong>

            <small>
              local progress
            </small>
          </div>

          <div>
            <span>
              Impact
            </span>

            <strong>
              {formatNumber(
                totalImpact
              )}
            </strong>

            <small>
              views + downloads
            </small>
          </div>
        </section>

        {/* =================================================
            MAIN DESK
        ================================================= */}

        <section className="pd-main-grid">
          {/* ===============================================
              CONTINUE STUDYING
          =============================================== */}

          <article className="pd-study-desk">
            <header className="pd-section-head">
              <div>
                <span>
                  Continue
                </span>

                <h2>
                  Pick up your study
                  flow.
                </h2>

                <p>
                  Your saved local
                  progress from the
                  main preparation
                  tools.
                </p>
              </div>

              <BookOpenCheck
                size={20}
              />
            </header>

            <div className="pd-study-rows">
              {(dashboard?.continueStudying || []).slice(0, 4).map((item, index) => (
                <Link key={item._id} to={item.route} onClick={() => import('../services/productAnalyticsApi').then(({ trackProductEvent }) => trackProductEvent('study_resume', { routeKey: 'dashboard', type: item.entityType }).catch(() => {}))}>
                  <span className="pd-study-number">{String(index + 1).padStart(2, '0')}</span>
                  <div><span>{String(item.entityType || 'study').replace(/_/g, ' ')}</span><strong>{item.title}</strong><small>{item.subjectCode ? `${item.subjectCode} · ` : ''}{item.progress || 0}% progress</small></div>
                  <ArrowRight size={13} />
                </Link>
              ))}
              <Link to="/revision-sheets">
                <span className="pd-study-number">
                  01
                </span>

                <div>
                  <span>
                    Revision
                  </span>

                  <strong>
                    Revision Sheets
                  </strong>

                  <small>
                    {
                      localStudy.revisionChecks
                    }{' '}
                    topic checks saved
                  </small>
                </div>

                <ArrowRight
                  size={13}
                />
              </Link>

              <Link to="/exam-war-room">
                <span className="pd-study-number">
                  02
                </span>

                <div>
                  <span>
                    Exam prep
                  </span>

                  <strong>
                    War Room
                  </strong>

                  <small>
                    {
                      localStudy.warRoomChecks
                    }{' '}
                    missions completed
                  </small>
                </div>

                <ArrowRight
                  size={13}
                />
              </Link>

              <Link to="/mock-exams">
                <span className="pd-study-number">
                  03
                </span>

                <div>
                  <span>
                    Practice
                  </span>

                  <strong>
                    Mock Exams
                  </strong>

                  <small>
                    {
                      localStudy.mockEvaluations
                    }{' '}
                    evaluated mock
                    {localStudy.mockEvaluations ===
                    1
                      ? ''
                      : 's'}
                  </small>
                </div>

                <ArrowRight
                  size={13}
                />
              </Link>

              <Link
                to={`/semester-survival?branch=${encodeURIComponent(
                  branch
                )}&semester=${encodeURIComponent(
                  semester
                )}`}
              >
                <span className="pd-study-number">
                  04
                </span>

                <div>
                  <span>
                    Semester
                  </span>

                  <strong>
                    Survival Pack
                  </strong>

                  <small>
                    {
                      localStudy.survivalChecks
                    }{' '}
                    subjects marked
                    revised
                  </small>
                </div>

                <ArrowRight
                  size={13}
                />
              </Link>
            </div>

            {localStudy
              .latestMockEvaluation && (
              <div className="pd-latest-mock">
                <div className="pd-mock-score">
                  <span>
                    Latest mock
                  </span>

                  <strong>
                    {
                      localStudy
                        .latestMockEvaluation
                        .totalScore
                    }
                    /
                    {
                      localStudy
                        .latestMockEvaluation
                        .totalMarks
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Practice estimate
                  </span>

                  <strong>
                    {
                      localStudy
                        .latestMockEvaluation
                        .percentage
                    }
                    %
                  </strong>
                </div>

                <Link to="/mock-evaluation">
                  Open evaluation

                  <ArrowRight
                    size={12}
                  />
                </Link>
              </div>
            )}
          </article>

          {/* ===============================================
              SEMESTER COMPASS
          =============================================== */}

          <aside className="pd-semester-compass">
            <header className="pd-section-head compact">
              <div>
                <span>
                  Semester compass
                </span>

                <h2>
                  {branchShort} ·
                  Sem {semester}
                </h2>
              </div>

              <Target
                size={19}
              />
            </header>

            <div className="pd-completion-meter">
              <span>
                Archive support
              </span>

              <strong>
                {semesterLoading
                  ? '…'
                  : `${semesterPack
                      ?.summary
                      ?.archiveCompletionPct ??
                    0}%`}
              </strong>

              <div>
                <i
                  style={{
                    width:
                      `${
                        semesterPack
                          ?.summary
                          ?.archiveCompletionPct ??
                        0
                      }%`,
                  }}
                />
              </div>
            </div>

            <div className="pd-weak-subjects">
              <span className="pd-list-label">
                Subjects to inspect
              </span>

              {semesterLoading ? (
                <div className="pd-mini-loading">
                  <Loader2
                    className="pd-spin"
                    size={15}
                  />

                  Loading semester
                  data…
                </div>
              ) : weakSubjects.length ? (
                weakSubjects.map(
                  (
                    subject,
                    index
                  ) => (
                    <Link
                      key={
                        subject.subjectCode ||
                        index
                      }
                      to={
                        subject.links
                          ?.subjectHub ||
                        `/subject/${encodeURIComponent(
                          subject.subjectCode ||
                            subject.subject
                        )}`
                      }
                    >
                      <span>
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          '0'
                        )}
                      </span>

                      <div>
                        <strong>
                          {
                            subject.subject
                          }
                        </strong>

                        <small>
                          {
                            subject.subjectCode
                          }{' '}
                          ·{' '}
                          {
                            subject.supportBand
                          }{' '}
                          support
                        </small>
                      </div>

                      <b>
                        {
                          subject.supportScore
                        }
                      </b>
                    </Link>
                  )
                )
              ) : (
                <p className="pd-muted">
                  Semester intelligence
                  will appear here once
                  the pack loads.
                </p>
              )}
            </div>

            <Link
              className="pd-compass-link"
              to={`/semester-survival?branch=${encodeURIComponent(
                branch
              )}&semester=${encodeURIComponent(
                semester
              )}`}
            >
              Full semester pack

              <ChevronRight
                size={12}
              />
            </Link>
          </aside>
        </section>

        {/* =================================================
            FAST LANE
        ================================================= */}

        <section className="pd-fast-lane">
          <header>
            <div>
              <span>
                Fast lane
              </span>

              <strong>
                Go straight to a
                useful tool.
              </strong>
            </div>

            <Sparkles
              size={17}
            />
          </header>

          <div className="pd-fast-links">
            <Link to="/ask-paperstack">
              <MessageCircleQuestion
                size={15}
              />

              <span>
                <strong>
                  Ask PaperStack
                </strong>

                <small>
                  Explain a question
                </small>
              </span>
            </Link>

            <Link to="/mock-exams">
              <Trophy
                size={15}
              />

              <span>
                <strong>
                  Generate Mock
                </strong>

                <small>
                  Practice an exam
                </small>
              </span>
            </Link>

            <Link to="/search">
              <Search
                size={15}
              />

              <span>
                <strong>
                  Search
                </strong>

                <small>
                  Find papers &
                  resources
                </small>
              </span>
            </Link>

            <Link to="/notifications">
              <Bell
                size={15}
              />

              <span>
                <strong>
                  Notifications
                </strong>

                <small>
                  Check updates
                </small>
              </span>
            </Link>

            <Link to="/streaks">
              <Flame
                size={15}
              />

              <span>
                <strong>
                  Study Progress
                </strong>

                <small>
                  Streaks & badges
                </small>
              </span>
            </Link>

            <Link to="/verify-archive">
              <ShieldCheck
                size={15}
              />

              <span>
                <strong>
                  Verify Archive
                </strong>

                <small>
                  Check uploaded
                  papers
                </small>
              </span>
            </Link>
          </div>
        </section>

        {/* =================================================
            CONTRIBUTOR + COMMUNITY
        ================================================= */}

        <section className="pd-impact-section">
          <article className="pd-impact-ledger">
            <header className="pd-section-head">
              <div>
                <span>
                  Contributor record
                </span>

                <h2>
                  Your archive
                  footprint.
                </h2>

                <p>
                  Approved work and the
                  student activity it
                  has generated.
                </p>
              </div>

              <Award
                size={20}
              />
            </header>

            <div className="pd-impact-numbers">
              <div>
                <span>
                  XP
                </span>

                <strong>
                  {formatNumber(
                    contributor.xp
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Campus rank
                </span>

                <strong>
                  {contributor.rank
                    ? `#${contributor.rank}`
                    : '—'}
                </strong>
              </div>

              <div>
                <span>
                  Paper views
                </span>

                <strong>
                  {formatNumber(
                    contributor.impactViews
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Downloads
                </span>

                <strong>
                  {formatNumber(
                    contributor.impactDownloads
                  )}
                </strong>
              </div>
            </div>

            {!!contributor
              .badges
              ?.length && (
              <div className="pd-badge-row">
                {contributor.badges.map(
                  (
                    badge
                  ) => (
                    <span
                      key={
                        badge
                      }
                    >
                      <Medal
                        size={11}
                      />

                      {
                        badge
                      }
                    </span>
                  )
                )}
              </div>
            )}

            <div className="pd-review-status">
              <span>
                <b>
                  {
                    stats.pendingContributions ||
                    0
                  }
                </b>

                paper uploads pending
              </span>

              <span>
                <b>
                  {
                    stats.correctionsNeeded ||
                    0
                  }
                </b>

                need correction
              </span>

              <span>
                <b>
                  {
                    stats.pendingSolutions ||
                    0
                  }
                </b>

                solutions pending
              </span>
            </div>

            <Link
              className="pd-text-link"
              to="/contributors/me"
            >
              Open contributor
              profile

              <ArrowRight
                size={12}
              />
            </Link>
          </article>

          <aside className="pd-contribute-panel">
            <FolderUp
              size={22}
            />

            <span>
              Build PaperStack
            </span>

            <h2>
              Have something useful
              sitting in your
              gallery or Drive?
            </h2>

            <p>
              Share papers, notes,
              solutions or formula
              sheets instead of
              letting them disappear
              in old folders.
            </p>

            <strong>
              {formatNumber(
                contributionTotal
              )}{' '}
              contribution actions
            </strong>

            <div>
              <Link to="/contribute">
                Upload paper
              </Link>

              <Link to="/contribute-resource">
                Share resource
              </Link>
            </div>
          </aside>
        </section>

        {/* =================================================
            PERSONAL LIBRARY
        ================================================= */}

        <section className="pd-library-grid">
          {/* ===============================================
              BOOKMARKS
          =============================================== */}

          <article className="pd-library-panel">
            <header className="pd-section-head compact">
              <div>
                <span>
                  Personal library
                </span>

                <h2>
                  Saved items
                </h2>
              </div>

              <Bookmark
                size={19}
              />
            </header>

            {savedRecords.length ? (
              <div className="pd-record-list">
                {savedRecords
                  .slice(
                    0,
                    6
                  )
                  .map(
                    (
                      paper,
                      index
                    ) => (
                      <div
                        key={
                          paper._id
                        }
                      >
                        <span className="pd-record-index">
                          {String(
                            index +
                              1
                          ).padStart(
                            2,
                            '0'
                          )}
                        </span>

                        <div>
                          <strong>{paper.title || paper.subject || 'Saved item'}</strong>

                          <small>
                            {paper.entityType}{paper.subjectCode ? ` · ${paper.subjectCode}` : ''}

                            {paper.year
                              ? ` · ${paper.year}`
                              : ''}

                            {paper.examType
                              ? ` · ${paper.examType}`
                              : ''}
                          </small>
                        </div>

                        {paper.entityType !== 'paper' && paper.route && (
                          <Link to={paper.route}>Open</Link>
                        )}
                        {paper.entityType === 'paper' && paper.filePath && (
                          <a
                            href={
                              paper.filePath
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            PDF
                          </a>
                        )}
                      </div>
                    )
                  )}
              </div>
            ) : (
              <div className="pd-panel-empty">
                <Bookmark
                  size={18}
                />

                <p>
                  Save useful papers,
                  questions and resources and they will
                  appear here.
                </p>
              </div>
            )}
          </article>

          {/* ===============================================
              REQUESTS
          =============================================== */}

          <article className="pd-library-panel">
            <header className="pd-section-head compact">
              <div>
                <span>
                  Paper requests
                </span>

                <h2>
                  Missing-paper
                  status
                </h2>
              </div>

              <ClipboardList
                size={19}
              />
            </header>

            {dashboard
              ?.requests
              ?.length ? (
              <div className="pd-record-list">
                {dashboard.requests
                  .slice(
                    0,
                    6
                  )
                  .map(
                    (
                      request,
                      index
                    ) => (
                      <div
                        key={
                          request._id
                        }
                      >
                        <span className="pd-record-index">
                          {String(
                            index +
                              1
                          ).padStart(
                            2,
                            '0'
                          )}
                        </span>

                        <div>
                          <strong>
                            {
                              request.subject
                            }
                          </strong>

                          <small>
                            {
                              request.year
                            }{' '}
                            ·{' '}
                            {
                              request.examType
                            }{' '}
                            ·{' '}
                            {
                              request.requestCount
                            }{' '}
                            requests
                          </small>
                        </div>

                        <em
                          className={`pd-status ${request.status}`}
                        >
                          {statusLabel(
                            request.status
                          )}
                        </em>
                      </div>
                    )
                  )}
              </div>
            ) : (
              <div className="pd-panel-empty">
                <ClipboardList
                  size={18}
                />

                <p>
                  You have not
                  requested a missing
                  paper yet.
                </p>
              </div>
            )}

            <Link
              className="pd-text-link"
              to="/missing-papers"
            >
              Open missing papers

              <ChevronRight
                size={12}
              />
            </Link>
          </article>
        </section>

        {/* =================================================
            ACTIVITY LOG
        ================================================= */}

        <section className="pd-activity-log">
          <header className="pd-section-head">
            <div>
              <span>
                Activity log
              </span>

              <h2>
                Your recent work on
                PaperStack
              </h2>

              <p>
                Paper uploads and
                student solutions are
                kept together here.
              </p>
            </div>

            <Activity
              size={20}
            />
          </header>

          <div className="pd-activity-columns">
            {/* =============================================
                CONTRIBUTIONS
            ============================================= */}

            <article>
              <header>
                <div>
                  <FileText
                    size={15}
                  />

                  <span>
                    Contributions
                  </span>
                </div>

                <Link to="/contribute">
                  New upload
                </Link>
              </header>

              {dashboard
                ?.recentContributions
                ?.length ? (
                <div className="pd-activity-list">
                  {dashboard
                    .recentContributions
                    .slice(
                      0,
                      6
                    )
                    .map(
                      (
                        contribution
                      ) => (
                        <div
                          key={
                            contribution._id
                          }
                        >
                          <FileCheck2
                            size={14}
                          />

                          <div>
                            <strong>
                              {
                                contribution.subject
                              }
                            </strong>

                            <span>
                              {
                                contribution.year
                              }{' '}
                              ·{' '}
                              {
                                contribution.examType
                              }
                            </span>
                          </div>

                          <em
                            className={`pd-status ${contribution.status}`}
                          >
                            {statusLabel(
                              contribution.status
                            )}
                          </em>
                        </div>
                      )
                    )}
                </div>
              ) : (
                <p className="pd-muted">
                  Your contribution
                  history will appear
                  after your first
                  upload.
                </p>
              )}
            </article>

            {/* =============================================
                SOLUTIONS
            ============================================= */}

            <article>
              <header>
                <div>
                  <BookOpenCheck
                    size={15}
                  />

                  <span>
                    Student solutions
                  </span>
                </div>

                <Link to="/questions">
                  Questions
                </Link>
              </header>

              {dashboard
                ?.recentSolutions
                ?.length ? (
                <div className="pd-activity-list">
                  {dashboard
                    .recentSolutions
                    .slice(
                      0,
                      6
                    )
                    .map(
                      (
                        solution
                      ) => (
                        <div
                          key={
                            solution._id
                          }
                        >
                          <CheckCircle2
                            size={14}
                          />

                          <div>
                            <strong>
                              {solution
                                .question
                                ?.subject ||
                                'Question solution'}
                            </strong>

                            <span>
                              {solution
                                .question
                                ?.year ||
                                ''}

                              {solution
                                .question
                                ?.examType
                                ? ` · ${solution.question.examType}`
                                : ''}

                              {` · ${
                                solution.helpfulCount ||
                                0
                              } helpful`}
                            </span>
                          </div>

                          <div className="pd-solution-actions">
                            {solution
                              .question
                              ?._id && (
                              <Link
                                to={`/questions/${solution.question._id}`}
                              >
                                Open
                              </Link>
                            )}

                            <em
                              className={`pd-status ${solution.status}`}
                            >
                              {statusLabel(
                                solution.status
                              )}
                            </em>
                          </div>
                        </div>
                      )
                    )}
                </div>
              ) : (
                <p className="pd-muted">
                  Solutions you submit
                  to PYQs will appear
                  here.
                </p>
              )}
            </article>
          </div>
        </section>

        {/* =================================================
            FOOT LINKS
        ================================================= */}

        <footer className="pd-foot-links">
          <div>
            <LibraryBig
              size={15}
            />

            <span>
              More from your
              PaperStack workspace
            </span>
          </div>

          <nav>
            <Link to="/trending">
              Trending
            </Link>

            <Link to="/branch-competition">
              Branch League
            </Link>

            <Link to="/archive-progress">
              Archive Progress
            </Link>

            <Link to="/notifications">
              Notifications
            </Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
