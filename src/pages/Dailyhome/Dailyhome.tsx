import { Stack, Typography, Box, Button, CircularProgress } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import logoapi from '../../assets/fire.svg';
import { useEffect, useMemo, useRef, useState } from 'react';

const landingPalette = {
  primary: '#C65E2B',
  primaryDark: '#462011',
  primaryContrastText: '#ffffff',
  correct: '#4caf50',
  wrong: '#f44336',
  hoverBg: '#fff3ea',
};

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';

const QUIZ_TITLE = 'UKMPPAI Quiz';
const TOP_COUNT = 10;
const MEDAL_COLORS = ['#f5b301', '#9aa4ad', '#b8733a'];

const float = keyframes`
  0%, 100% { transform: translateY(0) rotate(0); }
  50%      { transform: translateY(-8px) rotate(-3deg); }
`;

const fadeUp = keyframes`
  0%   { opacity: 0; transform: translateY(16px); }
  100% { opacity: 1; transform: translateY(0); }
`;

type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  streak: number;
  isPlayer?: boolean;
};

type RankedEntry = LeaderboardEntry & { rank: number };

const pad2 = (n: number) => String(n).padStart(2, '0');

// ✅ Epoch ms untuk 00:10 WIB quizDate (00:00 WIB + 10 menit buffer AI generate)
function getOpenTimeWIB(quizDate: string): number {
  const [y, m, d] = quizDate.split('-').map(Number);
  return Date.UTC(y, m - 1, d) - 7 * 60 * 60 * 1000 + 10 * 60 * 1000;
}

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
};

function FireStreak({ value, size = 22 }: { value: number; size?: number }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="flex-end" gap="4px">
      <img src={logoapi} alt="Streak" style={{ width: size, height: size, objectFit: 'contain' }} />
      <Typography fontWeight={600} fontSize={{ xs: '14px', sm: '16px' }}>
        {value}
      </Typography>
    </Stack>
  );
}

function Row({ entry }: { entry: RankedEntry }) {
  const medal = entry.rank <= 3 ? MEDAL_COLORS[entry.rank - 1] : null;
  const isPlayer = !!entry.isPlayer;

  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={{ xs: 1, sm: 2 }}
      sx={{
        px: { xs: 1.5, sm: 3 },
        py: { xs: 1.25, sm: 1.5 },
        borderRadius: '10px',
        color: landingPalette.primaryDark,
        backgroundColor: isPlayer ? landingPalette.hoverBg : landingPalette.primaryContrastText,
        border: `2px solid ${isPlayer ? landingPalette.primary : 'rgba(198, 94, 43, 0.25)'}`,
        boxShadow: isPlayer ? '0 6px 16px rgba(198, 94, 43, 0.3)' : 'none',
      }}
    >
      <Box
        sx={{
          width: { xs: 32, sm: 40 },
          height: { xs: 32, sm: 40 },
          flexShrink: 0,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: medal ?? 'transparent',
          color: medal ? landingPalette.primaryContrastText : landingPalette.primaryDark,
          fontWeight: 700,
          fontSize: { xs: '14px', sm: '18px' },
        }}
      >
        {entry.rank}
      </Box>

      <Stack direction="row" alignItems="center" gap={1} sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          noWrap
          fontWeight={isPlayer ? 700 : 500}
          fontSize={{ xs: '15px', sm: '18px' }}
          sx={{ minWidth: 0 }}
        >
          {entry.name}
        </Typography>
        {isPlayer && (
          <Box
            sx={{
              flexShrink: 0,
              px: 1,
              py: '2px',
              borderRadius: '8px',
              backgroundColor: landingPalette.primary,
              color: landingPalette.primaryContrastText,
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            Kamu
          </Box>
        )}
      </Stack>

      <Box sx={{ width: { xs: 56, sm: 80 }, flexShrink: 0 }}>
        <FireStreak value={entry.streak} />
      </Box>

      <Typography
        fontWeight={700}
        textAlign="right"
        fontSize={{ xs: '15px', sm: '20px' }}
        sx={{ width: { xs: 48, sm: 72 }, flexShrink: 0 }}
      >
        {entry.score}
      </Typography>
    </Stack>
  );
}

export default function HomePage() {
  const navigate = useNavigate();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Flag "sudah pernah selesai fetch pertama kali"
  const [initialized, setInitialized] = useState(false);

  const [quizDate, setQuizDate] = useState<string | null>(null);
  const [quizAvailable, setQuizAvailable] = useState(false);

  const [now, setNow] = useState(Date.now());
  const [refetchTick, setRefetchTick] = useState(0);

  const prevRemainingRef = useRef<number | null>(null);

  // ── Derived timing ──
  const todayOpenTime = quizDate ? getOpenTimeWIB(quizDate) : null;
  const nextResetTime =
    todayOpenTime !== null ? todayOpenTime + 24 * 60 * 60 * 1000 : null;
  const windowOpen = todayOpenTime !== null && now >= todayOpenTime;
  const countdownTarget =
    todayOpenTime === null ? null : windowOpen ? nextResetTime : todayOpenTime;
  const remaining = countdownTarget !== null ? Math.max(0, countdownTarget - now) : 0;

  const canPlay = windowOpen && quizAvailable;
  const isWindowClosed = todayOpenTime !== null && !windowOpen;

  // ── Scroll top ──
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ── Ticker ──
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Fetch + refetch ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const lbRes = await fetch(`${API_BASE}/dailyquiz/leaderboard-today`);
        if (!lbRes.ok) {
          const data = await lbRes.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${lbRes.status}`);
        }
        const lbData = await lbRes.json();
        if (cancelled) return;

        setLeaderboard(lbData.leaderboard ?? []);
        setQuizDate(lbData.quiz_date ?? null);

        try {
          const actRes = await fetch(`${API_BASE}/dailyquiz/active`);
          if (cancelled) return;
          setQuizAvailable(actRes.ok);
        } catch {
          if (cancelled) return;
          setQuizAvailable(true);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message || 'Gagal memuat peringkat');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setInitialized(true); // ← pertama kali selesai fetch
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refetchTick]);

  // ── Auto refetch saat countdown mencapai 0 ──
  useEffect(() => {
    const prev = prevRemainingRef.current;
    prevRemainingRef.current = remaining;

    if (prev !== null && prev > 0 && remaining === 0 && countdownTarget !== null) {
      const t = setTimeout(() => setRefetchTick((c) => c + 1), 2000);
      return () => clearTimeout(t);
    }
  }, [remaining, countdownTarget]);

  // ── Ranked entries ──
  const { top, isEmpty } = useMemo(() => {
    if (leaderboard.length === 0) {
      return { top: [], isEmpty: true };
    }
    const ranked: RankedEntry[] = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
    return {
      top: ranked.slice(0, TOP_COUNT),
      isEmpty: false,
    };
  }, [leaderboard]);

  const handleStart = () => {
    if (!canPlay) return;
    navigate('/daily');
  };

  // Info banner (hanya saat belum bisa main)
  let infoText: string | null = null;
  if (initialized && !quizDate && !loading) {
    infoText = 'Quiz belum tersedia. Coba lagi beberapa saat lagi.';
  } else if (isWindowClosed) {
    infoText =
      'Soal hari ini sedang dibuat. Mohon tunggu sebentar lagi.';
  } else if (windowOpen && !quizAvailable && !loading) {
    infoText = 'Soal hari ini belum tersedia. Coba refresh sebentar lagi.';
  }

  const countdownLabel = windowOpen ? 'Kuis direset dalam' : 'Kuis dibuka dalam';

  return (
    <Stack
      width="100%"
      minHeight="100vh"
      sx={{ backgroundColor: landingPalette.primaryContrastText }}
    >
      {/* Bar atas */}
      <Box
        sx={{
          width: '100%',
          height: '10px',
          flexShrink: 0,
          backgroundColor: landingPalette.primaryDark,
        }}
      />

      <Stack
        alignItems="center"
        width="100%"
        gap={{ xs: 3, md: 4 }}
        sx={{ flex: 1, px: { xs: 2, sm: 3, md: 4 }, py: { xs: 4, md: 6 } }}
      >
        {/* Logo + judul */}
        <Stack
          alignItems="center"
          gap={2}
          sx={{
            '@media (prefers-reduced-motion: no-preference)': {
              animation: `${fadeUp} 0.6s ease-out`,
            },
          }}
        >
          <Box
            sx={{
              width: { xs: 96, sm: 120 },
              height: { xs: 96, sm: 120 },
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: landingPalette.hoverBg,
              border: `3px solid ${landingPalette.primary}`,
              boxShadow: '0 10px 28px rgba(198, 94, 43, 0.3)',
            }}
          >
            <Box
              component="img"
              src={logoapi}
              alt="Api"
              sx={{
                width: { xs: 56, sm: 72 },
                objectFit: 'contain',
                '@media (prefers-reduced-motion: no-preference)': {
                  animation: `${float} 2.4s ease-in-out infinite`,
                },
              }}
            />
          </Box>

          <Typography
            component="h1"
            textAlign="center"
            fontWeight={700}
            color={landingPalette.primaryDark}
            fontSize={{ xs: '34px', sm: '44px', md: '52px' }}
            lineHeight={1.1}
          >
            {QUIZ_TITLE}
          </Typography>
          <Typography
            textAlign="center"
            color={landingPalette.primaryDark}
            fontSize={{ xs: '16px', sm: '18px' }}
            sx={{ opacity: 0.8 }}
          >
            Jawab dengan benar, jaga streak-mu, dan naik peringkat!
          </Typography>
        </Stack>

        {/* AREA: tombol mulai + info + countdown */}
        <Stack alignItems="center" gap={1.5} width="100%" maxWidth="420px">
          {!initialized ? (
            /* ⏳ LOADING STATE — sebelum fetch pertama selesai */
            <Stack
              alignItems="center"
              gap={1}
              width="100%"
              sx={{
                py: 4,
                px: 2,
                borderRadius: '12px',
                backgroundColor: landingPalette.hoverBg,
                border: `1.5px dashed ${landingPalette.primary}`,
              }}
            >
              <CircularProgress size={36} sx={{ color: landingPalette.primary }} />
              <Typography
                color={landingPalette.primaryDark}
                fontWeight={700}
                fontSize={{ xs: '16px', sm: '18px' }}
                textAlign="center"
              >
                Memuat kuis…
              </Typography>
              <Typography
                color={landingPalette.primaryDark}
                fontSize={{ xs: '13px', sm: '14px' }}
                textAlign="center"
                sx={{ opacity: 0.75 }}
              >
                Sedang mengambil data hari ini
              </Typography>
            </Stack>
          ) : (
            <>
              {/* Tombol Mulai (dengan status loading di dalam) */}
              <Button
                onClick={handleStart}
                disabled={!canPlay || loading}
                variant="contained"
                fullWidth
                sx={{
                  py: 1.75,
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: { xs: '20px', sm: '24px' },
                  color: landingPalette.primaryContrastText,
                  backgroundColor: landingPalette.primary,
                  boxShadow: '0 8px 20px rgba(198, 94, 43, 0.35)',
                  transition:
                    'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
                  '&:hover': {
                    backgroundColor: landingPalette.primaryDark,
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 24px rgba(198, 94, 43, 0.4)',
                  },
                  '&:active': { transform: 'scale(0.98)' },
                  '&.Mui-disabled': {
                    backgroundColor: '#e0cfc7',
                    color: '#fff',
                    boxShadow: 'none',
                  },
                }}
              >
                {loading ? (
                  <Stack direction="row" alignItems="center" gap={1}>
                    <CircularProgress size={20} sx={{ color: '#fff' }} />
                    Memuat…
                  </Stack>
                ) : (
                  'Mulai'
                )}
              </Button>

              {/* Info banner (kalau belum bisa main) */}
              {infoText && (
                <Stack
                  alignItems="center"
                  gap={0.75}
                  sx={{
                    width: '100%',
                    px: 2,
                    py: 1.5,
                    borderRadius: '10px',
                    backgroundColor: '#fff7e6',
                    border: `1.5px dashed ${landingPalette.primary}`,
                  }}
                >
                  <Stack direction="row" alignItems="center" gap={1}>
                    <CircularProgress size={16} sx={{ color: landingPalette.primary }} />
                    <Typography
                      color={landingPalette.primaryDark}
                      fontWeight={700}
                      fontSize={{ xs: '13px', sm: '14px' }}
                      textAlign="center"
                    >
                      {isWindowClosed ? 'Soal sedang dibuat' : 'Belum tersedia'}
                    </Typography>
                  </Stack>
                  <Typography
                    color={landingPalette.primaryDark}
                    fontSize={{ xs: '12px', sm: '13px' }}
                    textAlign="center"
                    sx={{ opacity: 0.85 }}
                  >
                    {infoText}
                  </Typography>
                </Stack>
              )}

              {/* Countdown — hanya tampil kalau quizDate valid */}
              {quizDate && (
                <Stack alignItems="center" gap={0.25}>
                  <Typography
                    color={landingPalette.primaryDark}
                    fontSize={{ xs: '14px', sm: '16px' }}
                    sx={{ opacity: 0.8 }}
                  >
                    {countdownLabel}
                  </Typography>
                  <Typography
                    role="timer"
                    aria-label={`${countdownLabel} ${formatCountdown(remaining)}`}
                    color={landingPalette.primary}
                    fontWeight={700}
                    fontSize={{ xs: '26px', sm: '30px' }}
                    sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '1px' }}
                  >
                    {formatCountdown(remaining)}
                  </Typography>
                  <Typography
                    color={landingPalette.primaryDark}
                    fontSize={{ xs: '11px', sm: '12px' }}
                    sx={{ opacity: 0.6 }}
                  >
                    (kuis tutup: 00.00 - 00.10)
                  </Typography>
                </Stack>
              )}
            </>
          )}
        </Stack>

        {/* Papan peringkat hari ini */}
        <Stack width="100%" maxWidth="720px" gap={1.5}>
          <Stack gap={0.25}>
            <Typography
              color={landingPalette.primaryDark}
              fontWeight={700}
              fontSize={{ xs: '20px', sm: '24px' }}
            >
              Papan Peringkat Hari Ini
            </Typography>
            <Typography
              color={landingPalette.primaryDark}
              fontSize={{ xs: '14px', sm: '16px' }}
              sx={{ opacity: 0.8 }}
            >
              Skor pemain yang sudah menyelesaikan kuis
            </Typography>
          </Stack>

          {!initialized || loading ? (
            <Stack alignItems="center" justifyContent="center" gap={2} py={5}>
              <CircularProgress sx={{ color: landingPalette.primary }} />
              <Typography color={landingPalette.primaryDark} fontSize={16}>
                Memuat peringkat…
              </Typography>
            </Stack>
          ) : error ? (
            <Stack
              alignItems="center"
              gap={1.5}
              sx={{
                px: 3,
                py: { xs: 4, sm: 5 },
                borderRadius: '16px',
                border: `2px dashed ${landingPalette.wrong}`,
                backgroundColor: '#ffebee',
              }}
            >
              <Typography
                textAlign="center"
                color={landingPalette.wrong}
                fontSize={{ xs: '15px', sm: '18px' }}
              >
                {error}
              </Typography>
            </Stack>
          ) : isEmpty ? (
            <Stack
              alignItems="center"
              gap={1.5}
              sx={{
                px: 3,
                py: { xs: 4, sm: 5 },
                borderRadius: '16px',
                border: `2px dashed ${landingPalette.primary}`,
                backgroundColor: landingPalette.hoverBg,
              }}
            >
              <Box
                component="img"
                src={logoapi}
                alt=""
                aria-hidden="true"
                sx={{
                  width: { xs: 56, sm: 64 },
                  objectFit: 'contain',
                  '@media (prefers-reduced-motion: no-preference)': {
                    animation: `${float} 2.4s ease-in-out infinite`,
                  },
                }}
              />
              <Typography
                textAlign="center"
                color={landingPalette.primaryDark}
                fontWeight={700}
                fontSize={{ xs: '20px', sm: '24px' }}
              >
                Belum ada yang menyelesaikan kuis hari ini
              </Typography>
              <Typography
                textAlign="center"
                color={landingPalette.primaryDark}
                fontSize={{ xs: '15px', sm: '18px' }}
              >
                Jadilah yang pertama! Raih peringkat 1 dan pimpin papan peringkat hari ini.
              </Typography>
            </Stack>
          ) : (
            <>
              <Stack
                direction="row"
                gap={{ xs: 1, sm: 2 }}
                sx={{
                  px: { xs: 1.5, sm: 3 },
                  color: landingPalette.primaryDark,
                  opacity: 0.7,
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                <Box sx={{ width: { xs: 32, sm: 40 }, flexShrink: 0, textAlign: 'center' }}>
                  #
                </Box>
                <Box sx={{ flex: 1 }}>Nama</Box>
                <Box sx={{ width: { xs: 56, sm: 80 }, flexShrink: 0, textAlign: 'right' }}>
                  Streak
                </Box>
                <Box sx={{ width: { xs: 48, sm: 72 }, flexShrink: 0, textAlign: 'right' }}>
                  Skor
                </Box>
              </Stack>

              {top.map((entry) => (
                <Row key={entry.id} entry={entry} />
              ))}
            </>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}