/**
 * Isomorphic (SSR-safe) Firestore REST reader.
 *
 * The Firebase JS SDK relies on browser transports, so for server-side
 * rendering (head tags, JSON-LD, sitemap) we read the same public collections
 * through the Firestore REST API with plain `fetch`.
 */

const PROJECT_ID = "luo-music-store-8a23d";
const API_KEY = "AIzaSyBfCLdqhyNws2-3ZidKMGKXNweG0-6kks0";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

type FirestoreValue = Record<string, unknown>;

function decodeValue(value: FirestoreValue): unknown {
  if (value == null) return null;
  if ("stringValue" in value) return value["stringValue"];
  if ("integerValue" in value) return Number(value["integerValue"]);
  if ("doubleValue" in value) return Number(value["doubleValue"]);
  if ("booleanValue" in value) return value["booleanValue"];
  if ("timestampValue" in value) return value["timestampValue"];
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    const arr = (value["arrayValue"] as { values?: FirestoreValue[] })?.values ?? [];
    return arr.map(decodeValue);
  }
  if ("mapValue" in value) {
    return decodeFields((value["mapValue"] as { fields?: Record<string, FirestoreValue> })?.fields);
  }
  return null;
}

function decodeFields(fields?: Record<string, FirestoreValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields ?? {})) {
    out[key] = decodeValue(value);
  }
  return out;
}

function idFromName(name: string): string {
  return name.split("/").pop() ?? "";
}

export async function restGetDoc<T = Record<string, unknown>>(
  collection: string,
  id: string,
): Promise<(T & { id: string }) | null> {
  try {
    const res = await fetch(`${BASE}/${collection}/${encodeURIComponent(id)}?key=${API_KEY}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { name?: string; fields?: Record<string, FirestoreValue> };
    if (!json.name) return null;
    return { id, ...(decodeFields(json.fields) as T) };
  } catch {
    return null;
  }
}

export async function restListDocs<T = Record<string, unknown>>(
  collection: string,
  pageSize = 300,
): Promise<Array<T & { id: string }>> {
  const out: Array<T & { id: string }> = [];
  let pageToken: string | undefined;
  try {
    do {
      const url = new URL(`${BASE}/${collection}`);
      url.searchParams.set("key", API_KEY);
      url.searchParams.set("pageSize", String(pageSize));
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const res = await fetch(url.toString());
      if (!res.ok) break;
      const json = (await res.json()) as {
        documents?: Array<{ name: string; fields?: Record<string, FirestoreValue> }>;
        nextPageToken?: string;
      };
      for (const doc of json.documents ?? []) {
        out.push({ id: idFromName(doc.name), ...(decodeFields(doc.fields) as T) });
      }
      pageToken = json.nextPageToken;
    } while (pageToken && out.length < 5000);
  } catch {
    /* return whatever was collected */
  }
  return out;
}
