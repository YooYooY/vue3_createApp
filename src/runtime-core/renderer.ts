import { effect } from '../reactivity/effect'
import { ShapeFlags } from '../shared/shapeFlags'
import { createAppApi } from './apiCreateApp'
import { createComponentInstance, setupComponent } from './component'

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
    createTextNode: hostCreateNode,
    patchProp: hostPatchProp,
  } = options

  const mountElement = (vnode, container) => {
    let { shapeFlag, props, children, type } = vnode

    // 将真实节点和虚拟节点关联起来
    let el = (vnode.el = hostCreateElement(type))

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)
    } else {
      mountChildren(children, el)
    }

    if (props) {
      for (let key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }

    hostInsert(el, container)
  }

  const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
      patch(null, children[i], container)
    }
  }

  const patchElement = (n1, n2, container) => {}

  const mountComponent = (vnode, container) => {
    // 根据虚拟dom创建实例
    const instance = (vnode.component = createComponentInstance(vnode))

    // 找到组件setup方法
    setupComponent(instance)

    // 设置渲染effect
    setupRenderEffect(instance, container)
  }

  const updateComponent = (n1, n2, container) => {}

  const processElement = (n1, n2, container) => {
    if (n1 == null) {
      // 元素挂载
      mountElement(n2, container)
    } else {
      patchElement(n1, n2, container)
    }
  }

  const processComponent = (n1, n2, container) => {
    if (n1 == null) {
      // 组件挂载
      mountComponent(n2, container)
    } else {
      updateComponent(n1, n2, container)
    }
  }

  const isSameVnodeType = (n1, n2) => {
    return n1.type == n2.type && n1.key == n2.key
  }

  /*
   * @params n1 上一次渲染vnode
   * @params n2 本次渲染vnode
   * @params container 容器dom
   */
  const patch = (n1, n2, container) => {
    // 同级对比
    // 类型不一样 key 不一样不复用
    // 复用节点后 比较属性
    // 对比孩子 1方 有儿子 2方都有儿子
    // 都有儿子的时候此时正真的dom-diff
    
    if (n1 && !isSameVnodeType(n1, n2)) {      
      hostRemove(n1.el)
      n1 = null
    }

    // 开始渲染
    let { shapeFlag } = n2
    if (shapeFlag & ShapeFlags.ELEMENT) {
      // 1
      processElement(n1, n2, container)
    } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      processComponent(n1, n2, container)
    }
  }

  const render = (vnode, container) => {
    // 判断 初次渲染 || 更新渲染
    patch(null, vnode, container)
  }

  function setupRenderEffect(instance, container) {
    effect(() => {
      if (!instance.isMounted) {
        let subTree = instance.subTree = instance.render();
        patch(null, subTree, container)
        instance.isMounted = true
      } else {
        console.log('update', instance)
        let prevTree = instance.subTree
        let nextTree = instance.render()
        patch(prevTree, nextTree, container)
      }
    })
  }

  return {
    createApp: createAppApi(render),
  }
}
