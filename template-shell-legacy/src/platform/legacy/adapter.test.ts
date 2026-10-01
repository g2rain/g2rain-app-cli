import assert from 'node:assert/strict'
import { describe, it, beforeEach, afterEach } from 'node:test'
import {
  getLegacyIntegration,
  isLegacyApplication,
  LEGACY_APPLICATION_REGISTRY,
} from './registry.ts'
import {
  hasAmbiguousLegacyInstances,
  resolveLegacyInstance,
} from './resolve-instance.ts'

describe('legacy registry', () => {
  const sampleCode = '__test-legacy-app__'

  afterEach(() => {
    delete LEGACY_APPLICATION_REGISTRY[sampleCode]
  })

  it('treats unlisted codes as AppKit (not legacy)', () => {
    assert.equal(isLegacyApplication('g2rain-member-app'), false)
    assert.equal(getLegacyIntegration('g2rain-member-app'), undefined)
  })

  it('treats registered codes as legacy', () => {
    LEGACY_APPLICATION_REGISTRY[sampleCode] = { protocolVersion: 'legacy' }
    assert.equal(isLegacyApplication(sampleCode), true)
    assert.deepEqual(getLegacyIntegration(sampleCode), { protocolVersion: 'legacy' })
  })

  it('ignores blank applicationCode', () => {
    assert.equal(isLegacyApplication(''), false)
    assert.equal(isLegacyApplication('   '), false)
  })
})

describe('resolveLegacyInstance', () => {
  const code = 'legacy-app'

  beforeEach(() => {
    LEGACY_APPLICATION_REGISTRY[code] = { protocolVersion: 'legacy' }
  })

  afterEach(() => {
    delete LEGACY_APPLICATION_REGISTRY[code]
  })

  it('returns the sole live instance', () => {
    const only = {
      instanceId: 'i-1',
      applicationCode: code,
      status: 'mounted',
    }
    const resolved = resolveLegacyInstance({
      applicationCode: code,
      activeTab: null,
      instances: [only],
    })
    assert.equal(resolved?.instanceId, 'i-1')
  })

  it('prefers the active Tab instance when multiple exist', () => {
    const a = { instanceId: 'i-a', applicationCode: code, status: 'mounted' }
    const b = { instanceId: 'i-b', applicationCode: code, status: 'inactive' }
    const resolved = resolveLegacyInstance({
      applicationCode: code,
      activeTab: {
        kind: 'micro-app',
        applicationCode: code,
        instanceId: 'i-b',
      },
      instances: [a, b],
    })
    assert.equal(resolved?.instanceId, 'i-b')
  })

  it('does not guess when multiple instances and no active Tab', () => {
    const a = { instanceId: 'i-a', applicationCode: code, status: 'mounted' }
    const b = { instanceId: 'i-b', applicationCode: code, status: 'inactive' }
    const input = {
      applicationCode: code,
      activeTab: null,
      instances: [a, b],
    }
    assert.equal(resolveLegacyInstance(input), null)
    assert.equal(hasAmbiguousLegacyInstances(input), true)
  })
})
