'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const extend = Object.assign;
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
const hasOwn = (val, key) => {
    return Object.prototype.hasOwnProperty.call(val, key);
};

const targetMap = new Map();
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

function createCompomentInstace(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {}
    };
    return component;
}
function setupComponent(instance) {
    // todo
    initProps(instance, instance.vnode.props);
    // initSLots
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const Compoment = instance.type;
    // ctx
    instance.proxy = new Proxy({ _: instance }, publicInstaceProxyHandlers);
    const { setUp } = Compoment;
    if (setUp) {
        const setupResult = setUp(shallowReadonly(instance.props));
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    // todo function
    if (typeof setupResult === "object") {
        instance.setupState = setupResult;
    }
    finishSetupComponent(instance);
}
function finishSetupComponent(instance) {
    const Compoment = instance.type;
    if (Compoment.render) {
        instance.render = Compoment.render;
    }
}

function render(vnode, container) {
    patch(vnode, container);
}
function patch(vnode, container) {
    // todo 判断vnode是不是一个element
    // 是element就处理element
    // 处理组件
    const { ShapeFlag } = vnode;
    console.log(vnode.type);
    if (ShapeFlag & 1 /* ELEMENT */) {
        // 元素类型
        processElement(vnode, container);
    }
    else if (ShapeFlag & 4 /* STATEFUL_COMPONENT */) {
        // 组件类型
        processComponent(vnode, container);
    }
}
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    const { type, children, props, ShapeFlag } = vnode;
    const el = (vnode.el = document.createElement(type));
    if (ShapeFlag & 8 /* TEXT_CHILDREN */) {
        el.textContent = children;
    }
    else if (ShapeFlag & 16 /* ARRAY_CHILDREN */) {
        mountChildren(children, el);
    }
    // 处理props
    for (const key in props) {
        const val = props[key];
        const isOn = (value) => /^on[A-Z]/.test(value);
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, val);
        }
        else {
            el.setAttribute(key, val);
        }
    }
    container.append(el);
}
function mountChildren(children, container) {
    children.forEach((v) => {
        patch(v, container);
    });
}
function processComponent(vnode, container) {
    mountCompoment(vnode, container);
}
function mountCompoment(vnode, container) {
    const instace = createCompomentInstace(vnode);
    setupComponent(instace);
    setupRenderEffect(instace, vnode, container);
}
function setupRenderEffect(instace, vnode, container) {
    // 绑定proxy 使得render函数能使用this
    const { proxy } = instace;
    const subTree = instace.render.call(proxy);
    // vnode => patch
    // vnode => element => mountCompoment
    patch(subTree, container);
    vnode.el = subTree.el;
}

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
    return vnode;
}
// 基于 type 来判断是什么类型的组件
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ELEMENT */
        : 4 /* STATEFUL_COMPONENT */;
}

function createApp(rootComponent) {
    return {
        mouted(rootContainer) {
            // vnode
            // component => vnode
            // 再对vnode进行处理
            const vnode = createvnode(rootComponent);
            render(vnode, rootContainer);
        },
    };
}

function h(type, props, children) {
    return createvnode(type, props, children);
}

exports.createApp = createApp;
exports.h = h;
