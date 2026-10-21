# Offline Billing Demo

A small offline-first supermarket billing demo. There is one static product, **Demo Rice Bag** (`DEMO-PRODUCT-001`) at **₹100.00**.

The Flutter app saves every bill in SQLite first. When the Laravel API answers `GET /api/health`, the app sends pending bills to PostgreSQL. A bill is marked synced only after the API confirms it. Repeating the same sale ID is safe. Reusing that ID with different data is rejected and the original row is left unchanged.

```text
Generate Bill → Save to SQLite → Internet unavailable → Bill remains safe
→ Internet restored → Laravel API receives the bill → PostgreSQL stores the bill
→ Flutter marks it Synced
```

```text
offline-billing-demo/
  flutter_app/     Windows and Android billing app
  laravel_api/     Laravel REST API and PostgreSQL migrations
  README.md
```

This environment is Linux. The automated Laravel tests and Flutter tests were run here. A Windows `.exe` and an Android APK were **not** built here, because those builds need the Windows SDK and the Android SDK on the target machine. Commands for both builds are below. Do not treat this repository as containing a finished installer or APK.

## Prerequisites

- Flutter stable (this project was created with Flutter 3.47.7 / Dart 3.13.5) with Windows desktop and Android enabled
- PHP 8.3 or newer, with `pdo_pgsql`, `mbstring`, `xml`, `curl`, `bcmath`, and `zip`
- Composer 2
- PostgreSQL 14 or newer
- For a Windows release build: a Windows machine with Visual Studio 2022 (Desktop development with C++)
- For an Android APK: Android Studio or the Android SDK command-line tools
- Optional, for a Windows installer: [Inno Setup 6](https://jrsoftware.org/isinfo.php)

## 1. PostgreSQL

Create a database and user. The password below is a local demo password. Use a different one outside this demo.

**PowerShell is not required for PostgreSQL itself.** From `psql` as a superuser:

```sql
CREATE ROLE offline_billing LOGIN PASSWORD 'offline_billing';
CREATE DATABASE offline_billing OWNER offline_billing;
CREATE DATABASE offline_billing_test OWNER offline_billing;
GRANT ALL PRIVILEGES ON DATABASE offline_billing TO offline_billing;
GRANT ALL PRIVILEGES ON DATABASE offline_billing_test TO offline_billing;
\c offline_billing
GRANT ALL ON SCHEMA public TO offline_billing;
\c offline_billing_test
GRANT ALL ON SCHEMA public TO offline_billing;
```

`offline_billing` is the app database. `offline_billing_test` is used only by PHPUnit. The tests call `RefreshDatabase`, which migrates and rolls back that test database. Do not point `DB_DATABASE` in `.env` at a production database.

On PostgreSQL 15 and newer, the `GRANT ALL ON SCHEMA public` lines are required or migrations fail with a permission error.

## 2. Laravel API

```powershell
cd laravel_api
Copy-Item .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan serve --host=0.0.0.0 --port=8000
```

On bash, use `cp .env.example .env` instead of `Copy-Item`.

`.env` database settings:

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=offline_billing
DB_USERNAME=offline_billing
DB_PASSWORD=offline_billing
```

`--host=0.0.0.0` lets an Android emulator and a phone on the same LAN reach the API. `127.0.0.1` alone is only reachable from the computer running Laravel.

Check it:

```powershell
curl http://127.0.0.1:8000/api/health
```

Expected body: `{"success":true,"status":"ok"}`.

### API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Reachability probe. The app calls this before sending bills. |
| `POST` | `/api/sales/sync` | Insert one offline bill. |
| `POST` | `/api/sales/sync-batch` | Insert several bills. Each bill has its own result. One bad bill does not mark the others synced. |
| `GET` | `/api/sales` | List bills stored in PostgreSQL. |

`POST /api/sales/sync` example:

```json
{
  "sale_uuid": "a-unique-uuid",
  "product_id": "DEMO-PRODUCT-001",
  "product_name": "Demo Rice Bag",
  "unit_price": "100.00",
  "quantity": 2,
  "total_amount": "200.00",
  "created_at": "2026-10-21T10:30:00Z"
}
```

The server checks the static product id, name, and unit price, requires a positive integer quantity, and calculates the total as `100.00 × quantity` with decimal arithmetic. The client's total must match that value. `created_at` is stored as the sale time (`sold_at`). `created_at` on the row is the time PostgreSQL accepted the sync.

Same `sale_uuid` and the same sale data returns `sync_status: already_synced` and does not insert another row. The same UUID with different data returns HTTP 409 `conflict` and does not change the stored sale.

## 3. Flutter app

```powershell
cd flutter_app
flutter pub get
```

SQLite uses `sqflite` on Android and `sqflite_common_ffi` on Windows and Linux. The database file is `sales.db` under the app documents directory (`offline_billing/sales.db`). Bills stay there across restarts. A failed API call does not delete them.

### API base URL

The URL is chosen in this order:

1. `--dart-define=API_BASE_URL=...` when you pass one
2. Android, when no define is set: `http://10.0.2.2:8000/api` (the emulator's alias for the computer)
3. Windows and other desktops: `http://127.0.0.1:8000/api`

Localhost is not used for Android. A physical phone must use the computer's LAN address, for example `http://192.168.1.20:8000/api`. Production should use a public HTTPS URL.

### Windows desktop

```powershell
flutter config --enable-windows-desktop
flutter run -d windows
```

Override the URL only when Laravel is not on this computer:

```powershell
flutter run -d windows --dart-define=API_BASE_URL=http://127.0.0.1:8000/api
```

### Android emulator

Start an emulator, then:

```powershell
flutter run -d emulator
```

The default URL is `http://10.0.2.2:8000/api`. Laravel must be listening on `0.0.0.0:8000`.

### Physical Android device

1. Put the phone and the computer on the same network.
2. Find the computer's LAN IP (`ipconfig` on Windows, `ip addr` on Linux).
3. Allow inbound TCP 8000 in the computer firewall.
4. Run:

```powershell
flutter run -d <device-id> --dart-define=API_BASE_URL=http://YOUR_COMPUTER_LAN_IP:8000/api
```

`flutter devices` lists `<device-id>`.

Debug and profile builds allow HTTP so a local IP works. Release builds allow cleartext only for `10.0.2.2`, `127.0.0.1`, and `localhost` (see `android/app/src/main/res/xml/network_security_config.xml`). For a release build against a LAN IP, add that IP as another `<domain>` in that file. For a real deployment, use HTTPS and leave cleartext disabled. Do not turn on cleartext for every host in a production app.

`INTERNET` and `ACCESS_NETWORK_STATE` are declared on the Android app. Windows desktop does not need an extra network permission for this HTTP client.

## 4. How to test offline billing

1. Start PostgreSQL and `php artisan serve --host=0.0.0.0 --port=8000`.
2. Run the Flutter app. The status should show **Online — API reachable** after the health check succeeds. Wi-Fi alone does not flip this to online.
3. Set a quantity and press **Generate Bill**. The bill appears immediately. If the API is up, it then changes to **Synced**.
4. Stop Laravel, or disconnect the computer from the network. The status becomes **Offline — API unreachable**.
5. Generate several bills. Each shows **Pending**. Pending sync shows the count. The message is `Bill saved locally — waiting to sync`.
6. Close the app completely and open it again. The pending bills are still listed. Sync does not continue while the process is fully stopped. It runs again on startup.
7. Start Laravel, or reconnect. The app syncs when it resumes, on a 20 second timer while it is open, and when you press **Sync Now**. It checks `/api/health` before posting.
8. Pending rows change to **Synced** only after the API returns `synced` or `already_synced`.
9. Query PostgreSQL:

```sql
SELECT sale_uuid,
       product_name,
       quantity,
       unit_price,
       total_amount,
       sold_at,
       created_at AS synced_at
FROM sales
ORDER BY id DESC;
```

`sold_at` is the time on the device. `created_at` is the sync time. `total_amount` is the server calculation (`100.00` times quantity). There is one row per `sale_uuid`.

10. Press **Sync Now** again. The count in PostgreSQL does not increase.
11. Stop Laravel and generate another bill. It remains in SQLite. Start Laravel and wait, or press **Sync Now**. The new bill syncs.

A conflict (same UUID, different quantity or time) stays **Failed** on the device and is not retried automatically. The PostgreSQL row is unchanged. Generate a new bill for a new sale.

## 5. Automated tests

Laravel, against `offline_billing_test`:

```powershell
cd laravel_api
php artisan test
```

Flutter unit, widget, and sync tests. The Laravel end-to-end test is skipped unless the API is already running:

```powershell
cd flutter_app
flutter test
```

To run the Flutter test that talks to the real API and PostgreSQL:

```powershell
cd laravel_api
php artisan serve --host=127.0.0.1 --port=8000
```

```powershell
cd flutter_app
flutter test --dart-define=REQUIRE_LARAVEL=true --dart-define=API_BASE_URL=http://127.0.0.1:8000/api test/laravel_end_to_end_test.dart
```

Point that server at `offline_billing_test` if you do not want the rows in the demo database. Set `DB_DATABASE=offline_billing_test` in the environment before `php artisan serve`. PHPUnit's `RefreshDatabase` will wipe `offline_billing_test` the next time `php artisan test` runs.

## 6. Windows release files

On a Windows machine, from `flutter_app`:

```powershell
flutter build windows --release
```

The app is the whole folder:

```text
build\windows\x64\runner\Release\
```

`offline_billing_demo.exe` needs the DLLs and the `data` folder next to it. Copying the `.exe` by itself will not start. Zip that Release folder, or install it with the Inno Setup script:

```powershell
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" windows\installer\offline_billing_demo.iss
```

The script writes `build\windows\installer\OfflineBillingDemoSetup.exe`. The installer was not compiled in this Linux workspace.

## 7. Android APK

From `flutter_app` on a machine with the Android SDK:

```powershell
flutter build apk --debug
flutter build apk --release
```

Outputs:

```text
build\app\outputs\flutter-apk\app-debug.apk
build\app\outputs\flutter-apk\app-release.apk
```

The release APK in this project is signed with the debug keystore so it can be installed for the demo. A store build needs your own upload key. Neither APK was produced in this Linux workspace.

Install a debug APK on a phone and pass the LAN URL at build time if you are not using an emulator:

```powershell
flutter build apk --debug --dart-define=API_BASE_URL=http://YOUR_COMPUTER_LAN_IP:8000/api
```

`--dart-define` values are fixed at compile time.

## 8. Common errors

| What you see | What to do |
| --- | --- |
| Flutter stays **Offline** while the phone has Wi-Fi | Laravel is not reachable. Check `php artisan serve --host=0.0.0.0 --port=8000`, the firewall, and `API_BASE_URL`. The app ignores connectivity until `/api/health` returns `{"success":true,"status":"ok"}`. |
| Emulator cannot connect to `127.0.0.1` | Use `http://10.0.2.2:8000/api`. `127.0.0.1` on the emulator is the emulator itself. |
| Phone cannot connect to `10.0.2.2` | That address is only for the emulator. Use the computer's LAN IP. |
| Release APK on a phone fails on HTTP | Add the LAN IP to `network_security_config.xml`, or use HTTPS. Debug builds already allow cleartext HTTP. |
| `SQLSTATE[08006]` or password authentication failed | Match `.env` to the PostgreSQL role. Create both databases listed above. |
| `permission denied for schema public` | Run `GRANT ALL ON SCHEMA public TO offline_billing;` on each database. |
| `No application encryption key` | Run `php artisan key:generate`. |
| Windows `.exe` opens a missing-DLL error | Distribute the entire `Release` folder, not the executable alone. |
| `sale_uuid` conflict | The UUID was already stored with different quantity, total, or time. The original sale is kept. |
| Bills stay pending after the API returns | Read the error on the bill. A 409 or 422 is not retried automatically. Network failures retry with backoff, and **Sync Now** retries them immediately. |
| Composer or PHP missing extensions | Install `php-pgsql`, `php-xml`, `php-mbstring`, `php-curl`, `php-bcmath`, and `php-zip`. |

## What is intentionally not included

There is no login, product catalog, stock adjustment, customer list, or report. Stock `100` is displayed for the one demo product and is not decremented.
