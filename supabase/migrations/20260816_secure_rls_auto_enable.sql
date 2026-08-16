-- Security hardening: the automatic RLS event-trigger function should never be callable through the Data API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
