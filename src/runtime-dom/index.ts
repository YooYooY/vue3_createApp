import { createRenderer } from '../runtime-core/index'
import { nodeOpts } from './nodeOpts'
import { patchProp } from './patchProp'

function ensureRenderer() {
  // 传入一些dom的api操作，创建、删除、添加、属性更新
  return createRenderer({ ...nodeOpts, patchProp })
}

export function createApp(rootComponent) {
  // 核心调用内层 runtime-core 中的createApp
  const app = ensureRenderer().createApp(rootComponent)
  const { mount } = app

  app.mount = function (container) {
    // 先清空内容
    container = document.querySelector(container);
    container.innerHTML = "";
    // 调用底层 mount 方法
    mount(container)
  }

  return app
}
