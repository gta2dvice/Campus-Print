import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BUCKET = Deno.env.get('SUPABASE_STORAGE_BUCKET') || 'uploaded-pdfs';
const TTL_MS = 24 * 60 * 60 * 1000;

function isSafePath(storagePath) {
  if (!storagePath || typeof storagePath !== 'string') return false;
  const normalized = storagePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return Boolean(normalized) && !normalized.includes('..');
}

Deno.serve(async (req) => {
  try {
    const cronSecret = Deno.env.get('CRON_SECRET');
    const auth = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (cronSecret && auth !== cronSecret) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ message: 'Missing Supabase credentials' }), { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const cutoff = new Date(Date.now() - TTL_MS).toISOString();
    const { data: rows, error: selectError } = await supabase
      .from('order_files')
      .select('id, storage_path')
      .not('storage_path', 'is', null)
      .is('file_deleted_at', null)
      .lt('created_at', cutoff);

    if (selectError) throw selectError;

    const deletedIds = [];
    const skipped = [];

    for (const row of rows || []) {
      if (!isSafePath(row.storage_path)) {
        skipped.push(row.id);
        continue;
      }
      const { error: removeError } = await supabase.storage.from(BUCKET).remove([row.storage_path]);
      if (removeError && !/not found|404/i.test(removeError.message || '')) {
        skipped.push(row.id);
        continue;
      }
      const { error: updateError } = await supabase
        .from('order_files')
        .update({ storage_path: null, file_deleted_at: new Date().toISOString() })
        .eq('id', row.id)
        .is('file_deleted_at', null);
      if (updateError) {
        skipped.push(row.id);
        continue;
      }
      deletedIds.push(row.id);
    }

    return new Response(JSON.stringify({
      ok: true,
      bucket: BUCKET,
      cutoff,
      examined: (rows || []).length,
      deleted: deletedIds.length,
      skipped: skipped.length
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message || 'Cleanup failed' }), { status: 500 });
  }
});
