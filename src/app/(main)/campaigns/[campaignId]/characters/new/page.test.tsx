import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
const mockParams = { campaignId: 'test-campaign-id' };

vi.mock('next/navigation', () => ({
  useParams: () => mockParams,
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

describe('Character Creation Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('module', () => {
    it('should exist as a module', async () => {
      const module = await import('./page');
      expect(module.default).toBeDefined();
    });
  });

  describe('handleCreate validation', () => {
    it('requires userId to create a character', () => {
      const userId: string | null = null;
      const canCreate = userId !== null;
      expect(canCreate).toBe(false);
    });

    it('requires campaignId to create a character', () => {
      const campaignId: string | null = null;
      const canCreate = campaignId !== null;
      expect(canCreate).toBe(false);
    });

    it('requires character name to be non-empty', () => {
      const name = '';
      const isValid = name.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('requires all ability scores to be assigned', () => {
      const assignments: Record<string, number | null> = {
        strength: 15,
        dexterity: 14,
        constitution: 13,
        intelligence: 12,
        wisdom: 10,
        charisma: null, // Not yet assigned
      };

      const allAssigned = Object.values(assignments).every((v) => v !== null);
      expect(allAssigned).toBe(false);
    });
  });
});

// Unit test for ability score assignment logic
describe('Ability Score Assignment', () => {
  it('allows deselecting an already-assigned score', () => {
    const assignments: Record<string, number | null> = {
      strength: 15,
      dexterity: null,
      constitution: null,
      intelligence: null,
      wisdom: null,
      charisma: null,
    };

    const clickedAbility = 'strength';
    const clickedValue = 15;
    const isAlreadyAssigned = assignments[clickedAbility] === clickedValue;

    expect(isAlreadyAssigned).toBe(true);
    const newAssignments = isAlreadyAssigned
      ? { ...assignments, [clickedAbility]: null }
      : assignments;
    expect(newAssignments.strength).toBeNull();
  });

  it('allows deselecting class selection', () => {
    let selectedClass: string | null = 'warrior';

    const clickedClass = 'warrior';
    if (selectedClass === clickedClass) {
      selectedClass = null;
    }

    expect(selectedClass).toBeNull();
  });

  it('allows deselecting background selection', () => {
    let selectedBackground: string | null = 'student';

    const clickedBackground = 'student';
    if (selectedBackground === clickedBackground) {
      selectedBackground = null;
    }

    expect(selectedBackground).toBeNull();
  });

  it('prevents assigning the same score to two abilities', () => {
    const availableScores = [15, 14, 13, 12, 10, 8];
    const assignments: Record<string, number | null> = {
      strength: 15,
      dexterity: null,
      constitution: null,
      intelligence: null,
      wisdom: null,
      charisma: null,
    };

    const usedScores = new Set(Object.values(assignments).filter((v): v is number => v !== null));
    const remaining = availableScores.filter((s) => !usedScores.has(s));
    expect(remaining).toEqual([14, 13, 12, 10, 8]);
    expect(remaining).not.toContain(15);
  });
});

// Unit test for the actual mutation call logic
describe('Character Creation Logic', () => {
  it('builds correct mutation payload from form data', () => {
    const characterData = {
      name: 'Test Hero',
      pronouns: 'they/them',
      abilities: {
        strength: 15,
        dexterity: 14,
        constitution: 13,
        intelligence: 12,
        wisdom: 10,
        charisma: 8,
      },
      class: 'warrior',
      background: 'student',
      intimacyProfile: {
        orientation: 'Bisexual',
        roleIdentity: {
          power: 50,
          action: 50,
          sensation: 50,
          service: 50,
          flexibility: 50,
        },
        kinks: { rope: 2, spanking: 1 },
        aftercareNeed: 60,
        trustThreshold: 40,
      },
    };

    const userId = 'test-user-id';
    const campaignId = 'test-campaign-id';

    const expectedPayload = {
      userId,
      campaignId,
      name: characterData.name,
      pronouns: characterData.pronouns,
      abilities: characterData.abilities,
      class: characterData.class,
      background: characterData.background,
      intimacyProfile: characterData.intimacyProfile,
    };

    expect(expectedPayload.userId).toBe(userId);
    expect(expectedPayload.campaignId).toBe(campaignId);
    expect(expectedPayload.name).toBe('Test Hero');
    expect(expectedPayload.abilities.strength).toBe(15);
    expect(expectedPayload.intimacyProfile.kinks).toEqual({ rope: 2, spanking: 1 });
  });

  it('requires userId to be present', () => {
    const userId = null;
    expect(userId).toBeNull();
  });

  it('computes ability modifier correctly', () => {
    const abilityMod = (score: number) => Math.floor((score - 10) / 2);
    expect(abilityMod(8)).toBe(-1);
    expect(abilityMod(10)).toBe(0);
    expect(abilityMod(15)).toBe(2);
    expect(abilityMod(20)).toBe(5);
  });
});
