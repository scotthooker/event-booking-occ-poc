import { ConflictException } from '@nestjs/common';

export function Retry(maxAttempts: number = 3, delay: number = 100) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let attempts = 0;
      while (attempts < maxAttempts) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          if (
            error instanceof ConflictException &&
            attempts < maxAttempts - 1
          ) {
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            throw error;
          }
        }
      }
    };

    return descriptor;
  };
}
