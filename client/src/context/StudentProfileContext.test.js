import { render, screen } from '@testing-library/react';
import { StudentProfileProvider } from './StudentProfileContext';

function renderProfile(user) {
  return render(
    <StudentProfileProvider user={user} authReady onUserUpdate={() => {}} toast={() => {}}>
      <div>PaperStack content</div>
    </StudentProfileProvider>
  );
}

test('guests see the full product without semester onboarding', async () => {
  renderProfile(null);
  expect(await screen.findByText('PaperStack content')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('a signed-in student without a semester receives onboarding', async () => {
  renderProfile({ username: 'new-student', name: 'New Student', semester: null });
  expect(await screen.findByRole('dialog', { name: 'Welcome to PaperStack 👋' })).toBeInTheDocument();
  expect(screen.queryByText('PaperStack content')).not.toBeInTheDocument();
});

test('a returning student with a semester is not asked again', async () => {
  renderProfile({ username: 'returning', name: 'Returning Student', semester: 5 });
  expect(await screen.findByText('PaperStack content')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
