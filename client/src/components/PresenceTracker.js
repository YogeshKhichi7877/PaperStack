import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { API_URL } from '../config/appConfig';

const randomId = () => window.crypto.randomUUID();
export function presenceIsActive(lastInteraction, now = Date.now()) {
  return document.visibilityState !== 'hidden' && now - lastInteraction < 5 * 60 * 1000;
}
// One instance at the router root. A fresh document ID avoids duplicate-tab
// sessionStorage cloning; abandoned documents expire after 90 seconds.
export default function PresenceTracker({ user, isAdmin }) {
  const location = useLocation();
  const state = useRef({ sessionId: '', anonymousId: '', lastInteraction: Date.now(), lastSent: 0 });
  const route = useRef(location);
  route.current = location;
  useEffect(() => {
    const current = state.current;
    try {
      current.sessionId ||= randomId();
      current.anonymousId = localStorage.getItem('ps-presence-browser') || randomId();
      localStorage.setItem('ps-presence-browser', current.anonymousId);
    } catch { return undefined; }
    let controller;
    let inFlight = false;
    const send = (force = false) => {
      if (inFlight || !presenceIsActive(current.lastInteraction) || (!force && Date.now() - current.lastSent < 10000)) return;
      current.lastSent = Date.now();
      let token;
      try { token = isAdmin ? sessionStorage.getItem('adminToken') : localStorage.getItem('token'); } catch { return; }
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      inFlight = true;
      // Only pass an explicit code, never free-text class notes or query strings.
      const subjectCode = new URLSearchParams(route.current.search).get('subjectCode') || undefined;
      fetch(`${API_URL}/api/presence/heartbeat`, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(isAdmin ? { 'X-Presence-Admin': '1' } : {}) },
        body: JSON.stringify({ sessionId: current.sessionId, anonymousId: current.anonymousId, route: route.current.pathname, subjectCode }),
      }).catch(() => {}).finally(() => { clearTimeout(timeout); inFlight = false; });
    };
    const activity = () => { const idle = !presenceIsActive(current.lastInteraction); current.lastInteraction = Date.now(); if (idle) send(); };
    const visible = () => { if (document.visibilityState !== 'hidden') { current.lastInteraction = Date.now(); send(true); } };
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, activity, { passive: true }));
    document.addEventListener('visibilitychange', visible);
    const timer = setInterval(() => send(), 30000);
    send(true);
    return () => { clearInterval(timer); controller?.abort(); events.forEach((event) => window.removeEventListener(event, activity)); document.removeEventListener('visibilitychange', visible); };
  }, [user?._id, user?.username, isAdmin]);
  return null;
}
