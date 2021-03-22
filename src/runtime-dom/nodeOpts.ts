export const nodeOpts = {
    createElement(type){
        return document.createElement(type)
    },
    insert(child, parent, anchor=null){
        parent.insertBefore(child,anchor)
    },
    remove(child){
        const parent = child.parentNode;
        if(parent){
            parent.removeChild(child)
        }
    },
    setElementText(el,content){
        el.textContent = content;
    },
    createTextNode(content){
        return document.createTextNode(content);
    }
}