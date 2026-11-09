# Mad Libs Piano

A 25-key piano that sings songs one word per note. The green key is on the song's next
note and sings the real next word; every other key sings a silly word with the same part
of speech (noun for noun, past-tense verb for past-tense verb, and so on).

- `data.js` – songs (public domain), each word tagged `word|TAG`, melodies, and the silly word lists.
- `template.html` – the page.
- `vocab.js` – checks the data and lists every word that needs recording.
- `build_voice.py` – records each word with the Kokoro neural TTS voice (`af_heart`) and stores it
  as 16 kHz IMA ADPCM with glottal pitch marks, so the page can retune it to any key (TD-PSOLA).
- `build.js` – inlines data and voice bank into `index.html`.

```
pip install kokoro-onnx soundfile praat-parselmouth
# model files: https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
node vocab.js > vocab.json
python3 build_voice.py vocab.json kokoro-v1.0.int8.onnx voices-v1.0.bin voice_bank.json cache/
node build.js voice_bank.json
```
