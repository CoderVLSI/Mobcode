import { Buffer } from 'buffer';

const g = globalThis as any;

if (typeof g.Buffer === 'undefined') {
  g.Buffer = Buffer;
}

if (typeof g.process === 'undefined') {
  g.process = { env: {} };
}
