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
    remove: hostRemove,
    setElementText: hostSetElementText,
  } = options;
  function render(vnode, container) {
    patch(null, vnode, container, null, null);
  }
  function patch(n1, n2, container, parentComponent, anchor) {
    // todo 判断vnode是不是一个element
    // 是element就处理element
    // 处理组件
    const { type, ShapeFlag } = n2;
    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent, anchor);
        break;
      case Text:
        processText(n1, n2, container);
        break;
      default:
        if (ShapeFlag & ShapeFlags.ELEMENT) {
          // 元素类型
          processElement(n1, n2, container, parentComponent, anchor);
        } else if (ShapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // 组件类型
          processComponent(n1, n2, container, parentComponent, anchor);
        }
        break;
    }
  }
  function processFragment(n1, n2, container, parentComponent, anchor) {
    if (!n1) {
      const { children } = n2;
      mountChildren(children, container, parentComponent, anchor);
    }
  }
  function processText(n1, n2, container) {
    const { children } = n2;
    const textNode = (n2.el = document.createTextNode(children));
    container.append(textNode);
  }
  function processElement(n1, n2, container, parentComponent, anchor) {
    if (!n1) {
      mountElement(n2, container, parentComponent, anchor);
    } else {
      patchElement(n1, n2, container, parentComponent, anchor);
    }
  }
  function patchElement(n1, n2, container, parentComponent, anchor) {
    console.log("patchElement");
    console.log("n1", n1);
    console.log("n2", n2);
    const el = (n2.el = n1.el);
    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;
    patchChildren(n1, n2, el, parentComponent, anchor);

    patchProps(el, oldProps, newProps);
  }
  function patchChildren(n1, n2, container, parentComponent, anchor) {
    const { ShapeFlag: prevShapleFlag, children: c1 } = n1;
    const { ShapeFlag, children: c2 } = n2;
    // 新的是text节点老的是文本数组节点
    if (ShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapleFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 1. 把老的children删掉
        unMountChildren(n1.children);
      }
      // 设置 text
      if (c1 !== c2) {
        hostSetElementText(container, c2);
      }
    } else {
      // 旧节点是text
      // text to array
      if (prevShapleFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(container, "");
        mountChildren(c2, container, parentComponent, anchor);
      } else {
        // array to array
        patchKeyedChildren(c1, c2, container, parentComponent, anchor);
      }
    }
  }

  function patchKeyedChildren(c1, c2, container, parentComponent, anchor) {
    let l2 = c2.length;
    let i = 0;
    let e1 = c1.length - 1;
    let e2 = l2 - 1;
    function isSameVNodeType(n1, n2) {
      return n1.type === n2.type && n1.key === n2.key;
    }
    // 从左边开始找出不一样的
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, anchor);
      } else {
        break;
      }
      i++;
    }
    // 从右边开始往左找出不一样的
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, anchor);
      } else {
        break;
      }
      e1--;
      e2--;
    }
    // 如果新的比老的多 就创建
    if (i > e1) {
      if (i <= e2) {
        // 添加分为左侧和右侧添加 左侧添加的时候需要拿到没更新前的第一个元素也就是e2+1位置
        let nextPos = e2 + 1;
        let anchor = nextPos < l2 ? c2[nextPos].el : null;
        while (i <= e2) {
          patch(null, c2[i], container, parentComponent, anchor);
          i++;
        }
      }
    } else if (i > e2) {
      while (i <= e1) {
        hostRemove(c1[i].el);
        i++;
      }
    } else {
      // 乱序的部分也就是中间的部分进行对比
      const s1 = i;
      const s2 = i;

      let patched = 0; // 统计对比过的数量
      const toBePatched = e2 - s2 + 1; // 未处理的新节点剩余数量

      const keyToNewMap = new Map();
      // 遍历剩余的新节点，生成一份节点key -> index 的映射表keyToNewIndexMap
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i];
        if (nextChild.key !== null) {
          keyToNewMap.set(nextChild.key, i);
        }
      }
      // 2. 从新节点中找出老节点
      for (let i = s1; i <= e1; i++) {
        let prevChild = c1[i];

        // 当旧节点超过新节点的时候，直接删除节点
        if (patched >= toBePatched) {
          hostRemove(prevChild.el);
          continue;
        }

        let newIndex;

        if (prevChild.key !== null) {
          // 如果当前旧节点存在key值，则从keyToNewIndexMap映射表查找有没有对应的新节点，有则获取其下标
          newIndex = keyToNewMap.get(prevChild.key);
        } else {
          for (let j = s2; j <= e2; j++) {
            if (isSameVNodeType(prevChild, c2[j])) {
              newIndex = j;
              break;
            }
          }
        }
        if (newIndex === undefined) {
          // 如果老节点中不载新节点列表中，那就删除
          hostRemove(prevChild.el);
        } else {
          // 如果存在就进行patch
          patch(prevChild, c2[newIndex], container, parentComponent, null);
          patched++;
        }
      }
      // let
    }
  }
  function unMountChildren(children) {
    for (let i = 0; i < children.length; i++) {
      const el = children[i].el;
      // remove
      hostRemove(el);
    }
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
      if (newProps !== EMPTY_OBJ) {
        for (let key in oldProps) {
          if (!newProps[key]) {
            hostPatchProp(el, key, oldProps[key], null);
          }
        }
      }
    }
  }

  function mountElement(vnode, container, parentComponent, anchor) {
    const { type, children, props, ShapeFlag } = vnode;

    const el = (vnode.el = hostCreateElement(vnode.type));

    if (ShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (ShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el, parentComponent, anchor);
    }
    // 处理props
    for (const key in props) {
      const val = props[key];
      // 初始化传递null
      hostPatchProp(el, key, null, val);
    }
    insert(el, container, anchor);

    // container.append(el);
  }
  function mountChildren(children, container, parentComponent, anchor) {
    children.forEach((v) => {
      patch(null, v, container, parentComponent, anchor);
    });
  }

  function processComponent(n1, n2, container, parentComponent, anchor) {
    mountCompoment(n2, container, parentComponent, anchor);
  }
  function mountCompoment(vnode: any, container, parentComponent, anchor) {
    const instace = createCompomentInstace(vnode, parentComponent);
    setupComponent(instace);
    setupRenderEffect(instace, vnode, container, anchor);
  }
  function setupRenderEffect(instace, vnode, container, anchor) {
    effect(() => {
      // 绑定proxy 使得render函数能使用this
      const { proxy, isMounted } = instace;
      if (!isMounted) {
        const subTree = instace.render.call(proxy);
        instace.subTree = subTree;
        instace.isMounted = true;
        // vnode => patch
        // vnode => element => mountCompoment
        patch(null, subTree, container, instace, anchor);
        vnode.el = subTree.el;
      } else {
        const subTree = instace.render.call(proxy);
        const prevSubTree = instace.subTree;
        instace.subTree = subTree;
        patch(prevSubTree, subTree, container, instace, anchor);
      }
    });
  }
  return {
    createApp: createAppAPI(render),
  };
}
