-- Row Level Security für alle Anwendungstabellen im public-Schema.
--
-- Hintergrund:
-- Die Next.js-App greift ausschließlich serverseitig über DATABASE_URL (postgres.js) zu.
-- Es gibt keinen Supabase Browser Client (supabase-js) und keine PostgREST-Policies.
--
-- Wirkung:
-- - PostgREST / Supabase API (Rollen anon, authenticated): kein Zugriff (keine Policies).
-- - Server-Connection (Rolle postgres mit BYPASSRLS): unverändert, App funktioniert weiter.
--
-- Keine Policies anlegen – absichtlich restriktiv.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_course_provisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_content_provisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_policy_acceptances ENABLE ROW LEVEL SECURITY;
