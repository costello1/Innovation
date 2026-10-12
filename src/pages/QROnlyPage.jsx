import { QRCodeSVG } from 'qrcode.react'
import { useParams } from 'react-router-dom'
import { routes } from '../utils/routes'
import s from '../styles/QROnlyPage.module.css'

export default function QRPage() {
  const { surveyId } = useParams()
  const voteUrl = new URL(window.location.href)
  voteUrl.hash = routes.vote(surveyId)
  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <h2 className={s.title}>Scan to Vote</h2>
        <QRCodeSVG className={s.image} value={voteUrl.href} size={720} marginSize={4} level="M" title="Scan to open the voting page" />
        <a href={voteUrl.href}>Open voting page</a>
      </div>
    </div>
  )
}
