import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const TONE_COLORS = {
  green: {
    background: 'rgba(81, 169, 122, 0.82)',
    border: '#3d9f72',
  },
  blue: {
    background: 'rgba(91, 126, 227, 0.82)',
    border: '#4f72d6',
  },
  amber: {
    background: 'rgba(210, 156, 59, 0.82)',
    border: '#c79a3f',
  },
  red: {
    background: 'rgba(212, 99, 95, 0.82)',
    border: '#d15f5b',
  },
  slate: {
    background: 'rgba(127, 138, 163, 0.82)',
    border: '#6a768e',
  },
};

export default function StatBarChart({ items, ariaLabel, yMax }) {
  const data = {
    labels: items.map((item) => item.label),
    datasets: [
      {
        data: items.map((item) => item.value),
        backgroundColor: items.map((item) => (TONE_COLORS[item.tone] || TONE_COLORS.blue).background),
        borderColor: items.map((item) => (TONE_COLORS[item.tone] || TONE_COLORS.blue).border),
        borderWidth: 1,
        borderRadius: 14,
        borderSkipped: false,
        maxBarThickness: 46,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 450,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(18, 27, 66, 0.96)',
        displayColors: false,
        padding: 12,
        callbacks: {
          title: (context) => context[0]?.label || '',
          label: (context) => {
            const item = items[context.dataIndex];
            return item?.valueLabel || String(context.parsed.y);
          },
          afterLabel: (context) => items[context.dataIndex]?.helper || '',
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#6f7d98',
          font: {
            size: 11,
            weight: '700',
          },
        },
      },
      y: {
        beginAtZero: true,
        max: yMax,
        ticks: {
          color: '#8a96ab',
          font: {
            size: 11,
          },
          padding: 8,
          stepSize: yMax === 100 ? 20 : undefined,
        },
        grid: {
          color: 'rgba(114, 131, 168, 0.12)',
        },
        border: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="bar-chart" role="img" aria-label={ariaLabel}>
      <div className="bar-chart-canvas">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
