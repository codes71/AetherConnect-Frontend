import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

console.log(`Logger initialized in ${process.env.NODE_ENV} mode.`);

const isDevelopment = process.env.NODE_ENV === 'development';
if (!isDevelopment) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.info = () => {};
}



const noOp = () => {};

export const logger = {
  log: isDevelopment ? console.log.bind(console) : noOp,
  warn: isDevelopment ? console.warn.bind(console) : noOp,
  error: isDevelopment ? console.error.bind(console) : noOp,
  info: isDevelopment ? console.info.bind(console) : noOp,
};
