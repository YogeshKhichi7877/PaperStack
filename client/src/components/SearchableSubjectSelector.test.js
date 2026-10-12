import { fireEvent, render, screen } from '@testing-library/react';
import SearchableSubjectSelector from './SearchableSubjectSelector';

jest.mock('../services/learningApi', () => ({ getCanonicalSubjects: jest.fn() }));

test('searches one canonical subject list by normalized code and alias', () => {
  const onChange = jest.fn();
  render(<SearchableSubjectSelector value="" onChange={onChange} semester={5} options={[
    { subjectCode: 'CS504', subject: 'Cloud Computing & Big Data Infrastructure', aliases: ['Cloud Computing and Big Data'], semester: 5 },
    { subjectCode: 'CS502', subject: 'Computer Graphics', aliases: ['CG'], semester: 5 },
  ]} />);
  fireEvent.click(screen.getByRole('button', { name: /choose a subject/i }));
  fireEvent.change(screen.getByPlaceholderText(/search code/i), { target: { value: 'cs-504' } });
  fireEvent.click(screen.getByRole('option', { name: /CS504/i }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ subjectCode: 'CS504', subjectName: 'Cloud Computing & Big Data Infrastructure' }));
});


test('duplicate code spellings appear once and retain searchable aliases', () => {
  render(<SearchableSubjectSelector value="" onChange={() => {}} options={[
    { subjectCode: 'CS-302', subject: 'Database Management Systems' },
    { subjectCode: 'CS302', subject: 'DBMS' },
  ]} />);
  fireEvent.click(screen.getByRole('button', { name: /choose a subject/i }));
  expect(screen.getAllByRole('option')).toHaveLength(1);
  fireEvent.change(screen.getByPlaceholderText(/search code/i), { target: { value: 'DBMS' } });
  expect(screen.getAllByRole('option')).toHaveLength(1);
});
