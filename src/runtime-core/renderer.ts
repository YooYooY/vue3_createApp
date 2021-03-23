import { effect } from '../reactivity/effect'
import { ShapeFlags } from '../shared/shapeFlags'
import { createAppApi } from './apiCreateApp'
import { getSequence } from '../shared/index'
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

  const mountElement = (vnode, container, anchor) => {
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

    hostInsert(el, container, anchor)
  }

  const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
      patch(null, children[i], container)
    }
  }

  const patchProps = (oldProps, newProps, el) => {
    if (oldProps !== newProps) {
      for (let key in newProps) {
        const prev = oldProps[key]
        const next = newProps[key]
        if (prev !== next) {
          hostPatchProp(el, key, prev, next)
        }
      }
      // 旧属性新的props中没有，需要移除
      for (let key in oldProps) {
        if (!(key in newProps)) {
          hostPatchProp(el, key, oldProps[key], null)
        }
      }
    }
  }

  const patchKeyedChildren = (c1, c2, el) => {
    // 新旧都有children元素

    // 1) 尽可能复用两个 children
    // abc
    // abcd
    // i = 3
    let i = 0
    let e1 = c1.length - 1
    let e2 = c2.length - 1
    while (i <= e1 && i <= e2) {
      // 谁先比对完毕就结束
      const n1 = c1[i]
      const n2 = c2[i]
      if (isSameVnodeType(n1, n2)) {
        patch(n1, n2, el) // 递归比较子节点
      } else {
        break
      }
      i++
    }

    // 2) abc i=0 e1=2 e2=3
    //  dabc  i=0 e1=-1 e2=0

    while (i <= e1 && i <= e2) {
      const n1 = c1[e1]
      const n2 = c2[e2]
      if (isSameVnodeType(n1, n2)) {
        patch(n1, n2, el)
      } else {
        break
      }
      e1--
      e2--
    }

    // 3) 前后都不一样的情况

    // 新值大于旧值 新增情况，判断条件：i大于e1
    // abc => abcd (i=3 e1=2 e2=3)
    // abc => dabc (i=0 e1=-1 e2=0)
    if (i > e1) {
      // 新增的节点，在i和e2之间或i=e2
      if (i <= e2) {
        // 获取插入参照物
        // 前面值都一样，e2值不变：e2+1 大于 数组长度（c2.length）
        // 后面值都一样，e2向前取：e2+1 小于 数组长度（c2.length）

        const nextPos = e2 + 1
        const anchor = nextPos < c2.length ? c2[nextPos].el : null
        console.log(i, e1, e2, anchor)
        while (i <= e2) {
          patch(null, c2[i], el, anchor)
          i++
        }
      }

      // 新值小于旧值 删除情况， 判断条件：i>e2
      // abcd abc (i=3 e1=3 e2=2)
    } else if (i > e2) {
      while (i <= e1) {
        hostRemove(c1[i].el)
        i++
      }
      console.log(i, e1, e2)
    } else {
      // 乱序比对
      // ab [cde] fg   // s1=2 e1=4
      // ab [edch] fg   // s2=2 e2=5
      const s1 = i
      const s2 = i
      // 新的索引 和 key 做成一个映射表
      const keyToNewIndexMap = new Map()
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i]
        if (nextChild.key != null) {
          keyToNewIndexMap.set(nextChild.key, i)
        }
      }

      const toBePatched = e2 - s2 + 1 // 需要处理的节点总数
      const newIndexToOldMapIndex = new Array(toBePatched).fill(0)

      // 遍历老节点
      for (i = s1; i <= e1; i++) {
        const prevChild = c1[i]
        let newIndex = keyToNewIndexMap.get(prevChild.key)
        if (newIndex == undefined) {
          // 旧值在新值中不存在，直接删除
          hostRemove(prevChild.el)
        } else {
          newIndexToOldMapIndex[newIndex - s2] = i + 1
          patch(prevChild, c2[newIndex], el)
        }
      }
      
      let increasingIndexSequence = getSequence(newIndexToOldMapIndex)
      let j = increasingIndexSequence.length - 1;

      for (i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = s2 + i // [edch] 找到h索引
        const nextChild = c2[nextIndex] // 找到h
        // 找到当前元素的下一个元素
        let anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null

        if (newIndexToOldMapIndex[i] == 0) {
          // 新元素，直接创建插入到当前元素的下一个
          patch(null, nextChild, el, anchor)
        } else {
          // 根据参照物直接将节点移动过去，所有节点都需要移动
          // 没有考虑不需要动的节点情况
          // hostInsert(nextChild.el, el, anchor)

          // 最长递增子序列优化
          if (j < 0 || i != increasingIndexSequence[j]) {
            hostInsert(nextChild.el, el, anchor)
          } else {
            j--;
          }
        }
      }
      
    }
  }

  const patchChildren = (n1, n2, el) => {
    const c1 = n1.children
    const c2 = n2.children

    const prevShapeFlag = n1.shapeFlag
    const nextShapeFlag = n2.shapeFlag

    // 旧的是文本，新的是文本
    if (nextShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 新的是文本
      if (c2 !== c1) {
        hostSetElementText(el, c2)
      }
    } else {
      // 新的是数组 旧的是数组
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        patchKeyedChildren(c1, c2, el)
      } else {
        // 老的是文本 新的是数组
        hostSetElementText(el, '') // 删掉旧内容
        mountChildren(c2, el)
      }
    }
  }

  const patchElement = (n1, n2, container) => {
    // 比较两个虚拟节点，并且复用老节点
    let el = (n2.el = n1.el)
    const oldProps = n1.props || {}
    const newProps = n2.props || {}

    patchProps(oldProps, newProps, el)

    patchChildren(n1, n2, el)
  }

  const mountComponent = (vnode, container) => {
    // 根据虚拟dom创建实例
    const instance = (vnode.component = createComponentInstance(vnode))

    // 找到组件setup方法
    setupComponent(instance)

    // 设置渲染effect
    setupRenderEffect(instance, container)
  }

  const updateComponent = (n1, n2, container) => {}

  const processElement = (n1, n2, container, anchor) => {
    if (n1 == null) {
      // 元素挂载
      mountElement(n2, container, anchor)
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
  const patch = (n1, n2, container, anchor = null) => {
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
      processElement(n1, n2, container, anchor)
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
        let subTree = (instance.subTree = instance.render())
        patch(null, subTree, container)
        instance.isMounted = true
      } else {
        console.log('update')
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
