# Orderly

Order management system for sourcing and delivering accessories. Customers place orders via a public-facing form, and admins manage the full lifecycle — quoting, payment tracking, sourcing, delivery, and refunds — from a dashboard.

## Features

- Public order placement and tracking page
- Admin dashboard with real-time order updates
- Order lifecycle management (quote, pay, source, deliver)
- WhatsApp message templates for customer communication
- Customer management with order history and notes
- Revenue reports with weekly trends
- Bulk order actions
- Mobile-friendly responsive design

## Tech Stack

- **Framework:** Next.js (App Router)
- **Database:** Supabase (PostgreSQL)
- **Payments:** Paystack
- **Messaging:** WhatsApp Business API
- **Styling:** Tailwind CSS + shadcn/ui
- **Deployment:** Vercel

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/Gervinabavelim/orderly-main.git
   cd orderly-main
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase, Paystack, and WhatsApp API credentials.

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## License

This project is licensed under the [MIT License](LICENSE).
