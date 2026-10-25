// Names end up engraved on a permanent brick, so keep the obvious ones out. Short words (ass, dick) are left
// off the list on purpose: they would also block real names like Cassidy and Dickson.
const BLOCKED = ['fuck', 'shit', 'cunt', 'bitch', 'whore', 'slut', 'bastard', 'nigg', 'fagg', 'retard', 'rape', 'nazi', 'hitler']

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i' }

export function isCleanName(name: string) {
  const plain = name
    .toLowerCase()
    .replace(/[013457@$!]/g, (char) => LEET[char])
    .replace(/[^a-z]/g, '')
  return !BLOCKED.some((word) => plain.includes(word))
}
