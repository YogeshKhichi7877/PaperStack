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
  useSearchParams,
} from 'react-router-dom';

import {
  evaluateMockAnswers,
  getMockEvaluationStatus,
} from '../services/mockEvaluationApi';

import './MockEvaluationPage.css';

function loadMock(mockId) {
  try {
    if (mockId) {
      const direct = localStorage.getItem(
        `paperstack_mock_definition_${mockId}`
      );

      if (direct) {
        return JSON.parse(direct);
      }
    }

    const last = localStorage.getItem(
      'paperstack_last_mock'
    );

    return last
      ? JSON.parse(last)
      : null;
  } catch {
    return null;
  }
}

function answerStorageKey(mockId) {
  return `paperstack_mock_answers_${mockId || 'unknown'}`;
}

function resultStorageKey(mockId) {
  return `paperstack_mock_evaluation_${mockId || 'unknown'}`;
}

function loadAnswers(mockId) {
  try {
    const raw = localStorage.getItem(
      answerStorageKey(mockId)
    );

    return raw
      ? JSON.parse(raw)
      : {};
  } catch {
    return {};
  }
}

function loadResult(mockId) {
  try {
    const raw = localStorage.getItem(
      resultStorageKey(mockId)
    );

    return raw
      ? JSON.parse(raw)
      : null;
  } catch {
    return null;
  }
}

export default function MockEvaluationPage({
  toast,
}) {
  const [
    searchParams,
  ] = useSearchParams();

  const queryMockId =
    searchParams.get('mockId') || '';

  const [
    mock,
    setMock,
  ] = useState(
    () =>
      loadMock(queryMockId)
  );

  const mockId =
    mock?.mockId ||
    queryMockId;

  const [
    answers,
    setAnswers,
  ] = useState(
    () =>
      loadAnswers(mockId)
  );

  const [
    mode,
    setMode,
  ] = useState('local');

  const [
    aiAvailable,
    setAiAvailable,
  ] = useState(false);

  const [
    aiModel,
    setAiModel,
  ] = useState('');

  const [
    evaluating,
    setEvaluating,
  ] = useState(false);

  const [
    result,
    setResult,
  ] = useState(
    () =>
      loadResult(mockId)
  );

  useEffect(() => {
    const loaded =
      loadMock(queryMockId);

    setMock(loaded);

    const nextId =
      loaded?.mockId ||
      queryMockId;

    setAnswers(
      loadAnswers(
        nextId
      )
    );

    setResult(
      loadResult(
        nextId
      )
    );
  }, [queryMockId]);

  useEffect(() => {
    getMockEvaluationStatus()
      .then((data) => {
        setAiAvailable(
          Boolean(
            data?.aiAvailable
          )
        );

        setAiModel(
          data?.aiModel ||
          ''
        );
      })
      .catch((error) => {
        console.error(
          'Evaluation status failed:',
          error
        );
      });
  }, []);

  useEffect(() => {
    if (!mockId) {
      return;
    }

    try {
      localStorage.setItem(
        answerStorageKey(
          mockId
        ),
        JSON.stringify(
          answers
        )
      );
    } catch {}
  }, [
    answers,
    mockId,
  ]);

  const evaluationById =
    useMemo(
      () =>
        new Map(
          (
            result
              ?.items ||
            []
          ).map(
            (
              item
            ) => [
              String(
                item.questionId
              ),
              item,
            ]
          )
        ),
      [result]
    );

  const answeredCount =
    mock?.questions
      ?.filter(
        (
          question
        ) =>
          String(
            answers[
              question._id
            ] ||
            ''
          ).trim()
      )
      .length ||
    0;

  function updateAnswer(
    questionId,
    value
  ) {
    setAnswers(
      (
        current
      ) => ({
        ...current,
        [questionId]:
          value,
      })
    );
  }

  async function evaluate() {
    if (
      !mock
        ?.questions
        ?.length ||
      evaluating
    ) {
      return;
    }

    const payload = {
      mockId:
        mock.mockId,
      mode:
        mode === 'ai' &&
        aiAvailable
          ? 'ai'
          : 'local',
      answers:
        mock.questions.map(
          (
            question
          ) => ({
            questionId:
              question._id,
            answerText:
              answers[
                question._id
              ] ||
              '',
          })
        ),
    };

    setEvaluating(true);

    try {
      const data =
        await evaluateMockAnswers(
          payload
        );

      setResult(data);

      try {
        localStorage.setItem(
          resultStorageKey(
            mock.mockId
          ),
          JSON.stringify(
            data
          )
        );
      } catch {}

      if (toast) {
        toast(
          'Mock evaluation complete.',
          'success'
        );
      }
    } catch (error) {
      if (toast) {
        toast(
          error.response?.data?.error ||
            'Failed to evaluate the mock.',
          'error'
        );
      }
    } finally {
      setEvaluating(
        false
      );
    }
  }

  function clearAnswers() {
    setAnswers({});
    setResult(null);

    try {
      localStorage.removeItem(
        answerStorageKey(
          mockId
        )
      );

      localStorage.removeItem(
        resultStorageKey(
          mockId
        )
      );
    } catch {}
  }

  if (!mock) {
    return (
      <main className="mv-page">
        <Helmet>
          <title>
            Mock Evaluation - PaperStack
          </title>
        </Helmet>

        <div className="mv-shell">
          <div className="mv-state">
            <h1>
              No mock is loaded.
            </h1>

            <p>
              Generate a mock exam
              first, then open its
              evaluation workspace.
            </p>

            <Link to="/mock-exams">
              Generate Mock
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mv-page">
      <Helmet>
        <title>
          Mock Evaluation - PaperStack
        </title>

        <meta
          name="description"
          content="Evaluate PaperStack mock-exam answers with local heuristics or Gemini-assisted scoring."
        />
      </Helmet>

      <div className="mv-shell">
        <section className="mv-hero">
          <div>
            <span>
              Phase 19 · Mock Evaluation
            </span>

            <h1>
              Write your answers. Then measure what is actually missing.
            </h1>

            <p>
              PaperStack can evaluate
              locally or use Gemini for
              semantic answer analysis.
              Scores are practice
              estimates, not official
              college grades.
            </p>
          </div>

          <div className="mv-hero-score">
            <strong>
              {
                result
                  ? `${result.totalScore}/${result.totalMarks}`
                  : `${answeredCount}/${mock.questions.length}`
              }
            </strong>

            <span>
              {
                result
                  ? `${result.percentage}% estimated`
                  : 'answers written'
              }
            </span>

            <small>
              {
                result
                  ? `${result.mode === 'ai' ? 'AI-assisted' : 'Local'} evaluation`
                  : `${mock.generatedMarks} mark mock`
              }
            </small>
          </div>
        </section>

        <section className="mv-controls">
          <div>
            <span>
              {
                mock.subject
                  ?.subjectCode
              }
              {' · '}
              {
                mock.subject
                  ?.subject
              }
            </span>

            <strong>
              {
                mock.examType ||
                'All exam types'
              }
              {' · '}
              {
                mock.generatedMarks
              } marks
            </strong>
          </div>

          <label>
            Evaluator

            <select
              value={
                mode
              }
              onChange={(
                event
              ) =>
                setMode(
                  event.target
                    .value
                )
              }
            >
              <option value="local">
                Local
              </option>

              <option
                value="ai"
                disabled={
                  !aiAvailable
                }
              >
                AI-assisted
              </option>
            </select>
          </label>

          <div className="mv-ai-status">
            <strong>
              {
                aiAvailable
                  ? 'AI ready'
                  : 'Local only'
              }
            </strong>

            <small>
              {
                aiAvailable
                  ? aiModel
                  : 'Configure Gemini to enable semantic scoring.'
              }
            </small>
          </div>

          <button
            type="button"
            className="primary"
            disabled={
              evaluating
            }
            onClick={
              evaluate
            }
          >
            {
              evaluating
                ? 'Evaluating…'
                : 'Evaluate Mock'
            }
          </button>

          <button
            type="button"
            onClick={
              clearAnswers
            }
          >
            Clear
          </button>
        </section>

        {
          result
            ?.warnings
            ?.length >
            0 && (
            <section className="mv-warning">
              {
                result.warnings.map(
                  (
                    warning
                  ) => (
                    <p
                      key={
                        warning
                      }
                    >
                      {
                        warning
                      }
                    </p>
                  )
                )
              }
            </section>
          )
        }

        {
          result && (
            <section className="mv-overall">
              <div>
                <span>
                  Practice score
                </span>

                <strong>
                  {
                    result.totalScore
                  }/{
                    result.totalMarks
                  }
                </strong>
              </div>

              <div>
                <span>
                  Estimated accuracy
                </span>

                <strong>
                  {
                    result.percentage
                  }%
                </strong>
              </div>

              <div>
                <span>
                  Answered
                </span>

                <strong>
                  {
                    result.answeredCount
                  }/{
                    result.questionCount
                  }
                </strong>
              </div>

              <div className="mv-overall-feedback">
                <span>
                  Overall feedback
                </span>

                <p>
                  {
                    result
                      .overallFeedback
                  }
                </p>
              </div>
            </section>
          )
        }

        <section className="mv-question-list">
          {
            mock.questions.map(
              (
                question
              ) => {
                const evaluation =
                  evaluationById.get(
                    String(
                      question._id
                    )
                  );

                return (
                  <article
                    key={
                      question._id
                    }
                    className="mv-question"
                  >
                    <div className="mv-question-head">
                      <div>
                        <span>
                          Q{
                            question.number
                          }
                          {' · '}
                          {
                            question.marks
                          } marks
                        </span>

                        <h2>
                          {
                            question
                              .questionText
                          }
                        </h2>
                      </div>

                      {
                        evaluation && (
                          <div className="mv-mini-score">
                            <strong>
                              {
                                evaluation.score
                              }/{
                                evaluation.maxMarks
                              }
                            </strong>

                            <span>
                              {
                                evaluation
                                  .estimatedAccuracy
                              }%
                            </span>
                          </div>
                        )
                      }
                    </div>

                    <label className="mv-answer">
                      Your answer

                      <textarea
                        rows={
                          Math.min(
                            12,
                            Math.max(
                              5,
                              Number(
                                question
                                  .marks ||
                                2
                              ) + 3
                            )
                          )
                        }
                        value={
                          answers[
                            question._id
                          ] ||
                          ''
                        }
                        onChange={(
                          event
                        ) =>
                          updateAnswer(
                            question._id,
                            event.target
                              .value
                          )
                        }
                        placeholder="Write your exam-style answer here. Show formulas, steps, definitions, reasoning, or diagrams in words where relevant."
                      />
                    </label>

                    {
                      evaluation && (
                        <section className="mv-feedback">
                          <div className="mv-feedback-grid">
                            <div>
                              <span>
                                Accuracy estimate
                              </span>

                              <strong>
                                {
                                  evaluation
                                    .estimatedAccuracy
                                }%
                              </strong>
                            </div>

                            <div>
                              <span>
                                Confidence
                              </span>

                              <strong>
                                {
                                  evaluation
                                    .confidence
                                }
                              </strong>
                            </div>

                            <div>
                              <span>
                                Reference
                              </span>

                              <strong>
                                {
                                  evaluation
                                    .referenceBasis
                                }
                              </strong>
                            </div>
                          </div>

                          <p className="mv-main-feedback">
                            {
                              evaluation
                                .feedback
                            }
                          </p>

                          {
                            evaluation
                              .strengths
                              ?.length >
                              0 && (
                              <div className="mv-feedback-block">
                                <strong>
                                  What worked
                                </strong>

                                <ul>
                                  {
                                    evaluation.strengths.map(
                                      (
                                        item
                                      ) => (
                                        <li
                                          key={
                                            item
                                          }
                                        >
                                          {
                                            item
                                          }
                                        </li>
                                      )
                                    )
                                  }
                                </ul>
                              </div>
                            )
                          }

                          {
                            evaluation
                              .missingPoints
                              ?.length >
                              0 && (
                              <div className="mv-feedback-block">
                                <strong>
                                  Missing / weak points
                                </strong>

                                <div className="mv-tags">
                                  {
                                    evaluation.missingPoints.map(
                                      (
                                        item
                                      ) => (
                                        <span
                                          key={
                                            item
                                          }
                                        >
                                          {
                                            item
                                          }
                                        </span>
                                      )
                                    )
                                  }
                                </div>
                              </div>
                            )
                          }

                          <div className="mv-next-step">
                            <strong>
                              Next step
                            </strong>

                            <p>
                              {
                                evaluation
                                  .nextStep
                              }
                            </p>
                          </div>

                          <div className="mv-question-actions">
                            <Link
                              to={
                                `/questions/${question._id}`
                              }
                            >
                              Open question + solutions
                            </Link>

                            <Link
                              to={
                                `/questions/${question._id}`
                              }
                            >
                              Ask this question
                            </Link>
                          </div>
                        </section>
                      )
                    }
                  </article>
                );
              }
            )
          }
        </section>

        <section className="mv-disclaimer">
          <strong>
            Practice estimate only.
          </strong>

          <p>
            {
              result
                ?.disclaimer ||
              'PaperStack evaluation is designed for self-practice. Final grading can differ based on faculty marking schemes, diagrams, derivations, partial credit, and expected wording.'
            }
          </p>
        </section>
      </div>
    </main>
  );
}
