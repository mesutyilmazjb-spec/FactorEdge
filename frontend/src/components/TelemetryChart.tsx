import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type {
  TelemetryData,
} from '../types/telemetry';

interface TelemetryChartProps {
  telemetry: TelemetryData[];
}

export function TelemetryChart({
  telemetry,
}: TelemetryChartProps) {

  const chartData = telemetry.map(
    item => ({
      time: new Date(
        item.timestamp,
      ).toLocaleTimeString(
        'tr-TR',
        {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        },
      ),

      temperature:
        Number(
          item.motorTemperature,
        ),

      current:
        Number(
          item.motorCurrent,
        ),
    }),
  );

  return (
    <div
      style={{
        width: '100%',
        height: 300,
      }}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <LineChart
          data={chartData}
        >
          <CartesianGrid
            strokeDasharray="3 3"
          />

          <XAxis
            dataKey="time"
          />

          <YAxis />

          <Tooltip />

          <Legend />

          <Line
            type="monotone"
            dataKey="temperature"
            name="Temperature °C"
            dot={false}
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="current"
            name="Current A"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}