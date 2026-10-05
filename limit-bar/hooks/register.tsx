import type { Register } from 'claude-code'

type Win = { kind: string; percentUsed: number }

const bar = (left: number) => {
  const n = Math.max(0, Math.min(10, Math.round(left / 10)))
  return '█'.repeat(n) + '░'.repeat(10 - n)
}
const tone = (left: number) => (left > 50 ? 'success' : left > 20 ? 'warning' : 'error')

export const register: Register = on => {
  let wins: Win[] = []

  on('session.measure', ($, e, next) => {
    wins = e.rateLimits
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (wins.length === 0) {
      const u = await $.session.usage()
      wins = u.rateLimits
    }
    const { Box, Text } = $.ui.resolve(e)
    const rows = [['five_hour', '5h'], ['seven_day', '7d']] as const
    const parts = rows.flatMap(([k, label]) => {
      const w = wins.find(x => x.kind === k)
      if (!w) return []
      const left = Math.round(100 - w.percentUsed)
      return [
        <Text key={k} color={tone(left)}>
          {label} {bar(left)} {left}%{'  '}
        </Text>,
      ]
    })
    if (parts.length === 0) return next(e)
    return <Box>{parts}</Box>
  })
}
