const fs = require('fs');

let content = fs.readFileSync('reconstructed-clean.tsx', 'utf-8');

// Ensure salesSummary is fetched
if (!content.includes('const { data: salesSummary = [] } = useOperatorSalesSummary();')) {
  content = content.replace(
    /const { data: monthlyTrend = \[\] } = useCeoMonthlyTrend\(year\);/,
    "const { data: monthlyTrend = [] } = useCeoMonthlyTrend(year);\n  const { data: salesSummary = [] } = useOperatorSalesSummary();"
  );
}

// Ensure useOperatorSalesSummary is imported
if (!content.includes('useOperatorSalesSummary')) {
  content = content.replace(
    /useCeoMonthlyTrend } from '@\/hooks\/dashboards';/,
    "useCeoMonthlyTrend, useOperatorSalesSummary } from '@/hooks/dashboards';"
  );
}

// 1. Calculate dynamic values for charts and tables
const dynamicDataCode = `
  const formatMoney = (val: number) => {
    if (!val) return '0';
    return new Intl.NumberFormat('vi-VN').format(val);
  };
  const formatTyg = (val: number) => {
    return (val / 1_000_000_000).toFixed(2);
  };

  // KPI calculations
  const currentMonthRev = monthData?.totalRevenue || 0;
  const currentMonthProfit = monthData?.totalProfit || 0;
  const currentMonthCost = currentMonthRev - currentMonthProfit;
  const currentMonthMargin = currentMonthRev > 0 ? (currentMonthProfit / currentMonthRev) * 100 : 0;
  
  const currentQuarterRev = quarterData?.totalRevenue || 0;
  const avgDays = monthData?.avgDossierClosingDays || 0;

  // Monthly trend for line chart
  const monthlyLabels = monthlyTrend.map(t => t.label);
  const chartRevenue = monthlyTrend.map(t => Number(t.totalRevenue) / 1_000_000_000);
  const chartProfit = monthlyTrend.map(t => Number(t.totalProfit) / 1_000_000_000);

  const lineChartData = {
    labels: monthlyLabels,
    datasets: [
      {
        label: 'Doanh thu (đ)',
        data: chartRevenue,
        borderColor: '#104E35',
        backgroundColor: '#104E35',
        tension: 0.35,
        pointRadius: 3.5,
        pointHoverRadius: 5.5,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#104E35',
        pointBorderWidth: 2,
      },
      {
        label: 'Lợi nhuận (đ)',
        data: chartProfit,
        borderColor: '#D48B1E',
        backgroundColor: '#D48B1E',
        tension: 0.35,
        pointRadius: 3.5,
        pointHoverRadius: 5.5,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#D48B1E',
        pointBorderWidth: 2,
      },
    ],
  };

  // Sales Bar Data
  const topSales = [...salesSummary].sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue)).slice(0, 7);
  const salesBarData = {
    labels: topSales.map(s => s.salesUserName),
    datasets: [
      {
        label: 'Doanh thu (Tỷ)',
        data: topSales.map(s => Number(s.totalRevenue) / 1_000_000_000),
        backgroundColor: '#104E35',
        hoverBackgroundColor: '#0B3A27',
        borderRadius: 3.5,
        barThickness: 18,
      },
    ],
  };
  const maxSalesValue = topSales.length > 0 ? Math.max(...topSales.map(s => Number(s.totalRevenue) / 1_000_000_000)) : 25;

  // Top Customers
  const customerColors = [
    { badgeBg: 'bg-[#FEF3C7] text-[#D97706]', logoBg: 'bg-[#F97316] text-white' },
    { badgeBg: 'bg-[#DBEAFE] text-[#2563EB]', logoBg: 'bg-[#0284C7] text-white' },
    { badgeBg: 'bg-[#FEF3C7] text-[#92400E]', logoBg: 'bg-[#059669] text-white' },
    { badgeBg: 'bg-slate-100 text-slate-500', logoBg: 'bg-[#E11D48] text-white' },
    { badgeBg: 'bg-slate-100 text-slate-500', logoBg: 'bg-[#1E293B] text-white' },
  ];
  const topCustomers = (monthData?.vipCustomers || []).slice(0, 5).map((c, i) => ({
    rank: i + 1,
    name: c.customerName,
    value: Number(c.spend) / 1_000_000_000,
    badgeBg: customerColors[i % customerColors.length].badgeBg,
    logoLetter: c.customerName.charAt(0).toUpperCase(),
    logoBg: customerColors[i % customerColors.length].logoBg,
  }));

  // Market Table
  const marketRows = (monthData?.marketBreakdown || []).map((m, i) => ({
    key: String(i),
    market: m.marketName,
    dossiers: m.dossiers.toLocaleString(),
    revenue: (Number(m.revenue) / 1_000_000_000).toFixed(2),
    profit: (Number(m.profit) / 1_000_000_000).toFixed(2),
    share: currentMonthRev > 0 ? ((Number(m.revenue) / currentMonthRev) * 100).toFixed(1) + '%' : '0%',
  }));

  // Donut Chart data
  const revenueBreakdown = monthData?.revenueBreakdown || [];
  const totalBreakdown = revenueBreakdown.reduce((sum, b) => sum + Number(b.amount), 0);
  const sortedBreakdown = [...revenueBreakdown].sort((a, b) => Number(b.amount) - Number(a.amount));
  const donutColors = ['#104E35', '#2C7459', '#D48B1E', '#5B80C6', '#7C59C8'];
  let currentAngle = 0;
  const donutSlices = sortedBreakdown.map((item, i) => {
    const amount = Number(item.amount);
    const percentage = totalBreakdown > 0 ? (amount / totalBreakdown) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    const midAngle = startAngle + angle / 2;
    currentAngle = endAngle;
    return {
      name: item.businessLineName,
      amount,
      percentage,
      startAngle,
      endAngle,
      midAngle,
      color: donutColors[i % donutColors.length],
    };
  });
`;

// Regex replace for the mock data declarations
content = content.replace(/\/\/ Monthly line chart data matching Image 1[\s\S]*?(?=const maxSalesValue = 25;)/, dynamicDataCode);
content = content.replace(/const maxSalesValue = 25;/, '');
content = content.replace(/\/\/ Top Customers Data[\s\S]*?(?=\/\/ Quick Reports List)/, '');

// Replace KPI Metric 1
content = content.replace(/42,850,000,000 đ/, '{formatMoney(currentMonthRev)} đ');
content = content.replace(/<span>↑ 18\.6%<\/span>/, '<span>↑ 0%</span>');
content = content.replace(/so với tháng 04\/2025/g, 'so với tháng trước');

// Replace KPI Metric 2
content = content.replace(/124,650,000,000 đ/, '{formatMoney(currentQuarterRev)} đ');
content = content.replace(/<span>↑ 16\.3%<\/span>/, '<span>↑ 0%</span>');
content = content.replace(/so với quý I\/2025/g, 'so với quý trước');

// Replace KPI Metric 3
content = content.replace(/78,260,000,000 đ/, '{formatMoney(currentMonthCost)} đ');
content = content.replace(/<span>↑ 12\.1%<\/span>/, '<span>↑ 0%</span>');

// Replace KPI Metric 4
content = content.replace(/46,390,000,000 đ/, '{formatMoney(currentMonthProfit)} đ');
content = content.replace(/<span>↑ 22\.4%<\/span>/, '<span>↑ 0%</span>');

// Replace KPI Metric 5
content = content.replace(/36\.3%/, '{currentMonthMargin.toFixed(1)}%');
content = content.replace(/<span>↑ 2\.6 điểm %<\/span>/, '<span>↑ 0 điểm %</span>');

// Replace KPI Metric 6 (Công nợ phải thu -> Thời gian chốt HSYC)
content = content.replace(/Công nợ phải thu/g, 'Thời gian chốt HSYC trung bình');
content = content.replace(/32,180,000,000 đ/, '{avgDays.toFixed(1)} ngày');
content = content.replace(/<span>↑ 8\.7%<\/span>/, '<span>↓ 0%</span>');

// Replace Donut chart rendering
const donutRenderRegex = /<svg viewBox="0 0 100 100" className="w-full h-full">[\s\S]*?<\/svg>/;
const dynamicDonutRender = `<svg viewBox="0 0 100 100" className="w-full h-full">
                      {/* Center circle text */}
                      <text x="50" y="46" textAnchor="middle" fill="#64748B" fontSize="4.5" fontWeight="500">
                        Tổng doanh thu
                      </text>
                      <text x="50" y="55" textAnchor="middle" fill="#0F172A" fontSize="6.5" fontWeight="bold">
                        {formatTyg(currentMonthRev)} Tỷ
                      </text>

                      {donutSlices.map((slice, i) => (
                        <React.Fragment key={i}>
                          <path
                            d={describeDonutSlice(50, 50, 48, 27, slice.startAngle, slice.endAngle)}
                            fill={slice.color}
                            stroke="#FFFFFF"
                            strokeWidth="1.5"
                          />
                          {slice.percentage > 4 && (
                            <text
                              x={polarToCartesian(50, 50, 37.5, slice.midAngle).x}
                              y={polarToCartesian(50, 50, 37.5, slice.midAngle).y}
                              fill="#FFFFFF"
                              fontSize={slice.percentage > 10 ? "6" : "4.5"}
                              fontWeight="bold"
                              textAnchor="middle"
                              dominantBaseline="central"
                            >
                              {Math.round(slice.percentage)}%
                            </text>
                          )}
                        </React.Fragment>
                      ))}
                    </svg>`;
content = content.replace(donutRenderRegex, dynamicDonutRender);

// Replace Legend Rendering
const legendRenderRegex = /<div className="flex-1 space-y-2 text-xs min-w-0">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
const dynamicLegendRender = `<div className="flex-1 space-y-2 text-xs min-w-0">
                    {donutSlices.map((slice, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: slice.color }} />
                          <span className="text-[11.5px] font-semibold text-slate-800 truncate">
                            {slice.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 pl-4 font-medium tabular-nums">
                          {formatTyg(slice.amount)} Tỷ ({Math.round(slice.percentage)}%)
                        </div>
                      </div>
                    ))}
                    {donutSlices.length === 0 && (
                      <div className="text-slate-400 text-xs italic">Chưa có dữ liệu</div>
                    )}
                  </div>
                </div>
              </div>`;
content = content.replace(legendRenderRegex, dynamicLegendRender);

fs.writeFileSync('reconstructed-clean.tsx', content);
console.log('Successfully updated reconstructed-clean.tsx with dynamic API values');
