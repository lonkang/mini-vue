import { camelize, toHandlerKey } from "../shared/index";

export function emit(instace, event, ...args) {
  console.log("emit", event);
  const { props } = instace;

  const handlerName = toHandlerKey(camelize(event));
  const handler = props[handlerName];
  handler && handler(...args);
}
