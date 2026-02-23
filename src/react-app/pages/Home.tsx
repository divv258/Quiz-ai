import { useState, useRef, useCallback } from "react";
import { Camera, Upload, Sparkles, ChevronLeft, ChevronRight, Layers, ListChecks } from "lucide-react";
import { Progress } from "@/react-app/components/ui/progress";

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

type AppState = "upload" | "loading" | "modeSelect" | "quiz" | "flashcards" | "results";

export default function HomePage() {
  const [state, setState] = useState<AppState>("upload");
  const [progress, setProgress] = useState(0);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    setState("loading");
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 500);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to generate quiz");
      }

      const data = await response.json();
      clearInterval(progressInterval);
      setProgress(100);

      setTimeout(() => {
        setQuestions(data.questions);
        setCurrentQuestion(0);
        setScore(0);
        setSelectedAnswer(null);
        setShowExplanation(false);
        setState("modeSelect");
      }, 300);
    } catch (error) {
      clearInterval(progressInterval);
      console.error(error);
      alert("Failed to generate quiz. Please try again.");
      setState("upload");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleAnswerSelect = (option: string) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(option);
    setShowExplanation(true);
    
    if (option === questions[currentQuestion].answer) {
      setScore((s) => s + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((c) => c + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setState("results");
    }
  };

  const handleReset = () => {
    setState("upload");
    setQuestions([]);
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setProgress(0);
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950/30 via-background to-purple-950/20 pointer-events-none" />
      
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-primary/20 backdrop-blur-sm">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              QuizSnap AI
            </h1>
          </div>
          <p className="text-muted-foreground max-w-md">
            Upload an image of your textbook or notes and get an instant quiz
          </p>
        </div>

        {/* Upload State */}
        {state === "upload" && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative w-full max-w-lg aspect-[4/3] rounded-2xl border-2 border-dashed
              transition-all duration-300 cursor-pointer group
              ${isDragging 
                ? "border-primary bg-primary/10 scale-[1.02]" 
                : "border-border hover:border-primary/50 hover:bg-card/50"
              }
            `}
          >
            {/* Glass morphism overlay */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm" />
            
            <div className="relative h-full flex flex-col items-center justify-center gap-4 p-8">
              <div className={`
                p-6 rounded-full bg-primary/20 backdrop-blur-md
                transition-transform duration-300
                ${isDragging ? "scale-110" : "group-hover:scale-105"}
              `}>
                <Camera className="w-12 h-12 text-primary" />
              </div>
              
              <div className="text-center">
                <p className="text-lg font-medium mb-1">
                  {isDragging ? "Drop your image here" : "Drag & drop your image"}
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to browse
                </p>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 backdrop-blur-sm">
                <Upload className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium">
                  Supports JPG, PNG, WebP
                </span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Loading State */}
        {state === "loading" && (
          <div className="w-full max-w-lg">
            <div className="p-8 rounded-2xl bg-card/50 backdrop-blur-md border border-border">
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="p-6 rounded-full bg-primary/20 animate-pulse">
                    <Sparkles className="w-12 h-12 text-primary animate-spin" style={{ animationDuration: "3s" }} />
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-lg font-medium mb-2">Generating your quiz...</p>
                  <p className="text-sm text-muted-foreground">
                    AI is analyzing your image
                  </p>
                </div>

                <div className="w-full">
                  <Progress value={progress} className="h-2" />
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    {Math.round(progress)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mode Select State */}
        {state === "modeSelect" && (
          <ModeSelectCard
            onSelectQuiz={() => setState("quiz")}
            onSelectFlashcards={() => {
              setCurrentQuestion(0);
              setState("flashcards");
            }}
          />
        )}

        {/* Quiz State */}
        {state === "quiz" && questions.length > 0 && (
          <QuizCard
            question={questions[currentQuestion]}
            questionNumber={currentQuestion + 1}
            totalQuestions={questions.length}
            selectedAnswer={selectedAnswer}
            showExplanation={showExplanation}
            onAnswerSelect={handleAnswerSelect}
            onNext={handleNextQuestion}
            isLast={currentQuestion === questions.length - 1}
          />
        )}

        {/* Flashcards State */}
        {state === "flashcards" && questions.length > 0 && (
          <FlashcardDeck
            questions={questions}
            currentIndex={currentQuestion}
            onPrevious={() => setCurrentQuestion((c) => Math.max(0, c - 1))}
            onNext={() => setCurrentQuestion((c) => Math.min(questions.length - 1, c + 1))}
            onBack={() => setState("modeSelect")}
            onReset={handleReset}
          />
        )}

        {/* Results State */}
        {state === "results" && (
          <ResultsCard
            score={score}
            total={questions.length}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}

interface QuizCardProps {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  showExplanation: boolean;
  onAnswerSelect: (option: string) => void;
  onNext: () => void;
  isLast: boolean;
}

function QuizCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  showExplanation,
  onAnswerSelect,
  onNext,
  isLast,
}: QuizCardProps) {
  return (
    <div className="w-full max-w-2xl">
      <div className="p-8 rounded-2xl bg-card/50 backdrop-blur-md border border-border">
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm text-muted-foreground">
            Question {questionNumber} of {totalQuestions}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < questionNumber ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Question */}
        <h2 className="text-xl font-semibold mb-6">{question.question}</h2>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = option === question.answer;
            const showResult = selectedAnswer !== null;

            let buttonStyle = "border-border hover:border-primary/50 hover:bg-primary/5";
            if (showResult) {
              if (isCorrect) {
                buttonStyle = "border-green-500 bg-green-500/20";
              } else if (isSelected && !isCorrect) {
                buttonStyle = "border-red-500 bg-red-500/20";
              } else {
                buttonStyle = "border-border opacity-50";
              }
            }

            return (
              <button
                key={index}
                onClick={() => onAnswerSelect(option)}
                disabled={selectedAnswer !== null}
                className={`
                  w-full p-4 rounded-xl border-2 text-left transition-all
                  backdrop-blur-sm ${buttonStyle}
                  disabled:cursor-default
                `}
              >
                <span className="font-medium">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className="p-4 rounded-xl bg-muted/50 border border-border mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Explanation: </span>
              {question.explanation}
            </p>
          </div>
        )}

        {/* Next button */}
        {selectedAnswer !== null && (
          <button
            onClick={onNext}
            className="w-full py-3 px-6 rounded-xl bg-primary text-primary-foreground font-medium
              hover:bg-primary/90 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            {isLast ? "See Results" : "Next Question"}
          </button>
        )}
      </div>
    </div>
  );
}

interface ResultsCardProps {
  score: number;
  total: number;
  onReset: () => void;
}

function ModeSelectCard({
  onSelectQuiz,
  onSelectFlashcards,
}: {
  onSelectQuiz: () => void;
  onSelectFlashcards: () => void;
}) {
  return (
    <div className="w-full max-w-md">
      <div className="p-8 rounded-2xl bg-card/50 backdrop-blur-md border border-border text-center">
        <div className="text-4xl mb-4">🎯</div>
        <h2 className="text-2xl font-bold mb-2">Content Ready!</h2>
        <p className="text-muted-foreground mb-8">Choose how you want to study</p>
        
        <div className="space-y-4">
          <button
            onClick={onSelectQuiz}
            className="w-full p-4 rounded-xl border-2 border-border hover:border-primary/50 
              hover:bg-primary/5 transition-all flex items-center gap-4 text-left group"
          >
            <div className="p-3 rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-colors">
              <ListChecks className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Quiz Mode</p>
              <p className="text-sm text-muted-foreground">Test your knowledge with MCQs</p>
            </div>
          </button>
          
          <button
            onClick={onSelectFlashcards}
            className="w-full p-4 rounded-xl border-2 border-border hover:border-primary/50 
              hover:bg-primary/5 transition-all flex items-center gap-4 text-left group"
          >
            <div className="p-3 rounded-xl bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
              <Layers className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="font-semibold">Flashcard Mode</p>
              <p className="text-sm text-muted-foreground">Flip cards to review Q&A</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

interface FlashcardDeckProps {
  questions: QuizQuestion[];
  currentIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onBack: () => void;
  onReset: () => void;
}

function FlashcardDeck({
  questions,
  currentIndex,
  onPrevious,
  onNext,
  onBack,
  onReset,
}: FlashcardDeckProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const question = questions[currentIndex];

  const handleFlip = () => setIsFlipped(!isFlipped);
  
  const handlePrevious = () => {
    setIsFlipped(false);
    onPrevious();
  };
  
  const handleNext = () => {
    setIsFlipped(false);
    onNext();
  };

  return (
    <div className="w-full max-w-lg">
      {/* Back button */}
      <button
        onClick={onBack}
        className="mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to mode selection
      </button>

      {/* Card counter */}
      <div className="text-center mb-4">
        <span className="text-sm text-muted-foreground">
          Card {currentIndex + 1} of {questions.length}
        </span>
      </div>

      {/* Flashcard with 3D flip */}
      <div 
        className="relative w-full aspect-[4/3] cursor-pointer perspective-1000"
        onClick={handleFlip}
        style={{ perspective: "1000px" }}
      >
        <div
          className="relative w-full h-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front - Question */}
          <div
            className="absolute inset-0 rounded-2xl bg-white shadow-xl p-8 flex flex-col items-center justify-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            <span className="text-xs font-medium text-indigo-500 uppercase tracking-wider mb-4">
              Question
            </span>
            <p className="text-gray-800 text-lg font-medium text-center leading-relaxed">
              {question.question}
            </p>
            <span className="absolute bottom-4 text-xs text-gray-400">
              Tap to flip
            </span>
          </div>

          {/* Back - Answer */}
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl p-8 flex flex-col items-center justify-center"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <span className="text-xs font-medium text-white/80 uppercase tracking-wider mb-4">
              Answer
            </span>
            <p className="text-white text-lg font-semibold text-center leading-relaxed">
              {question.answer}
            </p>
            {question.explanation && (
              <p className="text-white/80 text-sm text-center mt-4 leading-relaxed">
                {question.explanation}
              </p>
            )}
            <span className="absolute bottom-4 text-xs text-white/50">
              Tap to flip back
            </span>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-card/80 border border-border
            hover:bg-card hover:border-primary/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium">Previous</span>
        </button>
        
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === questions.length - 1}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-card/80 border border-border
            hover:bg-card hover:border-primary/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="font-medium">Next</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Back to Home button - shown on last card */}
      {currentIndex === questions.length - 1 && (
        <button
          onClick={onReset}
          className="w-full mt-6 py-3 px-6 rounded-xl bg-primary text-primary-foreground font-medium
            hover:bg-primary/90 transition-colors flex items-center justify-center gap-2
            animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <Camera className="w-5 h-5" />
          Back to Home
        </button>
      )}
    </div>
  );
}

function ResultsCard({ score, total, onReset }: ResultsCardProps) {
  const percentage = Math.round((score / total) * 100);
  
  let message = "Keep practicing!";
  let emoji = "📚";
  if (percentage >= 80) {
    message = "Excellent work!";
    emoji = "🎉";
  } else if (percentage >= 60) {
    message = "Good job!";
    emoji = "👍";
  } else if (percentage >= 40) {
    message = "Nice effort!";
    emoji = "💪";
  }

  return (
    <div className="w-full max-w-md">
      <div className="p-8 rounded-2xl bg-card/50 backdrop-blur-md border border-border text-center">
        <div className="text-6xl mb-4">{emoji}</div>
        
        <h2 className="text-2xl font-bold mb-2">{message}</h2>
        
        <div className="mb-6">
          <div className="text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {score}/{total}
          </div>
          <p className="text-muted-foreground mt-1">{percentage}% correct</p>
        </div>

        <button
          onClick={onReset}
          className="w-full py-3 px-6 rounded-xl bg-primary text-primary-foreground font-medium
            hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Camera className="w-5 h-5" />
          Try Another Image
        </button>
      </div>
    </div>
  );
}
