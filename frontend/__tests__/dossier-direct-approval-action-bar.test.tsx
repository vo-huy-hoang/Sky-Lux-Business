import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DossierWorkflowActionBar } from '@/components/dossiers/detail/components/DossierWorkflowActionBar';

describe('Ticket 03: Flexible Workflow Direct Approval Action Bar', () => {
  const defaultProps = {
    dossierId: 'dossier-123',
    canOperate: true,
    isSales: false,
    isCeoAdmin: false,
    isActionLoading: false,
    onStartReview: jest.fn(),
    onSubmit: jest.fn(),
    onResubmit: jest.fn(),
    onOpenModal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders both [Tiếp nhận xử lý] and [Duyệt trực tiếp] buttons when dossier is SUBMITTED', () => {
    render(
      <DossierWorkflowActionBar
        {...defaultProps}
        dossierStatus="SUBMITTED"
      />,
    );

    const startReviewBtn = screen.getByText('Tiếp nhận xử lý');
    const directApproveBtn = screen.getByText('Duyệt trực tiếp');

    expect(startReviewBtn).toBeInTheDocument();
    expect(directApproveBtn).toBeInTheDocument();

    fireEvent.click(directApproveBtn);
    expect(defaultProps.onOpenModal).toHaveBeenCalledWith('APPROVE');

    fireEvent.click(startReviewBtn);
    expect(defaultProps.onStartReview).toHaveBeenCalled();
  });

  it('renders both buttons when dossier is RESUBMITTED', () => {
    render(
      <DossierWorkflowActionBar
        {...defaultProps}
        dossierStatus="RESUBMITTED"
      />,
    );

    const directApproveBtn = screen.getByText('Duyệt trực tiếp');
    expect(directApproveBtn).toBeInTheDocument();

    fireEvent.click(directApproveBtn);
    expect(defaultProps.onOpenModal).toHaveBeenCalledWith('APPROVE');
  });

  it('renders [Duyệt hồ sơ] when dossier is IN_REVIEW', () => {
    render(
      <DossierWorkflowActionBar
        {...defaultProps}
        dossierStatus="IN_REVIEW"
      />,
    );

    const approveBtn = screen.getByText('Duyệt hồ sơ');
    expect(approveBtn).toBeInTheDocument();

    fireEvent.click(approveBtn);
    expect(defaultProps.onOpenModal).toHaveBeenCalledWith('APPROVE');
  });
});
