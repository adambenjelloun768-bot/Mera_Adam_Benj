const BACKENDS = [
  'https://mon-backend.vercel.app',   // principal
  'https://mon-backend.workers.dev',  // secours
];

const TIMEOUT_MS = 5000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export async function apiFetch(path, options = {}) {
  let lastError;

  for (const base of BACKENDS) {
    try {
      return await fetchWithTimeout(base + path, options);
    } catch (err) {
      console.warn(`Échec sur ${base} :`, err.message);
      lastError = err;
    }
  }

  throw lastError;
}