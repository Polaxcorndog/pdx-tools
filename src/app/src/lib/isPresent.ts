// https://github.com/microsoft/TypeScript/issues/16069#issuecomment-565658443
export function isPresent<T>(t: T | undefined | null | void): t is T {
  return t !== undefined && t !== null;
}

export function check<T>(t: T | undefined | null, msg?: string): T {
  if (t === undefined || t === null) {
    throw new Error(msg ?? "unexpected null or undefined");
  } else {
    return t;
  }
}
