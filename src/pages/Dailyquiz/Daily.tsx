import {
  Stack,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import logoapi from '../../assets/fire.svg';
import { useEffect, useState } from 'react';

const landingPalette = {
  primary: '#C65E2B',
  primaryDark: '#462011',
  primaryContrastText: '#ffffff',
  correct: '#4caf50',
  wrong: '#f44336',
  hoverBg: '#fff3ea',
};

const scorePop = keyframes`
  0%   { transform: scale(1);    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.7); }
  30%  { transform: scale(1.35) rotate(-4deg); box-shadow: 0 0 0 12px rgba(255, 152, 0, 0); }
  60%  { transform: scale(0.95) rotate(3deg); }
  100% { transform: scale(1)    rotate(0);    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0); }
`;

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  15%      { transform: translateX(-10px); }
  30%      { transform: translateX(9px); }
  45%      { transform: translateX(-8px); }
  60%      { transform: translateX(6px); }
  75%      { transform: translateX(-4px); }
  90%      { transform: translateX(2px); }
`;

const QUESTION_DURATION = 15000;
const NEXT_QUESTION_DELAY = 3000;
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';

type AnswerLabel = 'a' | 'b' | 'c' | 'd';
type ApiOption = { id: number; label: AnswerLabel; text: string };
type ApiQuestion = { id: number; text: string; options: ApiOption[] };

type Option = ApiOption;
type BadgeAnim = { type: 'pop' | 'shake'; id: number } | null;
type AnswersMap = Record<number, { answer_key: AnswerLabel; explanation: string | null }>;

// Fisher-Yates shuffle (immutable)
const shuffleArray = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default function LandingPage() {
  const navigate = useNavigate();

  // ── Server state ──
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [answersMap, setAnswersMap] = useState<AnswersMap>({});
  const [quizDate, setQuizDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Game state ──
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [timeLeft, setTimeLeft] = useState(QUESTION_DURATION);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [badgeAnim, setBadgeAnim] = useState<BadgeAnim>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  // userAnswers: { [question_order asli]: 'a'|'b'|'c'|'d' }
  const [userAnswers, setUserAnswers] = useState<Record<number, AnswerLabel>>({});

  // ── Completion form ──
  const [isComplete, setIsComplete] = useState(false);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentQuestionData = questions[currentQuestion - 1];
  const correctLabel: AnswerLabel | null = currentQuestionData
    ? answersMap[currentQuestionData.id]?.answer_key ?? null
    : null;

  // ── Fetch: 1 request, dapat pertanyaan + jawaban sekaligus ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        const res = await fetch(`${API_BASE}/dailyquiz/active`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (cancelled) return;

        setQuizDate(data.quiz_date);
        setQuestions(shuffleArray(data.questions));
        setAnswersMap(data.answers ?? {});
      } catch (err) {
        if (!cancelled) setError((err as Error).message || 'Failed to load quiz');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ── Timer ──
  useEffect(() => {
    if (isRevealed || loading || !currentQuestionData || isComplete) return;

    const start = performance.now();
    let frameId: number;

    const tick = () => {
      const remaining = Math.max(0, QUESTION_DURATION - (performance.now() - start));
      setTimeLeft(remaining);

      if (remaining === 0) {
        setIsRevealed(true);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [currentQuestion, isRevealed, loading, currentQuestionData, isComplete]);

  // ── Auto-advance / finish ──
  useEffect(() => {
    if (!isRevealed || isComplete) return;

    const timeoutId = setTimeout(() => {
      setSelectedOptionId(null);
      setIsRevealed(false);
      setTimeLeft(QUESTION_DURATION);

      if (currentQuestion < questions.length) {
        setCurrentQuestion((q) => q + 1);
      } else {
        setIsComplete(true);
      }
    }, NEXT_QUESTION_DELAY);

    return () => clearTimeout(timeoutId);
  }, [isRevealed, currentQuestion, questions.length, isComplete]);

  // ── Handle option click ──
  const handleOptionClick = (option: Option) => {
    if (isRevealed || !currentQuestionData) return;

    setSelectedOptionId(option.id);
    setIsRevealed(true);

    // Simpan jawaban by question_order ASLI
    setUserAnswers((prev) => ({ ...prev, [currentQuestionData.id]: option.label }));

    if (correctLabel && option.label === correctLabel) {
      setScore((prev) => prev + 1);
      setBadgeAnim((prev) => ({ type: 'pop', id: (prev?.id ?? 0) + 1 }));
    } else {
      setScore(0);
      setBadgeAnim((prev) => ({ type: 'shake', id: (prev?.id ?? 0) + 1 }));
    }
  };

  // ── Colors ──
  const getOptionColors = (option: Option) => {
    if (isRevealed && correctLabel) {
      if (option.label === correctLabel) {
        return { bg: landingPalette.correct, text: landingPalette.primaryContrastText };
      }
      if (option.id === selectedOptionId && option.label !== correctLabel) {
        return { bg: landingPalette.wrong, text: landingPalette.primaryContrastText };
      }
    }
    return { bg: landingPalette.primaryContrastText, text: landingPalette.primaryDark };
  };

  // ── Hitung total benar ──
  const totalCorrect = Object.entries(userAnswers).filter(
    ([qOrder, label]) => answersMap[Number(qOrder)]?.answer_key === label
  ).length;

  // ── Submit ──
  const handleSaveScore = async () => {
    if (!name.trim() || submitting || !quizDate) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        name: name.trim(),
        quiz_date: quizDate,
        answers: Object.entries(userAnswers).map(([qOrder, label]) => ({
          question_order: Number(qOrder),
          user_answer: label,
        })),
      };

      const res = await fetch(`${API_BASE}/dailyquiz/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        setSubmitError(data.error || 'Nama sudah digunakan hari ini, silakan pilih nama lain.');
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        setSubmitError(data.error || 'Gagal menyimpan skor');
        setSubmitting(false);
        return;
      }

      // 🆕 Navigate hanya dengan name
      navigate(`/dailyscore?name=${encodeURIComponent(name.trim())}`);
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitError('Gagal terhubung ke server. Coba lagi.');
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" minHeight="100vh" gap={2}>
        <CircularProgress sx={{ color: landingPalette.primary }} />
        <Typography color={landingPalette.primaryDark} fontSize={20}>
          Memuat kuis…
        </Typography>
      </Stack>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <Stack alignItems="center" justifyContent="center" minHeight="100vh" gap={2} p={4}>
        <Typography color={landingPalette.wrong} fontSize={20} textAlign="center">
          {error}
        </Typography>
      </Stack>
    );
  }

  // ── Belum ada soal ──
  if (!currentQuestionData && !isComplete) {
    return (
      <Stack alignItems="center" justifyContent="center" minHeight="100vh">
        <Typography color={landingPalette.primaryDark}>Belum ada kuis hari ini.</Typography>
      </Stack>
    );
  }

  // ── Completion screen ──
  if (isComplete) {
    const canSubmit = name.trim().length > 0 && !submitting;

    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        width="100%"
        sx={{ backgroundColor: landingPalette.primaryContrastText, p: { xs: 2, sm: 4 } }}
      >
        <Stack
          alignItems="center"
          gap={3}
          p={{ xs: 3, sm: 5 }}
          borderRadius="16px"
          width="100%"
          maxWidth="480px"
          sx={{
            backgroundColor: '#fff',
            boxShadow: '0 8px 32px rgba(70, 32, 17, 0.15)',
            border: `2px solid ${landingPalette.primary}`,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            gap={1.5}
            px={3}
            py={1.5}
            borderRadius="16px"
            sx={{ backgroundColor: landingPalette.hoverBg }}
          >
            <img
              src={logoapi}
              alt="Api"
              style={{ width: 40, height: 40, objectFit: 'contain' }}
            />
            <Typography
              color={landingPalette.primaryDark}
              fontSize={{ xs: 28, sm: 32 }}
              fontWeight={600}
            >
              {score}
            </Typography>
          </Stack>

          <Typography
            textAlign="center"
            color={landingPalette.primaryDark}
            fontSize={{ xs: 22, sm: 26 }}
            fontWeight={600}
          >
            Kuis Selesai! 🎉
          </Typography>

          <Typography textAlign="center" color={landingPalette.primaryDark} fontSize={16}>
            Kamu menjawab benar <b>{totalCorrect}</b> dari <b>{questions.length}</b> soal.
            <br />
            Streak terakhir: <b>{score}</b>
          </Typography>

          <TextField
            fullWidth
            label="Masukkan namamu"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (submitError) setSubmitError(null);
            }}
            disabled={submitting}
            autoFocus
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: landingPalette.primary },
                '&:hover fieldset': { borderColor: landingPalette.primary },
                '&.Mui-focused fieldset': { borderColor: landingPalette.primary },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: landingPalette.primary },
            }}
          />

          {submitError && (
            <Typography
              color={landingPalette.wrong}
              fontSize={14}
              textAlign="center"
              sx={{
                backgroundColor: '#ffebee',
                px: 2,
                py: 1,
                borderRadius: '8px',
                width: '100%',
              }}
            >
              {submitError}
            </Typography>
          )}

          <Button
            fullWidth
            variant="contained"
            disabled={!canSubmit}
            onClick={handleSaveScore}
            sx={{
              backgroundColor: landingPalette.primary,
              color: landingPalette.primaryContrastText,
              py: 1.5,
              fontSize: 18,
              textTransform: 'none',
              borderRadius: '10px',
              '&:hover': { backgroundColor: landingPalette.primaryDark },
              '&.Mui-disabled': {
                backgroundColor: '#e0cfc7',
                color: '#fff',
              },
            }}
          >
            {submitting ? (
              <Stack direction="row" alignItems="center" gap={1}>
                <CircularProgress size={20} sx={{ color: '#fff' }} />
                Menyimpan…
              </Stack>
            ) : (
              'Lihat & Simpan Score'
            )}
          </Button>
        </Stack>
      </Stack>
    );
  }

  // ── Normal quiz UI ──
  return (
    <Stack width="100%" minHeight="100vh" sx={{ backgroundColor: landingPalette.primaryContrastText }}>
      {/* Timer bar */}
      <Stack
        direction="row"
        width="100%"
        height="10px"
        minHeight="10px"
        flexShrink={0}
        sx={{ backgroundColor: landingPalette.primaryDark }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${(timeLeft / QUESTION_DURATION) * 100}%`,
            backgroundColor: '#ffb74d',
          }}
        />
      </Stack>

      {/* Header */}
      <Stack
        alignItems="center"
        justifyContent="space-between"
        direction="row"
        width="100%"
        sx={{
          backgroundColor: landingPalette.primary,
          px: { xs: 2, sm: 4 },
          py: 2,
        }}
      >
        <Typography
          color={landingPalette.primaryContrastText}
          fontSize={{ xs: '20px', sm: '26px', md: '32px' }}
        >
          Soal {currentQuestion}
        </Typography>

        <Stack
          key={badgeAnim?.id ?? 0}
          direction="row"
          justifyContent="center"
          alignItems="center"
          borderRadius="16px"
          gap="8px"
          sx={{
            backgroundColor: landingPalette.primaryContrastText,
            px: 2,
            py: 1,
            animation:
              badgeAnim?.type === 'pop'
                ? `${scorePop} 0.6s ease-out`
                : badgeAnim?.type === 'shake'
                ? `${shake} 0.5s ease-in-out`
                : 'none',
          }}
        >
          <img
            src={logoapi}
            alt="Api"
            style={{ width: '100%', maxWidth: '36px', objectFit: 'contain', borderRadius: '12px' }}
          />
          <Typography color={landingPalette.primaryDark} fontSize={{ xs: '20px', sm: '26px', md: '32px' }}>
            {score}
          </Typography>
        </Stack>
      </Stack>

      <Stack sx={{ flex: 1 }}>
        {/* Pertanyaan */}
        <Stack alignItems="center" justifyContent="center" width="100%" sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Stack
            alignItems="center"
            justifyContent="center"
            p={{ xs: 2, sm: 3 }}
            width="100%"
            maxWidth="1200px"
            borderRadius="10px"
          >
            <Typography
              textAlign="justify"
              color={landingPalette.primaryDark}
              fontSize={{ xs: '18px', sm: '20px', md: '22px' }}
            >
              {currentQuestionData!.text}
            </Typography>
          </Stack>
        </Stack>

        {/* Opsi jawaban */}
        <Stack alignItems="center" justifyContent="center" width="100%" sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Grid container spacing={{ xs: 2, md: 3 }} sx={{ width: '100%', maxWidth: '1200px' }}>
            {currentQuestionData!.options.map((option) => {
              const colors = getOptionColors(option);
              const isWrongSelected =
                isRevealed &&
                correctLabel !== null &&
                option.id === selectedOptionId &&
                option.label !== correctLabel;

              return (
                <Grid item xs={12} md={6} key={option.id}>
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    p={{ xs: 2, sm: 3 }}
                    width="100%"
                    height="100%"
                    borderRadius="10px"
                    onClick={() => handleOptionClick(option)}
                    sx={{
                      backgroundColor: colors.bg,
                      border: `2px solid ${
                        isRevealed && colors.bg !== landingPalette.primaryContrastText
                          ? colors.bg
                          : landingPalette.primary
                      }`,
                      cursor: isRevealed ? 'default' : 'pointer',
                      transition:
                        'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
                      animation: isWrongSelected ? `${shake} 0.5s ease-in-out` : 'none',
                      '@media (hover: hover)': {
                        '&:hover': isRevealed
                          ? {}
                          : {
                              transform: 'translateY(-4px) scale(1.02)',
                              boxShadow: '0 8px 20px rgba(198, 94, 43, 0.35)',
                              backgroundColor: landingPalette.hoverBg,
                            },
                      },
                      '&:active': isRevealed ? {} : { transform: 'scale(0.98)' },
                    }}
                  >
                    <Typography
                      textAlign="justify"
                      color={colors.text}
                      fontSize={{ xs: '16px', sm: '18px', md: '22px' }}
                    >
                      {option.text}
                    </Typography>
                  </Stack>
                </Grid>
              );
            })}
          </Grid>
        </Stack>
      </Stack>
    </Stack>
  );
}