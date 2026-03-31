export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

export function $$(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

export function html(el, content) {
  el.innerHTML = content;
}

export function show(el) {
  el.hidden = false;
}

export function hide(el) {
  el.hidden = true;
}

export function on(el, event, handler, options) {
  el.addEventListener(event, handler, options);
}
