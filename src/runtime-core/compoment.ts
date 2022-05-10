import { shallowReadonly } from "../reactivity/reactive";
import { emit } from "./componentEmits";
import { initProps } from "./componentProps";
import { publicInstaceProxyHandlers } from "./componentPublickIntace";
import { initSlots } from "./componentSlots";

export function createCompomentInstace(vnode) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
    emit: () => {},
    slots: {}
  };
  component.emit = emit.bind(null, component) as any;

  return component;
}
export function setupComponent(instance) {
  // todo

  initProps(instance, instance.vnode.props);
  // initSLots
  initSlots(instance, instance.vnode.children)

  setupStatefulComponent(instance);
}

function setupStatefulComponent(instance) {
  const Compoment = instance.type;
  // ctx
  instance.proxy = new Proxy({ _: instance }, publicInstaceProxyHandlers);
  const { setUp } = Compoment;
  if (setUp) {
    const setupResult = setUp(shallowReadonly(instance.props), {
      emit: instance.emit,
    });
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

function finishSetupComponent(instance: any) {
  const Compoment = instance.type;
  if (Compoment.render) {
    instance.render = Compoment.render;
  }
}
