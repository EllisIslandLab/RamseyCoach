-- ============================================================
-- 001_categorization_system.sql
-- Smart Categorization & Transaction System
-- ============================================================

-- ─── Global Tables ───────────────────────────────────────────────────────────

CREATE TABLE global_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text UNIQUE NOT NULL,
  icon       text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

INSERT INTO global_categories (name, icon, sort_order) VALUES
  ('Housing',                       '🏠', 1),
  ('Food & Grocery',                '🛒', 2),
  ('Auto & Transportation',         '🚗', 3),
  ('Health & Medical',              '🏥', 4),
  ('Personal Care',                 '💄', 5),
  ('Giving & Charity',              '❤️',  6),
  ('Savings',                       '💰', 7),
  ('Entertainment & Subscriptions', '🎬', 8),
  ('Utilities',                     '💡', 9),
  ('Debt Payments',                 '💳', 10),
  ('Education',                     '📚', 11),
  ('Miscellaneous',                 '📦', 12);

-- ─── Global Subcategories ────────────────────────────────────────────────────

CREATE TABLE global_subcategories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES global_categories(id) ON DELETE CASCADE,
  name        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Housing
INSERT INTO global_subcategories (category_id, name)
SELECT id, sub FROM global_categories, (VALUES
  ('Mortgage'), ('Rent'), ('Principal'), ('Interest'), ('Escrow'),
  ('Home Repair'), ('Homeowners Insurance')
) AS s(sub) WHERE name = 'Housing';

-- Food & Grocery
INSERT INTO global_subcategories (category_id, name)
SELECT id, sub FROM global_categories, (VALUES
  ('Groceries'), ('Restaurants'), ('Cash/Allowance')
) AS s(sub) WHERE name = 'Food & Grocery';

-- Auto & Transportation
INSERT INTO global_subcategories (category_id, name)
SELECT id, sub FROM global_categories, (VALUES
  ('Car Payment'), ('Auto Insurance'), ('Gasoline'), ('Auto Repair')
) AS s(sub) WHERE name = 'Auto & Transportation';

-- Health & Medical
INSERT INTO global_subcategories (category_id, name)
SELECT id, sub FROM global_categories, (VALUES
  ('Gym'), ('Health Savings'), ('Dentist')
) AS s(sub) WHERE name = 'Health & Medical';

-- Personal Care
INSERT INTO global_subcategories (category_id, name)
SELECT id, sub FROM global_categories, (VALUES
  ('Clothing')
) AS s(sub) WHERE name = 'Personal Care';

-- Giving & Charity
INSERT INTO global_subcategories (category_id, name)
SELECT id, sub FROM global_categories, (VALUES
  ('Church/Tithe'), ('Christmas/Gifts')
) AS s(sub) WHERE name = 'Giving & Charity';

-- Savings
INSERT INTO global_subcategories (category_id, name)
SELECT id, sub FROM global_categories, (VALUES
  ('Emergency Fund'), ('Vacation')
) AS s(sub) WHERE name = 'Savings';

-- Entertainment & Subscriptions
INSERT INTO global_subcategories (category_id, name)
SELECT id, sub FROM global_categories, (VALUES
  ('Streaming')
) AS s(sub) WHERE name = 'Entertainment & Subscriptions';

-- Utilities
INSERT INTO global_subcategories (category_id, name)
SELECT id, sub FROM global_categories, (VALUES
  ('Electric'), ('Water'), ('Natural Gas'), ('Phone'), ('TV/Internet'),
  ('Waste Removal'), ('Sewer')
) AS s(sub) WHERE name = 'Utilities';

-- ─── Global Merchants ────────────────────────────────────────────────────────

CREATE TABLE global_merchants (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_name         text UNIQUE NOT NULL, -- normalized lowercase
  default_category_id   uuid REFERENCES global_categories(id),
  default_subcategory_id uuid REFERENCES global_subcategories(id),
  merchant_type         text DEFAULT 'national',
  created_at            timestamptz DEFAULT now()
);

-- Grocery stores → Food & Grocery / Groceries
INSERT INTO global_merchants (merchant_name, default_category_id, default_subcategory_id, merchant_type)
SELECT m, gc.id, gs.id, 'national'
FROM (VALUES ('walmart'), ('target'), ('kroger'), ('meijer'), ('aldi'), ('costco'), ('sams club')) AS t(m)
JOIN global_categories gc ON gc.name = 'Food & Grocery'
JOIN global_subcategories gs ON gs.category_id = gc.id AND gs.name = 'Groceries';

-- Restaurants → Food & Grocery / Restaurants
INSERT INTO global_merchants (merchant_name, default_category_id, default_subcategory_id, merchant_type)
SELECT m, gc.id, gs.id, 'national'
FROM (VALUES ('mcdonald''s'), ('chick-fil-a'), ('chipotle'), ('subway'), ('starbucks'), ('panera')) AS t(m)
JOIN global_categories gc ON gc.name = 'Food & Grocery'
JOIN global_subcategories gs ON gs.category_id = gc.id AND gs.name = 'Restaurants';

-- Gas stations → Auto & Transportation / Gasoline
INSERT INTO global_merchants (merchant_name, default_category_id, default_subcategory_id, merchant_type)
SELECT m, gc.id, gs.id, 'national'
FROM (VALUES ('shell'), ('bp'), ('speedway'), ('marathon'), ('sunoco'), ('exxon')) AS t(m)
JOIN global_categories gc ON gc.name = 'Auto & Transportation'
JOIN global_subcategories gs ON gs.category_id = gc.id AND gs.name = 'Gasoline';

-- Amazon → Miscellaneous (intentionally ambiguous)
INSERT INTO global_merchants (merchant_name, default_category_id, default_subcategory_id, merchant_type)
SELECT 'amazon', gc.id, NULL, 'national'
FROM global_categories gc WHERE gc.name = 'Miscellaneous';

-- Pharmacies → Personal Care
INSERT INTO global_merchants (merchant_name, default_category_id, default_subcategory_id, merchant_type)
SELECT m, gc.id, NULL, 'national'
FROM (VALUES ('cvs'), ('walgreens'), ('rite aid')) AS t(m)
JOIN global_categories gc ON gc.name = 'Personal Care';

-- Streaming → Entertainment & Subscriptions / Streaming
INSERT INTO global_merchants (merchant_name, default_category_id, default_subcategory_id, merchant_type)
SELECT m, gc.id, gs.id, 'national'
FROM (VALUES ('netflix'), ('spotify'), ('hulu'), ('disney+'), ('apple')) AS t(m)
JOIN global_categories gc ON gc.name = 'Entertainment & Subscriptions'
JOIN global_subcategories gs ON gs.category_id = gc.id AND gs.name = 'Streaming';

-- Home improvement → Housing / Home Repair
INSERT INTO global_merchants (merchant_name, default_category_id, default_subcategory_id, merchant_type)
SELECT m, gc.id, gs.id, 'national'
FROM (VALUES ('home depot'), ('lowe''s')) AS t(m)
JOIN global_categories gc ON gc.name = 'Housing'
JOIN global_subcategories gs ON gs.category_id = gc.id AND gs.name = 'Home Repair';

-- Gyms → Health & Medical / Gym
INSERT INTO global_merchants (merchant_name, default_category_id, default_subcategory_id, merchant_type)
SELECT m, gc.id, gs.id, 'national'
FROM (VALUES ('planet fitness'), ('la fitness'), ('ymca')) AS t(m)
JOIN global_categories gc ON gc.name = 'Health & Medical'
JOIN global_subcategories gs ON gs.category_id = gc.id AND gs.name = 'Gym';

-- Phone carriers → Utilities / Phone
INSERT INTO global_merchants (merchant_name, default_category_id, default_subcategory_id, merchant_type)
SELECT m, gc.id, gs.id, 'national'
FROM (VALUES ('at&t'), ('verizon'), ('t-mobile')) AS t(m)
JOIN global_categories gc ON gc.name = 'Utilities'
JOIN global_subcategories gs ON gs.category_id = gc.id AND gs.name = 'Phone';

-- ─── User Tables ─────────────────────────────────────────────────────────────

CREATE TABLE user_custom_categories (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name                     text NOT NULL,
  parent_global_category_id uuid REFERENCES global_categories(id) ON DELETE SET NULL,
  created_at               timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE TABLE user_category_overrides (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_name               text NOT NULL,
  preferred_category_id       uuid REFERENCES global_categories(id) ON DELETE SET NULL,
  preferred_custom_category_id uuid REFERENCES user_custom_categories(id) ON DELETE SET NULL,
  preferred_subcategory_name  text,
  created_at                  timestamptz DEFAULT now(),
  UNIQUE(user_id, merchant_name)
);

CREATE TABLE user_transactions (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date                       date NOT NULL,
  merchant_name              text NOT NULL,
  description                text,
  amount                     numeric(10,2) NOT NULL,
  resolved_category_id       uuid REFERENCES global_categories(id) ON DELETE SET NULL,
  resolved_custom_category_id uuid REFERENCES user_custom_categories(id) ON DELETE SET NULL,
  resolved_subcategory_name  text,
  was_auto_categorized       boolean DEFAULT false,
  was_overridden_by_user     boolean DEFAULT false,
  created_at                 timestamptz DEFAULT now()
);

-- ─── Admin Table (no user access — service role only) ────────────────────────

CREATE TABLE categorization_flags (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_type               text NOT NULL, -- "new_merchant"|"unusual_mapping"|"new_category_candidate"|"subcategory_nomination"
  merchant_name           text,
  user_suggested_category text,
  user_suggested_subcategory text,
  existing_global_mapping text,
  occurrence_count        integer DEFAULT 1,
  status                  text DEFAULT 'pending', -- "pending"|"approved"|"rejected"|"merged"
  admin_notes             text,
  created_at              timestamptz DEFAULT now(),
  reviewed_at             timestamptz
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE global_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_custom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_category_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorization_flags ENABLE ROW LEVEL SECURITY;

-- Global tables: all authenticated users can read, nobody can write from client
CREATE POLICY "Authenticated read global_categories"
  ON global_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read global_subcategories"
  ON global_subcategories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read global_merchants"
  ON global_merchants FOR SELECT TO authenticated USING (true);

-- User tables: each user can only access their own rows
CREATE POLICY "Users manage own custom categories"
  ON user_custom_categories FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own overrides"
  ON user_category_overrides FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own transactions"
  ON user_transactions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- categorization_flags: no policies = no client access (service role only)
