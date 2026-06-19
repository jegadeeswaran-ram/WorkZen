'use client';

import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import type { ApexOptions } from 'apexcharts';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface BarChartProps {
  series: { name: string; data: number[] }[];
  categories: string[];
  colors?: string[];
  height?: number;
  horizontal?: boolean;
  yFormatter?: (v: number) => string;
}

export function BarChart({
  series,
  categories,
  colors = ['#6366f1', '#10b981'],
  height = 220,
  horizontal = false,
  yFormatter,
}: BarChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const axisLabelColor  = isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8';
  const gridColor       = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const legendColor     = isDark ? 'rgba(255,255,255,0.5)'  : '#64748b';

  const options: ApexOptions = {
    chart: {
      type: 'bar',
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: true, speed: 600 },
    },
    colors,
    plotOptions: {
      bar: {
        horizontal,
        borderRadius: 6,
        columnWidth: '55%',
        distributed: false,
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      labels: { style: { colors: axisLabelColor, fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: axisLabelColor, fontSize: '11px' },
        formatter: yFormatter ?? ((v) => v.toLocaleString('en-IN')),
      },
    },
    grid: { borderColor: gridColor, strokeDashArray: 4 },
    legend: { labels: { colors: legendColor }, fontSize: '12px' },
    tooltip: { theme: isDark ? 'dark' : 'light' },
  };

  return <ReactApexChart options={options} series={series} type="bar" height={height} />;
}
