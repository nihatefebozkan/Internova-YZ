// Radar / Örümcek Grafik — Öğrencinin beceri dağılımını 5-8 eksenli gösterir
// Dolduracak: Bilgenur (recharts veya chart.js ile)

// import { Radar, RadarChart as ReRadar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

/**
 * @param {Array} data - [{ axis: 'Python', value: 75 }, ...]
 * @param {number} size - Grafik boyutu
 */
function RadarChart({ data = [], size = 400 }) {
  if (!data.length) {
    return <div className="radar-empty">Beceri verisi yükleniyor...</div>;
  }

  return (
    <div className="radar-chart-wrapper" style={{ width: size, height: size }}>
      {/*
        <ResponsiveContainer>
          <ReRadar data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="axis" />
            <Radar dataKey="value" fill="#4F46E5" fillOpacity={0.5} />
          </ReRadar>
        </ResponsiveContainer>
      */}
      <pre className="radar-data-debug">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export default RadarChart;
