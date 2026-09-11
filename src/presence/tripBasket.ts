const KEY = "kidareh_presence_trip_v1";

function read(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw.map(String) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids.slice(0, 8)));
  window.dispatchEvent(new Event("kidareh-trip-change"));
}

export function listTripIds(): string[] {
  return read();
}

export function toggleTrip(id: string): string[] {
  const ids = read();
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  write(next);
  return next;
}

export function clearTrip() {
  write([]);
}

export function onTripChange(cb: () => void) {
  window.addEventListener("kidareh-trip-change", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("kidareh-trip-change", cb);
    window.removeEventListener("storage", cb);
  };
}
