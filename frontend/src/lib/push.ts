// ─── Web Push client helpers (free — VAPID + service worker) ──────────────────

import { getVapidPublicKey, subscribePush, unsubscribePush } from "@/lib/api";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js");
}

export type EnableResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "server-disabled" | "denied" | "error" };

/** Register the SW, request permission, subscribe, and sync to the backend. */
export async function enablePush(repoIds: number[], threshold: number): Promise<EnableResult> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };

  let info;
  try {
    info = await getVapidPublicKey();
  } catch {
    return { ok: false, reason: "error" };
  }
  if (!info.enabled || !info.public_key) return { ok: false, reason: "server-disabled" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  try {
    const reg = await getRegistration();
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(info.public_key) as BufferSource,
      });
    }
    await syncFromSubscription(sub, repoIds, threshold);
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Push the current watchlist + threshold to the backend if already subscribed. */
export async function syncPush(repoIds: number[], threshold: number): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await syncFromSubscription(sub, repoIds, threshold);
}

async function syncFromSubscription(sub: PushSubscription, repoIds: number[], threshold: number) {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys) return;
  await subscribePush({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    repo_ids: repoIds,
    threshold,
  });
}

/** True if this browser already has an active push subscription. */
export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return !!sub;
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  const json = sub.toJSON();
  try {
    if (json.endpoint) await unsubscribePush(json.endpoint);
  } finally {
    await sub.unsubscribe();
  }
}
