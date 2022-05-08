export function createCompomentInstace(vnode) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
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
  // ctx
  instance.proxy = new Proxy(
    {},
    {
      get(target, key) {
        debugger
        // 先实现 setUp中返回的setUpState
        const { setupState } = instance;
        if (key in setupState) {
          return setupState[key];
        }
      },
    }
  );
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

function finishSetupComponent(instance: any) {
  const Compoment = instance.type;
  if (Compoment.render) {
    instance.render = Compoment.render;
  }
}
