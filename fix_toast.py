import base64, json

# Build the correct appID with NO backslash-v ambiguity
app_id = "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}"
app_id += "\\WindowsPowerShell"
app_id += "\\v1.0"
app_id += "\\powershell.exe"

lines = []
lines.append("$t=[Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,ContentType=WindowsRuntime]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType,Windows.UI.Notifications,ContentType=WindowsRuntime]::ToastText02)")
lines.append("$x=$t.GetElementsByTagName('text')")
lines.append("$x.Item(0).InnerText='Claude Code'")
lines.append("$x.Item(1).InnerText='Task done!'")
lines.append("$a='" + app_id + "'")
lines.append("[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($a).Show($t)")

ps_code = "\n".join(lines)

# Verify no control chars (except newline)
for i, c in enumerate(ps_code):
    if ord(c) < 32 and c != '\n':
        print(f"ERROR: control char 0x{ord(c):02x} at position {i}")
        raise SystemExit(1)

# Encode for PowerShell -EncodedCommand (UTF-16 LE)
encoded = base64.b64encode(ps_code.encode('utf-16le')).decode('ascii')
print("=== Base64 (Task done!) ===")
print(encoded)

# Verify round-trip
decoded = base64.b64decode(encoded).decode('utf-16le')
print("\n=== Decoded verification ===")
for i, c in enumerate(decoded):
    if ord(c) < 32 and c != '\n':
        print(f"WARN: 0x{ord(c):02x} at {i}")
print(decoded)

# Also build Notification version
nlines = list(lines)
nlines[3] = "$x.Item(1).InnerText='Notification'"
nps = "\n".join(nlines)
nencoded = base64.b64encode(nps.encode('utf-16le')).decode('ascii')
print("\n=== Base64 (Notification) ===")
print(nencoded)

# Update settings.json
with open('C:/Users/tonyy/.claude/settings.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

cmd = 'powershell -ExecutionPolicy Bypass -EncodedCommand ' + encoded
ncmd = 'powershell -ExecutionPolicy Bypass -EncodedCommand ' + nencoded

for section in ['Stop', 'SessionEnd', 'SessionStart']:
    for hook_group in data['hooks'].get(section, []):
        if 'hooks' in hook_group:
            for h in hook_group['hooks']:
                if h.get('command', '').startswith('powershell'):
                    h['command'] = cmd
                    print(f"Updated {section}")

for hook_group in data['hooks'].get('Notification', []):
    if 'hooks' in hook_group:
        for h in hook_group['hooks']:
            if h.get('command', '').startswith('powershell'):
                h['command'] = ncmd
                print("Updated Notification")

with open('C:/Users/tonyy/.claude/settings.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print("\nDone!")
