const DATABASE = "placement-helper-local-files";
const STORE = "files";

type StoredFile = { key: string; name: string; type: string; blob: Blob; updatedAt: string };

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Local file storage is not available in this browser."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local file storage."));
  });
}

export async function saveLocalFile(key: string, file: File) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put({ key, name: file.name, type: file.type, blob: file, updatedAt: new Date().toISOString() } satisfies StoredFile);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the file."));
  });
  database.close();
}

export async function getLocalFile(key: string): Promise<StoredFile | null> {
  const database = await openDatabase();
  const file = await new Promise<StoredFile | null>((resolve, reject) => {
    const request = database.transaction(STORE, "readonly").objectStore(STORE).get(key);
    request.onsuccess = () => resolve((request.result as StoredFile | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Could not read the file."));
  });
  database.close();
  return file;
}

export async function removeLocalFile(key: string) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not remove the file."));
  });
  database.close();
}

export async function downloadLocalFile(key: string) {
  const stored = await getLocalFile(key);
  if (!stored) throw new Error("This file is not stored in this browser. Upload it again to access it here.");
  const url = URL.createObjectURL(stored.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = stored.name;
  anchor.click();
  URL.revokeObjectURL(url);
}
