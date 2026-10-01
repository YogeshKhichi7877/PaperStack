import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { StudentProfileProvider, useStudentProfile } from './StudentProfileContext';

jest.mock('axios');

function ProfileProbe() {
  const { displayName, semester, onboardingCompleted } = useStudentProfile();
  return <output aria-label="Current student profile">{`${displayName}|${semester || ''}|${onboardingCompleted}`}</output>;
}

function renderProfile(user, overrides = {}) {
  const onUserUpdate = overrides.onUserUpdate || jest.fn();
  const toast = overrides.toast || jest.fn();
  const view = render(
    <StudentProfileProvider user={user} authReady onUserUpdate={onUserUpdate} toast={toast}>
      <div>PaperStack content</div>
      <ProfileProbe />
    </StudentProfileProvider>
  );
  return { ...view, onUserUpdate, toast };
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

test('guests see the full product without semester onboarding', async () => {
  renderProfile(null);
  expect(await screen.findByText('PaperStack content')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('a signed-in student without a semester receives onboarding over the product', async () => {
  renderProfile({ username: 'new-student', name: 'New Student', semester: null, onboardingCompleted: false });
  const dialog = await screen.findByRole('dialog', { name: "Let's get started" });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(screen.getByText('PaperStack content')).toBeInTheDocument();
  expect(screen.getByText('Home Awaits')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByLabelText('Name to display')).toHaveFocus());
});

test('name and semester are both required and semester selection is announced', async () => {
  renderProfile({ username: 'new-student', name: 'New Student', semester: null, onboardingCompleted: false });
  const name = await screen.findByLabelText('Name to display');
  const continueButton = screen.getByRole('button', { name: 'Continue' });
  const semesterFive = screen.getByRole('button', { name: 'Semester 5' });

  expect(continueButton).toBeDisabled();
  fireEvent.click(semesterFive);
  expect(semesterFive).toHaveAttribute('aria-pressed', 'true');
  expect(continueButton).toBeEnabled();

  fireEvent.change(name, { target: { value: 'Y' } });
  expect(continueButton).toBeDisabled();
  fireEvent.change(name, { target: { value: 'Yogesh' } });
  expect(continueButton).toBeEnabled();
});

test('Continue persists onboarding and updates profile context without a refresh', async () => {
  localStorage.setItem('token', 'test-token');
  axios.patch.mockResolvedValue({
    data: { user: { displayName: 'Yogesh', semester: 5, onboardingCompleted: true } },
  });
  const profileChanged = jest.fn();
  window.addEventListener('paperstack:profile-changed', profileChanged);
  const { onUserUpdate, toast } = renderProfile({
    username: 'new-student',
    name: 'New Student',
    semester: null,
    onboardingCompleted: false,
  });

  const name = await screen.findByLabelText('Name to display');
  fireEvent.change(name, { target: { value: '  Yogesh  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Semester 5' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

  await waitFor(() => expect(axios.patch).toHaveBeenCalledWith(
    'http://localhost:5000/api/user/profile',
    { displayName: 'Yogesh', semester: 5, onboardingCompleted: true },
    { headers: { Authorization: 'Bearer test-token' } }
  ));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByLabelText('Current student profile')).toHaveTextContent('Yogesh|5|true');
  expect(localStorage.getItem('userSemester')).toBe('5');
  expect(localStorage.getItem('paperstack_preferred_semester')).toBe('5');
  expect(onUserUpdate).toHaveBeenCalledTimes(1);
  expect(profileChanged).toHaveBeenCalledTimes(1);
  expect(profileChanged.mock.calls[0][0].detail).toEqual({
    displayName: 'Yogesh',
    semester: 5,
    onboardingCompleted: true,
  });
  expect(toast).toHaveBeenCalledWith('Academic preferences saved.', 'success');
  window.removeEventListener('paperstack:profile-changed', profileChanged);
});

test('a failed save keeps onboarding open and does not persist a semester', async () => {
  localStorage.setItem('token', 'test-token');
  axios.patch.mockRejectedValue({ response: { data: { error: 'Profile unavailable.' } } });
  const { toast } = renderProfile({
    username: 'new-student',
    name: 'New Student',
    semester: null,
    onboardingCompleted: false,
  });

  await screen.findByRole('dialog', { name: "Let's get started" });
  fireEvent.click(screen.getByRole('button', { name: 'Semester 3' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

  await waitFor(() => expect(toast).toHaveBeenCalledWith('Profile unavailable.', 'error'));
  expect(screen.getByRole('dialog', { name: "Let's get started" })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  expect(localStorage.getItem('userSemester')).toBeNull();
  expect(localStorage.getItem('paperstack_preferred_semester')).toBeNull();
});

test('the close button dismisses onboarding only for the current mount', async () => {
  const user = { username: 'new-student', name: 'New Student', semester: null, onboardingCompleted: false };
  const view = renderProfile(user);
  await screen.findByRole('dialog', { name: "Let's get started" });
  fireEvent.click(screen.getByRole('button', { name: 'Close onboarding for now' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(localStorage.getItem('userSemester')).toBeNull();
  view.unmount();

  renderProfile(user);
  expect(await screen.findByRole('dialog', { name: "Let's get started" })).toBeInTheDocument();
});

test('a returning student with a completed profile is not asked again', async () => {
  renderProfile({
    username: 'returning',
    name: 'Returning Student',
    semester: 5,
    onboardingCompleted: true,
  });
  expect(await screen.findByText('PaperStack content')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
