import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('@rc-component/util/lib/getScrollBarSize', () => ({
  __esModule: true,
  default: () => 0,
  getTargetScrollBarSize: () => ({ width: 0, height: 0 }),
}));

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

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = MockResizeObserver as any;
global.ResizeObserver = MockResizeObserver as any;

import { DossierPurgeModal } from '@/components/dossiers/DossierPurgeModal';

describe('DossierPurgeModal (Hard Purge Confirmation)', () => {
  const mockDossier = {
    id: 'dos-purge-123',
    code: 'PURGE-TOUR-100',
    name: 'Tour Thử Nghiệm Xóa',
  };

  it('renders modal title, warning alert, and target dossier code', () => {
    const handleClose = jest.fn();
    const handleConfirm = jest.fn();

    render(
      <DossierPurgeModal
        open={true}
        dossier={mockDossier}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />,
    );

    expect(screen.getByText('Xác nhận xóa vĩnh viễn hồ sơ')).toBeInTheDocument();
    expect(screen.getByText('PURGE-TOUR-100')).toBeInTheDocument();
    expect(screen.getByText('Tour Thử Nghiệm Xóa')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', {
      name: /Xóa vĩnh viễn khỏi hệ thống/i,
    });
    expect(submitBtn).toBeDisabled();
  });

  it('keeps submit button disabled when typed code does not match', () => {
    const handleClose = jest.fn();
    const handleConfirm = jest.fn();

    render(
      <DossierPurgeModal
        open={true}
        dossier={mockDossier}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />,
    );

    const input = screen.getByPlaceholderText('Gõ đúng "PURGE-TOUR-100"');
    fireEvent.change(input, { target: { value: 'WRONG-CODE' } });

    const submitBtn = screen.getByRole('button', {
      name: /Xóa vĩnh viễn khỏi hệ thống/i,
    });
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit button and calls onConfirm when exact code is entered', async () => {
    const handleClose = jest.fn();
    const handleConfirm = jest.fn().mockResolvedValue(undefined);

    render(
      <DossierPurgeModal
        open={true}
        dossier={mockDossier}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />,
    );

    const input = screen.getByPlaceholderText('Gõ đúng "PURGE-TOUR-100"');
    fireEvent.change(input, { target: { value: 'PURGE-TOUR-100' } });

    const submitBtn = screen.getByRole('button', {
      name: /Xóa vĩnh viễn khỏi hệ thống/i,
    });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onClose when Hủy bỏ is clicked', () => {
    const handleClose = jest.fn();
    const handleConfirm = jest.fn();

    render(
      <DossierPurgeModal
        open={true}
        dossier={mockDossier}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: /Hủy bỏ/i });
    fireEvent.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
