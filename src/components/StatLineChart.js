import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

function formatMetricValue(value, metric) {
  if (metric === 'fuel_cost') {
    return `PHP ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }

  if (metric === 'fuel_liters') {
    return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} L`;
  }

  return Number(value || 0).toLocaleString();
}

export default function StatLineChart({ items, ariaLabel, metric = 'request_count' }) {
  const data = {
    labels: items.map((item) => item.label),
    datasets: [
      {
        label: 'Trend',
        data: items.map((item) => item.value),
        borderColor: '#4f72d6',
        backgroundColor: 'rgba(79, 114, 214, 0.14)',
        pointBackgroundColor: '#23348f',
        pointBorderColor: '#ffffff',
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2.2,
        tension: 0.34,
        fill: true,
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
          label: (context) => formatMetricValue(context.parsed.y, metric),
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
          maxRotation: 0,
          font: {
            size: 11,
            weight: '700',
          },
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#8a96ab',
          font: {
            size: 11,
          },
          padding: 8,
          callback: (value) => {
            if (metric === 'fuel_cost') {
              return `PHP ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
            }

            if (metric === 'fuel_liters') {
              return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}L`;
            }

            return Number(value).toLocaleString();
          },
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
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
