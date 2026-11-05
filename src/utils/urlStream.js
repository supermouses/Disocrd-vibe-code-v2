const dns = require('node:dns/promises');
const net = require('node:net');
const { Readable } = require('node:stream');

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 15_000;

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
}

// Chặn link trỏ vào mạng nội bộ của máy chạy bot
async function assertSafeUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Link không hợp lệ.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Chỉ hỗ trợ link http/https.');

  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new Error('Không phân giải được tên miền của link.');
  if (addrs.some((a) => isPrivateIp(a.address))) throw new Error('Link này không được phép.');
  return url;
}

function isAudioType(type) {
  return /^audio\//i.test(type) || /^(application\/ogg|application\/octet-stream|video\/ogg)/i.test(type);
}

// Mở stream âm thanh từ link trực tiếp tới file nhạc hoặc radio stream
async function openUrlStream(input) {
  let current = input;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertSafeUrl(current);
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'discord-music-bot' },
    });

    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location'), url).href;
      continue;
    }
    if (!res.ok || !res.body) throw new Error(`Không mở được link (HTTP ${res.status}).`);

    const type = res.headers.get('content-type') ?? '';
    if (!isAudioType(type)) {
      res.body.cancel().catch(() => {});
      throw new Error(
        'Link này không phải file/stream âm thanh trực tiếp (ví dụ link .mp3, .ogg hoặc radio). ' +
          'Link YouTube, Spotify, SoundCloud... không được hỗ trợ.'
      );
    }
    return Readable.fromWeb(res.body);
  }
  throw new Error('Link bị chuyển hướng quá nhiều lần.');
}

module.exports = { openUrlStream, assertSafeUrl };
