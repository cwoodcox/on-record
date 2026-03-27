#!/usr/bin/env bash
# Generate a conversation transcript from a synthesis prompt scenario file.
#
# Usage:
#   ./generate_transcript.sh synthesis-prompts/01-happy-path-email-casual.md gpt-4o
#   ./generate_transcript.sh synthesis-prompts/05-validation-skip-gap.md gemini-2.5-flash
#   ./generate_transcript.sh synthesis-prompts/10-healthcare-emotional.md claude-sonnet-4-6
#
# Provider inferred from model name:
#   gpt-* / o1* / o3*  → OpenAI    (OPENAI_API_KEY)
#   gemini-*           → Google    (GEMINI_API_KEY)
#   claude-*           → Anthropic (ANTHROPIC_API_KEY)
#
# Output: synthesis-outputs/<scenario-stem>/<model>-<timestamp>.md
source .env
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SYSTEM_PROMPT="$REPO_ROOT/system-prompt/agent-instructions.md"
BASE_INSTRUCTIONS="$SCRIPT_DIR/synthesis-prompts/_base-instructions.md"
OUTPUT_BASE="$SCRIPT_DIR/synthesis-outputs"

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <scenario-file> <model>" >&2
  exit 1
fi

SCENARIO_FILE="$1"
MODEL="$2"

if [[ ! -f "$SCENARIO_FILE" ]]; then
  echo "Error: scenario file not found: $SCENARIO_FILE" >&2
  exit 1
fi

# Assemble system prompt (director framing + agent instructions)
# and user message (scenario spec only)
SYSTEM="$(cat "$BASE_INSTRUCTIONS")

$(cat "$SYSTEM_PROMPT")"

USER_MSG="$(cat "$SCENARIO_FILE")"

# Infer provider
if [[ "$MODEL" == gpt-* || "$MODEL" == o1* || "$MODEL" == o3* ]]; then
  PROVIDER="openai"
elif [[ "$MODEL" == gemini* ]]; then
  PROVIDER="google"
elif [[ "$MODEL" == claude* ]]; then
  PROVIDER="anthropic"
else
  echo "Error: cannot infer provider from model '$MODEL'" >&2
  exit 1
fi

# Output path
SCENARIO_STEM="$(basename "$SCENARIO_FILE" .md)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$OUTPUT_BASE/$SCENARIO_STEM"
mkdir -p "$OUT_DIR"
OUT_FILE="$OUT_DIR/${MODEL}-${TIMESTAMP}.md"

echo "Generating: $SCENARIO_STEM via $MODEL..." >&2

SYSTEM_JSON="$(jq -n --arg s "$SYSTEM" '$s')"
USER_JSON="$(jq -n --arg u "$USER_MSG" '$u')"

case "$PROVIDER" in
  openai)
    curl -s https://api.openai.com/v1/chat/completions \
      -H "Authorization: Bearer $OPENAI_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"model\": \"$MODEL\",
        \"temperature\": 1,
        \"messages\": [
          {\"role\": \"system\", \"content\": $SYSTEM_JSON},
          {\"role\": \"user\", \"content\": $USER_JSON}
        ]
      }" | jq -r '.choices[0].message.content' > "$OUT_FILE"
    ;;
  anthropic)
    curl -s https://api.anthropic.com/v1/messages \
      -H "x-api-key: $ANTHROPIC_API_KEY" \
      -H "anthropic-version: 2023-06-01" \
      -H "Content-Type: application/json" \
      -d "{
        \"model\": \"$MODEL\",
        \"max_tokens\": 8192,
        \"system\": $SYSTEM_JSON,
        \"messages\": [{\"role\": \"user\", \"content\": $USER_JSON}]
      }" | jq -r '.content[0].text' > "$OUT_FILE"
    ;;
  google)
    curl -s "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=$GEMINI_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"system_instruction\": {\"parts\": [{\"text\": $SYSTEM_JSON}]},
        \"contents\": [{\"parts\": [{\"text\": $USER_JSON}]}],
        \"generationConfig\": {\"temperature\": 1}
      }" | jq -r '.candidates[0].content.parts[0].text' > "$OUT_FILE"
    ;;
esac

echo "$OUT_FILE"
