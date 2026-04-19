import os
import re
import json

# Configuration
BOT_ROOT = './bots'
WEB_ROOT = '.'
HTML_FILES = ['index.html', 'kozzyxbotmain.html', 'kozzyx_v2_sleek.html']

# Categories mapping
DIR_TO_CAT = {
    'ai-bot': 'ai',
    'mod-bot': 'mod',
    'ticket-bot': 'tickets',
    'utility-bot': 'utility'
}

def extract_commands():
    commands = []
    
    for bot_dir in os.listdir(BOT_ROOT):
        bot_path = os.path.join(BOT_ROOT, bot_dir)
        if not os.path.isdir(bot_path):
            continue
            
        cat = DIR_TO_CAT.get(bot_dir, 'utility')
        
        # Path to slash commands
        slash_path = os.path.join(bot_path, 'src', 'slashCommands', 'general')
        if os.path.exists(slash_path):
            for file in os.listdir(slash_path):
                if file.endswith('.js'):
                    with open(os.path.join(slash_path, file), 'r') as f:
                        content = f.read()
                        # Simple regex to find name and description in export default
                        name_match = re.search(r'name:\s*"([^"]+)"', content)
                        desc_match = re.search(r'description:\s*"([^"]+)"', content)
                        
                        if name_match and desc_match:
                            commands.append({
                                "cmd": f"/{name_match.group(1)}",
                                "args": "", # We could extract options too if needed
                                "desc": desc_match.group(1),
                                "cat": cat,
                                "popular": False # default
                            })

    return commands

def update_html_files(commands):
    # Convert commands to a pretty JS array string
    js_array = "const COMMANDS = " + json.dumps(commands, indent=12) + ";"
    
    # Fix the bracket formatting slightly for aesthetic consistency
    js_array = js_array.replace('const COMMANDS = [', 'const COMMANDS = [\n            // Automatically Synced Commands')
    
    marker_begin = '/*COMMANDS-DATA-BEGIN*/'
    marker_end = '/*COMMANDS-DATA-END*/'
    
    for filename in HTML_FILES:
        filepath = os.path.join(WEB_ROOT, filename)
        if not os.path.exists(filepath):
            continue
            
        with open(filepath, 'r') as f:
            content = f.read()
            
        # Find markers
        start_idx = content.find(marker_begin)
        end_idx = content.find(marker_end)
        
        if start_idx == -1 or end_idx == -1:
            print(f"Markers not found in {filename}")
            continue
            
        # Replace content between markers
        new_content = (
            content[:start_idx + len(marker_begin)] +
            f"\n        {js_array}\n        " +
            content[end_idx:]
        )
        
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filename}")

if __name__ == "__main__":
    cmds = extract_commands()
    if cmds:
        update_html_files(cmds)
        print(f"Successfully synced {len(cmds)} commands.")
    else:
        print("No commands found to sync.")
