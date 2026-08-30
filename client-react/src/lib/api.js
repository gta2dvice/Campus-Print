export async function apiFetch(path, options = {}) {
    const res = await fetch(path, { credentials: 'include', ...options });
    return res;
}

export async function apiJson(path, options = {}) {
    const res = await apiFetch(path, options);
    let data = null;
    try { data = await res.json(); } catch { /* no body */ }
    return { ok: res.ok, status: res.status, data };
}
