import {
  useEffect,
  useState,
} from 'react';

import type {
  Device,
  ModbusRegisterMap,
} from '../types/device';

import { API_URL } from '../config';

import {
  getToken,
} from '../services/auth.service';

interface DeviceFormProps {
  device?: Device;

  onCancel: () => void;

  onSaved: () => void;
}

const DEFAULT_REGISTER_MAP:
  ModbusRegisterMap = {
    productionCount: {
      address: 30001,
      functionCode: 4,
      dataType: 'uint32',
      wordOrder: 'ABCD',
      scale: 1,
    },

    motorTemperature: {
      address: 30003,
      functionCode: 4,
      dataType: 'float32',
      wordOrder: 'CDAB',
      scale: 1,
    },

    motorCurrent: {
      address: 30010,
      functionCode: 4,
      dataType: 'int16',
      scale: 0.01,
    },

    scrapCount: {
      address: 30020,
      functionCode: 4,
      dataType: 'uint16',
      scale: 1,
    },

    status: {
      address: 40001,
      functionCode: 3,
      dataType: 'uint16',
      scale: 1,
    },
  };

export function DeviceForm({
  device,
  onCancel,
  onSaved,
}: DeviceFormProps) {
  const [name, setName] =
    useState('');

  const [protocol, setProtocol] =
    useState<
      'modbus' | 'mqtt'
    >('modbus');

  const [host, setHost] =
    useState('');

  const [port, setPort] =
    useState(5020);

  const [unitId, setUnitId] =
    useState(1);

  const [topic, setTopic] =
    useState(
      'factory/line2/telemetry',
    );

  const [
    registerMap,
    setRegisterMap,
  ] = useState<ModbusRegisterMap>(
    DEFAULT_REGISTER_MAP,
  );

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (!device) {
      return;
    }

    setName(device.name);
    setProtocol(device.protocol);
    setHost(device.host);
    setPort(device.port);
    setUnitId(
      device.unitId ?? 1,
    );
    setTopic(
      device.topic ?? '',
    );

    setRegisterMap(
      device.registerMap ??
        DEFAULT_REGISTER_MAP,
    );
  }, [device]);

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setError('');

    try {
      const body =
        protocol === 'modbus'
          ? {
              name,
              protocol,
              host,
              port,
              unitId,
              registerMap,
            }
          : {
              name,
              protocol,
              host,
              port,
              topic,
            };

      const url = device
        ? `${API_URL}/devices/${device.id}`
        : `${API_URL}/devices`;

      const response =
        await fetch(url, {
          method: device
            ? 'PATCH'
            : 'POST',

headers: {
  'Content-Type':
    'application/json',

  Authorization:
    `Bearer ${getToken()}`,
},

          body:
            JSON.stringify(body),
        });

      if (!response.ok) {
        const responseBody =
          await response.text();

        throw new Error(
          responseBody ||
            `Request failed: ${response.status}`,
        );
      }

      onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Device could not be saved',
      );
    } finally {
      setSaving(false);
    }
  }

  function updateRegister(
    key:
      keyof ModbusRegisterMap,

    field: string,

    value: string | number,
  ) {
    setRegisterMap(
      previous => ({
        ...previous,

        [key]: {
          ...previous[key],
          [field]: value,
        },
      }),
    );
  }

  return (
    <form
      className="device-form"
      onSubmit={handleSubmit}
    >
      <div className="form-header">
        <div>
          <h3>
            {device
              ? 'Edit Device'
              : 'Add Device'}
          </h3>

          <p>
            Configure the factory
            data source.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      <div className="form-grid">
        <label>
          Device Name

          <input
            value={name}
            required
            onChange={event =>
              setName(
                event.target.value,
              )
            }
          />
        </label>

        <label>
          Protocol

          <select
            value={protocol}
            onChange={event =>
              setProtocol(
                event.target
                  .value as
                  | 'modbus'
                  | 'mqtt',
              )
            }
          >
            <option value="modbus">
              Modbus TCP
            </option>

            <option value="mqtt">
              MQTT
            </option>
          </select>
        </label>

        <label>
          {protocol === 'mqtt'
            ? 'Broker Host'
            : 'Host / IP'}

          <input
            value={host}
            required
            onChange={event =>
              setHost(
                event.target.value,
              )
            }
          />
        </label>

        <label>
          Port

          <input
            type="number"
            value={port}
            required
            onChange={event =>
              setPort(
                Number(
                  event.target.value,
                ),
              )
            }
          />
        </label>
      </div>

      {protocol === 'mqtt' && (
        <div className="protocol-settings">
          <h4>
            MQTT Configuration
          </h4>

          <label>
            Topic

            <input
              value={topic}
              required
              onChange={event =>
                setTopic(
                  event.target.value,
                )
              }
            />
          </label>
        </div>
      )}

      {protocol === 'modbus' && (
        <div className="protocol-settings">
          <h4>
            Modbus Configuration
          </h4>

          <label>
            Unit ID

            <input
              type="number"
              value={unitId}
              required
              onChange={event =>
                setUnitId(
                  Number(
                    event.target.value,
                  ),
                )
              }
            />
          </label>

          <h4>
            Register Map
          </h4>

          <div className="register-table">
            <div className="register-row register-header">
              <span>
                Signal
              </span>
              <span>
                Address
              </span>
              <span>
                FC
              </span>
              <span>
                Type
              </span>
              <span>
                Order
              </span>
              <span>
                Scale
              </span>
            </div>

            {(
              Object.keys(
                registerMap,
              ) as Array<
                keyof ModbusRegisterMap
              >
            ).map(key => {
              const config =
                registerMap[key];

              return (
                <div
                  className="register-row"
                  key={key}
                >
                  <strong>
                    {key}
                  </strong>

                  <input
                    type="number"
                    value={
                      config.address
                    }
                    onChange={event =>
                      updateRegister(
                        key,
                        'address',
                        Number(
                          event.target
                            .value,
                        ),
                      )
                    }
                  />

                  <select
                    value={
                      config.functionCode
                    }
                    onChange={event =>
                      updateRegister(
                        key,
                        'functionCode',
                        Number(
                          event.target
                            .value,
                        ),
                      )
                    }
                  >
                    <option value={3}>
                      03
                    </option>

                    <option value={4}>
                      04
                    </option>
                  </select>

                  <select
                    value={
                      config.dataType
                    }
                    onChange={event =>
                      updateRegister(
                        key,
                        'dataType',
                        event.target
                          .value,
                      )
                    }
                  >
                    <option value="uint16">
                      uint16
                    </option>

                    <option value="int16">
                      int16
                    </option>

                    <option value="uint32">
                      uint32
                    </option>

                    <option value="float32">
                      float32
                    </option>
                  </select>

                  <select
                    value={
                      config.wordOrder ??
                      'ABCD'
                    }
                    onChange={event =>
                      updateRegister(
                        key,
                        'wordOrder',
                        event.target
                          .value,
                      )
                    }
                  >
                    <option value="ABCD">
                      ABCD
                    </option>

                    <option value="CDAB">
                      CDAB
                    </option>
                  </select>

                  <input
                    type="number"
                    step="any"
                    value={
                      config.scale
                    }
                    onChange={event =>
                      updateRegister(
                        key,
                        'scale',
                        Number(
                          event.target
                            .value,
                        ),
                      )
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>

        <button
          className="primary-button"
          type="submit"
          disabled={saving}
        >
          {saving
            ? 'Saving...'
            : device
              ? 'Update Device'
              : 'Create Device'}
        </button>
      </div>
    </form>
  );
}