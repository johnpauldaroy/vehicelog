import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import AppIcon from './AppIcon';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, DoughnutController, Tooltip, Legend);

function getPressureLabel(value) {
  if (value >= 80) return 'High';
  if (value >= 60) return 'Elevated';
  if (value >= 35) return 'Steady';
  return 'Light';
}

function toneToColor(tone) {
  if (tone === 'red') return '#bf5653';
  if (tone === 'amber') return '#bd8420';
  if (tone === 'green') return '#3d9f72';
  if (tone === 'slate') return '#6a768e';
  return '#4f72d6';
}

export default function BranchUtilizationBoard({ items, ariaLabel, sortMode = 'value_desc' }) {
  const valueRankedItems = [...items].sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
  const displayItems = sortMode === 'input' ? [...items] : valueRankedItems;
  const barCanvasHeight = Math.max(260, displayItems.length * 36);

  if (!displayItems.length) {
    return <div className="empty-state-panel">No branch utilization data is available for the current filters.</div>;
  }

  const leadBranch = valueRankedItems[0];
  const averageUtilization = Math.round(
    valueRankedItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0) / valueRankedItems.length
  );

  const barData = {
    labels: displayItems.map((item) => item.label),
    datasets: [
      {
        label: 'Utilization',
        data: displayItems.map((item) => Math.max(0, Number(item.value) || 0)),
        borderRadius: 999,
        borderSkipped: false,
        borderWidth: 0,
        backgroundColor: displayItems.map((item) => toneToColor(item.tone || 'blue')),
        maxBarThickness: 24,
      },
    ],
  };

  const barOptions = {
    indexAxis: 'y',
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
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context) => `${context.label}: ${Number(context.parsed.x || 0).toFixed(1)}%`,
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 100,
        ticks: {
          color: '#7a879f',
          callback: (value) => `${value}%`,
          font: {
            size: 11,
          },
        },
        grid: {
          color: 'rgba(114, 131, 168, 0.12)',
        },
        border: {
          display: false,
        },
      },
      y: {
        ticks: {
          autoSkip: false,
          color: '#3b4a6b',
          font: {
            size: 12,
            weight: '700',
          },
        },
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
      },
    },
  };

  const pressureCounts = valueRankedItems.reduce(
    (accumulator, item) => {
      const label = getPressureLabel(item.value);
      accumulator[label] += 1;
      return accumulator;
    },
    { High: 0, Elevated: 0, Steady: 0, Light: 0 }
  );

  const pressureEntries = [
    { label: 'High', value: pressureCounts.High, color: '#bf5653' },
    { label: 'Elevated', value: pressureCounts.Elevated, color: '#bd8420' },
    { label: 'Steady', value: pressureCounts.Steady, color: '#4f72d6' },
    { label: 'Light', value: pressureCounts.Light, color: '#6a768e' },
  ].filter((entry) => entry.value > 0);

  const ringData = {
    labels: pressureEntries.map((entry) => entry.label),
    datasets: [
      {
        data: pressureEntries.map((entry) => entry.value),
        backgroundColor: pressureEntries.map((entry) => entry.color),
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 4,
      },
    ],
  };

  const ringOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '66%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(18, 27, 66, 0.96)',
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context) => `${context.label}: ${context.parsed} branch${context.parsed === 1 ? '' : 'es'}`,
        },
      },
    },
  };

  return (
    <div className="utilization-board" role="img" aria-label={ariaLabel}>
      <div className="utilization-hero">
        <div className="utilization-hero-copy">
          <span className="utilization-hero-icon">
            <AppIcon name="vehicles" />
          </span>
          <div>
            <span className="utilization-kicker">Peak branch load</span>
            <strong>{leadBranch.label}</strong>
            <p>{getPressureLabel(leadBranch.value)} capacity pressure across the selected scope.</p>
          </div>
        </div>
        <div className={`utilization-hero-value utilization-hero-value-${leadBranch.tone || 'blue'}`}>
          <span>{leadBranch.valueLabel || `${leadBranch.value}%`}</span>
          <small>Avg {averageUtilization}%</small>
        </div>
      </div>

      <div className="utilization-chart-grid">
        <article className="utilization-chart-card">
          <div className="utilization-chart-head">
            <h5>Branch load ranking</h5>
            <p>Utilization percentage by branch.</p>
          </div>
          <div className="utilization-chart-canvas" style={{ height: `${barCanvasHeight}px` }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </article>

        <article className="utilization-chart-card">
          <div className="utilization-chart-head">
            <h5>Pressure distribution</h5>
            <p>How branches are grouped by load pressure.</p>
          </div>
          <div className="utilization-ring-canvas">
            <Doughnut data={ringData} options={ringOptions} />
          </div>
          <div className="utilization-pressure-legend">
            {pressureEntries.map((entry) => (
              <div key={entry.label} className="utilization-pressure-item">
                <span className="utilization-pressure-dot" style={{ backgroundColor: entry.color }} />
                <span>{entry.label}</span>
                <strong>{entry.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
