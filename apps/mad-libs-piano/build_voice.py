"""Record every word of Mad Libs Piano with the Kokoro neural voice and pack it for the page.

Usage: node vocab.js > vocab.json
       python3 build_voice.py vocab.json kokoro-v1.0.int8.onnx voices-v1.0.bin voice_bank.json [cache_dir]

Model files: https://github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0)
Needs: pip install kokoro-onnx soundfile praat-parselmouth

Each word is stored as 16 kHz IMA ADPCM plus a pitch mark on every glottal pulse, so the
page can re-pitch it to any key with TD-PSOLA (the same format Song Piano uses).
"""
import base64, json, os, sys
import numpy as np
import parselmouth
from parselmouth.praat import call

VOICE = "af_heart"   # Kokoro's most natural American English voice
SPEED = 0.88
SR = 16000
HOP = 80

STEPS = [7,8,9,10,11,12,13,14,16,17,19,21,23,25,28,31,34,37,41,45,50,55,60,66,73,80,88,97,107,118,130,143,157,173,190,209,230,253,279,307,337,371,408,449,494,544,598,658,724,796,876,963,1060,1166,1282,1411,1552,1707,1878,2066,2272,2499,2749,3024,3327,3660,4026,4428,4871,5358,5894,6484,7132,7845,8630,9493,10442,11487,12635,13899,15289,16818,18500,20350,22385,24623,27086,29794,32767]
IDX = [-1, -1, -1, -1, 2, 4, 6, 8]


def adpcm(x):
    """Encode float samples to IMA ADPCM, mirroring the page's decoder exactly."""
    s = np.clip(np.round(x * 32767), -32768, 32767).astype(int)
    pred, idx = 0, 0
    codes = []
    for v in s:
        step = STEPS[idx]
        diff = int(v) - pred
        code = 0
        if diff < 0:
            code = 8
            diff = -diff
        vp = step >> 3
        if diff >= step:
            code |= 4; diff -= step; vp += step
        if diff >= step >> 1:
            code |= 2; diff -= step >> 1; vp += step >> 1
        if diff >= step >> 2:
            code |= 1; vp += step >> 2
        pred += -vp if code & 8 else vp
        pred = max(-32768, min(32767, pred))
        idx = max(0, min(88, idx + IDX[code & 7]))
        codes.append(code)
    if len(codes) % 2:
        codes.append(0)
    b = bytes(codes[i] | (codes[i + 1] << 4) for i in range(0, len(codes), 2))
    return base64.b64encode(b).decode()


def marks_for(x):
    """Glottal pulses (Praat) for voiced stretches, a fixed hop with P=0 elsewhere."""
    snd = parselmouth.Sound(x.astype(np.float64), SR)
    pp = call(snd, "To PointProcess (periodic, cc)", 75, 500)
    n = call(pp, "Get number of points")
    pulses = [round(call(pp, "Get time from index", i + 1) * SR) for i in range(n)]
    groups, cur = [], []
    for p in pulses:
        if cur and p - cur[-1] > 0.016 * SR:
            groups.append(cur); cur = []
        cur.append(p)
    if cur:
        groups.append(cur)
    groups = [g for g in groups if len(g) >= 3]
    marks = []
    t = 0
    for g in groups:
        while t < g[0] - HOP // 2:
            marks.append((t, 0)); t += HOP
        for i, p in enumerate(g):
            a = g[i] - g[i - 1] if i > 0 else g[1] - g[0]
            b = g[i + 1] - g[i] if i + 1 < len(g) else a
            marks.append((p, int(max(24, min(255, round((a + b) / 2))))))
        t = g[-1] + HOP
    while t < len(x):
        marks.append((t, 0)); t += HOP
    out = bytearray()
    last = 0
    for t, P in marks:
        d = t - last
        if d < 0:
            continue
        while d > 65535:
            out += bytes([255, 255, 0]); d -= 65535
        out += bytes([d & 255, d >> 8, P])
        last = t
    return base64.b64encode(bytes(out)).decode()


def clean(a, sr):
    snd = parselmouth.Sound(a.astype(np.float64), sr).resample(SR)
    x = snd.values[0].astype(np.float32)
    env = np.abs(x)
    thr = env.max() * 0.02
    on = np.nonzero(env > thr)[0]
    if len(on):
        x = x[max(0, on[0] - 160): min(len(x), on[-1] + 320)]
    # loudness: match RMS of the loud part, cap the peak
    loud = x[np.abs(x) > np.abs(x).max() * 0.1]
    rms = np.sqrt(np.mean(loud ** 2)) if len(loud) else 1e-3
    x = x * min(0.16 / rms, 0.92 / np.abs(x).max())
    f = min(80, len(x) // 4)
    x[:f] *= np.linspace(0, 1, f)
    x[-f:] *= np.linspace(1, 0, f)
    return x


def main():
    vocab_path, model, voices, out_path = sys.argv[1:5]
    cache = sys.argv[5] if len(sys.argv) > 5 else None
    from kokoro_onnx import Kokoro
    import soundfile as sf
    k = Kokoro(model, voices)
    vocab = json.load(open(vocab_path))
    words = {}
    for i, (key, text) in enumerate(sorted(vocab.items())):
        wav = os.path.join(cache, key.replace("'", "_").replace(" ", "+") + ".wav") if cache else None
        if wav and os.path.exists(wav):
            a, sr = sf.read(wav, dtype="float32")
        else:
            a, sr = k.create(text, voice=VOICE, speed=SPEED, lang="en-us")
            if wav:
                sf.write(wav, a, sr)
        x = clean(np.asarray(a), sr)
        words[key] = [len(x), adpcm(x), marks_for(x)]
        if i % 25 == 0:
            print(i, key, len(x) / SR, flush=True)
    json.dump({"sr": SR, "voice": "Kokoro " + VOICE, "words": words}, open(out_path, "w"), separators=(",", ":"))
    print("wrote", out_path, os.path.getsize(out_path))


if __name__ == "__main__":
    main()
