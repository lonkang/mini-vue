'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const isObject = (val) => {
    return val !== null && typeof val === 'object';
};

function createCompomentInstace(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
    };
    return component;
}
function setupComponent(instance) {
    // todo
    // initProps
    // initSLots
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const Compoment = instance.type;
    // ctx
    instance.proxy = new Proxy({}, {
        get(target, key) {
            debugger;
            // 先实现 setUp中返回的setUpState
            const { setupState } = instance;
            if (key in setupState) {
                return setupState[key];
            }
        },
    });
    const { setUp } = Compoment;
    if (setUp) {
        const setupResult = setUp();
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
    console.log(vnode.type);
    if (typeof vnode.type === "string") {
        processElement(vnode, container);
    }
    else if (isObject(vnode.type)) {
        processComponent(vnode, container);
    }
}
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    const { type, children, props } = vnode;
    const el = document.createElement(type);
    if (typeof children === "string") {
        el.textContent = children;
    }
    else if (Array.isArray(children)) {
        mountChildren(children, el);
    }
    for (const key in props) {
        const val = props[key];
        el.setAttribute(key, val);
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
    setupRenderEffect(instace, container);
}
function setupRenderEffect(instace, container) {
    // 绑定proxy
    const { proxy } = instace;
    const subTree = instace.render.call(proxy);
    // vnode => patch
    // vnode => element => mountCompoment
    patch(subTree, container);
}

function createvnode(type, props, children) {
    const vnode = {
        type, props, children
    };
    return vnode;
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
