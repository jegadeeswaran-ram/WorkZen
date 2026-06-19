'use client';

import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import type { ApexOptions } from 'apexcharts';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface DonutChartProps {
  series: number[];
  labels: string[];
  colors?: string[];
  height?: number;
}

export function DonutChart({
  series,
  labels,
  colors = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e'],
  height = 200,
}: DonutChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const legendColor  = isDark ? 'rgba(255,255,255,0.5)' : '#64748b';
  const totalColor   = isDark ? 'rgba(255,255,255,0.4)' : '#64748b';
  const totalValColor = isDark ? '#fff' : '#0f172a';

  const options: ApexOptions = {
    chart: {
      type: 'donut',
      background: 'transparent',
      animations: { enabled: true, speed: 600 },
    },
    colors,
    labels,
    legend: {
      show: true,
      position: 'bottom',
      labels: { colors: legendColor },
      fontSize: '12px',
    },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              color: totalColor,
              style: { fontFamily: 'DM Sans', color: totalValColor },
              formatter: (w) =>
                w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toLocaleString('en-IN'),
            },
            value: {
              color: totalValColor,
              fontFamily: 'Plus Jakarta Sans',
              fontWeight: '700',
            },
          },
        },
      },
    },
    stroke: { width: 0 },
    tooltip: { theme: isDark ? 'dark' : 'light' },
  };

  return <ReactApexChart options={options} series={series} type="donut" height={height} />;
}
