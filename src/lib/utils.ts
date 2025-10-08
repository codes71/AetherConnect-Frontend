import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

console.log(`Logger initialized in ${process.env.NODE_ENV} mode.`);

const isDevelopment =true;
if (!isDevelopment) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.info = () => {};
}



const noOp = () => {};

export const logger = {
  log: isDevelopment ? console.log : noOp,
  warn: isDevelopment ? console.warn : noOp,
  error: isDevelopment ? console.error : noOp,
  info: isDevelopment ? console.info : noOp,
};
