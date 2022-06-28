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

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createvnode(type, props, children) {
    const vnode = {
        type,
        props,
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
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert, } = options;
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
                if (ShapeFlag & 1 /* ELEMENT */) {
                    // 元素类型
                    processElement(n1, n2, container, parentComponent);
                }
                else if (ShapeFlag & 4 /* STATEFUL_COMPONENT */) {
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
        }
        else {
            patchElement(n1, n2);
        }
    }
    function patchElement(n1, n2, container) {
        console.log('patchElement');
        console.log('n1', n1);
        console.log('n2', n2);
    }
    function mountElement(vnode, container, parentComponent) {
        const { type, children, props, ShapeFlag } = vnode;
        const el = (vnode.el = hostCreateElement(vnode.type));
        if (ShapeFlag & 8 /* TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (ShapeFlag & 16 /* ARRAY_CHILDREN */) {
            mountChildren(children, el, parentComponent);
        }
        // 处理props
        for (const key in props) {
            const val = props[key];
            hostPatchProp(el, key, val);
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
    function mountCompoment(vnode, container, parentComponent) {
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
            }
            else {
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

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, val) {
    const isOn = (value) => /^on[A-Z]/.test(value);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, val);
    }
    else {
        el.setAttribute(key, val);
    }
}
function insert(el, parent) {
    parent.append(el);
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

export { createApp, createRenderer, createTextVNode, getCurrentInstance, h, inject, provide, ref, renderSlots };
