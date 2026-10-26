import '@testing-library/jest-dom';

jest.mock('@ant-design/icons', () => ({
  TeamOutlined: () => <span data-testid="team-icon" />,
  CalendarOutlined: () => <span data-testid="calendar-icon" />,
  ClockCircleOutlined: () => <span data-testid="clock-icon" />,
  HourglassOutlined: () => <span data-testid="hourglass-icon" />,
  CheckCircleOutlined: () => <span data-testid="check-icon" />,
  FilterOutlined: () => <span data-testid="filter-icon" />,
  ReloadOutlined: () => <span data-testid="reload-icon" />,
  SearchOutlined: () => <span data-testid="search-icon" />,
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UserSummaryCards from '../app/(main)/users/components/UserSummaryCards';
import TaskSummaryCards from '../app/(main)/tasks/components/TaskSummaryCards';
import TaskFilterBar from '../app/(main)/tasks/components/TaskFilterBar';
import {
  isSameDay,
  isInLastSevenDays,
  getDossierLabel,
  getBoardStatus,
} from '../app/(main)/tasks/helpers';
import { TaskItem } from '@/types/task';

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
});

describe('Phase 4: Modular Components & Helpers', () => {
  describe('UserSummaryCards', () => {
    it('renders all 6 metric cards with correct values', () => {
      render(
        <UserSummaryCards
          totalUsers={42}
          activeUsers={35}
          salesUsers={10}
          operatorUsers={15}
          ceoAdminUsers={5}
          lockedUsers={2}
          isLoading={false}
        />,
      );

      expect(screen.getByText('Tổng người dùng')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Đang hoạt động')).toBeInTheDocument();
      expect(screen.getByText('35')).toBeInTheDocument();
      expect(screen.getByText('Sales')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Điều hành')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('CEO/Admin')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Tài khoản tạm khóa')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders placeholder dash when loading', () => {
      render(
        <UserSummaryCards
          totalUsers={0}
          activeUsers={0}
          salesUsers={0}
          operatorUsers={0}
          ceoAdminUsers={0}
          lockedUsers={0}
          isLoading={true}
        />,
      );
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBe(6);
    });
  });

  describe('TaskSummaryCards', () => {
    it('renders 4 task metrics properly', () => {
      render(
        <TaskSummaryCards
          metrics={{
            today: 8,
            overdue: 3,
            waiting: 5,
            completed: 12,
          }}
          isLoading={false}
        />,
      );

      expect(screen.getByText('Hôm nay')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('Quá hạn')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Chờ xử lý')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Hoàn thành tuần này')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });

  describe('TaskFilterBar', () => {
    it('triggers time range, search, and reload callbacks', () => {
      const onTimeRangeChange = jest.fn();
      const onSearchChange = jest.fn();
      const onPriorityChange = jest.fn();
      const onReload = jest.fn();

      render(
        <TaskFilterBar
          timeRange="TODAY"
          onTimeRangeChange={onTimeRangeChange}
          search=""
          onSearchChange={onSearchChange}
          priority={undefined}
          onPriorityChange={onPriorityChange}
          onReload={onReload}
        />,
      );

      expect(screen.getByText('Hôm nay')).toBeInTheDocument();
      expect(screen.getByText('Tuần này')).toBeInTheDocument();
      expect(screen.getByText('Tất cả')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Tuần này'));
      expect(onTimeRangeChange).toHaveBeenCalledWith('WEEK');

      const reloadButton = screen.getByLabelText('Tải lại công việc');
      fireEvent.click(reloadButton);
      expect(onReload).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tasks Helpers', () => {
    it('isSameDay correctly identifies matching dates', () => {
      const now = new Date();
      expect(isSameDay(now.toISOString(), now)).toBe(true);
      expect(isSameDay(undefined)).toBe(false);
    });

    it('isInLastSevenDays detects dates within 7 days', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      expect(isInLastSevenDays(threeDaysAgo.toISOString())).toBe(true);

      const twentyDaysAgo = new Date();
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
      expect(isInLastSevenDays(twentyDaysAgo.toISOString())).toBe(false);
    });

    it('getDossierLabel returns formatted labels', () => {
      const taskWithDossier = {
        id: '1',
        title: 'Xử lý',
        dossier: {
          code: 'HS-001',
          customer: { displayName: 'Khách VIP' },
        },
      } as unknown as TaskItem;

      expect(getDossierLabel(taskWithDossier)).toBe('Hồ sơ: HS-001 - Khách VIP');

      const taskWithoutDossier = {
        id: '2',
        title: 'Việc tự do',
      } as unknown as TaskItem;
      expect(getDossierLabel(taskWithoutDossier)).toBe('Chưa gắn hồ sơ');
    });

    it('getBoardStatus maps WAITING to IN_PROGRESS and CANCELLED to TODO for standard view', () => {
      expect(getBoardStatus('WAITING')).toBe('IN_PROGRESS');
      expect(getBoardStatus('CANCELLED')).toBe('TODO');
      expect(getBoardStatus('COMPLETED')).toBe('COMPLETED');
    });
  });
});
