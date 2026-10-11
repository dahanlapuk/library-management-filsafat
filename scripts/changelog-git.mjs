import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()

const tags = git('tag', '-l', 'v*', '--sort=creatordate').split('\n').filter(Boolean)

const rilis = {}
tags.forEach((tag, i) => {
  const prev = i > 0 ? tags[i - 1] : null
  const range = prev ? `${prev}..${tag}` : tag
  const commits = git('log', '--no-merges', '--reverse', '--pretty=%h%x09%s', range)
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, ...rest] = line.split('\t')
      return { hash, pesan: rest.join('\t') }
    })
  const tanggal = git('for-each-ref', '--format=%(creatordate:short)', `refs/tags/${tag}`)
  rilis[tag.slice(1)] = { tanggal, dari: prev ? prev.slice(1) : null, commits }
})

const out = `export type GitRilis = {
  tanggal: string
  dari: string | null
  commits: { hash: string; pesan: string }[]
}

export const GIT_RILIS: Record<string, GitRilis> = ${JSON.stringify(rilis, null, 2)}
`
writeFileSync('src/data/changelog-git.ts', out)
const total = Object.values(rilis).reduce((n, r) => n + r.commits.length, 0)
console.log(`${tags.length} rilis, ${total} commit`)
