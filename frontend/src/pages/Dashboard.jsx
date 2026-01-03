import { useState, useEffect } from "react";
import { api } from "../api";
import { motion } from "framer-motion";

export default function Dashboard() {
    const [files, setFiles] = useState([]);
    const [jd, setJd] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const roleTemplates = {
        MERN: `Looking for a MERN Stack Developer with experience in
React, Node.js, Express, MongoDB, REST APIs, JWT, JavaScript.`,

        JAVA: `Looking for a Java Developer with experience in
Java, Spring Boot, Hibernate, REST APIs, MySQL, Microservices.`,

        PYTHON: `Looking for a Python Developer with experience in
Python, Django or Flask, REST APIs, SQL, and backend development.`,

        AIML: `Looking for an AI / ML Engineer with experience in
Machine Learning, Deep Learning, Python, TensorFlow, PyTorch, NLP.`,

        DATASCIENCE: `Looking for a Data Scientist with experience in
Python, Pandas, NumPy, Data Analysis, Machine Learning, Statistics.`,

        DATAANALYST: `Looking for a Data Analyst with experience in
SQL, Python, Pandas, Data Visualization, Excel, Power BI.`,

        ANDROID: `Looking for an Android Developer with experience in
Android Studio, Kotlin, Java, Firebase, REST APIs.`
    };


    const fetchResults = async () => {
        try {
            const res = await api.get("/resumes/results");
            setResults(res.data);
        } catch (err) {
            console.error("Failed to fetch results", err);
        }
    };

    const uploadResume = async () => {
        if (!files || files.length === 0 || !jd.trim()) {
            alert("Please upload resumes and job description");
            return;
        }

        try {
            setLoading(true);

            const formData = new FormData();

            // ✅ MUST MATCH BACKEND: upload.array("resumes")
            for (let i = 0; i < files.length; i++) {
                formData.append("resumes", files[i]);
            }

            formData.append("jobDescription", jd);

            await api.post("/resumes/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            await fetchResults();
        } catch (err) {
            console.error("Upload failed", err);
            alert("Resume analysis failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResults();
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 flex justify-center items-center">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white w-full max-w-3xl rounded-2xl shadow-xl p-8"
            >
                <h1 className="text-3xl font-bold text-center mb-6">
                    AI Resume Shortlisting System
                </h1>

                {/* Role Selector */}
                <label className="block text-sm font-semibold mb-2">
                    Select Job Role
                </label>

                <select
                    onChange={(e) => setJd(roleTemplates[e.target.value] || "")}
                    className="w-full mb-4 p-3 border rounded-lg"
                >
                    <option value="">-- Select Job Role --</option>

                    <option value="MERN">MERN Stack Developer</option>
                    <option value="JAVA">Java Developer</option>
                    <option value="PYTHON">Python Developer</option>
                    <option value="AIML">AI / ML Engineer</option>
                    <option value="DATASCIENCE">Data Scientist</option>
                    <option value="DATAANALYST">Data Analyst</option>
                    <option value="ANDROID">Android Developer</option>
                </select>

                {/* Job Description */}
                <label className="block text-sm font-semibold mb-2">
                    Job Description
                </label>
                <textarea
                    className="w-full border rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    value={jd}
                    onChange={(e) => setJd(e.target.value)}
                />

                {/* Multiple Resume Upload */}
                <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={(e) => setFiles(e.target.files)}
                    className="mb-4"
                />

                <button
                    onClick={uploadResume}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                    {loading ? "Analyzing Resume..." : "Analyze Resume"}
                </button>

                <h2 className="text-xl font-semibold mt-8 mb-4">
                    Ranked Candidates
                </h2>

                {results.length === 0 && (
                    <p className="text-gray-500">No resumes analyzed yet.</p>
                )}

                <div className="space-y-4">
                    {results.map((r, i) => (
                        <div
                            key={r._id}
                            className="border rounded-xl p-4 bg-white shadow"
                        >
                            <h3 className="font-semibold">
                                {i + 1}. {r.filename}
                            </h3>

                            <p className="font-bold text-blue-600">
                                Score: {r.score}%
                            </p>

                            {r.score === 0 && (
                                <p className="text-sm text-red-500 mt-1">
                                    ❌ Not suitable for selected role
                                </p>
                            )}


                            {/* Matched Skills */}
                            <div className="mt-2">
                                <p className="text-sm font-semibold text-green-600">
                                    Matched Skills
                                </p>
                                {r.matchedSkills?.length > 0 ? (
                                    r.matchedSkills.map((s, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-block bg-green-100 text-green-700 px-2 py-1 rounded m-1"
                                        >
                                            {s}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-xs text-gray-400">
                                        No matched skills
                                    </p>
                                )}
                            </div>

                            {/* Missing Skills */}
                            <div className="mt-2">
                                <p className="text-sm font-semibold text-red-600">
                                    Missing Skills
                                </p>
                                {r.missingSkills?.length > 0 ? (
                                    r.missingSkills.map((s, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-block bg-red-100 text-red-700 px-2 py-1 rounded m-1"
                                        >
                                            {s}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-xs text-gray-400">
                                        No missing skills
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
