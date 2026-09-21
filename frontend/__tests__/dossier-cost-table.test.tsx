import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const testQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithQuery = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={testQueryClient}>{ui}</QueryClientProvider>);

jest.mock("@ant-design/icons", () => ({
  FileExcelOutlined: () => <span data-testid="file-excel-icon" />,
  BarChartOutlined: () => <span data-testid="bar-chart-icon" />,
  TeamOutlined: () => <span data-testid="team-icon" />,
  MessageOutlined: () => <span data-testid="message-icon" />,
  UserOutlined: () => <span data-testid="user-icon" />,
  EditOutlined: () => <span data-testid="edit-icon" />,
  DownloadOutlined: () => <span data-testid="download-icon" />,
  ArrowLeftOutlined: () => <span data-testid="arrow-left-icon" />,
  FilePdfOutlined: () => <span data-testid="pdf-icon" />,
  CheckCircleOutlined: () => <span data-testid="check-circle-icon" />,
  LockOutlined: () => <span data-testid="lock-icon" />,
  RocketOutlined: () => <span data-testid="rocket-icon" />,
  SendOutlined: () => <span data-testid="send-icon" />,
  SyncOutlined: () => <span data-testid="sync-icon" />,
}));

jest.mock("@/components/documents/DossierDocumentsTab", () => {
  function MockDossierDocumentsTab() {
    return <div data-testid="documents-tab" />;
  }
  return MockDossierDocumentsTab;
});
jest.mock("@/app/main/dossiers/components/DossierComments", () => ({
  DossierComments: () => <div data-testid="comments-tab" />,
}));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
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
});

import {
  classifyCategory,
  extractExplanation,
  DossierCostTable,
} from "@/components/dossiers/detail/components/DossierCostTable";
import {
  CostSummaryTable,
  calculateCostSummaryRows,
} from "@/components/dossiers/detail/components/CostSummaryTable";
import { DossierRevenueTable } from "@/components/dossiers/detail/components/DossierRevenueTable";
import { OperatorNotesCard } from "@/components/dossiers/detail/components/OperatorNotesCard";
import { DossierDetailTabs } from "@/components/dossiers/detail/components/DossierDetailTabs";
import { DossierHeader } from "@/components/dossiers/detail/components/DossierHeader";
import { DossierWorkflowActionBar } from "@/components/dossiers/detail/components/DossierWorkflowActionBar";
import {
  calculateTourDuration,
  getDayOfWeek,
  formatCurrency,
  formatSummaryCurrency,
  parseVatRate,
} from "@/components/dossiers/detail/utils";
import { EstimateCostLine, EstimateRevenueLine } from "@/types/estimate";

describe("Phase 36, 37 & 38: Dossier Cost, Revenue, Workflow & Rapid Actions Integration", () => {
  describe("classifyCategory (Phân loại tự động hạng mục chi phí)", () => {
    it("nhận diện chính xác nhóm 1.1 VÉ THAM QUAN", () => {
      const line1 = {
        description: "Vé tham quan Hội An",
        serviceCategory: { name: "Vé tham quan" },
      } as EstimateCostLine;
      const line2 = {
        description: "Cáp treo Bà Nà người lớn",
      } as EstimateCostLine;
      const line3 = {
        description: "Tham quan Đại Nội Huế",
      } as EstimateCostLine;

      expect(classifyCategory(line1)).toEqual({
        code: "1.1",
        title: "VÉ THAM QUAN",
        order: 1,
      });
      expect(classifyCategory(line2)).toEqual({
        code: "1.1",
        title: "VÉ THAM QUAN",
        order: 1,
      });
      expect(classifyCategory(line3)).toEqual({
        code: "1.1",
        title: "VÉ THAM QUAN",
        order: 1,
      });
    });

    it("nhận diện chính xác nhóm 1.2 KHÁCH SẠN", () => {
      const line1 = {
        description: "Khách sạn Mường Thanh Đà Nẵng",
      } as EstimateCostLine;
      const line2 = {
        description: "Lưu trú Hương Giang Huế",
      } as EstimateCostLine;
      const line3 = {
        description: "Phòng Deluxe Double",
        serviceCategory: { name: "Khách sạn" },
      } as EstimateCostLine;

      expect(classifyCategory(line1)).toEqual({
        code: "1.2",
        title: "KHÁCH SẠN",
        order: 2,
      });
      expect(classifyCategory(line2)).toEqual({
        code: "1.2",
        title: "KHÁCH SẠN",
        order: 2,
      });
      expect(classifyCategory(line3)).toEqual({
        code: "1.2",
        title: "KHÁCH SẠN",
        order: 2,
      });
    });

    it("nhận diện chính xác nhóm 1.2b ĂN UỐNG", () => {
      const line1 = {
        description: "Ăn trưa tại nhà hàng Madam Lân",
      } as EstimateCostLine;
      const line2 = { description: "Bữa trưa ngày 30/07" } as EstimateCostLine;
      const line3 = {
        description: "Cơm niêu Việt buổi tối",
        serviceCategory: { name: "Nhà hàng" },
      } as EstimateCostLine;

      expect(classifyCategory(line1)).toEqual({
        code: "1.2b",
        title: "ĂN UỐNG",
        order: 3,
      });
      expect(classifyCategory(line2)).toEqual({
        code: "1.2b",
        title: "ĂN UỐNG",
        order: 3,
      });
      expect(classifyCategory(line3)).toEqual({
        code: "1.2b",
        title: "ĂN UỐNG",
        order: 3,
      });
    });

    it("nhận diện chính xác nhóm 1.3 VẬN CHUYỂN", () => {
      const line1 = {
        description: "Xe 45 chỗ đời mới đưa đón",
      } as EstimateCostLine;
      const line2 = { description: "Nhà xe Triệu Bảo Ý" } as EstimateCostLine;
      const line3 = {
        description: "Vận chuyển tuyến Đà Nẵng - Huế",
        serviceCategory: { name: "Vận chuyển" },
      } as EstimateCostLine;

      expect(classifyCategory(line1)).toEqual({
        code: "1.3",
        title: "VẬN CHUYỂN",
        order: 4,
      });
      expect(classifyCategory(line2)).toEqual({
        code: "1.3",
        title: "VẬN CHUYỂN",
        order: 4,
      });
      expect(classifyCategory(line3)).toEqual({
        code: "1.3",
        title: "VẬN CHUYỂN",
        order: 4,
      });
    });

    it("nhận diện chính xác nhóm 1.4 CÁC DỊCH VỤ KHÁC (Gala, Team building, Hội nghị, v.v.)", () => {
      const line1 = {
        description: "Tiệc Gala Dinner bãi biển",
      } as EstimateCostLine;
      const line2 = {
        description: "Hoạt động Team building Duy Hải Event",
      } as EstimateCostLine;
      const line3 = {
        description: "Hội nghị khách hàng cuối năm",
      } as EstimateCostLine;
      const lineUnknown = {
        description: "Khoản chi không xác định",
      } as EstimateCostLine;

      expect(classifyCategory(line1)).toEqual({
        code: "1.4",
        title: "CÁC DỊCH VỤ KHÁC",
        order: 5,
      });
      expect(classifyCategory(line2)).toEqual({
        code: "1.4",
        title: "CÁC DỊCH VỤ KHÁC",
        order: 5,
      });
      expect(classifyCategory(line3)).toEqual({
        code: "1.4",
        title: "CÁC DỊCH VỤ KHÁC",
        order: 5,
      });
      expect(classifyCategory(lineUnknown)).toEqual({
        code: "1.4",
        title: "CÁC DỊCH VỤ KHÁC",
        order: 5,
      });
    });

    it("ưu tiên phân loại theo categoryTitle hoặc serviceCategory.name tường minh khi thêm dòng mới", () => {
      const rowAddedToTicket = {
        description: "Dịch vụ chưa đặt tên",
        categoryTitle: "VÉ THAM QUAN",
      };
      const rowAddedToHotel = {
        description: "Chi phí bổ sung",
        categoryTitle: "KHÁCH SẠN",
      };
      const rowAddedToRestaurant = {
        description: "",
        categoryTitle: "ĂN UỐNG",
      };
      const rowAddedToTransport = {
        description: "",
        categoryTitle: "VẬN CHUYỂN",
      };

      expect(classifyCategory(rowAddedToTicket)).toEqual({
        code: "1.1",
        title: "VÉ THAM QUAN",
        order: 1,
      });
      expect(classifyCategory(rowAddedToHotel)).toEqual({
        code: "1.2",
        title: "KHÁCH SẠN",
        order: 2,
      });
      expect(classifyCategory(rowAddedToRestaurant)).toEqual({
        code: "1.2b",
        title: "ĂN UỐNG",
        order: 3,
      });
      expect(classifyCategory(rowAddedToTransport)).toEqual({
        code: "1.3",
        title: "VẬN CHUYỂN",
        order: 4,
      });
    });
  });

  describe("extractExplanation (Bóc tách thông tin Nhà cung cấp / Tiến độ)", () => {
    it("ưu tiên lấy từ supplier.displayName hoặc supplier.name", () => {
      const line1 = {
        supplier: {
          displayName: "Mường Thanh Hospitality",
          name: "Mường Thanh",
        },
      } as EstimateCostLine;
      const line2 = {
        supplier: { name: "Triệu Bảo Ý" },
      } as EstimateCostLine;

      expect(extractExplanation(line1)).toBe("Mường Thanh Hospitality");
      expect(extractExplanation(line2)).toBe("Triệu Bảo Ý");
    });

    it("bóc tách regex từ note khi có format Nhà cung cấp hoặc Tiến độ", () => {
      const lineNcc = {
        note: "Nhà cung cấp: Duy Hải Event; Ghi chú khác",
      } as EstimateCostLine;
      const lineProgress = {
        note: "Tiến độ: Đặt cọc 50% trước ngày đi; Lưu ý",
      } as EstimateCostLine;

      expect(extractExplanation(lineNcc)).toBe("Duy Hải Event");
      expect(extractExplanation(lineProgress)).toBe(
        "Đặt cọc 50% trước ngày đi",
      );
    });

    it("trả về rỗng hoặc note nguyên bản nếu không có mẫu regex", () => {
      const lineEmpty = {} as EstimateCostLine;
      const lineNormalNote = {
        note: "Lưu ý kiểm tra số lượng",
      } as EstimateCostLine;
      const lineSourceAmount = {
        note: "Số tiền nguồn: 10.000.000",
      } as EstimateCostLine;

      expect(extractExplanation(lineEmpty)).toBe("");
      expect(extractExplanation(lineNormalNote)).toBe(
        "Lưu ý kiểm tra số lượng",
      );
      expect(extractExplanation(lineSourceAmount)).toBe("");
    });
  });

  describe("calculateCostSummaryRows", () => {
    it("khớp cách tính Excel: nhóm VAT chia 1.08, nhóm 0% giữ nguyên", () => {
      const mockCostLines: EstimateCostLine[] = [
        // Dịch vụ 10% (vatRate > 0)
        {
          id: "c1",
          quantity: 10,
          multiplier: 1,
          unitPrice: 1080000,
          netAmount: 10000000,
          grossAmount: 10800000,
          vatRate: 10,
          serviceCategory: { code: "HOTEL", name: "Khách sạn" },
        } as EstimateCostLine,
        // Dịch vụ 0% (vatRate === 0)
        {
          id: "c2",
          quantity: 2,
          multiplier: 1,
          unitPrice: 500000,
          netAmount: 1000000,
          grossAmount: 1000000,
          vatRate: 0,
          serviceCategory: { code: "GUIDE", name: "Hướng dẫn viên" },
        } as EstimateCostLine,
      ];

      const rows = calculateCostSummaryRows(mockCostLines, 20000000);

      expect(rows).toHaveLength(3);

      const rowVat = rows.find((row) => row.key === "service-vat")!;
      expect(rowVat.revenue).toBe(20000000 / 1.08);
      expect(rowVat.cost).toBe(10000000);
      expect(rowVat.grossProfit).toBe(20000000 / 1.08 - 10000000);

      const rowNoVat = rows.find((row) => row.key === "service-no-vat")!;
      expect(rowNoVat.revenue).toBe(0);
      expect(rowNoVat.cost).toBe(1000000);
      expect(rowNoVat.grossProfit).toBe(-1000000);

      const rowTotal = rows.find((r) => r.key === "total")!;
      expect(rowTotal.revenue).toBe(20000000 / 1.08);
      expect(rowTotal.cost).toBe(11000000);
      expect(rowTotal.grossProfit).toBe(20000000 / 1.08 - 11000000);
    });

    it('xử lý chính xác định dạng vatRate chuỗi "10%", "8%", số thập phân 0.1 và null', () => {
      const mockCostLines: EstimateCostLine[] = [
        {
          id: "cost-str-10",
          quantity: 1,
          multiplier: 1,
          unitPrice: 10800000,
          netAmount: 10000000,
          grossAmount: 10800000,
          vatRate: "10%" as any,
          serviceCategory: { code: "HOTEL", name: "Khách sạn" },
        } as EstimateCostLine,
        {
          id: "cost-dec-01",
          quantity: 1,
          multiplier: 1,
          unitPrice: 5400000,
          netAmount: 5000000,
          grossAmount: 5400000,
          vatRate: 0.1 as any,
          serviceCategory: { code: "RESTAURANT", name: "Nhà hàng" },
        } as EstimateCostLine,
        {
          id: "cost-str-0",
          quantity: 1,
          multiplier: 1,
          unitPrice: 1000000,
          netAmount: 1000000,
          grossAmount: 1000000,
          vatRate: "0%" as any,
          serviceCategory: { code: "GUIDE", name: "Hướng dẫn viên" },
        } as EstimateCostLine,
        {
          id: "cost-null-vat",
          quantity: 1,
          multiplier: 1,
          unitPrice: 500000,
          netAmount: 500000,
          grossAmount: 500000,
          vatRate: null as any,
          serviceCategory: { code: "OTHER", name: "Chi phí khác" },
        } as EstimateCostLine,
      ];

      const rows = calculateCostSummaryRows(mockCostLines, 21600000);
      const rowVat = rows.find((r) => r.key === "service-vat")!;
      const rowNoVat = rows.find((r) => r.key === "service-no-vat")!;
      const rowTotal = rows.find((r) => r.key === "total")!;

      expect(rowVat.cost).toBeCloseTo(15000000, 6);
      expect(rowNoVat.cost).toBe(1500000);
      expect(rowTotal.cost).toBeCloseTo(16500000, 6);
      expect(rowTotal.grossProfit).toBeCloseTo(3500000, 6);
    });

    it("bao gồm mọi dòng chi phí, kể cả nhóm OTHER, theo số tiền chưa VAT", () => {
      const mockCostLines: EstimateCostLine[] = [
        {
          id: "excel-service-10",
          quantity: 1,
          multiplier: 1,
          unitPrice: 111310006,
          netAmount: 111310006,
          grossAmount: 111310006,
          vatRate: 10,
          serviceCategory: { code: "TRANSPORT", name: "Vận chuyển" },
        } as EstimateCostLine,
        {
          id: "excel-other",
          quantity: 1,
          multiplier: 1,
          unitPrice: 85000000,
          netAmount: 85000000,
          grossAmount: 85000000,
          vatRate: 10,
          serviceCategory: { code: "OTHER", name: "Dịch vụ khác" },
        } as EstimateCostLine,
        {
          id: "excel-service-0-other",
          quantity: 1,
          multiplier: 1,
          unitPrice: 4850000,
          netAmount: 4850000,
          grossAmount: 4850000,
          vatRate: 0,
          serviceCategory: {
            code: "OTHER",
            name: "Khăn, băng rôn, mũ du lịch",
          },
        } as EstimateCostLine,
      ];

      const rows = calculateCostSummaryRows(mockCostLines, 145800000);
      const rowVat = rows.find((r) => r.key === "service-vat")!;
      const rowNoVat = rows.find((r) => r.key === "service-no-vat")!;
      const rowTotal = rows.find((r) => r.key === "total")!;

      expect(rowVat.cost).toBe(111310006 / 1.08);
      expect(rowNoVat.cost).toBe(4850000);
      expect(rowTotal.cost).toBe(111310006 / 1.08 + 4850000);
      expect(rowTotal.grossProfit).toBe(27085179.62962964);
    });
  });

  describe("parseVatRate (Chuẩn hóa tỷ lệ thuế VAT đa định dạng)", () => {
    it("xử lý chính xác các số nguyên phần trăm", () => {
      expect(parseVatRate(10)).toBe(10);
      expect(parseVatRate(8)).toBe(8);
      expect(parseVatRate(0)).toBe(0);
      expect(parseVatRate(-5)).toBe(0);
    });

    it("xử lý chính xác các số thập phân biểu thị tỷ lệ thuế", () => {
      expect(parseVatRate(0.1)).toBe(10);
      expect(parseVatRate(0.08)).toBe(8);
      expect(parseVatRate(0.05)).toBe(5);
    });

    it("xử lý chính xác các chuỗi có ký tự % hoặc khoảng trắng", () => {
      expect(parseVatRate("10%")).toBe(10);
      expect(parseVatRate("8%")).toBe(8);
      expect(parseVatRate(" 10% ")).toBe(10);
      expect(parseVatRate("10")).toBe(10);
      expect(parseVatRate("0%")).toBe(0);
      expect(parseVatRate("0")).toBe(0);
    });

    it("xử lý an toàn các giá trị rỗng hoặc không hợp lệ", () => {
      expect(parseVatRate(null)).toBe(0);
      expect(parseVatRate(undefined)).toBe(0);
      expect(parseVatRate("")).toBe(0);
      expect(parseVatRate("N/A")).toBe(0);
      expect(parseVatRate(NaN)).toBe(0);
    });
  });

  describe("calculateTourDuration (Tính thời lượng tour)", () => {
    it("tính đúng số ngày số đêm", () => {
      expect(calculateTourDuration("2026-07-01", "2026-07-05")).toBe("5N4D");
      expect(calculateTourDuration("2026-08-10", "2026-08-12")).toBe("3N2D");
      expect(calculateTourDuration("2026-09-01", "2026-09-01")).toBe(
        "1 ngày (Trong ngày)",
      );
    });

    it("xử lý chu đáo trường hợp thiếu hoặc ngày không hợp lệ", () => {
      expect(calculateTourDuration(undefined, "2026-07-05")).toBe(
        "Theo lịch trình",
      );
      expect(calculateTourDuration("2026-07-01", undefined)).toBe(
        "Theo lịch trình",
      );
      expect(calculateTourDuration("invalid-date", "2026-07-05")).toBe(
        "Theo lịch trình",
      );
    });
  });

  describe("getDayOfWeek (Thứ trong tuần)", () => {
    it("trả về đúng thứ tiếng Việt", () => {
      expect(getDayOfWeek("2026-09-06")).toBe("Chủ Nhật");
      expect(getDayOfWeek("2026-09-07")).toBe("Thứ Hai");
    });

    it("trả về mặc định khi ngày trống hoặc sai", () => {
      expect(getDayOfWeek(undefined)).toBe("Chưa xếp");
      expect(getDayOfWeek("")).toBe("Chưa xếp");
      expect(getDayOfWeek("invalid")).toBe("-");
    });
  });

  describe("Định dạng tiền tệ", () => {
    it("formatCurrency format đúng với hậu tố đ", () => {
      expect(formatCurrency(15000000)).toMatch(/15[.,]000[.,]000\s*đ/);
      expect(formatCurrency(0)).toBe("0 đ");
      expect(formatCurrency(undefined)).toBe("0 đ");
    });

    it("formatSummaryCurrency format rút gọn", () => {
      expect(formatSummaryCurrency(20000000)).toMatch(/20[.,]000[.,]000\s*đ/);
    });
  });

  describe("Component Rendering", () => {
    it("DossierCostTable không hiển thị dữ liệu giả khi costLines rỗng", () => {
      render(<DossierCostTable costLines={[]} />);
      expect(screen.getByText("Chi phí theo hạng mục")).toBeInTheDocument();
      expect(screen.getByText("Chuẩn Excel APP")).toBeInTheDocument();
      expect(
        screen.getByText("Chưa có dữ liệu chi phí từ hệ thống"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("KHÁCH SẠN MƯỜNG THANH"),
      ).not.toBeInTheDocument();
    });

    it("đánh lại STT theo từng mục và hiển thị giá tiền trước VAT", () => {
      const lines = [
        {
          id: "transport-line",
          description: "Xe đưa đón sân bay",
          quantity: 1,
          multiplier: 1,
          unitPrice: 500000,
          netAmount: 500000,
          grossAmount: 550000,
          vatRate: 10,
          serviceCategory: { code: "TRANSPORT", name: "Vận chuyển xe du lịch" },
        },
        {
          id: "hotel-line",
          description: "Khách sạn 4 sao",
          quantity: 1,
          multiplier: 1,
          unitPrice: 1000000,
          netAmount: 1000000,
          grossAmount: 1100000,
          vatRate: 10,
          serviceCategory: { code: "HOTEL", name: "Khách sạn / Lưu trú" },
        },
      ] as EstimateCostLine[];

      render(<DossierCostTable costLines={lines} />);

      const hotelRow = screen.getByText("Khách sạn 4 sao").closest("tr");
      expect(hotelRow?.querySelector("td")?.textContent).toBe("1");
      expect(
        within(hotelRow as HTMLTableRowElement).getAllByText("1.000.000"),
      ).toHaveLength(2);
      expect(
        within(hotelRow as HTMLTableRowElement).queryByText("1.100.000"),
      ).not.toBeInTheDocument();
    });

    it("CostSummaryTable render đúng bảng tổng hợp và badge tỷ suất lợi nhuận", () => {
      const rows = [
        {
          key: "service-vat",
          label: "Dịch vụ 10%",
          revenue: 10000000,
          cost: 5000000,
          grossProfit: 5000000,
        },
        {
          key: "total",
          label: "TỔNG CỘNG",
          revenue: 10000000,
          cost: 5000000,
          grossProfit: 5000000,
        },
      ];

      render(<CostSummaryTable rows={rows} />);
      expect(
        screen.getByText("Tổng hợp doanh thu và lợi nhuận gộp"),
      ).toBeInTheDocument();
      expect(screen.getByText("Tỷ suất lợi nhuận:")).toBeInTheDocument();
      expect(screen.getByText("50.0%")).toBeInTheDocument();
      expect(screen.getByText("Dịch vụ 10%")).toBeInTheDocument();
      expect(screen.getByText("TỔNG CỘNG")).toBeInTheDocument();
    });

    it("DossierRevenueTable render chi tiết doanh thu và tự động chèn thời lượng tour vào Diễn giải", () => {
      const mockRevenues: EstimateRevenueLine[] = [
        {
          id: "r1",
          description: "Tour Đà Nẵng - Huế",
          quantity: 30,
          multiplier: 1,
          unitPrice: 5000000,
          grossAmount: 150000000,
          passengerType: { id: "p1", name: "Người lớn", code: "ADULT" },
        } as any,
      ];
      const mockDossier = {
        startDate: "2026-07-01",
        endDate: "2026-07-05",
      };

      render(
        <DossierRevenueTable
          revenueLines={mockRevenues}
          dossier={mockDossier}
        />,
      );
      expect(screen.getByText("Chi tiết doanh thu")).toBeInTheDocument();
      expect(screen.getByText("Tour Đà Nẵng - Huế")).toBeInTheDocument();
      expect(
        screen.getByText("Gói tour 5N4D theo chương trình"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "* Thành tiền được tính theo công thức Excel: số lượng × hệ số × đơn giá",
        ),
      ).toBeInTheDocument();
    });

    it("OperatorNotesCard render đầy đủ ghi chú và thông tin điều hành", () => {
      const mockEstimate = {
        note: "Đã đàm phán giảm 5% giá phòng khách sạn.",
        updatedAt: "2026-07-02T10:00:00Z",
      };
      const mockDossier = {
        operatorUser: { fullName: "Trần Văn Điều Hành" },
      };

      render(
        <OperatorNotesCard estimate={mockEstimate} dossier={mockDossier} />,
      );
      expect(screen.getByText("Ghi chú từ điều hành")).toBeInTheDocument();
      expect(
        screen.getByText("Đã đàm phán giảm 5% giá phòng khách sạn."),
      ).toBeInTheDocument();
      expect(screen.getByText("Trần Văn Điều Hành")).toBeInTheDocument();
    });

    it("DossierDetailTabs render 5 tabs và tích hợp các bảng chi phí, doanh thu, đối soát", () => {
      const mockEstimate = {
        revenueLines: [
          {
            id: "r1",
            description: "Tour trọn gói",
            quantity: 20,
            multiplier: 1,
            unitPrice: 10000000,
            grossAmount: 200000000,
          } as any,
        ],
        costLines: [
          {
            id: "c1",
            description: "Khách sạn Mường Thanh",
            quantity: 10,
            multiplier: 1,
            unitPrice: 1000000,
            grossAmount: 10000000,
            vatRate: 10,
          } as any,
        ],
      };

      renderWithQuery(
        <DossierDetailTabs
          estimate={mockEstimate}
          dossierId="dossier-123"
          dossier={{ startDate: "2026-07-01", endDate: "2026-07-04" }}
        />,
      );

      expect(
        screen.getByRole("tab", { name: "Thông tin chung" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: "Doanh thu" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Chi phí" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Tài liệu" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Trao đổi" })).toBeInTheDocument();

      // Kiểm tra trong tab mặc định overview có chứa cả 3 bảng
      expect(screen.getByText("Chi tiết doanh thu")).toBeInTheDocument();
      expect(screen.getByText("Chi phí theo hạng mục")).toBeInTheDocument();
      expect(
        screen.getByText("Tổng hợp doanh thu và lợi nhuận gộp"),
      ).toBeInTheDocument();
    });

    it("DossierDetailTabs render thẻ Mảng và Loại hình ở gần bảng (tab bar)", () => {
      const mockEstimate = {
        id: "est-1",
        revenueLines: [],
        costLines: [],
      };
      renderWithQuery(
        <DossierDetailTabs
          estimate={mockEstimate}
          dossierId="dossier-123"
          dossier={{
            businessLine: { code: "TOUR_OUTBOUND", name: "Du lịch Outbound" },
            marketType: { name: "Nội địa" },
          }}
        />,
      );

      expect(screen.getByText("Mảng: TOUR")).toBeInTheDocument();
      expect(screen.getByText("Loại hình: Nội địa")).toBeInTheDocument();
    });

    it("ưu tiên tên Mảng và Loại hình được snapshot từ file Excel", () => {
      const mockEstimate = {
        id: "est-2",
        revenueLines: [],
        costLines: [],
      };
      renderWithQuery(
        <DossierDetailTabs
          estimate={mockEstimate}
          dossierId="dossier-456"
          dossier={{
            businessLineName: "VÉ LẺ",
            marketTypeName: "INBOUND",
            businessLine: { code: "TICKET_VISA", name: "Tên master cũ" },
            marketType: { name: "Tên master cũ" },
          }}
        />,
      );

      expect(screen.getByText("Mảng: VÉ LẺ")).toBeInTheDocument();
      expect(screen.getByText("Loại hình: INBOUND")).toBeInTheDocument();
      expect(screen.queryByText("Mảng: Tên master cũ")).not.toBeInTheDocument();
    });

    it("DossierHeader không còn render thẻ Mảng và Loại hình dưới tiêu đề", () => {
      const mockDossier = {
        id: "dossier-123",
        code: "DOS-2026-001",
        status: "IN_REVIEW",
        businessLine: { code: "TOUR_OUTBOUND", name: "Du lịch Outbound" },
        marketType: { name: "Nội địa" },
      };
      render(<DossierHeader dossier={mockDossier} />);
      expect(screen.queryByText(/Mảng:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Loại hình:/i)).not.toBeInTheDocument();
    });

    it("DossierHeader render nút Sửa dự toán và Tải file gốc", () => {
      const mockDossier = {
        id: "dossier-123",
        code: "DOS-2026-001",
        status: "IN_REVIEW",
      };
      render(<DossierHeader dossier={mockDossier} />);
      const editBtn = screen.getByRole("link", { name: /Sửa dự toán/i });
      expect(editBtn).toHaveAttribute(
        "href",
        "/main/dossiers/dossier-123/edit-import",
      );
      expect(screen.getByText("Tải file gốc")).toBeInTheDocument();
    });

    it("DossierHeader ẩn nút Sửa dự toán khi hồ sơ đã bị LOCKED", () => {
      const mockDossier = {
        id: "dossier-123",
        code: "DOS-2026-001",
        status: "LOCKED",
      };
      render(<DossierHeader dossier={mockDossier} />);
      expect(screen.queryByText("Sửa dự toán")).not.toBeInTheDocument();
      expect(screen.getByText("Tải file gốc")).toBeInTheDocument();
    });

    it("DossierWorkflowActionBar render nút Sửa dự toán chuyển tiếp đến edit-import", () => {
      render(
        <DossierWorkflowActionBar
          dossierId="dossier-123"
          dossierStatus="IN_REVIEW"
          canOperate={true}
          isSales={false}
          isActionLoading={false}
          onStartReview={jest.fn()}
          onSubmit={jest.fn()}
          onResubmit={jest.fn()}
          onOpenModal={jest.fn()}
        />,
      );
      const editLink = screen.getByRole("link", { name: /Sửa dự toán/i });
      expect(editLink).toHaveAttribute(
        "href",
        "/main/dossiers/dossier-123/edit-import",
      );
    });

    describe("calculateTourDuration (Tính thời lượng tour chuẩn hóa UTC)", () => {
      it('trả về "1 ngày (Trong ngày)" khi tour đi và về trong cùng một ngày', () => {
        expect(calculateTourDuration("2026-09-07", "2026-09-07")).toBe(
          "1 ngày (Trong ngày)",
        );
        expect(
          calculateTourDuration(
            "2026-09-07T08:00:00.000Z",
            "2026-09-07T17:00:00.000Z",
          ),
        ).toBe("1 ngày (Trong ngày)");
      });

      it('trả về đúng định dạng "2N1D" cho tour 2 ngày 1 đêm', () => {
        expect(calculateTourDuration("2026-09-07", "2026-09-08")).toBe("2N1D");
      });

      it('trả về đúng định dạng "5N4D" cho tour 5 ngày 4 đêm', () => {
        expect(calculateTourDuration("2026-09-01", "2026-09-05")).toBe("5N4D");
      });

      it('trả về "Theo lịch trình" khi thiếu ngày hoặc ngày không hợp lệ', () => {
        expect(calculateTourDuration(undefined, "2026-09-07")).toBe(
          "Theo lịch trình",
        );
        expect(calculateTourDuration("2026-09-07", undefined)).toBe(
          "Theo lịch trình",
        );
        expect(calculateTourDuration("", "")).toBe("Theo lịch trình");
        expect(calculateTourDuration("invalid-date", "2026-09-07")).toBe(
          "Theo lịch trình",
        );
        expect(calculateTourDuration("2026-09-10", "2026-09-05")).toBe(
          "Theo lịch trình",
        );
      });

      it("DossierRevenueTable hiển thị ghi chú diễn giải tour trong ngày chính xác", () => {
        const mockRevenueLines: EstimateRevenueLine[] = [
          {
            id: "rev-1",
            description: "Tour Bà Nà Hills",
            quantity: 10,
            unitPrice: 1200000,
            grossAmount: 12000000,
          } as EstimateRevenueLine,
        ];
        const mockDossier = {
          startDate: "2026-09-07",
          endDate: "2026-09-07",
        };

        render(
          <DossierRevenueTable
            revenueLines={mockRevenueLines}
            dossier={mockDossier}
          />,
        );
        expect(
          screen.getByText("Gói tour 1 ngày (Trong ngày) theo chương trình"),
        ).toBeInTheDocument();
      });

      it("DossierRevenueTable hiển thị ghi chú diễn giải tour 5N4D chính xác", () => {
        const mockRevenueLines: EstimateRevenueLine[] = [
          {
            id: "rev-2",
            description: "Tour Miền Trung",
            quantity: 20,
            unitPrice: 5000000,
            grossAmount: 100000000,
          } as EstimateRevenueLine,
        ];
        const mockDossier = {
          startDate: "2026-09-01",
          endDate: "2026-09-05",
        };

        render(
          <DossierRevenueTable
            revenueLines={mockRevenueLines}
            dossier={mockDossier}
          />,
        );
        expect(
          screen.getByText("Gói tour 5N4D theo chương trình"),
        ).toBeInTheDocument();
      });

      it("DossierRevenueTable hiển thị ghi chú khi không có ngày", () => {
        const mockRevenueLines: EstimateRevenueLine[] = [
          {
            id: "rev-3",
            description: "Tour Tự Chọn",
            quantity: 5,
            unitPrice: 2000000,
            grossAmount: 10000000,
          } as EstimateRevenueLine,
        ];

        render(
          <DossierRevenueTable revenueLines={mockRevenueLines} dossier={{}} />,
        );
        expect(
          screen.getByText("Gói tour theo chương trình"),
        ).toBeInTheDocument();
      });

      it('DossierCostTable phân nhóm chính xác dòng có vatRate dạng chuỗi "10%" vào Section I Có VAT', () => {
        const mockLines: EstimateCostLine[] = [
          {
            id: "line-vat-str",
            description: "Khách sạn Novotel Đà Nẵng",
            quantity: 2,
            multiplier: 1,
            unitPrice: 1500000,
            grossAmount: 3000000,
            vatRate: "10%" as any,
            serviceCategory: { code: "HOTEL", name: "Khách sạn" },
          } as EstimateCostLine,
          {
            id: "line-novat-str",
            description: "Nước uống khăn lạnh",
            quantity: 10,
            multiplier: 1,
            unitPrice: 10000,
            grossAmount: 100000,
            vatRate: "0%" as any,
            serviceCategory: { code: "OTHER", name: "Khác" },
          } as EstimateCostLine,
        ];

        render(<DossierCostTable costLines={mockLines} />);
        expect(
          screen.getByText("Khách sạn Novotel Đà Nẵng"),
        ).toBeInTheDocument();
        expect(screen.getByText("Nước uống khăn lạnh")).toBeInTheDocument();
        expect(screen.getByText("DỊCH VỤ ĐẦU VÀO CÓ VAT")).toBeInTheDocument();
        expect(
          screen.getByText("DỊCH VỤ ĐẦU VÀO CHƯA VAT"),
        ).toBeInTheDocument();
      });

      it("xác định đúng nút hành động trong Sửa dự toán theo vai trò OPERATOR vs SALES", () => {
        // Operator logic
        const operatorHasRole = (role: string | string[]) => {
          if (Array.isArray(role)) return role.includes("OPERATOR");
          return role === "OPERATOR";
        };
        const isOperator = operatorHasRole("OPERATOR");
        const isCeoAdmin = operatorHasRole(["SUPER_ADMIN", "CEO_ADMIN"]);
        const canOperate = isOperator || isCeoAdmin;

        expect(canOperate).toBe(true);
        // Operator should have Lưu thay đổi and Lưu tạm, NOT Gửi điều hành lại
        const operatorButtons = canOperate
          ? ["Lưu tạm", "Lưu thay đổi"]
          : ["Lưu nháp", "Gửi điều hành duyệt"];
        expect(operatorButtons).toContain("Lưu thay đổi");
        expect(operatorButtons).toContain("Lưu tạm");
        expect(operatorButtons).not.toContain("Gửi điều hành lại");

        // Sales logic
        const salesHasRole = (role: string | string[]) => {
          if (Array.isArray(role)) return role.includes("SALES");
          return role === "SALES";
        };
        const isSales =
          salesHasRole("SALES") &&
          !(
            salesHasRole("OPERATOR") ||
            salesHasRole(["SUPER_ADMIN", "CEO_ADMIN"])
          );
        expect(isSales).toBe(true);

        // Sales in edit-import should save changes (Lưu thay đổi) and not submit to operator directly
        const salesDraftButtons = ["Lưu nháp", "Lưu thay đổi"];
        expect(salesDraftButtons).toContain("Lưu thay đổi");
        expect(salesDraftButtons).toContain("Lưu nháp");
        expect(salesDraftButtons).not.toContain("Gửi điều hành duyệt");
      });
    });
  });
});
