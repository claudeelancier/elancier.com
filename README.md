# Luckyverse

Premium promotional rewards platform: **Spin. Win. Celebrate.**

## Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Demo accounts

Player: `hari@luckyverse.test` / `Play@1234`  
Admin portal: `/admin/login` · `admin@luckyverse.test` / `Admin@1234`  
OTP (demo): `123456`

## Architecture

The UI talks to `src/services/api.js`. Set `VITE_USE_LIVE_API=true` and `VITE_API_BASE` to point at a Laravel Sanctum API. Until then, `src/services/mockApi.js` is the server: it owns prize weights, inventory, spin locks, and winner writes.

MySQL entities and Laravel route stubs live in `/backend`.
