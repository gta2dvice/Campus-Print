const { downloadFile } = require('./storage');

async function sendStoredFile(res, file, { download = false } = {}) {
    if (!file) return res.status(404).json({ message: 'File not found' });
    if (file.file_deleted_at || !file.storage_path) {
        return res.status(410).json({ message: 'This file has expired and is no longer available.' });
    }

    const buffer = await downloadFile(file.storage_path);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader(
        'Content-Disposition',
        `${download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(file.original_name)}"`
    );
    return res.send(buffer);
}

module.exports = { sendStoredFile };
