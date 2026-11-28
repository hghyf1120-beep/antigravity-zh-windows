"""Antigravity 2.36.0 Windows x64. Offline resource translation."""
import argparse
import csv
import hashlib
import json
import os
from pathlib import Path
import struct
import subprocess
import sys
import tempfile

ORIGINAL = "d2bc25eab00f2ff6f14395e45f13347eef605af5a63f28db7edbfd2ab42a7571"
PREVIOUS = "d097c751888c5dd5df5bb52780d836c8b750447b27f96f90243ab79bb764fdeb"
LOCALIZED = "92e6b97a17909fa0384dad2e1db8e0aef31c72918fe5eb3f677634bd4ba7c098"
NATIVE_PATCH = Path(__file__).with_name("native-patch.json")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def entries(tree, prefix=""):
    for name, item in tree.items():
        key = prefix + name
        if "files" in item:
            yield from entries(item["files"], key + "/")
        elif "offset" in item:
            yield key, item


def translate(raw):
    if digest(raw) != ORIGINAL:
        raise ValueError("原包版本或内容不匹配。")
    _, header_size, _, json_size = struct.unpack_from("<4I", raw)
    tree = json.loads(raw[16:16 + json_size])
    changes = json.loads(NATIVE_PATCH.read_text(encoding="utf-8"))
    dictionary = Path(__file__).with_name("ui-zh.tsv").read_text(encoding="utf-8")
    pairs = [line.split("\t") for line in dictionary.splitlines()]
    if any(len(row) != 2 for row in pairs) or len(dict(pairs)) != len(pairs):
        raise ValueError("主界面词表格式有误。")
    js = Path(__file__).with_name("interface.js").read_text(encoding="utf-8")
    if js.count("/* LOCAL_DICTIONARY */") != 1:
        raise ValueError("界面脚本不匹配。")
    js = js.replace("/* LOCAL_DICTIONARY */", json.dumps(pairs, ensure_ascii=False))
    changes["dist/preload.js"] = []
    body = bytearray()
    for name, item in sorted(entries(tree["files"]), key=lambda pair: int(pair[1]["offset"])):
        start = 8 + header_size + int(item["offset"])
        data = raw[start:start + item["size"]]
        if name in changes:
            # Offsets refer to this exact original archive. Apply from right to left.
            limit = len(data)
            for offset, length, text in reversed(changes.pop(name)):
                if offset < 0 or length < 0 or offset + length > limit:
                    raise ValueError(f"补丁位置不匹配：{name}")
                data = data[:offset] + text.encode("utf-8") + data[offset + length:]
                limit = offset
            if name == "dist/preload.js":
                data += ("\n" + js).encode("utf-8")
            integrity = item["integrity"]
            if integrity["algorithm"] != "SHA256":
                raise ValueError("未知的 ASAR 校验算法。")
            block = integrity["blockSize"]
            integrity.update(hash=digest(data), blocks=[
                digest(data[i:i + block]) for i in range(0, len(data), block)
            ])
        item.update(offset=str(len(body)), size=len(data))
        body.extend(data)
    if changes:
        raise ValueError("缺少字典指定的资源：" + ", ".join(changes))
    meta = json.dumps(tree, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    pad = bytes(-len(meta) % 4)
    size = len(meta) + len(pad)
    return struct.pack("<4I", 4, size + 8, size + 4, len(meta)) + meta + pad + body


def require_closed():
    tasklist = Path(os.environ["SystemRoot"]) / "System32" / "tasklist.exe"
    result = subprocess.run([str(tasklist), "/FO", "CSV", "/NH", "/FI",
                             "IMAGENAME eq Antigravity.exe"], capture_output=True, check=True)
    rows = csv.reader(result.stdout.decode("ascii", errors="replace").splitlines())
    if any(row and row[0].lower() == "antigravity.exe" for row in rows):
        raise ValueError("请保存工作，完全退出 Antigravity（包括托盘），再试一次。")


def change(target, action, guard=require_closed):
    raw = target.read_bytes()
    current = digest(raw)
    backup = target.with_name("app.asar.original-2.36.0-zh-backup")
    if current not in (ORIGINAL, PREVIOUS, LOCALIZED):
        raise ValueError("当前程序包版本或内容不匹配，操作已停止。")
    if action == "check":
        if current != ORIGINAL and (not backup.is_file() or digest(backup.read_bytes()) != ORIGINAL):
            raise ValueError("原版备份缺失或校验失败。请使用官方安装程序恢复。")
        if current != LOCALIZED and digest(translate(raw if current == ORIGINAL else backup.read_bytes())) != LOCALIZED:
            raise ValueError("译文或工具不匹配。")
        if current == PREVIOUS:
            print("已安装 v2.3.1，可直接升级到 v2.3.2。")
            return
        print("2.36.0 汉化补丁 已安装。" if current == LOCALIZED else "校验通过，可安装2.36.0 汉化补丁。")
        return
    wanted = LOCALIZED if action == "install" else ORIGINAL
    if current == wanted:
        print("已经是目标版本。")
        return
    guard()
    if action == "install":
        new = translate(raw if current == ORIGINAL else backup.read_bytes())
    else:
        new = backup.read_bytes()
    if digest(new) != wanted:
        raise ValueError("目标文件校验失败。")
    # Create a verified, non-overwriting backup via a fully written temporary file.
    with tempfile.TemporaryDirectory(dir=target.parent, prefix="ag-zh-") as tmp:
        stage = Path(tmp) / "app.asar"
        if action == "install":
            if current == ORIGINAL and not backup.exists():
                stage.write_bytes(raw)
                if digest(stage.read_bytes()) != ORIGINAL:
                    raise ValueError("备份校验失败。")
                try:
                    os.link(stage, backup)
                except FileExistsError:
                    pass
                stage.unlink()
            if digest(backup.read_bytes()) != ORIGINAL:
                raise ValueError("已有备份与原版不符。")
        stage.write_bytes(new)
        if digest(stage.read_bytes()) != wanted:
            raise ValueError("写入校验失败。")
        guard()
        if digest(target.read_bytes()) != current:
            raise ValueError("应用资源刚刚发生变化，请重新检查版本。")
        os.replace(stage, target)
    print("安装完成。" if action == "install" else "原版已还原。")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("check", "install", "restore"))
    parser.add_argument("--app-dir", type=Path, help="包含 Antigravity.exe 的安装目录")
    args = parser.parse_args()
    if sys.platform != "win32":
        parser.error("当前发行包适用于 Windows。")
    app_dir = args.app_dir or Path(os.environ["LOCALAPPDATA"]) / "Programs/antigravity"
    target = app_dir / "resources" / "app.asar"
    if not target.is_file():
        raise ValueError("找不到程序资源。自定义安装可通过 --app-dir 指定安装目录。")
    change(target, args.action)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.SubprocessError) as exc:
        sys.exit(f"操作已停止：{exc}")
