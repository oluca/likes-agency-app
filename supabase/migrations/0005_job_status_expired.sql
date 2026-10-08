-- The render service deletes results after ~72 h and then reports status "expired".
alter type public.job_status add value if not exists 'expired';
