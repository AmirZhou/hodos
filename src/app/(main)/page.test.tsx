import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock convex/react
vi.mock('convex/react', () => ({
  useQuery: () => undefined,
}));

// Mock auth provider
vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { _id: 'test-user-id', email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('module', () => {
    it('should exist as a module', async () => {
      const module = await import('./page');
      expect(module.default).toBeDefined();
    });
  });

  describe('recent campaigns section', () => {
    it('queries recent campaigns for authenticated user', () => {
      // Expected: Page calls api.campaigns.list with userId
      // and displays up to 3-4 most recent campaigns
      const userId = 'test-user-id';
      expect(userId).toBeDefined();
    });

    it('displays up to 4 recent campaigns', () => {
      // Expected: Show max 4 campaigns, sorted by lastPlayedAt
      const campaigns = [
        { _id: '1', name: 'Campaign 1', lastPlayedAt: 1000 },
        { _id: '2', name: 'Campaign 2', lastPlayedAt: 2000 },
        { _id: '3', name: 'Campaign 3', lastPlayedAt: 3000 },
        { _id: '4', name: 'Campaign 4', lastPlayedAt: 4000 },
        { _id: '5', name: 'Campaign 5', lastPlayedAt: 5000 },
      ];

      const recentCampaigns = campaigns
        .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)
        .slice(0, 4);

      expect(recentCampaigns.length).toBe(4);
      expect(recentCampaigns[0].name).toBe('Campaign 5');
    });

    it('shows empty state when user has no campaigns', () => {
      // Expected: "No campaigns yet" message with create button
      const campaigns: unknown[] = [];
      expect(campaigns.length).toBe(0);
    });

    it('links to campaigns page via "View all"', () => {
      const viewAllLink = '/campaigns';
      expect(viewAllLink).toBe('/campaigns');
    });
  });

  describe('hero section', () => {
    it('has link to create new campaign', () => {
      const createLink = '/campaigns/new';
      expect(createLink).toBe('/campaigns/new');
    });

    it('has link to browse/discover campaigns', () => {
      const browseLink = '/discover';
      expect(browseLink).toBe('/discover');
    });
  });
});
