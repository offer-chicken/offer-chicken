-- Stock tracking and Razorpay payment fields.
-- Safe to run more than once.

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS stock numeric NOT NULL DEFAULT 0;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS razorpay_order_id text;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS razorpay_payment_id text;

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id bigserial PRIMARY KEY,
    product_id bigint REFERENCES public.products(id) ON DELETE CASCADE,
    movement_type text NOT NULL CHECK (movement_type IN ('in', 'out')),
    quantity numeric NOT NULL CHECK (quantity > 0),
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
