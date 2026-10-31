import { Stack, Typography, Box, Button, CircularProgress } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { useNavigate, useSearchParams } from 'react-router-dom';
import logoapi from '../../assets/fire.svg';
import { useEffect, useMemo, useState } from 'react';

const landingPalette = {
  primary: '#C65E2B',
  primaryDark: '#462011',
  primaryContrastText: '#ffffff',
  correct: '#4caf50',
  wrong: '#f44336',
  hoverBg: '#fff3ea',
};

const scorePop = keyframes`
  0%   { transform: scale(0.6); opacity: 0; }
  60%  { transform: scale(1.12) rotate(-2deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); }
`;

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';

type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  streak: number;
  isPlayer?: boolean;
};

type RankedEntry = LeaderboardEntry & { rank: number };

const TOP_COUNT = 10;
const MEDAL_COLORS = ['#f5b301', '#9aa4ad', '#b8733a'];

type Quote = { title: string; sub: string };
type QuoteCategory = 'perfect' | 'zero' | 'top10' | 'one' | 'high' | 'mid';

const QUOTES: Record<QuoteCategory, Quote[]> = {
  perfect: [
    { title: 'Sempurna! Skor penuh!', sub: 'Semua jawabanmu benar, tidak ada yang terlewat.' },
    { title: 'Luar biasa, tanpa cela!', sub: 'Kamu menguasai semua soal hari ini.' },
    { title: 'Kamu memang jagonya!', sub: 'Skor sempurna seperti ini sulit ditandingi.' },
    { title: 'Hebat, nyaris tak ada tandingan!', sub: 'Pertahankan performa luar biasa ini.' },
    { title: 'Level dewa tercapai!', sub: 'Tidak ada satu pun soal yang bisa menjatuhkanmu.' },
  ],
  zero: [
    { title: 'Belum beruntung kali ini.', sub: 'Tidak apa-apa, semua orang pernah mulai dari nol.' },
    { title: 'Jangan menyerah!', sub: 'Kesalahan adalah guru terbaik, coba lagi besok.' },
    { title: 'Tenang, ini baru permulaan.', sub: 'Pelajari lagi materinya, lalu kembali dengan semangat baru.' },
    { title: 'Hari ini belum jadi harimu.', sub: 'Besok ada soal baru dan kesempatan baru.' },
    { title: 'Setiap ahli pernah salah.', sub: 'Bangkit dan coba lagi, kamu pasti bisa.' },
  ],
  top10: [
    { title: 'Selamat! Kamu masuk 10 besar!', sub: 'Namamu kini terpampang di papan peringkat.' },
    { title: 'Keren, kamu ada di jajaran terbaik!', sub: 'Pertahankan dan naikkan peringkatmu.' },
    { title: 'Kamu berhasil menembus 10 besar!', sub: 'Satu langkah lagi menuju puncak.' },
    { title: 'Performa yang mengesankan!', sub: 'Kamu bersaing dengan yang terbaik hari ini.' },
    { title: 'Papan peringkat ini milikmu juga!', sub: 'Terus asah kemampuanmu agar tetap di atas.' },
  ],
  one: [
    { title: 'Satu jawaban benar, awal yang baik!', sub: 'Kamu sudah mencetak poin pertama.' },
    { title: 'Langkah pertama sudah diambil.', sub: 'Latihan sedikit lagi, skormu pasti naik.' },
    { title: 'Ada kemajuan!', sub: 'Satu benar hari ini, lebih banyak lagi besok.' },
    { title: 'Jangan berkecil hati.', sub: 'Satu poin tetaplah poin, terus semangat belajar.' },
    { title: 'Api semangatmu mulai menyala!', sub: 'Ulangi materinya dan coba lagi.' },
  ],
  high: [
    { title: 'Hampir sempurna!', sub: 'Sedikit lagi, skor penuh ada di genggamanmu.' },
    { title: 'Hebat, tinggal selangkah lagi!', sub: 'Periksa soal yang terlewat dan perbaiki besok.' },
    { title: 'Skor yang sangat bagus!', sub: 'Tingkatkan ketelitianmu untuk meraih nilai sempurna.' },
    { title: 'Nyaris tanpa salah!', sub: 'Satu atau dua soal lagi menuju nilai penuh.' },
    { title: 'Kamu sudah sangat dekat!', sub: 'Terus asah, nilai sempurna menantimu.' },
  ],
  mid: [
    { title: 'Lumayan, terus semangat!', sub: 'Kamu sudah berada di jalur yang benar.' },
    { title: 'Kerja bagus!', sub: 'Sedikit latihan lagi dan skormu akan melesat.' },
    { title: 'Kamu sudah berusaha dengan baik!', sub: 'Setiap soal membuatmu makin paham.' },
    { title: 'Progresmu terlihat nyata!', sub: 'Teruslah belajar, hasilnya akan menyusul.' },
    { title: 'Semangat, kamu pasti bisa lebih!', sub: 'Coba lagi besok dan lampaui skor hari ini.' },
  ],
};

function getQuoteCategory(rank: number, score: number, total: number): QuoteCategory {
  if (score >= total) return 'perfect';
  if (score <= 0) return 'zero';
  if (rank <= TOP_COUNT) return 'top10';
  if (score === 1) return 'one';
  if (score >= total - 2) return 'high';
  return 'mid';
}

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

export default function ResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawName = searchParams.get('name');
  const playerName =
    rawName && rawName !== 'undefined' && rawName !== 'null' ? rawName : '';

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quoteSeed] = useState(() => Math.random());

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!playerName) {
      setError('Nama pemain tidak ditemukan. Silakan main kuis dulu.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('name', playerName);

        const res = await fetch(`${API_BASE}/dailyquiz/result?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (cancelled) return;

        setLeaderboard(data.leaderboard ?? []);
        setTotalQuestions(data.total_questions ?? 10);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || 'Failed to load result');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playerName]);

  const { top, playerRow, playerInTop } = useMemo(() => {
    if (leaderboard.length === 0) {
      return { top: [], playerRow: null, playerInTop: false };
    }

    const ranked: RankedEntry[] = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    const player = ranked.find((e) => e.isPlayer);
    return {
      top: ranked.slice(0, TOP_COUNT),
      playerRow: player ?? null,
      playerInTop: player ? ranked.findIndex((e) => e.isPlayer) < TOP_COUNT : false,
    };
  }, [leaderboard]);

  const quote = useMemo(() => {
    if (!playerRow) return { title: '', sub: '' };
    const cat = getQuoteCategory(playerRow.rank, playerRow.score, totalQuestions);
    const list = QUOTES[cat];
    return list[Math.floor(quoteSeed * list.length)];
  }, [playerRow, quoteSeed, totalQuestions]);

  const scorePercentage = playerRow
    ? Math.min(100, Math.max(0, (playerRow.score / totalQuestions) * 100))
    : 0;

  const handleBackHome = () => navigate('/');

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" minHeight="100vh" gap={2}>
        <CircularProgress sx={{ color: landingPalette.primary }} />
        <Typography color={landingPalette.primaryDark} fontSize={18}>
          Memuat hasil…
        </Typography>
      </Stack>
    );
  }

  if (error || !playerRow) {
    return (
      <Stack alignItems="center" justifyContent="center" minHeight="100vh" gap={3} p={4}>
        <Typography color={landingPalette.wrong} fontSize={18} textAlign="center">
          {error ?? 'Data pemain tidak ditemukan.'}
        </Typography>
        <Button
          onClick={handleBackHome}
          variant="contained"
          sx={{
            px: 4,
            py: 1.5,
            borderRadius: '10px',
            textTransform: 'none',
            fontSize: 16,
            backgroundColor: landingPalette.primary,
            '&:hover': { backgroundColor: landingPalette.primaryDark },
          }}
        >
          Kembali ke Beranda
        </Button>
      </Stack>
    );
  }

  return (
    <Stack width="100%" minHeight="100vh" sx={{ backgroundColor: landingPalette.primaryContrastText }}>
      <Stack
        alignItems="center"
        width="100%"
        sx={{ flex: 1, px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 5 } }}
        gap={{ xs: 3, md: 4 }}
      >
        {/* Kartu skor */}
        <Stack
          alignItems="center"
          gap={1}
          sx={{
            width: '100%',
            maxWidth: '420px',
            p: { xs: 3, sm: 4 },
            borderRadius: '16px',
            backgroundColor: landingPalette.primary,
            boxShadow: '0 10px 28px rgba(198, 94, 43, 0.35)',
            '@media (prefers-reduced-motion: no-preference)': {
              animation: `${scorePop} 0.7s ease-out`,
            },
          }}
        >
          <Typography color={landingPalette.primaryContrastText} fontSize={{ xs: '16px', sm: '18px' }}>
            Skor kamu
          </Typography>
          <Box
            role="progressbar"
            aria-label="Persentase skor"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(scorePercentage)}
            sx={{
              width: { xs: 164, sm: 184 },
              aspectRatio: '1',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: `conic-gradient(${landingPalette.primaryContrastText} ${scorePercentage}%, rgba(255,255,255,0.25) ${scorePercentage}% 100%)`,
            }}
          >
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{
                width: 'calc(100% - 16px)',
                height: 'calc(100% - 16px)',
                borderRadius: '50%',
                backgroundColor: landingPalette.primary,
              }}
            >
              <Typography
                color={landingPalette.primaryContrastText}
                fontWeight={700}
                fontSize={{ xs: '40px', sm: '48px' }}
                lineHeight={1.1}
              >
                {playerRow.score}
              </Typography>
            </Stack>
          </Box>
          <Stack direction="row" alignItems="center" justifyContent="center" gap={0.75}>
            <img
              src={logoapi}
              alt=""
              aria-hidden="true"
              style={{ width: '28px', height: '28px', objectFit: 'contain' }}
            />
            <Typography color={landingPalette.primaryContrastText} fontWeight={700} fontSize={{ xs: '20px', sm: '22px' }}>
              Streak: {playerRow.streak}
            </Typography>
          </Stack>
        </Stack>

        {/* Quote */}
        <Stack alignItems="center" gap={0.5} textAlign="center">
          <Typography
            color={landingPalette.primaryDark}
            fontWeight={700}
            fontSize={{ xs: '22px', sm: '28px', md: '32px' }}
          >
            {quote.title}
          </Typography>
          <Typography color={landingPalette.primaryDark} fontSize={{ xs: '16px', sm: '18px' }}>
            {quote.sub} Peringkatmu: #{playerRow.rank}
          </Typography>
        </Stack>

        {/* Papan peringkat */}
        <Stack width="100%" maxWidth="720px" gap={1.5}>
          <Typography color={landingPalette.primaryDark} fontWeight={700} fontSize={{ xs: '20px', sm: '24px' }}>
            Papan Peringkat
          </Typography>

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
            <Box sx={{ width: { xs: 32, sm: 40 }, flexShrink: 0, textAlign: 'center' }}>#</Box>
            <Box sx={{ flex: 1 }}>Nama</Box>
            <Box sx={{ width: { xs: 56, sm: 80 }, flexShrink: 0, textAlign: 'right' }}>Streak</Box>
            <Box sx={{ width: { xs: 48, sm: 72 }, flexShrink: 0, textAlign: 'right' }}>Skor</Box>
          </Stack>

          {top.map((entry) => (
            <Row key={entry.id} entry={entry} />
          ))}

          {!playerInTop && (
            <>
              <Typography
                textAlign="center"
                color={landingPalette.primaryDark}
                sx={{ opacity: 0.6, letterSpacing: '4px', lineHeight: 1 }}
              >
                ⋮
              </Typography>
              <Row entry={playerRow} />
            </>
          )}
        </Stack>

        {/* Tombol Beranda */}
        <Button
          onClick={handleBackHome}
          variant="contained"
          sx={{
            mt: 1,
            px: 5,
            py: 1.5,
            borderRadius: '10px',
            textTransform: 'none',
            fontSize: { xs: '16px', sm: '20px' },
            color: landingPalette.primaryContrastText,
            backgroundColor: landingPalette.primary,
            boxShadow: 'none',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
            '&:hover': {
              backgroundColor: landingPalette.primaryDark,
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 20px rgba(198, 94, 43, 0.35)',
            },
          }}
        >
          Beranda
        </Button>
      </Stack>
    </Stack>
  );
}