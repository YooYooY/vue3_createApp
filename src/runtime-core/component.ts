import { isFunction } from "../shared/index";

export function createComponentInstance(vnode) {
  const instance = {
    type: vnode.type,
    props: {},
    vnode,
    subTree: null, // 组件对应的子元素虚拟节点 _node $vnode
    render: null, // 渲染函数
    setupState: null, // setup 返回的状态
    isMounted: false, // 组件是否挂载
  }
  
  return instance;
}

export function setupComponent(instance) {
    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance){
    const Component = instance.type;
    let { setup } = Component;
    
    if(setup){
        const setUpResult = setup(instance.props);
        // console.log(setUpResult())
        handleSetupResult(instance, setUpResult)
        
    }
}

function handleSetupResult(instance,setUpResult) {
    if(isFunction(setUpResult)){
        instance.render = setUpResult
    }else{
        instance.setupState = setUpResult;
    }
    finishComponentSetup(instance)
} 

function finishComponentSetup(instance) {
    const Component = instance.type;
    if(Component.render && !instance.render){
        // 组件包含 render 函数， 用外层render 覆盖内层render
        instance.render = Component.render;
    } else if(!instance.render){
        // 没有 render方法， template => ast => codegen render 生成后的结果为render
    }
    // 合并选项
    applyOptions(instance)
    
}

function applyOptions(instance){
    
}
