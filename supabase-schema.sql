-- Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to create the tables

-- Note: Supabase automatically handles JWT secrets and RLS

-- Users table (equivalent to Firestore 'users' collection)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  display_name TEXT,
  photo_url TEXT,
  bio TEXT,
  contact_info JSONB,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Calibrations table (equivalent to 'calibrations' collection)
CREATE TABLE calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type_id TEXT NOT NULL,
  answers JSONB,
  traits JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Oracle analyses table
CREATE TABLE oracle_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  input JSONB NOT NULL,
  result JSONB NOT NULL,
  scenario_summary TEXT
);

-- Feedback table
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  user_name TEXT,
  email TEXT,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'general', 'praise', 'suggestion', 'content', 'ui', 'performance')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  url TEXT,
  user_agent TEXT
);

-- Field reports table
CREATE TABLE field_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  type TEXT NOT NULL,
  scenario TEXT NOT NULL,
  action TEXT NOT NULL,
  result TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  likes INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0
);

-- Report likes table
CREATE TABLE report_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  report_id UUID REFERENCES field_reports(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, report_id)
);

-- Field report comments table
CREATE TABLE field_report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES field_reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Favorites table
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('type', 'guide', 'calibration')),
  category TEXT NOT NULL CHECK (category IN ('Personality', 'Content', 'Assessment')),
  title TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id)
);

-- Dossiers table
CREATE TABLE dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type_id TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('Intrigue', 'Arousal', 'Comfort', 'Devotion')),
  notes TEXT,
  last_interaction TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Advisor sessions table
CREATE TABLE advisor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Advisor messages table
CREATE TABLE advisor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES advisor_sessions(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'model')),
  content TEXT NOT NULL,
  image_urls JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Assessment results table
CREATE TABLE assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type_id TEXT NOT NULL,
  answers JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Verification codes table
CREATE TABLE verification_codes (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL CHECK (length(code) = 6),
  expires_at BIGINT NOT NULL
);

-- Public config table
CREATE TABLE public_config (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

-- Private config table (admin only)
CREATE TABLE private_config (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

-- Row Level Security Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies (equivalent to Firestore rules)
CREATE POLICY "Users can read/write their own data" ON users
  FOR ALL USING (auth.uid()::text = uid);

CREATE POLICY "Admins can read all user data" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE uid = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Users can manage their calibrations" ON calibrations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their oracle analyses" ON oracle_analyses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create feedback" ON feedback FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can read feedback" ON feedback FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND role = 'admin')
);

CREATE POLICY "Anyone can read field reports" ON field_reports FOR SELECT USING (true);
CREATE POLICY "Users can create field reports" ON field_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update their reports" ON field_reports FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can delete reports" ON field_reports FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND role = 'admin')
);

CREATE POLICY "Users can manage their likes" ON report_likes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read comments" ON field_report_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON field_report_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can delete their comments" ON field_report_comments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their favorites" ON favorites FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their dossiers" ON dossiers FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their advisor sessions" ON advisor_sessions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their advisor messages" ON advisor_messages FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their assessment results" ON assessment_results FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can manage verification codes" ON verification_codes FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public config is readable by all" ON public_config FOR SELECT USING (true);
CREATE POLICY "Admins can manage public config" ON public_config FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND role = 'admin')
);

CREATE POLICY "Admins can manage private config" ON private_config FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND role = 'admin')
);

-- Indexes for performance
CREATE INDEX idx_calibrations_user_id ON calibrations(user_id);
CREATE INDEX idx_oracle_analyses_user_id ON oracle_analyses(user_id);
CREATE INDEX idx_field_reports_user_id ON field_reports(user_id);
CREATE INDEX idx_report_likes_user_report ON report_likes(user_id, report_id);
CREATE INDEX idx_field_report_comments_report_id ON field_report_comments(report_id);
CREATE INDEX idx_favorites_user_content ON favorites(user_id, content_type, content_id);
CREATE INDEX idx_dossiers_user_id ON dossiers(user_id);
CREATE INDEX idx_advisor_sessions_user_id ON advisor_sessions(user_id);
CREATE INDEX idx_advisor_messages_session_id ON advisor_messages(session_id);
CREATE INDEX idx_assessment_results_user_id ON assessment_results(user_id);

-- Functions for atomic operations
CREATE OR REPLACE FUNCTION increment_likes(report_id UUID)
RETURNS void
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE field_reports SET likes = likes + 1 WHERE id = report_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_likes(report_id UUID)
RETURNS void
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE field_reports SET likes = likes - 1 WHERE id = report_id AND likes > 0;
END;
$$;