import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { questionsAPI, answersAPI, behaviorAPI } from '../services/api';
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
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [monitoringError, setMonitoringError] = useState<string | null>(null);
  const [copyCutCount, setCopyCutCount] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [isInFullscreen, setIsInFullscreen] = useState(false);
  const cameraRecorderRef = React.useRef<MediaRecorder | null>(null);
  const screenRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioRecorderRef = React.useRef<MediaRecorder | null>(null);
  const cameraChunksRef = React.useRef<Blob[]>([]);
  const screenChunksRef = React.useRef<Blob[]>([]);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const cameraStreamRef = React.useRef<MediaStream | null>(null);
  const screenStreamRef = React.useRef<MediaStream | null>(null);
  const audioStreamRef = React.useRef<MediaStream | null>(null);
  const [questionShownAt, setQuestionShownAt] = useState(() => new Date().toISOString());

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  const answerWords = userAnswer.trim().split(/\s+/).filter(Boolean);
  const minWords = 8;
  const minChars = 40;
  const answerTooShort = charCount > 0 && (wordCount < minWords || charCount < minChars);
  const integrityPressure =
    tabSwitches + windowBlurCount + fullscreenExits + copyCutCount + Math.floor(pasteCount / 2);
  const strictViolation = integrityPressure >= 8;

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
    const onFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      if (!active) {
        setFullscreenExits((count) => count + 1);
      }
      setIsInFullscreen(active);
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopAllStreams();
    };
  }, []);

  useEffect(() => {
    setQuestionShownAt(new Date().toISOString());
  }, [currentIndex]);

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

  const requestFullscreenMode = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsInFullscreen(true);
    } catch {
      setMonitoringError('Fullscreen mode could not be enabled. Continue in standard mode.');
    }
  };

  const getPreferredVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    const preferredNames = ['Siri', 'Google US English', 'Samantha', 'Alex'];
    for (const name of preferredNames) {
      const match = voices.find((voice) => voice.name.includes(name));
      if (match) {
        return match;
      }
    }
    return voices.find((voice) => voice.lang.startsWith('en')) || null;
  };

  const speakQuestion = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getPreferredVoice();
    if (voice) {
      utterance.voice = voice;
    }
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const startRecorder = (
    stream: MediaStream,
    chunkRef: React.MutableRefObject<Blob[]>,
    recorderRef: React.MutableRefObject<MediaRecorder | null>,
    mimeType: string
  ) => {
    chunkRef.current = [];
    const supportsMime = MediaRecorder.isTypeSupported(mimeType);
    const recorder = supportsMime
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunkRef.current.push(event.data);
      }
    };
    recorder.start(1000);
    recorderRef.current = recorder;
  };

  const enableMonitoring = async () => {
    try {
      setMonitoringError(null);

      const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      cameraStreamRef.current = camStream;
      screenStreamRef.current = screenStream;
      audioStreamRef.current = micStream;

      startRecorder(camStream, cameraChunksRef, cameraRecorderRef, 'video/webm;codecs=vp8,opus');
      startRecorder(screenStream, screenChunksRef, screenRecorderRef, 'video/webm;codecs=vp8,opus');
      startRecorder(micStream, audioChunksRef, audioRecorderRef, 'audio/webm;codecs=opus');

      setMonitoringEnabled(true);
    } catch (error) {
      setMonitoringError('Camera/screen/audio access denied. Behavior analysis will be limited.');
      setMonitoringEnabled(false);
    }
  };

  useEffect(() => {
    if (isLoading || !currentQuestion || monitoringEnabled) {
      return;
    }

    void enableMonitoring();
  }, [isLoading, currentQuestion, monitoringEnabled]);

  const stopAllStreams = () => {
    [cameraRecorderRef, screenRecorderRef, audioRecorderRef].forEach((recRef) => {
      const recorder = recRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      recRef.current = null;
    });

    [cameraStreamRef, screenStreamRef, audioStreamRef].forEach((streamRef) => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    });
  };

  const finalizeBlob = async (recorderRef: React.MutableRefObject<MediaRecorder | null>, chunks: Blob[]) => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      return chunks.length > 0 ? new Blob(chunks, { type: 'video/webm' }) : null;
    }

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    return chunks.length > 0 ? new Blob(chunks, { type: 'video/webm' }) : null;
  };

  const blobToDataUrl = async (blob: Blob | null): Promise<string | undefined> => {
    if (!blob) {
      return undefined;
    }

    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(blob);
    });
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim() || !currentQuestion) return;

    if (answerTooShort) {
      setError(`Answer too short. Add at least ${minWords} words and ${minChars} characters.`);
      return;
    }

    if (strictViolation) {
      setError('High integrity risk detected. Re-enter focus mode and continue without switching tabs/windows.');
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
        copyCutCount,
        fullscreenExits,
      });
      const answer: Answer = response.data;

      if (monitoringEnabled) {
        const cameraBlob = await finalizeBlob(cameraRecorderRef, cameraChunksRef.current);
        const screenBlob = await finalizeBlob(screenRecorderRef, screenChunksRef.current);
        const audioBlob = await finalizeBlob(audioRecorderRef, audioChunksRef.current);

        const videoData = await blobToDataUrl(cameraBlob);
        const screenData = await blobToDataUrl(screenBlob);
        const audioData = await blobToDataUrl(audioBlob);

        await behaviorAPI.submit({
          answerId: answer.id,
          userAnswer,
          videoData,
          screenData,
          audioData,
          questionShownAt,
        });

        stopAllStreams();
        await enableMonitoring();
      }

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
      speakQuestion(currentQuestion.text);
    }
  };

  const handleForbiddenClipboardEvent = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    setCopyCutCount((count) => count + 1);
    setError('Copy/Cut is disabled during interview mode.');
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    setCopyCutCount((count) => count + 1);
    setError('Context menu is disabled during interview mode.');
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
                speakQuestion(currentQuestion.text);
              }}
              type="button"
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
              onCopy={handleForbiddenClipboardEvent}
              onCut={handleForbiddenClipboardEvent}
              onContextMenu={handleContextMenu}
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
              <span>Blur count: {windowBlurCount}</span>
              <span>Copy/Cut blocked: {copyCutCount}</span>
              <span>Fullscreen exits: {fullscreenExits}</span>
            </div>

            <div className={styles.monitoringPanel}>
              <p>
                Monitoring mode: {monitoringEnabled ? 'active (camera + screen + audio)' : 'inactive'}
              </p>
              <div className={styles.monitoringActions}>
                <button type="button" className={styles.voiceBtn} onClick={enableMonitoring}>
                  Enable Monitoring
                </button>
                <button type="button" className={styles.voiceBtn} onClick={requestFullscreenMode}>
                  Enter Focus Mode
                </button>
              </div>
              {monitoringError && <div className={styles.validationError}>{monitoringError}</div>}
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
                disabled={!userAnswer.trim() || isSubmitting || strictViolation}
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
