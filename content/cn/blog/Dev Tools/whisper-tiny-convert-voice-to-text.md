---
draft: True
---

## 场景与目标

在前一篇《QGroundControl 语音模型接口实现文档 - 前端》中，我们已经完成了 **QGC 端录音、打包 WAV、通过 `multipart/form-data` 推送到后端 `/api/v1/voice/command` 接口** 的全部逻辑。

这篇文档专门整理 **后端 Whisper Tiny 接口实现**，并把前后端串起来，让你可以从：

> 按住 QGC 底部工具栏的「发送语音」按钮 → 说话 → 松开按钮 → 后端 Whisper Tiny 识别 → 解析成无人机指令 → 执行 → 把结果返回给 QGC 展示

整个链路跑通。

---

## 环境准备

### 系统与依赖

后端运行环境假设为：

- **OS**：Ubuntu / Debian / WSL / 其它 Linux
- **Python**：推荐 `3.10+`
- **音频依赖**：`ffmpeg`（Whisper 必需）

安装 `ffmpeg`：

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg
```

### Python 虚拟环境（推荐）

```bash
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
```

### 安装 Whisper 及后端依赖

这里以 **FastAPI + Uvicorn + Whisper Tiny** 为例，实现一个简单但够用的后端接口。

```bash
pip install "fastapi[all]" uvicorn
pip install openai-whisper
```

> 如果只在 CPU 上跑 Tiny 模型，一般不需要单独装 GPU 版 PyTorch，Whisper 会自动拉起 CPU 推理，速度也还可以。

---

## Whisper 模型选型（项目中实际使用：`tiny`）

Whisper 提供了多种模型类型，可根据准确度和速度需求选择：

- `tiny`：约 3900 万参数，**速度最快**，准确度较低
- `base`：约 7400 万参数，速度较快，准确度中等
- `small`：约 2.44 亿参数，速度中等，准确度较好
- `medium`：约 7.69 亿参数，速度较慢，准确度较高
- `large`：约 15.5 亿参数，速度最慢，准确度最高
- `large-v2`：large 模型的改进版本
- `large-v3`：large 模型的最新版本

在本项目中，考虑到：

- QGC 语音交互希望 **延迟尽量低**；
- 单轮语音指令时长一般不长（几秒～十几秒）；
- 命令句式比较「模板化」，对识别精度要求不是极致；

所以选择了 **`tiny` 模型**，在普通 CPU 上也可以接受。

---

## Whisper 最小可运行示例（离线转写）

先写一个最小 demo，确认 Whisper 与音频环境都 OK：

```python
import whisper


def main():
    # 加载 tiny 模型（首次会自动下载权重）
    model = whisper.load_model("tiny")

    # 假设当前目录下已经有一个 audio.wav（或其它格式，Whisper 会自动通过 ffmpeg 转码）
    result = model.transcribe("audio.wav", language="zh")
    print(result["text"])


if __name__ == "__main__":
    main()
```

如果能正确打印出中文转写结果，就说明：

- `ffmpeg` 可用；
- Whisper 模型下载与推理都正常。

---

## 接口设计：与 QGC 前端对齐

### URL 与方法

与 QGC 前端文档保持一致：

- **URL**：`POST /api/v1/voice/command`
- **请求头**：
  - `Content-Type: multipart/form-data; boundary=...`
  - `Accept: application/json`
- **表单字段**：
  - `audio`：WAV 文件（二进制）

### 请求体（来自 QGC）

QGC 端通过 `BottomFlyViewToolBar.qml` 中的 `sendVoiceCommandFromMemory(audioData)` 手动构造 `multipart/form-data` 请求体，字段名为 `audio`，文件名类似：

- `recording_1719999999999.wav`

格式要求：

- **音频格式**：WAV（RIFF header）
- **编码**：PCM
- **采样率**：`44100 Hz`
- **位深度**：`16 bit`
- **声道数**：`1 (单声道)`

### 响应体（返回给 QGC）

统一返回 JSON：

```json
{
  "result": "命令执行成功的详细信息（可包含 ANSI 颜色）"
}
```

其中 `result` 字符串会被 QGC 端的 `ansiToHtml()` 解析并高亮展示。

---

## 后端实现：FastAPI + Whisper Tiny

下面是一个与 QGC 端完全对齐的后端示例，实现：

1. 接收 `multipart/form-data` 上传的 WAV 文件；
2. 按块（buffer）读取上传内容到本地临时文件（伪「推流」写盘，避免一次性读入大文件）；
3. 使用 Whisper Tiny 对音频做 ASR；
4. 把识别出的文本解析成无人机命令；
5. 返回执行结果。

### 目录结构示例

```text
voice-backend/
  ├─ main.py           # FastAPI + Whisper 实现
  └─ requirements.txt  # 依赖（可选）
```

### `main.py`：核心后端代码

```python
from pathlib import Path
from typing import Optional

import uvicorn
import whisper
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse


app = FastAPI(title="QGC Voice Command Backend")

# 启动时预加载 tiny 模型，避免每次请求都重新加载
MODEL_NAME = "tiny"
model = whisper.load_model(MODEL_NAME)

# 上传文件临时保存目录
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


async def save_upload_file_to_disk(
    upload_file: UploadFile,
    dst: Path,
    chunk_size: int = 1024 * 1024,
) -> None:
    """
    以缓冲区方式保存上传的音频文件到本地磁盘。

    这一步相当于“假装推流传输”：我们不是一次性把整个文件读进内存，
    而是按块读取 → 写入文件，边收边写，内存占用更稳定。
    """
    with dst.open("wb") as f:
        while True:
            chunk = await upload_file.read(chunk_size)
            if not chunk:
                break
            f.write(chunk)


def parse_text_to_command(asr_text: str) -> str:
    """
    把自然语言文本解析成无人机动作。
    这里只给出一个非常简单的示例逻辑，你可以替换成：
    - 正则匹配
    - 自定义关键词表
    - LLM 解析
    等更复杂的逻辑。
    """
    text = asr_text.strip().lower()

    # 简单示例：只做几条常见命令
    if any(k in text for k in ["起飞", "take off", "takeoff"]):
        return "\033[32m成功\033[0m: 已下发起飞命令"
    if any(k in text for k in ["降落", "land"]):
        return "\033[32m成功\033[0m: 已下发降落命令"
    if "返航" in text or "return home" in text:
        return "\033[33m警告\033[0m: 已下发返航命令，请确认空域安全"

    return f"\033[33m提示\033[0m: 未识别为预定义指令，原始文本为：{asr_text}"


def speech_to_text(
    file_path: Path,
    language: Optional[str] = "zh",
) -> str:
    """
    使用 Whisper 模型对指定音频文件进行转写。
    """
    # 注意：Whisper 会自动调用 ffmpeg 处理各种格式
    result = model.transcribe(str(file_path), language=language)
    return result.get("text", "").strip()


@app.post("/api/v1/voice/command")
async def voice_command(audio: UploadFile = File(...)):
    # 基础校验：文件类型
    if not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="仅支持音频文件上传")

    # 为每个请求生成一个唯一的临时文件名
    suffix = Path(audio.filename or "audio.wav").suffix or ".wav"
    temp_path = UPLOAD_DIR / f"voice_{audio.filename}_{id(audio)}{suffix}"

    try:
        # 1. 按块保存上传音频到本地（缓冲写盘）
        await save_upload_file_to_disk(audio, temp_path)

        # 2. 使用 Whisper Tiny 做语音识别
        text = speech_to_text(temp_path, language="zh")
        if not text:
            raise HTTPException(status_code=500, detail="Whisper 未识别到有效文本")

        # 3. 将识别文本解析为无人机命令（示意）
        result_text = parse_text_to_command(text)

        # 4. 以 QGC 约定格式返回
        return JSONResponse({"result": result_text})

    finally:
        # 无论成功与否，都尝试删除临时文件
        try:
            if temp_path.exists():
                temp_path.unlink()
        except Exception:
            # 清理失败不影响主流程
            pass


if __name__ == "__main__":
    uvicorn.run(
        "main:voice_command",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
```

> 注意：实际部署时，你可能会把 ASR、NLU、下发 MAVSDK/MAVLink 命令拆成多个模块，这里为了文档清晰，只保留了最小可工作的示例逻辑。

---

## 与 QGC 端的对接关系

结合前一篇 QGC 文档，这里总结一下 **前后端参数如何对齐**：

- **音频录制**
  - QGC 端 `AudioRecorderController` 以：
    - 采样率：`44100 Hz`
    - 位深度：`16 bit`
    - 声道：`1`
  - 录为 **PCM 数据**，并拼一个 **44 字节 WAV 头**，形成完整 `QByteArray`。

- **HTTP 请求**
  - QGC 端手工组装 `multipart/form-data`：
    - 字段名：`audio`
    - Content-Type：`audio/wav`
  - 后端接口用 `UploadFile` 的 `audio` 字段接收。

- **响应解析**
  - 后端返回：
    - `{"result": "<含 ANSI 颜色的文本>"}`；
  - QGC 端：
    - 用 `parseResponseText()` 把 JSON 字符串解析出 `result`；
    - 用 `ansiToHtml()` 转成彩色 HTML；
    - 使用弹窗组件展示，并支持「复制」。

只要保证：

- 字段名 **一致**（`audio`）；
- URL **一致**（`/api/v1/voice/command`）；
- 响应格式 **一致**（`{"result": "..."}`）；

前后端就可以无缝联调。

---

## 使用 curl 本地自测接口

在让 QGC 接后端之前，可以先用 `curl` 对后端接口做一次最小验证。

1. 启动后端：

```bash
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

2. 用本地一段 WAV 音频测试：

```bash
curl -X POST \
  -F "audio=@test.wav;type=audio/wav" \
  -H "Accept: application/json" \
  http://127.0.0.1:8000/api/v1/voice/command
```

如果能返回类似：

```json
{
  "result": "\u001b[32m成功\u001b[0m: 已下发起飞命令"
}
```

说明后端语音识别与解析流程正常，可以切回 QGC 联调。

---

## 小结

- 本文整理了 **项目中 Whisper Tiny 的使用方式**，并给出了与 QGC 端接口完全对齐的后端实现示例。
- 通过对上传文件做 **缓冲式写盘**，可以在不用修改 Whisper 本身 API 的前提下，模拟「推流」的数据接收流程，避免一次性读入大文件导致的内存压力。
- 你可以在此基础上：
  - 替换 `parse_text_to_command()` 为更复杂的指令解析逻辑；
  - 引入 LLM 做自然语言到 MAVLink/MAVSDK 指令的映射；
  - 增加用户、机队、任务等上下文信息，让语音指令更加智能。

---

参考文档

- [Whisper GitHub](https://github.com/openai/whisper)
