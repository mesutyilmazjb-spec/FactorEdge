import { Login } from './components/Login';

import {
  getStoredUser,
  getToken,
  logout,
} from './services/auth.service';

import type {
  AuthUser,
} from './types/auth';

import {
  useEffect,
  useState,
} from 'react';

import { socket } from './services/socket';

import {
  DeviceForm,
} from './components/DeviceForm';

import type {
  TelemetryData,
  DeviceStatusEvent,
} from './types/telemetry';

import type {
  Device,
} from './types/device';

import {
  TelemetryChart,
} from './components/TelemetryChart';

import './App.css';

import { API_URL } from './config';

type Page =
  | 'dashboard'
  | 'devices';

function App() {
  const [page, setPage] =
    useState<Page>('dashboard');

  const [
  user,
  setUser,
] = useState<AuthUser | null>(
  () => getStoredUser(),
);

  const [devices, setDevices] =
    useState<Device[]>([]);

  const [
    historyByDevice,
    setHistoryByDevice,
  ] = useState<
    Record<string, TelemetryData[]>
  >({});

  const [
    telemetryByDevice,
    setTelemetryByDevice,
  ] = useState<
    Record<string, TelemetryData>
  >({});

  const [
    socketConnected,
    setSocketConnected,
  ] = useState(false);

  useEffect(() => {

    if (!user) {
  return;
}
    void loadDevices();

    socket.connect();

    const handleConnect = () => {
      console.log(
        'Socket.IO connected',
      );

      setSocketConnected(true);
    };

    const handleDisconnect = () => {
      console.log(
        'Socket.IO disconnected',
      );

      setSocketConnected(false);
    };

   const handleTelemetry = (
  telemetry: TelemetryData,
) => {
  /*
   * Dashboard'daki son telemetry.
   */
  setTelemetryByDevice(
    previous => ({
      ...previous,
      [telemetry.deviceId]:
        telemetry,
    }),
  );

  /*
   * Device Management ekranındaki
   * Last Data bilgisini canlı güncelle.
   */
  setDevices(previous =>
    previous.map(device =>
      device.id ===
      telemetry.deviceId
        ? {
            ...device,
            lastDataAt:
              telemetry.timestamp,
          }
        : device,
    ),
  );

  /*
   * Son 1 saatlik chart datası.
   */
  setHistoryByDevice(
    previous => {
      const current =
        previous[
          telemetry.deviceId
        ] ?? [];

      const oneHourAgo =
        Date.now() -
        60 * 60 * 1000;

      const updated = [
        ...current,
        telemetry,
      ].filter(
        item =>
          new Date(
            item.timestamp,
          ).getTime() >=
          oneHourAgo,
      );

      return {
        ...previous,
        [telemetry.deviceId]:
          updated,
      };
    },
  );
};

    const handleDeviceStatus = (
      event: DeviceStatusEvent,
    ) => {
      setDevices(previous =>
        previous.map(device =>
          device.id ===
          event.deviceId
            ? {
                ...device,

                connectionStatus:
                  event.status,
              }
            : device,
        ),
      );
    };

    socket.on(
      'connect',
      handleConnect,
    );

    socket.on(
      'disconnect',
      handleDisconnect,
    );

    socket.on(
      'telemetry',
      handleTelemetry,
    );

    socket.on(
      'device-status',
      handleDeviceStatus,
    );

    return () => {
      socket.off(
        'connect',
        handleConnect,
      );

      socket.off(
        'disconnect',
        handleDisconnect,
      );

      socket.off(
        'telemetry',
        handleTelemetry,
      );

      socket.off(
        'device-status',
        handleDeviceStatus,
      );

      socket.disconnect();
    };
  }, [user]);

  async function loadDevices() {
    try {
      const token = getToken();

const response =
  await fetch(
    `${API_URL}/devices`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    },
  );

      if (!response.ok) {
        throw new Error(
          'Devices could not be loaded',
        );
      }

      const data =
        (await response.json()) as Device[];

      setDevices(data);

      await Promise.all(
        data.map(device =>
          loadHistory(device.id),
        ),
      );
    } catch (error) {
      console.error(
        'Device load error:',
        error,
      );
    }
  }

  async function loadHistory(
    deviceId: string,
  ) {
    try {
     const token = getToken();

const response =
  await fetch(
    `${API_URL}/telemetry/${deviceId}/history`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    },
  );
      if (!response.ok) {
        throw new Error(
          `History request failed: ${response.status}`,
        );
      }

      const data =
        (await response.json()) as TelemetryData[];

      setHistoryByDevice(
        previous => ({
          ...previous,

          [deviceId]:
            data,
        }),
      );
    } catch (error) {
      console.error(
        `Could not load history for ${deviceId}`,
        error,
      );
    }
  }

  if (!user) {
  return (
    <Login
      onLogin={loggedInUser => {
        setUser(loggedInUser);
      }}
    />
  );
}

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>
            FactorEdge
          </h1>

          <p>
            Smart Factory Platform
          </p>
        </div>

 <div className="header-actions">
  <div className="current-user">
    <strong>
      {user.name}
    </strong>

    <span>
      {user.role.toUpperCase()}
    </span>
  </div>

  <div
    className={
      socketConnected
        ? 'platform-status connected'
        : 'platform-status disconnected'
    }
  >
    {socketConnected
      ? '● Live'
      : '● Offline'}
  </div>

  <button
    className="logout-button"
    onClick={() => {
      logout();

      setUser(null);
      setDevices([]);
      setTelemetryByDevice({});
      setHistoryByDevice({});
      setPage('dashboard');
    }}
  >
    Logout
  </button>
</div>
      </header>

      <nav className="main-navigation">
        <button
          className={
            page === 'dashboard'
              ? 'nav-button active'
              : 'nav-button'
          }
          onClick={() =>
            setPage('dashboard')
          }
        >
          Dashboard
        </button>

       {user.role === 'admin' && (
  <button
    className={
      page === 'devices'
        ? 'nav-button active'
        : 'nav-button'
    }
    onClick={() =>
      setPage('devices')
    }
  >
    Device Management
  </button>
)}
      </nav>

      {page === 'dashboard' ? (
        <Dashboard
          devices={devices}
          telemetryByDevice={
            telemetryByDevice
          }
          historyByDevice={
            historyByDevice
          }
        />
      ) : (
<DeviceManagement
  devices={devices}
  onChanged={loadDevices}
/>
      )}
    </main>
  );
}

interface DashboardProps {
  devices: Device[];

  telemetryByDevice:
    Record<string, TelemetryData>;

  historyByDevice:
    Record<
      string,
      TelemetryData[]
    >;
}

function Dashboard({
  devices,
  telemetryByDevice,
  historyByDevice,
}: DashboardProps) {
  return (
    <section className="device-grid">
      {devices.map(device => {
        const telemetry =
          telemetryByDevice[
            device.id
          ];

        return (
          <article
            className="device-card"
            key={device.id}
          >
            <div className="device-title">
              <div>
                <h2>
                  {device.name}
                </h2>

                <span className="protocol">
                  {device.protocol.toUpperCase()}
                </span>
              </div>

              <span
                className={
                  `device-status ` +
                  device.connectionStatus
                }
              >
                ●{' '}
                {
                  device.connectionStatus
                }
              </span>
            </div>

            {!telemetry ? (
              <p className="waiting">
                Waiting for
                telemetry...
              </p>
            ) : (
              <>
                <div className="metrics">
                  <Metric
                    label="Production"
                    value={
                      telemetry.productionCount
                    }
                  />

                  <Metric
                    label="Temperature"
                    value={`${telemetry.motorTemperature.toFixed(
                      2,
                    )} °C`}
                  />

                  <Metric
                    label="Current"
                    value={`${telemetry.motorCurrent.toFixed(
                      2,
                    )} A`}
                  />

                  <Metric
                    label="Scrap"
                    value={
                      telemetry.scrapCount
                    }
                  />
                </div>

                <div className="machine-status">
                  Machine:{' '}
                  <strong>
                    {getMachineStatus(
                      telemetry.status,
                    )}
                  </strong>
                </div>

                <div className="last-update">
                  Last update:{' '}
                  {new Date(
                    telemetry.timestamp,
                  ).toLocaleTimeString()}
                </div>

                <div className="chart-section">
                  <h3>
                    Last 1 Hour
                  </h3>

                  {historyByDevice[
                    device.id
                  ]?.length ? (
                    <TelemetryChart
                      telemetry={
                        historyByDevice[
                          device.id
                        ]
                      }
                    />
                  ) : (
                    <p>
                      No telemetry
                      history
                    </p>
                  )}
                </div>
              </>
            )}
          </article>
        );
      })}
    </section>
  );
}

function DeviceManagement({
  devices,
  onChanged,
}: {
  devices: Device[];
  onChanged: () => Promise<void>;
}) {
  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editingDevice,
    setEditingDevice,
  ] = useState<Device | undefined>();

  function addDevice() {
    setEditingDevice(undefined);
    setShowForm(true);
  }

  function editDevice(
    device: Device,
  ) {
    setEditingDevice(device);
    setShowForm(true);
  }

  async function deleteDevice(
  device: Device,
) {
  const confirmed =
    window.confirm(
      `Delete "${device.name}"?`,
    );

  if (!confirmed) {
    return;
  }

  try {
    const response =
      await fetch(
        `${API_URL}/devices/${device.id}`,
        {
          method: 'DELETE',
         headers: {
         Authorization:
         `Bearer ${getToken()}`,
  },
        },
      );

    if (!response.ok) {
      throw new Error(
        `Delete failed: ${response.status}`,
      );
    }

    await onChanged();
  } catch (error) {
    console.error(
      'Device delete error:',
      error,
    );

    window.alert(
      'Device could not be deleted.',
    );
  }
}
  async function handleSaved() {
    setShowForm(false);
    setEditingDevice(undefined);

    await onChanged();
  }

  if (showForm) {
    return (
      <DeviceForm
        device={editingDevice}
        onCancel={() => {
          setShowForm(false);
          setEditingDevice(
            undefined,
          );
        }}
        onSaved={() => {
          void handleSaved();
        }}
      />
    );
  }

  return (
    <section>
      <div className="management-header">
        <div>
          <h2>
            Device Management
          </h2>

          <p>
            Configure factory
            data sources.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={addDevice}
        >
          + Add Device
        </button>
      </div>

      <div className="management-list">
        {devices.map(device => (
          <article
            className="management-card"
            key={device.id}
          >
            <div>
              <h3>
                {device.name}
              </h3>

              <span className="protocol">
                {device.protocol.toUpperCase()}
              </span>
            </div>

            <div>
              <strong>
                {device.host}:
                {device.port}
              </strong>

              {device.protocol ===
                'modbus' && (
                <div>
                  Unit ID:{' '}
                  {device.unitId}
                </div>
              )}

              {device.protocol ===
                'mqtt' && (
                <div>
                  Topic:{' '}
                  {device.topic}
                </div>
              )}
            </div>

        <div className="device-connection-info">
  <span
    className={
      `device-status ` +
      device.connectionStatus
    }
  >
    ● {device.connectionStatus}
  </span>

  <div className="last-data">
    Last Data:{' '}
    <strong>
      {device.lastDataAt
        ? new Date(
            device.lastDataAt,
          ).toLocaleString('tr-TR')
        : 'No data received'}
    </strong>
  </div>
</div>

            <div className="device-actions">
              <button
                onClick={() =>
                  editDevice(
                    device,
                  )
                }
              >
                Edit
              </button>
<button
  onClick={() => {
    void deleteDevice(device);
  }}
>
  Delete
</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

interface MetricProps {
  label: string;
  value: string | number;
}

function Metric({
  label,
  value,
}: MetricProps) {
  return (
    <div className="metric">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function getMachineStatus(
  status: number,
): string {
  switch (status) {
    case 0:
      return 'STOPPED';

    case 1:
      return 'RUNNING';

    case 2:
      return 'FAULT';

    default:
      return 'UNKNOWN';
  }
}

export default App;