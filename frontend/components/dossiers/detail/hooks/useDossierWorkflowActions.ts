import { App } from 'antd';
import {
  useApproveDossier,
  useRequestChangesDossier,
  useStartReviewDossier,
  useReturnToOperationsDossier,
  useSubmitDossier,
  useResubmitDossier,
  useCompleteDossier,
  useLockDossier,
} from '@/hooks/workflow';
import { useDossierUIStore } from '../stores/useDossierUIStore';

export interface UseDossierWorkflowActionsProps {
  dossierId: string;
  isCeoAdmin?: boolean;
  onClose?: () => void;
  refetchAll?: () => void;
}

export function useDossierWorkflowActions({
  dossierId,
  isCeoAdmin = false,
  onClose,
  refetchAll,
}: UseDossierWorkflowActionsProps) {
  const { message } = App.useApp();
  const modalAction = useDossierUIStore((s) => s.modalAction);
  const actionNote = useDossierUIStore((s) => s.actionNote);
  const setModalAction = useDossierUIStore((s) => s.setModalAction);
  const resetModal = useDossierUIStore((s) => s.resetModal);

  // Workflow mutations (TanStack Query)
  const approveMutation = useApproveDossier();
  const requestChangesMutation = useRequestChangesDossier();
  const startReviewMutation = useStartReviewDossier();
  const returnToOperationsMutation = useReturnToOperationsDossier();
  const submitMutation = useSubmitDossier();
  const resubmitMutation = useResubmitDossier();
  const completeMutation = useCompleteDossier();
  const lockMutation = useLockDossier();

  const isActionLoading =
    approveMutation.isPending ||
    requestChangesMutation.isPending ||
    startReviewMutation.isPending ||
    returnToOperationsMutation.isPending ||
    submitMutation.isPending ||
    resubmitMutation.isPending ||
    completeMutation.isPending ||
    lockMutation.isPending;

  const handleExecuteModalAction = async () => {
    if (!dossierId || !modalAction) return;

    if (modalAction === 'REQUEST_CHANGES' && !actionNote.trim()) {
      message.warning('Vui lòng nhập lý do và yêu cầu bổ sung');
      return;
    }

    try {
      if (modalAction === 'APPROVE') {
        await approveMutation.mutateAsync({
          dossierId,
          data: { note: actionNote || undefined },
        });
        message.success('Phê duyệt hồ sơ tour thành công!');
      } else if (modalAction === 'REQUEST_CHANGES') {
        await requestChangesMutation.mutateAsync({
          dossierId,
          data: { note: actionNote },
        });
        message.success(
          isCeoAdmin
            ? 'Đã gửi yêu cầu bổ sung cho Sales và Điều hành phụ trách.'
            : 'Đã gửi yêu cầu bổ sung cho Sales thành công!',
        );
      } else if (modalAction === 'LOCK') {
        await lockMutation.mutateAsync({
          dossierId,
          data: { note: actionNote || undefined },
        });
        message.success('Đã khóa hồ sơ an toàn!');
      } else if (modalAction === 'COMPLETE') {
        await completeMutation.mutateAsync({
          dossierId,
          data: { note: actionNote || undefined },
        });
        message.success('Đã hoàn tất hồ sơ tour!');
      }

      resetModal();
      refetchAll?.();
      onClose?.();
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || err?.message || 'Thao tác workflow thất bại',
      );
    }
  };

  const handleStartReview = async () => {
    try {
      await startReviewMutation.mutateAsync({ dossierId });
      message.success('Đã tiếp nhận và bắt đầu xem xét hồ sơ!');
      refetchAll?.();
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể bắt đầu xem xét hồ sơ',
      );
    }
  };

  const handleReturnToOperations = async () => {
    try {
      await returnToOperationsMutation.mutateAsync({ dossierId });
      message.success('Đã gửi hồ sơ về hàng chờ Điều hành.');
      refetchAll?.();
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể gửi hồ sơ về Điều hành',
      );
    }
  };

  const handleSubmit = async () => {
    try {
      await submitMutation.mutateAsync({ dossierId });
      message.success('Đã gửi duyệt hồ sơ thành công!');
      refetchAll?.();
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể gửi duyệt hồ sơ',
      );
    }
  };

  const handleResubmit = async () => {
    try {
      await resubmitMutation.mutateAsync({ dossierId });
      message.success('Đã gửi lại hồ sơ sau khi bổ sung thành công!');
      refetchAll?.();
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể gửi lại hồ sơ',
      );
    }
  };

  return {
    modalAction,
    actionNote,
    setModalAction,
    resetModal,
    isActionLoading,
    handleExecuteModalAction,
    handleStartReview,
    handleReturnToOperations,
    handleSubmit,
    handleResubmit,
  };
}
