import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import Page from './page';

it('renders the minimal rural migration entry point', () => {
  render(<Page />);
  expect(screen.getByRole('heading', { name: /귀농·귀촌/ })).toBeTruthy();
});
