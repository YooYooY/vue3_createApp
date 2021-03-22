function patchStyle(el, prev, next) {
  const style = el.style
  if (!next) {
    el.removeAttribute('style')
  } else {
    for (let key in next) {
      style[key] = next[key]
    }
    if (prev) {
      for (let key in prev) {
        if (!next[key]) {
          style[key] = ''
        }
      }
    }
  }
}

function patchClass(el, next) {
  if (next == null) {
    next = ''
  }
  el.className = next
}

function patchAttr(el, key, value) {
  if (value == null) {
    el.removeAttribute(key)
  } else {
    el.setAttribute(key,value)
  }
}

export function patchProp(el, key, prevValue, nextValue) {
  switch (key) {
    case 'style':
      patchStyle(el, prevValue, nextValue)
      break
    case 'className':
      patchClass(el, nextValue)
      break
    default:
      patchAttr(el, key, nextValue)
  }
}
