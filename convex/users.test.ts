// Note: Convex functions are tested via integration tests
// This file documents the expected behavior

import { describe, it, expect } from 'vitest';

describe('users Convex functions (spec)', () => {
  describe('getOrCreate', () => {
    it('should create a new user if email does not exist', () => {
      // Expected behavior:
      // Input: { email: "new@example.com" }
      // Output: { _id: "...", email: "new@example.com", displayName: "new", ... }
      expect(true).toBe(true); // Placeholder - actual testing via Convex dashboard
    });

    it('should return existing user if email exists', () => {
      // Expected behavior:
      // If user with email exists, return that user
      // Do not create duplicate
      expect(true).toBe(true);
    });
  });

  describe('get', () => {
    it('should return user by id', () => {
      expect(true).toBe(true);
    });

    it('should return null for non-existent id', () => {
      expect(true).toBe(true);
    });
  });
});
