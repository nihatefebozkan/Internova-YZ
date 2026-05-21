// Beceri radar grafiği — recharts ile
import {
  Radar, RadarChart as ReRadar, PolarGrid,
  PolarAngleAxis, ResponsiveContainer, Tooltip,
} from 'recharts';

/**
 * @param {Array} data - [{ kategori: 'Web Teknolojileri', skor: 75 }, ...]
 */
function RadarChart({ data = [] }) {
  if (!data.length) {
    return <div className="radar-empty">Beceri verisi yükleniyor...</div>;
  }

  const chartData = data.map(d => ({
    subject: d.kategori,
    skor: d.skor,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={380}>
      <ReRadar data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
        <Radar
          name="Beceri Skoru"
          dataKey="skor"
          stroke="#4F46E5"
          fill="#4F46E5"
          fillOpacity={0.45}
        />
        <Tooltip formatter={(v) => [`${v}%`, 'Skor']} />
      </ReRadar>
    </ResponsiveContainer>
  );
}

export default RadarChart;
