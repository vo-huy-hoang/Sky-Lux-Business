const fs = require('fs');
let code = fs.readFileSync('reconstructed.tsx', 'utf-8');

const bottomSection = `            </WidgetErrorBoundary>
        </div>
      </div>

      {/* 4. BOTTOM SECTION: 3 CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr_0.9fr] gap-4">
        {/* Top Khách Hàng */}
        <WidgetErrorBoundary title="Top khách hàng">
          <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col h-full">
            <div className="p-4 border-b border-[#E5E8E6] flex items-center justify-between">
              <span className="text-[15px] font-bold text-slate-900">Top khách hàng</span>
              <span className="text-xs text-slate-400">Đơn vị: Tỷ đ</span>
            </div>
            <div className="p-0 flex-1">
              <div className="flex flex-col">
                {topCustomers.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={"w-8 h-8 rounded flex items-center justify-center font-bold text-sm shrink-0 " + item.logoBg}>
                        {item.logoLetter}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-800 truncate">{item.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Hạng {item.rank}</div>
                      </div>
                    </div>
                    <div className="font-bold text-slate-900 tabular-nums shrink-0 ml-3">
                      {item.value}B
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </WidgetErrorBoundary>

        {/* Tổng hợp theo thị trường */}
        <WidgetErrorBoundary title="Tổng hợp theo thị trường">
          <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col h-full">
            <div className="p-4 border-b border-[#E5E8E6]">
              <span className="text-[15px] font-bold text-slate-900">Tổng hợp theo thị trường</span>
            </div>
            <div className="p-0 flex-1 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Thị trường</th>
                    <th className="px-4 py-3 font-semibold text-right">Hồ sơ</th>
                    <th className="px-4 py-3 font-semibold text-right">Doanh thu (Tỷ)</th>
                    <th className="px-4 py-3 font-semibold text-right">Lợi nhuận (Tỷ)</th>
                    <th className="px-4 py-3 font-semibold text-right">Tỷ trọng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {marketRows.map((row) => (
                    <tr key={row.key} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">{row.market}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600 tabular-nums">{row.dossiers}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-900 tabular-nums">{row.revenue}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-[#0A8A61] tabular-nums">{row.profit}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-medium bg-[#E8F6ED] text-[#0A8A61]">
                          {row.share}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </WidgetErrorBoundary>

        {/* Báo cáo nhanh */}
        <WidgetErrorBoundary title="Báo cáo nhanh">
          <div className="bg-white rounded-xl border border-[#E5E8E6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col h-full">
            <div className="p-4 border-b border-[#E5E8E6]">
              <span className="text-[15px] font-bold text-slate-900">Báo cáo nhanh</span>
            </div>
            <div className="p-4 flex flex-col gap-2.5 flex-1">
              {quickReports.map((report) => (
                <Link key={report.id} href={report.href} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-[#C8EBD5] hover:bg-[#F3FAF5] transition-colors group">
                  <div className={"w-8 h-8 rounded-lg flex items-center justify-center shrink-0 " + report.iconBox}>
                    {report.icon}
                  </div>
                  <span className="text-[13px] font-medium text-slate-700 group-hover:text-[#0A8A61] flex-1 truncate">
                    {report.title}
                  </span>
                  <RightOutlined className="text-[10px] text-slate-300 group-hover:text-[#0A8A61]" />
                </Link>
              ))}
            </div>
          </div>
        </WidgetErrorBoundary>
      </div>

    </div>
  );
}

export default function RevenuePage() {
  const hasRole = useAuthStore((state) => state.hasRole);
  return hasRole('OPERATOR') ? <OperatorRevenue /> : <CeoRevenuePage />;
}
`;

fs.writeFileSync('reconstructed.tsx', code + bottomSection);
console.log("Appended the rest of the file successfully.");
