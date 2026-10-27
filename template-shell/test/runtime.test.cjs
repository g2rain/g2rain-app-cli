const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function load(file, mocks, globals = {}, source) {
  const filename = path.join(__dirname, '..', file)
  const code = ts.transpileModule(source ?? fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exported = {}
  vm.runInNewContext(code, {
    exports: exported, console: { info() {}, warn() {}, error() {} },
    require(name) {
      if (!(name in mocks)) throw Error(`Missing test dependency: ${name}`)
      return mocks[name]
    }, ...globals,
  }, { filename })
  return exported
}

function navigation() {
  const storage = new Map()
  const flags = load('src/shared/deep-link-flags.ts', {})
  const menu = { initialized: true, menuItems: [
    { key: 'items', type: 'sub', name: 'member', activeRule: '/biz/member', routePath: '/items', title: 'Items' },
  ] }
  const runtime = { definitions: new Map([['member', {}]]), instances: new Map(), setLastActivePath() {} }
  let opens = 0, syncs = 0
  const workspace = { activeTabId: 'overview', activeTab: {},
    openMicroAppView: async () => { opens++ }, openShellView() {} }
  const api = load('src/runtime/navigation/sub-app-redirect.ts', {
    '../../shared/deep-link-flags': flags,
    '../../shared/env': { getContextPath: () => '/admin', getPathWithContextPath: p => '/admin' + p },
    '../../shared/url': load('src/shared/url.ts', {}),
    '../../shared/qiankun-id': { microAppInstanceId: (app, view) => app + ':' + view, microAppViewIdFromMenuKey: key => key },
    '../../platform/stores/token.store': { useAccessTokenStore: () => ({ isLogin: true }) },
    '../../platform/stores/menu.store': { useMenuStore: () => menu },
    '../../platform/stores/runtime.store': { useRuntimeStore: () => runtime },
    '../../platform/stores/workspace.store': { useWorkspaceStore: () => workspace, OVERVIEW_TAB_ID: 'overview' },
    '../../platform/menus/shell-menus': { findShellView: () => undefined },
    '../../platform/apps/sync-browser-url': { syncBrowserAddressForTab: () => { syncs++ } },
  }, { window: { location: { pathname: '/admin/redirect/biz/member/items', search: '', hash: '' } },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } })
  return { api, flags, storage, workspace, menu, opens: () => opens, syncs: () => syncs }
}

test('shell login target preserves query and hash; root does not overwrite it', () => {
  const f = navigation()
  f.api.saveReturnUrl('/admin/passport?q=1#binding')
  f.api.saveReturnUrl('/admin/')
  assert.equal(f.api.peekReturnUrl(), '/admin/passport?q=1#binding')
})

test('menu matching chooses the longest activeRule and preserves query/hash', () => {
  const f = navigation()
  f.menu.menuItems.unshift({ key: 'short', type: 'sub', name: 'other', activeRule: '/biz', routePath: '/items' })
  f.menu.menuItems[1].routePath = '/'
  const match = f.api.findSubMenuItemByTargetPath(f.menu.menuItems, '/biz/member/items?q=1#row')
  assert.equal(match.menuItem.name, 'member')
  assert.equal(match.internalPath, '/items?q=1#row')
})

test('gateway deduplicates opens and releases suppression after navigation', async () => {
  const f = navigation()
  let finish
  const router = { currentRoute: { value: { name: 'SubAppRedirectGateway' } },
    replace: () => new Promise(resolve => { finish = resolve }) }
  f.api.applyNavigationTarget(router, '/admin/redirect/biz/member/items')
  f.api.applyNavigationTarget(router, '/admin/redirect/biz/member/items')
  assert.equal(f.opens(), 1)
  assert.equal(f.flags.isDeepLinkLeavingGateway(), true)
  finish()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(f.flags.isDeepLinkLeavingGateway(), false)
  assert.equal(f.syncs(), 1)
})

test('gateway clears suppression on navigation rejection or unknown target', async () => {
  const f = navigation()
  const router = { currentRoute: { value: { name: 'SubAppRedirectGateway' } }, replace: () => Promise.reject(Error('failed')) }
  f.api.applyNavigationTarget(router, '/admin/redirect/biz/member/items')
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(f.flags.isDeepLinkLeavingGateway(), false)
  assert.equal(f.api.applyNavigationTarget(router, '/admin/redirect/missing'), false)
  assert.equal(f.flags.isDeepLinkLeavingGateway(), false)
})

test('menu response after logout cannot register applications', async () => {
  let finish, registered = 0, applied = 0
  const token = { isLogin: true }
  const menu = { initialized: false, menuItems: [], setMenuItems() { applied++ }, registerAppsFromMenus() { registered++ } }
  const boot = load('src/runtime/boot/menu.boot.ts', {
    vue: { watch() {} }, '../api/menu.api': { getMenuList: () => new Promise(resolve => { finish = resolve }) },
    '../../platform/menus/shell-menus': { shellMenusAsMenuItems: () => [] },
    '../../platform/stores/token.store': { useAccessTokenStore: () => token },
    '../../platform/stores/menu.store': { useMenuStore: () => menu },
    '../navigation/sub-app-redirect': {},
  })
  const pending = boot.initMenus()
  token.isLogin = false
  finish([{ key: 'old-session' }])
  await pending
  assert.equal(registered, 0)
  assert.equal(applied, 0)
})

test('newer menu load wins when responses arrive out of order', async () => {
  const finishes = [], applied = []
  const menu = { initialized: false, menuItems: [], setMenuItems(items) { applied.push(items) }, registerAppsFromMenus() {} }
  const boot = load('src/runtime/boot/menu.boot.ts', {
    vue: { watch() {} }, '../api/menu.api': { getMenuList: () => new Promise(resolve => finishes.push(resolve)) },
    '../../platform/menus/shell-menus': { shellMenusAsMenuItems: () => [] },
    '../../platform/stores/token.store': { useAccessTokenStore: () => ({ isLogin: true }) },
    '../../platform/stores/menu.store': { useMenuStore: () => menu }, '../navigation/sub-app-redirect': {},
  })
  const older = boot.initMenus(), newer = boot.initMenus()
  finishes[1]([{ key: 'new' }]); await newer
  finishes[0]([{ key: 'old' }]); await older
  assert.equal(applied.length, 1)
  assert.equal(applied[0][0].key, 'new')
})

test('shell page stays cached when switching through a micro-app tab', async () => {
  const vue = require('vue')
  const { parse, compileScript } = require('@vue/compiler-sfc')
  let mounts = 0
  const Page = vue.defineComponent({ setup() { vue.onMounted(() => mounts++); return () => vue.h('div', 'page') } })
  const shell = { tabId: 'passport', kind: 'shell', shellPage: 'passport' }
  const micro = { tabId: 'micro', kind: 'micro-app', instanceId: 'micro', applicationCode: 'member' }
  const workspace = vue.reactive({ tabs: [shell, micro], activeTabId: shell.tabId,
    get activeTab() { return this.tabs.find(tab => tab.tabId === this.activeTabId) } })
  const descriptor = parse(fs.readFileSync(path.join(__dirname, '../src/shell/layout/Workspace.vue'), 'utf8')).descriptor
  const compiled = compileScript(descriptor, { id: 'workspace-regression', inlineTemplate: true }).content
  const Component = load('src/shell/layout/Workspace.vue', {
    vue, pinia: { storeToRefs: vue.toRefs }, 'element-plus': { ElMessage: { error() {} } },
    '../../platform/stores/workspace.store': { useWorkspaceStore: () => workspace },
    '../../platform/stores/runtime.store': { useRuntimeStore: () => ({ instances: new Map([['micro', { status: 'mounted' }]]) }) },
    '../../shared/qiankun-id': { microAppContainerId: id => id, microAppContainerSelector: id => '#' + id },
    '../pages/OverviewPage.vue': { __esModule: true, default: Page },
    '../pages/PassportPage.vue': { __esModule: true, default: Page },
    '../pages/TenantProvisionPage.vue': { __esModule: true, default: Page },
  }, {}, compiled).default
  const node = () => ({ children: [], parent: null, style: {} })
  const renderer = vue.createRenderer({
    createElement: node, createText: node, createComment: node,
    setText() {}, setElementText() {}, patchProp() {},
    parentNode: el => el.parent,
    nextSibling: el => el.parent?.children[el.parent.children.indexOf(el) + 1] ?? null,
    insert(el, parent, anchor) {
      if (el.parent) el.parent.children.splice(el.parent.children.indexOf(el), 1)
      el.parent = parent
      const index = anchor ? parent.children.indexOf(anchor) : -1
      parent.children.splice(index < 0 ? parent.children.length : index, 0, el)
    },
    remove(el) {
      if (el.parent) el.parent.children.splice(el.parent.children.indexOf(el), 1)
      el.parent = null
    },
  })
  const app = renderer.createApp(Component)
  app.mount(node())
  await vue.nextTick()
  assert.equal(mounts, 1)
  workspace.activeTabId = micro.tabId
  await vue.nextTick()
  workspace.activeTabId = shell.tabId
  await vue.nextTick()
  assert.equal(mounts, 1)
  app.unmount()
})
