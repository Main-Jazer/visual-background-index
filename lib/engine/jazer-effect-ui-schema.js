import { createJazerUI } from './jazer-effect-ui.js';

function isPlainObject(v) {
  return v && typeof v === 'object' && (v.constructor === Object || Object.getPrototypeOf(v) === null);
}

function parsePath(path) {
  const tokens = [];
  const re = /([^[.\]]+)|\[(\d+)\]/g;
  let m;
  while ((m = re.exec(path)) !== null) {
    tokens.push(m[1] ?? Number(m[2]));
  }
  return tokens;
}

function resolveRef(roots, ref) {
  const tokens = parsePath(ref);
  if (!tokens.length) return null;
  const rootKey = tokens[0];
  if (!(rootKey in roots)) return null;
  let obj = roots[rootKey];
  for (let i = 1; i < tokens.length - 1; i++) {
    if (obj == null) return null;
    obj = obj[tokens[i]];
  }
  const last = tokens[tokens.length - 1];
  return { obj, key: last };
}

function coerceSet(current, next) {
  if (current && typeof current.set === 'function') {
    current.set(next);
    return { handled: true };
  }
  if (typeof current === 'number') return { value: Number(next) };
  if (typeof current === 'boolean') return { value: Boolean(next) };
  return { value: next };
}

function getColorString(v) {
  if (typeof v === 'string' && /^#([0-9a-f]{6})$/i.test(v)) return v;
  if (v && typeof v.getHexString === 'function') return `#${v.getHexString()}`;
  return '#ffffff';
}

function setColorValue(target, next) {
  if (target && typeof target.set === 'function') {
    target.set(next);
    return;
  }
  return next;
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((o) => {
    if (typeof o === 'string' || typeof o === 'number') return { label: String(o), value: o };
    if (isPlainObject(o) && 'value' in o) return { label: o.label ?? String(o.value), value: o.value };
    return null;
  }).filter(Boolean);
}

export function attachEffectUI({
  title = document.title,
  schemaUrl,
  schemaBaseUrl,
  namespace = '__JAZER_EFFECT__',
  defaultOpen = true
} = {}) {
  const effectRoot = window[namespace] ?? {};
  window[namespace] = effectRoot;

  const uiParams = {};
  const ui = createJazerUI({
    title,
    params: uiParams,
    storageKey: `jazer:ui:${location.pathname}`,
    defaultOpen
  });

  const expose = (key, value) => {
    effectRoot[key] = value;
    return value;
  };

  const roots = {
    effect: effectRoot,
    params: ui.params
  };

  const ensureDefaults = (defaults) => {
    if (!isPlainObject(defaults)) return;
    for (const [k, v] of Object.entries(defaults)) {
      if (ui.params[k] === undefined) ui.params[k] = v;
    }
  };

  const installDefaultActions = (defaults) => {
    if (!isPlainObject(defaults)) defaults = {};

    if (typeof effectRoot.resetParams !== 'function') {
      effectRoot.resetParams = () => {
        for (const [k, v] of Object.entries(defaults)) ui.params[k] = v;
        ui.persist();
      };
    }

    // Common expectation across schemas: `reset` exists.
    // Effects can override later via `expose('reset', fn)`.
    if (typeof effectRoot.reset !== 'function') {
      effectRoot.reset = () => effectRoot.resetParams?.();
    }
  };

  const hudCss = `
  #jazer-help{position:fixed;bottom:20px;left:20px;z-index:10000;max-width:360px;
    background:rgba(2,0,16,.92);border:1px solid rgba(100,120,180,.3);border-radius:8px;
    padding:16px 20px;font-family:"SF Mono","Consolas",monospace;font-size:11px;line-height:1.7;
    color:rgba(180,190,220,.9);backdrop-filter:blur(8px);opacity:0;pointer-events:none;
    transition:opacity .3s ease}
  #jazer-help.visible{opacity:1;pointer-events:auto}
  #jazer-help h3{color:rgba(200,180,120,.9);font-size:10px;text-transform:uppercase;letter-spacing:.15em;margin:0 0 12px}
  #jazer-help .key{display:inline-block;background:rgba(60,80,140,.3);padding:2px 6px;border-radius:3px;
    margin-right:4px;color:rgba(160,180,255,.9)}
  #jazer-help .val{color:rgba(120,200,180,.9);float:right}
  `;

  const ensureStyleOnce = (id, cssText) => {
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = cssText;
    document.head.appendChild(style);
  };

  const formatValue = (v, fmt) => {
    if (v == null) return '';
    if (!fmt) return String(v);
    if (fmt === 'fixed1') return Number(v).toFixed(1);
    if (fmt === 'fixed2') return Number(v).toFixed(2);
    if (fmt === 'int') return String(Math.round(Number(v)));
    if (fmt === 'onoff') return v ? 'ON' : 'OFF';
    if (fmt === 'pct') return `${Math.round(Number(v) * 100)}%`;
    if (fmt === 'sec') return `${Math.round(Number(v) * 10) / 10}s`;
    return String(v);
  };

  const createHud = ({ title: hudTitle, toggleKey = 'h', visible = false, items = [] }) => {
    ensureStyleOnce('jazer-help-style', hudCss);
    const el = document.createElement('div');
    el.id = 'jazer-help';
    el.innerHTML = `<h3></h3><div data-body></div>`;
    el.querySelector('h3').textContent = hudTitle || `${title} — Controls`;
    document.body.appendChild(el);
    if (visible) el.classList.add('visible');

    const body = el.querySelector('[data-body]');
    const rows = [];

    const renderRow = (item) => {
      const line = document.createElement('div');
      const keys = Array.isArray(item.keys) ? item.keys : [item.key].filter(Boolean);
      for (const k of keys) {
        const s = document.createElement('span');
        s.className = 'key';
        s.textContent = String(k);
        line.appendChild(s);
      }
      line.appendChild(document.createTextNode(` ${item.label ?? ''}`));
      const val = document.createElement('span');
      val.className = 'val';
      line.appendChild(val);
      body.appendChild(line);
      rows.push({ item, val });
    };

    for (const item of items) renderRow(item);

    const update = () => {
      for (const { item, val } of rows) {
        if (item.action) {
          val.textContent = '';
          continue;
        }
        if (!item.bind) {
          val.textContent = '';
          continue;
        }
        const resolved = resolveRef(roots, String(item.bind));
        const cur = resolved?.obj?.[resolved.key];
        const v = (cur && typeof cur.get === 'function') ? cur.get() : cur;
        val.textContent = formatValue(v, item.format);
      }
    };

    const toggle = () => el.classList.toggle('visible');

    const onKey = (e) => {
      if (e.defaultPrevented) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      const k = (e.key || '').toLowerCase();
      if (k === String(toggleKey).toLowerCase()) {
        toggle();
        return;
      }

      for (const item of items) {
        const keys = (Array.isArray(item.keys) ? item.keys : [item.key]).filter(Boolean).map((x) => String(x).toLowerCase());
        const idx = keys.indexOf(k);
        if (idx === -1) continue;

        if (item.action) {
          const fn = effectRoot[item.action];
          if (typeof fn === 'function') fn();
          update();
          return;
        }

        if (!item.bind) return;
        const resolved = resolveRef(roots, String(item.bind));
        if (!resolved || !resolved.obj) return;

        const cur0 = resolved.obj[resolved.key];
        const cur = (cur0 && typeof cur0.get === 'function') ? cur0.get() : cur0;

        if (item.type === 'toggle' || typeof cur === 'boolean') {
          resolved.obj[resolved.key] = !Boolean(cur);
          ui.persist();
          update();
          return;
        }

        const step = Number(item.step ?? 0.1);
        const dir = (keys.length >= 2 && idx === 0) ? -1 : 1;
        let next = Number(cur) + dir * step;
        if (item.min !== undefined) next = Math.max(Number(item.min), next);
        if (item.max !== undefined) next = Math.min(Number(item.max), next);

        const coerced = coerceSet(cur0, next);
        if (!coerced.handled) resolved.obj[resolved.key] = coerced.value;
        ui.persist();
        update();
        return;
      }
    };

    window.addEventListener('keydown', onKey);
    const interval = window.setInterval(() => {
      if (el.classList.contains('visible')) update();
    }, 250);

    update();

    return {
      el,
      update,
      dispose: () => {
        window.removeEventListener('keydown', onKey);
        window.clearInterval(interval);
        el.remove();
      }
    };
  };

  const applyControl = (ctl) => {
    if (!ctl || typeof ctl !== 'object') return;
    const { type, label, bind } = ctl;
    if (!type || !bind) return;

    const ref = String(bind);

    const binding = {
      get: () => {
        const resolved = resolveRef(roots, ref);
        if (!resolved || !resolved.obj) return undefined;
        const cur = resolved.obj[resolved.key];
        if (cur && typeof cur.get === 'function') return cur.get();
        return cur;
      },
      set: (v) => {
        const resolved = resolveRef(roots, ref);
        if (!resolved || !resolved.obj) return;

        const cur = resolved.obj[resolved.key];
        if (type === 'color') {
          const out = setColorValue(cur, v);
          if (out !== undefined) resolved.obj[resolved.key] = out;
          ui.persist();
          return;
        }
        let next = v;
        if (ctl.valueType === 'number') next = Number(v);
        if (ctl.valueType === 'boolean') next = Boolean(v);

        const coerced = coerceSet(cur, next);
        if (coerced.handled) {
          ui.persist();
          return;
        }
        resolved.obj[resolved.key] = coerced.value;
        ui.persist();
      }
    };

    if (type === 'slider') {
      ui.slider(binding, null, {
        label: label ?? bind,
        min: ctl.min ?? 0,
        max: ctl.max ?? 1,
        step: ctl.step ?? 0.01
      });
    } else if (type === 'checkbox') {
      ui.checkbox(binding, null, { label: label ?? bind });
    } else if (type === 'color') {
      const colorBinding = {
        get: () => getColorString(binding.get()),
        set: (v) => binding.set(v)
      };
      ui.color(colorBinding, null, { label: label ?? bind });
    } else if (type === 'select') {
      ui.select(binding, null, {
        label: label ?? bind,
        options: normalizeOptions(ctl.options)
      });
    } else if (type === 'button') {
      const action = ctl.action;
      if (typeof action === 'string') {
        ui.button(label ?? action, () => {
          const fn = effectRoot[action];
          if (typeof fn === 'function') fn();
        });
      }
    }
  };

  const loadSchema = async () => {
    let url = schemaUrl;
    if (!url && schemaBaseUrl) {
      const base = String(schemaBaseUrl);
      const effectFile = location.pathname.split('/').pop() || 'effect.html';
      const name = effectFile.replace(/\.html$/i, '');
      url = new URL(`${base.replace(/\/?$/, '/')}${name}.ui.json`, location.href);
    }

    if (!url) {
      ui.hint('No UI schema configured.');
      return;
    }

    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) {
        ui.hint(`No schema: ${String(url).split('/').pop()}`);
        return;
      }
      const schema = await res.json();
      ensureDefaults(schema?.defaults);
      installDefaultActions(schema?.defaults);
      const controls = Array.isArray(schema?.controls) ? schema.controls : [];
      for (const ctl of controls) applyControl(ctl);
      if (Array.isArray(schema?.hotkeys)) {
        const hud = isPlainObject(schema?.hud) ? schema.hud : {};
        createHud({
          title: hud.title ?? schema.title ?? title,
          toggleKey: hud.toggleKey ?? 'h',
          visible: Boolean(hud.visible),
          items: schema.hotkeys
        });
      }
      if (schema?.hint) ui.hint(String(schema.hint));
    } catch (e) {
      ui.hint('Schema load failed (check console).');
      console.warn('[JaZeR UI] Schema load failed:', e);
    }
  };

  const ready = loadSchema();
  return { ui, expose, effectRoot, ready };
}
