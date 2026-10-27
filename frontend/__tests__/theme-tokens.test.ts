import { themeTokens, antThemeConfig } from '@/lib/theme/tokens.config';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

function getLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const lum1 = getLuminance(r1, g1, b1);
  const lum2 = getLuminance(r2, g2, b2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe('Design Tokens Configuration (Single Source of Truth)', () => {
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;

  it('validates brand primary colors are valid 6-char hex strings', () => {
    expect(themeTokens.brand.primary[950]).toMatch(hexRegex);
    expect(themeTokens.brand.primary[900]).toMatch(hexRegex);
    expect(themeTokens.brand.primary[850]).toMatch(hexRegex);
    expect(themeTokens.brand.primary[800]).toMatch(hexRegex);
    expect(themeTokens.brand.primary[700]).toMatch(hexRegex);
    expect(themeTokens.brand.primary[600]).toMatch(hexRegex);
    expect(themeTokens.brand.primary.hoverBorder).toMatch(hexRegex);
    expect(themeTokens.brand.primary.soft).toMatch(hexRegex);
    expect(themeTokens.brand.primary.soft2).toMatch(hexRegex);
  });

  it('validates semantic status colors are valid hex strings', () => {
    expect(themeTokens.semantic.success.main).toMatch(hexRegex);
    expect(themeTokens.semantic.warning.main).toMatch(hexRegex);
    expect(themeTokens.semantic.danger.main).toMatch(hexRegex);
    expect(themeTokens.semantic.info.main).toMatch(hexRegex);
    expect(themeTokens.semantic.purple.main).toMatch(hexRegex);
  });

  it('validates neutral palette colors are valid hex strings', () => {
    expect(themeTokens.neutral.text).toMatch(hexRegex);
    expect(themeTokens.neutral.textSecondary).toMatch(hexRegex);
    expect(themeTokens.neutral.border).toMatch(hexRegex);
    expect(themeTokens.neutral.divider).toMatch(hexRegex);
    expect(themeTokens.neutral.bgLayout).toMatch(hexRegex);
    expect(themeTokens.neutral.surface).toMatch(hexRegex);
  });

  it('validates charts palette contains valid hex codes', () => {
    expect(themeTokens.charts.revenueBreakdownDonut.length).toBeGreaterThanOrEqual(6);
    themeTokens.charts.revenueBreakdownDonut.forEach((color) => {
      expect(color).toMatch(hexRegex);
    });
    expect(themeTokens.charts.salesRevenueBar).toMatch(hexRegex);
    expect(themeTokens.charts.salesDossiersBar).toMatch(hexRegex);
    expect(themeTokens.charts.gridLines).toMatch(hexRegex);
  });

  it('validates Ant Design configuration links directly to tokens', () => {
    expect(antThemeConfig.token.colorPrimary).toBe(themeTokens.brand.primary[700]);
    expect(antThemeConfig.token.colorInfo).toBe(themeTokens.semantic.info.main);
    expect(antThemeConfig.token.colorSuccess).toBe(themeTokens.semantic.success.main);
    expect(antThemeConfig.token.colorWarning).toBe(themeTokens.brand.gold.strong);
    expect(antThemeConfig.token.colorError).toBe(themeTokens.semantic.danger.main);
    expect(antThemeConfig.token.colorText).toBe(themeTokens.neutral.text);
    expect(antThemeConfig.token.colorTextSecondary).toBe(themeTokens.neutral.textSecondary);
    expect(antThemeConfig.token.colorBorder).toBe(themeTokens.neutral.border);
    expect(antThemeConfig.token.colorBgLayout).toBe(themeTokens.neutral.bgLayout);
    expect(antThemeConfig.token.colorBgContainer).toBe(themeTokens.neutral.surface);
  });

  it('satisfies WCAG 2.1 AA contrast ratio requirements', () => {
    // Text on Surface contrast must be >= 4.5:1
    const textOnSurfaceRatio = getContrastRatio(
      themeTokens.neutral.text,
      themeTokens.neutral.surface,
    );
    expect(textOnSurfaceRatio).toBeGreaterThanOrEqual(4.5);

    // Primary button text (#FFFFFF) on Primary color [700] must be >= 4.5:1
    const buttonTextOnPrimaryRatio = getContrastRatio(
      '#FFFFFF',
      themeTokens.brand.primary[700],
    );
    expect(buttonTextOnPrimaryRatio).toBeGreaterThanOrEqual(4.5);
  });

  it('validates segment business tokens and avatar tokens are valid hex strings', () => {
    const segments = [
      themeTokens.segments.tour,
      themeTokens.segments.vehicle,
      themeTokens.segments.ticket,
      themeTokens.segments.event,
    ];

    segments.forEach((seg) => {
      expect(seg.primary).toMatch(hexRegex);
      expect(seg.accent).toMatch(hexRegex);
      expect(seg.bg).toMatch(hexRegex);
      expect(seg.border).toMatch(hexRegex);
      expect(seg.text).toMatch(hexRegex);
    });

    expect(themeTokens.avatar.defaultBg).toMatch(hexRegex);
    expect(themeTokens.avatar.defaultText).toMatch(hexRegex);
    expect(themeTokens.avatar.subtleBg).toMatch(hexRegex);
    expect(themeTokens.avatar.subtleText).toMatch(hexRegex);
  });

  it('satisfies WCAG 2.1 AA contrast ratio requirements for segments and avatar', () => {
    // Tour segment text on bg >= 4.5:1
    expect(
      getContrastRatio(themeTokens.segments.tour.text, themeTokens.segments.tour.bg),
    ).toBeGreaterThanOrEqual(4.5);

    // Vehicle segment text on bg >= 4.5:1
    expect(
      getContrastRatio(themeTokens.segments.vehicle.text, themeTokens.segments.vehicle.bg),
    ).toBeGreaterThanOrEqual(4.5);

    // Ticket segment text on bg >= 4.5:1
    expect(
      getContrastRatio(themeTokens.segments.ticket.text, themeTokens.segments.ticket.bg),
    ).toBeGreaterThanOrEqual(4.5);

    // Event segment text on bg >= 4.5:1
    expect(
      getContrastRatio(themeTokens.segments.event.text, themeTokens.segments.event.bg),
    ).toBeGreaterThanOrEqual(4.5);

    // Avatar default text on default bg >= 4.5:1
    expect(
      getContrastRatio(themeTokens.avatar.defaultText, themeTokens.avatar.defaultBg),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
