import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface HistoryItem {
  _id: string;
  rawQuestion: string;
  subjectTag: string;
  textAnswer: string;
  createdAt: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { session } = useAuth();
  const token = session?.token;

  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API}/api/history/tags`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setTags(res.data))
      .catch((err) => console.error(err));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const url = selectedTag
      ? `${API}/api/history?subject=${selectedTag}`
      : `${API}/api/history`;

    axios
      .get(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setHistory(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [selectedTag, token]);

  const chartData = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    history.forEach((item) => {
      const tag = item.subjectTag || "general";
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
    return {
      labels: Object.keys(tagCounts),
      datasets: [
        {
          label: "Questions per Subject",
          data: Object.values(tagCounts),
          backgroundColor: [
            "#6366f1", "#22d3ee", "#f59e0b",
            "#10b981", "#ef4444", "#8b5cf6",
          ],
        },
      ],
    };
  }, [history]);

  return (
    <div className="max-w-3xl mx-auto px-2">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">My Question History</h1>

      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setSelectedTag("")}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
            selectedTag === ""
              ? "bg-gpai-primary text-white"
              : "bg-gray-100 dark:bg-gpai-surface-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-4 py-2 rounded-xl text-xs font-medium capitalize transition-colors ${
              selectedTag === tag
                ? "bg-gpai-primary text-white"
                : "bg-gray-100 dark:bg-gpai-surface-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {history.length > 0 && (
        <div className="mb-8 bg-white dark:bg-gpai-surface border border-gray-100 dark:border-gpai-border rounded-2xl p-4">
          <Bar data={chartData} options={{ responsive: true }} />
        </div>
      )}

      {loading && <p className="text-gray-500 dark:text-gpai-muted text-sm">Loading...</p>}
      {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
      {!loading && history.length === 0 && (
        <p className="text-gray-500 dark:text-gpai-muted text-sm">
          No questions found yet. Ask some questions first!
        </p>
      )}

      {history.map((item) => (
        <div
          key={item._id}
          className="bg-white dark:bg-gpai-surface border border-gray-100 dark:border-gpai-border rounded-2xl p-4 mb-3"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-gpai-primary-soft text-gpai-primary capitalize">
              {item.subjectTag || "general"}
            </span>
            <span className="text-xs text-gray-400 dark:text-gpai-muted">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{item.rawQuestion}</p>
          {item.textAnswer && (
            <p className="text-xs text-gray-500 dark:text-gpai-muted mt-1">
              {item.textAnswer.slice(0, 150)}...
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
