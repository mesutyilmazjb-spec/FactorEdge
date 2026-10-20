

\# FactorEdge – Industrial IoT Monitoring Platform



FactorEdge is a full-stack Industrial IoT (IIoT) monitoring platform built to collect, process, store, and visualize manufacturing telemetry in real time.



The project demonstrates how industrial devices using different communication protocols can be integrated into a unified monitoring architecture.



It includes Modbus TCP and MQTT data acquisition, a NestJS backend, TimescaleDB for time-series storage, Socket.IO for real-time communication, and a React dashboard.



\## 1. Key Features



\- Industrial device management

\- Modbus TCP polling

\- MQTT telemetry ingestion

\- Configurable Modbus register mapping

\- Telemetry decoding and normalization

\- Time-series data persistence

\- Real-time dashboard updates

\- Historical telemetry visualization

\- Device connection status monitoring

\- MQTT stale-data detection

\- Modbus heartbeat monitoring

\- JWT-based authentication

\- Docker-based deployment

\- Industrial device simulators



\## 2. Technology Stack



\### Backend



\- Node.js

\- TypeScript

\- NestJS

\- TypeORM

\- PostgreSQL

\- TimescaleDB

\- Socket.IO

\- modbus-serial

\- mqtt.js

\- JWT Authentication



\### Frontend



\- React

\- TypeScript

\- Vite

\- Socket.IO Client

\- Real-time telemetry charts



\### Infrastructure



\- Docker

\- Docker Compose

\- Eclipse Mosquitto

\- Ubuntu Server

\- Windows

\- VirtualBox



\## 3. System Architecture





&#x20;               INDUSTRIAL DEVICES

&#x20;                      |

&#x20;          +-----------+-----------+

&#x20;          |                       |

&#x20;     Modbus TCP                  MQTT

&#x20;          |                       |

&#x20;  Modbus Simulator         MQTT Simulator

&#x20;     (Ubuntu)                (Ubuntu)

&#x20;          |                       |

&#x20;    Modbus Server          Mosquitto Broker

&#x20;     (Windows)                (Windows)

&#x20;          |                       |

&#x20;    ModbusConnector         MqttConnector

&#x20;          |                       |

&#x20;    PollingService          IngestionService

&#x20;          |                       |

&#x20;    ModbusDecoder                 |

&#x20;          |                       |

&#x20;          +-----------+-----------+

&#x20;                      |

&#x20;               TelemetryService

&#x20;                      |

&#x20;                  TimescaleDB

&#x20;                      |

&#x20;               TelemetryGateway

&#x20;                      |

&#x20;                   Socket.IO

&#x20;                      |

&#x20;                React Dashboard

```



Both protocols ultimately produce a common telemetry structure.



This allows the frontend and persistence layers to operate independently of the original industrial communication protocol.



\## 4. Telemetry Model



Each device produces telemetry containing the following information:



| Field | Description |

|---|---|

| deviceId | Unique device identifier |

| productionCount | Total produced units |

| motorTemperature | Motor temperature |

| motorCurrent | Motor electrical current |

| scrapCount | Rejected production units |

| status | Machine operating status |

| timestamp | Telemetry timestamp |



Supported machine states:



\- RUNNING

\- STOPPED

\- FAULT



Machine operating status and device communication status are separate concepts.



For example, a machine can be STOPPED while its communication connection remains CONNECTED.



\## 5. Modbus TCP Architecture



Modbus TCP uses a request-response communication model.



The backend actively reads registers from the Modbus server.



\### 5.1 Modbus Simulator



The Modbus simulator runs on Ubuntu Server.



It generates simulated industrial production data:



\- Production counter

\- Motor temperature

\- Motor current

\- Scrap counter

\- Machine status



The simulator periodically writes these values to the Modbus TCP server.



\### 5.2 Modbus Register Mapping



The simulator uses the following zero-based register addresses:



| Address | Data | Encoding |

|---|---|---|

| 0–1 | Production count | UInt32, ABCD |

| 2–3 | Motor temperature | Float32, CDAB |

| 9 | Motor current | Value / 100 |

| 19 | Scrap count | UInt16 |

| 20 | Machine status | UInt16 |

| 21 | Heartbeat | UInt16 |



Registers 0–3, 9, and 19 are exposed through the server's input-register map.



Machine status and heartbeat are read from holding registers.



\### 5.3 ModbusConnector



ModbusConnector manages communication with the Modbus TCP server.



Responsibilities include:



\- Opening TCP connections

\- Configuring the Modbus unit ID

\- Reading input registers

\- Reading holding registers

\- Handling communication errors

\- Managing reconnection

\- Reading heartbeat values



The connector isolates protocol-specific communication from business logic.



\### 5.4 ModbusDecoder



ModbusDecoder converts raw register values into application-level telemetry.



Examples:



\- Two 16-bit registers become a 32-bit production counter.

\- Two registers become an IEEE 754 floating-point temperature.

\- Raw motor current is converted using a scale factor.

\- Numeric machine status values are mapped to application states.



Keeping decoding separate from communication improves maintainability and testability.



\### 5.5 PollingService



PollingService periodically retrieves Modbus telemetry.



Typical execution flow:



1\. Retrieve configured devices.

2\. Filter devices using the MODBUS protocol.

3\. Establish or reuse a Modbus connection.

4\. Read the heartbeat register.

5\. Validate telemetry freshness.

6\. Read the configured telemetry registers.

7\. Decode the raw values.

8\. Persist telemetry in TimescaleDB.

9\. Update device connection status.

10\. Publish telemetry through Socket.IO.



The polling interval is approximately one second.



\## 6. Modbus Heartbeat Monitoring



A successful Modbus TCP read does not necessarily mean the original data source is still updating.



For example, if the Modbus simulator stops but the Modbus server remains available, the server may continue returning previously written register values.



Without an additional freshness mechanism, the backend could incorrectly treat stale data as new telemetry.



FactorEdge addresses this using a heartbeat register.



\### Heartbeat Mechanism



The Modbus simulator increments register 21 during its normal update cycle.



Example:



Register 21 = 110

Register 21 = 111

Register 21 = 112

Register 21 = 113





The backend monitors whether this value changes.



If the heartbeat remains unchanged beyond the configured timeout, the device is considered disconnected from its data source.



The configured timeout is approximately 10 seconds.



This prevents indefinitely storing and publishing stale telemetry after the timeout.



When the simulator resumes and the heartbeat changes again, normal telemetry processing can resume.



\## 7. MQTT Architecture



MQTT uses a publish-subscribe communication model.



Unlike Modbus polling, the backend does not periodically request telemetry from the MQTT device.



Instead, devices publish messages to an MQTT broker.



The backend subscribes to configured topics and processes incoming messages.



\### 7.1 MQTT Simulator



The MQTT simulator runs on Ubuntu Server.



It generates telemetry and publishes JSON messages to Eclipse Mosquitto.



Example topic:



```text

factory/line2/telemetry

```



Example message:



```json

{

&#x20; "productionCount": 1250,

&#x20; "motorTemperature": 64.5,

&#x20; "motorCurrent": 11.2,

&#x20; "scrapCount": 18,

&#x20; "status": "RUNNING"

}

```



\### 7.2 MqttConnector



MqttConnector manages MQTT communication.



Responsibilities include:



\- Connecting to the MQTT broker

\- Subscribing to device topics

\- Receiving published messages

\- Mapping topics to configured devices

\- Handling connection events

\- Forwarding messages through callbacks



\### 7.3 IngestionService



IngestionService orchestrates MQTT device telemetry ingestion.



Typical execution flow:



1\. Load configured MQTT devices.

2\. Register MQTT connector callbacks.

3\. Establish MQTT subscriptions.

4\. Receive telemetry messages.

5\. Associate messages with devices.

6\. Validate and normalize telemetry.

7\. Persist telemetry.

8\. Update device connection status.

9\. Publish real-time events.



\### 7.4 MQTT Connection Monitoring



MQTT broker connectivity and device telemetry freshness are not the same thing.



A device may stop publishing while the broker connection remains active.



FactorEdge therefore tracks the latest telemetry timestamp.



If no new telemetry arrives within the configured freshness interval, the device can be marked DISCONNECTED.



This helps detect silent device failures.



\## 8. Database Architecture



FactorEdge uses PostgreSQL with TimescaleDB.



TimescaleDB provides time-series capabilities suitable for industrial telemetry.



\### Device Entity



The Device entity stores:



\- Device identifier

\- Device name

\- Communication protocol

\- Host and port

\- Modbus unit ID

\- MQTT topic

\- Modbus register mapping

\- Connection status

\- Last telemetry timestamp

\- Creation and update timestamps



\### Telemetry Entity



The Telemetry entity stores:



\- Device identifier

\- Production count

\- Motor temperature

\- Motor current

\- Scrap count

\- Machine status

\- Timestamp



Telemetry is stored in a TimescaleDB hypertable.



This structure supports timestamp-based queries and historical monitoring.



\## 9. Real-Time Communication



FactorEdge uses Socket.IO to deliver telemetry to the React dashboard.



```text

Industrial Device

&#x20;      |

Modbus / MQTT

&#x20;      |

NestJS Backend

&#x20;      |

TelemetryService

&#x20;      |

TelemetryGateway

&#x20;      |

&#x20;   Socket.IO

&#x20;      |

React Dashboard

```



When telemetry arrives, the backend persists the data and publishes a real-time event.



The frontend listens for these events and updates its local state.



This avoids repeatedly requesting the latest telemetry through HTTP.



Historical telemetry is loaded separately through the REST API.



\## 10. React Dashboard



The React dashboard provides a unified view of industrial devices.



Implemented capabilities include:



\- Device listing

\- Current telemetry values

\- Machine operating status

\- Device connection status

\- Real-time Socket.IO updates

\- Historical telemetry charts

\- Device management interface



The dashboard distinguishes machine operating status from communication availability.



For example:



```text

Machine Status: RUNNING

Connection Status: CONNECTED

```



Or:



```text

Machine Status: RUNNING (last received)

Connection Status: DISCONNECTED

```



In the second example, the last machine status is historical and does not indicate that fresh telemetry is arriving.



\## 11. REST API



\### Device Management



| Method | Endpoint | Description |

|---|---|---|

| GET | /devices | List devices |

| GET | /devices/:id | Get device details |

| POST | /devices | Create device |

| PATCH | /devices/:id | Update device |

| DELETE | /devices/:id | Delete device |

| GET | /devices/:id/test-connection | Test device connection |



\### Telemetry



| Method | Endpoint | Description |

|---|---|---|

| GET | /telemetry/:deviceId/history | Retrieve historical telemetry |



Authentication and authorization requirements depend on the configured guards and roles.



\## 12. Authentication



The backend includes JWT-based authentication.



JWT tokens allow the backend to identify authenticated clients.



Authentication verifies the identity of a user.



Authorization determines which operations that user may perform.



For example, a role-based access model may distinguish between:



\- ADMIN: device configuration and management

\- VIEWER: read-only monitoring



Role-based access restrictions should be verified against the actual controller guards and API responses before being considered fully validated.



\## 13. Docker Architecture



The project uses Docker Compose to manage its infrastructure and application services.



\### Windows Services



The Windows environment contains:



\- NestJS Backend

\- React Frontend

\- TimescaleDB

\- Mosquitto Broker

\- Modbus TCP Server



\### Ubuntu Services



The Ubuntu virtual machine contains:



\- Modbus Writer Simulator

\- MQTT Simulator



The Ubuntu simulators communicate with the Windows-hosted services through the VirtualBox networking configuration.



\### Windows Startup



From the FactorEdge project root:



```powershell

docker compose up -d --build

```



Check service status:



```powershell

docker compose ps

```



View backend logs:



```powershell

docker logs -f factoredge-backend

```



\### Ubuntu Startup



```bash

cd \~/factoredge

docker compose up -d

```



Check containers:



```bash

docker ps

```



View Modbus simulator logs:



```bash

docker logs -f factoredge-modbus-writer

```



View MQTT simulator logs:



```bash

docker logs -f factoredge-mqtt-simulator

```



\### Important Database Note



TimescaleDB uses persistent Docker storage.



Do not use the following command unless intentionally deleting persistent volumes and their data:



```bash

docker compose down -v

```



\## 14. Local Network Configuration



The development environment uses separate Windows and Ubuntu systems.



Example Ubuntu simulator targets:



| Service | Host | Port |

|---|---|---|

| Modbus TCP Server | 10.0.2.2 | 5021 |

| MQTT Broker | 10.0.2.2 | 1884 |



The IP address `10.0.2.2` is specific to the current VirtualBox NAT development setup.



It should be changed for other deployment environments.



Inside the Windows Docker Compose network, backend services communicate through Docker service names.



For example:



```text

modbus-server:5020

mosquitto:1883

```



These addresses should not be confused with the host ports exposed to the Ubuntu virtual machine.



\## 15. Reliability and Error Handling



FactorEdge includes several reliability mechanisms.



\### Modbus



\- TCP connection handling

\- Connection timeout

\- Reconnection attempts

\- Heartbeat-based freshness detection

\- Communication status updates



\### MQTT



\- Broker connection handling

\- Topic subscriptions

\- Device connection callbacks

\- Last-telemetry freshness monitoring



\### Backend



\- Structured service responsibilities

\- Device status management

\- Error logging

\- Prevention of overlapping Modbus polling cycles



\### Frontend



\- Socket.IO connection status handling

\- Real-time telemetry updates

\- Historical data loading

\- Device-specific state management



\## 16. Design Decisions



\### Why Modbus and MQTT?



Industrial systems commonly contain devices with different communication capabilities.



Supporting both protocols demonstrates two different acquisition models:



\- Modbus TCP: polling

\- MQTT: publish-subscribe



Both protocols feed a common telemetry pipeline.



\### Why Separate Connectors?



Protocol-specific code is isolated from application-level telemetry processing.



This improves modularity and makes additional protocols easier to introduce.



\### Why a Separate ModbusDecoder?



Raw Modbus registers require protocol-specific interpretation.



Separating decoding from communication improves clarity, testability, and maintainability.



\### Why TimescaleDB?



Industrial telemetry is timestamp-oriented.



TimescaleDB extends PostgreSQL with features designed for time-series workloads while retaining SQL and relational database capabilities.



\### Why Socket.IO?



Socket.IO provides real-time communication between the backend and dashboard.



It allows telemetry changes to reach the frontend without continuous HTTP polling.



\### Why Docker?



Docker provides reproducible service environments and simplifies local infrastructure management.



\## 17. Manual Test Scenarios



The following scenarios are useful for final acceptance testing.



| Scenario | Expected Result |

|---|---|

| Start all services | Containers start successfully |

| Start Modbus simulator | Modbus telemetry updates |

| Start MQTT simulator | MQTT telemetry updates |

| Stop Modbus Writer | Heartbeat timeout triggers disconnection |

| Restart Modbus Writer | Telemetry resumes |

| Stop MQTT Simulator | Device eventually becomes disconnected |

| Restart MQTT Simulator | Telemetry resumes |

| Stop MQTT Broker | MQTT ingestion detects connection loss |

| Restart MQTT Broker | Subscriptions and ingestion recover |

| Restart Backend | Services reconnect and resume processing |

| Reload Dashboard | Historical data loads and live updates resume |

| Invalid Modbus configuration | Error is handled without crashing the backend |



A test should only be marked passed after its actual result has been verified.



\## 18. Future Improvements



Potential enhancements include:



\- Automated unit and integration test coverage

\- Advanced role-based authorization

\- Alarm and notification management

\- OEE calculations

\- Equipment performance analytics

\- Predictive maintenance

\- Kafka or RabbitMQ integration for larger ingestion workloads

\- Distributed telemetry processing

\- Centralized observability and metrics

\- Production-grade secrets management

\- CI/CD pipelines

\- Kubernetes deployment



These are potential extensions rather than claims about currently implemented features.



\## 19. Project Purpose



FactorEdge was developed as a practical Industrial IoT architecture demonstration.



Its main purpose is to explore how industrial communication protocols, backend services, time-series databases, and real-time web applications work together.



The project focuses on:



\- Industrial protocol integration

\- Backend architecture

\- Data ingestion

\- Real-time communication

\- Time-series persistence

\- Docker-based infrastructure

\- Fault detection and recovery

\- Separation of concerns



\## 20. Conclusion



FactorEdge demonstrates an end-to-end Industrial IoT telemetry pipeline.



Modbus TCP and MQTT data are collected through separate protocol adapters, transformed into a common telemetry model, persisted in TimescaleDB, and delivered to a React dashboard through Socket.IO.



The architecture provides a foundation for future industrial monitoring and smart manufacturing applications.



\---



\*\*FactorEdge – Industrial IoT Monitoring Platform\*\*



