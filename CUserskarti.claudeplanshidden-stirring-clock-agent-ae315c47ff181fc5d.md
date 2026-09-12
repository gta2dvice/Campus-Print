# Migration Plan: Campus-Print Frontend Migration to React + Vite

## Overview
Migrate the project from a static HTML/CSS/JS frontend to a React + Vite frontend and update the Node.js backend to match the upstream version.

## 1. File System Changes

### Directories to Remove
- `client/` (Remove entire static frontend directory)

### Files/Directories to Copy from `upstream_temp/`
- `client-react/` $\rightarrow$ root directory
- `server/` $\rightarrow$ replace existing `server/` directory entirely
- `package.json` $\rightarrow$ replace root `package.json`
- `package-lock.json` $\rightarrow$ replace root `package-lock.json`

## 2. Implementation Steps

### Step 1: Cleanup and Replacement
1. Delete the `client/` directory.
2. Copy `upstream_temp/client-react/` to the root directory.
3. Copy `upstream_temp/server/` to the root directory (overwriting existing `server/`).
4. Copy `upstream_temp/package.json` and `upstream_temp/package-lock.json` to the root directory.

### Step 2: Dependency Installation
1. Run `npm install` in the root directory to install backend dependencies (`jszip`, `multer`, `pdf-parse`, `razorpay`, etc.).
2. Run `cd client-react && npm install` to install frontend dependencies.

### Step 3: Frontend Build
1. Run `npm run build:client` from the root directory.
2. Verify that `client-react/dist/` is created.

### Step 4: Server Configuration
1. Edit `server/server.js` to correct the static files path.
   - Change: `const CLIENT_DIST = path.join(__dirname, '../client-dist');`
   - To: `const CLIENT_DIST = path.join(__dirname, '../client-react/dist');`
2. This ensures the server serves the actual build output of the Vite project.

## 3. Verification and Testing

### Build Verification
- Ensure `npm run build:client` completes without errors.
- Verify the existence of `client-react/dist/index.html`.

### Runtime Verification
1. Run `npm run dev` (starts the server).
2. Open `http://localhost:3000` in a browser.
3. Verify the following:
   - Home page loads.
   - User can navigate to "Select Location".
   - User can log in and access the Dashboard.
   - "New Order" flow works.
   - Admin and Super-Admin routes (if credentials available) load correctly.

## 4. Feature Mapping (Old $\rightarrow$ New)

| Old Route/Feature | New Implementation | Notes |
| :--- | :--- | :--- |
| `/select-location` | `pages/SelectLocation.jsx` | Now a React component; routing handled by React Router. |
| `/dashboard` | `pages/Dashboard.jsx` | Now a React component with role-based access. |
| `/new-order` | `pages/NewOrder.jsx` | Integrated into the React SPA. |
| `/ticket` | `pages/Ticket.jsx` | Integrated into the React SPA. |
| `/upload` | Redirected to `NewOrder.jsx` | Logic now handled within the React application. |
| Static HTML pages | React SPA | All `.html` files are replaced by JSX components. |

## 5. Critical Files for Implementation
- `package.json` (Root)
- `server/server.js`
- `client-react/package.json`
- `upstream_temp/server/` (Source for backend update)
- `upstream_temp/client-react/` (Source for frontend update)
