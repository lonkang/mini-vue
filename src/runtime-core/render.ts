import { effect } from "../reactivity/effect";
import { EMPTY_OBJ } from "../shared";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createCompomentInstace, setupComponent } from "./compoment";
import { shouldUpdateComponent } from "./componentRenderUtil";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
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
      patchElement(n1, n2, parentComponent, anchor);
    }
  }
  function patchElement(n1, n2, parentComponent, anchor) {
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
      // 创建数组的时候给定数组的长度，这个是性能最快的写法
      // 初始化为 0 , 后面处理的时候 如果发现是 0 的话，那么就说明新值在老的里面不存在
      let newIndexToOldIndexMap = Array(toBePatched).fill(0);
      let moved = false;
      let maxNewIndexSoFar = 0;
      const keyToNewMap = new Map();
      // 遍历剩余的新节点，生成一份节点key -> index 的映射表keyToNewIndexMap
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i];
        if (nextChild.key !== null) {
          keyToNewMap.set(nextChild.key, i);
        }
      }
      // 遍历老节点
      // 1. 需要找出老节点有，而新节点没有的 -> 需要把这个节点删除掉
      // 2. 新老节点都有的，—> 需要 patch
      for (let i = s1; i <= e1; i++) {
        let prevChild = c1[i];

        // 如果老的节点大于新节点的数量的话，那么这里在处理老节点的时候就直接删除即可
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
          newIndexToOldIndexMap[newIndex - s2] = i + 1;
          if (newIndex > maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex;
          } else {
            moved = true;
          }
          // 如果存在就进行patch
          patch(prevChild, c2[newIndex], container, parentComponent, null);
          patched++;
        }
      }
      // 获取最长递增子序列来优化逻辑
      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : [];
      let j = increasingNewIndexSequence.length - 1;
      // 倒序遍历
      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = s2 + i;
        const nextChild = c2[nextIndex];
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;

        if (newIndexToOldIndexMap[i] === 0) {
          // 新的在老的中不存在 就直接创建
          patch(null, nextChild, container, parentComponent, anchor);
        } else if (moved) {
          // 需要移动
          // 1. j 已经没有了 说明剩下的都需要移动了
          // 2. 最长子序列里面的值和当前的值匹配不上， 说明当前元素需要移动
          if (j < 0 || increasingNewIndexSequence[j] !== i) {
            hostInsert(nextChild.el, container, anchor);
          } else {
            // 这里就是命中了  index 和 最长递增子序列的值
            // 所以可以移动指针了
            j--;
          }
        }
      }
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
    hostInsert(el, container, anchor);

    // container.append(el);
  }
  function mountChildren(children, container, parentComponent, anchor) {
    children.forEach((v) => {
      patch(null, v, container, parentComponent, anchor);
    });
  }

  function processComponent(n1, n2, container, parentComponent, anchor) {
    if (!n1) {
      mountCompoment(n2, container, parentComponent, anchor);
    } else {
      updateComponent(n1, n2);
    }
  }
  function mountCompoment(vnode: any, container, parentComponent, anchor) {
    const instace = (vnode.component = createCompomentInstace(
      vnode,
      parentComponent
    ));
    setupComponent(instace);
    setupRenderEffect(instace, vnode, container, anchor);
  }
  function updateComponent(n1, n2) {
    const instance = (n2.component = n1.component);
    if (shouldUpdateComponent(n1, n2)) {
      console.log(`组件需要更新: ${instance}`);
      // 那么 next 就是新的 vnode 了（也就是 n2）
      instance.next = n2;
      instance.update();
    } else {
      console.log(`组件不需要更新: ${instance}`);
      // 不需要更新的话，那么只需要覆盖下面的属性即可
      n2.component = n1.component;
      n2.el = n1.el;
      instance.vnode = n2;
    }
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
        const { next, vnode } = instace;
        if (next) {
          next.el = vnode.el;
          updateComponentPreRender(instace, next);
        }
        const subTree = instace.render.call(proxy);
        const prevSubTree = instace.subTree;
        instace.subTree = subTree;
        patch(prevSubTree, subTree, container, instace, anchor);
      }
    });
  }
  function updateComponentPreRender(instace, next) {
    instace.vnode = next;
    instace.next = null;
    instace.props = next.props;
  }
  return {
    createApp: createAppAPI(render),
  };
}
function getSequence(arr: number[]): number[] {
  const p = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = (u + v) >> 1;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}
