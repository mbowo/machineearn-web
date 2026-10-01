# MachineEarn v16 — Release Candidate Demo

MachineEarn v16 is a **local educational/demo release candidate**. It includes the professional demo checkout, M-Pesa Till display, machines, demo earnings, demo withdrawals, activity, and Android/web foundations.

## Important scope
- No real money is processed.
- The Till number shown in the demo is a placeholder: `1720946`.
- Demo earnings are illustrative and are not guaranteed investment returns.
- Do not send real money to the demo Till number.
- Real payment/withdrawal deployment would require appropriate payment-provider, security, legal, and regulatory work.

## Run on Windows
Double-click `start-demo.bat`, or open a terminal in the `web` folder and run:

```text
node server.js
```

Then open:

```text
http://localhost:3000
```

## Run on Linux/macOS

```text
./start-demo.sh
```

## Android emulator
Open `android-app` in Android Studio. The demo uses `http://10.0.2.2:3000` to reach the Node.js server running on the host computer.

## Demo payment settings
Edit `web/data/db.json`:

```json
"settings": {
  "demoPaymentMethod": "M-Pesa Till",
  "demoTillNumber": "1720946"
}
```

The web and Android clients read this through `/api/payment-info`.

## QA smoke test completed
- Server starts successfully.
- `/api/payment-info` returns the demo Till.
- `/api/machines` returns the machine catalogue.
- Registration works.
- Login/session works.
- Authenticated dashboard works.
- Purchase flow was tested.
- Demo withdrawal validation was tested.
- Release database was reset after testing so no QA account remains.

## Not production-ready
The current project remains a learning/demo codebase. Before any real deployment, use professional password hashing (e.g. Argon2id/bcrypt), HTTPS, secure session storage, CSRF protection where applicable, rate limiting, proper validation, database security, payment-provider integration, audit controls, and legal/regulatory review.
