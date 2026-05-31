/** Jest manual mock for socket.io integration in unit tests */
export const socketService = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};
