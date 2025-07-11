const API_URL = import.meta.env.VITE_API_BASE_URL;

const res = await fetch(`${API_URL}/api/match/start`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ word }),
});