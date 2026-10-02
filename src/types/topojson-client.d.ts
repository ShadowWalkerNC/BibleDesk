declare module 'topojson-client' {
  export function feature(
    topology: { objects: Record<string, unknown> } & Record<string, unknown>,
    object: unknown
  ): { type: string; features?: Array<Record<string, unknown> & { id?: string | number }> } & Record<string, unknown>;
  export function mesh(
    topology: unknown,
    object: unknown,
    filter?: (a: unknown, b: unknown) => boolean
  ): Record<string, unknown>;
  export function merge(
    topology: unknown,
    objects: unknown[]
  ): Record<string, unknown>;
}
