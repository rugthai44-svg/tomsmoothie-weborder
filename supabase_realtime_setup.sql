-- ==============================================================================
-- คำสั่ง SQL สำหรับเปิดใช้งาน Supabase Realtime ตลอดเวลา ให้กับ TomSmoothie App
-- นำโค้ดนี้ไปวางและกดรันใน Supabase Dashboard -> เมนู "SQL Editor"
-- ==============================================================================

-- 1. เพิ่มตารางทั้งหมดเข้าสู่ Realtime Publication เพื่อกระจายข้อมูลสดทันทีที่มีการเปลี่ยนแปลง
ALTER PUBLICATION supabase_realtime ADD TABLE tomsmoothie_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE tomsmoothie_order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE tomsmoothie_users;
ALTER PUBLICATION supabase_realtime ADD TABLE tomsmoothie_point_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE tomsmoothie_daily_closings;

-- 2. สร้างตาราง tomsmoothie_menu_items (หากยังไม่มีในระบบ เพื่อให้ซิงค์เมนูผ่านคลาวด์ได้)
CREATE TABLE IF NOT EXISTS public.tomsmoothie_menu_items (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(30) NOT NULL,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  total_sold_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- เพิ่มตารางเมนูเข้าสู่ Realtime ด้วย
ALTER PUBLICATION supabase_realtime ADD TABLE tomsmoothie_menu_items;

-- 3. เปิด Policy ให้สามารถอ่านและเขียนข้อมูลได้อย่างราบรื่น
DO $$
BEGIN
  -- Orders
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tomsmoothie_orders' AND policyname = 'Public Access Orders') THEN
    CREATE POLICY "Public Access Orders" ON tomsmoothie_orders FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Order Items
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tomsmoothie_order_items' AND policyname = 'Public Access Order Items') THEN
    CREATE POLICY "Public Access Order Items" ON tomsmoothie_order_items FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Users
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tomsmoothie_users' AND policyname = 'Public Access Users') THEN
    CREATE POLICY "Public Access Users" ON tomsmoothie_users FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Point Transactions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tomsmoothie_point_transactions' AND policyname = 'Public Access Transactions') THEN
    CREATE POLICY "Public Access Transactions" ON tomsmoothie_point_transactions FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Daily Closings
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tomsmoothie_daily_closings' AND policyname = 'Public Access Daily Closings') THEN
    CREATE POLICY "Public Access Daily Closings" ON tomsmoothie_daily_closings FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Menu Items
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tomsmoothie_menu_items' AND policyname = 'Public Access Menu Items') THEN
    CREATE POLICY "Public Access Menu Items" ON tomsmoothie_menu_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

