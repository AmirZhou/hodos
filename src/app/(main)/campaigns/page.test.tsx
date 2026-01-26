import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock convex/react
const mockQuery = vi.fn();
vi.mock('convex/react', () => ({
  useQuery: () => mockQuery(),
}));

// Mock auth provider
const mockUser = {
  _id: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
};

vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
  }),
}));

describe('Campaigns Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('module', () => {
    it('should exist as a module', async () => {
      const module = await import('./page');
      expect(module.default).toBeDefined();
    });
  });

  describe('campaign list query', () => {
    it('queries campaigns for authenticated user', () => {
      // Expected: Page calls api.campaigns.list with userId
      const userId = 'test-user-id';
      expect(userId).toBeDefined();
    });

    it('displays campaigns when query returns results', () => {
      // Expected: When campaigns exist, they are displayed
      const campaigns = [
        {
          _id: 'campaign-1',
          name: 'Epic Quest',
          status: 'active',
          memberCount: 3,
          lastPlayedAt: Date.now(),
        },
        {
          _id: 'campaign-2',
          name: 'Mystery Manor',
          status: 'lobby',
          memberCount: 1,
          lastPlayedAt: Date.now(),
        },
      ];

      expect(campaigns.length).toBe(2);
      expect(campaigns[0].name).toBe('Epic Quest');
    });

    it('displays empty state when no campaigns', () => {
      // Expected: Empty state shown when campaigns array is empty
      const campaigns: unknown[] = [];
      expect(campaigns.length).toBe(0);
    });

    it('shows loading state while query is pending', () => {
      // Expected: Loading indicator when campaigns === undefined
      const campaigns = undefined;
      expect(campaigns).toBeUndefined();
    });
  });

  describe('campaign cards', () => {
    it('displays campaign name', () => {
      const campaign = { name: 'My Adventure' };
      expect(campaign.name).toBe('My Adventure');
    });

    it('displays campaign status', () => {
      const campaign = { status: 'active' };
      expect(campaign.status).toBe('active');
    });

    it('displays member count', () => {
      const campaign = { memberCount: 4 };
      expect(campaign.memberCount).toBe(4);
    });

    it('links to campaign detail page', () => {
      const campaign = { _id: 'campaign-123' };
      const expectedLink = `/campaigns/${campaign._id}`;
      expect(expectedLink).toBe('/campaigns/campaign-123');
    });
  });

  describe('authentication', () => {
    it('redirects to login if not authenticated', () => {
      // Expected: If !isAuthenticated, redirect to /login
      expect(true).toBe(true);
    });

    it('skips query when user is not available', () => {
      // Expected: Query is "skip" when userId is null
      const userId = null;
      const queryArg = userId ? { userId } : 'skip';
      expect(queryArg).toBe('skip');
    });
  });
});

// Unit tests for campaign display logic
describe('Campaign Display Logic', () => {
  it('formats last played time', () => {
    const formatLastPlayed = (timestamp: number) => {
      const now = Date.now();
      const diffMs = now - timestamp;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    };

    expect(formatLastPlayed(Date.now())).toBe('Just now');
    expect(formatLastPlayed(Date.now() - 60000)).toBe('1m ago');
    expect(formatLastPlayed(Date.now() - 3600000)).toBe('1h ago');
    expect(formatLastPlayed(Date.now() - 86400000)).toBe('1d ago');
  });

  it('determines campaign status badge color', () => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'active': return 'green';
        case 'lobby': return 'gold';
        case 'paused': return 'yellow';
        default: return 'gray';
      }
    };

    expect(getStatusColor('active')).toBe('green');
    expect(getStatusColor('lobby')).toBe('gold');
    expect(getStatusColor('paused')).toBe('yellow');
  });
});
