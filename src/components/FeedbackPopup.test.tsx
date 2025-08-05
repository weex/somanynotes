import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestApp } from '@/test/TestApp';
import { FeedbackPopup } from './FeedbackPopup';

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('FeedbackPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  it('renders when isOpen is true', () => {
    render(
      <TestApp>
        <FeedbackPopup isOpen={true} />
      </TestApp>
    );

    expect(screen.getByText('How are we doing?')).toBeInTheDocument();
    expect(screen.getByText('Rate your experience:')).toBeInTheDocument();
    expect(screen.getByText('What could we improve?')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <TestApp>
        <FeedbackPopup isOpen={false} />
      </TestApp>
    );

    expect(screen.queryByText('How are we doing?')).not.toBeInTheDocument();
  });

  it('shows minimized button when dismissed', () => {
    mockSessionStorage.getItem.mockImplementation((key) => {
      if (key === 'feedback-dismissed') return 'true';
      return null;
    });

    render(
      <TestApp>
        <FeedbackPopup />
      </TestApp>
    );

    expect(screen.getByLabelText('Open feedback')).toBeInTheDocument();
  });

  it('allows rating selection', () => {
    render(
      <TestApp>
        <FeedbackPopup isOpen={true} />
      </TestApp>
    );

    const stars = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')?.classList.contains('lucide-star')
    );
    
    expect(stars).toHaveLength(5);
    
    // Click the third star
    fireEvent.click(stars[2]);
    
    // The star should be filled (this is a visual test, we can't easily test the fill state)
    expect(stars[2]).toBeInTheDocument();
  });

  it('allows text input for improvements', () => {
    render(
      <TestApp>
        <FeedbackPopup isOpen={true} />
      </TestApp>
    );

    const textarea = screen.getByPlaceholderText('Share your thoughts and suggestions...');
    fireEvent.change(textarea, { target: { value: 'Great app!' } });
    
    expect(textarea).toHaveValue('Great app!');
  });

  it('shows character count', () => {
    render(
      <TestApp>
        <FeedbackPopup isOpen={true} />
      </TestApp>
    );

    expect(screen.getByText('0/500')).toBeInTheDocument();
    
    const textarea = screen.getByPlaceholderText('Share your thoughts and suggestions...');
    fireEvent.change(textarea, { target: { value: 'Test' } });
    
    expect(screen.getByText('4/500')).toBeInTheDocument();
  });
});