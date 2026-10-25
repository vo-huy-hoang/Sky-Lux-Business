import { formatCurrency } from '@/lib/financial-calculations';
import { REVENUE_BREAKDOWN_COLORS } from '@/components/ceo/revenue-breakdown.constants';

export interface RevenueDonutItem {
  name: string;
  amount: number | string;
}

export interface RevenueDonutSlice {
  name: string;
  amount: number;
  percentage: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  color: string;
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeDonutSlice(
  centerX: number,
  centerY: number,
  radius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const adjustedEndAngle = endAngle - startAngle >= 360
    ? startAngle + 359.999
    : endAngle;
  const start = polarToCartesian(centerX, centerY, radius, adjustedEndAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, adjustedEndAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  const largeArcFlag = adjustedEndAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'L', innerEnd.x, innerEnd.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
    'Z',
  ].join(' ');
}

export function getRevenueDonutSlices(items: RevenueDonutItem[]): RevenueDonutSlice[] {
  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return items.reduce<RevenueDonutSlice[]>((slices, item, index) => {
    const currentAngle = slices.at(-1)?.endAngle || 0;
    const amount = Number(item.amount || 0);
    const percentage = total > 0 ? (amount / total) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    return [
      ...slices,
      {
        name: item.name,
        amount,
        percentage,
        startAngle,
        endAngle,
        midAngle: startAngle + angle / 2,
        color: REVENUE_BREAKDOWN_COLORS[index % REVENUE_BREAKDOWN_COLORS.length],
      },
    ];
  }, []);
}

interface RevenueDonutChartProps {
  items: RevenueDonutItem[];
  total: number;
  totalDisplay?: string;
  ariaLabel?: string;
  className?: string;
}

export function RevenueDonutChart({
  items,
  total,
  totalDisplay = formatCurrency(Math.round(total / 1_000_000), { showSymbol: false }),
  ariaLabel = 'Biểu đồ cơ cấu doanh thu',
  className = 'w-[180px] h-[180px]',
}: RevenueDonutChartProps) {
  const slices = getRevenueDonutSlices(items);

  return (
    <div className={`relative shrink-0 ${className}`} role="img" aria-label={ariaLabel}>
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
        <text x="50" y="46" textAnchor="middle" fill="#64748B" fontSize="4.5" fontWeight="500">
          Tổng doanh thu
        </text>
        <text x="50" y="55" textAnchor="middle" fill="#0F172A" fontSize="6.5" fontWeight="bold">
          {totalDisplay} Tr
        </text>
        {slices.map((slice) => {
          const labelPosition = polarToCartesian(50, 50, 37.5, slice.midAngle);

          return (
            <g key={`${slice.name}-${slice.startAngle}`}>
              <path
                d={describeDonutSlice(50, 50, 48, 27, slice.startAngle, slice.endAngle)}
                fill={slice.color}
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              {slice.percentage > 4 && (
                <text
                  x={labelPosition.x}
                  y={labelPosition.y}
                  fill="#FFFFFF"
                  fontSize={slice.percentage > 10 ? '6' : '4.5'}
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {Math.round(slice.percentage)}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
