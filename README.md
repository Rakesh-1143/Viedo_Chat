# Streamify Video Chat

Streamify is a MERN language-exchange application with one-to-one messaging,
friend requests, presence, unread counts, and real-time audio/video calling.

The project keeps its original architecture:

- React 19, Vite, Tailwind CSS, and DaisyUI for the web interface
- Express and Node.js for the API
- MongoDB and Mongoose for users and friend relationships
- HTTP-only JWT cookies for authentication
- Stream Chat for durable messages, typing, read state, presence, and WebSockets
- Stream Video for WebRTC media, ringing, reconnection, and device controls

No real credentials belong in this repository. The committed `.env.example`
files contain placeholders only.

## Features

- Registration, login, logout, profile editing, password changes, and deletion
- Friend discovery, requests, acceptance, and connection lists
- Server-authorized one-to-one chat channels
- Persistent chat history, timestamps, typing, read state, presence, and unread
  badges through Stream Chat
- Incoming audio/video call notification with accept, reject, cancel, and end
- Camera/microphone controls, camera switching, and supported screen sharing
- Call duration, participant count, reconnect/offline status, and device errors
- Responsive light and dark interfaces
- Validation, rate limiting, CORS allowlisting, security headers, and API errors

## Project Layout

```text
Viedo_Chat/
|-- backend/
|   |-- src/
|   |   |-- config/       Environment validation
|   |   |-- controllers/  Authentication, users, chat, and calls
|   |   |-- lib/          MongoDB and Stream server clients
|   |   |-- middleware/   Authentication and API errors
|   |   |-- models/       Mongoose models
|   |   |-- routes/       Express routes
|   |   |-- utils/        Validation and cookie helpers
|   |   |-- app.js        Testable Express application
|   |   \`-- server.js     Database and HTTP startup
|   \`-- test/             API integration and unit tests
|-- frontend/
|   |-- public/           Static images and icons
|   \`-- src/              React components, pages, hooks, and providers
|-- .env.example          Render/single-service template
\`-- package.json          Root build and start commands
```

## Prerequisites

1. Node.js 20 or newer.
2. npm 10 or newer.
3. Local MongoDB or a MongoDB Atlas database.
4. A Stream application with Chat and Video enabled.
5. Git.

## First-Time Windows Setup

Open PowerShell in the project folder.

### Backend

```powershell
cd backend
npm ci
Copy-Item .env.example .env
```

Open `backend/.env` and replace every placeholder.

### Frontend

Open a second PowerShell window in the project folder.

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
```

Put the same public Stream API key in `frontend/.env`. Never put the Stream
secret in a frontend file.

## MongoDB Setup

For local MongoDB:

```dotenv
MONGO_URL=mongodb://127.0.0.1:27017/streamify
```

For Atlas, create a cluster and database user, allow the backend host in Network
Access, copy the Node.js connection string, and put it in `MONGO_URL`. Never
commit that connection string.

## Stream Setup

1. Create or open a Stream application.
2. Copy its API key to `STREAM_API_KEY` and `VITE_STREAM_API_KEY`.
3. Copy its secret only to backend `STREAM_API_SECRET`.
4. Keep call type `default`, or set the same custom value in
   `STREAM_CALL_TYPE` and `VITE_STREAM_CALL_TYPE`.
5. Confirm Chat and Video are enabled.

The Stream API key is public. The Stream API secret is private.

## Environment Variables

### Backend

| Name | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | Deployment | `development`, `test`, or `production` |
| `PORT` | No | API port; default `5001` |
| `MONGO_URL` | Yes | MongoDB connection string |
| `MONGO_MAX_POOL_SIZE` | No | Pool size; default 10, maximum 50 |
| `JWT_SECRET_KEY` | Yes | Random secret of at least 32 characters |
| `JWT_EXPIRES_IN` | No | Lifetime such as `7d` or `12h` |
| `CLIENT_ORIGINS` | Production | Comma-separated exact frontend origins |
| `COOKIE_SAME_SITE` | No | `lax`, `strict`, or `none` |
| `COOKIE_SECURE` | Production | Set `true` for HTTPS |
| `STREAM_API_KEY` | Yes | Stream public key |
| `STREAM_API_SECRET` | Yes | Stream private server secret |
| `STREAM_CALL_TYPE` | No | Call type; default `default` |

### Frontend

| Name | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Separate hosting | API URL ending in `/api` |
| `VITE_STREAM_API_KEY` | Yes | Stream public key |
| `VITE_STREAM_CALL_TYPE` | No | Must match the backend call type |

Vite variables are inserted during build. Changing them requires a new build.

## Start Development

Use two PowerShell windows.

Backend:

```powershell
cd backend
npm run dev
```

Frontend:

```powershell
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Check the API at
[http://localhost:5001/api/health](http://localhost:5001/api/health).

The Vite port is fixed. If `5173` is occupied, stop that process or change the
port and add the exact new origin to `CLIENT_ORIGINS`.

## Production and Render

Build and run from the repository root:

```powershell
npm run build
npm start
```

The backend serves `frontend/dist` in production. Unknown `/api/*` routes still
return JSON 404 responses.

For one Render Web Service:

1. Connect this GitHub repository.
2. Use build command `npm run build`.
3. Use start command `npm start`.
4. Add all backend values from `.env.example`.
5. Add `VITE_STREAM_API_KEY`, `VITE_STREAM_CALL_TYPE`, and
   `VITE_API_URL=/api` before building.
6. Set `CLIENT_ORIGINS` to the exact Render HTTPS URL.
7. Set `COOKIE_SECURE=true` and normally `COOKIE_SAME_SITE=lax`.
8. Allow the Render service in MongoDB Atlas, deploy, and check `/api/health`.

For a separately hosted frontend, use its exact HTTPS origin, point
`VITE_API_URL` to the HTTPS API, and normally use `COOKIE_SAME_SITE=none` with
`COOKIE_SECURE=true`.

## Real-Time and WebRTC Architecture

This project does not run a custom Socket.IO signaling server. Stream Chat owns
the authenticated messaging WebSocket. Stream Video owns call signaling and the
WebRTC SFU connection. The backend creates user tokens and verifies friendship
before opening a direct conversation or call.

Stream Video supplies its media edge and ICE/TURN connectivity. Because this is
an SFU SDK rather than a raw browser-to-browser `RTCPeerConnection`, this app
does not consume `STUN_URL` or `TURN_PASSWORD`. Never place TURN credentials in
Vite variables. A future self-hosted WebRTC implementation must issue
short-lived ICE credentials from the backend.

Production networks must allow HTTPS/WSS to Stream and the UDP/TCP media traffic
required by Stream Video.

## Tests

Run from the repository root:

```powershell
npm run lint
npm test
npm run build
```

Backend tests cover health, JSON 404s, missing/invalid sessions, untrusted
origins, malformed JSON, and validation. Frontend tests cover duration
formatting and friendly media-device errors.

## Manual Two-User Test

Use two browser profiles so each gets a separate auth cookie.

1. Register and onboard two users.
2. Send and accept a friend request.
3. Send chat messages both ways.
4. Confirm typing, timestamps, unread counts, presence, and read state.
5. Start video and audio calls; test incoming, accept, reject, cancel, and end.
6. Test mute, camera, camera switching, screen share, count, and duration.
7. Deny device permissions and confirm the friendly error.
8. Disable the network briefly and confirm reconnect/offline feedback.
9. Confirm camera and microphone indicators turn off after leaving.

Review widths `320`, `360`, `375`, `390`, `414`, `768`, `1024`, `1280`,
`1440`, and `1920`. Test current Chrome, Edge, Firefox, and Safari where
available. Feature detection hides unsupported camera switching/screen sharing.

## Android and iOS Readiness

The responsive app can later be wrapped with Capacitor, but native projects are
not included yet.

- Use an HTTPS API.
- Allow `capacitor://localhost` or `ionic://localhost` only for the real wrapper.
- Add native camera/microphone permission descriptions.
- Test HTTP-only cookie behavior in the WebView; a native token bridge may be
  needed if cross-site cookies are restricted.
- Background incoming calls normally require native push notifications.

## Troubleshooting

- **Backend exits:** read the startup error. Missing MongoDB, JWT, Stream, or
  production-origin values intentionally stop startup.
- **App is unreachable:** check the backend, `VITE_API_URL`, and exact CORS
  origin.
- **Login fails only in deployment:** verify HTTPS, `COOKIE_SECURE`, and
  `COOKIE_SAME_SITE`.
- **Chat works but calls fail:** verify both Stream keys use the same app, call
  types match, permissions are granted, and the firewall allows media traffic.
- **Phone cannot open local site:** bind Vite to the LAN, use the computer's IP
  in URLs, add the exact origin to CORS, and check Windows Firewall.

## Verification Boundary

Automated checks do not replace a real two-account Stream session. Calls,
device permissions, mobile Safari behavior, Stream dashboard policy, Atlas
networking, and Render HTTPS cookies require manual testing with real deployment
credentials.
