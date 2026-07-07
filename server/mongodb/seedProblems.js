import mongoose from "mongoose";
import dotenv from "dotenv";
import { Problem } from "../models/schema.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Please define MONGODB_URI in your .env file");
  process.exit(1);
}

/**
 * Wraps LeetCode's bare function stubs with stdin/stdout driver code
 * so that Judge0 can execute them with our test-case format.
 *
 * For simplicity, the templates remain as LeetCode provides them
 * (class-based stubs). Users write solution logic inside.
 * The "Custom Input" tab lets users provide raw stdin anyway.
 */
function wrapTemplate(lang, rawCode) {
  // Return the raw LeetCode stub as-is. Users can use Custom Input tab
  // to run arbitrary code. The stubs show the correct function signature.
  if (!rawCode) return "";
  return rawCode;
}

/**
 * Load the fetched LeetCode problems JSON
 */
function loadLeetCodeProblems() {
  const filePath = path.resolve(__dirname, "leetcode_problems.json");
  if (!fs.existsSync(filePath)) {
    console.error("leetcode_problems.json not found! Run fetchLeetcode.js first.");
    process.exit(1);
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

// ─── 3 Hand-Crafted "Gold Standard" Problems ─────────────────────────────
// These have full driver code + working test cases with expected outputs.
const goldProblems = [
  {
    title: "Two Sum",
    difficulty: "Easy",
    category: "Arrays",
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.

### Input Format
- First line: Space-separated integers representing the array \`nums\`.
- Second line: An integer representing \`target\`.

### Output Format
- Space-separated indices of the two numbers.

### Example 1
**Input:**
\`\`\`text
2 7 11 15
9
\`\`\`
**Output:**
\`\`\`text
0 1
\`\`\``,
    templates: {
      javascript: `function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
    return [];
}

// Driver code to read from stdin
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length >= 2) {
    const nums = lines[0].trim().split(/\\s+/).map(Number);
    const target = Number(lines[1]);
    const result = twoSum(nums, target);
    console.log(result.join(' '));
}`,
      python: `def twoSum(nums, target):
    val_map = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in val_map:
            return [val_map[complement], i]
        val_map[num] = i
    return []

# Driver code to read from stdin
import sys
if __name__ == '__main__':
    lines = sys.stdin.read().strip().split('\\n')
    if len(lines) >= 2:
        nums = list(map(int, lines[0].strip().split()))
        target = int(lines[1].strip())
        result = twoSum(nums, target)
        print(" ".join(map(str, result)))`,
      cpp: `#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> m;
    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        if (m.count(complement)) {
            return {m[complement], i};
        }
        m[nums[i]] = i;
    }
    return {};
}

int main() {
    vector<int> nums;
    int val, target;
    while (cin >> val) {
        nums.push_back(val);
        if (cin.peek() == '\\n') break;
    }
    cin >> target;
    vector<int> result = twoSum(nums, target);
    if (result.size() == 2) {
        cout << result[0] << " " << result[1] << endl;
    }
    return 0;
}`,
      java: `import java.util.*;
import java.io.*;

class Solution {
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }

    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line1 = br.readLine();
        String line2 = br.readLine();
        if (line1 == null || line2 == null) return;
        String[] parts = line1.trim().split("\\\\s+");
        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) {
            nums[i] = Integer.parseInt(parts[i]);
        }
        int target = Integer.parseInt(line2.trim());
        int[] result = twoSum(nums, target);
        if (result.length == 2) {
            System.out.println(result[0] + " " + result[1]);
        }
    }
}`
    },
    testCases: [
      { input: "2 7 11 15\n9", expectedOutput: "0 1" },
      { input: "3 2 4\n6", expectedOutput: "1 2" }
    ]
  },
  {
    title: "Valid Parentheses",
    difficulty: "Easy",
    category: "Stacks & Queues",
    description: `Given a string \`s\` containing just the characters \`('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

### Input Format
- A single line containing the string \`s\`.

### Output Format
- \`true\` if the string is valid, or \`false\` otherwise.

### Example 1
**Input:**
\`\`\`text
()[]{}
\`\`\`
**Output:**
\`\`\`text
true
\`\`\``,
    templates: {
      javascript: `function isValid(s) {
    const stack = [];
    const map = { ')': '(', '}': '{', ']': '[' };
    for (let char of s) {
        if (char === '(' || char === '{' || char === '[') {
            stack.push(char);
        } else {
            if (stack.pop() !== map[char]) return false;
        }
    }
    return stack.length === 0;
}

// Driver code to read from stdin
const fs = require('fs');
const line = fs.readFileSync(0, 'utf-8').trim();
console.log(isValid(line) ? 'true' : 'false');`,
      python: `def isValid(s: str) -> bool:
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping.values():
            stack.append(char)
        elif char in mapping:
            if not stack or stack.pop() != mapping[char]:
                return False
        else:
            return False
    return len(stack) == 0

# Driver code to read from stdin
import sys
if __name__ == '__main__':
    line = sys.stdin.read().strip()
    print("true" if isValid(line) else "false")`,
      cpp: `#include <iostream>
#include <string>
#include <stack>
#include <unordered_map>
using namespace std;

bool isValid(string s) {
    stack<char> st;
    unordered_map<char, char> m = {{')', '('}, {'}', '{'}, {']', '['}};
    for (char c : s) {
        if (c == '(' || c == '{' || c == '[') {
            st.push(c);
        } else {
            if (st.empty() || st.top() != m[c]) return false;
            st.pop();
        }
    }
    return st.empty();
}

int main() {
    string s;
    if (cin >> s) {
        cout << (isValid(s) ? "true" : "false") << endl;
    }
    return 0;
}`,
      java: `import java.util.*;
import java.io.*;

class Solution {
    public static boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();
        Map<Character, Character> map = new HashMap<>();
        map.put(')', '(');
        map.put('}', '{');
        map.put(']', '[');
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '{' || c == '[') {
                stack.push(c);
            } else {
                if (stack.isEmpty() || stack.pop() != map.get(c)) return false;
            }
        }
        return stack.isEmpty();
    }

    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        System.out.println(isValid(line.trim()) ? "true" : "false");
    }
}`
    },
    testCases: [
      { input: "()[]{}", expectedOutput: "true" },
      { input: "(]", expectedOutput: "false" }
    ]
  },
  {
    title: "Reverse String",
    difficulty: "Easy",
    category: "Strings",
    description: `Write a function that reverses a string. The input string is given as an array of characters \`s\`.

You must do this by modifying the input array in-place with O(1) extra memory.

### Input Format
- Space-separated characters representing the array \`s\`.

### Output Format
- Space-separated characters in reverse order.

### Example 1
**Input:**
\`\`\`text
h e l l o
\`\`\`
**Output:**
\`\`\`text
o l l e h
\`\`\``,
    templates: {
      javascript: `function reverseString(s) {
    let left = 0, right = s.length - 1;
    while (left < right) {
        let temp = s[left];
        s[left] = s[right];
        s[right] = temp;
        left++;
        right--;
    }
}

// Driver code to read from stdin
const fs = require('fs');
const line = fs.readFileSync(0, 'utf-8').trim();
if (line) {
    const s = line.split(/\\s+/);
    reverseString(s);
    console.log(s.join(' '));
}`,
      python: `def reverseString(s):
    left, right = 0, len(s) - 1
    while left < right:
        s[left], s[right] = s[right], s[left]
        left += 1
        right -= 1

# Driver code to read from stdin
import sys
if __name__ == '__main__':
    line = sys.stdin.read().strip()
    if line:
        s = line.split()
        reverseString(s)
        print(" ".join(s))`,
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

void reverseString(vector<char>& s) {
    int left = 0, right = s.size() - 1;
    while (left < right) {
        swap(s[left], s[right]);
        left++;
        right--;
    }
}

int main() {
    char c;
    vector<char> s;
    while (cin >> c) {
        s.push_back(c);
        if (cin.peek() == '\\n') break;
    }
    reverseString(s);
    for (int i = 0; i < s.size(); i++) {
        cout << s[i] << (i == s.size() - 1 ? "" : " ");
    }
    cout << endl;
    return 0;
}`,
      java: `import java.util.*;
import java.io.*;

class Solution {
    public static void reverseString(char[] s) {
        int left = 0, right = s.length - 1;
        while (left < right) {
            char temp = s[left];
            s[left] = s[right];
            s[right] = temp;
            left++;
            right--;
        }
    }

    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        String[] parts = line.trim().split("\\\\s+");
        char[] s = new char[parts.length];
        for (int i = 0; i < parts.length; i++) {
            s[i] = parts[i].charAt(0);
        }
        reverseString(s);
        for (int i = 0; i < s.length; i++) {
            System.out.print(s[i] + (i == s.length - 1 ? "" : " "));
        }
        System.out.println();
    }
}`
    },
    testCases: [
      { input: "h e l l o", expectedOutput: "o l l e h" },
      { input: "H a n n a h", expectedOutput: "h a n n a H" }
    ]
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB for seeding...");

    // Clear existing problems
    await Problem.deleteMany({});
    console.log("Cleared existing problems");

    // Start with the 3 gold-standard hand-crafted problems
    const seededProblems = [...goldProblems];
    const usedTitles = new Set(goldProblems.map(p => p.title));

    // Load the fetched LeetCode problems
    const leetcodeData = loadLeetCodeProblems();
    console.log(`Loaded ${leetcodeData.length} LeetCode problems from JSON`);

    for (const lc of leetcodeData) {
      if (seededProblems.length >= 300) break;

      // Skip duplicates (our gold problems already cover Two Sum etc.)
      if (usedTitles.has(lc.title)) continue;
      usedTitles.add(lc.title);

      // Skip problems without a description
      if (!lc.description || lc.description.trim().length < 20) continue;

      // Map difficulty
      const difficulty = lc.difficulty || "Medium";

      // Map category
      const category = lc.category || "General";

      // Templates: use the LeetCode stubs directly
      const templates = {};
      if (lc.templates) {
        for (const [lang, code] of Object.entries(lc.templates)) {
          if (code && code.trim()) {
            templates[lang] = wrapTemplate(lang, code);
          }
        }
      }

      // Test cases: LeetCode doesn't expose expected outputs,
      // but we store the inputs so the Custom Input tab can use them.
      // For standard test cases, we keep them with empty expected outputs
      // (the AI test case generator can fill these in).
      const testCases = [];
      if (lc.testCases && Array.isArray(lc.testCases)) {
        for (const tc of lc.testCases) {
          if (tc.input && tc.input.trim()) {
            testCases.push({
              input: tc.input.trim(),
              expectedOutput: tc.expectedOutput || "Run to verify"
            });
          }
        }
      }

      seededProblems.push({
        title: lc.title,
        difficulty,
        category,
        description: lc.description,
        templates,
        testCases
      });
    }

    console.log(`Total problems to seed: ${seededProblems.length}`);

    // Insert all problems
    await Problem.insertMany(seededProblems);
    console.log(`✅ DSA problems seeded successfully! Total: ${seededProblems.length}`);

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
