import { fireEvent, render, screen, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import SubjectPage from './SubjectPage';
import { fetchSubjectResources, fetchSubjectSummary } from '../services/resourceApi';

jest.mock('../services/resourceApi');
jest.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => jest.fn(),
  useParams: () => ({ subjectKey: 'Computer Graphics' }),
}), { virtual: true });

test('resource categories stay named and visible, including empty ones, and filter cards', async () => {
  fetchSubjectSummary.mockResolvedValue({ subjectName: 'Computer Graphics', subjectCode: 'CS502' });
  fetchSubjectResources.mockResolvedValue({ resources: [
    { _id: 'paper', kind: 'question_paper', title: 'Mid-sem 2026', fileUrl: '/paper.pdf' },
    { _id: 'notes', kind: 'notes', title: 'Rasterization notes', fileUrl: '/notes.pdf' },
  ] });
  render(<HelmetProvider><SubjectPage /></HelmetProvider>);
  const categories = await screen.findByRole('group', { name: 'Filter by resource type' });
  for (const label of ['Papers', 'Notes', 'Quizzes', 'Lab Material', 'Formula Sheets', 'Assignments', 'Viva Questions']) {
    expect(within(categories).getByRole('button', { name: new RegExp(label) })).toBeVisible();
  }
  fireEvent.click(within(categories).getByRole('button', { name: /Notes/ }));
  expect(screen.getByRole('heading', { name: 'Rasterization notes' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Mid-sem 2026' })).not.toBeInTheDocument();
  fireEvent.click(within(categories).getByRole('button', { name: /Quizzes/ }));
  expect(screen.getByText('No quizzes have been added for this subject.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Upload Quizzes' }).getAttribute('href')).toContain('kind=quiz');
});
