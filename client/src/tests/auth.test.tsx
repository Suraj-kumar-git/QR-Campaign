import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Auth from '../pages/auth';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/auth', mockSetLocation]
}));

// Mock toast hook
vi.mock('../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock API requests
global.fetch = vi.fn();

describe('Auth Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactNode) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('renders login and register tabs', () => {
    renderWithProviders(<Auth />);
    
    expect(screen.getByTestId('tab-login')).toBeInTheDocument();
    expect(screen.getByTestId('tab-register')).toBeInTheDocument();
  });

  it('shows login form by default', () => {
    renderWithProviders(<Auth />);
    
    expect(screen.getByTestId('input-login-username')).toBeInTheDocument();
    expect(screen.getByTestId('input-login-password')).toBeInTheDocument();
    expect(screen.getByTestId('button-login')).toBeInTheDocument();
  });

  it('switches to register tab when clicked', async () => {
    renderWithProviders(<Auth />);
    
    fireEvent.click(screen.getByTestId('tab-register'));
    
    await waitFor(() => {
      expect(screen.getByTestId('input-register-username')).toBeInTheDocument();
      expect(screen.getByTestId('input-register-password')).toBeInTheDocument();
      expect(screen.getByTestId('button-register')).toBeInTheDocument();
    });
  });
});
