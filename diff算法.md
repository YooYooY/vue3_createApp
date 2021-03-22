# diff 算法

## 内容更新

```js
const { createApp, h, reactive } = Vue

const App = {
    setup() {
        let state = reactive({flag: true})
        setTimeout(() => {
        state.flag = !state.flag;
        }, 1000);
        
        return ()=>(state.flag ? h("div",{style:{color:"#f00"}},"hello") : h("p",{style:{background:"#0f0"}},"world"))
    },
}

let app = createApp(App);
app.mount("#app")
```

```ts
  function setupRenderEffect(instance, container) {
    effect(() => {
      if (!instance.isMounted) {
        let subTree = instance.subTree = instance.render();
        patch(null, subTree, container)
        instance.isMounted = true
      } else {
        // 更新操作
        let prevTree = instance.subTree
        let nextTree = instance.render()
        patch(prevTree, nextTree, container)
      }
    })
  }
```

## 同级对比条件

- 类型不一样 key 不一样不复用
- 复用节点后 比较属性
- 对比孩子 1方 有儿子 2方都有儿子
- 都有儿子的时候此时正真的dom-diff

### 类型和key都不一样

```ts
const isSameVnodeType = (n1, n2) => {
    return n1.type == n2.type && n1.key == n2.key
}
```

```ts
  const patch = (n1, n2, container) => {
    
    // 类型不一样 key 不一样不复用
    if (n1 && !isSameVnodeType(n1, n2)) {      
      // 删除旧节点
      hostRemove(n1.el)
      // 旧节点重置为 null
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
```

### 属性对比

复用节点后 比较属性

```js
return ()=>{
    if(state.flag){
        return h("div",{style:{color:"#f00"}},"hello")
    }else{
        return h("div",{style:{background:"#0f0"}},"world")
    }
}
```

```ts
const patchElement = (n1, n2, container) => {
    // 比较两个虚拟节点，并且复用老节点
    let el = n2.el = n1.el;

    // 对比属性
    const oldProps = n1.props || {};
    const newProps = n2.props || {};
    patchProps(oldProps,newProps,el);
}
```

```ts
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
```


### 子节点对比

子节点对比条件

- 旧的是文本，新的是文本
- 旧的是数组，新的是文本
- 旧的是文本，新的是数组
- 新的是数组，旧的是数组


```ts
return ()=>{
  if(state.flag){
    return h("div",{style:{color:"#f00"}},"hello")
  }else{
    return h("div",{style:{background:"#0f0"}},[
      h("div",{},"chen"),
      h("div",{},"wei"),
      h("div",{},"long"),
    ])
  }
}
```

交给 `patchChildren` 处理
```ts
const patchElement = (n1, n2, container) => {
  // 比较两个虚拟节点，并且复用老节点
  let el = n2.el = n1.el;
  const oldProps = n1.props || {};
  const newProps = n2.props || {};
  
  patchProps(oldProps,newProps,el);
  
  patchChildren(n1, n2, el);
}

const patchChildren = (n1,n2,el)=>{
  
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
```



