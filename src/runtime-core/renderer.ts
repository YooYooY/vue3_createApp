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
  
  const patchProps = (oldProps, newProps, el)=>{
    if(oldProps !== newProps){
      for(let key in newProps){
        const prev = oldProps[key];
        const next = newProps[key];
        if(prev !== next){
          hostPatchProp(el,key,prev,next);
        }
      }
      // 旧属性新的props中没有，需要移除
      for(let key in oldProps){
        if(!(key in newProps)){
          hostPatchProp(el,key,oldProps[key],null)
        }
      }
    }
  }
  
  const patchKeyedChildren = (c1,c2,el)=>{}
  
  const patchChildren = (n1,n2,el)=>{
    console.log(n1,n2);
    
    const c1 = n1.children
    const c2 = n2.children

    const prevShapeFlag = n1.shapeFlag
    const nextShapeFlag = n2.shapeFlag

    // 旧的是文本，新的是文本
    if(nextShapeFlag & ShapeFlags.TEXT_CHILDREN){
      // 新的是文本
      if(c2 !== c1){
        hostSetElementText(el,c2);
      }
    } else {
      // 新的是数组 旧的是数组
      if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN){
        patchKeyedChildren(c1,c2,el)
      }else{
        // 老的是文本 新的是数组
        hostSetElementText(el,""); // 删掉旧内容
        mountChildren(c2,el)
      }
    }
    
  }

  const patchElement = (n1, n2, container) => {
    // 比较两个虚拟节点，并且复用老节点
    let el = n2.el = n1.el;
    const oldProps = n1.props || {};
    const newProps = n2.props || {};
    
    patchProps(oldProps,newProps,el);
    
    patchChildren(n1, n2, el);
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
