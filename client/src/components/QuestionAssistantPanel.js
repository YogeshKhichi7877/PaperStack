import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  askSelectedQuestion,
  getQuestionAssistantContext,
} from '../services/questionAssistantApi';

import './QuestionAssistantPanel.css';

const MathAnswer = React.lazy(() => import('./MathAnswer'));

const QUICK_ACTIONS = [
  {
    key: 'explain',
    label: 'Explain this question',
    query:
      'Explain what this question is asking in simple words and tell me how to approach it in the exam.',
  },
  {
    key: 'hint',
    label: 'Give me a hint',
    query:
      'Give me a hint only. Do not give the full answer.',
  },
  {
    key: 'concepts',
    label: 'Concepts to revise',
    query:
      'What concepts and prerequisites should I revise before solving this?',
  },
  {
    key: 'similar',
    label: 'Similar PYQs',
    query:
      'Show me similar or related PYQs from the archive.',
  },
  {
    key: 'solution',
    label: 'Show solution',
    query:
      'Show me the approved solution if one exists. Otherwise tell me how to approach the answer.',
  },
];

function sourceUrl(question) {
  const base =
    question?.paper?.filePath ||
    '';

  if (!base) {
    return '';
  }

  const page =
    Number(
      question
        ?.sourceLocation
        ?.pageStart ||
      0
    );

  return page > 0
    ? `${base}#page=${page}`
    : base;
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
      sending ||
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
    setSending(true);

    try {
      const data =
        await askSelectedQuestion(
          questionId,
          {
            query,
          }
        );

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
          },
        ]
      );
      onAnswered?.();
    } catch (error) {
      if (toast) {
        toast(
          error.response?.data?.error ||
            'Could not answer this question.',
          'error'
        );
      }
    } finally {
      setSending(false);
    }
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
        {
          QUICK_ACTIONS.map(
            (action) => (
              <button
                type="button"
                key={
                  action.key
                }
                disabled={
                  sending
                }
                onClick={() =>
                  submit(
                    action.query
                  )
                }
              >
                {action.label}
              </button>
            )
          )
        }
        {!contextLoading && quickSummary.solutions === 0 && (
          <button type="button" disabled={sending} onClick={() => submit('Generate a complete worked practice answer for this question. Show all steps and verify numerical calculations.')}>
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

          <button
            type="button"
            disabled={
              sending ||
              !input.trim()
            }
            onClick={() =>
              submit(input)
            }
          >
            {
              sending
                ? 'Thinking…'
                : 'Ask'
            }
          </button>
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

                  <React.Suspense fallback={<p>{message.answer}</p>}>
                    <MathAnswer>{message.answer}</MathAnswer>
                  </React.Suspense>

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

                                <pre>
                                  {
                                    solution
                                      .answerText
                                  }
                                </pre>
                              </div>
                            )
                          )
                        }
                      </section>
                    )
                  }

                  {
                    message
                      .similarQuestions
                      ?.length >
                      0 && (
                      <section className="qa-evidence">
                        <h3>
                          Similar PYQs
                        </h3>

                        <div className="qa-similar-list">
                          {
                            message.similarQuestions.map(
                              (
                                item
                              ) => (
                                <div
                                  key={
                                    item._id
                                  }
                                  className="qa-similar"
                                >
                                  <div>
                                    <div className="qa-tags">
                                      {
                                        item.questionLabel && (
                                          <span>
                                            {
                                              item.questionLabel
                                            }
                                          </span>
                                        )
                                      }

                                      {
                                        item.year && (
                                          <span>
                                            {
                                              item.year
                                            }
                                          </span>
                                        )
                                      }

                                      {
                                        item.examType && (
                                          <span>
                                            {
                                              item.examType
                                            }
                                          </span>
                                        )
                                      }

                                      {
                                        item.similarity != null && (
                                          <span>
                                            {
                                              item.similarity
                                            }
                                            % related
                                          </span>
                                        )
                                      }
                                    </div>

                                    <p>
                                      {
                                        item
                                          .questionText
                                      }
                                    </p>
                                  </div>

                                  <div className="qa-similar-actions">
                                    <Link
                                      to={
                                        `/questions/${item._id}`
                                      }
                                    >
                                      Open
                                    </Link>

                                    {
                                      sourceUrl(
                                        item
                                      ) && (
                                        <a
                                          href={
                                            sourceUrl(
                                              item
                                            )
                                          }
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          PDF
                                        </a>
                                      )
                                    }
                                  </div>
                                </div>
                              )
                            )
                          }
                        </div>
                      </section>
                    )
                  }
                </article>
              )
          )
        }
      </div>
    </section>
  );
}
