import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Get current date in Moscow timezone for AI context
function getMoscowDate(): string {
  return new Date().toLocaleString('ru-RU', { 
    timeZone: 'Europe/Moscow',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const SYSTEM_PROMPT = `Ты AI-ассистент для парсинга задач. На основе текста пользователя извлеки информацию для создания задачи.

ТЕКУЩАЯ ДАТА И ВРЕМЯ: {current_date}

ВАЖНО: Отвечай ТОЛЬКО валидным JSON без markdown-разметки и комментариев.

Формат ответа:
{
  "title": "краткий заголовок задачи (до 100 символов)",
  "summary": "краткое описание сути задачи (1-2 предложения)",
  "description": "полное описание задачи или null если информации мало",
  "task_type": "idea" | "problem" | "task" | "question",
  "importance": "critical" | "important" | "can_wait",
  "due_date": "ISO 8601 дата дедлайна или null"
}

Правила определения task_type:
- "idea" - предложение, улучшение, новая функция
- "problem" - проблема, ошибка, жалоба
- "task" - конкретная задача для выполнения
- "question" - вопрос, запрос информации

Правила определения importance:
- "critical" - срочно, критично, блокирует работу
- "important" - важно, но не срочно
- "can_wait" - можно отложить, низкий приоритет

Правила определения due_date:
- Если упомянуто "завтра" - вычисли дату завтра
- Если упомянуто "через час/2 часа/N часов" - вычисли время
- Если упомянуто "в понедельник/вторник/..." - вычисли ближайшую дату
- Если упомянуто конкретное время "в 15:00" - добавь к дате
- Если дата/время не упомянуты - верни null
- Формат: ISO 8601 (например: "2025-01-29T15:00:00+03:00")

Если не можешь определить - используй "task" и "important" по умолчанию, due_date = null.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      throw new Error("No text provided");
    }

    console.log("Parsing task from text:", text.substring(0, 100));

    // Inject current date into prompt
    const promptWithDate = SYSTEM_PROMPT.replace('{current_date}', getMoscowDate());

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: promptWithDate },
          { role: "user", content: text },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AI API error:", error);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Слишком много запросов, попробуйте позже" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Лимит AI-запросов исчерпан" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${error}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI response:", content);

    // Parse JSON response - handle potential markdown wrapping
    let parsed;
    try {
      // Remove markdown code block if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      parsed = JSON.parse(cleanContent.trim());
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      // Fallback to basic extraction
      parsed = {
        title: text.substring(0, 100),
        summary: text.substring(0, 200),
        description: text.length > 200 ? text : null,
        task_type: "task",
        importance: "important",
        due_date: null,
      };
    }

    // Validate and sanitize
    const validTaskTypes = ["idea", "problem", "task", "question"];
    const validImportance = ["critical", "important", "can_wait"];

    // Validate due_date if present
    let validDueDate: string | null = null;
    if (parsed.due_date) {
      try {
        const date = new Date(parsed.due_date);
        if (!isNaN(date.getTime())) {
          validDueDate = date.toISOString();
        }
      } catch {
        console.log("Invalid due_date from AI:", parsed.due_date);
      }
    }

    const result_task = {
      title: String(parsed.title || text.substring(0, 100)).substring(0, 200),
      summary: String(parsed.summary || text.substring(0, 200)).substring(0, 500),
      description: parsed.description ? String(parsed.description).substring(0, 2000) : null,
      task_type: validTaskTypes.includes(parsed.task_type) ? parsed.task_type : "task",
      importance: validImportance.includes(parsed.importance) ? parsed.importance : "important",
      due_date: validDueDate,
    };

    return new Response(
      JSON.stringify(result_task),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Task parser error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
