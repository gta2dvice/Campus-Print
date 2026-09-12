require('./loadEnv');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploaded-pdfs';

function getServiceClient() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set on the server');
    }
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
}

module.exports = { getServiceClient, STORAGE_BUCKET };
