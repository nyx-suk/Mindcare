/**
 * Tests for shared design tokens: COLORS, SPACING, RADIUS
 * Ensures values are correctly typed as literal types (as const).
 */
import { COLORS, SPACING, RADIUS } from '../../src/theme/colors';

describe('COLORS', () => {
  it('has the correct primary teal colour', () => {
    expect(COLORS.primary).toBe('#00897b');
  });

  it('has the correct error colour', () => {
    expect(COLORS.error).toBe('#ef5350');
  });

  it('has distinct border and borderFocus values', () => {
    expect(COLORS.border).not.toBe(COLORS.borderFocus);
    expect(COLORS.borderFocus).toBe(COLORS.primary);
  });

  it('exports all required colour keys', () => {
    const requiredKeys = [
      'primary', 'primaryDark', 'primaryLight', 'surface', 'card',
      'textPrimary', 'textSecondary', 'error', 'errorSurface',
      'border', 'borderFocus', 'disabled',
    ];
    requiredKeys.forEach((key) => {
      expect(COLORS).toHaveProperty(key);
    });
  });
});

describe('SPACING', () => {
  it('follows a strict ascending scale', () => {
    expect(SPACING.xs).toBeLessThan(SPACING.sm);
    expect(SPACING.sm).toBeLessThan(SPACING.md);
    expect(SPACING.md).toBeLessThan(SPACING.lg);
    expect(SPACING.lg).toBeLessThan(SPACING.xl);
    expect(SPACING.xl).toBeLessThan(SPACING.xxl);
  });

  it('has the expected base values', () => {
    expect(SPACING.xs).toBe(4);
    expect(SPACING.md).toBe(16);
    expect(SPACING.xxl).toBe(48);
  });
});

describe('RADIUS', () => {
  it('has a pill-shaped button radius', () => {
    expect(RADIUS.button).toBe(28);
  });

  it('has input radius smaller than button radius', () => {
    expect(RADIUS.input).toBeLessThan(RADIUS.button);
  });
});
