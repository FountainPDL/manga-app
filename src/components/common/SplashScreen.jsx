import { useEffect, useState } from 'react';
import { useStore } from '@store';

export function SplashScreen({ onDone }) {
  const { settings } = useStore();
  const [visible, setVisible] = useState(true);

  const isAmoled = settings.theme === 'amoled';
  const isDark   = settings.theme !== 'light';
  const accent   =
    settings.subTheme === 'solid'      ? (settings.solidColor  || '#9b30ff') :
    settings.subTheme === 'dual-shift' ? (settings.shiftColor1 || '#9b30ff') :
    '#9b30ff';

  const bg        = isAmoled ? '#000000' : isDark ? '#0b0020' : '#f0e8ff';
  const textColor = isDark ? '#f6f0ff' : '#0a0018';

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(false), 1900);
    const t2 = setTimeout(() => onDone(),          2300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background:bg,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      opacity: visible ? 1 : 0,
      transition:'opacity 0.40s ease',
    }}>
      {/* Ambient glow */}
      <div style={{
        position:'absolute', width:280, height:280, borderRadius:'50%',
        background:`radial-gradient(circle, ${accent}28 0%, transparent 70%)`,
        filter:'blur(48px)', pointerEvents:'none',
      }}/>

      {/* App icon */}
      <div style={{
        width:110, height:110,
        borderRadius:24,
        overflow:'hidden',
        marginBottom:22,
        boxShadow:`0 8px 40px ${accent}55, 0 2px 12px rgba(0,0,0,0.5)`,
      }}>
        <img
          src="/icon.png"
          alt="ComiFountain"
          style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.style.background = `linear-gradient(135deg,${accent},#e63946)`;
            e.target.parentElement.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:3rem">📚</div>';
          }}
        />
      </div>

      <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:'2.1rem', fontWeight:700, color:textColor, letterSpacing:'1.5px', marginBottom:5 }}>
        ComiFountain
      </div>
      <div style={{ fontSize:'0.74rem', color:isDark?'rgba(246,240,255,0.38)':'rgba(10,0,24,0.38)', letterSpacing:'2.5px', textTransform:'uppercase', fontWeight:600, marginBottom:52 }}>
        Comics &amp; Manga
      </div>

      {/* Loading bar */}
      <div style={{ width:90, height:2, borderRadius:2, background:isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)', overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:2, background:accent, animation:'splashLoad 1.8s ease forwards' }}/>
      </div>

      <style>{`@keyframes splashLoad{from{width:0%}to{width:100%}}`}</style>
    </div>
  );
}
