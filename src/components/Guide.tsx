import Button from '@mui/material/Button'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import ForumOutlined from '@mui/icons-material/ForumOutlined'
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined'

const steps = [
  { icon: SearchRounded, title: 'Busca tu objeto', text: 'Explora los objetos registrados. Filtra por categoría, fecha o edificio donde crees haberlo perdido.' },
  { icon: ForumOutlined, title: 'Consulta con el decanato', text: 'Anota el código y consulta con el decanato.' },
  { icon: VerifiedUserOutlined, title: 'Demuestra que es tuyo', text: 'Describe una característica del objeto o presenta una prueba. Muestra tu documento de identidad o carné de estudiante. Al entregarlo, el personal tomará una foto como constancia.' },
]
export default function Guide({ onCatalog }: { onCatalog: () => void }) {
  return <section className="guide-section" id="guia" aria-labelledby="guide-title">
    <div className="section-heading"><div><span className="eyebrow">UN PROCESO MÁS CLARO</span><h2 id="guide-title">¿Cómo recuperar tu objeto?</h2><p>Sigue estos pasos para reclamarlo.</p></div><Button onClick={onCatalog} endIcon={<ArrowForwardRounded />}>Explorar objetos</Button></div>
    <div className="guide-grid">{steps.map((step, index) => <article className="guide-step" key={step.title}><span className="step-number">0{index + 1}</span><step.icon className="step-icon" /><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
    <div className="guide-note"><strong>Al retirar el objeto</strong><p>El personal verificará tu identidad y tomará una foto de la entrega. La foto no se publicará en esta página.</p><strong>¿Encontraste algo en el campus?</strong><p>Llévalo al decanato o entrégalo a un miembro del personal.</p></div>
  </section>
}
