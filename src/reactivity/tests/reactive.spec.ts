import { reactive } from "../reactive"

describe('rective', () => { 
  
  it('happy path', () => {
    const obj = {foo: 1}
    const observed = reactive(obj)
    expect(observed).not.toBe(obj)
    expect(observed.foo).toBe(1)
  })
})