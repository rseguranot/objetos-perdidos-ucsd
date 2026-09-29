import Button from '@mui/material/Button'
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import ForumOutlined from '@mui/icons-material/ForumOutlined'
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined'

const steps = [
  { icon: SearchRounded, title: 'Busca una coincidencia', text: 'Explora los objetos registrados. Filtra por categoría, fecha o zona donde crees haberlo perdido.' },
  { icon: ForumOutlined, title: 'Consulta con el decanato', text: 'Anota el código del objeto y comunícate por el canal que la universidad confirme para este servicio.' },
  { icon: VerifiedUserOutlined, title: 'Acredita propiedad e identidad', text: 'Describe una característica particular o aporta una prueba y presenta tu documento de identidad o carné de estudiante. Al entregar, el personal documentará la devolución con una foto de evidencia junto al objeto.' },
]
export default function Guide({ onCatalog }: { onCatalog: () => void }) {
  return <section className="guide-section" id="guia" aria-labelledby="guide-title">
    <div className="section-heading"><div><span className="eyebrow">UN PROCESO MÁS CLARO</span><h2 id="guide-title">Encontrarlo es solo el comienzo.</h2><p>Una ruta sencilla para recuperar lo que es tuyo.</p></div><Button onClick={onCatalog} endIcon={<ArrowForwardRounded />}>Explorar objetos</Button></div>
    <div className="guide-grid">{steps.map((step, index) => <article className="guide-step" key={step.title}><span className="step-number">0{index + 1}</span><step.icon className="step-icon" /><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
    <div className="guide-note"><strong>Una entrega documentada</strong><p>Propuesta para aprobación de UCSD: el decanato comprobará tu identidad presencialmente y te explicará el uso de la evidencia fotográfica. La imagen se custodiará fuera de esta herramienta y no se publicará en el catálogo.</p><strong>¿Encontraste algo en el campus?</strong><p>Entrégalo al decanato o al personal de la universidad para que lo canalice. La propuesta es que cada objeto quede registrado al confirmar su recepción en el decanato.</p></div>
  </section>
}
