/**
 * Sky-Lux CRM & ERP - Unified Design Tokens (Single Source of Truth)
 * 
 * Tất cả các mã màu của hệ thống PHẢI được tham chiếu từ file này:
 * 1. Ant Design ConfigProvider (frontend/components/providers/antd-provider.tsx)
 * 2. Tailwind CSS Variables (frontend/app/globals.css)
 * 3. Biểu đồ Chart.js & SVG (RevenueDonutChart, SalesRevenueChart, SalesDossiersChart)
 * 4. Trạng thái hồ sơ & thẻ điều hành (OperatorDashboard, CeoDashboard, Dossiers)
 *
 * Để đổi màu nhận diện toàn bộ website: CHỈ CẦN SỬA MÃ MÀU TRONG FILE NÀY.
 */

export const themeTokens = {
  brand: {
    primary: {
      950: '#00382A',
      900: '#004230',
      850: '#004533',
      800: '#075440',
      700: '#08664D', // Primary theme color for Ant Design and buttons
      600: '#0B7A5B', // Hover / accent green
      hoverBorder: '#9CC1B2',
      soft: '#E8F3EE',
      soft2: '#DDEDE6',
      shadowRgb: '8 102 77', // rgb for box-shadows
    },
    gold: {
      main: '#D3A11B',
      strong: '#E2A800',
      soft: '#FFF7E2',
      rank1: '#A36F00',
      chart: '#D4AF37',
    },
  },
  semantic: {
    success: {
      main: '#0B7A5B',
      dark: '#075440',
      strong: '#0A8A61',
      soft: '#E8F6ED',
      border: '#C8EBD5',
    },
    warning: {
      main: '#E98219',
      strong: '#D46B08',
      soft: '#FFF1E6',
      softAlt: '#FFF2E8',
      border: '#FFD8BF',
    },
    danger: {
      main: '#D94A4A',
      strong: '#DC3F46',
      soft: '#FDECEC',
      border: '#FFCCC7',
    },
    info: {
      main: '#3487C8',
      strong: '#0958D9',
      neutral: '#2E82C4',
      soft: '#EAF4FC',
      softAlt: '#E6F7FF',
      border: '#BAE0FF',
    },
    purple: {
      main: '#8462C7',
      strong: '#7C59C8',
      soft: '#F2EEFB',
      border: '#D3ADF7',
    },
  },
  neutral: {
    text: '#171A19',
    textSecondary: '#66706C',
    textMuted: '#66706C',
    textSoft: '#98A09D',
    textTableHead: '#303733',
    border: '#E5E8E6',
    borderInput: '#CBD4D0',
    divider: '#EEF0EF',
    bgLayout: '#F8F9F8',
    surface: '#FFFFFF',
    surfaceMuted: '#FAFBFA',
    surfaceHover: '#F9FAFA',
  },
  roles: {
    ceo: {
      primary950: '#082C22',
      primary900: '#0F3D2E',
      primary850: '#124735',
      primary800: '#15543F',
      primary700: '#0B6B4F',
      primary600: '#0A8A61',
      primarySoft: '#E8F4EE',
      primarySoft2: '#DCEDE5',
      gold: '#D4AF37',
      goldStrong: '#C99A16',
      goldSoft: '#FFF7DF',
      bg: '#F6F8F7',
      surface: '#FFFFFF',
      surfaceMuted: '#FAFBFA',
      border: '#E4E8E6',
      divider: '#EEF1EF',
      text: '#171A19',
      textMuted: '#65706B',
      textSoft: '#98A19D',
    },
    operator: {
      primary950: '#00382A',
      primary900: '#004230',
      primary850: '#004533',
      primary800: '#075440',
      primary700: '#08664D',
      primary600: '#0B7A5B',
      primarySoft: '#E8F3EE',
      bg: '#F8F9F8',
      surface: '#FFFFFF',
      border: '#E5E8E6',
      divider: '#EEF0EF',
      text: '#171A19',
      textMuted: '#66706C',
    },
  },
  charts: {
    revenueBreakdownDonut: [
      '#104E35',
      '#C49226',
      '#6389D6',
      '#8EADC8',
      '#7C59C8',
      '#14A9B5',
    ],
    salesRevenueBar: '#D4AF37',
    salesDossiersBar: '#004230',
    gridLines: '#EEF0EF',
  },
  tables: {
    directCostTotal: '#D9EAF7',
    directCostCategory: '#EAF3FA',
    indirectCostTotal: '#FFF2CC',
    grandTotal: '#FCE4D6',
  },
  segments: {
    tour: {
      key: 'TOUR',
      label: 'TOUR',
      primary: '#237ACB',
      accent: '#1D70B8',
      bg: '#EBF5FE',
      border: '#BFDBFE',
      text: '#1E40AF',
    },
    vehicle: {
      key: 'XE_CHO_THUE',
      label: 'XE CHO THUÊ',
      primary: '#EAB308',
      accent: '#CA8A04',
      bg: '#FEF9C3',
      border: '#FDE047',
      text: '#854D0E',
    },
    ticket: {
      key: 'VE_LE',
      label: 'VÉ LẺ',
      primary: '#0284C7',
      accent: '#0369A1',
      bg: '#E0F7FA',
      border: '#7DD3FC',
      text: '#0369A1',
    },
    event: {
      key: 'SU_KIEN',
      label: 'SỰ KIỆN',
      primary: '#9333EA',
      accent: '#7E22CE',
      bg: '#F3E8FF',
      border: '#D8B4FE',
      text: '#7E22CE',
    },
  },
  avatar: {
    defaultBg: '#E8F3EE', // Sky-Lux brand primary soft
    defaultText: '#075440', // Sky-Lux brand primary 800
    subtleBg: '#F0F4F2',
    subtleText: '#004230',
  },
  radius: {
    sm: 6,
    base: 8,
    card: 10,
    round: 9999,
  },
  font: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
  },
} as const;

export type ThemeTokens = typeof themeTokens;

/**
 * Cấu hình Theme cho Ant Design ConfigProvider
 * Tự động đồng bộ 100% với các token màu định nghĩa ở trên.
 */
export const antThemeConfig = {
  token: {
    colorPrimary: themeTokens.brand.primary[700],
    colorInfo: themeTokens.semantic.info.main,
    colorSuccess: themeTokens.semantic.success.main,
    colorWarning: themeTokens.brand.gold.strong,
    colorError: themeTokens.semantic.danger.main,
    colorText: themeTokens.neutral.text,
    colorTextSecondary: themeTokens.neutral.textSecondary,
    colorBorder: themeTokens.neutral.border,
    colorBgLayout: themeTokens.neutral.bgLayout,
    colorBgContainer: themeTokens.neutral.surface,
    borderRadius: themeTokens.radius.base,
    fontFamily: themeTokens.font.sans,
  },
  components: {
    Button: {
      controlHeight: 42,
      borderRadius: themeTokens.radius.base,
      fontWeight: 600,
      primaryShadow: 'none',
    },
    Input: {
      controlHeight: 42,
      borderRadius: themeTokens.radius.base,
      activeBorderColor: themeTokens.brand.primary[700],
      hoverBorderColor: themeTokens.brand.primary.hoverBorder,
      activeShadow: `0 0 0 3px rgba(${themeTokens.brand.primary.shadowRgb}, 0.10)`,
    },
    Select: {
      controlHeight: 42,
      borderRadius: themeTokens.radius.base,
      optionSelectedBg: themeTokens.brand.primary.soft,
    },
    Card: {
      borderRadiusLG: themeTokens.radius.card,
      headerBg: themeTokens.neutral.surface,
      boxShadowTertiary: '0 1px 2px rgb(16 24 20 / 0.04)',
    },
    Table: {
      borderRadiusLG: themeTokens.radius.base,
      headerBg: themeTokens.neutral.surfaceMuted,
      headerColor: themeTokens.neutral.textTableHead,
      rowHoverBg: themeTokens.neutral.surfaceMuted,
    },
    Tag: {
      borderRadiusSM: themeTokens.radius.sm,
      fontSizeSM: 12,
    },
  },
};
