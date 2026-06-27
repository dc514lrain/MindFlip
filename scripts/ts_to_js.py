#!/usr/bin/env python3
"""简易 TS→JS 转译器：去除类型注解，保留可运行的 JS。"""
import os
import re
import sys
from pathlib import Path

ROOT = Path(r"P:\Web\MindFlip\miniprogram")

def strip_types(content: str) -> str:
    # 1. 移除单行类型导入: import type { ... } from '...';
    content = re.sub(r'^\s*import\s+type\s+.*?;?\s*$', '', content, flags=re.MULTILINE)
    # 2. 移除 import { type X } 中的 type 关键字
    content = re.sub(r'\btype\s+([A-Za-z_]\w*)', r'\1', content)
    # 3. 移除函数参数类型注解: (x: T, y: U) => (x, y)
    # 简单情况：参数后的 : Type
    def strip_param_types(match):
        params = match.group(1)
        # 移除参数类型注解: name: Type
        params = re.sub(r'([A-Za-z_$][\w$]*)\s*:\s*[^,=)]+', r'\1', params)
        return '(' + params + ')'
    content = re.sub(r'\(([^()]*?(?:\([^()]*\)[^()]*?)*)\)\s*:\s*[^{=;,\n]+(?=\s*[{=;,])', strip_param_types, content)
    # 4. 移除变量类型注解: const x: Type =
    content = re.sub(r'((?:const|let|var)\s+[A-Za-z_$][\w$]*)\s*:\s*[^=,\n]+(?=\s*=)', r'\1', content)
    # 5. 移除函数返回类型: ) : Type {
    content = re.sub(r'\)\s*:\s*[A-Za-z_$][\w$.<>|&,\[\]\s]*?\s*\{', ') {', content)
    content = re.sub(r'\)\s*:\s*[A-Za-z_$][\w$.<>|&,\[\]\s]*?\s*=>', ') =>', content)
    # 6. 移除泛型调用: foo<T>() -> foo()
    content = re.sub(r'<\s*[A-Za-z_$][\w$]*(?:\s+extends\s+[^>]+)?\s*>', '', content)
    # 7. 移除 as 类型断言
    content = re.sub(r'\s+as\s+[A-Za-z_$][\w$.<>|&,\[\]\s]*', '', content)
    # 8. 移除 ! 非空断言
    content = re.sub(r'([A-Za-z_$][\w$\]]*)!\s*([.\[])', r'\1\2', content)
    # 9. 移除 interface 声明（整块）
    content = re.sub(r'^\s*interface\s+\w+\s*(?:<[^>]+>)?\s*\{[^}]*\}\s*$', '', content, flags=re.MULTILINE | re.DOTALL)
    # 10. 移除 type 别名
    content = re.sub(r'^\s*type\s+\w+\s*(?:<[^>]+>)?\s*=\s*[^;]+;\s*$', '', content, flags=re.MULTILINE)
    # 11. 移除 enum 声明（简单情况）
    content = re.sub(r'^\s*export\s+enum\s+\w+\s*\{[^}]*\}\s*$', '', content, flags=re.MULTILINE | re.DOTALL)
    # 12. 移除 declare 全局声明
    content = re.sub(r'^\s*declare\s+.*?;?\s*$', '', content, flags=re.MULTILINE)
    # 13. 移除 public/private/protected/readonly 修饰符
    content = re.sub(r'\b(public|private|protected|readonly)\s+', '', content)
    # 14. 移除 @decorator
    content = re.sub(r'@[A-Za-z_$][\w$]*\s*', '', content)
    # 15. 移除 implements / extends 后面的类型（保留类继承，但移除泛型）
    # 仅当 extends 后是泛型时才处理
    # 跳过这步以避免破坏合法语法
    return content

def process_file(ts_path: Path):
    content = ts_path.read_text(encoding='utf-8')
    js_content = strip_types(content)
    js_path = ts_path.with_suffix('.js')
    js_path.write_text(js_content, encoding='utf-8')
    print(f"  {ts_path.relative_to(ROOT)} -> {js_path.name}")

def main():
    ts_files = list(ROOT.rglob('*.ts'))
    print(f"Found {len(ts_files)} .ts files")
    for ts in ts_files:
        # 跳过 miniprogram_npm 目录
        if 'miniprogram_npm' in str(ts):
            continue
        process_file(ts)
    print("Done.")

if __name__ == '__main__':
    main()