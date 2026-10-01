import { ref, shallowRef } from 'vue'
import { ElMessage } from 'element-plus'
import { buildBindReturnUrl, IdpBindApi, parseIamResult } from './api'

const t = (_key: string, fallback: string) => fallback

const DD_LOGIN_SRC = 'https://g.alicdn.com/dingding/dinglogin/0.0.5/ddLogin.js'
const QR_CONTAINER_ID = 'dingtalk-passport-bind-qr'

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('ddLogin script load failed'))
    document.head.appendChild(script)
  })
}

function extractLoginTmpCode(data: unknown): string | null {
  if (data == null) return null
  if (typeof data === 'string') return data
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (obj.loginTmpCode) return String(obj.loginTmpCode)
    if (obj.tmpCode) return String(obj.tmpCode)
  }
  return null
}

export function useDingTalkPassportBind(bindMode: string) {
  const statusText = ref(t('MS_PP_DING_OPEN', '打开弹窗后将加载钉钉扫码'))
  const loading = ref(false)
  const messageHandler = shallowRef<((ev: MessageEvent) => void) | null>(null)
  let started = false

  function setStatus(text: string) {
    statusText.value = text
  }

  function teardown() {
    if (messageHandler.value) {
      window.removeEventListener('message', messageHandler.value, false)
      messageHandler.value = null
    }
    started = false
    const el = document.getElementById(QR_CONTAINER_ID)
    if (el) el.innerHTML = ''
  }

  async function initQr() {
    if (started) return
    started = true
    loading.value = true
    setStatus(t('MS_PP_DING_LOADING', '正在加载钉钉扫码…'))
    try {
      await loadScript(DD_LOGIN_SRC)
      const result = await IdpBindApi.start({
        bindMode,
        returnUrl: buildBindReturnUrl(),
      })
      const { gotoUrl } = parseIamResult(result)
      if (!gotoUrl) {
        setStatus(t('MS_PP_DING_PREP_FAIL', '无法准备钉钉扫码，请稍后重试'))
        return
      }
      if (typeof window.DDLogin !== 'function') {
        setStatus(t('MS_PP_DING_NOT_READY', '钉钉扫码组件未就绪，请刷新后重试'))
        return
      }
      const onMsg = (ev: MessageEvent) => {
        if (ev.origin !== 'https://login.dingtalk.com') return
        const code = extractLoginTmpCode(ev.data)
        if (!code) return
        window.removeEventListener('message', onMsg, false)
        messageHandler.value = null
        try {
          const url = new URL(gotoUrl)
          url.searchParams.set('loginTmpCode', code)
          window.location.assign(url.toString())
        } catch {
          setStatus(t('MS_PP_DING_SCAN_FAIL', '扫码成功，但跳转失败，请关闭弹窗后重试'))
        }
      }
      messageHandler.value = onMsg
      window.addEventListener('message', onMsg, false)
      window.DDLogin({
        id: QR_CONTAINER_ID,
        goto: encodeURIComponent(gotoUrl),
        style: 'border:none;background-color:#FFFFFF;',
        width: '300',
        height: '300',
      })
      setStatus(t('MS_PP_DING_SCAN', '请使用钉钉扫描上方二维码'))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('MS_PP_DING_LOAD_FAIL', '加载钉钉扫码失败')
      setStatus(msg)
      ElMessage.error(msg)
    } finally {
      loading.value = false
    }
  }

  return {
    statusText,
    loading,
    qrContainerId: QR_CONTAINER_ID,
    initQr,
    teardown,
  }
}

declare global {
  interface Window {
    DDLogin?: (opts: {
      id: string
      goto: string
      style?: string
      width?: string
      height?: string
    }) => void
  }
}
