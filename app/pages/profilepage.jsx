import { useState } from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
export default function Profile() {
  const [editField, setEditField] = useState(null);
  const dispatch = useDispatch();
  const name = useSelector((state) => state.userInfo.name);
  const email = useSelector((state) => state.userInfo.email);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col items-center py-12 px-4">
      <h1 className="text-3xl font-bold text-indigo-700 mb-8">
        Profile Details
      </h1>

      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-indigo-100 text-indigo-700 font-bold text-3xl rounded-full flex items-center justify-center shadow-lg mb-4">
            JD
          </div>
          <p className="text-xl font-semibold">{name}</p>
          <p className="text-gray-500">{email}</p>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <p className="text-gray-600 text-sm">Name</p>
              {editField === "name" ? (
                <input
                  type="text"
                  placeholder="Enter new name"
                  className="border rounded-lg px-3 py-2 w-64 focus:outline-indigo-600 mt-1"
                />
              ) : (
                <p className="font-semibold">{name}</p>
              )}
            </div>
            {editField === "name" ? (
              <div className="flex gap-2">
                <button className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700">
                  Save
                </button>
                <button
                  onClick={() => setEditField(null)}
                  className="text-gray-500 hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditField("name")}
                className="text-indigo-600 hover:underline"
              >
                Edit
              </button>
            )}
          </div>

          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <p className="text-gray-600 text-sm">Email</p>
              {editField === "email" ? (
                <input
                  type="email"
                  placeholder="Enter new email"
                  className="border rounded-lg px-3 py-2 w-64 focus:outline-indigo-600 mt-1"
                />
              ) : (
                <p className="font-semibold">{email}</p>
              )}
            </div>
            {editField === "email" ? (
              <div className="flex gap-2">
                <button className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700">
                  Save
                </button>
                <button
                  onClick={() => setEditField(null)}
                  className="text-gray-500 hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditField("email")}
                className="text-indigo-600 hover:underline"
              >
                Edit
              </button>
            )}
          </div>

          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <p className="text-gray-600 text-sm">Password</p>
              {editField === "password" ? (
                <div className="space-y-2">
                  <input
                    type="password"
                    placeholder="Current Password"
                    className="border rounded-lg px-3 py-2 w-64 focus:outline-indigo-600"
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    className="border rounded-lg px-3 py-2 w-64 focus:outline-indigo-600"
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    className="border rounded-lg px-3 py-2 w-64 focus:outline-indigo-600"
                  />
                </div>
              ) : (
                <p className="font-semibold">••••••••</p>
              )}
            </div>
            {editField === "password" ? (
              <div className="flex flex-col gap-2 mt-2">
                <button className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700">
                  Save
                </button>
                <button
                  onClick={() => setEditField(null)}
                  className="text-gray-500 hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditField("password")}
                className="text-indigo-600 hover:underline"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
