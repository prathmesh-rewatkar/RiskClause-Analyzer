from flask import Flask, request, jsonify, send_file
import pandas as pd
import numpy as np
import faiss
import re
import ast
import os
import fitz
import pytesseract
from PIL import Image
from pdf2image import convert_from_path
from sentence_transformers import SentenceTransformer
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"]) 

print("Loading SentenceTransformer model...")
model_dir = 'models/trained_legal_model'
assert os.path.exists(model_dir), "Model folder missing!"
model = SentenceTransformer(model_dir)
print("Model loaded.")

print("Reading clauses from CSV ...")
clauses_df = pd.read_csv('data/legal_clauses.csv')
def unwrap_clause(c):
    try:
        return ast.literal_eval(c)[0] if isinstance(c, str) and c.startswith("[") else c
    except:
        return c
clauses_df['Clause'] = clauses_df['Clause'].apply(unwrap_clause)
clauses = clauses_df['Clause'].tolist()
print(f"Loaded {len(clauses)} clauses.")

print("Embedding reference clauses ...")
clause_embeddings = model.encode(clauses, convert_to_tensor=False, batch_size=32)
clause_embeddings = np.array(clause_embeddings, dtype='float32')
faiss.normalize_L2(clause_embeddings)
print("Clause embeddings ready.")

def extract_text(file_path):
    print("...Extracting text from", file_path)
    if file_path.lower().endswith('.txt'):
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    elif file_path.lower().endswith('.pdf'):
        try:
            text = ""
            with fitz.open(file_path) as doc:
                for page in doc:
                    text += page.get_text()
            if len(text.strip()) < 50:
                return ocr_pdf_images(file_path)
            return text
        except Exception as e:
            print("...Exception in PyMuPDF, trying OCR fallback:", str(e))
            return ocr_pdf_images(file_path)
    elif file_path.lower().endswith(('.png', '.jpg', '.jpeg')):
        image = Image.open(file_path)
        return pytesseract.image_to_string(image)
    else:
        raise ValueError("Unsupported file type. Use .txt, .pdf, .png, .jpg, .jpeg.")

def ocr_pdf_images(pdf_path):
    print("...Doing OCR on scanned PDF images ...")
    images = convert_from_path(pdf_path)
    text = ""
    for img in images:
        text += pytesseract.image_to_string(img)
    return text

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        print("Received request")
        file = request.files['file']
        file_path = os.path.join("uploads", file.filename)
        os.makedirs("uploads", exist_ok=True)
        file.save(file_path)
        print(f"Saved file to {file_path}")

        test_text = extract_text(file_path)
        print(f"Extracted text length: {len(test_text)} chars")

        chunks = [s.strip() for s in re.split(r'[\n\r.!?]', test_text) if len(s.strip()) > 20]
        print(f"Number of text chunks: {len(chunks)}")

        if not chunks:
            print("No valid chunks found.")
            return jsonify({"error": "No valid content found in document"}), 400

        print("Encoding document chunks ...")
        chunk_embeddings = model.encode(chunks, convert_to_tensor=False, batch_size=32)
        chunk_embeddings = np.array(chunk_embeddings, dtype='float32')
        faiss.normalize_L2(chunk_embeddings)
        index = faiss.IndexFlatIP(chunk_embeddings.shape[1])
        index.add(chunk_embeddings)
        print("Document chunk embeddings completed.")

        print("Running FAISS similarity search ...")
        D, I = index.search(clause_embeddings, 3)
        print("Similarity search complete.")

        results = []
        for i, (distances, indices) in enumerate(zip(D, I)):
            clause = clauses[i]
            for idx, score in zip(indices, distances):
                if score > 0.75:
                    results.append({
                        "Clause": clause,
                        "matched_text": chunks[idx],
                        "similarity": float(score)
                    })
        results_df = pd.DataFrame(results)
        print(f"Number of matches above threshold: {len(results_df)}")

        def get_risk_label(score):
            if score <= 0.85:
                return "Low Risk"
            elif score <= 0.91:
                return "Medium Risk"
            else:
                return "High Risk"

        summary = {}
        if not results_df.empty:
            results_df["risk_level"] = results_df["similarity"].apply(get_risk_label)
            best_results = results_df.sort_values("similarity", ascending=False).drop_duplicates(subset=["matched_text"])
            risk_counts = best_results["risk_level"].value_counts().to_dict()
            low = risk_counts.get("Low Risk", 0)
            medium = risk_counts.get("Medium Risk", 0)
            high = risk_counts.get("High Risk", 0)
            weights = {"Low Risk": 0.5, "Medium Risk": 1.0, "High Risk": 1.0}
            weighted_sum = sum(row["similarity"] * weights[row["risk_level"]] for _, row in best_results.iterrows())
            total_weight = sum(weights[row["risk_level"]] for _, row in best_results.iterrows())
            avg_similarity = weighted_sum / total_weight if total_weight > 0 else 0.0
            doc_risk_level = get_risk_label(avg_similarity)

            best_results["document_risk_score"] = avg_similarity
            best_results["document_risk_level"] = doc_risk_level
            
            summary = {
                "low_risk": low,
                "medium_risk": medium,
                "high_risk": high,
                "document_risk_score": avg_similarity,
                "document_risk_level": doc_risk_level
            }
        else:
            print("No matches found above threshold.")
            summary = {
                "low_risk": 0,
                "medium_risk": 0,
                "high_risk": 0,
                "document_risk_score": 0.0,
                "document_risk_level": "Low Risk"
            }
        print("Returning JSON summary.")
        return jsonify(summary)
    except Exception as e:
        print("Exception occurred:", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting Flask on http://0.0.0.0:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
