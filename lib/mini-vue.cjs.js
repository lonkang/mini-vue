'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function createCompomentInstace(VNode) {
    const component = {
        VNode,
        type: VNode.type,
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
    const { setUp } = Compoment;
    if (setUp) {
        const setUpResult = setUp();
        handleSetupResult(instance, setUpResult);
    }
}
function handleSetupResult(instance, setUpResult) {
    // todo function
    if (typeof setUpResult === "object") {
        instance.setUpState = setUpResult;
    }
    finishSetupComponent(instance);
}
function finishSetupComponent(instance) {
    const Compoment = instance.type;
    if (Compoment.render) {
        Compoment.render = Compoment.render;
    }
}

function render(VNode, container) {
    patch(VNode);
}
function patch(VNode, container) {
    // todo 判断Vnode是不是一个element
    // 是element就处理element
    // processElement()
    // 处理组件
    processComponent(VNode);
}
function processComponent(VNode, container) {
    mountCompoment(VNode);
}
function mountCompoment(VNode, container) {
    const instace = createCompomentInstace(VNode);
    setupComponent(instace);
    setupRenderEffect(instace);
}
function setupRenderEffect(instace, container) {
    const subTree = instace.render();
    // vnode => patch
    // vnode => element => mountCompoment
    patch(subTree);
}

function createVNode(type, props, childre) {
    const VNode = {
        type, props, childre
    };
    return VNode;
}

function createApp(rootComponent) {
    return {
        mouted(rootContainer) {
            // VNode
            // component => VNode
            // 再对VNode进行处理
            const VNode = createVNode(rootComponent);
            render(VNode);
        },
    };
}

function h(type, props, childre) {
    return createVNode(type, props, childre);
}

exports.createApp = createApp;
exports.h = h;
