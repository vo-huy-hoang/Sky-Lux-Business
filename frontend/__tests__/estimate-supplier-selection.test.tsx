import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  EstimateCostEditorTable,
  SupplierOptionItem,
} from '@/components/dossiers/edit-import/components/EstimateCostEditorTable';
import {
  mapSuppliersToOptions,
  mergeSuppliersWithCurrent,
} from '@/components/dossiers/edit-import/utils/supplier-options';
import { EditableCostRow } from '@/components/dossiers/edit-import/validation/estimate-validator';

beforeAll(() => {
  if (typeof global.MessageChannel === 'undefined') {
    class MockMessagePort {
      onmessage: ((event: any) => void) | null = null;
      close() {}
    }
    class MockMessageChannel {
      port1 = new MockMessagePort();
      port2 = new MockMessagePort();
      constructor() {
        (this.port1 as any).postMessage = (data: any) => {
          setTimeout(() => {
            if (this.port2.onmessage) {
              this.port2.onmessage({ data });
            }
          }, 0);
        };
        (this.port2 as any).postMessage = (data: any) => {
          setTimeout(() => {
            if (this.port1.onmessage) {
              this.port1.onmessage({ data });
            }
          }, 0);
        };
      }
    }
    global.MessageChannel = MockMessageChannel as any;
  }

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('EstimateCostEditorTable - Supplier Selection & Empty State (Ticket 02)', () => {
  const mockOnCellChange = jest.fn();
  const mockOnAddRow = jest.fn();
  const mockOnDeleteRow = jest.fn();

  const sampleRow: EditableCostRow = {
    id: 'row-1',
    stt: 1,
    description: 'Dịch vụ xe 29 chỗ',
    supplierId: undefined,
    supplierName: undefined,
    quantity: 1,
    multiplier: 1,
    unit: 'Chuyến',
    unitPrice: 5000000,
    vatRate: 8,
    note: '',
    status: 'VALID',
  };

  const sampleSection = {
    code: '1.3',
    title: 'XE VẬN CHUYỂN',
    order: 3,
    items: [sampleRow],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without hardcoded mock suppliers when supplierOptions is empty', () => {
    render(
      <EstimateCostEditorTable
        costRows={[sampleRow]}
        costVatSections={[sampleSection]}
        costNoVatItems={[]}
        totalCostVat={5400000}
        totalCostNoVatSum={0}
        grandTotalCost={5400000}
        supplierOptions={[]}
        onCellChange={mockOnCellChange}
        onAddRow={mockOnAddRow}
        onDeleteRow={mockOnDeleteRow}
      />,
    );

    // Verify none of the 5 fake static mock suppliers are present in DOM
    expect(screen.queryByText('Vietnam Airlines')).not.toBeInTheDocument();
    expect(screen.queryByText('Hotel Boss')).not.toBeInTheDocument();
    expect(screen.queryByText('Marina Bay Sands')).not.toBeInTheDocument();
    expect(screen.queryByText('TransViet')).not.toBeInTheDocument();
    expect(screen.queryByText('VN Guide')).not.toBeInTheDocument();

    // Verify the select placeholder is rendered
    expect(screen.getByText('Chọn nhà cung cấp...')).toBeInTheDocument();
  });

  it('preserves and displays existing row supplierId and supplierName even when not in supplierOptions', () => {
    const rowWithSupplier: EditableCostRow = {
      ...sampleRow,
      id: 'row-with-sup',
      supplierId: 'real-uuid-999',
      supplierName: 'Nhà Xe Tuấn Kiệt',
    };

    const sectionWithSupplier = {
      ...sampleSection,
      items: [rowWithSupplier],
    };

    const otherSuppliers: SupplierOptionItem[] = [
      {
        id: 'other-uuid',
        label: 'Khách sạn Mường Thanh',
        value: 'other-uuid',
      },
    ];

    render(
      <EstimateCostEditorTable
        costRows={[rowWithSupplier]}
        costVatSections={[sectionWithSupplier]}
        costNoVatItems={[]}
        totalCostVat={5400000}
        totalCostNoVatSum={0}
        grandTotalCost={5400000}
        supplierOptions={otherSuppliers}
        onCellChange={mockOnCellChange}
        onAddRow={mockOnAddRow}
        onDeleteRow={mockOnDeleteRow}
      />,
    );

    // Should display the row's assigned supplier name
    expect(screen.getByText('Nhà Xe Tuấn Kiệt')).toBeInTheDocument();
  });

  it('maps valid API supplier records with real UUID value and returns empty array when no suppliers exist', () => {
    // 1. When empty, mapSuppliersToOptions returns empty array without mock fallbacks
    expect(mapSuppliersToOptions([])).toEqual([]);

    // 2. When suppliers exist, maps with real UUID as value and id
    const apiSuppliers = [
      {
        id: 'real-uuid-1',
        organizationId: 'org-1',
        code: 'SUP-01',
        name: 'Công ty Xe Miền Trung',
        supplierTypeId: 'type-xe',
        supplierTypeName: 'Dịch vụ xe',
        status: 'ACTIVE' as const,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];

    const mapped = mapSuppliersToOptions(apiSuppliers);

    expect(mapped).toHaveLength(1);
    expect(mapped[0].value).toBe('real-uuid-1');
    expect(mapped[0].id).toBe('real-uuid-1');
    expect(mapped[0].label).toBe('[SUP-01] Công ty Xe Miền Trung');
    expect(mapped[0].supplierTypeName).toBe('Dịch vụ xe');
  });

  describe('Category-aware Supplier Grouping (Ticket 03)', () => {
    const suppliers: SupplierOptionItem[] = [
      {
        id: 'uuid-xe-1',
        value: 'uuid-xe-1',
        label: 'Nhà Xe Phương Trang',
        code: 'NCC-XE-01',
        supplierTypeName: 'Dịch vụ xe',
      },
      {
        id: 'uuid-nh-1',
        value: 'uuid-nh-1',
        label: 'Nhà hàng Cơm Niêu',
        code: 'NCC-NH-01',
        supplierTypeName: 'Nhà hàng',
      },
      {
        id: 'uuid-ks-1',
        value: 'uuid-ks-1',
        label: 'Khách sạn Novotel',
        code: 'NCC-KS-01',
        supplierTypeName: 'Khách sạn',
      },
    ];

    it('groups supplier options under "Đúng loại dịch vụ" and "Các nhà cung cấp khác" when matching section category', () => {
      const sectionXe = {
        code: '1.3',
        title: 'XE VẬN CHUYỂN',
        order: 3,
        items: [sampleRow],
      };

      render(
        <EstimateCostEditorTable
          costRows={[sampleRow]}
          costVatSections={[sectionXe]}
          costNoVatItems={[]}
          totalCostVat={5400000}
          totalCostNoVatSum={0}
          grandTotalCost={5400000}
          supplierOptions={suppliers}
          onCellChange={mockOnCellChange}
          onAddRow={mockOnAddRow}
          onDeleteRow={mockOnDeleteRow}
        />,
      );

      // Open select dropdown (first combobox in the row is the Supplier Select)
      const supplierCombobox = screen.getAllByRole('combobox')[0];
      fireEvent.mouseDown(supplierCombobox);

      // Check group titles in the dropdown
      expect(
        screen.getByText('Đúng loại dịch vụ: Dịch vụ xe (1)'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Các nhà cung cấp khác (2)'),
      ).toBeInTheDocument();

      // Check option labels are in dropdown
      expect(screen.getByText('Nhà Xe Phương Trang')).toBeInTheDocument();
      expect(screen.getByText('Nhà hàng Cơm Niêu')).toBeInTheDocument();
      expect(screen.getByText('Khách sạn Novotel')).toBeInTheDocument();
    });

    it('allows selecting a supplier from "Các nhà cung cấp khác" without restriction', () => {
      const sectionXe = {
        code: '1.3',
        title: 'XE VẬN CHUYỂN',
        order: 3,
        items: [sampleRow],
      };

      render(
        <EstimateCostEditorTable
          costRows={[sampleRow]}
          costVatSections={[sectionXe]}
          costNoVatItems={[]}
          totalCostVat={5400000}
          totalCostNoVatSum={0}
          grandTotalCost={5400000}
          supplierOptions={suppliers}
          onCellChange={mockOnCellChange}
          onAddRow={mockOnAddRow}
          onDeleteRow={mockOnDeleteRow}
        />,
      );

      // Open select dropdown (first combobox in the row is the Supplier Select)
      const supplierCombobox = screen.getAllByRole('combobox')[0];
      fireEvent.mouseDown(supplierCombobox);

      // Select supplier from the other group (Nhà hàng)
      const restaurantOption = screen.getByText('Nhà hàng Cơm Niêu');
      fireEvent.click(restaurantOption);

      expect(mockOnCellChange).toHaveBeenCalledWith('row-1', {
        supplierName: 'Nhà hàng Cơm Niêu',
        supplierId: 'uuid-nh-1',
      });
    });

    it('renders a flat list when section category is unrecognized (OTHER)', () => {
      const rowOther: EditableCostRow = {
        ...sampleRow,
        id: 'row-other-1',
        categoryTitle: 'DỊCH VỤ ĐẦU VÀO CHƯA VAT',
      };

      render(
        <EstimateCostEditorTable
          costRows={[rowOther]}
          costVatSections={[]}
          costNoVatItems={[rowOther]}
          totalCostVat={0}
          totalCostNoVatSum={5400000}
          grandTotalCost={5400000}
          supplierOptions={suppliers}
          onCellChange={mockOnCellChange}
          onAddRow={mockOnAddRow}
          onDeleteRow={mockOnDeleteRow}
        />,
      );

      // Open select dropdown (first combobox in the row is the Supplier Select)
      const supplierCombobox = screen.getAllByRole('combobox')[0];
      fireEvent.mouseDown(supplierCombobox);

      // Verify no "Đúng loại dịch vụ" group header
      expect(
        screen.queryByText(/Đúng loại dịch vụ:/i),
      ).not.toBeInTheDocument();

      // All suppliers still rendered
      expect(screen.getByText('Nhà Xe Phương Trang')).toBeInTheDocument();
      expect(screen.getByText('Nhà hàng Cơm Niêu')).toBeInTheDocument();
      expect(screen.getByText('Khách sạn Novotel')).toBeInTheDocument();
    });
  });

  describe('Scalable Debounced Remote Supplier Search & Label Preservation (Ticket 04)', () => {
    describe('mergeSuppliersWithCurrent pure function (mergeByKey id)', () => {
      it('merges current supplier by id when not in options array', () => {
        const options: SupplierOptionItem[] = [
          { id: 's1', value: 's1', label: 'Supplier 1' },
        ];
        const currentRow = {
          supplierId: 's2',
          supplierName: 'Supplier 2',
          supplierCode: 'SUP-02',
          supplierTypeName: 'Dịch vụ xe',
        };

        const merged = mergeSuppliersWithCurrent(options, currentRow);
        expect(merged).toHaveLength(2);
        expect(merged[0]).toEqual({
          key: 'current-supplier-s2',
          id: 's2',
          value: 's2',
          label: '[SUP-02] Supplier 2',
          code: 'SUP-02',
          supplierTypeName: 'Dịch vụ xe',
        });
        expect(merged[1]).toEqual(options[0]);
      });

      it('does not duplicate current supplier if already present in options array', () => {
        const options: SupplierOptionItem[] = [
          { id: 's1', value: 's1', label: 'Supplier 1' },
        ];
        const currentRow = {
          supplierId: 's1',
          supplierName: 'Supplier 1',
        };

        const merged = mergeSuppliersWithCurrent(options, currentRow);
        expect(merged).toHaveLength(1);
        expect(merged[0]).toBe(options[0]);
      });

      it('merges current supplier by name when only supplierName exists', () => {
        const options: SupplierOptionItem[] = [
          { id: 's1', value: 's1', label: 'Supplier 1' },
        ];
        const currentRow = {
          supplierName: 'Legacy Unmapped Hotel',
        };

        const merged = mergeSuppliersWithCurrent(options, currentRow);
        expect(merged).toHaveLength(2);
        expect(merged[0]).toEqual({
          key: 'current-supplier-name-Legacy Unmapped Hotel',
          label: 'Legacy Unmapped Hotel',
          value: 'Legacy Unmapped Hotel',
        });
      });

      it('returns original options untouched when currentRow has neither id nor name', () => {
        const options: SupplierOptionItem[] = [
          { id: 's1', value: 's1', label: 'Supplier 1' },
        ];
        const merged = mergeSuppliersWithCurrent(options, {});
        expect(merged).toBe(options);
      });
    });

    describe('Remote search and debouncing in EstimateCostEditorTable', () => {
      const defaultSuppliers: SupplierOptionItem[] = [
        {
          id: 'def-1',
          value: 'def-1',
          label: 'Nhà Xe Mặc Định 1',
          supplierTypeName: 'Dịch vụ xe',
        },
        {
          id: 'def-2',
          value: 'def-2',
          label: 'Khách Sạn Mặc Định 2',
          supplierTypeName: 'Khách sạn',
        },
      ];

      it('triggers debounced search after 300ms delay and renders remote results', async () => {
        const mockSearch = jest.fn().mockResolvedValue([
          {
            id: 'remote-1',
            value: 'remote-1',
            label: 'Xe Du Lịch Hoa Sen',
            supplierTypeName: 'Dịch vụ xe',
          },
        ]);

        render(
          <EstimateCostEditorTable
            costRows={[sampleRow]}
            costVatSections={[sampleSection]}
            costNoVatItems={[]}
            totalCostVat={5400000}
            totalCostNoVatSum={0}
            grandTotalCost={5400000}
            supplierOptions={defaultSuppliers}
            onSearchSuppliers={mockSearch}
            onCellChange={mockOnCellChange}
            onAddRow={mockOnAddRow}
            onDeleteRow={mockOnDeleteRow}
          />,
        );

        const supplierCombobox = screen.getAllByRole('combobox')[0];
        fireEvent.mouseDown(supplierCombobox);

        // Before typing, default options are visible
        expect(screen.getByText('Nhà Xe Mặc Định 1')).toBeInTheDocument();

        // Type search keyword
        fireEvent.change(supplierCombobox, { target: { value: 'Hoa Sen' } });

        // Search should not be triggered synchronously
        expect(mockSearch).not.toHaveBeenCalled();

        // Wait for 300ms debounce
        await waitFor(
          () => {
            expect(mockSearch).toHaveBeenCalledWith('Hoa Sen');
          },
          { timeout: 1000 },
        );

        // After search resolves, remote option is visible
        await waitFor(() => {
          expect(screen.getByText('Xe Du Lịch Hoa Sen')).toBeInTheDocument();
        });
      });

      it('preserves existing row supplier label even when remote search returns disjoint results', async () => {
        const rowWithSelectedSup: EditableCostRow = {
          ...sampleRow,
          id: 'row-selected-sup',
          supplierId: 'selected-uuid-999',
          supplierName: 'Xe Đang Chọn Lạc Hồng',
        };

        const sectionWithSelectedSup = {
          ...sampleSection,
          items: [rowWithSelectedSup],
        };

        const mockSearch = jest.fn().mockResolvedValue([
          {
            id: 'hotel-remote-1',
            value: 'hotel-remote-1',
            label: 'Khách sạn Vịnh Hạ Long',
            supplierTypeName: 'Khách sạn',
          },
        ]);

        render(
          <EstimateCostEditorTable
            costRows={[rowWithSelectedSup]}
            costVatSections={[sectionWithSelectedSup]}
            costNoVatItems={[]}
            totalCostVat={5400000}
            totalCostNoVatSum={0}
            grandTotalCost={5400000}
            supplierOptions={defaultSuppliers}
            onSearchSuppliers={mockSearch}
            onCellChange={mockOnCellChange}
            onAddRow={mockOnAddRow}
            onDeleteRow={mockOnDeleteRow}
          />,
        );

        // Initial render preserves label
        expect(screen.getByText('Xe Đang Chọn Lạc Hồng')).toBeInTheDocument();

        const supplierCombobox = screen.getAllByRole('combobox')[0];
        fireEvent.mouseDown(supplierCombobox);
        fireEvent.change(supplierCombobox, {
          target: { value: 'Vịnh Hạ Long' },
        });

        await waitFor(
          () => {
            expect(mockSearch).toHaveBeenCalledWith('Vịnh Hạ Long');
          },
          { timeout: 1000 },
        );

        // After remote search returns hotels, the current row's label is NOT wiped out
        expect(
          screen.getAllByText('Xe Đang Chọn Lạc Hồng').length,
        ).toBeGreaterThanOrEqual(1);
        // And the remote search result is rendered in the dropdown
        await waitFor(() => {
          expect(screen.getByText('Khách sạn Vịnh Hạ Long')).toBeInTheDocument();
        });
      });

      it('groups remote search results according to section category (Ticket 03 integration)', async () => {
        const mockSearch = jest.fn().mockResolvedValue([
          {
            id: 'sup-matched',
            value: 'sup-matched',
            label: 'Xe Vận Tải Miền Bắc',
            supplierTypeName: 'Dịch vụ xe',
          },
          {
            id: 'sup-other',
            value: 'sup-other',
            label: 'Nhà hàng Ánh Dương',
            supplierTypeName: 'Nhà hàng',
          },
        ]);

        render(
          <EstimateCostEditorTable
            costRows={[sampleRow]}
            costVatSections={[sampleSection]}
            costNoVatItems={[]}
            totalCostVat={5400000}
            totalCostNoVatSum={0}
            grandTotalCost={5400000}
            supplierOptions={defaultSuppliers}
            onSearchSuppliers={mockSearch}
            onCellChange={mockOnCellChange}
            onAddRow={mockOnAddRow}
            onDeleteRow={mockOnDeleteRow}
          />,
        );

        const supplierCombobox = screen.getAllByRole('combobox')[0];
        fireEvent.mouseDown(supplierCombobox);
        fireEvent.change(supplierCombobox, { target: { value: 'Miền Bắc' } });

        await waitFor(
          () => {
            expect(mockSearch).toHaveBeenCalledWith('Miền Bắc');
          },
          { timeout: 1000 },
        );

        // Check that OptGroup headers are generated for the remote search results
        await waitFor(() => {
          expect(
            screen.getByText('Đúng loại dịch vụ: Dịch vụ xe (1)'),
          ).toBeInTheDocument();
          expect(
            screen.getByText('Các nhà cung cấp khác (1)'),
          ).toBeInTheDocument();
          expect(screen.getByText('Xe Vận Tải Miền Bắc')).toBeInTheDocument();
          expect(screen.getByText('Nhà hàng Ánh Dương')).toBeInTheDocument();
        });
      });

      it('restores default options when search input is cleared', async () => {
        const mockSearch = jest.fn().mockResolvedValue([
          {
            id: 'sup-search-result',
            value: 'sup-search-result',
            label: 'Nhà Xe Tìm Thấy',
            supplierTypeName: 'Dịch vụ xe',
          },
        ]);

        render(
          <EstimateCostEditorTable
            costRows={[sampleRow]}
            costVatSections={[sampleSection]}
            costNoVatItems={[]}
            totalCostVat={5400000}
            totalCostNoVatSum={0}
            grandTotalCost={5400000}
            supplierOptions={defaultSuppliers}
            onSearchSuppliers={mockSearch}
            onCellChange={mockOnCellChange}
            onAddRow={mockOnAddRow}
            onDeleteRow={mockOnDeleteRow}
          />,
        );

        const supplierCombobox = screen.getAllByRole('combobox')[0];
        fireEvent.mouseDown(supplierCombobox);
        fireEvent.change(supplierCombobox, { target: { value: 'Tìm Thấy' } });

        await waitFor(
          () => {
            expect(mockSearch).toHaveBeenCalledWith('Tìm Thấy');
          },
          { timeout: 1000 },
        );

        await waitFor(() => {
          expect(screen.getByText('Nhà Xe Tìm Thấy')).toBeInTheDocument();
        });

        // Clear search input (simulate user backspacing to empty)
        fireEvent.change(supplierCombobox, { target: { value: '' } });

        // Default options are restored immediately
        await waitFor(() => {
          expect(screen.getByText('Nhà Xe Mặc Định 1')).toBeInTheDocument();
          expect(screen.getByText('Khách Sạn Mặc Định 2')).toBeInTheDocument();
        });
      });

      it('allows selecting a supplier from remote search results and calls onCellChange', async () => {
        const mockSearch = jest.fn().mockResolvedValue([
          {
            id: 'remote-chosen-1',
            value: 'remote-chosen-1',
            label: 'Xe Cao Cấp SkyLux',
            supplierTypeName: 'Dịch vụ xe',
          },
        ]);

        render(
          <EstimateCostEditorTable
            costRows={[sampleRow]}
            costVatSections={[sampleSection]}
            costNoVatItems={[]}
            totalCostVat={5400000}
            totalCostNoVatSum={0}
            grandTotalCost={5400000}
            supplierOptions={defaultSuppliers}
            onSearchSuppliers={mockSearch}
            onCellChange={mockOnCellChange}
            onAddRow={mockOnAddRow}
            onDeleteRow={mockOnDeleteRow}
          />,
        );

        const supplierCombobox = screen.getAllByRole('combobox')[0];
        fireEvent.mouseDown(supplierCombobox);
        fireEvent.change(supplierCombobox, { target: { value: 'SkyLux' } });

        await waitFor(
          () => {
            expect(mockSearch).toHaveBeenCalledWith('SkyLux');
          },
          { timeout: 1000 },
        );

        const option = await screen.findByText('Xe Cao Cấp SkyLux');
        fireEvent.click(option);

        expect(mockOnCellChange).toHaveBeenCalledWith('row-1', {
          supplierId: 'remote-chosen-1',
          supplierName: 'Xe Cao Cấp SkyLux',
        });
      });
    });
  });
});
