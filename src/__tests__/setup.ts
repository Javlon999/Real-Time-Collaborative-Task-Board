// Test setup — runs before every test file
import '@testing-library/jest-dom'
import { enableMapSet } from 'immer'

// Required for Immer to handle Set/Map (e.g. loadingIds: Set<string> in uiSlice)
enableMapSet()
