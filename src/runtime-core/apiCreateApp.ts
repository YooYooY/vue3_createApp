import { createVNode } from './vnode'

export function createAppApi(render) {
  return (component) => {
    let app = {
      mount(container) {
        const vnode = createVNode(component)
        
        render(vnode,container)
      },
    }
    return app
  }
}
