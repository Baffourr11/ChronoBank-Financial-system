-- Supabase Auth + RLS + budgets (run after 002_intelligence_layer.sql)

-- Sync auth.users -> public.users profile row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, preferences)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(
      NEW.raw_user_meta_data->'preferences',
      '{"currency":"USD","timezone":"UTC","theme":"light"}'::jsonb
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  limit_amount NUMERIC NOT NULL CHECK (limit_amount >= 0),
  period TEXT NOT NULL CHECK (period IN ('monthly', 'yearly')),
  alert_threshold INTEGER NOT NULL DEFAULT 80 CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_dataset_id ON budgets(dataset_id);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Users
DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own ON users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS users_insert_own ON users;
CREATE POLICY users_insert_own ON users FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users FOR UPDATE USING (auth.uid() = id);

-- Datasets
DROP POLICY IF EXISTS datasets_all_own ON datasets;
CREATE POLICY datasets_all_own ON datasets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Accounts
DROP POLICY IF EXISTS accounts_all_own ON accounts;
CREATE POLICY accounts_all_own ON accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Transactions
DROP POLICY IF EXISTS transactions_all_own ON transactions;
CREATE POLICY transactions_all_own ON transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Rules
DROP POLICY IF EXISTS rules_all_own ON rules;
CREATE POLICY rules_all_own ON rules
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Rule executions
DROP POLICY IF EXISTS rule_executions_all_own ON rule_executions;
CREATE POLICY rule_executions_all_own ON rule_executions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Alerts
DROP POLICY IF EXISTS alerts_all_own ON alerts;
CREATE POLICY alerts_all_own ON alerts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Predictions
DROP POLICY IF EXISTS predictions_all_own ON predictions;
CREATE POLICY predictions_all_own ON predictions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Recommendations
DROP POLICY IF EXISTS recommendations_all_own ON recommendations;
CREATE POLICY recommendations_all_own ON recommendations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Behavior patterns
DROP POLICY IF EXISTS behavior_patterns_all_own ON behavior_patterns;
CREATE POLICY behavior_patterns_all_own ON behavior_patterns
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Budgets
DROP POLICY IF EXISTS budgets_all_own ON budgets;
CREATE POLICY budgets_all_own ON budgets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
