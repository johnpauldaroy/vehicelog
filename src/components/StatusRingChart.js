import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const TONE_COLORS = {
  green: '#51a97a',
  blue: '#5b7ee3',
  amber: '#d29c3b',
  red: '#d4635f',
  slate: '#7f8aa3',
};

export default function StatusRingChart({ items, ariaLabel, centerLabel = 'items' }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const data = {
    labels: items.map((item) => item.label),
    datasets: [
      {
        data: items.map((item) => item.value),
        backgroundColor: items.map((item) => TONE_COLORS[item.tone] || TONE_COLORS.blue),
        borderColor: '#f7f9ff',
        borderWidth: 4,
        hoverOffset: 6,
      },
    ],
  };

  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
      const { ctx, chartArea } = chart;

      if (!chartArea) {
        return;
      }

      const centerX = (chartArea.left + chartArea.right) / 2;
      const centerY = (chartArea.top + chartArea.bottom) / 2;

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#18264d';
      ctx.font = '700 30px "Sora", sans-serif';
      ctx.fillText(String(total), centerX, centerY - 10);
      ctx.fillStyle = '#7a879e';
      ctx.font = '500 12px "Sora", sans-serif';
      ctx.fillText(centerLabel, centerX, centerY + 18);
      ctx.restore();
    },
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    animation: {
      duration: 500,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(18, 27, 66, 0.96)',
        displayColors: true,
        boxWidth: 10,
        padding: 12,
        callbacks: {
          label: (context) => {
            const item = items[context.dataIndex];
            return `${item.label}: ${item.value}`;
          },
          afterLabel: (context) => items[context.dataIndex]?.helper || '',
        },
      },
    },
  };

  return (
    <div className="ring-chart" role="img" aria-label={ariaLabel}>
      <div className="ring-chart-visual">
        <Doughnut data={data} options={options} plugins={[centerTextPlugin]} />
      </div>
    </div>
  );
}
