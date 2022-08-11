const queue: any[] = [];
let isFlushPending = false;

const p = Promise.resolve();

export function nextTick(fn?) {
  return fn ? p.then(fn) : fn;
}
export function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job);
    // 执行所有的 job
    queueFlush();
  }
}
function queueFlush() {
  if (isFlushPending) return;
  isFlushPending = true;
  nextTick(flushJobs);
}
function flushJobs() {
  isFlushPending = false;

  let job;
  while ((job = queue.shift())) {
    job && job();
  }
}
