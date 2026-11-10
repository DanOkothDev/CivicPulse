import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FormattedAssistantMessage from './FormattedAssistantMessage';

describe('FormattedAssistantMessage', () => {
  it('renders headings, emphasis, lists and pipe tables without raw Markdown syntax', () => {
    const answer = [
      '## County summary',
      '',
      '**Nakuru** has the most open reports.',
      '',
      '- Roads: 12',
      '- Water: 5',
      '',
      '| County | Open |',
      '| --- | ---: |',
      '| Nakuru | 12 |',
      '| Kisumu | 8 |',
    ].join('\n');

    const { container } = render(<FormattedAssistantMessage text={answer} />);

    expect(screen.getByRole('heading', { name: 'County summary' })).toBeTruthy();
    expect(screen.getByText('Nakuru', { selector: 'strong' })).toBeTruthy();
    expect(screen.getByRole('list').children).toHaveLength(2);
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByText('12', { selector: 'td' })).toBeTruthy();
    expect(container.textContent).not.toContain('|');
    expect(container.textContent).not.toContain('**');
  });

  it('renders only http(s) Markdown links as clickable links', () => {
    const { container } = render(<FormattedAssistantMessage text={'Read [CivicPulse](https://example.org/help).'} />);
    expect(screen.getByRole('link', { name: 'CivicPulse' }).getAttribute('href')).toBe('https://example.org/help');
    expect(container.innerHTML).not.toContain('javascript:');
  });
});
