# The Offer Meat Shop

A small meat delivery storefront with a frontend, checkout flow, Razorpay Standard Checkout, and an Express backend that stores orders/products in Supabase.

## Project structure

- `index.html` — storefront landing page
- `checkout.html` / `checkout.js` — cart and checkout flow
- `admin.html` / `admin.js` — owner dashboard
- `admin-login.html` / `admin-login.js` — admin login page
- `backend/` — Express API and Supabase integration
- `config.js` — frontend API and Supabase config

## Requirements

- Node.js 18+
- A Supabase project with a `products` table and an `orders` table
- A `.env` file with your project secrets

## Setup

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```
2. Update the values in `.env` with your Supabase project URL and keys.
3. Install dependencies:
   ```bash
   npm install
   cd backend && npm install
   ```
4. Start the app:
   ```bash
   node server.js
   ```
5. Open the app in your browser at:
   ```text
   http://localhost:5000
   ```

## Environment variables

```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MEATSHOP_SUPABASE_URL=https://your-project.supabase.co
MEATSHOP_SUPABASE_ANON_KEY=your-anon-key
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

## Notes

- The frontend admin login uses the Supabase anon key.
- The backend uses the service role key for database access.
- Keep `.env` out of Git. The repo already ignores `.env` files.
