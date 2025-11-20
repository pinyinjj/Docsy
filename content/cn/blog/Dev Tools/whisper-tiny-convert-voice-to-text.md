---
draft: True
---

下载 ffmpeg 依赖：

```bash
sudo apt-get install ffmpeg
```

Whisper 提供了多种模型类型，可根据准确度和速度需求选择：

- `tiny`：约 3900 万参数，速度最快，准确度较低
- `base`：约 7400 万参数，速度较快，准确度中等
- `small`：约 2.44 亿参数，速度中等，准确度较好
- `medium`：约 7.69 亿参数，速度较慢，准确度较高
- `large`：约 15.5 亿参数，速度最慢，准确度最高
- `large-v2`：large 模型的改进版本
- `large-v3`：large 模型的最新版本

```python
import whisper

model = whisper.load_model("tiny")
result = model.transcribe("audio.flac")
print(result["text"])
```

增加对whisper进行缓冲，假装是推流传输的作用功能。

---

参考文档

- [Whisper GitHub](https://github.com/openai/whisper)
