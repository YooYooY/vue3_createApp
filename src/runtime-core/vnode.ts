import { isArray, isObject, isString, ShapeFlags } from '../shared/index'

export function createVNode(type, props = {} as any, children = null) {

  // 判断 shapeFlag 是组件还是元素
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT
    : 0

  let vnode = {
    type,
    props,
    children,
    component: null, // 组件实例，用于保存组件对应实例
    el: null,
    key: props.key,
    shapeFlag,
  }

  if (isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  } else {
    // 组件里面可能是空也可能是文本
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  }
  
  return vnode;
}
