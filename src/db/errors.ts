export function pgErrorCode(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } } | undefined
  return e?.code ?? e?.cause?.code
}
