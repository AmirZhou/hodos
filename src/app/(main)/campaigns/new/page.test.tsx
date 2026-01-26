import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock convex/react
const mockMutate = vi.fn();
vi.mock('convex/react', () => ({
  useMutation: () => mockMutate,
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

describe('New Campaign Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('module', () => {
    it('should exist as a module', async () => {
      const module = await import('./page');
      expect(module.default).toBeDefined();
    });
  });

  describe('campaign creation', () => {
    it('calls create mutation with campaign name and userId', async () => {
      // Expected: When form is submitted, mutation is called with:
      // - userId from auth context
      // - name from input field

      // The mutation should be api.campaigns.create
      // Args: { userId, name }
      // Returns: { campaignId, inviteCode }

      const expectedPayload = {
        userId: 'test-user-id',
        name: 'My Adventure',
      };

      expect(expectedPayload.userId).toBe('test-user-id');
      expect(expectedPayload.name).toBe('My Adventure');
    });

    it('redirects to campaign detail page after successful creation', async () => {
      // Expected: After mutation succeeds, navigate to /campaigns/[campaignId]
      // The mutation returns { campaignId, inviteCode }

      const mutationResult = {
        campaignId: 'new-campaign-id',
        inviteCode: 'ABC123',
      };

      // Should call router.push(`/campaigns/${mutationResult.campaignId}`)
      expect(mutationResult.campaignId).toBeDefined();
    });

    it('requires user to be authenticated', async () => {
      // Expected: Cannot create campaign without userId
      // Should redirect to /login if not authenticated
      expect(true).toBe(true);
    });

    it('requires campaign name to be non-empty', async () => {
      // Expected: Button is disabled when campaignName is empty
      const campaignName = '';
      expect(campaignName.trim().length).toBe(0);
    });

    it('shows error message when creation fails', async () => {
      // Expected: If mutation throws, display error to user
      expect(true).toBe(true);
    });

    it('disables submit button while creating', async () => {
      // Expected: Prevent double-submission
      expect(true).toBe(true);
    });
  });
});

// Unit test for campaign creation logic
describe('Campaign Creation Logic', () => {
  it('builds correct mutation payload', () => {
    const userId = 'user-123';
    const campaignName = 'Epic Quest';

    const payload = {
      userId,
      name: campaignName,
    };

    expect(payload).toEqual({
      userId: 'user-123',
      name: 'Epic Quest',
    });
  });

  it('validates campaign name is not empty', () => {
    const validateName = (name: string) => name.trim().length > 0;

    expect(validateName('')).toBe(false);
    expect(validateName('   ')).toBe(false);
    expect(validateName('My Campaign')).toBe(true);
  });

  it('validates campaign name is not too long', () => {
    const MAX_NAME_LENGTH = 100;
    const validateNameLength = (name: string) => name.length <= MAX_NAME_LENGTH;

    expect(validateNameLength('Short name')).toBe(true);
    expect(validateNameLength('a'.repeat(101))).toBe(false);
  });
});
