/**
 * CloudBooks Pro - Frontend Test Setup
 *
 * Runs before every Vitest test suite. Imports testing-library matchers,
 * mocks browser APIs not available in jsdom, and provides common test
 * utilities.
 */

import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mock: window.matchMedia
// ---------------------------------------------------------------------------
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated but still used by some libraries
    removeListener: vi.fn(), // deprecated but still used by some libraries
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ---------------------------------------------------------------------------
// Mock: IntersectionObserver
// ---------------------------------------------------------------------------
const mockIntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: vi.fn().mockReturnValue([]),
}));

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: mockIntersectionObserver,
});

// ---------------------------------------------------------------------------
// Mock: ResizeObserver
// ---------------------------------------------------------------------------
const mockResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: mockResizeObserver,
});

// ---------------------------------------------------------------------------
// Mock: window.scrollTo (jsdom doesn't implement it)
// ---------------------------------------------------------------------------
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// ---------------------------------------------------------------------------
// Mock: localStorage
// ---------------------------------------------------------------------------
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: localStorageMock,
});

// ---------------------------------------------------------------------------
// Mock: URL.createObjectURL / revokeObjectURL (for file upload tests)
// ---------------------------------------------------------------------------
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/test-blob');
}
if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = vi.fn();
}

// ---------------------------------------------------------------------------
// Cleanup between tests
// ---------------------------------------------------------------------------
afterEach(() => {
  vi.restoreAllMocks();
  localStorageMock.clear();
});
