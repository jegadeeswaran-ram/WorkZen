'use client';

import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import type { ApexOptions } from 'apexcharts';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface SeriesItem { name: string; data: number[]; color?: string; }

interface AreaChartProps {
  // Single-series mode (legacy)
  data?: number[];
  color?: string;
  label?: string;
  // Multi-series mode
  series?: SeriesItem[];
  categories: string[];
  height?: number;
  yFormatter?: (v: number) => string;
  tooltipFormatter?: (v: number) => string;
}

export function AreaChart({
  data,
  categories,
  color = '#6366f1',
  height = 180,
  label = 'Value',
  series,
  yFormatter,
  tooltipFormatter,
}: AreaChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const axisLabelColor = isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8';
  const gridColor      = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const legendColor    = isDark ? 'rgba(255,255,255,0.5)'  : '#64748b';

  // Resolve series
  const resolvedSeries: { name: string; data: number[] }[] = series
    ? series.map(s => ({ name: s.name, data: s.data }))
    : [{ name: label, data: data ?? [] }];

  const resolvedColors = series
    ? series.map(s => s.color ?? color)
    : [color];

  const options: ApexOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      background: 'transparent',
      animations: { enabled: true, speed: 600 },
    },
    colors: resolvedColors,
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: isDark ? 0.25 : 0.15,
        opacityTo: 0,
        stops: [0, 90, 100],
      },
    },
    xaxis: {
      categories,
      labels: { style: { colors: axisLabelColor, fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: axisLabelColor, fontSize: '11px' },
        formatter: yFormatter ?? ((v) => `${(v / 100000).toFixed(0)}L`),
      },
    },
    grid: { borderColor: gridColor, strokeDashArray: 4 },
    legend: {
      show: resolvedSeries.length > 1,
      labels: { colors: legendColor },
      fontSize: '12px',
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      style: { fontFamily: 'DM Sans' },
      y: { formatter: tooltipFormatter ?? ((v) => `₹${v.toLocaleString('en-IN')}`) },
    },
  };

  return (
    <ReactApexChart
      options={options}
      series={resolvedSeries}
      type="area"
      height={height}
    />
  );
}
