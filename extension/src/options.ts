import { DEFAULT_APP_ORIGIN, normalizeAppOrigin } from "../../shared/extensionBadge";

const STORAGE_KEY = "appOrigin";

async function load(): Promise<void> {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  const input = document.getElementById("appOrigin") as HTMLInputElement | null;
  if (!input) return;
  input.value = normalizeAppOrigin(
    typeof stored[STORAGE_KEY] === "string" ? stored[STORAGE_KEY] : DEFAULT_APP_ORIGIN
  );
}

async function save(): Promise<void> {
  const input = document.getElementById("appOrigin") as HTMLInputElement | null;
  const status = document.getElementById("status");
  if (!input) return;
  const origin = normalizeAppOrigin(input.value);
  input.value = origin;
  await chrome.storage.sync.set({ [STORAGE_KEY]: origin });
  if (status) status.textContent = "Saved.";
}

document.getElementById("save")?.addEventListener("click", () => {
  void save();
});

void load();
