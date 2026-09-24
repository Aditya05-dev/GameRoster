export const API = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
let accessToken = sessionStorage.getItem("accessToken") || "";
let refreshPromise;
export const setAccessToken = (t) => {
  accessToken = t || "";
  t
    ? sessionStorage.setItem("accessToken", t)
    : sessionStorage.removeItem("accessToken");
};
async function refresh() {
  if (!refreshPromise)
    refreshPromise = fetch(`${API}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) {
          setAccessToken("");
          return false;
        }
        setAccessToken((await r.json()).accessToken);
        return true;
      })
      .finally(() => {
        refreshPromise = null;
      });
  return refreshPromise;
}
async function request(
  path,
  { method = "GET", body, auth = true, retry = true, signal } = {},
) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const r = await fetch(`${API}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  if (r.status === 401 && auth && retry && (await refresh()))
    return request(path, { method, body, auth, retry: false, signal });
  if (r.status === 204) return null;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const detail = data.details?.map((d) => d.message).join(" ");
    throw Object.assign(
      new Error(detail || data.error || `Request failed (${r.status})`),
      { status: r.status, data },
    );
  }
  return data;
}
export const api = {
  get: (p, o) => request(p, o),
  post: (p, b, o) => request(p, { ...o, method: "POST", body: b }),
  put: (p, b, o) => request(p, { ...o, method: "PUT", body: b }),
  patch: (p, b, o) => request(p, { ...o, method: "PATCH", body: b }),
  del: (p, o) => request(p, { ...o, method: "DELETE" }),
};
export function safeLink(url) {
  try {
    return ["https:", "http:"].includes(new URL(url).protocol) ? url : null;
  } catch {
    return null;
  }
}
