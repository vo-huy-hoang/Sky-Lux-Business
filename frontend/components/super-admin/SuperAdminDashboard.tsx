'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ApartmentOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  BarChartOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CustomerServiceOutlined,
  FileTextOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import styles from './super-admin.module.css';

const revenue = [
  62, 75, 84, 91, 88, 104, 96, 112, 119, 132, 125, 140, 151, 143, 159,
  166, 153, 173, 181, 192, 169, 157, 205, 181, 194, 213, 228, 212, 201, 236,
];

const businesses = [
  { name: 'An Phú Travel', plan: 'Growth', status: 'Hoạt động', tone: 'active', date: '28/10/2026' },
  { name: 'Mây Việt Tour', plan: 'Starter', status: 'Dùng thử', tone: 'trial', date: '27/10/2026' },
  { name: 'Hạ Long Discovery', plan: 'Enterprise', status: 'Quá hạn', tone: 'overdue', date: '26/10/2026' },
];

const metrics = [
  { label: 'Tổng doanh nghiệp', value: '128', change: '+12%', caption: 'so với 30 ngày trước', icon: <ApartmentOutlined />, tone: 'blue' },
  { label: 'Đang hoạt động', value: '96', change: '+8%', caption: 'so với 30 ngày trước', icon: <TeamOutlined />, tone: 'green' },
  { label: 'Đang dùng thử', value: '18', change: '+20%', caption: 'so với 30 ngày trước', icon: <ClockCircleOutlined />, tone: 'amber' },
  { label: 'Doanh thu định kỳ', value: '1.284.000.000 ₫', change: '+15%', caption: 'so với 30 ngày trước', icon: <BarChartOutlined />, tone: 'blue' },
];

export function SuperAdminDashboard() {
  const router = useRouter();
  const [period, setPeriod] = useState('30 ngày gần nhất');
  const [organization, setOrganization] = useState('Tất cả doanh nghiệp');
  const chartBars = useMemo(() => revenue.map((height, index) => ({ height, trial: height * (index % 4 === 0 ? 0.15 : 0.07) })), []);

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardIntro}>
        <div>
          <div className={styles.previewLabel}><span /> Bản xem trước · Dữ liệu minh họa</div>
          <h2>Tổng quan</h2>
          <p>Theo dõi hoạt động nền tảng và tình hình các doanh nghiệp trên SkyLux CRM</p>
        </div>
        <div className={styles.filters}>
          <label className={styles.selectWrap}>
            <CalendarOutlined />
            <span className={styles.visuallyHidden}>Khoảng thời gian</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option>30 ngày gần nhất</option><option>7 ngày gần nhất</option><option>90 ngày gần nhất</option>
            </select>
          </label>
          <label className={styles.selectWrap}>
            <ApartmentOutlined />
            <span className={styles.visuallyHidden}>Doanh nghiệp</span>
            <select value={organization} onChange={(event) => setOrganization(event.target.value)}>
              <option>Tất cả doanh nghiệp</option><option>Doanh nghiệp đang hoạt động</option><option>Doanh nghiệp dùng thử</option>
            </select>
          </label>
        </div>
      </div>

      <section className={styles.metricGrid} aria-label="Chỉ số nền tảng">
        {metrics.map((metric) => (
          <article className={styles.metricCard} key={metric.label}>
            <span className={`${styles.metricIcon} ${styles[`tone_${metric.tone}`]}`}>{metric.icon}</span>
            <div className={styles.metricBody}>
              <div className={styles.metricLabel}>{metric.label}</div>
              <div className={`${styles.metricValue} ${metric.value.length > 14 ? styles.metricValueCompact : ''}`}>{metric.value}</div>
              <div className={styles.metricTrend}><span><ArrowUpOutlined /> {metric.change}</span>{metric.caption}</div>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.analyticsGrid} aria-label="Phân tích hoạt động">
        <article className={styles.panel}>
          <div className={styles.panelHeading}>
            <h3>Doanh thu nền tảng</h3>
            <div className={styles.legend}><span><i className={styles.legendRecurring} /> Doanh thu định kỳ</span><span><i className={styles.legendTrial} /> Doanh thu dùng thử</span></div>
          </div>
          <div className={styles.chart} role="img" aria-label={`Biểu đồ doanh thu trong ${period}, gồm doanh thu định kỳ và dùng thử`}>
            <div className={styles.chartYAxis}><span>250M</span><span>200M</span><span>150M</span><span>100M</span><span>50M</span><span>0</span></div>
            <div className={styles.chartPlot}>
              <div className={styles.chartGridLines}><i /><i /><i /><i /><i /><i /></div>
              <div className={styles.bars}>{chartBars.map((bar, index) => {
                const totalHeight = bar.height / 250 * 100;
                const trialHeight = bar.trial / 250 * 100;
                return (
                <div key={index} className={styles.barGroup} title={`Ngày ${index + 1}: ${bar.height} triệu đồng`}>
                  <span className={styles.barTrial} style={{ height: `${trialHeight}%`, bottom: `${totalHeight - trialHeight}%` }} />
                  <span className={styles.barRecurring} style={{ height: `${totalHeight - trialHeight}%` }} />
                </div>
              );})}</div>
              <div className={styles.chartXAxis}><span>29/09</span><span>04/10</span><span>09/10</span><span>14/10</span><span>19/10</span><span>24/10</span><span>28/10</span></div>
            </div>
            <div className={styles.chartAxisTitle}>Doanh thu (VND)</div>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeading}><h3>Phân bổ trạng thái doanh nghiệp</h3></div>
          <div className={styles.donutContent}>
            <div className={styles.donut} role="img" aria-label="96 doanh nghiệp hoạt động, 18 đang dùng thử, 14 quá hạn">
              <div><strong>128</strong><span>Tổng cộng</span></div>
            </div>
            <div className={styles.donutLegend}>
              <div><i className={styles.statusActive} /><span>Hoạt động</span><strong>96 <small>(75%)</small></strong></div>
              <div><i className={styles.statusTrial} /><span>Dùng thử</span><strong>18 <small>(14%)</small></strong></div>
              <div><i className={styles.statusOverdue} /><span>Quá hạn</span><strong>14 <small>(11%)</small></strong></div>
            </div>
          </div>
        </article>
      </section>

      <section className={`${styles.panel} ${styles.attentionPanel}`}>
        <div className={styles.panelHeading}><h3>Cần xử lý</h3><span className={styles.attentionHint}>3 mục đang chờ</span></div>
        <div className={styles.attentionGrid}>
          <button onClick={() => router.push('/revenue')} className={`${styles.attentionCard} ${styles.attentionDanger}`}><span className={styles.attentionIcon}><FileTextOutlined /></span><span><strong>3</strong><small>hóa đơn quá hạn</small></span><ArrowRightOutlined className={styles.attentionArrow} /></button>
          <button onClick={() => router.push('/users')} className={`${styles.attentionCard} ${styles.attentionWarning}`}><span className={styles.attentionIcon}><ClockCircleOutlined /></span><span><strong>2</strong><small>dùng thử sắp hết hạn</small></span><ArrowRightOutlined className={styles.attentionArrow} /></button>
          <button onClick={() => router.push('/messages')} className={`${styles.attentionCard} ${styles.attentionSuccess}`}><span className={styles.attentionIcon}><CustomerServiceOutlined /></span><span><strong>4</strong><small>yêu cầu hỗ trợ mới</small></span><ArrowRightOutlined className={styles.attentionArrow} /></button>
        </div>
      </section>

      <section className={`${styles.panel} ${styles.businessPanel}`}>
        <div className={styles.panelHeading}>
          <h3>Doanh nghiệp mới</h3>
          <button className={styles.viewAll} onClick={() => router.push('/organizations')}>Xem tất cả <ArrowRightOutlined /></button>
        </div>
        <div className={styles.tableScroller}>
          <table className={styles.businessTable}>
            <thead><tr><th>Tên doanh nghiệp</th><th>Gói dịch vụ</th><th>Trạng thái</th><th>Ngày tạo</th></tr></thead>
            <tbody>{businesses.map((business) => (
              <tr key={business.name}>
                <td><strong>{business.name}</strong></td><td>{business.plan}</td>
                <td><span className={`${styles.statusPill} ${styles[`status_${business.tone}`]}`}><i />{business.status}</span></td>
                <td>{business.date}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

