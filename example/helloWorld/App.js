import {h} from '../../lib/mini-vue.esm.js'
export const App = {
  render() {
    return h('div', 'hi' + this.msg)
  },
  setUp() {
    return {
      msg: 'world'
    }
  }
}