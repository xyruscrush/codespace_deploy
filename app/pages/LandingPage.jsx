import { useNavigate } from "react-router-dom";
export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans">
      <header className="flex justify-between items-center px-8 py-4 border-b">
        <div className="font-semibold text-lg flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-500 rounded"></div>
          CodeSpace
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => {
              navigate("/auth");
            }}
            className="px-4 py-2 rounded hover:bg-gray-100 cursor-pointer"
          >
            Sign in
          </button>
          <button
            onClick={() => {
              navigate("/auth");
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 cursor-pointer"
          >
            Get Started
          </button>
        </div>
      </header>

      <section className="flex flex-col items-center text-center mt-16 px-4">
        <h1 className="text-4xl font-bold mb-4">
          Practice DSA together —{" "}
          <span className="text-indigo-600">collaboratively</span>
        </h1>
        <p className="text-gray-600 max-w-2xl mb-6">
          A focused, real-time platform for studying data structures &
          algorithms with peers. Create rooms, pair program, discuss in chat,
          and run tests together — all in one place.
        </p>
        <button
          onClick={() => {
            navigate("/auth");
          }}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow hover:bg-indigo-700 cursor-pointer"
        >
          Get started — create a room
        </button>

        <div className="flex gap-10 mt-10 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span>⚡</span> Real-time editor
          </div>
          <div className="flex items-center gap-2">
            <span>🧩</span> Structured practice
          </div>
        </div>
      </section>

      <section className="flex justify-center mt-16 px-6">
        <div className="flex flex-col md:flex-row w-full max-w-5xl shadow-lg border rounded-2xl overflow-hidden">
          <div className="flex-1 p-6 border-r">
            <h3 className="font-semibold text-lg mb-2">Problem</h3>
            <p className="text-gray-700 font-medium mb-2">Two Sum</p>
            <p className="text-gray-600 mb-4">
              Return indices of two numbers that add up to target.
            </p>
            <p className="text-sm bg-gray-50 p-2 rounded-md border">
              Input: nums = [2,7,11,15], target = 9<br />
              Output: [0,1]
            </p>
          </div>

          <div className="flex-1 p-6 border-r bg-gray-50">
            <h3 className="font-semibold text-lg mb-2">Editor</h3>
            <pre className="bg-white p-3 rounded-md text-sm overflow-x-auto border">
              {`function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) return [map.get(complement), i];
    map.set(nums[i], i);
  }
}`}
            </pre>
            <div className="flex justify-between mt-3 items-center">
              <button className="bg-indigo-600 text-white px-4 py-1 rounded hover:bg-indigo-700">
                Run
              </button>
              <p className="text-xs text-gray-500">Autosave • 00:12:34</p>
            </div>
          </div>

          <div className="flex flex-col justify-between p-6 w-80 bg-white">
            <h3 className="font-semibold text-lg mb-3">Webchat</h3>
            <div className="flex flex-col gap-3 text-sm mb-4">
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold">
                  J
                </div>
                <div>
                  <p className="font-medium">Jess • 2m</p>
                  <p>Try using a hashmap to get O(n) time.</p>
                </div>
              </div>
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center text-xs font-bold">
                  A
                </div>
                <div>
                  <p className="font-medium">Ari • 1m</p>
                  <p>I’ll write tests after implementing.</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700">
                Send
              </button>
            </div>
            <div className="mt-4 text-right"></div>
          </div>
        </div>
      </section>

      <footer className="mt-20 py-10 border-t text-center text-sm text-gray-500">
        <p className="font-semibold mb-1">CollabDSA</p>
        <p>
          Practice algorithms together. Live pair coding, shared rooms, and
          collaborative problem solving for study groups and interviews.
        </p>
        <div className="mt-3 flex justify-center gap-4 text-xs">
          <span>© 2025 CollabDSA. All rights reserved.</span>
          <span>Privacy</span>
          <span>Terms</span>
        </div>
      </footer>
    </div>
  );
}
