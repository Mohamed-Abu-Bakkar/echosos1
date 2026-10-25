# EchoSOS — Emergency Safety Mobile Web Application

> **Production-Ready Next.js Application with Tailwind CSS, Shadcn UI, and MySQL (Prisma ORM)**

EchoSOS is a real-time safety application designed to interface with wearable ESP32-S3 BLE beacons, dispatching distress signals and live GPS telemetry to emergency contacts and emergency services.

---

## 🚀 Getting Started

### 1. Requirements
- Node.js 18+ (tested on Node v22.14.0)
- MySQL 8.0+ (optional: local fallback mock data is pre-configured)

### 2. Run the Application
```bash
# Install dependencies
npm install

# Run database generation
npx prisma generate

# Start the dev server
npm run dev

# Or start the optimized production server
npm run build
npm run start
```
Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📱 8 Screens Included

1. **Splash Screen:** [`/splash`](http://localhost:3000/splash)
2. **Login Screen:** [`/login`](http://localhost:3000/login)
3. **Home / Safety Dashboard:** [`/`](http://localhost:3000/)
4. **Beacon Pairing Screen:** [`/beacon`](http://localhost:3000/beacon)
5. **Emergency Alert Triggered State:** [`/alert`](http://localhost:3000/alert)
6. **Emergency Contacts & Add Contact Sheet:** [`/contacts`](http://localhost:3000/contacts)
7. **Settings Dashboard:** [`/settings`](http://localhost:3000/settings)
8. **Notifications & History Dashboards:** [`/notifications`](http://localhost:3000/notifications) & [`/history`](http://localhost:3000/history)

---

## 🗄 Database Configuration

- **Prisma Schema:** `prisma/schema.prisma`
- **Raw SQL Migration & Seed Data:** `lib/db/schema.sql`
- **Connection String:** `.env` (`DATABASE_URL="mysql://root:password@localhost:3306/echosos_db"`)

To apply the schema to a live MySQL instance:
```bash
npx prisma db push
```
Or import `lib/db/schema.sql` directly into your MySQL database server.
