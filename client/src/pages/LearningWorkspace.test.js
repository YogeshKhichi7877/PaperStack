import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LearningTodayPage from './LearningTodayPage';
import LearningClassPage from './LearningClassPage';
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
  sessionStorage.clear();
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
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/learn?class=checkin1'));
  expect(api.createPracticeSession).not.toHaveBeenCalled();
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
  fireEvent.click(screen.getByText('Change explanation style'));
  fireEvent.click(screen.getByRole('button', { name: 'Clear a doubt' }));
  expect(api.askLearningTutor).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('textbox', { name: 'Ask a question about this topic' })).toHaveFocus();
});

test('saved classes open a stable continuation page and preserve all class topics', async () => {
  const checkin = { _id: 'c1', subjectCode: 'CS301', subjectName: 'Operating Systems', originalText: 'Today we studied semaphore.', topics: [topic], createdAt: '2026-10-12' };
  api.getLearningCheckin.mockResolvedValue({ checkin });
  render(<LearningClassPage checkinId="c1" user={user} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Continue learning' }));
  expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('checkinId=c1'));
  expect(screen.getByRole('link', { name: 'My classes' })).toHaveAttribute('href', '/learn');
});

test('an unfinished class offers resume practice with its saved class id', async () => {
  api.getLearningCheckin.mockResolvedValue({ checkin: { _id: 'c1', subjectCode: 'CS301', subjectName: 'Operating Systems', topics: [topic], practiceSessionId: 's1' } });
  api.createPracticeSession.mockResolvedValue({ session: { _id: 's1' }, resumed: true });
  render(<LearningClassPage checkinId="c1" user={user} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Resume practice' }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/practice?sessionId=s1&checkinId=c1'));
  expect(api.createPracticeSession).not.toHaveBeenCalled();
});

test('wrong MCQ choice is marked and correct option and explanation are shown', async () => {
  mockSearch = 'sessionId=session1';
  api.getPracticeSession.mockResolvedValue({ session: { ...session, checkinId: 'c1' }, questions, attempts: [] });
  api.submitPracticeAttempt.mockResolvedValue({ attempt: { questionId: 'q1' }, evaluation: { correct: false, actualScore: 0, evaluationMode: 'objective', correctAnswer: 'B', explanation: 'B is correct because it protects the critical section.' }, complete: false });
  render(<PracticePage user={user} />);
  fireEvent.click(await screen.findByRole('radio', { name: 'A' }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
  expect(await screen.findByText('B is correct because it protects the critical section.')).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /A Your answer · Incorrect/ }).closest('label')).toHaveClass('is-wrong');
  expect(screen.getByRole('radio', { name: /B Correct answer/ }).closest('label')).toHaveClass('is-correct');
  expect(screen.getByRole('link', { name: 'Back to class' })).toHaveAttribute('href', '/learn?class=c1');
});

test('leaving an unsaved class draft and returning restores the text', async () => {
  const first = render(<LearningTodayPage user={user} />);
  fireEvent.change(await screen.findByRole('textbox', { name: 'What did your class cover today?' }), { target: { value: 'We learned SQL joins today.' } });
  first.unmount();
  render(<LearningTodayPage user={user} />);
  expect(await screen.findByRole('textbox', { name: 'What did your class cover today?' })).toHaveValue('We learned SQL joins today.');
});

test('reopening a saved explanation uses a read request instead of generating another answer', async () => {
  mockSearch = 'subjectCode=CS301&topicName=Semaphore&checkinId=c1';
  api.getSavedLearningTutor.mockResolvedValueOnce({ resumed: true, session: { _id: 'tutor1', lastMode: 'EXAMPLE' }, reply: { title: 'Your saved explanation', explanation: 'A semaphore coordinates access.' } });
  render(<LearningTutorPage user={user} />);
  expect(await screen.findByRole('heading', { name: 'Your saved explanation' })).toBeInTheDocument();
  expect(api.askLearningTutor).not.toHaveBeenCalled();
  expect(screen.getByRole('link', { name: 'Back to class' })).toHaveAttribute('href', '/learn?class=c1');
});

test('leaving while questions are prepared does not redirect the student back into practice', async () => {
  mockSearch = 'subjectCode=CS301&topicKey=CS301%3Asemaphore&checkinId=c1';
  let finish;
  api.createPracticeSession.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const page = render(<PracticePage user={user} />);
  await waitFor(() => expect(api.createPracticeSession).toHaveBeenCalled());
  page.unmount();
  finish({ session: { _id: 's1' } });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('leaving a tutor while progress saves does not override the back navigation', async () => {
  api.getSavedLearningTutor.mockResolvedValueOnce({ resumed: true, session: { _id: 'tutor1' }, reply: { title: 'Saved lesson', explanation: 'A semaphore coordinates access.' } });
  let finish;
  api.completeLearningTutorSession.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const page = render(<LearningTutorPage user={user} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Practice now' }));
  page.unmount();
  finish({});
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(mockNavigate).not.toHaveBeenCalled();
});
