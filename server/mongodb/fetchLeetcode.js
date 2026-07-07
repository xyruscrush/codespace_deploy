/**
 * Fetch real LeetCode problems via their public GraphQL API.
 * Saves results to leetcode_problems.json
 */

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

// Step 1: Get the list of all problems with titles & difficulty
async function fetchProblemList() {
  const query = `
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        total: totalNum
        questions: data {
          questionId
          questionFrontendId
          title
          titleSlug
          difficulty
          topicTags {
            name
          }
          paidOnly: isPaidOnly
        }
      }
    }
  `;

  const res = await fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      variables: {
        categorySlug: "algorithms",
        skip: 0,
        limit: 500,
        filters: {},
      },
    }),
  });

  const data = await res.json();
  return data.data.problemsetQuestionList.questions;
}

// Step 2: For each problem, fetch its full description + example test cases
async function fetchProblemDetail(titleSlug) {
  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        questionFrontendId
        title
        titleSlug
        content
        difficulty
        exampleTestcaseList
        topicTags {
          name
        }
        codeSnippets {
          lang
          langSlug
          code
        }
        sampleTestCase
      }
    }
  `;

  const res = await fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      variables: { titleSlug },
    }),
  });

  const data = await res.json();
  return data.data.question;
}

// Convert HTML content to simplified markdown
function htmlToMarkdown(html) {
  if (!html) return "";
  let md = html;
  // Remove HTML tags but preserve structure
  md = md.replace(/<strong>(.*?)<\/strong>/g, "**$1**");
  md = md.replace(/<em>(.*?)<\/em>/g, "*$1*");
  md = md.replace(/<code>(.*?)<\/code>/g, "`$1`");
  md = md.replace(/<pre>(.*?)<\/pre>/gs, (_, content) => {
    const cleaned = content.replace(/<[^>]+>/g, "").trim();
    return "\n```text\n" + cleaned + "\n```\n";
  });
  md = md.replace(/<li>(.*?)<\/li>/g, "- $1");
  md = md.replace(/<p>(.*?)<\/p>/gs, "$1\n\n");
  md = md.replace(/<ul>/g, "");
  md = md.replace(/<\/ul>/g, "");
  md = md.replace(/<ol>/g, "");
  md = md.replace(/<\/ol>/g, "");
  md = md.replace(/<sup>(.*?)<\/sup>/g, "^$1");
  md = md.replace(/<sub>(.*?)<\/sub>/g, "_$1");
  md = md.replace(/<br\s*\/?>/g, "\n");
  md = md.replace(/<img[^>]*alt="([^"]*)"[^>]*>/g, "[$1]");
  md = md.replace(/<[^>]+>/g, "");
  // Clean up HTML entities
  md = md.replace(/&nbsp;/g, " ");
  md = md.replace(/&lt;/g, "<");
  md = md.replace(/&gt;/g, ">");
  md = md.replace(/&amp;/g, "&");
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/\n{3,}/g, "\n\n");
  return md.trim();
}

// Map LeetCode lang slugs to our template keys
function mapLangSlug(slug) {
  const map = {
    javascript: "javascript",
    python3: "python",
    python: "python",
    cpp: "cpp",
    java: "java",
  };
  return map[slug] || null;
}

async function main() {
  console.log("Fetching LeetCode problem list...");
  const allProblems = await fetchProblemList();

  // Filter out paid-only problems
  const freeProblems = allProblems.filter((p) => !p.paidOnly);
  console.log(`Found ${freeProblems.length} free problems`);

  // Take first 300 (sorted by frontend ID)
  const sorted = freeProblems.sort(
    (a, b) => Number(a.questionFrontendId) - Number(b.questionFrontendId)
  );
  const toFetch = sorted.slice(0, 300);

  const results = [];
  let fetched = 0;

  for (const prob of toFetch) {
    try {
      console.log(
        `[${++fetched}/${toFetch.length}] Fetching: ${prob.title} (${prob.titleSlug})`
      );
      const detail = await fetchProblemDetail(prob.titleSlug);

      if (!detail || !detail.content) {
        console.warn(`  Skipping ${prob.title} - no content`);
        continue;
      }

      // Convert description
      const description = htmlToMarkdown(detail.content);

      // Extract code snippets for our 4 languages
      const templates = {};
      if (detail.codeSnippets) {
        for (const snippet of detail.codeSnippets) {
          const key = mapLangSlug(snippet.langSlug);
          if (key) {
            templates[key] = snippet.code;
          }
        }
      }

      // Build category from tags
      const tags = (detail.topicTags || []).map((t) => t.name);
      const category = tags.length > 0 ? tags[0] : "General";

      // Example test cases
      const exampleInputs = detail.exampleTestcaseList || [];
      const sampleTestCase = detail.sampleTestCase || "";

      const testCases = exampleInputs.map((input) => ({
        input: input,
        expectedOutput: "", // LeetCode doesn't expose expected outputs publicly
      }));

      results.push({
        leetcodeId: Number(detail.questionFrontendId),
        title: detail.title,
        titleSlug: detail.titleSlug,
        difficulty: detail.difficulty,
        category,
        tags,
        description,
        templates,
        testCases,
        sampleTestCase,
      });

      // Rate limiting: wait 300ms between requests to be respectful
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      console.error(`  Error fetching ${prob.title}:`, err.message);
      // Wait a bit longer on error
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Write to JSON
  const fs = await import("fs");
  const path = await import("path");
  const outPath = path.resolve(
    import.meta.dirname || ".",
    "leetcode_problems.json"
  );
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nDone! Saved ${results.length} problems to ${outPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
