import { extend } from "./shared"

class ReactiveEffect {
  private _fn: any
  deps = []
  active = true
  onStop?: () => void
  public scheduler: Function | undefined
  constructor(fn,  scheduler) {
    this._fn = fn
    this.scheduler = scheduler
  }
  run() {
    activeEffect = this
    return this._fn()
  }
  stop () {
    if(this.active) {
      cleanupEffect(this);
      if(this.onStop) {
        this.onStop()
      }
      this.active = false
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
export function track(target, key) {
  let depsMap = targetMap.get(target)
  if(!depsMap) {
    depsMap  = new Map()
    targetMap.set(target, depsMap)
  }
  let dep = depsMap.get(key)
  if(!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }
  if(!activeEffect) return
  dep.add(activeEffect)
  activeEffect.deps.push(dep)
}
export function trigger(target, key) {
  let depsMap = targetMap.get(target)
  let dep = depsMap.get(key)
  for (const effect of dep) {
    if(effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}

let activeEffect
export  function effect (fn, options:any = {}){
  let _effect = new ReactiveEffect(fn, options.scheduler)
  extend(_effect, options)
  _effect.run()
  const runner : any = _effect.run.bind(_effect)
  runner.effect = _effect
  return runner
}
export function stop(runner) {
  runner.effect.stop()
}