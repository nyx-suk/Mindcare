import { DARK_THEME, LIGHT_THEME, SPACING, RADIUS } from '../../src/theme/colors';

describe('COLORS', () => {
  it('has the correct primary teal colour for both themes', () => {
    expect(DARK_THEME.primary).toBe('#00897b');
    expect(LIGHT_THEME.primary).toBe('#00897b');
  });

  it('has distinct error colours', () => {
    expect(DARK_THEME.error).toBe('#ef5350');
    expect(LIGHT_THEME.error).toBe('#d32f2f');
  });

  it('has distinct border and borderFocus values', () => {
    expect(DARK_THEME.border).not.toBe(DARK_THEME.borderFocus);
    expect(DARK_THEME.borderFocus).toBe(DARK_THEME.primary);
  });

  it('exports all required colour keys from AppTheme', () => {
    const requiredKeys = [
      'background', 'surface', 'surfaceSecondary', 'primary', 'primaryLight',
      'textPrimary', 'textSecondary', 'textHint', 'border', 'borderFocus',
      'error', 'errorSurface', 'warning', 'success', 'tabBar',
      'tabBarActive', 'tabBarInactive'
    ];
    requiredKeys.forEach((key) => {
      expect(DARK_THEME).toHaveProperty(key);
      expect(LIGHT_THEME).toHaveProperty(key);
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
