import json
from groq import Groq
from app.config import get_settings


def _generate_batch(client, topic: str, count: int) -> list[dict]:
    prompt = f"""Generate exactly {count} multiple choice questions on the topic: "{topic}".

Return ONLY a valid JSON array with no extra text. Each object must have exactly these keys:
- "question_text": the question string
- "option_a": first option
- "option_b": second option
- "option_c": third option
- "option_d": fourth option
- "correct_answer": the letter of the correct answer (A, B, C, or D)

Make the questions professional, varied in difficulty, and suitable for an assessment.
Ensure exactly one correct answer per question.
Return ONLY the JSON array, no markdown formatting, no code blocks."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=8192,
    )
    text = response.choices[0].message.content.strip()

    # Clean up response - remove markdown code blocks if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]
    text = text.strip()

    questions = json.loads(text)

    if not isinstance(questions, list):
        raise ValueError("Expected a JSON array of questions")

    valid = []
    required_keys = {"question_text", "option_a", "option_b", "option_c", "option_d", "correct_answer"}
    for q in questions:
        if not required_keys.issubset(q.keys()):
            continue
        if q["correct_answer"].upper() not in ("A", "B", "C", "D"):
            continue
        q["correct_answer"] = q["correct_answer"].upper()
        valid.append(q)

    return valid


def generate_mcq_questions(topic: str, num_questions: int) -> list[dict]:
    settings = get_settings()
    client = Groq(api_key=settings.GROQ_API_KEY)

    # Split into batches of 10 to avoid token limits
    all_questions = []
    remaining = num_questions
    while remaining > 0:
        batch_size = min(remaining, 10)
        batch = _generate_batch(client, topic, batch_size)
        all_questions.extend(batch)
        remaining = num_questions - len(all_questions)
        # Safety: break if we got at least what we need or retried too many times
        if len(all_questions) >= num_questions:
            break

    return all_questions[:num_questions]
