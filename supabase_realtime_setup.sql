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

-- 4. นำเข้าข้อมูลเมนูเครื่องดื่มเริ่มต้นพร้อมลิงก์รูปภาพจริง (Real Images)
INSERT INTO public.tomsmoothie_menu_items (id, name, category, base_price, image_url, is_popular, is_available, total_sold_count)
VALUES
  ('m-2', 'สตรอว์เบอร์รีโยเกิร์ตปั่น (Strawberry Yogurt)', 'Smoothie', 70, '/menu/strawberry.jpg?v=2', true, true, 180),
  ('m-3', 'มะพร้าวนมสดปั่น (Coconut Fresh Milk)', 'Smoothie', 60, '/menu/coconut.jpg?v=2', true, true, 120),
  ('m-4', 'โกโก้ปั่นเข้มข้น (Cocoa Intense)', 'Smoothie', 55, '/menu/cocoa.jpg?v=2', true, true, 95),
  ('m-5', 'อะโวคาโดน้ำผึ้งปั่น (Avocado Honey)', 'Smoothie', 85, '/menu/avocado.jpg?v=2', true, true, 110),
  ('m-6', 'ส้มปั่นสด (Orange Smoothie)', 'Smoothie', 50, '/menu/orange.jpg?v=2', false, true, 40),
  ('m-7', 'แตงโมปั่น (Watermelon Smoothie)', 'Smoothie', 45, '/menu/watermelon.jpg?v=2', false, true, 50),
  ('m-8', 'มิกซ์เบอร์รีปั่น (Mixed Berry)', 'Smoothie', 75, '/menu/berry.jpg?v=2', false, true, 65),
  ('m-water', 'น้ำเปล่าปั่น', 'Smoothie', 50, '🥤', true, true, 85),
  ('m-pinkmilk', 'นมเย็น', 'Iced', 50, '🥤', false, true, 35),
  ('m-hotcoffee-custom', 'กาแฟร้อน', 'Hot', 50, '🥤', false, true, 20),
  ('m-1', 'มะม่วงเสาวรสปั่น (Mango Passionfruit)', 'Smoothie', 65, '/menu/mango.jpg?v=2', false, true, 145),
  ('m-iced-1', 'ชาไทยนมสดเย็น (Iced Thai Milk Tea)', 'Iced', 50, '/menu/thai-tea.jpg?v=2', true, true, 85),
  ('m-iced-2', 'ชาเขียวมัทฉะลาเต้เย็น (Iced Matcha Latte)', 'Iced', 55, '/menu/matcha.jpg?v=2', true, true, 90),
  ('m-iced-3', 'ชามะนาวเย็น (Iced Lemon Tea)', 'Iced', 45, '/menu/lemon-tea.jpg?v=2', false, true, 60),
  ('m-iced-4', 'อเมริกาโน่เย็น (Iced Americano)', 'Iced', 50, '/menu/americano.jpg?v=2', false, true, 45),
  ('m-hot-1', 'ชาไทยร้อน (Hot Thai Tea)', 'Hot', 45, '/menu/hot-coffee.jpg?v=2', false, true, 25),
  ('m-hot-2', 'ชาเขียวมัทฉะร้อน (Hot Matcha Latte)', 'Hot', 50, '/menu/hot-tea.jpg?v=2', false, true, 30),
  ('m-hot-3', 'โกโก้ร้อน (Hot Cocoa)', 'Hot', 45, '/menu/hot-chocolate.jpg?v=2', false, true, 20)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  base_price = EXCLUDED.base_price,
  image_url = EXCLUDED.image_url,
  is_popular = EXCLUDED.is_popular;


