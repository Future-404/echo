import { describe, it, expect } from 'vitest'
import { VERSION, getDisplayVersion, getFullVersion } from '../../version'
import { STORE_KEY } from '../../store/persist'

describe('version', () => {
  it('VERSION matches package.json format', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('getDisplayVersion prefixes v', () => {
    expect(getDisplayVersion()).toBe(`v${VERSION}`)
  })

  it('getFullVersion appends branch', () => {
    expect(getFullVersion()).toBe(`${VERSION}-main`)
  })
})

describe('STORE_KEY', () => {
  it('derives major version from VERSION', () => {
    const major = VERSION.split('.')[0]
    expect(STORE_KEY).toBe(`echo-storage-v${major}`)
  })
})
