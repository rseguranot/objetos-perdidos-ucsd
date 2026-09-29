import Button from '@mui/material/Button'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import HeadphonesOutlined from '@mui/icons-material/HeadphonesOutlined'
import KeyOutlined from '@mui/icons-material/KeyOutlined'
import BackpackOutlined from '@mui/icons-material/BackpackOutlined'
import ShieldOutlined from '@mui/icons-material/ShieldOutlined'
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'

export default function Hero({ count, demo, onCatalog }: { count?: number; demo: boolean; onCatalog: () => void }) {
  return <section className="hero"><div className="container hero-inner"><div className="hero-copy"><span className="hero-eyebrow"><span /> UN PUNTO DE ENCUENTRO PARA TUS COSAS</span><h1>Tus cosas,<br />de vuelta <span>contigo.</span></h1><p>¿Perdiste algo en el campus? Encuentra una posible coincidencia y conoce los pasos para recuperarlo.</p><div className="hero-actions"><Button variant="contained" className="hero-cta" endIcon={<ArrowForwardRounded />} onClick={onCatalog}>Buscar mi objeto</Button></div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="art-star">✦</span><div className="floating-object headphones"><HeadphonesOutlined /><span>Todo vuelve<br />a su lugar.</span></div><div className="floating-object keys"><KeyOutlined /></div><div className="floating-object backpack"><BackpackOutlined /></div><div className="found-tag"><span className="found-check"><CheckCircleOutlineRounded /></span><div><strong>Un registro. Un lugar.</strong><span>Más fácil encontrarlo.</span></div></div></div></div><div className="container hero-bottom"><span><strong>{count === undefined ? '—' : count.toString().padStart(2, '0')}</strong> objetos disponibles {demo ? 'en esta demo' : 'en el catálogo'}</span><span><ShieldOutlined /> Recepción y entrega a través del decanato</span></div></section>
}
