declare global {
  namespace NodeJS {
    interface Global {
      Worker?: new() => unknown;
    }
  }
}

type MockWorkerConstructor = new(path: string) => MockWorker;

interface MockWorker {
  terminate(): void;
}

/**
 * Mock for `Worker`.
 */
const mockConstructor: MockWorkerConstructor = jest.fn<MockWorker, []>().mockImplementation((): MockWorker => ({
  terminate: jest.fn(),
}));

export default mockConstructor;


let originalDescriptor: PropertyDescriptor | undefined;

export function setup(): void {
  originalDescriptor = Object.getOwnPropertyDescriptor(global, 'Worker');
  Object.defineProperties(window, {
    Worker: {
      configurable: true,
      value: mockConstructor,
    },
  });
}

export function tearDown(): void {
  if (originalDescriptor !== undefined) {
    Object.defineProperties(window, {
      Worker: originalDescriptor!,
    });
  } else {
    delete global.Worker;
  }
}
