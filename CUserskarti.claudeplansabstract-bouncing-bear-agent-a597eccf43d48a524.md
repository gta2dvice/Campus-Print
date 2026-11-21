# Implementation Plan: Frontend-Backend Synchronization

This plan outlines the steps to synchronize the frontend and backend of the Campus Print application, removing mock data and ensuring a single source of truth for pricing and configuration.

## 1. Infrastructure & Connection Fixes

### Proxy & Ports
- **Current State**: Potential confusion between port 3000 and 5173.
- **Target State**: 
    - Backend: Port `3000` (default in `server.js`).
    - Frontend: Port `5173` (default Vite port).
    - Proxy: `client-react/vite.config.js` should target `http://localhost:3000`.
- **Action**: Verify `vite.config.js` proxy and ensure the backend is started on port 3000.

## 2. Backend Enhancements (Source of Truth)

### Centralized Configuration
- Create a configuration object for pricing to avoid hardcoding in the frontend.
- **File**: `server/routes/orders.js` (or a new `server/config.js`).
- **Pricing Data**: `{ bw: 2, color: 5, a3Extra: 10 }`.

### New Configuration Endpoint
- Implement `GET /api/orders/config` in `server/routes/orders.js`.
- **Response**:
  ```json
  {
    "pricing": { "bw": 2, "color": 5, "a3Extra": 10 },
    "locations": [ { "id": "main-gate", "name": "Main Gate", "sub": "..." }, ... ]
  }
  ```
- Use `LOCATIONS` from `server/slots.js`.

## 3. Frontend Synchronization (`NewOrder.jsx`)

### Remove Mock Data
- Delete hardcoded `PRICE`, `LOCATIONS`, `TIME_SLOTS`, and `SEED_BOOKED` constants.

### Integration with Backend Config
- Add a state for `config` (pricing and locations).
- In `useEffect`, fetch `/api/orders/config` on component mount.
- Update `calcPrice()` to use `config.pricing`.
- Update the location selection UI to use `config.locations`.

### Individual Copies Implementation
- **UI State**: Keep the existing `files` state where each file has its own `copies` count.
- **API Submission**:
    - In `buildOrderFormData()`, calculate the sum of all copies:
      `const totalCopies = files.reduce((sum, f) => sum + f.copies, 0);`
    - Send `totalCopies` as the `copies` field to the backend.
    - This fulfills the requirement to sum them for the API while keeping them individual in the UI.

### PDF Page Detection
- Maintain the call to `/api/orders/detect-pages`.
- Ensure the fallback to 1 page (estimated) remains to prevent blocking the user.

## 4. Dashboard Integration

### KPI Stats Integration
- **Backend**: Use the existing `Order.getOrderStats(userId)` method which returns `{ total, in_progress, ready }`.
- **Frontend**: 
    - In `Dashboard.jsx`, call `GET /api/orders/stats`.
    - Add a "Stats Summary" section (KPI cards) at the top of the dashboard to display these values.
- **Recent Orders**: Ensure the orders list is fetched from `/api/orders` (already implemented, but verify data consistency).

## 5. Verification Steps

### Connection Test
- Run backend on 3000 and frontend on 5173.
- Verify that the dashboard loads and fetches user profile and orders.

### New Order Workflow Test
- Open `/new-order`.
- Verify that locations and pricing are loaded from the backend.
- Upload 3 files, set copies to 1, 2, and 3 respectively.
- Verify total price calculation using the backend's pricing.
- Verify that `totalCopies` (6) is sent to the backend upon payment simulation.
- Verify the order appears in the Dashboard with correct total price.

### Dashboard Stats Test
- Create several orders in different statuses (e.g., one 'pending', one 'ready').
- Refresh the Dashboard and verify the KPI cards (Total, In Progress, Ready) reflect these counts accurately.

## Critical Files for Implementation

- `server/routes/orders.js`: Implementation of `/api/orders/config` and integration with pricing.
- `server/slots.js`: Providing the source of truth for locations.
- `client-react/src/pages/NewOrder.jsx`: Removing mocks and integrating backend config and copy summing.
- `client-react/src/pages/Dashboard.jsx`: Implementing stats display.
- `client-react/vite.config.js`: Verifying the proxy target.
EOF`
