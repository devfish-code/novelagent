import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('should render progress information', () => {
    render(
      <ProgressBar
        projectName="test-project"
        phase={2}
        percentage={50}
        current={5}
        total={10}
        message="Generating chapters"
        status="generating"
      />
    );

    expect(screen.getByText(/Generating chapters/i)).toBeInTheDocument();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it('should show completed status', () => {
    render(
      <ProgressBar
        projectName="test-project"
        phase={5}
        percentage={100}
        current={10}
        total={10}
        message="All done"
        status="completed"
      />
    );

    expect(screen.getByText(/All done/i)).toBeInTheDocument();
  });

  it('should show error status', () => {
    render(
      <ProgressBar
        projectName="test-project"
        phase={3}
        percentage={30}
        current={3}
        total={10}
        message="Error occurred"
        status="failed"
      />
    );

    expect(screen.getByText(/Error occurred/i)).toBeInTheDocument();
  });
});
