export async function apiFetch(path, options = {}) {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const fullPath = path.startsWith('http') ? path : `${baseUrl}${path}`;
    const res = await fetch(fullPath, { credentials: 'include', ...options });
    return res;
}

export async function apiJson(path, options = {}) {
    const res = await apiFetch(path, options);
    let data = null;
    try { data = await res.json(); } catch { /* no body */ }
    return { ok: res.ok, status: res.status, data };
}
