import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@rc-component/util/lib/getScrollBarSize', () => ({
  __esModule: true,
  default: () => 0,
  getTargetScrollBarSize: () => ({ width: 0, height: 0 }),
}));

jest.mock('@ant-design/icons', () => ({
  CheckCircleOutlined: () => null,
  ClockCircleOutlined: () => null,
  EyeOutlined: () => null,
  FileExcelOutlined: () => null,
  FolderOpenOutlined: () => null,
  ReloadOutlined: () => null,
  SearchOutlined: () => null,
  WarningOutlined: () => null,
}));

const mockDossiersList = jest.fn();

jest.mock('@/hooks/dossiers', () => ({
  useDossiersList: () => mockDossiersList(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null),
  }),
}));

jest.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: (selector: any) =>
    selector({
      user: { id: 'u1', role: 'SALES', email: 'sales@skylux.vn' },
      hasRole: (roles: any) => {
        if (Array.isArray(roles)) return roles.includes('SALES');
        return roles === 'SALES';
      },
    }),
}));

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
    if (pseudoElt) {
      return {
        width: '0px',
        height: '0px',
        getPropertyValue: () => '',
      } as any;
    }
    return originalGetComputedStyle.call(this, elt);
  };
});

import DossiersPage from '@/app/main/dossiers/page';

describe('Dossier Navigation - Full Page & Drawer Removal', () => {
  beforeEach(() => {
    mockDossiersList.mockReturnValue({
      data: {
        total: 1,
        items: [
          {
            id: 'dossier-uuid-1234',
            code: 'TOUR-2026-001',
            name: 'Tour Du Lịch Nhật Bản Mùa Thu',
            route: 'Hà Nội - Tokyo - Osaka',
            status: 'DRAFT',
            priority: 'HIGH',
            startDate: '2026-10-01',
            endDate: '2026-10-07',
            customer: { displayName: 'Khách hàng VIP Ánh Dương', code: 'CUST-001' },
            salesUser: { fullName: 'Nguyễn Văn Sales' },
            operatorUser: { fullName: 'Trần Thị Operator' },
            updatedAt: '2026-09-01T10:00:00Z',
          },
        ],
      },
      isLoading: false,
      refetch: jest.fn(),
    });
  });

  it('renders "Xem chi tiết" as a direct full-page Link without Drawer', () => {
    render(<DossiersPage />);

    // Check that dossier code is rendered
    expect(screen.getByText('TOUR-2026-001')).toBeInTheDocument();

    // Check code link
    const codeLink = screen.getByText('TOUR-2026-001').closest('a');
    expect(codeLink).not.toBeNull();
    expect(codeLink).toHaveAttribute('href', '/main/dossiers/dossier-uuid-1234');

    // Check "Xem chi tiết" action link
    const detailBtn = screen.getByText('Xem chi tiết');
    const detailLink = detailBtn.closest('a');
    expect(detailLink).not.toBeNull();
    expect(detailLink).toHaveAttribute('href', '/main/dossiers/dossier-uuid-1234');

    // Verify Drawer is NOT in the DOM
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
