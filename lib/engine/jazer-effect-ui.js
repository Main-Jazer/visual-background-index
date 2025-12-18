export function createJazerUI({
  title = 'Effect Controls',
  params = {},
  storageKey = `jazer:ui:${location.pathname}`,
  defaultOpen = true
} = {}) {
  const css = `
  #jazer-ui{position:fixed;top:12px;left:12px;z-index:9999;width:320px;color:#eaf0ff;
    font:12px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif}
  #jazer-ui *{box-sizing:border-box}
  #jazer-ui .panel{background:rgba(6,10,24,.78);border:1px solid rgba(150,190,255,.22);
    border-radius:14px;backdrop-filter:blur(14px);box-shadow:0 18px 60px rgba(0,0,0,.55);overflow:hidden}
  #jazer-ui .hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;
    border-bottom:1px solid rgba(150,190,255,.14)}
  #jazer-ui .ttl{font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px}
  #jazer-ui .btn{appearance:none;border:1px solid rgba(150,190,255,.18);background:rgba(255,255,255,.06);
    color:#eaf0ff;border-radius:10px;padding:6px 10px;cursor:pointer}
  #jazer-ui .btn:hover{background:rgba(255,255,255,.10)}
  #jazer-ui .body{padding:10px 12px;display:${defaultOpen ? 'block' : 'none'}}
  #jazer-ui .row{display:grid;grid-template-columns:1fr 140px;gap:10px;align-items:center;margin:10px 0}
  #jazer-ui .lbl{opacity:.86}
  #jazer-ui input[type="range"]{width:100%}
  #jazer-ui input[type="number"]{width:100%;padding:6px 8px;border-radius:10px;border:1px solid rgba(150,190,255,.18);
    background:rgba(0,0,0,.25);color:#eaf0ff}
  #jazer-ui input[type="color"]{width:100%;height:32px;border-radius:10px;border:1px solid rgba(150,190,255,.18);
    background:transparent;padding:0}
  #jazer-ui select{width:100%;padding:6px 8px;border-radius:10px;border:1px solid rgba(150,190,255,.18);
    background:rgba(0,0,0,.25);color:#eaf0ff}
  #jazer-ui .hint{opacity:.65;font-size:11px;margin-top:8px}
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'jazer-ui';
  root.innerHTML = `
    <div class="panel">
      <div class="hdr">
        <div class="ttl"></div>
        <button class="btn" type="button" data-act="toggle">U</button>
      </div>
      <div class="body"></div>
    </div>
  `;
  root.querySelector('.ttl').textContent = title;
  document.body.appendChild(root);

  const body = root.querySelector('.body');

  const safeParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  const stored = safeParse(localStorage.getItem(storageKey));
  if (stored && typeof stored === 'object') Object.assign(params, stored);

  const persist = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(params));
    } catch { }
  };

  const setOpen = (open) => {
    body.style.display = open ? 'block' : 'none';
  };

  const toggle = () => setOpen(body.style.display === 'none');

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act="toggle"]');
    if (btn) toggle();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'u' || e.key === 'U') toggle();
  });

  const normalizeBinding = (a, b) => {
    if (a && typeof a.get === 'function' && typeof a.set === 'function') return a;
    return {
      get: () => a[b],
      set: (v) => { a[b] = v; }
    };
  };

  const addRow = (label) => {
    const row = document.createElement('div');
    row.className = 'row';
    const lbl = document.createElement('div');
    lbl.className = 'lbl';
    lbl.textContent = label;
    const slot = document.createElement('div');
    row.appendChild(lbl);
    row.appendChild(slot);
    body.appendChild(row);
    return slot;
  };

  const slider = (a, b, opts = {}) => {
    const { label = b, min = 0, max = 1, step = 0.01 } = opts;
    const bind = normalizeBinding(a, b);
    const slot = addRow(label);

    const wrap = document.createElement('div');
    wrap.style.display = 'grid';
    wrap.style.gridTemplateColumns = '1fr 70px';
    wrap.style.gap = '8px';

    const range = document.createElement('input');
    range.type = 'range';
    range.min = String(min);
    range.max = String(max);
    range.step = String(step);

    const num = document.createElement('input');
    num.type = 'number';
    num.min = String(min);
    num.max = String(max);
    num.step = String(step);

    const sync = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return;
      range.value = String(n);
      num.value = String(n);
      bind.set(n);
      persist();
    };

    const initial = Number(bind.get());
    sync(Number.isFinite(initial) ? initial : min);

    range.addEventListener('input', () => sync(range.value));
    num.addEventListener('input', () => sync(num.value));

    wrap.appendChild(range);
    wrap.appendChild(num);
    slot.appendChild(wrap);
  };

  const checkbox = (a, b, opts = {}) => {
    const { label = b } = opts;
    const bind = normalizeBinding(a, b);
    const slot = addRow(label);

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(bind.get());
    input.addEventListener('change', () => {
      bind.set(input.checked);
      persist();
    });
    slot.appendChild(input);
  };

  const color = (a, b, opts = {}) => {
    const { label = b } = opts;
    const bind = normalizeBinding(a, b);
    const slot = addRow(label);

    const input = document.createElement('input');
    input.type = 'color';

    const v0 = bind.get();
    input.value = (typeof v0 === 'string' && /^#([0-9a-f]{6})$/i.test(v0)) ? v0 : '#ffffff';

    input.addEventListener('input', () => {
      bind.set(input.value);
      persist();
    });
    slot.appendChild(input);
  };

  const select = (a, b, opts = {}) => {
    const { label = b, options = [] } = opts;
    const bind = normalizeBinding(a, b);
    const slot = addRow(label);

    const input = document.createElement('select');
    for (const opt of options) {
      const o = document.createElement('option');
      if (typeof opt === 'string') {
        o.value = opt;
        o.textContent = opt;
      } else {
        o.value = String(opt.value);
        o.textContent = opt.label ?? String(opt.value);
      }
      input.appendChild(o);
    }

    input.value = String(bind.get() ?? (options[0]?.value ?? options[0] ?? ''));
    input.addEventListener('change', () => {
      bind.set(input.value);
      persist();
    });
    slot.appendChild(input);
  };

  const button = (label, onClick) => {
    const slot = addRow(label);
    const b = document.createElement('button');
    b.className = 'btn';
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', () => onClick?.());
    slot.appendChild(b);
  };

  const hint = (text) => {
    const el = document.createElement('div');
    el.className = 'hint';
    el.textContent = text;
    body.appendChild(el);
  };

  return {
    root,
    params,
    persist,
    slider,
    checkbox,
    color,
    select,
    button,
    hint,
    setOpen,
    toggle
  };
}

