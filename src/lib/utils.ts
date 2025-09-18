import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const isDevelopment = process.env.NODE_ENV === 'development';
console.log(`Logger initialized in ${isDevelopment ? 'development' : 'production'} mode.`);

const noOp = () => {};

export const logger = {
  log: isDevelopment ? console.log.bind(console) : noOp,
  warn: isDevelopment ? console.warn.bind(console) : noOp,
  error: isDevelopment ? console.error.bind(console) : noOp,
  info: isDevelopment ? console.info.bind(console) : noOp,
};
