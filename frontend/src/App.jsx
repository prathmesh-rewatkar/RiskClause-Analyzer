import React, { useState } from "react";
import axios from "axios";
import BarGraph from "./components/BarGraph";
import PieChart from "./components/PieChart";

const DEFAULT_ANALYSIS_RESULT = {
  low_risk: 0,
  medium_risk: 0,
  high_risk: 0,
  document_risk_score: 0,
  document_risk_level: "",
};

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(DEFAULT_ANALYSIS_RESULT);
  const [showVisualization, setShowVisualization] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // when file is selected
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) setSelectedFile(file);
  };

  // when user clicks Analyze
  const handleAnalyze = async () => {
    if (!selectedFile) {
      alert("Please select a file first!");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsLoading(true);

    try {
      const response = await axios.post("http://localhost:5000/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAnalysisData(response.data);
      setShowVisualization(true);
    } catch (error) {
      alert("Analysis failed, please try again");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCsv = () => {
    window.open("http://localhost:5000/download", "_blank");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #eef2ff, #e0f7fa)",
        padding: "32px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Header */}
      <header style={{ textAlign: "center", marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "32px",
            fontWeight: "bold",
            color: "#1e3a8a",
          }}
        >
          Legal Document Risk Analyzer
        </h1>
        <p style={{ color: "#475569", marginTop: "8px" }}>
          Upload your document to assess potential risks
        </p>
      </header>

      {/* Upload Section */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <input
          type="file"
          onChange={handleFileChange}
          style={{
            padding: "10px",
            border: "2px dashed #3b82f6",
            borderRadius: "8px",
            cursor: "pointer",
            backgroundColor: "#fff",
          }}
        />

        <button
          onClick={handleAnalyze}
          disabled={!selectedFile || isLoading}
          style={{
            padding: "10px 20px",
            backgroundColor: selectedFile ? "#2563eb" : "#9ca3af",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: selectedFile ? "pointer" : "not-allowed",
            fontWeight: "500",
            transition: "0.3s",
          }}
          onMouseOver={(e) =>
            selectedFile && (e.currentTarget.style.backgroundColor = "#1e40af")
          }
          onMouseOut={(e) =>
            selectedFile && (e.currentTarget.style.backgroundColor = "#2563eb")
          }
        >
          {isLoading ? "Analyzing..." : "Analyze"}
        </button>

        {showVisualization && (
          <div
            style={{
              width: "100%",
              maxWidth: "1100px",
              marginTop: "32px",
              display: "flex",
              flexDirection: "column",
              gap: "32px",
            }}
          >
            {/* Summary Card */}
            <div
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              <h2 style={{ fontSize: "22px", fontWeight: "600", marginBottom: "12px" }}>
                Document Risk Summary
              </h2>

              <p style={{ marginBottom: "6px" }}>
                Low Risk Clauses:{" "}
                <span style={{ fontWeight: "bold", color: "#16a34a" }}>
                  {analysisData.low_risk}
                </span>
              </p>
              <p style={{ marginBottom: "6px" }}>
                Medium Risk Clauses:{" "}
                <span style={{ fontWeight: "bold", color: "#ca8a04" }}>
                  {analysisData.medium_risk}
                </span>
              </p>
              <p style={{ marginBottom: "6px" }}>
                High Risk Clauses:{" "}
                <span style={{ fontWeight: "bold", color: "#dc2626" }}>
                  {analysisData.high_risk}
                </span>
              </p>
              <p style={{ marginBottom: "6px" }}>
                Risk Score:{" "}
                <span style={{ fontWeight: "bold", color: "#111827" }}>
                  {analysisData.document_risk_score.toFixed(2)}
                </span>
              </p>
              <p>
                Risk Level:{" "}
                <span
                  style={{
                    fontWeight: "bold",
                    color:
                      analysisData.document_risk_level === "High Risk"
                        ? "#dc2626"
                        : analysisData.document_risk_level === "Medium Risk"
                        ? "#ca8a04"
                        : "#16a34a",
                  }}
                >
                  {analysisData.document_risk_level}
                </span>
              </p>

              <button
                onClick={downloadCsv}
                style={{
                  marginTop: "16px",
                  padding: "10px 20px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "500",
                  transition: "0.3s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#1e40af")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "#2563eb")
                }
              >
                ⬇️ Download CSV
              </button>
            </div>

            {/* Graphs Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "24px",
              }}
            >
              <BarGraph data={analysisData} />
              <PieChart data={analysisData} />
            </div>
          </div>
        )}
      </div>

      {/* Responsive Style */}
      <style>
        {`
          @media (max-width: 768px) {
            div[style*="grid-template-columns: 1fr 1fr"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </div>
  );
}

export default App;
