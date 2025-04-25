/* Cloud Run 起動時に %%…%% を置き換えて env.js として出力されます */
window.__ENV = {
    SUPABASE_URL:       "%%SUPABASE_URL%%",
    SUPABASE_ANON_KEY:  "%%SUPABASE_ANON_KEY%%"
  };
  