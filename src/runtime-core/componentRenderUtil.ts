export function shouldUpdateComponent(prevVNode, nextVNode) {
  const { props: prevProps } = prevVNode;
  const { props: nextProps } = nextVNode;
  for (let Key in nextProps) {
    if (nextProps[Key] !== prevProps[Key]) {
      return true;
    }
    return false;
  }
}
