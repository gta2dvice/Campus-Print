const path = require('path');
const { getServiceClient, STORAGE_BUCKET } = require('./supabaseClient');

function assertSafeStoragePath(storagePath) {
    if (!storagePath || typeof storagePath !== 'string') {
        throw new Error('Invalid storage path');
    }
    const normalized = storagePath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized || normalized.includes('..') || normalized.startsWith('/')) {
        throw new Error('Invalid storage path');
    }
    return normalized;
}

async function uploadBuffer({ storagePath, buffer, contentType }) {
    const safePath = assertSafeStoragePath(storagePath);
    const supabase = getServiceClient();
    const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(safePath, buffer, {
            contentType: contentType || 'application/octet-stream',
            upsert: false
        });
    if (error) throw error;
    return { bucket: STORAGE_BUCKET, storagePath: safePath };
}

async function downloadFile(storagePath) {
    const safePath = assertSafeStoragePath(storagePath);
    const supabase = getServiceClient();
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(safePath);
    if (error) throw error;
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

async function deleteFiles(storagePaths) {
    const supabase = getServiceClient();
    const safe = storagePaths.map(assertSafeStoragePath).filter(Boolean);
    if (safe.length === 0) return { deleted: [] };
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).remove(safe);
    if (error) throw error;
    return { deleted: data || safe };
}

function buildObjectPath(userId, orderId, originalName) {
    const ext = path.extname(originalName || '').slice(0, 10) || '.bin';
    const unique = `${Date.now()}-${require('crypto').randomBytes(16).toString('hex')}${ext}`;
    return {
        storedName: unique,
        storagePath: `${userId}/${orderId}/${unique}`
    };
}

module.exports = {
    STORAGE_BUCKET,
    uploadBuffer,
    downloadFile,
    deleteFiles,
    buildObjectPath,
    assertSafeStoragePath
};
