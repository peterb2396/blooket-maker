import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  Download,
  Trash2,
  Edit2,
  X,
  FileText,
  Check,
  Clock,
} from "lucide-react";

const STORAGE_KEY = "blooket_question_sets";

function Generator() {
  const [question, setQuestion] = useState("");
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [a3, setA3] = useState("");
  const [a4, setA4] = useState("");
  const [correctToggles, setCorrectToggles] = useState([true, false, false, false]);
  const [timeLimit, setTimeLimit] = useState(20);
  const [questionSets, setQuestionSets] = useState([]);
  const [activeSetId, setActiveSetId] = useState("");
  const [editingIndex, setEditingIndex] = useState(-1);
  const [showNameModal, setShowNameModal] = useState(false);
  const [setName, setSetName] = useState("");
  const [renamingSetId, setRenamingSetId] = useState(null);
  const [filteredQuestions, setFilteredQuestions] = useState([]);

  const questionInputRef = useRef(null);
  const answer1Ref = useRef(null);
  const answer2Ref = useRef(null);
  const answer3Ref = useRef(null);
  const answer4Ref = useRef(null);

  // Load question sets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuestionSets(parsed);
          setActiveSetId(parsed[0].id);
          return;
        }
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
    }
    
    // Create default set if nothing in storage
    const newSet = {
      id: Date.now().toString(),
      name: "Question Set 1",
      questions: [],
      createdAt: new Date().toISOString(),
    };
    setQuestionSets([newSet]);
    setActiveSetId(newSet.id);
  }, []);

  // Save to localStorage whenever questionSets changes
  useEffect(() => {
    if (questionSets.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(questionSets));
      } catch (error) {
        console.error("Error saving to localStorage:", error);
      }
    }
  }, [questionSets]);

  const activeSet = questionSets.find((s) => s.id === activeSetId) || null;
  const questions = activeSet?.questions || [];

  useEffect(() => {
    const q = question.trim();
    if (q) {
      const filtered = (questions || []).filter((it) => it.q.toLowerCase().includes(q.toLowerCase()));
      setFilteredQuestions(filtered);
    } else {
      setFilteredQuestions([]);
    }
  }, [question, questions]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveQuestion();
    }
  };

  const buildCorrectFromToggles = (toggles, choices) => {
    const res = [];
    if ((choices[0] || "").trim()) res.push(1);
    for (let i = 1; i < 4; i++) {
      if (toggles[i] && (choices[i] || "").trim()) res.push(i + 1);
    }
    return Array.from(new Set(res.map(Number))).filter((n) => [1, 2, 3, 4].includes(n)).sort((a,b)=>a-b);
  };

  const saveQuestion = () => {
    if (!question.trim()) return;
    if (!a1.trim()) return;
    if (!a2.trim()) return;

    const choices = [a1.trim(), a2.trim(), a3.trim(), a4.trim()];
    const correct = buildCorrectFromToggles(correctToggles, choices);

    const newQuestion = {
      q: question.trim(),
      a1: choices[0],
      a2: choices[1],
      a3: choices[2] || "",
      a4: choices[3] || "",
      correct,
      timeLimit: Math.max(1, Math.min(60, Number(timeLimit) || 20)),
    };

    setQuestionSets((prev) =>
      prev.map((set) => {
        if (set.id !== activeSetId) return set;
        const copy = { ...set };
        if (editingIndex >= 0 && editingIndex < copy.questions.length) {
          const updated = [...copy.questions];
          updated[editingIndex] = newQuestion;
          copy.questions = updated;
        } else {
          copy.questions = [...copy.questions, newQuestion];
        }
        return copy;
      })
    );

    setQuestion("");
    setA1("");
    setA2("");
    setA3("");
    setA4("");
    setCorrectToggles([true, false, false, false]);
    setTimeLimit(20);
    setEditingIndex(-1);
    setFilteredQuestions([]);
    
    // Return focus to question input
    setTimeout(() => questionInputRef.current?.focus(), 0);
  };

  const editQuestion = (index) => {
    const q = questions[index];
    if (!q) return;
    setQuestion(q.q || "");
    setA1(q.a1 || "");
    setA2(q.a2 || "");
    setA3(q.a3 || "");
    setA4(q.a4 || "");
    setTimeLimit(q.timeLimit || 20);

    const correctArr = Array.isArray(q.correct) ? q.correct.map(Number) : [Number(q.correct)].filter(Boolean);
    const toggles = [true, false, false, false];
    if (correctArr.includes(2)) toggles[1] = true;
    if (correctArr.includes(3)) toggles[2] = true;
    if (correctArr.includes(4)) toggles[3] = true;
    toggles[0] = true;
    setCorrectToggles(toggles);

    setEditingIndex(index);
    setTimeout(() => answer1Ref.current?.focus?.(), 0);
  };

  const deleteQuestion = (index) => {
    const q = questions[index];
    if (!q) return;
    if (!window.confirm(`Delete question #${index + 1}?\n\n"${q.q}"\n\nThis cannot be undone.`)) return;

    setQuestionSets((prev) =>
      prev.map((set) => {
        if (set.id !== activeSetId) return set;
        return { ...set, questions: set.questions.filter((_, i) => i !== index) };
      })
    );

    if (editingIndex === index) {
      setEditingIndex(-1);
      setQuestion("");
      setA1("");
      setA2("");
      setA3("");
      setA4("");
      setCorrectToggles([true, false, false, false]);
      setTimeLimit(20);
    }
  };

  const exportToCSV = () => {
    if (!questions || questions.length === 0) return;

    let csvContent = '"Blooket\n';
    csvContent += 'Import Template",,,,,,,\n';
    csvContent += "Question #,Question Text,Answer 1,Answer 2,\"Answer 3\n";
    csvContent += "(Optional)\",\"Answer 4\n";
    csvContent += "(Optional)\",\"Time Limit (sec)\n";
    csvContent += "(Max: 300 seconds)\",\"Correct Answer(s)\n";
    csvContent += "(Only include Answer #)\"\n";

    const escapeField = (s) => `"${(s || "").toString().replace(/"/g, '""')}"`;

    questions.forEach((q, index) => {
      const c1 = q.a1 || "";
      const c2 = q.a2 || "";
      const c3 = q.a3 || "";
      const c4 = q.a4 || "";
      const time = q.timeLimit || 20;
      const correctArr = Array.isArray(q.correct) ? q.correct.map(Number).filter(Boolean) : [Number(q.correct)].filter(Boolean);
      const correctNormalized = correctArr.length ? correctArr : [1];

      let correctField;
      if (correctNormalized.length === 1) {
        correctField = String(correctNormalized[0]);
      } else {
        correctField = `"${correctNormalized.join(",")}"`;
      }

      const row =
        String(index + 1) + "," +
        escapeField(q.q) + "," +
        escapeField(c1) + "," +
        escapeField(c2) + "," +
        escapeField(c3) + "," +
        escapeField(c4) + "," +
        String(time) + "," +
        correctField + "\n";

      csvContent += row;
    });

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeSet?.name || "questions"}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const createNewSet = () => setShowNameModal(true);
  const confirmNewSet = () => {
    if (!setName.trim()) return;
    const newSet = {
      id: Date.now().toString(),
      name: setName.trim(),
      questions: [],
      createdAt: new Date().toISOString(),
    };
    setQuestionSets((prev) => [...prev, newSet]);
    setActiveSetId(newSet.id);
    setSetName("");
    setShowNameModal(false);
  };

  const deleteSet = (setId) => {
    const setToDelete = questionSets.find((s) => s.id === setId);
    if (!setToDelete) return;
    if (questionSets.length <= 1) {
      alert("You must have at least one set.");
      return;
    }
    if (!window.confirm(`Delete set "${setToDelete.name}"? This will remove all its questions.`)) return;
    const newSets = questionSets.filter((s) => s.id !== setId);
    setQuestionSets(newSets);
    if (activeSetId === setId) {
      setActiveSetId(newSets[0].id);
    }
  };

  const renameSet = (setId, newName) => {
    setQuestionSets((prev) => prev.map((s) => (s.id === setId ? { ...s, name: newName } : s)));
  };

  const toggleCorrect = (index) => {
    setCorrectToggles((prev) => {
      const copy = [...prev];
      copy[index] = !copy[index];
      copy[0] = true;
      return copy;
    });
  };

  const handleRenameKey = (e) => {
    if (e.key === "Enter") {
      setRenamingSetId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">Blooket Question Generator</h1>
          <p className="text-blue-200 text-lg">Easier set creation, by Peter Buonaiuto</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-t-2xl p-4 border border-white/20">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {questionSets.map((set) => (
              <div key={set.id} className="flex items-center group">
                {renamingSetId === set.id ? (
                  <input
                    autoFocus
                    value={set.name}
                    onChange={(e) => renameSet(set.id, e.target.value)}
                    onBlur={() => setRenamingSetId(null)}
                    onKeyDown={handleRenameKey}
                    className="px-3 py-2 rounded-lg text-black"
                  />
                ) : (
                  <button
                    onClick={() => setActiveSetId(set.id)}
                    className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                      activeSetId === set.id
                        ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg"
                        : "bg-white/20 text-white hover:bg-white/30"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    {set.name}
                    <span className="text-xs opacity-75">({set.questions.length})</span>
                  </button>
                )}

                <button
                  onClick={() => setRenamingSetId(set.id)}
                  className="ml-1 p-1 rounded text-yellow-300 hover:bg-yellow-500/20"
                  title="Rename set"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {questionSets.length > 1 && (
                  <button
                    onClick={() => deleteSet(set.id)}
                    className="ml-1 p-1 rounded text-red-300 hover:bg-red-500/20"
                    title="Delete set"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={createNewSet}
              className="px-4 py-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-all flex items-center gap-2 border-2 border-dashed border-green-400/50"
            >
              <Plus className="w-4 h-4" />
              New Set
            </button>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-b-2xl rounded-tr-2xl shadow-2xl overflow-hidden mt-4">
          <div className="bg-gray-50 border-b border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  {editingIndex >= 0 ? <Edit2 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                  {editingIndex >= 0 ? "Edit Question" : "Add New Question"}
                </h2>
                <p className="text-gray-600 text-sm mt-1">Max 4 choices • First choice is always correct • Enter to save</p>
              </div>

              {questions.length > 0 && (
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 font-semibold shadow-lg"
                >
                  <Download className="w-5 h-5" />
                  Export CSV
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input
                  ref={questionInputRef}
                  type="text"
                  className="w-full px-4 py-3 rounded-xl bg-white text-gray-800 placeholder-gray-400 border-2 border-gray-300 focus:border-blue-500 transition-all outline-none text-lg shadow-sm"
                  placeholder="Enter your question..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Search className="absolute right-4 top-3.5 w-5 h-5 text-gray-400" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="relative">
                  <input
                    ref={answer1Ref}
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-green-50 text-gray-800 placeholder-green-600 border-2 border-green-400 focus:border-green-500 focus:bg-green-100 transition-all outline-none shadow-sm"
                    placeholder="Correct Answer"
                    value={a1}
                    onChange={(e) => setA1(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <div className="absolute right-4 top-3.5 flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-xs text-gray-600">Correct</span>
                  </div>
                </div>

                <div className="relative">
                  <input
                    ref={answer2Ref}
                    type="text"
                    className={`w-full px-4 py-3 rounded-xl text-gray-800 border-2 transition-all outline-none shadow-sm pr-20 ${
                      correctToggles[1]
                        ? "bg-green-50 placeholder-green-600 border-green-400 focus:border-green-500 focus:bg-green-100"
                        : "bg-red-50 placeholder-red-600 border-red-400 focus:border-red-500 focus:bg-red-100"
                    }`}
                    placeholder="Choice 2"
                    value={a2}
                    onChange={(e) => setA2(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    type="button"
                    onClick={() => toggleCorrect(1)}
                    className="absolute right-4 top-3.5 flex items-center gap-1 text-sm hover:opacity-70 transition-opacity"
                    title="Toggle correct/incorrect"
                    tabIndex={-1}
                  >
                    {correctToggles[1] ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-xs">{correctToggles[1] ? "Correct" : "Incorrect"}</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    ref={answer3Ref}
                    type="text"
                    className={`w-full px-4 py-3 rounded-xl text-gray-800 border-2 transition-all outline-none shadow-sm pr-20 ${
                      correctToggles[2]
                        ? "bg-green-50 placeholder-green-600 border-green-400 focus:border-green-500 focus:bg-green-100"
                        : "bg-red-50 placeholder-red-600 border-red-400 focus:border-red-500 focus:bg-red-100"
                    }`}
                    placeholder="Choice 3"
                    value={a3}
                    onChange={(e) => setA3(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    type="button"
                    onClick={() => toggleCorrect(2)}
                    className="absolute right-4 top-3.5 flex items-center gap-1 text-sm hover:opacity-70 transition-opacity"
                    title="Toggle correct/incorrect"
                    tabIndex={-1}
                  >
                    {correctToggles[2] ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-xs">{correctToggles[2] ? "Correct" : "Incorrect"}</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    ref={answer4Ref}
                    type="text"
                    className={`w-full px-4 py-3 rounded-xl text-gray-800 border-2 transition-all outline-none shadow-sm pr-20 ${
                      correctToggles[3]
                        ? "bg-green-50 placeholder-green-600 border-green-400 focus:border-green-500 focus:bg-green-100"
                        : "bg-red-50 placeholder-red-600 border-red-400 focus:border-red-500 focus:bg-red-100"
                    }`}
                    placeholder="Choice 4"
                    value={a4}
                    onChange={(e) => setA4(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    type="button"
                    onClick={() => toggleCorrect(3)}
                    className="absolute right-4 top-3.5 flex items-center gap-1 text-sm hover:opacity-70 transition-opacity"
                    title="Toggle correct/incorrect"
                    tabIndex={-1}
                  >
                    {correctToggles[3] ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-xs">{correctToggles[3] ? "Correct" : "Incorrect"}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-600" />
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Math.max(1, Math.min(60, Number(e.target.value) || 20)))}
                  className="px-3 py-2 border rounded-lg w-24"
                />
                <span className="text-gray-600">seconds</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveQuestion}
                  disabled={!question.trim() || !a1.trim() || !a2.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-xl hover:from-green-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-lg shadow-lg"
                >
                  {editingIndex >= 0 ? "Update Question" : "Save Question"}
                </button>

                {editingIndex >= 0 && (
                  <button
                    onClick={() => {
                      setEditingIndex(-1);
                      setQuestion("");
                      setA1("");
                      setA2("");
                      setA3("");
                      setA4("");
                      setCorrectToggles([true, false, false, false]);
                      setTimeLimit(20);
                    }}
                    className="py-3 px-4 bg-gray-200 rounded-xl hover:bg-gray-300 font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {filteredQuestions.length > 0 && (
            <div className="p-4 bg-yellow-50 border-b border-yellow-200">
              <p className="text-sm text-yellow-800 mb-2 font-semibold">Similar existing questions:</p>
              <div className="space-y-2">
                {filteredQuestions.map((q, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-lg border border-yellow-300 shadow-sm">
                    <p className="font-medium text-gray-800">{q.q}</p>
                    <p className="text-sm text-green-600 mt-1">✓ {q.a1}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                {activeSet?.name || "Questions"}
                <span className="text-sm text-gray-500 font-normal">({questions.length} total)</span>
              </h3>
              {questions.length > 0 && (
                <div className="text-sm text-gray-600">Time limit & correct indicator shown below</div>
              )}
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No questions yet. Start adding some above!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {questions.map((q, idx) => {
                  const correctArr = Array.isArray(q.correct) ? q.correct.map(Number) : [Number(q.correct)].filter(Boolean);
                  const normalizedCorrect = correctArr.length ? correctArr : [1];
                  return (
                    <div
                      key={idx}
                      className="group bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200 hover:shadow-lg transition-all flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2 py-1 bg-purple-600 text-white text-sm rounded-full font-bold">
                            {idx + 1}
                          </span>
                          <p className="font-semibold text-gray-800 text-lg">{q.q}</p>
                          <span className="ml-3 text-sm text-gray-600 flex items-center gap-1">
                            <Clock className="w-4 h-4" /> {q.timeLimit || 20}s
                          </span>
                        </div>

                        <div className="ml-8 space-y-1">
                          {[q.a1, q.a2, q.a3, q.a4].map((choiceText, i) => {
                            if (!choiceText) return null;
                            const isCorrect = normalizedCorrect.includes(i + 1);
                            const colorClass = isCorrect ? "text-green-600" : "text-red-600";
                            return (
                              <p key={i} className={`${colorClass} flex items-center gap-2`}>
                                {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                {choiceText}
                              </p>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => editQuestion(idx)}
                          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          title="Edit question"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteQuestion(idx)}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          title="Delete question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showNameModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Create New Question Set</h3>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 outline-none transition-colors"
              placeholder="Enter set name..."
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmNewSet()}
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={confirmNewSet}
                disabled={!setName.trim()}
                className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowNameModal(false);
                  setSetName("");
                }}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Generator;