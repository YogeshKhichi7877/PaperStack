import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  askSelectedQuestion,
  getQuestionAssistantContext,
} from '../services/questionAssistantApi';
import { submitAiFeedback } from '../services/aiFeedbackApi';
import { trackProductEvent } from '../services/productAnalyticsApi';
import { getMiniPractice } from '../services/questionBrowserApi';
import AcademicAiActions from './AcademicAiActions';
import LoadingButton from './LoadingButton';
import RelatedPyqs from './RelatedPyqs';

import './QuestionAssistantPanel.css';
import './StudentUtility.css';

const MathAnswer = React.lazy(() => import('./MathAnswer'));

function hasMeaningfulAnswer(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length < 20) return false;

  const metadataOnly = [
    /automatic numerical verification could not validate[^.]*\.?/gi,
    /the extracted expression could not be evaluated safely\.?/gi,
    /ai-generated practice answer[^.]*\.?/gi,
    /check (?:the )?(?:given values|calculations)[^.]*\.?/gi,
    /reused (?:the|a) current versioned answer[^.]*\.?/gi,
    /paperstack (?:could not|couldn't) generate the solution\.?/gi,
  ].reduce((answer, pattern) => answer.replace(pattern, ' '), text)
    .replace(/\s+/g, ' ')
    .trim();

  return metadataOnly.length >= 20;
}

function answerHeading(intent) {
  if (intent === 'hint') return 'Hint';
  if (intent === 'formula') return 'Formula guide';
  if (intent === 'concepts') return 'Concepts to revise';
  if (intent === 'structure') return 'Answer structure';
  if (intent === 'explain') return 'Explanation';
  return 'Solution';
}

function AiFeedbackControls({ answerId, toast }) {
  const [choice, setChoice] = useState('');
  const [reason, setReason] = useState('incorrect');
  const [busy, setBusy] = useState(false);
  if (!answerId) return null;
  const send = async (value, selectedReason = '') => {
    if (busy) return;
    setBusy(true);
    try {
      await submitAiFeedback(answerId, value, selectedReason);
      setChoice(value);
      trackProductEvent('ai_feedback', { routeKey: 'question_assistant', type: value }).catch(() => {});
      toast?.('Thanks — your feedback will improve future answers.', 'success');
    } catch (error) {
      toast?.(error.response?.status === 401 ? 'Sign in to rate AI answers.' : 'Could not save feedback.', 'error');
    } finally { setBusy(false); }
  };
  return (
    <div className="ai-feedback">
      <span>Was this useful?</span>
      <button type="button" className={choice === 'helpful' ? 'active' : ''} disabled={busy} onClick={() => send('helpful')}>Helpful</button>
      <button type="button" className={choice === 'not_helpful' ? 'active' : ''} disabled={busy} onClick={() => send('not_helpful', reason)}>Not helpful</button>
      {choice === 'not_helpful' && <select aria-label="Why was this not helpful?" value={reason} onChange={(event) => { setReason(event.target.value); send('not_helpful', event.target.value); }}><option value="incorrect">Incorrect</option><option value="unclear">Unclear</option><option value="incomplete">Incomplete</option><option value="not_relevant">Not relevant</option><option value="other">Other</option></select>}
    </div>
  );
}

export default function QuestionAssistantPanel({
  question,
  toast,
  onAnswered,
}) {
  const questionId =
    question?._id;

  const [
    context,
    setContext,
  ] = useState(null);

  const [
    contextLoading,
    setContextLoading,
  ] = useState(true);

  const [
    input,
    setInput,
  ] = useState('');

  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    sending,
    setSending,
  ] = useState(false);
  const requestActive = useRef(false);


  useEffect(() => {
    if (!questionId) {
      return;
    }

    let mounted = true;
    setMessages([]);
    setInput('');

    setContextLoading(true);

    getQuestionAssistantContext(
      questionId
    )
      .then((data) => {
        if (mounted) {
          setContext(
            data || null
          );
        }
      })
      .catch((error) => {
        console.error(
          'Question assistant context failed:',
          error
        );

        if (toast) {
          toast(
            error.response?.data?.error ||
              'Could not load Ask This Question.',
            'error'
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setContextLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [
    questionId,
    toast,
  ]);

  const quickSummary =
    useMemo(() => {
      const solutions =
        context
          ?.approvedSolutions
          ?.length || 0;

      const similar =
        context
          ?.similarQuestions
          ?.length || 0;

      return {
        solutions,
        similar,
      };
    }, [context]);

  async function submit(
    customQuery
  ) {
    const query =
      String(
        customQuery ||
        input
      ).trim();

    if (
      !query ||
      sending || requestActive.current ||
      !questionId
    ) {
      return;
    }

    setMessages(
      (current) => [
        ...current,
        {
          id:
            `user_${Date.now()}`,
          role: 'user',
          text: query,
        },
      ]
    );

    setInput('');
    requestActive.current = true;
    setSending(true);

    try {
      const data =
        await askSelectedQuestion(
          questionId,
          {
            query,
          }
        );

      if (!hasMeaningfulAnswer(data.answer)) {
        const invalidAnswerError = new Error(
          'PaperStack could not generate the solution.'
        );
        invalidAnswerError.code = 'EMPTY_AI_ANSWER';
        throw invalidAnswerError;
      }

      setMessages(
        (current) => [
          ...current,
          {
            id:
              `assistant_${Date.now()}`,
            role:
              'assistant',
            query,
            answer:
              data.answer,
            mode:
              data.mode,
            intent:
              data.intent,
            warnings:
              data.warnings || [],
            answerStructure:
              data.answerStructure ||
              '',
            topics:
              data.topics || [],
            solutions:
              data.approvedSolutions ||
              [],
            similarQuestions:
              data.similarQuestions ||
              [],
            answerId: data.answerId || '',
            cache: data.cache || null,
            practiceAnswer: Boolean(data.practiceAnswer),
            verification: data.verification || null,
            questionKind: data.questionKind || '',
          },
        ]
      );
      onAnswered?.();
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.message ||
        'PaperStack could not generate the solution.';

      setMessages(
        (current) => [
          ...current,
          {
            id: `assistant_error_${Date.now()}`,
            role: 'error',
            query,
            text: message,
          },
        ]
      );

      if (toast) {
        toast(
          message,
          'error'
        );
      }
    } finally {
      requestActive.current = false;
      setSending(false);
    }
  }

  async function handleAcademicAction(action) {
    if (action.key === 'similar') {
      const related = context?.similarQuestions || [];
      setMessages((current) => [...current,
        { id: `user_${Date.now()}`, role: 'user', text: action.query },
        { id: `assistant_${Date.now()}_related`, role: 'assistant', query: action.query, answer: related.length ? `I found ${related.length} related PYQ${related.length === 1 ? '' : 's'} in the archive.` : 'No strong related PYQ is indexed yet.', mode: 'local', intent: 'similar', similarQuestions: related, warnings: [], topics: [] },
      ]);
      onAnswered?.();
      return;
    }
    if (action.key === 'practice') {
      if (sending || requestActive.current) return;
      requestActive.current = true;
      setSending(true);
      try {
        const data = await getMiniPractice({ questionId, limit: 5 });
        const practice = data.questions || [];
        setMessages((current) => [...current,
          { id: `user_${Date.now()}`, role: 'user', text: action.query },
          { id: `assistant_${Date.now()}_practice`, role: 'assistant', query: action.query, answer: practice.length ? `Here is a deterministic ${practice.length}-question practice set ranked from the PaperStack archive.` : 'There are not enough related indexed questions for a mini practice set yet.', mode: 'local', intent: 'practice', similarQuestions: practice, warnings: [], topics: [] },
        ]);
        trackProductEvent('mini_practice_start', { routeKey: 'question_assistant', type: 'question' }).catch(() => {});
        onAnswered?.();
      } catch { toast?.('Could not build a practice set.', 'error'); }
      finally { requestActive.current = false; setSending(false); }
      return;
    }
    submit(action.query);
  }

  if (!questionId) {
    return null;
  }

  return (
    <section className="qa-panel">
      <div className="qa-heading">
        <div>
          <span>
            Ask This Question
          </span>

          <h2>
            Stuck on this PYQ?
          </h2>

          <p>
            Get a hint, understand
            what the examiner is
            asking, compare similar
            PYQs, or open approved
            student solutions.
          </p>
        </div>

        <div className="qa-context-stat">
          <strong>
            {
              contextLoading
                ? '…'
                : quickSummary.similar
            }
          </strong>

          <span>
            related PYQs
          </span>

          <small>
            {
              contextLoading
                ? 'Loading context'
                : `${quickSummary.solutions} approved solution${quickSummary.solutions === 1 ? '' : 's'}`
            }
          </small>
        </div>
      </div>

      <div className="qa-mode">
        <div>
          <strong>PaperStack study assistant</strong>
        </div>
      </div>

      <div className="qa-quick-actions">
        <AcademicAiActions disabled={sending} onAction={handleAcademicAction} />
        {!contextLoading && quickSummary.solutions === 0 && (
          <button type="button" disabled={sending} onClick={() => submit('Generate a complete worked practice answer for this question. Show all necessary reasoning and verify calculations only if this is genuinely numerical. State the final answer clearly.')}>
            Generate practice answer
          </button>
        )}
      </div>

      <div className="qa-composer">
        <textarea
          rows={3}
          value={input}
          disabled={sending}
          onChange={(event) =>
            setInput(
              event.target.value
            )
          }
          placeholder="Ask about this question… e.g. Why do we use homogeneous coordinates here?"
          onKeyDown={(event) => {
            if (
              event.key ===
                'Enter' &&
              !event.shiftKey
            ) {
              event.preventDefault();
              submit(input);
            }
          }}
        />

        <div>
          <small>
            Enter to send ·
            Shift+Enter for a new line
          </small>

          <LoadingButton
            type="button"
            loading={sending}
            loadingText="Generating answer…"
            disabled={
              !input.trim()
            }
            onClick={() =>
              submit(input)
            }
          >
            Ask PaperStack
          </LoadingButton>
        </div>
      </div>

      <div className="qa-thread">
        {!messages.length && (
          <div className="qa-empty">
            <strong>
              Start with a quick
              action above.
            </strong>

            <p>
              For exam preparation,
              “Give me a hint” is useful
              before opening the full
              solution.
            </p>
          </div>
        )}

        {
          messages.map(
            (message) =>
              message.role ===
              'user' ? (
                <article
                  key={
                    message.id
                  }
                  className="qa-user"
                >
                  <span>
                    You
                  </span>

                  <p>
                    {
                      message.text
                    }
                  </p>
                </article>
              ) : message.role === 'error' ? (
                <article
                  key={message.id}
                  className="qa-generation-error"
                >
                  <div>
                    <strong>
                      PaperStack couldn't generate the solution.
                    </strong>
                    <p>
                      Please try again. Your question and approved archive context are still available.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => submit(message.query)}
                  >
                    Try again
                  </button>
                </article>
              ) : (
                <article
                  key={
                    message.id
                  }
                  className="qa-assistant"
                >
                  <div className="qa-question-anchor">{message.query}</div>
                  <div className="qa-answer-head">
                    <div>
                      <span>
                        PaperStack
                      </span>

                      <strong>
                        {
                          message.intent
                        }
                      </strong>
                    </div>

                    <em>{message.mode === 'ai' ? 'PaperStack AI' : 'PaperStack guidance'}</em>
                  </div>

                  <h3 className="qa-solution-title">
                    {answerHeading(message.intent)}
                  </h3>

                  <React.Suspense fallback={<p>{message.answer}</p>}>
                    <MathAnswer>{message.answer}</MathAnswer>
                  </React.Suspense>

                  {message.practiceAnswer && (
                    <small className="qa-practice-note">
                      AI-generated practice answer — not an approved student solution.
                    </small>
                  )}

                  {message.cache?.hit && <small className="qa-cache-note">{message.cache.matchType === 'semantic' ? 'Reused a highly similar, positively rated answer.' : 'Reused the current versioned answer for this content.'}</small>}

                  <AiFeedbackControls answerId={message.answerId} toast={toast} />

                  {
                    message
                      .warnings
                      ?.length >
                      0 && (
                      <div className="qa-warning">
                        {
                          message.warnings.map(
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
                      </div>
                    )
                  }

                  {
                    message
                      .topics
                      ?.length >
                      0 && (
                      <div className="qa-tags">
                        {
                          message.topics.map(
                            (
                              topic
                            ) => (
                              <span
                                key={
                                  topic
                                }
                              >
                                {
                                  topic
                                }
                              </span>
                            )
                          )
                        }
                      </div>
                    )
                  }

                  {
                    message
                      .answerStructure && (
                      <details className="qa-structure">
                        <summary>
                          Exam answer structure
                        </summary>

                        <p>
                          {
                            message
                              .answerStructure
                          }
                        </p>
                      </details>
                    )
                  }

                  {
                    message
                      .solutions
                      ?.length >
                      0 && (
                      <section className="qa-evidence">
                        <h3>
                          Approved solutions
                        </h3>

                        {
                          message.solutions.map(
                            (
                              solution,
                              index
                            ) => (
                              <div
                                key={
                                  solution._id
                                }
                                className="qa-solution"
                              >
                                <div>
                                  <strong>
                                    Solution {
                                      index +
                                      1
                                    }
                                  </strong>

                                  <span>
                                    {
                                      solution
                                        .authorName
                                    }
                                    {' · '}
                                    {
                                      solution
                                        .helpfulCount
                                    } helpful
                                  </span>
                                </div>

                                <React.Suspense fallback={<p>{solution.answerText}</p>}>
                                  <MathAnswer>{solution.answerText}</MathAnswer>
                                </React.Suspense>
                              </div>
                            )
                          )
                        }
                      </section>
                    )
                  }

                  <RelatedPyqs questions={message.similarQuestions || []} empty={false} />
                </article>
              )
          )
        }

        {sending && (
          <article
            className="qa-solving"
            aria-live="polite"
          >
            <span className="qa-solving-spinner" />
            <div>
              <strong>
                Solving this question…
              </strong>
              <p>
                Building a complete answer from the question and available archive context.
              </p>
            </div>
          </article>
        )}
      </div>
      {!messages.length && <RelatedPyqs questions={context?.similarQuestions || []} />}
    </section>
  );
}
