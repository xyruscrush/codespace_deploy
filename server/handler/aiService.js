import dotenv from "dotenv";
dotenv.config();

function getFallbackTestCases(title) {
  const lowerTitle = (title || "").toLowerCase();
  if (lowerTitle.includes("two sum")) {
    return [
      { input: "1 2 3 4\n5", expectedOutput: "0 3" },
      { input: "10 20 30\n50", expectedOutput: "1 2" },
      { input: "-1 -2 -3 -4 -5\n-8", expectedOutput: "2 4" }
    ];
  }
  if (lowerTitle.includes("parentheses")) {
    return [
      { input: "()", expectedOutput: "true" },
      { input: "((", expectedOutput: "false" },
      { input: "{[]}", expectedOutput: "true" }
    ];
  }
  if (lowerTitle.includes("reverse")) {
    return [
      { input: "a b c d", expectedOutput: "d c b a" },
      { input: "1 2 3", expectedOutput: "3 2 1" },
      { input: "t e s t", expectedOutput: "t s e t" }
    ];
  }
  return [
    { input: "1 2 3\n5", expectedOutput: "test 1" },
    { input: "4 5 6\n10", expectedOutput: "test 2" },
    { input: "7 8 9\n15", expectedOutput: "test 3" }
  ];
}

export async function generateAiTestCases(req, res) {
  try {
    const { problemTitle, problemDescription } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn("GEMINI_API_KEY not configured. Falling back to offline test case generation.");
      const fallbackCases = getFallbackTestCases(problemTitle);
      return res.status(200).json({ success: true, data: fallbackCases });
    }

    const prompt = `You are a strict test case generator for a coding platform.
Given this coding problem:
Title: "${problemTitle}"
Description:
${problemDescription}

Generate exactly 3 diverse test cases for verifying solutions to this problem.
Include edge cases (empty lists, extreme inputs, negative values, etc.).
Make sure the input format matches the problem description exactly, and the expectedOutput is exactly what the solution should return or print.

Format your output STRICTLY as a JSON array of objects, where each object has:
- "input": A string containing the standard input (stdin) for the test case. If there are multiple inputs, they must be separated by newlines exactly as the problem's input format defines.
- "expectedOutput": A string containing the exact expected stdout of the code.

Example JSON output format:
[
  {
    "input": "2 7 11 15\\n9",
    "expectedOutput": "0 1"
  }
]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();
    const jsonText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) {
      throw new Error("No text content returned from Gemini API");
    }

    const testCases = JSON.parse(jsonText.trim());
    return res.status(200).json({ success: true, data: testCases });
  } catch (error) {
    console.error("Gemini test case generation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate AI test cases",
      error: error.message,
    });
  }
}
