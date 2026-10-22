"""음성 조각 만들기 — 신경망 한국어 음성(ko-KR-SunHiNeural)으로 tools/units.json의 조각을 녹음해 audio/clips.js로 묶는다.

준비:  pip install edge-tts
순서:  node tools/voice_units.js > tools/units.json
       python tools/make_voice.py
이미 만든 조각은 tools/voice_cache에 남아 있어서 새로 생긴 조각만 다시 만든다.
"""
import asyncio, base64, hashlib, io, json, os, sys

import edge_tts

VOICE = 'ko-KR-SunHiNeural'
RATE = '-6%'          # 아이들이 알아듣기 쉽게 조금 천천히
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'tools', 'voice_cache')
OUT = os.path.join(ROOT, 'audio', 'clips.js')


def cache_path(text):
    h = hashlib.sha1(f'{VOICE}|{RATE}|{text}'.encode('utf-8')).hexdigest()[:16]
    return os.path.join(CACHE, h + '.mp3')


async def make(text, sem):
    path = cache_path(text)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return
    async with sem:
        for attempt in range(4):
            try:
                await edge_tts.Communicate(text, VOICE, rate=RATE).save(path + '.part')
                os.replace(path + '.part', path)
                return
            except Exception as e:  # 네트워크가 잠깐 끊기면 다시 시도
                if attempt == 3:
                    raise
                await asyncio.sleep(1.5 * (attempt + 1))


async def main():
    pairs = json.load(io.open(os.path.join(ROOT, 'tools', 'units.json'), encoding='utf-8'))  # [찾는 이름, 녹음할 글]
    units = [t for _, t in pairs]
    os.makedirs(CACHE, exist_ok=True)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    sem = asyncio.Semaphore(6)
    todo = [u for u in units if not os.path.exists(cache_path(u))]
    print(f'조각 {len(units)}개 중 새로 만들 것 {len(todo)}개', flush=True)
    done = 0
    for i in range(0, len(todo), 30):
        await asyncio.gather(*(make(u, sem) for u in todo[i:i + 30]))
        done += len(todo[i:i + 30])
        print(f'  {done}/{len(todo)}', flush=True)
    clips = {k: base64.b64encode(open(cache_path(t), 'rb').read()).decode('ascii') for k, t in pairs}
    with io.open(OUT, 'w', encoding='utf-8') as f:
        f.write('/* 자동 생성 파일 — tools/make_voice.py로 다시 만든다. 신경망 음성 ' + VOICE + ' */\n')
        f.write('window.SC = window.SC || {};\nSC.CLIPS = ')
        json.dump(clips, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print(f'저장: {OUT} ({os.path.getsize(OUT) // 1024} KB)')


if __name__ == '__main__':
    asyncio.run(main())
