const PROTOCOLO = 'zion'

export type ZionLink =
  | { type: 'channel-message'; serverId: string; channelId: string; messageId: string }
  | { type: 'dm-message'; conversationId: string; messageId: string }
  | { type: 'invite'; code: string }

export function buildChannelMessageLink(
  serverId: string,
  channelId: string,
  messageId: string
): string {
  return `${PROTOCOLO}://servidor/${serverId}/canal/${channelId}/mensaje/${messageId}`
}

export function buildDMMessageLink(conversationId: string, messageId: string): string {
  return `${PROTOCOLO}://dm/${conversationId}/mensaje/${messageId}`
}

export function buildInviteLink(codigoInvitacion: string): string {
  return `${PROTOCOLO}://invitar/${encodeURIComponent(codigoInvitacion)}`
}

export function parseZionLink(url: string): ZionLink | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  if (parsed.protocol !== `${PROTOCOLO}:`) return null

  const segments = [parsed.hostname, ...parsed.pathname.split('/')]
    .filter(Boolean)
    .map((s) => decodeURIComponent(s))

  if (segments[0] === 'servidor' && segments[2] === 'canal' && segments[4] === 'mensaje') {
    return {
      type: 'channel-message',
      serverId: segments[1],
      channelId: segments[3],
      messageId: segments[5],
    }
  }

  if (segments[0] === 'dm' && segments[2] === 'mensaje') {
    return {
      type: 'dm-message',
      conversationId: segments[1],
      messageId: segments[3],
    }
  }

  if (segments[0] === 'invitar' && segments[1]) {
    return { type: 'invite', code: segments[1] }
  }

  return null
}
