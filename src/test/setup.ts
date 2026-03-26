import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock TextDecoder/TextEncoder for JSDOM
if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder
}
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
