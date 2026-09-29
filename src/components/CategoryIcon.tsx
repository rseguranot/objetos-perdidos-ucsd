import HeadphonesOutlined from '@mui/icons-material/HeadphonesOutlined'
import BadgeOutlined from '@mui/icons-material/BadgeOutlined'
import KeyOutlined from '@mui/icons-material/KeyOutlined'
import CheckroomOutlined from '@mui/icons-material/CheckroomOutlined'
import BackpackOutlined from '@mui/icons-material/BackpackOutlined'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined'
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined'
import type { Category } from '../domain/types'

const icons = {
  electronica: HeadphonesOutlined,
  documentos: BadgeOutlined,
  llaves: KeyOutlined,
  bolsos_accesorios: BackpackOutlined,
  material_academico: MenuBookOutlined,
  ropa: CheckroomOutlined,
  dinero: PaymentsOutlined,
  otros: Inventory2Outlined,
}
export default function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  const Icon = icons[category]
  return <Icon className={className} aria-hidden="true" />
}
