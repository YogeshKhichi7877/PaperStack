import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LearningTodayPage from './LearningTodayPage';
import LearningTutorPage from './LearningTutorPage';
import PracticePage from './PracticePage';
import LearningDashboardPage from './LearningDashboardPage';
import AcademicLeaderboardPage from './AcademicLeaderboardPage';
import * as api from '../services/learningApi';

const mockNavigate = jest.fn();
let mockSearch = '';
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(mockSearch)],
  useParams: () => ({ topicId: 'CS301:semaphore' }),
}), { virtual: true });
jest.mock('../components/MathAnswer', () => ({ children }) => <div>{children}</div>);
jest.mock('../services/learningApi');

const user = { _id: 'student', name: 'Yogesh', semester: 5, branch: 'CSE' };
const topic = { topicKey: 'CS301:semaphore', name: 'Semaphore', questionCount: 5 };
const dashboard = { rating: { globalRating: 1000 }, dueReviews: [], weakTopics: [], mastery: [], recentCheckins: [] };
const session = { _id: 'session1', mode: 'TOPIC', subjectCode: 'CS301', subjectName: 'Operating Systems', topicKeys: [topic.topicKey] };
const questions = [{ _id: 'q1', questionText: 'First question', options: ['A', 'B'] }, { _id: 'q2', questionText: 'Second question', options: ['A', 'B'] }];

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch = '';
  api.getLearningDashboard.mockResolvedValue(dashboard);
  api.getPrivateStudyResources.mockResolvedValue({ resources: [] });
  api.getCanonicalSubjects.mockResolvedValue({ subjects: [] });
});

test('saving a class adds it to the timeline and offers a topic tutor without forcing practice', async () => {
  api.mapLearningTopics.mockResolvedValue({ subject: { code: 'CS301', name: 'Operating Systems' }, topics: [topic], availableTopics: [topic] });
  api.saveLearningCheckin.mockResolvedValue({ checkin: { _id: 'checkin1', subjectCode: 'CS301', subjectName: 'Operating Systems', topics: [topic], createdAt: '2026-10-11T12:00:00Z' } });
  render(<LearningTodayPage user={user} />);
  fireEvent.change(await screen.findByRole('textbox', { name: 'What did your class cover today?' }), { target: { value: 'Today we studied semaphore.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Confirm topics' }));
  expect(await screen.findByText('What would help next?')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Recent classes' })).toBeInTheDocument();
  expect(api.createPracticeSession).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Understand with AI Semaphore/i }));
  expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/learn/topic/CS301%3Asemaphore?'));
});

test('practice resumes at the first unanswered question', async () => {
  mockSearch = 'sessionId=session1';
  api.getPracticeSession.mockResolvedValue({ session, questions, attempts: [{ questionId: 'q1' }] });
  render(<PracticePage user={user} />);
  expect(await screen.findByRole('heading', { name: 'Second question' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'First question' })).not.toBeInTheDocument();
});

test('completed practice opens a completion state instead of another attempt', async () => {
  mockSearch = 'sessionId=session1';
  api.getPracticeSession.mockResolvedValue({ session, questions, attempts: questions.map((question) => ({ questionId: question._id })) });
  render(<PracticePage user={user} />);
  expect(await screen.findByRole('heading', { name: 'Session complete.' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View progress' })).toHaveAttribute('href', '/learning-dashboard');
});

test('retrying an answer after network failure uses the same attempt identity', async () => {
  mockSearch = 'sessionId=session1';
  api.getPracticeSession.mockResolvedValue({ session, questions, attempts: [] });
  api.submitPracticeAttempt.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValueOnce({ attempt: { questionId: 'q1' }, evaluation: { correct: true, actualScore: 1, feedback: 'Correct.' }, mastery: [], complete: false });
  render(<PracticePage user={user} />);
  fireEvent.click(await screen.findByRole('radio', { name: 'A' }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Submit answer' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
  expect(await screen.findByText('Correct.')).toBeInTheDocument();
  expect(api.submitPracticeAttempt.mock.calls[0][1].clientAttemptId).toBe(api.submitPracticeAttempt.mock.calls[1][1].clientAttemptId);
  expect(screen.getByRole('radio', { name: 'A' })).toBeDisabled();
});

test('learning dashboard offers retry after a failed load', async () => {
  api.getLearningDashboard.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(dashboard);
  render(<LearningDashboardPage user={user} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('heading', { name: 'The work is adding up.' })).toBeInTheDocument();
});

test('rankings recover after a failed request', async () => {
  api.getAcademicLeaderboard.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ rows: [] });
  render(<AcademicLeaderboardPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('No established public ratings yet.')).toBeInTheDocument();
});

test('tutor recovers after failure and asking a doubt does not call AI with an empty question', async () => {
  mockSearch = 'subjectCode=CS301&topicName=Semaphore';
  api.askLearningTutor.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ session: { _id: 'tutor1' }, reply: { title: 'Understanding semaphore', explanation: 'A semaphore coordinates access.' } });
  render(<LearningTutorPage user={user} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('heading', { name: 'Understanding semaphore' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear a doubt' }));
  expect(api.askLearningTutor).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('textbox', { name: 'Ask a question about this topic' })).toHaveFocus();
});
