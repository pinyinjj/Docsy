import json
import re
import os

path = r'C:\Users\YJ\.gemini\antigravity-cli\brain\a2cb2ef5-7c5b-4d33-9f81-8ba64807488a\.system_generated\logs\transcript_full.jsonl'
best_content = None
max_len = 0

with open(path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            content = data.get('content', '')
            if content and '软件复杂性的挑战' in content and '分层与解耦策略' in content:
                # This looks like it might contain the file contents.
                # Let's extract the markdown code block if there is one.
                matches = re.findall(r'`markdown\n(.*?)`', content, re.DOTALL)
                for m in matches:
                    if len(m) > max_len:
                        max_len = len(m)
                        best_content = m
            
            # Also check tool_calls for write_to_file or replace_file_content
            if 'tool_calls' in data:
                for tc in data['tool_calls']:
                    if tc.get('name') == 'write_to_file':
                        args = tc.get('arguments', {})
                        if 'TargetFile' in args and 'generated_doc.md' in args['TargetFile']:
                            c = args.get('CodeContent', '')
                            if len(c) > max_len:
                                max_len = len(c)
                                best_content = c
        except Exception:
            pass

if best_content:
    print(f"Found backup! Length: {len(best_content)}")
    with open('backup_found.md', 'w', encoding='utf-8') as f:
        f.write(best_content)
else:
    print("No backup found in transcript.")
