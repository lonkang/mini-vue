const extend = Object.assign;
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
function hasChanged(value, oldValue) {
    return !Object.is(value, oldValue);
}
const hasOwn = (val, key) => {
    return Object.prototype.hasOwnProperty.call(val, key);
};
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : "";
    });
};
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
const toHandlerKey = (str) => {
    return str ? "on" + capitalize(str) : "";
};
const EMPTY_OBJ = {};

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createvnode(type, props, children) {
    const vnode = {
        type,
        props,
        key: props && props.key,
        children,
        el: null,
        ShapeFlag: getShapeFlag(type),
    };
    // 基于 children 再次设置 shapeFlag
    if (typeof children === "string") {
        vnode.ShapeFlag |= 8 /* TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.ShapeFlag |= 16 /* ARRAY_CHILDREN */;
    }
    if (vnode.ShapeFlag & 4 /* STATEFUL_COMPONENT */) {
        if (isObject(children)) {
            vnode.ShapeFlag |= 32 /* SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function createTextVNode(text) {
    return createvnode(Text, {}, text);
}
// 基于 type 来判断是什么类型的组件
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ELEMENT */
        : 4 /* STATEFUL_COMPONENT */;
}

function h(type, props, children) {
    return createvnode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (typeof slot === "function") {
        return createvnode(Fragment, {}, slot(props));
    }
}

let activeEffect;
let shouldTrack;
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.deps = [];
        this.active = true;
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        if (!this.active) {
            return this._fn();
        }
        shouldTrack = true;
        activeEffect = this;
        const res = this._fn();
        shouldTrack = false;
        return res;
    }
    stop() {
        if (this.active) {
            cleanupEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
function cleanupEffect(effect) {
    // 找到所有依赖这个 effect 的响应式对象
    // 从这些响应式对象里面把 effect 给删除掉
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
const targetMap = new Map();
function track(target, key) {
    if (!isTracking())
        return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
function trackEffects(dep) {
    // 已经存储过了就不用再存储了
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
}
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
function trigger(target, key) {
    let depsMap = targetMap.get(target);
    let dep = depsMap.get(key);
    triggerEffects(dep);
}
function triggerEffects(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}
function effect(fn, options = {}) {
    let _effect = new ReactiveEffect(fn, options.scheduler);
    extend(_effect, options);
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}

const get = createGetters();
const set = createSetters();
const readonlyGet = createGetters(true);
const createShallowReadonlyGet = createGetters(true, true);
function createGetters(isReadonly = false, shallow = false) {
    return function get(target, key) {
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__V_isReadonly" /* IS_READONLY */) {
            return isReadonly;
        }
        const res = Reflect.get(target, key);
        if (shallow) {
            return res;
        }
        // 判断 res 是否为 object
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        if (!isReadonly) {
            track(target, key);
        }
        return res;
    };
}
function createSetters() {
    return function get(target, key, value) {
        const res = Reflect.set(target, key, value);
        trigger(target, key);
        return res;
    };
}
const mutableHandlers = {
    get,
    set,
};
const readonlyHandlers = {
    get: readonlyGet,
    set: function (target, key, value) {
        // const res = Reflect.set(target, key,value);
        // return res;
        console.warn(`key:${key}   set 失败`);
        return true;
    },
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: createShallowReadonlyGet,
});

function reactive(raw) {
    return createActiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return createActiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    if (!isObject(raw)) {
        return console.warn('raw is not object');
    }
    return createActiveObject(raw, shallowReadonlyHandlers);
}
function createActiveObject(raw, basehandlers) {
    return new Proxy(raw, basehandlers);
}

class RefImpl {
    constructor(value) {
        // 代表是一个ref
        this._v_isRef = true;
        this._rawValue = value;
        // 如果传递过来的是对象的话 就用reactive包裹一下
        this._value = convert(value);
        // this._value =  value
        // 保存原始值
        this.dep = new Set();
    }
    get value() {
        //  依赖收集
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        if (hasChanged(newValue, this._rawValue)) {
            this._rawValue = newValue;
            this._value = convert(newValue);
            // 派发更新
            triggerEffects(this.dep);
        }
    }
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
function ref(value) {
    return new RefImpl(value);
}
function isRef(value) {
    return !!value._v_isRef;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
// 自动解构ref.value
function proxyRefs(value) {
    return new Proxy(value, {
        // 自动解构 ref.value
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            // 如果当前的target[key]是ref 且新值不是ref 就直接修改ref.value的值
            if (isRef(target[key]) && !isRef(value)) {
                return (target[key].value = value);
            }
            else {
                return Reflect.set(target, key, value);
            }
        },
    });
}

function emit(instace, event, ...args) {
    console.log("emit", event);
    const { props } = instace;
    const handlerName = toHandlerKey(camelize(event));
    const handler = props[handlerName];
    handler && handler(...args);
}

function initProps(instance, rawProps) {
    console.log("initProps");
    // TODO
    // 应该还有 attrs 的概念
    // attrs
    // 如果组件声明了 props 的话，那么才可以进入 props 属性内
    // 不然的话是需要存储在 attrs 内
    // 这里暂时直接赋值给 instance.props 即可
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    // 当用户调用 instance.proxy.$emit 时就会触发这个函数
    // i 就是 instance 的缩写 也就是组件实例对象
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots
};
const publicInstaceProxyHandlers = {
    get({ _: instance }, key) {
        // 先实现 setUp中返回的setUpState
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        const publicGetters = publicPropertiesMap[key];
        if (publicGetters) {
            return publicGetters(instance);
        }
    },
};

function initSlots(instance, children) {
    // 只有是slot 才添加
    const { vnode } = instance;
    if (vnode.ShapeFlag & 32 /* SLOT_CHILDREN */) {
        noramilzeObjectSlots(instance.slots, children);
    }
}
function noramilzeObjectSlots(slots, children) {
    for (const key in children) {
        const val = children[key];
        slots[key] = (props) => normailzeSlotValue(val(props));
    }
}
function normailzeSlotValue(val) {
    return Array.isArray(val) ? val : [val];
}

function createCompomentInstace(vnode, parent) {
    console.log("parentComponent", parent);
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        isMounted: false,
        subTree: {},
        emit: () => { },
        slots: {},
        provides: parent ? parent.provides : {},
        parent,
    };
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    // todo
    initProps(instance, instance.vnode.props);
    // initSLots
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const Compoment = instance.type;
    // ctx
    instance.proxy = new Proxy({ _: instance }, publicInstaceProxyHandlers);
    const { setup } = Compoment;
    if (setup) {
        setCurrentInstance(instance);
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    // todo function
    if (typeof setupResult === "object") {
        instance.setupState = proxyRefs(setupResult);
    }
    finishSetupComponent(instance);
}
function finishSetupComponent(instance) {
    const Compoment = instance.type;
    if (Compoment.render) {
        instance.render = Compoment.render;
    }
}
let currentInstance = null;
function setCurrentInstance(instance) {
    currentInstance = instance;
}
function getCurrentInstance() {
    return currentInstance;
}

function provide(key, value) {
    var _a;
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = (_a = currentInstance.parent) === null || _a === void 0 ? void 0 : _a.provides;
        // 这里要解决一个问题
        // 当父级 key 和 爷爷级别的 key 重复的时候，对于子组件来讲，需要取最近的父级别组件的值
        // 那这里的解决方案就是利用原型链来解决
        // provides 初始化的时候是在 createComponent 时处理的，当时是直接把 parent.provides 赋值给组件的 provides 的
        // 所以，如果说这里发现 provides 和 parentProvides 相等的话，那么就说明是第一次做 provide(对于当前组件来讲)
        // 我们就可以把 parent.provides 作为 currentInstance.provides 的原型重新赋值
        // 至于为什么不在 createComponent 的时候做这个处理，可能的好处是在这里初始化的话，是有个懒执行的效果（优化点，只有需要的时候在初始化）
        if (parentProvides === provides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === "function") {
                return defaultValue();
            }
            return defaultValue;
        }
        return parentProvides[key];
    }
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                // vnode
                // component => vnode
                // 再对vnode进行处理
                const vnode = createvnode(rootComponent);
                render(vnode, rootContainer);
            },
        };
    };
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert, remove: hostRemove, setElementText: hostSetElementText, } = options;
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
                if (ShapeFlag & 1 /* ELEMENT */) {
                    // 元素类型
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (ShapeFlag & 4 /* STATEFUL_COMPONENT */) {
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
        }
        else {
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
        if (ShapeFlag & 8 /* TEXT_CHILDREN */) {
            if (prevShapleFlag & 16 /* ARRAY_CHILDREN */) {
                // 1. 把老的children删掉
                unMountChildren(n1.children);
            }
            // 设置 text
            if (c1 !== c2) {
                hostSetElementText(container, c2);
            }
        }
        else {
            // 旧节点是text
            // text to array
            if (prevShapleFlag & 8 /* TEXT_CHILDREN */) {
                hostSetElementText(container, "");
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
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
            }
            else {
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
            }
            else {
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
        }
        else if (i > e2) {
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
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
                }
                else {
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
                }
                else {
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
        if (ShapeFlag & 8 /* TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (ShapeFlag & 16 /* ARRAY_CHILDREN */) {
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
    function mountCompoment(vnode, container, parentComponent, anchor) {
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
            }
            else {
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

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, preVal, nextVal) {
    const isOn = (value) => /^on[A-Z]/.test(value);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
function insert(children, parent, anchor) {
    parent.insertBefore(children, anchor || null);
}
function remove(children) {
    const parent = children.parentNode;
    if (parent) {
        parent.removeChild(children);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

export { createApp, createRenderer, createTextVNode, getCurrentInstance, h, inject, provide, ref, renderSlots };
