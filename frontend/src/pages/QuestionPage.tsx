import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { questionsAPI, answersAPI } from '../services/api';
import { useSessionStore, Question, Answer } from '../stores/sessionStore';
import Navigation from '../components/Navigation';
import { useAuthStore } from '../stores/authStore';
import { Volume2, Send, Loader } from 'lucide-react';
import styles from './QuestionPage.module.css';

const QuestionPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { questions, setQuestions, addAnswer } = useSessionStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [windowBlurCount, setWindowBlurCount] = useState(0);
  const [pasteCount, setPasteCount] = useState(0);
  const [keystrokes, setKeystrokes] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const recognitionRef = React.useRef<any>(null);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  const answerWords = userAnswer.trim().split(/\s+/).filter(Boolean);
  const minWords = 8;
  const minChars = 40;
  const answerTooShort = charCount > 0 && (wordCount < minWords || charCount < minChars);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        if (!sessionId) return;

        setIsLoading(true);

        // Try to get existing questions or generate new ones
        const response = await questionsAPI.getBySession(parseInt(sessionId));

        if (response.data.length === 0) {
          // Generate questions if none exist
          const genResponse = await questionsAPI.generate(
            parseInt(sessionId),
            5
          );
          setQuestions(genResponse.data);
        } else {
          setQuestions(response.data);
        }
      } catch (err) {
        console.error('Error loading questions:', err);
        setError('Failed to load questions');
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, [sessionId, setQuestions]);

  useEffect(() => {
    const supported =
      'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setSpeechSupported(supported);

    const onVisibility = () => {
      if (document.hidden) {
        setTabSwitches((count) => count + 1);
      }
    };

    const onBlur = () => setWindowBlurCount((count) => count + 1);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    setWordCount(answerWords.length);
    setCharCount(userAnswer.trim().length);
  }, [userAnswer]);

  const handleVoiceInput = () => {
    if (!speechSupported) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    setError(null);

    if (isSpeaking && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsSpeaking(true);
    recognition.onend = () => setIsSpeaking(false);
    recognition.onerror = () => {
      setIsSpeaking(false);
      setError('Voice input failed. Please try again or type your answer.');
    };
    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }

      const merged = [userAnswer, finalText, interimText].filter(Boolean).join(' ').trim();
      setUserAnswer(merged);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim() || !currentQuestion) return;

    if (answerTooShort) {
      setError(`Answer too short. Add at least ${minWords} words and ${minChars} characters.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Submit answer for evaluation
      const response = await answersAPI.submit(currentQuestion.id, userAnswer, {
        tabSwitches,
        windowBlurCount,
        pasteCount,
        keystrokes,
        elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
      });
      const answer: Answer = response.data;

      // Store answer
      addAnswer(answer);

      // Move to next question or summary
      if (isLastQuestion) {
        navigate(`/summary/${sessionId}`);
      } else {
        setCurrentIndex(currentIndex + 1);
        setUserAnswer('');
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      setError('Failed to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key.length === 1) {
      setKeystrokes((count) => count + 1);
    }

    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void handleSubmitAnswer();
    }

    if (event.altKey && event.key.toLowerCase() === 'v') {
      event.preventDefault();
      handleVoiceInput();
    }

    if (event.altKey && event.key.toLowerCase() === 's' && currentQuestion) {
      event.preventDefault();
      const utterance = new SpeechSynthesisUtterance(currentQuestion.text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Navigation onLogout={handleLogout} />
        <div className={styles.loadingScreen}>
          <Loader size={48} className={styles.spinner} />
          <p>Loading questions...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className={styles.container}>
        <Navigation onLogout={handleLogout} />
        <div className={styles.errorScreen}>
          <p>No questions available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Navigation onLogout={handleLogout} />

      <main className={styles.content}>
        {/* Progress Bar */}
        <div className={styles.progressContainer}>
          <div className={styles.progressInfo}>
            <p>Question {currentIndex + 1} of {questions.length}</p>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${((currentIndex + 1) / questions.length) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className={styles.questionCard}>
          <div className={styles.questionHeader}>
            <span className={styles.questionNumber}>Q{currentIndex + 1}</span>
            <button
              className={styles.speakBtn}
              onClick={() => {
                const utterance = new SpeechSynthesisUtterance(
                  currentQuestion.text
                );
                window.speechSynthesis.speak(utterance);
              }}
            >
              <Volume2 size={20} />
            </button>
          </div>

          <h2 className={styles.questionText}>{currentQuestion.text}</h2>

          {error && <div className={styles.error}>{error}</div>}

          {/* Answer Input */}
          <div className={styles.answerSection}>
            <label>Your Answer</label>
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={handleAnswerKeyDown}
              onPaste={() => setPasteCount((count) => count + 1)}
              placeholder="Type your answer here or use voice input..."
              className={styles.answerInput}
              rows={8}
              aria-label="Interview answer"
            />

            <div className={styles.answerMeta}>
              <span>{wordCount} words</span>
              <span>{charCount} characters</span>
              <span>Paste actions: {pasteCount}</span>
              <span>Tab switches: {tabSwitches}</span>
            </div>

            {answerTooShort && (
              <div className={styles.validationError}>
                Please provide a detailed answer with at least {minWords} words and {minChars} characters.
              </div>
            )}

            <div className={styles.shortcuts}>
              <p><strong>Keyboard:</strong> Ctrl/Cmd+Enter submit, Alt+V voice input, Alt+S read question aloud.</p>
            </div>

            <div className={styles.inputControls}>
              <button
                className={`${styles.voiceBtn} ${isSpeaking ? styles.voiceBtnActive : ''}`}
                onClick={handleVoiceInput}
                type="button"
                disabled={!speechSupported}
              >
                🎤 {isSpeaking ? 'Stop Voice' : speechSupported ? 'Voice Input' : 'Voice Unsupported'}
              </button>

              <button
                className={styles.submitBtn}
                onClick={handleSubmitAnswer}
                disabled={!userAnswer.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader size={20} className={styles.spinner} />
                ) : (
                  <>
                    <Send size={20} />
                    {isLastQuestion ? 'Get Results' : 'Next Question'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className={styles.tips}>
          <p>💡 Tip: Take your time. Quality answers are better than quick ones!</p>
        </div>
      </main>
    </div>
  );
};

export default QuestionPage;
