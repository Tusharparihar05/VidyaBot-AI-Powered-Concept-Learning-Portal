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

const API = "http://localhost:5000";

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

  // Fetch tags once on mount
  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API}/api/history/tags`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setTags(res.data))
      .catch((err) => console.error(err));
  }, [session]);

  // Fetch history when selectedTag changes
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
  }, [selectedTag, session]);

  // useMemo — only recomputes when history changes
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
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
        My Question History
      </h1>

      {/* Subject Filter Buttons */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
        <button
          onClick={() => setSelectedTag("")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            background: selectedTag === "" ? "#6366f1" : "#e5e7eb",
            color: selectedTag === "" ? "white" : "black",
            cursor: "pointer",
          }}
        >
          All
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: selectedTag === tag ? "#6366f1" : "#e5e7eb",
              color: selectedTag === tag ? "white" : "black",
              cursor: "pointer",
            }}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Chart */}
      {history.length > 0 && (
        <div style={{ marginBottom: "32px", background: "#f9fafb", padding: "16px", borderRadius: "12px" }}>
          <Bar data={chartData} options={{ responsive: true }} />
        </div>
      )}

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && history.length === 0 && (
        <p style={{ color: "#6b7280" }}>No questions found yet. Ask some questions first!</p>
      )}

      {/* History Cards */}
      {history.map((item) => (
        <div
          key={item._id}
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{
              background: "#ede9fe",
              color: "#6366f1",
              padding: "4px 10px",
              borderRadius: "999px",
              fontSize: "12px",
            }}>
              {item.subjectTag || "general"}
            </span>
            <span style={{ fontSize: "12px", color: "#9ca3af" }}>
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p style={{ fontWeight: "600", marginBottom: "4px" }}>
            {item.rawQuestion}
          </p>
          {item.textAnswer && (
            <p style={{ color: "#6b7280", fontSize: "14px" }}>
              {item.textAnswer.slice(0, 150)}...
            </p>
          )}
        </div>
      ))}
    </div>
  );
}