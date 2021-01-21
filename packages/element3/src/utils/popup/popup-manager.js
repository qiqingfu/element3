import { addClass, removeClass } from '../../utils/dom'

let hasModal = false
let hasInitZIndex = false
let zIndex

const getModal = function () {
  // if (Vue.prototype.$isServer) return
  let modalDom = PopupManager.modalDom
  if (modalDom) {
    hasModal = true
  } else {
    hasModal = false
    /**
     * 创建一个新的 dom节点, 并且赋值给 modalDom 属性
     */
    modalDom = document.createElement('div')
    PopupManager.modalDom = modalDom

    /**
     * ontouchmove 事件
     * passive, 如果设置为 true, 表示 listener 永远不会调用 preventDefault()
     * 如果任然调用, 则客户端会忽略并抛出一个警告, 使用 passive 改善的滚动性能
     */
    modalDom.addEventListener(
      'touchmove',
      function (event) {
        event.preventDefault()
        event.stopPropagation()
      },
      { passive: true }
    )

    modalDom.addEventListener('click', function () {
      PopupManager.doOnModalClick && PopupManager.doOnModalClick()
    })
  }

  return modalDom
}

/**
 * 缓存一些弹框组件的 vue 实例对象
 * popup-[index]
 */
const instances = {}

const PopupManager = {
  modalFade: true,

  getInstance: function (id) {
    return instances[id]
  },

  register: function (id, instance) {
    if (id && instance) {
      instances[id] = instance
    }
  },

  deregister: function (id) {
    if (id) {
      instances[id] = null
      delete instances[id]
    }
  },

  nextZIndex: function () {
    return PopupManager.zIndex++
  },

  modalStack: [],

  doOnModalClick: function () {
    const topItem = PopupManager.modalStack[PopupManager.modalStack.length - 1]
    if (!topItem) return

    const instance = PopupManager.getInstance(topItem.id)
    if (instance && instance.closeOnClickModal) {
      instance.close()
    }
  },

  /**
   * @param id  当前 vue 实例 key id 标识符
   * @param zIndex PopupManager 内部维护的自增 zIndex
   * @param dom   根据 modalAppendToBody 属性决定, 如果为 false, 遮罩层则插入到 Dialog 的父元素上, 否则插入 body 元素内
   * @param modalClass 暂时未知来源
   * @param modalFade  暂时未知来源
   */
  openModal: function (id, zIndex, dom, modalClass, modalFade) {
    // if (Vue.prototype.$isServer) return
    if (!id || zIndex === undefined) return
    /**
     * 未知来源的属性, 存储在当前对象的 modalFade 属性上
     */
    this.modalFade = modalFade
    /**
     * 校验,当前 modal 是否已经被缓存在 modalStack 栈中
     * 如果已存在, 则后续操作终止掉
     */
    const modalStack = this.modalStack
    for (let i = 0, j = modalStack.length; i < j; i++) {
      const item = modalStack[i]
      if (item.id === id) {
        return
      }
    }

    const modalDom = getModal()
    if (zIndex) {
      modalDom.style.zIndex = zIndex
    }
    addClass(modalDom, 'v-modal')
    if (this.modalFade && !hasModal) {
      addClass(modalDom, 'v-modal-enter')
    }
    if (modalClass) {
      const classArr = modalClass.trim().split(/\s+/)
      classArr.forEach((item) => addClass(modalDom, item))
    }
    setTimeout(() => {
      removeClass(modalDom, 'v-modal-enter')
    }, 200)

    if (dom && dom.parentNode && dom.parentNode.nodeType !== 11) {
      dom.parentNode.appendChild(modalDom)
    } else {
      document.body.appendChild(modalDom)
    }

    modalDom.tabIndex = 0
    modalDom.style.display = ''

    this.modalStack.push({ id: id, zIndex: zIndex, modalClass: modalClass })
  },

  closeModal: function (id) {
    const modalStack = this.modalStack
    const modalDom = getModal()

    if (modalStack.length > 0) {
      const topItem = modalStack[modalStack.length - 1]
      if (topItem.id === id) {
        if (topItem.modalClass) {
          const classArr = topItem.modalClass.trim().split(/\s+/)
          classArr.forEach((item) => removeClass(modalDom, item))
        }
        modalStack.pop()
        if (modalStack.length > 0) {
          modalDom.style.zIndex = modalStack[modalStack.length - 1].zIndex
        }
      } else {
        for (let i = modalStack.length - 1; i >= 0; i--) {
          if (modalStack[i].id === id) {
            modalStack.splice(i, 1)
            break
          }
        }
      }
    }

    if (modalStack.length === 0) {
      if (this.modalFade) {
        addClass(modalDom, 'v-modal-leave')
      }
      setTimeout(() => {
        if (modalStack.length === 0) {
          if (modalDom.parentNode) modalDom.parentNode.removeChild(modalDom)
          modalDom.style.display = 'none'
          PopupManager.modalDom = undefined
        }
        removeClass(modalDom, 'v-modal-leave')
      }, 200)
    }
  }
}

Object.defineProperty(PopupManager, 'zIndex', {
  configurable: true,
  get() {
    if (!hasInitZIndex) {
      // zIndex = zIndex || (Vue.prototype.$ELEMENT || {}).zIndex || 2000
      zIndex = zIndex || 2000
      hasInitZIndex = true
    }
    return zIndex
  },
  set(value) {
    zIndex = value
  }
})

const getTopPopup = function () {
  // if (Vue.prototype.$isServer) return
  if (PopupManager.modalStack.length > 0) {
    const topPopup = PopupManager.modalStack[PopupManager.modalStack.length - 1]
    if (!topPopup) return
    const instance = PopupManager.getInstance(topPopup.id)

    return instance
  }
}

// if (!Vue.prototype.$isServer) {
// handle `esc` key when the popup is shown
window.addEventListener('keydown', function (event) {
  if (event.keyCode === 27) {
    const topPopup = getTopPopup()

    if (topPopup && topPopup.closeOnPressEscape) {
      topPopup.handleClose
        ? topPopup.handleClose()
        : topPopup.handleAction
        ? topPopup.handleAction('cancel')
        : topPopup.close()
    }
  }
})

export default PopupManager
