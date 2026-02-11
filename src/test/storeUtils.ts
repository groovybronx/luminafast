import { act } from '@testing-library/react';

// Helper for testing Zustand stores with proper state isolation
export const createTestStore = <T>(storeFactory: () => T, initialState: Partial<T>) => {
  const store = storeFactory();
  
  // Reset store to initial state before each test
  const resetStore = () => {
    if ('setState' in store && typeof store.setState === 'function') {
      (store as any).setState(initialState);
    }
  };
  
  return { store, resetStore };
};

// Helper for async store actions
export const waitForStoreUpdate = () => act(async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
});
