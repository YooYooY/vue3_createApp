// 最长递增子序列优化
export function getSequence(arr):number[] {
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
// console.log(getSequence([1, 2, 6, 8, 12, 5, 7]))
