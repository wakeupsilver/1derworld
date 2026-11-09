// Talks to server.py when it's running locally; falls back to the files tools/export.py writes for the
// public (static) copy, so the same page works on GitHub Pages.
let STATIC = false;

export async function loadProjects() {
  try {
    const r = await fetch('/api/projects');
    if (r.ok && (r.headers.get('content-type') || '').includes('json')) return await r.json();
  } catch { /* no server */ }
  STATIC = true;
  return (await fetch('api/projects.json')).json();
}
export const isStatic = () => STATIC;
export const codeUrl = id => (STATIC ? `api/code/${id}.txt` : `/api/code/${id}`);
export async function launchInfo(p) {
  if (STATIC) return { url: p.launch, up: true, kind: p.kind };
  return (await fetch(`/api/launch/${p.id}`)).json();
}
