/**
 * Fetch additional LeetCode problems (batch 2 and 3) via their public GraphQL API.
 * Appends results to existing leetcode_problems.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

async function fetchProblemList(skip, limit) {
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
        skip,
        limit,
        filters: {},
      },
    }),
  });

  const data = await res.json();
  return data.data.problemsetQuestionList.questions;
}

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

function htmlToMarkdown(html) {
  if (!html) return "";
  let md = html;
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
  md = md.replace(/&nbsp;/g, " ");
  md = md.replace(/&lt;/g, "<");
  md = md.replace(/&gt;/g, ">");
  md = md.replace(/&amp;/g, "&");
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/\n{3,}/g, "\n\n");
  return md.trim();
}

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
  const outPath = path.resolve(__dirname, "leetcode_problems.json");

  // Load existing problems
  let existing = [];
  if (fs.existsSync(outPath)) {
    existing = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    console.log(`Loaded ${existing.length} existing problems`);
  }

  const existingTitles = new Set(existing.map((p) => p.titleSlug));

  const batchesToFetch = [
    { skip: 100, limit: 100 },
    { skip: 200, limit: 100 },
    { skip: 300, limit: 100 },
    { skip: 400, limit: 100 },
  ];

  let totalNew = 0;
  const needed = 300 - existing.length;

  for (const batch of batchesToFetch) {
    if (totalNew >= needed) break;

    console.log(
      `\nFetching problem list batch: skip=${batch.skip}, limit=${batch.limit}`
    );
    let problems;
    try {
      problems = await fetchProblemList(batch.skip, batch.limit);
    } catch (err) {
      console.error(`Failed to fetch batch:`, err.message);
      continue;
    }

    if (!problems || problems.length === 0) {
      console.log("No more problems found.");
      break;
    }

    // Filter out paid-only and already fetched
    const toFetch = problems.filter(
      (p) => !p.paidOnly && !existingTitles.has(p.titleSlug)
    );
    console.log(`Found ${toFetch.length} new free problems in this batch`);

    for (const prob of toFetch) {
      if (totalNew >= needed) break;

      try {
        console.log(
          `  [${existing.length + 1}/300] Fetching: ${prob.title} (${prob.titleSlug})`
        );
        const detail = await fetchProblemDetail(prob.titleSlug);

        if (!detail || !detail.content) {
          console.warn(`    Skipping ${prob.title} - no content`);
          continue;
        }

        const description = htmlToMarkdown(detail.content);
        const templates = {};
        if (detail.codeSnippets) {
          for (const snippet of detail.codeSnippets) {
            const key = mapLangSlug(snippet.langSlug);
            if (key) {
              templates[key] = snippet.code;
            }
          }
        }

        const tags = (detail.topicTags || []).map((t) => t.name);
        const category = tags.length > 0 ? tags[0] : "General";
        const exampleInputs = detail.exampleTestcaseList || [];
        const testCases = exampleInputs.map((input) => ({
          input,
          expectedOutput: "",
        }));

        const entry = {
          leetcodeId: Number(detail.questionFrontendId),
          title: detail.title,
          titleSlug: detail.titleSlug,
          difficulty: detail.difficulty,
          category,
          tags,
          description,
          templates,
          testCases,
          sampleTestCase: detail.sampleTestCase || "",
        };

        existing.push(entry);
        existingTitles.add(prob.titleSlug);
        totalNew++;

        await new Promise((r) => setTimeout(r, 350));
      } catch (err) {
        console.error(`    Error fetching ${prob.title}:`, err.message);
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
  console.log(`\nDone! Total problems saved: ${existing.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
