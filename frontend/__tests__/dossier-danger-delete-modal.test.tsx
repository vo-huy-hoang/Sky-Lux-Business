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

import { DossierDangerDeleteModal } from '@/components/dossiers/DossierDangerDeleteModal';

describe('DossierDangerDeleteModal (Double-Confirmation)', () => {
  const mockDossier = {
    id: 'dos-123',
    code: '380604-TOUR-CONG-TY-ABC',
    name: 'Tour Du Lịch ABC',
    status: 'APPROVED',
  };

  it('renders alert, expected code, and keeps confirm button disabled initially', () => {
    const handleClose = jest.fn();
    const handleConfirm = jest.fn();

    render(
      <DossierDangerDeleteModal
        open={true}
        dossier={mockDossier}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />,
    );

    expect(
      screen.getByText('Xác nhận xóa hồ sơ nguy cơ cao'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('380604-TOUR-CONG-TY-ABC'),
    ).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', {
      name: /Xác nhận xóa vĩnh viễn/i,
    });
    expect(submitBtn).toBeDisabled();
  });

  it('keeps confirm button disabled if code does not match', () => {
    const handleClose = jest.fn();
    const handleConfirm = jest.fn();

    render(
      <DossierDangerDeleteModal
        open={true}
        dossier={mockDossier}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />,
    );

    const codeInput = screen.getByLabelText('Nhập lại mã hồ sơ để xác nhận');
    const reasonInput = screen.getByLabelText('Lý do xóa hồ sơ');

    fireEvent.change(codeInput, { target: { value: 'WRONG-CODE' } });
    fireEvent.change(reasonInput, { target: { value: 'Lý do hợp lệ' } });

    const submitBtn = screen.getByRole('button', {
      name: /Xác nhận xóa vĩnh viễn/i,
    });
    expect(submitBtn).toBeDisabled();
  });

  it('keeps confirm button disabled if code matches but reason is empty or whitespace', () => {
    const handleClose = jest.fn();
    const handleConfirm = jest.fn();

    render(
      <DossierDangerDeleteModal
        open={true}
        dossier={mockDossier}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />,
    );

    const codeInput = screen.getByLabelText('Nhập lại mã hồ sơ để xác nhận');
    const reasonInput = screen.getByLabelText('Lý do xóa hồ sơ');

    fireEvent.change(codeInput, {
      target: { value: '380604-TOUR-CONG-TY-ABC' },
    });
    fireEvent.change(reasonInput, { target: { value: '   ' } });

    const submitBtn = screen.getByRole('button', {
      name: /Xác nhận xóa vĩnh viễn/i,
    });
    expect(submitBtn).toBeDisabled();
  });

  it('enables confirm button and calls onConfirm with reason when code and reason are valid', async () => {
    const handleClose = jest.fn();
    const handleConfirm = jest.fn().mockResolvedValue(undefined);

    render(
      <DossierDangerDeleteModal
        open={true}
        dossier={mockDossier}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />,
    );

    const codeInput = screen.getByLabelText('Nhập lại mã hồ sơ để xác nhận');
    const reasonInput = screen.getByLabelText('Lý do xóa hồ sơ');

    fireEvent.change(codeInput, {
      target: { value: '380604-TOUR-CONG-TY-ABC' },
    });
    fireEvent.change(reasonInput, {
      target: { value: 'Xóa hồ sơ kiểm thử tạo nhầm' },
    });

    const submitBtn = screen.getByRole('button', {
      name: /Xác nhận xóa vĩnh viễn/i,
    });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledWith(
        'Xóa hồ sơ kiểm thử tạo nhầm',
      );
    });
  });
});
