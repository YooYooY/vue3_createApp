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

### 数组子节点的对比

#### 尽可能复用 children 节点

新旧值前面节点相同：

- 旧 `[a, b, c]`
- 新 `[a, b, c, d]`

```ts
let i=0;
let e1 = c1.length-1;
let e2 = c2.length-1;
while(i<=e1 && i<=e2){// 谁先比对完毕就结束
  const n1 = c1[i];
  const n2 = c2[i];
  if(isSameVnodeType(n1,n2)){
    patch(n1,n2,el); // 递归比较子节点
  }else{
    break;
  }
  i++;
}
```

新旧值后面面节点相同：

- 旧 `[a, b, c]`
- 新 `[d, a, b, c]`

```ts
while(i<= e1 && i<=e2){
  const n1 = c1[e1];
  const n2 = c2[e2];
  if(isSameVnodeType(n1,n2)){
    patch(n1,n2,el)
  }else{
    break;
  }
  e1--;
  e2--;
}
```

#### 前后都不一样的情况，插入和删除操作

```ts
// 新增的节点，在i和e2之间或i=e2
if(i>e1){
  
  if(i<=e2){
    // 获取插入参照物
    // 前面值都一样，e2值不变：e2+1 大于 数组长度（c2.length）
    // 后面值都一样，e2向前取：e2+1 小于 数组长度（c2.length）
    const nextPos = e2+1;
    const anchor = nextPos < c2.length ? c2[nextPos].el : null;
    console.log(i, e1, e2, anchor)
    while(i<=e2){
      patch(null, c2[i], el, anchor);
      i++
    }
  }
  
  // 新值小于旧值 删除情况， 判断条件：i>e2
  // abcd abc (i=3 e1=3 e2=2)
} else if(i>e2){
    while(i<=e1){
      hostRemove(c1[i].el);
      i++;
    }
}
```

`patchKeyedChildren` 方法如下：

```ts
const patchKeyedChildren = (c1,c2,el)=>{
  // 新旧都有children元素
  
  // 1) 尽可能复用两个 children
  // abc
  // abcd 
  // i = 3
  let i=0;
  let e1 = c1.length-1;
  let e2 = c2.length-1;
  while(i<=e1 && i<=e2){// 谁先比对完毕就结束
    const n1 = c1[i];
    const n2 = c2[i];
    if(isSameVnodeType(n1,n2)){
      patch(n1,n2,el); // 递归比较子节点
    }else{
      break;
    }
    i++;
  }
  
  // 2) abc i=0 e1=2 e2=3
  //    dabc  i=0 e1=-1 e2=0
  
  while(i<= e1 && i<=e2){
    const n1 = c1[e1];
    const n2 = c2[e2];
    if(isSameVnodeType(n1,n2)){
      patch(n1,n2,el)
    }else{
      break;
    }
    e1--;
    e2--;
  }
  
  // 3) 前后都不一样的情况
  
  // 新值大于旧值 新增情况，判断条件：i大于e1
  // abc => abcd (i=3 e1=2 e2=3)
  // abc => dabc (i=0 e1=-1 e2=0)
  if(i>e1){
    // 新增的节点，在i和e2之间或i=e2
    if(i<=e2){
      // 获取插入参照物
      // 前面值都一样，e2值不变：e2+1 大于 数组长度（c2.length）
      // 后面值都一样，e2向前取：e2+1 小于 数组长度（c2.length）
      
      const nextPos = e2+1;
      const anchor = nextPos < c2.length ? c2[nextPos].el : null;
      console.log(i, e1, e2, anchor)
      while(i<=e2){
        patch(null, c2[i], el, anchor);
        i++
      }
    }
    
    // 新值小于旧值 删除情况， 判断条件：i>e2
    // abcd abc (i=3 e1=3 e2=2)
  } else if(i>e2){
      while(i<=e1){
        hostRemove(c1[i].el);
        i++;
      }
  }else{
    // 乱序比对
  }     
}
```


#### 乱序比对

前后子节点值变化：

旧： a,b,c,d,e,f,g
新： a,b,e,d,c,h,f,g

```ts
const App = {
  setup() {
    let state = reactive({ flag: true })
    setTimeout(() => {
      state.flag = !state.flag
    }, 1000)
    return () => {
      if (state.flag) {
        return h('div', {}, [
          h('div', { key: 'A' }, 'A'),
          h('div', { key: 'B' }, 'B'),

          h('div', { key: 'C' }, 'C'),
          h('div', { key: 'D' }, 'D'),
          h('div', { key: 'E' }, 'E'),

          h('div', { key: 'F' }, 'F'),
          h('div', { key: 'G' }, 'G'),
        ])
      } else {
        return h('div', {}, [
          h('div', { key: 'A' }, 'A'),
          h('div', { key: 'B' }, 'B'),

          h('div', { key: 'E' }, 'E'),
          h('div', { key: 'D' }, 'D'),
          h('div', { key: 'C' }, 'C'),
          h('div', { key: 'H' }, 'H'),

          h('div', { key: 'F' }, 'F'),
          h('div', { key: 'G' }, 'G'),
        ])
      }
    }
  },
}
```


```ts
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
```

### 最长递增子序列优化

```ts
function getSequence(arr):number[] {
  const result = [0]
  const p = arr.slice()
  let i, j, u, v, c
  const len = arr.length
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      j = result[result.length - 1]
      // 拿最后一项的值 和 当前这项做比较
      if (arr[j] < arrI) {
        p[i] = j // 保存递增索引
        result.push(i)
        continue
      }
    }
    u = 0
    v = result.length - 1 // 二分查找 找索引
    while (u < v) {
      c = ((u + v) / 2) | 0
      if (arr[result[c]] < arrI) {
        u = c + 1
      } else {
        v = c
      }
    }
    // 确定索引, 用小的替换从、
    if (arrI < arr[result[u]]) {
      if (u > 0) {
        console.log(p, result[u - 1], result, u)
        p[i] = result[u - 1]
      }
      result[u] = i
    }
  }

  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  return result
}

console.log(getSequence([1, 2, 6, 8, 12, 5, 7]))

```