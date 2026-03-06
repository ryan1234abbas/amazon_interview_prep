// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill for fetch API
global.fetch = jest.fn();

// Polyfill for TransformStream required by AWS SDK
// @ts-ignore
global.TransformStream = class TransformStream {
  readable: any;
  writable: any;
  
  constructor() {
    this.readable = {};
    this.writable = {};
  }
};
