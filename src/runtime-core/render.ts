import { effect } from "../reactivity/effect";
import { EMPTY_OBJ } from "../shared";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createCompomentInstace, setupComponent } from "./compoment";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert,
  } = options;
  function render(vnode, container) {
    patch(null, vnode, container, null);
  }
  function patch(n1, n2, container, parentComponent) {
    // todo 判断vnode是不是一个element
    // 是element就处理element
    // 处理组件
    const { type, ShapeFlag } = n2;
    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent);
        break;
      case Text:
        processText(n1, n2, container);
        break;
      default:
        if (ShapeFlag & ShapeFlags.ELEMENT) {
          // 元素类型
          processElement(n1, n2, container, parentComponent);
        } else if (ShapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // 组件类型
          processComponent(n1, n2, container, parentComponent);
        }
        break;
    }
  }
  function processFragment(n1, n2, container, parentComponent) {
    if (!n1) {
      const { children } = n2;
      mountChildren(children, container, parentComponent);
    }
  }
  function processText(n1, n2, container) {
    const { children } = n2;
    const textNode = (n2.el = document.createTextNode(children));
    container.append(textNode);
  }
  function processElement(n1, n2, container, parentComponent) {
    if (!n1) {
      mountElement(n2, container, parentComponent);
    } else {
      patchElement(n1, n2, container);
    }
  }
  function patchElement(n1, n2, container) {
    console.log("patchElement");
    console.log("n1", n1);
    console.log("n2", n2);
    const el = (n2.el = n1.el);
    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;
    patchProps(el, oldProps, newProps);
  }
  function patchProps(el, oldProps, newProps) {
    if (oldProps !== newProps) {
      for (let key in newProps) {
        let prevProp = oldProps[key];
        let nextProp = newProps[key];
        if (prevProp !== nextProp) {
          hostPatchProp(el, key, prevProp, nextProp);
        }
      }
      if(newProps !== EMPTY_OBJ) {
        for (let key in oldProps) {
          if (!newProps[key]) {
            hostPatchProp(el, key, oldProps[key], null);
          }
        }
      }
    }
  }

  function mountElement(vnode, container, parentComponent) {
    const { type, children, props, ShapeFlag } = vnode;

    const el = (vnode.el = hostCreateElement(vnode.type));

    if (ShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (ShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el, parentComponent);
    }
    // 处理props
    for (const key in props) {
      const val = props[key];
      // 初始化传递null
      hostPatchProp(el, key, null, val);
    }
    insert(el, container);

    // container.append(el);
  }
  function mountChildren(children, container, parentComponent) {
    children.forEach((v) => {
      patch(null, v, container, parentComponent);
    });
  }

  function processComponent(n1, n2, container, parentComponent) {
    mountCompoment(n2, container, parentComponent);
  }
  function mountCompoment(vnode: any, container, parentComponent) {
    const instace = createCompomentInstace(vnode, parentComponent);
    setupComponent(instace);
    setupRenderEffect(instace, vnode, container);
  }
  function setupRenderEffect(instace, vnode, container) {
    effect(() => {
      // 绑定proxy 使得render函数能使用this
      const { proxy, isMounted } = instace;
      if (!isMounted) {
        const subTree = instace.render.call(proxy);
        instace.subTree = subTree;
        instace.isMounted = true;
        // vnode => patch
        // vnode => element => mountCompoment
        patch(null, subTree, container, instace);
        vnode.el = subTree.el;
      } else {
        const subTree = instace.render.call(proxy);
        const prevSubTree = instace.subTree;
        instace.subTree = subTree;
        patch(prevSubTree, subTree, container, instace);
      }
    });
  }
  return {
    createApp: createAppAPI(render),
  };
}
