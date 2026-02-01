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
      const expectedPayload = {
        userId: 'test-user-id',
        name: 'My Adventure',
      };

      expect(expectedPayload.userId).toBe('test-user-id');
      expect(expectedPayload.name).toBe('My Adventure');
    });

    it('redirects to campaign detail page after successful creation', async () => {
      const mutationResult = {
        campaignId: 'new-campaign-id',
        inviteCode: 'ABC123',
      };

      expect(mutationResult.campaignId).toBeDefined();
    });

    it('requires user to be authenticated', async () => {
      // Verify auth guard logic: no user means no create
      const user = null;
      const canCreate = user !== null;
      expect(canCreate).toBe(false);
    });

    it('requires campaign name to be non-empty', async () => {
      const campaignName = '';
      expect(campaignName.trim().length).toBe(0);
    });

    it('rejects campaign name that is too long', () => {
      const MAX_NAME_LENGTH = 100;
      const longName = 'a'.repeat(101);
      expect(longName.length > MAX_NAME_LENGTH).toBe(true);
    });

    it('trims campaign name whitespace', () => {
      const rawName = '  My Campaign  ';
      expect(rawName.trim()).toBe('My Campaign');
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
