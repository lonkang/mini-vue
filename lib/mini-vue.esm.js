function toDisplayString(val) {
    return String(val);
}

const extend = Object.assign;
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
const isString = (val) => {
    return typeof val === 'string';
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
        component: null,
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
    $slots: (i) => i.slots,
    $props: (i) => i.props
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
    if (compiler && !Compoment.render) {
        if (Compoment.template) {
            Compoment.render = compiler(Compoment.template);
        }
    }
    instance.render = Compoment.render;
}
let currentInstance = null;
function setCurrentInstance(instance) {
    currentInstance = instance;
}
function getCurrentInstance() {
    return currentInstance;
}
let compiler;
function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
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

function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    for (let Key in nextProps) {
        if (nextProps[Key] !== prevProps[Key]) {
            return true;
        }
        return false;
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

const queue = [];
let isFlushPending = false;
const p = Promise.resolve();
function nextTick(fn) {
    return fn ? p.then(fn) : fn;
}
function queueJob(job) {
    if (!queue.includes(job)) {
        queue.push(job);
        // 执行所有的 job
        queueFlush();
    }
}
function queueFlush() {
    if (isFlushPending)
        return;
    isFlushPending = true;
    nextTick(flushJobs);
}
function flushJobs() {
    isFlushPending = false;
    let job;
    while ((job = queue.shift())) {
        job && job();
    }
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText, } = options;
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
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    if (newIndex > maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
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
                }
                else if (moved) {
                    // 需要移动
                    // 1. j 已经没有了 说明剩下的都需要移动了
                    // 2. 最长子序列里面的值和当前的值匹配不上， 说明当前元素需要移动
                    if (j < 0 || increasingNewIndexSequence[j] !== i) {
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
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
        }
        else {
            updateComponent(n1, n2);
        }
    }
    function mountCompoment(vnode, container, parentComponent, anchor) {
        const instace = (vnode.component = createCompomentInstace(vnode, parentComponent));
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
        }
        else {
            console.log(`组件不需要更新: ${instance}`);
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    function setupRenderEffect(instace, vnode, container, anchor) {
        function componentUpdateFn() {
            // 绑定proxy 使得render函数能使用this
            if (!instace.isMounted) {
                const { proxy } = instace;
                const subTree = (instace.subTree = instace.render.call(proxy, proxy));
                // vnode => patch
                // vnode => element => mountCompoment
                patch(null, subTree, container, instace, anchor);
                vnode.el = subTree.el;
                instace.isMounted = true;
            }
            else {
                const { next, vnode } = instace;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instace, next);
                }
                const { proxy } = instace;
                const subTree = instace.render.call(proxy, proxy);
                const prevSubTree = instace.subTree;
                instace.subTree = subTree;
                patch(prevSubTree, subTree, container, instace, anchor);
            }
        }
        instace.update = effect(componentUpdateFn, {
            scheduler: () => {
                // 把 effect 推到微任务的时候在执行
                queueJob(instace.update);
            },
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
function getSequence(arr) {
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
                }
                else {
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

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createApp: createApp,
    h: h,
    renderSlots: renderSlots,
    createTextVNode: createTextVNode,
    createElementVNode: createvnode,
    getCurrentInstance: getCurrentInstance,
    registerRuntimeCompiler: registerRuntimeCompiler,
    provide: provide,
    inject: inject,
    createRenderer: createRenderer,
    nextTick: nextTick,
    toDisplayString: toDisplayString,
    ref: ref
});

const TO_DISPLAY_STRING = Symbol("toDisplayString");
const CREATE_ELEMENT_VNODE = Symbol("createElementVNode");
const helperMapName = {
    [TO_DISPLAY_STRING]: "toDisplayString",
    [CREATE_ELEMENT_VNODE]: "createElementVNode",
};

function generate(ast) {
    const context = createCodegenContext();
    const { push } = context;
    genFuncionPremable(ast, context);
    const functionName = "render";
    const args = ["_ctx", "_cache"];
    const signature = args.join(", ");
    push(`function ${functionName}(${signature}){`);
    push("return ");
    genNode(ast.codegenNode, context);
    // push("return ");
    push("}");
    return {
        code: context.code,
    };
}
function genFuncionPremable(ast, context) {
    const { push } = context;
    const VueBinging = "Vue";
    const aliasHelper = (s) => `${helperMapName[s]}:_${helperMapName[s]}`;
    if (ast.helpers.length > 0) {
        push(`const { ${ast.helpers.map(aliasHelper).join(", ")} } = ${VueBinging}`);
    }
    push("\n");
    push("return ");
}
function createCodegenContext() {
    const context = {
        code: "",
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helperMapName[key]}`;
        },
    };
    return context;
}
// 根据节点的类型然后分别处理
function genNode(node, context) {
    switch (node.type) {
        case 1 /* TEXT */:
            genText(node, context);
            break;
        case 3 /* INTERPOLATION */:
            genInterpolation(node, context);
            break;
        case 4 /* SIMPLE_EXPRESSION */:
            genExpression(node, context);
            break;
        case 2 /* ELEMENT */:
            genElement(node, context);
            break;
        case 5 /* COMPOUND_EXPRESSION */:
            genCompoundExpression(node, context);
            break;
    }
}
function genElement(node, context) {
    const { push, helper } = context;
    const { tag, props, children } = node;
    push(`${helper(CREATE_ELEMENT_VNODE)}(`);
    genNodeList(genNullable([tag, props, children]), context);
    push(`)`);
}
function genNodeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else {
            genNode(node, context);
        }
        // node 和 node 之间需要加上 逗号(,)
        // 但是最后一个不需要 "div", [props], [children]
        if (i < nodes.length - 1) {
            push(", ");
        }
    }
}
function genNullable(args) {
    return args.map((arg) => arg || "null");
}
function genCompoundExpression(node, context) {
    const { push } = context;
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}
// 处理文本
function genText(node, context) {
    const { push } = context;
    push(`'${node.content}'`);
}
// 处理插值
function genInterpolation(node, context) {
    const { push, helper } = context;
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(")");
}
// 表达式
function genExpression(node, context) {
    const { push } = context;
    push(`${node.content}`);
}

const baseParse = (content) => {
    const context = createParseContext(content);
    return createRoot(parseChildren(context, []));
};
function parseChildren(context, ancestors) {
    console.log("开始解析 children");
    const nodes = [];
    while (!isEnd(context, ancestors)) {
        let node;
        const s = context.source;
        if (startsWith(s, "{{")) {
            // 看看如果是 {{ 开头的话，那么就是一个插值， 那么去解析他
            node = parseInterpolation(context);
        }
        else if (s[0] === "<") {
            if (/[a-z]/i.test(s[1])) {
                node = parseElement(context, ancestors);
            }
        }
        if (!node) {
            node = parseText(context);
        }
        nodes.push(node);
    }
    return nodes;
}
function isEnd(context, ancestors) {
    // 检测标签的节点
    // 如果是结束标签的话，需要看看之前有没有开始标签，如果有的话，那么也应该结束
    // 这里的一个 edge case 是 <div><span></div>
    // 像这种情况下，其实就应该报错
    const s = context.source;
    if (context.source.startsWith("</")) {
        // 从后面往前面查
        // 因为便签如果存在的话 应该是 ancestors 最后一个元素
        for (let i = ancestors.length - 1; i >= 0; --i) {
            if (startsWithEndTagOpen(s, ancestors[i].tag)) {
                return true;
            }
        }
    }
    // 看看 context.source 还有没有值
    return !context.source;
}
function startsWithEndTagOpen(source, tag) {
    // 1. 头部 是不是以  </ 开头的
    // 2. 看看是不是和 tag 一样
    return (startsWith(source, "</") &&
        source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase());
}
function startsWith(source, searchString) {
    return source.startsWith(searchString);
}
function parseText(context) {
    console.log("解析 text", context);
    // endIndex 应该看看有没有对应的 <
    // 比如 hello</div>
    // 像这种情况下 endIndex 就应该是在 o 这里
    // {
    const endTokens = ["<", "{{"];
    let endIndex = context.source.length;
    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i]);
        // endIndex > index 是需要要 endIndex 尽可能的小
        // 比如说：
        // hi, {{123}} <div></div>
        // 那么这里就应该停到 {{ 这里，而不是停到 <div 这里
        if (index !== -1 && endIndex > index) {
            endIndex = index;
        }
    }
    const content = parseTextData(context, endIndex);
    return {
        type: 1 /* TEXT */,
        content,
    };
}
function parseTextData(context, length) {
    console.log("解析 textData");
    // 1. 直接返回 context.source
    // 从 length 切的话，是为了可以获取到 text 的值（需要用一个范围来确定）
    const rawText = context.source.slice(0, length);
    // 2. 移动光标
    advanceBy(context, length);
    return rawText;
}
function parseElement(context, ancestors) {
    // 1.解析tag
    const element = parseTag(context, 0 /* Start */);
    // 2. 解析children
    ancestors.push(element);
    element.children = parseChildren(context, ancestors);
    ancestors.pop();
    // 解析 end tag 是为了检测语法是不是正确的
    // 检测是不是和 start tag 一致
    if (startsWithEndTagOpen(context.source, element.tag)) {
        parseTag(context, 1 /* End */);
    }
    else {
        throw new Error(`缺失结束标签：${element.tag}`);
    }
    return element;
}
function parseTag(context, type) {
    const match = /^<\/?([a-z]*)/i.exec(context.source);
    const tag = match[1];
    // 删除处理完成的代码
    advanceBy(context, match[0].length);
    // 删除>
    advanceBy(context, 1);
    if (type === 1 /* End */)
        return;
    return {
        type: 2 /* ELEMENT */,
        tag,
    };
}
function parseInterpolation(context) {
    // 1. 先获取到结束的index
    // 2. 通过 closeIndex - startIndex 获取到内容的长度 contextLength
    // 3. 通过 slice 截取内容
    // }} 是插值的关闭
    const openDelimiter = "{{";
    const closeDelimiter = "}}";
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length);
    // 让代码前进2个长度，可以把 {{ 干掉
    advanceBy(context, openDelimiter.length);
    console.log(context, "context");
    const rawContentLength = closeIndex - openDelimiter.length;
    const rawContent = parseTextData(context, rawContentLength);
    const content = rawContent.trim();
    // 最后在让代码前进2个长度，可以把 }} 干掉
    advanceBy(context, closeDelimiter.length);
    return {
        type: 3 /* INTERPOLATION */,
        content: {
            type: 4 /* SIMPLE_EXPRESSION */,
            content,
        },
    };
}
function advanceBy(content, length) {
    content.source = content.source.slice(length);
}
function createParseContext(content) {
    return {
        source: content,
    };
}
function createRoot(children) {
    return {
        type: 0 /* ROOT */,
        children,
    };
}

function transform(root, options = {}) {
    const context = createTransformContext(root, options);
    // 1. 遍历-深度优先搜素
    traverseNode(root, context);
    // 2.修改context
    createRootCodegen(root);
    root.helpers = [...context.helpers.keys()];
}
function createRootCodegen(root) {
    const { children } = root;
    // 只支持有一个根节点
    // 并且还是一个 single text node
    const child = children[0];
    // 如果是 element 类型的话 ， 那么我们需要把它的 codegenNode 赋值给 root
    // root 其实是个空的什么数据都没有的节点
    // 所以这里需要额外的处理 codegenNode
    // codegenNode 的目的是专门为了 codegen 准备的  为的就是和 ast 的 node 分离开
    if (child.type === 2 /* ELEMENT */ && child.codegenNode) {
        const codegenNode = child.codegenNode;
        root.codegenNode = codegenNode;
    }
    else {
        root.codegenNode = child;
    }
}
// 创建全局对象
function createTransformContext(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1);
        },
    };
    return context;
}
function traverseNode(node, context) {
    const nodeTransforms = context.nodeTransforms;
    const exitFns = [];
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        const onExit = transform(node, context);
        if (onExit) {
            exitFns.push(onExit);
        }
    }
    switch (node.type) {
        case 3 /* INTERPOLATION */:
            context.helper(TO_DISPLAY_STRING);
            break;
        case 0 /* ROOT */:
        case 2 /* ELEMENT */:
            traverseChildren(node, context);
            break;
    }
    let i = exitFns.length;
    while (i--) {
        exitFns[i]();
    }
}
function traverseChildren(node, context) {
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        traverseNode(node, context);
    }
}

// 创建元素类型的方法
function createVNodeCall(context, tag, props, children) {
    context.helper(CREATE_ELEMENT_VNODE);
    return {
        type: 2 /* ELEMENT */,
        tag,
        props,
        children,
    };
}

// 处理元素类型
function transformElement(node, context) {
    if (node.type === 2 /* ELEMENT */) {
        return () => {
            // tag
            const vnodeTag = `'${node.tag}'`;
            // props
            let vnodeProps;
            // children
            const children = node.children;
            let vnodeChildren = children[0];
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
}

// 处理插值类型
function transformExpression(node) {
    if (node.type === 3 /* INTERPOLATION */) {
        node.content = processExpression(node.content);
    }
}
function processExpression(node) {
    node.content = `_ctx.${node.content}`;
    return node;
}

function isText(node) {
    return node.type === 3 /* INTERPOLATION */ || node.type === 1 /* TEXT */;
}

// 创建元素类型 例如 '<div></div>'
function transformText(node, context) {
    if (node.type === 2 /* ELEMENT */) {
        // 在 exit 的时期执行
        // 下面的逻辑会改变 ast 树
        // 有些逻辑是需要在改变之前做处理的
        return () => {
            // hi,{{msg}}
            // 上面的模块会生成2个节点，一个是 text 一个是 interpolation 的话
            // 生成的 render 函数应该为 "hi," + _toDisplayString(_ctx.msg)
            // 这里面就会涉及到添加一个 “+” 操作符
            // 那这里的逻辑就是处理它
            // 检测下一个节点是不是 text 类型，如果是的话， 那么会创建一个 COMPOUND 类型
            // COMPOUND 类型把 2个 text || interpolation 包裹（相当于是父级容器）
            const children = node.children;
            let currentContainer;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isText(child)) {
                    // 看看下一个节点是不是 text 类
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            // currentContainer 的目的是把相邻的节点都放到一个 容器内
                            if (!currentContainer) {
                                currentContainer = children[i] = {
                                    type: 5 /* COMPOUND_EXPRESSION */,
                                    children: [child],
                                };
                            }
                            currentContainer.children.push(` + `, next);
                            // 把当前的节点放到容器内, 然后删除掉j
                            children.splice(j, 1);
                            // 因为把 j 删除了，所以这里就少了一个元素，那么 j 需要 --
                            j--;
                        }
                        else {
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function baseCompile(template) {
    // 将目标编译成ast
    const ast = baseParse(template);
    // 2. 给 ast 进行修改
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText],
    });
    // 生成render函数代码
    return generate(ast);
}

function compileToFunction(template) {
    const { code } = baseCompile(template);
    const render = new Function("Vue", code)(runtimeDom);
    return render;
}
registerRuntimeCompiler(compileToFunction);

export { createApp, createvnode as createElementVNode, createRenderer, createTextVNode, getCurrentInstance, h, inject, nextTick, provide, ref, registerRuntimeCompiler, renderSlots, toDisplayString };
