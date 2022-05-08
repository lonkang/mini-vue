export function createCompomentInstace(vnode) {
  const component = {
    vnode,
    type: vnode.type,
  };
  return component;
}
export function setupComponent(instance) {
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

function finishSetupComponent(instance: any) {
  const Compoment = instance.type;
  if (Compoment.render) {
    instance.render = Compoment.render;
  }
}
