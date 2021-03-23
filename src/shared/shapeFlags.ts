export const enum ShapeFlags {
    ELEMENT = 1, // 普通元素
    FUNCTION_COMPONENT = 1 << 1, // 函数组件 2
    STATEFUL_COMPONENT = 1 << 2, // 带状态组件 4
    TEXT_CHILDREN = 1 << 3, // 文本孩子 8
    ARRAY_CHILDREN = 1 << 4 // 数组孩子 16
}