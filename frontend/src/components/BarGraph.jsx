import React from "react";
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

export default function BarGraph({ data }) {
  const barData = {
    labels: ["Low Risk", "Medium Risk", "High Risk"],
    datasets: [
      {
        label: "Risk Count",
        data: [data.low_risk, data.medium_risk, data.high_risk],
        backgroundColor: ["#43e97b", "#fbc02d", "#ff4c7b"],
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: 2, //
    plugins: { legend: { position: "bottom" } },
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        height: "400px",
      }}
    >
      <h3
        style={{
          fontSize: "18px",
          fontWeight: "600",
          marginBottom: "12px",
          color: "#1f2937",
        }}
      >
        Risk Distribution (Bar)
      </h3>
      <div style={{ height: "100%", width: "100%" }}>
        <Bar data={barData} options={options} />
      </div>
    </div>
  );
}
