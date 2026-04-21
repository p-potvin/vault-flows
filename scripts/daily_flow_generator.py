import os
import sys
import json
import urllib.request
import re

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")

if not GITHUB_TOKEN:
    print("Error: GITHUB_TOKEN environment variable not set.")
    sys.exit(1)

def call_github_model(messages, model="gpt-4o"):
    url = "https://models.inference.ai.azure.com/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GITHUB_TOKEN}"
    }
    data = {
        "model": model,
        "messages": messages,
        "temperature": 0.7,
    }

    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result['choices'][0]['message']['content']
    except Exception as e:
        print(f"API call failed: {e}")
        if hasattr(e, 'read'):
            print(e.read().decode())
        sys.exit(1)

def generate_flow():
    try:
        with open('AI_Flows_Categories.md', 'r') as f:
            categories = f.read()
    except FileNotFoundError:
        categories = "Visual & Graphics, Audio, Text, Utility"

    try:
        with open('src/api.js', 'r') as f:
            api_js = f.read()
    except FileNotFoundError:
        api_js = ""

    existing_flows = re.findall(r"name:\s*'([^']+)'", api_js)

    prompt = f"""
    You are an AI Workflow generator. Create ONE new, creative AI workflow.

    Categories to base your idea on:
    {categories}

    Existing workflows (DO NOT duplicate these):
    {', '.join(existing_flows)}

    You must output a JSON object containing the exact modifications needed to add this flow to the system.

    The new flow must be added to `src/api.js` in the `DEFAULT_WORKFLOWS` array.
    The new flow must also have backend support by modifying one of the agents in `agents/` (e.g. `image_agent.py`, `video_agent.py`, `text_agent.py`) to add the new skill and its handler.
    Important constraint: In the pipeline execution logic or description, ensure it uses local models at `D:\\comfyui\\resources\\comfyui\\models\\{{model_type}}\\{{model_name}}`.

    Your output MUST be valid JSON with this structure:
    {{
      "workflow_name": "Name of workflow",
      "category": "Visual",
      "api_js_addition": "The full object string to insert into DEFAULT_WORKFLOWS. e.g. {{ id: 'wf-new', name: '...', category: '...', description: '... Uses D:\\\\comfyui\\\\resources\\\\comfyui\\\\models\\\\{{model_type}}\\\\{{model_name}}.', favorite: false, pin: false, lastRun: null }},",
      "backend_file": "agents/image_agent.py",
      "backend_skill_addition": "The skill name to add to SKILLS, e.g. 'new_skill'",
      "backend_handler_code": "def _new_skill(self, task):\\n    return {{'status': 'success', 'data': f'Ran local model at D:\\\\comfyui\\\\resources\\\\comfyui\\\\models\\\\{{task.get(\\'model_type\\')}}\\\\{{task.get(\\'model_name\\')}}'}}"
    }}
    """

    response = call_github_model([{"role": "user", "content": prompt}])

    match = re.search(r'```json\n(.*?)\n```', response, re.DOTALL)
    if match:
        json_str = match.group(1)
    else:
        json_str = response

    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        print("Failed to parse Idea Generator response as JSON.")
        sys.exit(1)

def apply_frontend(data):
    try:
        with open('src/api.js', 'r') as f:
            lines = f.readlines()
    except FileNotFoundError:
        return

    insert_idx = -1
    in_default_workflows = False

    for i, line in enumerate(lines):
        if 'const DEFAULT_WORKFLOWS = [' in line:
            in_default_workflows = True
            continue

        if in_default_workflows:
            if '];' in line:
                insert_idx = i
                break

    if insert_idx != -1:
        lines.insert(insert_idx, "  " + data["api_js_addition"] + "\n")
        with open('src/api.js', 'w') as f:
            f.writelines(lines)

def apply_backend(data):
    try:
        with open(data["backend_file"], 'r') as f:
            content = f.read()
    except FileNotFoundError:
        return

    skill_str = f"'{data['backend_skill_addition']}'"
    content = content.replace("SKILLS = [", f"SKILLS = [\n    {skill_str},")

    if "if task['action'] ==" in content:
        handler_call = f"""        elif task['action'] == {skill_str}:
            return self._{data['backend_skill_addition']}(task)
"""
        content = content.replace("        else:\n            raise", handler_call + "        else:\n            raise")

    content += "\n\n    " + data["backend_handler_code"].replace("\n", "\n    ") + "\n"

    with open(data["backend_file"], 'w') as f:
        f.write(content)

def update_smoke_test(data):
    try:
        with open('tests/e2e/basic-smoke.spec.js', 'r') as f:
            content = f.read()
    except FileNotFoundError:
        return

    injection_str = "await expect(page.getByText('Image to Video Face Swap')).toBeVisible();\n"
    if injection_str in content:
        new_assertion = f"    await expect(page.getByText('{data['workflow_name']}')).toBeVisible();\n"
        content = content.replace(injection_str, injection_str + new_assertion)

        with open('tests/e2e/basic-smoke.spec.js', 'w') as f:
            f.write(content)

if __name__ == "__main__":
    print("Running Daily Flow Generator...")
    data = generate_flow()
    print(f"Generated flow: {data['workflow_name']}")

    apply_frontend(data)
    apply_backend(data)
    update_smoke_test(data)
    print("Generation complete.")
