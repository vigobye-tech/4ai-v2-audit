import { invoke } from '@tauri-apps/api/tauri';

export function initDropZone() {
  const dropZone = document.body;
  console.log('[Drop] listener podpięty');

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[Drop] drag-over');
  }, { capture: true });

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[Drop] drop-event');
    if (!e.dataTransfer) return;

    // Dziennik: co faktycznie trafia do eventu
    console.log('[Drop] dataTransfer.items', [...e.dataTransfer.items]);
    console.log('[Drop] dataTransfer.files', [...e.dataTransfer.files]);

    // Akceptujemy tylko pliki (nie foldery)
    const files = [...e.dataTransfer.files] as File[];
    const paths = files
      .map(f => (f as File & { path?: string }).path)
      .filter(Boolean);

    if (paths.length === 0) {
      console.warn('[Drop] Brak ścieżek – przeciągnij konkretne pliki .ts/.tsx');
      return;
    }

    const list = await invoke<string[]>('process_dropped', { paths });
    console.log('[Drop] odpowiedź Rust:', list);
  }, { capture: true });

  // Obsługa potencjalnych overlayów Reactowych
  document.querySelectorAll('.overlay, .modal, .panel').forEach(el => {
    el.addEventListener('dragover',  e => { e.preventDefault(); e.stopPropagation(); }, { capture: true });
    el.addEventListener('drop',      e => { e.preventDefault(); e.stopPropagation(); }, { capture: true });
  });
}
